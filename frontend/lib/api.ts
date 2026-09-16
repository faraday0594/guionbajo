import { getToken } from './auth';
import { attachAudioElementToAnalyzer, detachAudioElement } from './audioAnalyzer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithAuth(url: string, options: RequestInit = {}, retries = 1): Promise<any> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (options.signal?.aborted || err?.name === 'AbortError') {
      throw err;
    }
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return fetchWithAuth(url, options, retries - 1);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('guionbajo_token');
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada. Por favor inicia sesión.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.detail;
    if (Array.isArray(detail)) {
      throw new Error(detail.map((d: any) => d.msg).join(', '));
    }
    throw new Error(detail || `Error del servidor: ${response.status}`);
  }

  return response.json();
}

// Para TTS que devuelve audio/mpeg en lugar de JSON
async function fetchAudio(url: string, options: RequestInit = {}): Promise<Blob> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Error en síntesis de voz');
    }
    return await response.blob();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // ─── Auth ────────────────────────────────────────
  login: (data: { email: string; password: string }) =>
    fetchWithAuth('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: { name: string; email: string; password: string; native_language: string }) =>
    fetchWithAuth('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => fetchWithAuth('/auth/me'),

  // ─── Diagnosis ───────────────────────────────────
  startDiagnosis: () =>
    fetchWithAuth('/diagnosis/start', { method: 'POST' }),

  completeDiagnosis: (answers: { question_id: number; answer: string }[], questions: any[]) =>
    fetchWithAuth('/diagnosis/complete', {
      method: 'POST',
      body: JSON.stringify({ answers, questions }),
    }),

  skipDiagnosis: (chosen_level: string) =>
    fetchWithAuth('/diagnosis/skip', {
      method: 'POST',
      body: JSON.stringify({ chosen_level }),
    }),

  get: (url: string) => fetchWithAuth(url, { method: 'GET' }),
  post: (url: string, body?: any, options?: RequestInit) =>
    fetchWithAuth(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  // ─── Speech & Groq Whisper Evaluation ────────────
  transcribeAndEvaluateSpeech: async (
    audioBlob: Blob,
    targetPhrase?: string,
    expectedPhoneme?: string
  ): Promise<{
    success: boolean;
    transcription: string;
    target?: string;
    score: number;
    is_correct: boolean;
    word_feedback: Array<{ word: string; status: 'correct' | 'mispronounced' | 'missing'; heard_as?: string }>;
    phonetic_tip: string;
    latency_ms: number;
    groq_active: boolean;
  }> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech_recording.webm');
    if (targetPhrase) formData.append('target_phrase', targetPhrase);
    if (expectedPhoneme) formData.append('expected_phoneme', expectedPhoneme);

    return fetchWithAuth('/speech/transcribe-and-evaluate', {
      method: 'POST',
      body: formData,
    });
  },

  // ─── Adaptive Curriculum & Phonetics ─────────────
  generateAdaptiveLesson: (sublevel: string, class_index = 1, topic?: string, signal?: AbortSignal) =>
    fetchWithAuth('/lesson/generate-adaptive', {
      method: 'POST',
      body: JSON.stringify({ sublevel, class_index, topic }),
      signal,
    }),

  getPhoneticBoard: () => fetchWithAuth('/phonetics/board'),
  getPhonemeCard: (symbol: string) => fetchWithAuth(`/phonetics/card/${encodeURIComponent(symbol)}`),
  recordPhoneme: (phoneme_symbol: string, is_correct: boolean, score?: number) =>
    fetchWithAuth('/phonetics/record', {
      method: 'POST',
      body: JSON.stringify({ phoneme_symbol, is_correct, score }),
    }),
  getCurriculumMap: () => fetchWithAuth('/phonetics/curriculum-map'),

  // ─── Lesson ──────────────────────────────────────
  generateLesson: (topic: string, sublevel: string, lesson_type = 'grammar') =>
    fetchWithAuth('/lesson/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, sublevel, lesson_type }),
    }),

  getLesson: (id: string) => fetchWithAuth(`/lesson/${id}`),

  evaluateLesson: (id: string, formData: FormData) =>
    fetchWithAuth(`/lesson/${id}/evaluate`, { method: 'POST', body: formData }),

  completeLesson: (id: string) =>
    fetchWithAuth(`/lesson/${id}/complete`, { method: 'POST' }),

  getCurrentLesson: () => fetchWithAuth('/lesson/current'),

  saveLessonCheckpoint: (data: {
    lesson_id?: string;
    topic: string;
    sublevel: string;
    class_index?: number;
    current_slide: number;
    view_mode: 'board' | 'timeline' | 'reading' | 'games';
    quiz_completed?: boolean;
    quiz_score?: number;
    reading_completed?: boolean;
    reading_score?: number;
    mystery_word_completed?: boolean;
    mystery_word_score?: number;
    twin_cards_completed?: boolean;
    twin_cards_score?: number;
    pov_quest_completed?: boolean;
    pov_quest_score?: number;
    overall_score?: number;
    is_completed?: boolean;
  }) =>
    fetchWithAuth('/lesson/checkpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLessonCheckpoint: () => fetchWithAuth('/lesson/checkpoint'),

  // ─── Educational Games (Mystery Word & Twin Cards) ─
  generateGames: (topic: string, sublevel: string, lesson_id?: string, game_type = 'all', pair_count = 6) =>
    fetchWithAuth('/games/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, sublevel, lesson_id, game_type, pair_count }),
    }),

  getLessonGames: (lesson_id: string) => fetchWithAuth(`/games/lesson/${lesson_id}`),

  submitGameScore: (data: {
    game_type: string;
    score: number;
    mistakes?: number;
    max_streak?: number;
    duration_seconds?: number;
    lesson_id?: string;
  }) =>
    fetchWithAuth('/games/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── MiniMax Image Generation ─────────────────────
  generateImage: (prompt: string, aspect_ratio = '1:1') =>
    fetchWithAuth('/image/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, aspect_ratio }),
    }),

  // ─── Interactive POV Conversational Quest (Visual Novel) ─
  generateQuest: (topic: string, sublevel: string, lesson_id?: string) =>
    fetchWithAuth('/quests/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, sublevel, lesson_id }),
    }),

  startQuestSession: (quest_id?: string, topic?: string, sublevel?: string) =>
    fetchWithAuth('/quests/session/start', {
      method: 'POST',
      body: JSON.stringify({ quest_id, topic, sublevel }),
    }),

  evaluateQuestNode: (data: {
    quest_id?: string;
    session_id?: string;
    node_index: number;
    transcript: string;
    topic?: string;
    node_data?: any;
    all_nodes?: any[];
  }) =>
    fetchWithAuth('/quests/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitQuestScore: (data: {
    quest_id?: string;
    session_id?: string;
    score: number;
    attempt_count?: number;
    nodes_completed?: number;
    total_nodes?: number;
    duration_seconds?: number;
    lesson_id?: string;
  }) =>
    fetchWithAuth('/quests/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Reading Practice (Story with Word-by-Word IPA) ─
  generateReadingStory: (topic: string, sublevel: string, lesson_id?: string) =>
    fetchWithAuth('/reading/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, sublevel, lesson_id }),
    }),

  getLessonReading: (lesson_id: string) =>
    fetchWithAuth(`/reading/lesson/${lesson_id}`),

  evaluateReadingChunk: (data: {
    chunk_words: any[];
    transcript: string;
    lesson_id?: string;
    chunk_id?: string;
  }) =>
    fetchWithAuth('/reading/evaluate-chunk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Progress ────────────────────────────────────
  getLearningMap: () => fetchWithAuth('/progress/map'),
  getHistory: () => fetchWithAuth('/progress/history'),
  getStats: () => fetchWithAuth('/progress/stats'),
  updateLevel: (sublevel: string) => fetchWithAuth(`/progress/level?sublevel=${encodeURIComponent(sublevel)}`, { method: 'POST' }),

  // ─── TTS ─────────────────────────────────────────
  synthesize: (text: string, voice?: string, emotion = 'calm', speed = 1.0): Promise<Blob> => {
    const selectedVoice = voice && voice !== 'default' ? voice : getSavedPreferredVoice();
    return fetchAudio('/tts/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text, voice: selectedVoice, emotion, speed }),
    });
  },

  getVoices: () => fetchWithAuth('/tts/voices'),

  // ─── Settings ────────────────────────────────────
  getSettings: () => fetchWithAuth('/settings/'),
  saveMinimaxKey: (api_key: string) =>
    fetchWithAuth('/settings/minimax-key', {
      method: 'POST',
      body: JSON.stringify({ api_key }),
    }),
  savePreferredVoice: (voice: string) =>
    fetchWithAuth('/settings/voice', {
      method: 'POST',
      body: JSON.stringify({ voice }),
    }),

  testTtsConnection: () =>
    fetchAudio('/tts/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text: 'Testing TTS connection' }),
    }),

  // ─── Live Voice Chat ─────────────────────────────
  live: {
    transcribe: async (audioBlob: Blob): Promise<{ text: string; duration: number; words: Array<{ word: string; start?: number; end?: number }>; engine?: string }> => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech.wav');
      return fetchWithAuth('/live/transcribe', {
        method: 'POST',
        body: formData,
      });
    },

    synthesizeChunk: (text: string, voice_id?: string, speed = 1.0): Promise<Blob> => {
      const selectedVoice = voice_id && voice_id !== 'default' ? voice_id : getSavedPreferredVoice();
      return fetchAudio('/live/synthesize-chunk', {
        method: 'POST',
        body: JSON.stringify({ text, voice_id: selectedVoice, speed }),
      });
    },

    streamResponse: async (
      messages: Array<{ role: string; content: string }>,
      options: {
        student_name?: string;
        student_level?: string;
        voice_id?: string;
        bilingual_mode?: boolean;
        signal?: AbortSignal;
      },
      callbacks: {
        onToken?: (token: string) => void;
        onClause?: (clause: { clause_index: number; text: string }) => void;
        onCorrection?: (correction: { original: string; corrected: string; explanation: string }) => void;
        onDone?: (data: { full_text: string; total_clauses: number }) => void;
        onError?: (error: string) => void;
      }
    ): Promise<void> => {
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE}/live/respond-stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages,
          student_name: options.student_name || 'Estudiante',
          student_level: options.student_level || 'A1.2',
          voice_id: options.voice_id || getSavedPreferredVoice(),
          bilingual_mode: options.bilingual_mode ?? true,
        }),
        signal: options.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Live stream error (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body received from live stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = 'message';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              try {
                const data = JSON.parse(dataStr);
                if (currentEvent === 'token' && callbacks.onToken) {
                  callbacks.onToken(data.token);
                } else if (currentEvent === 'clause' && callbacks.onClause) {
                  callbacks.onClause(data);
                } else if (currentEvent === 'correction' && callbacks.onCorrection) {
                  callbacks.onCorrection(data);
                } else if (currentEvent === 'done' && callbacks.onDone) {
                  callbacks.onDone(data);
                } else if (currentEvent === 'error' && callbacks.onError) {
                  callbacks.onError(data.error);
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', dataStr, e);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (callbacks.onError) callbacks.onError(err.message || 'Stream interrupted');
        throw err;
      }
    },
  },
};

export interface AudioQueueItem {
  clauseIndex: number;
  text: string;
  blobPromise: Promise<Blob>;
  audioUrl?: string;
  audio?: HTMLAudioElement;
  status: 'pending' | 'ready' | 'playing' | 'played' | 'failed';
}

export class LiveAudioStreamQueue {
  private queue: AudioQueueItem[] = [];
  private isPlaying = false;
  private currentItem: AudioQueueItem | null = null;
  private isStreamDone = false;
  private isStopped = false;
  private voiceId?: string;
  private onAudioElementChange?: (audio: HTMLAudioElement | null) => void;
  private onStateChange?: (state: 'idle' | 'playing') => void;
  private onClausePlay?: (clauseIndex: number, text: string) => void;
  private onAllEnded?: () => void;

  constructor(options?: {
    voiceId?: string;
    onAudioElementChange?: (audio: HTMLAudioElement | null) => void;
    onStateChange?: (state: 'idle' | 'playing') => void;
    onClausePlay?: (clauseIndex: number, text: string) => void;
    onAllEnded?: () => void;
  }) {
    this.voiceId = options?.voiceId;
    this.onAudioElementChange = options?.onAudioElementChange;
    this.onStateChange = options?.onStateChange;
    this.onClausePlay = options?.onClausePlay;
    this.onAllEnded = options?.onAllEnded;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private safeguardTimeout?: any;

  enqueue(clauseIndex: number, text: string) {
    if (this.isStopped) return;
    const timeoutPromise = new Promise<Blob>((_, reject) =>
      setTimeout(() => reject(new Error('TTS chunk synthesis timeout')), 6000)
    );
    const blobPromise = Promise.race([
      api.live.synthesizeChunk(text, this.voiceId),
      timeoutPromise,
    ]);

    const item: AudioQueueItem = {
      clauseIndex,
      text,
      blobPromise,
      status: 'pending',
    };

    blobPromise
      .then((blob) => {
        if (this.isStopped) return;
        item.audioUrl = URL.createObjectURL(blob);
        item.status = 'ready';
        this.processNext();
      })
      .catch((err) => {
        console.warn(`Clause synthesis failed or timed out for clause ${clauseIndex}:`, err);
        item.status = 'failed';
        this.processNext();
      });

    this.queue.push(item);
    this.processNext();
  }

  markStreamComplete() {
    this.isStreamDone = true;
    this.processNext();

    if (this.safeguardTimeout) clearTimeout(this.safeguardTimeout);
    this.safeguardTimeout = setTimeout(() => {
      if (!this.isPlaying || this.queue.every((it) => it.status === 'played' || it.status === 'failed')) {
        this.finishPlayback();
      }
    }, 10000);
  }

  private async processNext() {
    if (this.isPlaying || this.isStopped) return;

    // Find next pending or ready item in order
    const nextIndex = this.queue.findIndex((it) => it.status === 'ready' || it.status === 'pending');
    if (nextIndex === -1) {
      if (this.isStreamDone) {
        this.finishPlayback();
      }
      return;
    }

    const item = this.queue[nextIndex];
    if (item.status === 'pending') {
      // Still waiting for this chunk's synthesis, do not skip ahead to keep natural sentence order
      return;
    }

    if (item.status === 'failed' || !item.audioUrl) {
      item.status = 'played';
      this.processNext();
      return;
    }

    // Play chunk
    this.isPlaying = true;
    item.status = 'playing';
    this.currentItem = item;
    this.onStateChange?.('playing');
    this.onClausePlay?.(item.clauseIndex, item.text);

    const audio = new Audio(item.audioUrl);
    item.audio = audio;
    this.onAudioElementChange?.(audio);
    attachAudioElementToAnalyzer(audio);

    audio.onended = () => {
      detachAudioElement(audio);
      if (item.audioUrl) URL.revokeObjectURL(item.audioUrl);
      item.status = 'played';
      this.isPlaying = false;
      this.currentItem = null;
      this.onAudioElementChange?.(null);
      this.processNext();
    };

    audio.onerror = (err) => {
      console.warn(`Audio playback error on clause ${item.clauseIndex}:`, err);
      detachAudioElement(audio);
      if (item.audioUrl) URL.revokeObjectURL(item.audioUrl);
      item.status = 'failed';
      this.isPlaying = false;
      this.currentItem = null;
      this.onAudioElementChange?.(null);
      this.processNext();
    };

    try {
      await audio.play();
    } catch (playErr) {
      console.warn('Autoplay error:', playErr);
      detachAudioElement(audio);
      if (item.audioUrl) URL.revokeObjectURL(item.audioUrl);
      item.status = 'failed';
      this.isPlaying = false;
      this.currentItem = null;
      this.onAudioElementChange?.(null);
      this.processNext();
    }
  }

  private finishPlayback() {
    if (this.safeguardTimeout) {
      clearTimeout(this.safeguardTimeout);
      this.safeguardTimeout = undefined;
    }
    this.isPlaying = false;
    this.currentItem = null;
    this.onAudioElementChange?.(null);
    this.onStateChange?.('idle');
    this.onAllEnded?.();
  }

  stop() {
    if (this.safeguardTimeout) {
      clearTimeout(this.safeguardTimeout);
      this.safeguardTimeout = undefined;
    }
    this.isStopped = true;
    this.isPlaying = false;
    if (this.currentItem?.audio) {
      this.currentItem.audio.pause();
      detachAudioElement(this.currentItem.audio);
    }
    this.queue.forEach((it) => {
      if (it.audioUrl) {
        URL.revokeObjectURL(it.audioUrl);
      }
      if (it.audio) {
        it.audio.pause();
        detachAudioElement(it.audio);
      }
    });
    this.queue = [];
    this.currentItem = null;
    this.onAudioElementChange?.(null);
    this.onStateChange?.('idle');
  }
}

let memoryPreferredVoice = 'female-yujie';

export function getSavedPreferredVoice(): string {
  if (typeof window === 'undefined') return memoryPreferredVoice;
  try {
    const val = localStorage.getItem('guionbajo_preferred_voice') || localStorage.getItem('tutor_ai_preferred_voice');
    if (val) {
      memoryPreferredVoice = val;
      return val;
    }
  } catch (_) {}
  return memoryPreferredVoice;
}

export function setSavedPreferredVoice(voiceId: string): void {
  if (!voiceId) return;
  memoryPreferredVoice = voiceId;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('guionbajo_preferred_voice', voiceId);
    localStorage.setItem('tutor_ai_preferred_voice', voiceId);
  } catch (_) {}
}

// Global audio handle & state for linear serialization
let activeAudioElement: HTMLAudioElement | null = null;
let activeSpeechAdapter: { pause: () => void } | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentResolveHandler: (() => void) | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoadedPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let activePlaybackSessionId = 0;

export function ensureBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  const current = window.speechSynthesis.getVoices();
  if (current && current.length > 0) {
    cachedVoices = current;
    return Promise.resolve(current);
  }
  if (!voicesLoadedPromise) {
    voicesLoadedPromise = new Promise((resolve) => {
      const onVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          cachedVoices = v;
          window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
          resolve(v);
        }
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      setTimeout(() => {
        const v = window.speechSynthesis.getVoices();
        cachedVoices = v || [];
        resolve(cachedVoices);
      }, 500);
    });
  }
  return voicesLoadedPromise;
}

export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  if (cachedVoices.length > 0) return cachedVoices;
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  ensureBrowserVoices();
}

export function getBestBrowserVoice(lang: 'en' | 'es', preferredNameOrId?: string): SpeechSynthesisVoice | null {
  const voices = getBrowserVoices();
  if (!voices || voices.length === 0) return null;

  const pref = (preferredNameOrId || getSavedPreferredVoice() || '').toLowerCase();
  const isMale = pref.includes('male') || pref.includes('jorge') || pref.includes('alvaro') || pref.includes('alonso') || pref.includes('roger') || pref.includes('guy') || pref.includes('qingse') || pref.includes('jingying') || pref.includes('daxuesheng');

  if (lang === 'en') {
    const enVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
    if (enVoices.length === 0) return null;

    // Filter out old robotic Microsoft Desktop voices (SAPI5 like Microsoft David Desktop / Microsoft Zira Desktop) if modern natural voices exist
    const naturalEnVoices = enVoices.filter(v => !v.name.includes('Desktop') && !v.name.includes('David') && !v.name.includes('Zira'));
    const candidateList = naturalEnVoices.length > 0 ? naturalEnVoices : enVoices;

    if (preferredNameOrId) {
      const match = candidateList.find((v) => v.name.toLowerCase().includes(preferredNameOrId.toLowerCase()));
      if (match) return match;
    }

    const priorityFilters = [
      // Modern Natural / Online Neural voices matching requested gender
      (v: SpeechSynthesisVoice) => isMale
        ? ((v.name.includes('Roger') || v.name.includes('Guy') || v.name.includes('Natural') || v.name.includes('Online')) && v.lang.startsWith('en'))
        : ((v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Ava') || v.name.includes('Emma') || v.name.includes('Natural') || v.name.includes('Online')) && v.lang.startsWith('en')),
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('en'),
      (v: SpeechSynthesisVoice) => (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Alex')) && v.lang.startsWith('en'),
      (v: SpeechSynthesisVoice) => v.lang === 'en-US' && !v.name.includes('Desktop'),
      (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && !v.name.includes('Desktop'),
      (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
    ];

    for (const test of priorityFilters) {
      const found = candidateList.find(test);
      if (found) return found;
    }
    return candidateList[0];
  } else {
    const esVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('es'));
    if (esVoices.length === 0) return null;

    // Filter out old robotic Microsoft Desktop voices (SAPI5 like Microsoft Sabina Desktop / Helena Desktop) if natural/google voices exist
    const naturalEsVoices = esVoices.filter(v => !v.name.includes('Desktop') && !v.name.includes('Sabina Desktop') && !v.name.includes('Helena Desktop'));
    const candidateList = naturalEsVoices.length > 0 ? naturalEsVoices : esVoices;

    if (preferredNameOrId) {
      const match = candidateList.find((v) => v.name.toLowerCase().includes(preferredNameOrId.toLowerCase()));
      if (match) return match;
    }

    const priorityFilters = [
      // Modern Natural / Online Neural voices matching requested gender
      (v: SpeechSynthesisVoice) => isMale
        ? ((v.name.includes('Jorge') || v.name.includes('Alvaro') || v.name.includes('Alonso') || v.name.includes('Natural') || v.name.includes('Online')) && v.lang.startsWith('es'))
        : ((v.name.includes('Dalia') || v.name.includes('Elvira') || v.name.includes('Paloma') || v.name.includes('Natural') || v.name.includes('Online')) && v.lang.startsWith('es')),
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('es'),
      (v: SpeechSynthesisVoice) => (v.name.includes('Paulina') || v.name.includes('Monica') || v.name.includes('Laura')) && v.lang.startsWith('es'),
      (v: SpeechSynthesisVoice) => (v.lang === 'es-MX' || v.lang === 'es-US' || v.lang === 'es-ES') && !v.name.includes('Desktop'),
      (v: SpeechSynthesisVoice) => v.lang.startsWith('es') && !v.name.includes('Desktop'),
      (v: SpeechSynthesisVoice) => v.lang.startsWith('es'),
    ];

    for (const test of priorityFilters) {
      const found = candidateList.find(test);
      if (found) return found;
    }
    return candidateList[0];
  }
}


// Stop any currently speaking tutor voice
export function stopTutorVoice() {
  activePlaybackSessionId += 1;
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch (_) {}
    detachAudioElement(activeAudioElement);
    activeAudioElement = null;
  }
  detachAudioElement(null);
  if (activeSpeechAdapter) {
    try {
      activeSpeechAdapter.pause();
    } catch (_) {}
    activeSpeechAdapter = null;
  }
  if (activeUtterance) {
    activeUtterance = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
  if (currentResolveHandler) {
    const r = currentResolveHandler;
    currentResolveHandler = null;
    r();
  }
}

// ─── Clean text for natural speech synthesis (no punctuation spelling) ───────
export function cleanTextForTTS(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let clean = text;

  // Remove emojis
  clean = clean.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/g, '');

  // 3. Clean IPA phonetic transcriptions in slashes (e.g. /s/ -> ese, /z/ -> z sonora, /fəʊnz/ -> strip)
  clean = clean.replace(/\/([^\/]+)\//g, (_, raw) => {
    const p1 = raw.trim().replace(/['ˈ\.:ː\s]/g, '');
    if (p1 === 's' || p1 === 'S') return ' ese ';
    if (p1 === 'z' || p1 === 'Z') return ' z sonora ';
    if (p1 === 'ɪz' || p1 === 'iz' || p1 === 'Iz') return ' iz ';
    if (p1 === 'iː' || p1 === 'i:' || p1 === 'ii') return ' i larga ';
    if (p1 === 'ɪ' || p1 === 'I') return ' i corta ';
    if (p1 === 'ð' || p1 === 'th') return ' sonido th ';
    // Strip whole-word phonetic spellings (like /fəʊnz/, /penz/, /bæɡz/, /bʊks/) completely:
    return ' ';
  });

  // Replace slashes in alternatives like I/You or s/es -> I o You, s o es
  clean = clean.replace(/([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/g, '$1 o $2');

  // Remove brackets [ Sujeto ] -> Sujeto
  clean = clean.replace(/\[\s*([^\]]+)\s*\]/g, '$1');

  // Replace bullets, arrows, symbols
  clean = clean.replace(/^[•\-\*]\s*/gm, '');
  clean = clean.replace(/\s*(?:→|=>|->)\s*/g, ', ');
  clean = clean.replace(/[*_~`#|\\\/]/g, ' ');
  clean = clean.replace(/["'“”‘’«»]/g, ' ');
  clean = clean.replace(/_+/g, ' ');
  clean = clean.replace(/\s{2,}/g, ' ').trim();

  return clean;
}

function createBrowserSpeechAudioAdapter(text: string, voiceId?: string) {
  const targetVoice = voiceId && voiceId !== 'default' ? voiceId : getSavedPreferredVoice();
  const cleanedSpeech = cleanTextForTTS(text);
  const words = cleanedSpeech.split(/\s+/).filter(Boolean).length;
  const isEnglish = targetVoice.startsWith('en-') || targetVoice.includes('roger') || targetVoice.includes('jenny');
  const estimatedSeconds = Math.max(words * 0.38, 1.8);

  let timer: NodeJS.Timeout | null = null;
  let startTime = 0;
  let isPaused = false;

  const adapter = {
    duration: estimatedSeconds,
    currentTime: 0,
    paused: false,
    ended: false,
    ontimeupdate: null as (() => void) | null,
    onended: null as (() => void) | null,
    onerror: null as (() => void) | null,
    play: async () => {
      isPaused = false;
      adapter.paused = false;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          await ensureBrowserVoices();
          const utterance = new SpeechSynthesisUtterance(cleanedSpeech);
          const isSpain = targetVoice.includes('es-es') || targetVoice.includes('alvaro') || targetVoice.includes('elvira');
          const isBritish = targetVoice.includes('uk') || targetVoice.includes('gb') || targetVoice.includes('british') || targetVoice.includes('sonia');
          const isFemale = targetVoice.includes('female') || targetVoice.includes('dalia') || targetVoice.includes('elvira') || targetVoice.includes('paloma') || targetVoice.includes('jenny') || targetVoice.includes('yujie') || targetVoice.includes('chengshu') || targetVoice.includes('tianmei') || targetVoice.includes('shaonv');
          const isMale = !isFemale && (targetVoice.includes('male') || targetVoice.includes('jorge') || targetVoice.includes('alvaro') || targetVoice.includes('alonso') || targetVoice.includes('roger') || targetVoice.includes('guy') || targetVoice.includes('qingse') || targetVoice.includes('jingying') || targetVoice.includes('daxuesheng'));

          utterance.lang = isEnglish ? (isBritish ? 'en-GB' : 'en-US') : (isSpain ? 'es-ES' : 'es-MX');
          utterance.rate = isEnglish ? 0.9 : 1.0;
          utterance.pitch = isMale ? 0.82 : (isFemale ? 1.05 : 1.0);

          const bestVoice = getBestBrowserVoice(isEnglish ? 'en' : 'es', targetVoice);
          if (bestVoice) utterance.voice = bestVoice;

          utterance.onend = () => {
            if (activeSpeechAdapter === adapter) activeSpeechAdapter = null;
            if (timer) clearInterval(timer);
            adapter.currentTime = adapter.duration;
            adapter.ended = true;
            adapter.onended?.();
          };
          utterance.onerror = () => {
            if (activeSpeechAdapter === adapter) activeSpeechAdapter = null;
            if (timer) clearInterval(timer);
            adapter.ended = true;
            adapter.onerror?.();
          };

          window.speechSynthesis.speak(utterance);
          startTime = Date.now();
          timer = setInterval(() => {
            if (isPaused || adapter.ended) return;
            const elapsed = (Date.now() - startTime) / 1000;
            adapter.currentTime = Math.min(elapsed, adapter.duration);
            adapter.ontimeupdate?.();
            if (elapsed >= adapter.duration && !adapter.ended) {
              if (timer) clearInterval(timer);
              adapter.ended = true;
              adapter.onended?.();
            }
          }, 50);
        } catch (_) {
          if (activeSpeechAdapter === adapter) activeSpeechAdapter = null;
          adapter.ended = true;
          adapter.onended?.();
        }
      } else {
        if (activeSpeechAdapter === adapter) activeSpeechAdapter = null;
        adapter.ended = true;
        adapter.onended?.();
      }
    },
    pause: () => {
      isPaused = true;
      adapter.paused = true;
      if (activeSpeechAdapter === adapter) activeSpeechAdapter = null;
      if (timer) clearInterval(timer);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {}
      }
    }
  };

  activeSpeechAdapter = adapter;
  adapter.play();
  return adapter;
}

// ─── Global Silence Helpers & Listeners ──────────────────────────────────────
export function cancelAllSpeechAndAudio() {
  stopTutorVoice();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
}

if (typeof window !== 'undefined') {
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (_) {}

  const handleGlobalSilence = () => {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
    try {
      stopTutorVoice();
    } catch (_) {}
  };

  window.addEventListener('beforeunload', handleGlobalSilence, { capture: true });
  window.addEventListener('pagehide', handleGlobalSilence, { capture: true });
}

// Standard playTTS (immediate audio start for Tutor speech with preferred voice)
export async function playTTS(text: string, voice?: string, emotion = 'calm', speed = 1.0): Promise<HTMLAudioElement | any> {
  const speechText = cleanTextForTTS(text);
  if (!speechText) {
    return {
      duration: 0,
      currentTime: 0,
      paused: true,
      ended: true,
      play: async () => {},
      pause: () => {},
      ontimeupdate: null,
      onended: null,
      onerror: null,
    };
  }

  // 🛑 Stop any currently active audio and grab a unique session ID for this request
  stopTutorVoice();
  const currentSessionId = activePlaybackSessionId;

  const targetVoice = voice && voice !== 'default' ? voice : getSavedPreferredVoice();

  // 1. Try Primary Cloud Synthesis (MiniMax HD / Microsoft Neural Studio / Google)
  try {
    const blob = await api.synthesize(speechText, targetVoice, emotion, speed);

    // If a newer audio request was started while fetching, abort this one!
    if (activePlaybackSessionId !== currentSessionId) {
      return {
        duration: 0,
        currentTime: 0,
        paused: true,
        ended: true,
        play: async () => {},
        pause: () => {},
        ontimeupdate: null,
        onended: null,
        onerror: null,
      };
    }

    if (blob && blob.size > 200) {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioElement = audio;
      attachAudioElementToAnalyzer(audio);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err && err.name !== 'AbortError') {
            console.warn('TTS Audio play error:', err);
          }
        });
      }
      audio.onended = () => {
        URL.revokeObjectURL(url);
        detachAudioElement(audio);
        if (activeAudioElement === audio) activeAudioElement = null;
      };
      return audio;
    }
  } catch (err) {
    console.warn('Backend TTS synthesis failed, switching to browser audio adapter:', err);
  }

  // If session changed while in catch, abort
  if (activePlaybackSessionId !== currentSessionId) {
    return {
      duration: 0,
      currentTime: 0,
      paused: true,
      ended: true,
      play: async () => {},
      pause: () => {},
      ontimeupdate: null,
      onended: null,
      onerror: null,
    };
  }

  // 2. High Quality Browser Synthesis fallback
  return createBrowserSpeechAudioAdapter(speechText, targetVoice);
}

// ─── TEST VOICE PREVIEW (Plays instant audio sample for any voice ID) ───────────
export async function testVoicePreview(voiceId: string, previewText?: string): Promise<HTMLAudioElement | any> {
  stopTutorVoice();
  const sampleText = previewText || '¡Hola! Soy tu tutor en Guionbajo. Esta es una prueba de mi voz.';
  
  try {
    const blob = await api.synthesize(sampleText, voiceId, 'calm', 1.0);
    if (blob && blob.size > 100) {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioElement = audio;
      attachAudioElementToAnalyzer(audio);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err && err.name !== 'AbortError') {
            console.warn('Voice preview play error:', err);
          }
        });
      }
      audio.onended = () => {
        URL.revokeObjectURL(url);
        detachAudioElement(audio);
        if (activeAudioElement === audio) activeAudioElement = null;
      };
      return audio;
    }
  } catch (err) {
    console.warn('Voice preview synthesis failed, falling back to browser speech:', err);
  }

  // Fallback to browser speech adapter matching voiceId
  return createBrowserSpeechAudioAdapter(sampleText, voiceId);
}

// ─── CACHÉ DE AUDIO EN MEMORIA DEL NAVEGADOR PARA REPRODUCCIÓN INSTANTÁNEA (0ms) ─
const englishAudioBlobCache = new Map<string, Blob>();
const englishAudioLoadingPromises = new Map<string, Promise<Blob | null>>();

/**
 * Precarga el audio de una palabra o frase en memoria en segundo plano.
 * Permite que cuando el usuario haga clic en cualquier botón de fonética o pares mínimos,
 * el sonido se reproduzca instantáneamente (0ms) sin esperar 3 segundos por síntesis.
 */
export async function preloadEnglishAudio(text: string, preferredVoice = 'en-US-JennyNeural'): Promise<Blob | null> {
  const speechText = cleanTextForTTS(text);
  if (!speechText) return null;

  const isFemale = !preferredVoice || preferredVoice.includes('Jenny') || preferredVoice.includes('Aria') || preferredVoice.includes('female');
  const targetVoice = preferredVoice || (isFemale ? 'en-US-JennyNeural' : 'en-US-RogerNeural');
  const cacheKey = `${targetVoice}:${speechText.toLowerCase()}`;

  if (englishAudioBlobCache.has(cacheKey)) {
    return englishAudioBlobCache.get(cacheKey)!;
  }

  if (englishAudioLoadingPromises.has(cacheKey)) {
    return englishAudioLoadingPromises.get(cacheKey)!;
  }

  const loadPromise = (async () => {
    try {
      const blob = await api.synthesize(speechText, targetVoice, 'calm', 0.95);
      if (blob && blob.size > 100) {
        englishAudioBlobCache.set(cacheKey, blob);
        return blob;
      }
    } catch (e) {
      // Silencioso en precarga para no contaminar la consola
    } finally {
      englishAudioLoadingPromises.delete(cacheKey);
    }
    return null;
  })();

  englishAudioLoadingPromises.set(cacheKey, loadPromise);
  return loadPromise;
}

// ─── PLAY ENGLISH AUDIO (Jenny / Roger / Aria Neural HD / Edge-TTS) ───────────
// High-definition natural English speech for exercise sentences, phonetics, POV companions, and examples.
export async function playEnglishAudio(text: string, preferredVoice = 'en-US-JennyNeural'): Promise<HTMLAudioElement | void> {
  const speechText = cleanTextForTTS(text);
  if (!speechText) return;

  stopTutorVoice();

  const isFemale = !preferredVoice || preferredVoice.includes('Jenny') || preferredVoice.includes('Aria') || preferredVoice.includes('female');
  const targetVoice = preferredVoice || (isFemale ? 'en-US-JennyNeural' : 'en-US-RogerNeural');
  const cacheKey = `${targetVoice}:${speechText.toLowerCase()}`;

  // 1. Obtener desde caché en memoria instantánea (0ms) o precarga en progreso
  try {
    let blob: Blob | null = englishAudioBlobCache.get(cacheKey) || null;
    if (!blob && englishAudioLoadingPromises.has(cacheKey)) {
      blob = await englishAudioLoadingPromises.get(cacheKey)!;
    }
    if (!blob) {
      blob = await preloadEnglishAudio(speechText, targetVoice);
    }

    if (blob && blob.size > 100) {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioElement = audio;
      attachAudioElementToAnalyzer(audio);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err && err.name !== 'AbortError') {
            console.warn('English Audio play error:', err);
          }
        });
      }
      audio.onended = () => {
        URL.revokeObjectURL(url);
        detachAudioElement(audio);
        if (activeAudioElement === audio) activeAudioElement = null;
      };
      return audio;
    }
  } catch (e) {
    console.warn('Backend English TTS synthesis fallback to browser:', e);
  }

  // 2. Fallback to Browser Web Speech API strictly in English with matching gender
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      await ensureBrowserVoices();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = isFemale ? 1.08 : 0.95;

      const enVoice = getBestBrowserVoice('en', isFemale ? 'Jenny' : 'Roger');
      if (enVoice) {
        utterance.voice = enVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }
}

// ─── ASYNC TUTOR VOICE MOTOR (playTutorVoice) ──────────────────────────────────
// Returns a Promise that resolves ONLY when the tutor finishes speaking (onended).
export async function playTutorVoice(text: string, lang = 'es'): Promise<void> {
  const speechText = cleanTextForTTS(text);
  if (!speechText) return Promise.resolve();

  stopTutorVoice();

  return new Promise((resolve) => {
    let finished = false;
    let safetyTimer: NodeJS.Timeout | null = null;

    const cleanupAndResolve = () => {
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      if (currentResolveHandler === cleanupAndResolve) {
        currentResolveHandler = null;
      }
      if (!finished) {
        finished = true;
        resolve();
      }
    };

    currentResolveHandler = cleanupAndResolve;

    const wordsCount = text.split(/\s+/).filter(Boolean).length;
    const maxSafetyMs = Math.max(wordsCount * 650, 6000) + 12000;
    safetyTimer = setTimeout(() => {
      cleanupAndResolve();
    }, maxSafetyMs);

    const savedVoice = getSavedPreferredVoice();
    const isEng = lang === 'en';
    const isFemale = !savedVoice.includes('male') && !savedVoice.includes('jorge') && !savedVoice.includes('alvaro') && !savedVoice.includes('alonso') && !savedVoice.includes('qingse') && !savedVoice.includes('jingying') && !savedVoice.includes('daxuesheng');
    const targetVoice = isEng ? (isFemale ? 'en-US-JennyNeural' : 'en-US-RogerNeural') : (savedVoice || 'female-yujie');

    const fallbackToBrowserSpeech = async () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        cleanupAndResolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        await ensureBrowserVoices();
        const utterance = new SpeechSynthesisUtterance(speechText);
        activeUtterance = utterance;
        utterance.lang = isEng ? 'en-US' : 'es-MX';
        utterance.rate = isEng ? 0.9 : 1.0;
        utterance.pitch = 1.0;

        const bestVoice = getBestBrowserVoice(isEng ? 'en' : 'es', targetVoice);
        if (bestVoice) utterance.voice = bestVoice;

        utterance.onend = () => {
          if (activeUtterance === utterance) activeUtterance = null;
          cleanupAndResolve();
        };
        utterance.onerror = () => {
          if (activeUtterance === utterance) activeUtterance = null;
          cleanupAndResolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        cleanupAndResolve();
      }
    };

    (async () => {
      try {
        const blob = await api.synthesize(speechText, targetVoice);
        if (!blob || blob.size === 0 || finished) {
          if (!finished) fallbackToBrowserSpeech();
          return;
        }

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        activeAudioElement = audio;
        attachAudioElementToAnalyzer(audio);

        audio.onended = () => {
          URL.revokeObjectURL(url);
          detachAudioElement(audio);
          if (activeAudioElement === audio) activeAudioElement = null;
          cleanupAndResolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          detachAudioElement(audio);
          if (activeAudioElement === audio) activeAudioElement = null;
          fallbackToBrowserSpeech();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err && err.name === 'NotAllowedError') {
              console.warn('Autoplay blocked by browser policy, resolving voice.');
              cleanupAndResolve();
            } else if (!finished) {
              fallbackToBrowserSpeech();
            }
          });
        }
      } catch (err) {
        console.warn('Tutor voice API error, falling back to browser speech:', err);
        if (!finished) fallbackToBrowserSpeech();
      }
    })();
  });
}

