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
  generateAdaptiveLesson: (sublevel: string, class_index = 1, topic?: string) =>
    fetchWithAuth('/lesson/generate-adaptive', {
      method: 'POST',
      body: JSON.stringify({ sublevel, class_index, topic }),
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

  // ─── Image Generation (MiniMax image-01) ─────────
  generateImage: (prompt: string, aspect_ratio = '16:9') =>
    fetchWithAuth('/image/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, aspect_ratio }),
    }),

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
};

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

export function getBestBrowserVoice(lang: 'en' | 'es', preferredName?: string): SpeechSynthesisVoice | null {
  const voices = getBrowserVoices();
  if (!voices || voices.length === 0) return null;

  if (lang === 'en') {
    const enVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
    if (enVoices.length === 0) return null;

    if (preferredName) {
      const match = enVoices.find((v) => v.name.toLowerCase().includes(preferredName.toLowerCase()));
      if (match) return match;
    }

    const priorityFilters = [
      (v: SpeechSynthesisVoice) =>
        (v.name.includes('Roger') || v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Natural')) &&
        v.lang.startsWith('en'),
      (v: SpeechSynthesisVoice) =>
        (v.name.includes('Guy') || v.name.includes('Ava') || v.name.includes('Emma')) && v.lang.startsWith('en'),
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('en'),
      (v: SpeechSynthesisVoice) =>
        (v.name.includes('Samantha') || v.name.includes('Alex') || v.name.includes('Victoria')) &&
        v.lang.startsWith('en'),
      (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang.startsWith('en-US'),
      (v: SpeechSynthesisVoice) => v.lang === 'en-US',
      (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
    ];

    for (const test of priorityFilters) {
      const found = enVoices.find(test);
      if (found) return found;
    }
    return enVoices[0];
  } else {
    const esVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('es'));
    if (esVoices.length === 0) return null;

    if (preferredName) {
      const match = esVoices.find((v) => v.name.toLowerCase().includes(preferredName.toLowerCase()));
      if (match) return match;
    }

    const priorityFilters = [
      (v: SpeechSynthesisVoice) =>
        (v.name.includes('Dalia') || v.name.includes('Jorge') || v.name.includes('Sabina') || v.name.includes('Natural')) &&
        v.lang.startsWith('es'),
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('es'),
      (v: SpeechSynthesisVoice) => (v.name.includes('Paulina') || v.name.includes('Monica')) && v.lang.startsWith('es'),
      (v: SpeechSynthesisVoice) => v.lang === 'es-MX' || v.lang === 'es-ES',
      (v: SpeechSynthesisVoice) => v.lang.startsWith('es'),
    ];

    for (const test of priorityFilters) {
      const found = esVoices.find(test);
      if (found) return found;
    }
    return esVoices[0];
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

  // Remove IPA /.../
  clean = clean.replace(/\/([^\/]+)\//g, (_, p1) => ` ${p1.replace(/['ˈ\.:ː]/g, '')} `);

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

function createBrowserSpeechAudioAdapter(text: string, voiceId = 'female-shaonv') {
  const words = text.split(/\s+/).filter(Boolean).length;
  const isEnglish = voiceId.startsWith('en-') || voiceId.includes('roger') || voiceId.includes('jenny');
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
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = isEnglish ? 'en-US' : 'es-MX';
          utterance.rate = isEnglish ? 0.9 : 1.0;
          const bestVoice = getBestBrowserVoice(isEnglish ? 'en' : 'es');
          if (bestVoice) utterance.voice = bestVoice;

          utterance.onend = () => {
            if (timer) clearInterval(timer);
            adapter.currentTime = adapter.duration;
            adapter.ended = true;
            adapter.onended?.();
          };
          utterance.onerror = () => {
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
          adapter.ended = true;
          adapter.onended?.();
        }
      } else {
        adapter.ended = true;
        adapter.onended?.();
      }
    },
    pause: () => {
      isPaused = true;
      adapter.paused = true;
      if (timer) clearInterval(timer);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {}
      }
    }
  };

  adapter.play();
  return adapter;
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
export async function testVoicePreview(voiceId: string, previewText?: string): Promise<HTMLAudioElement | void> {
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
    console.warn('Voice preview synthesis failed:', err);
  }
}

// ─── PLAY ENGLISH AUDIO (Jenny / Roger / Aria Neural HD / Edge-TTS) ───────────
// High-definition natural English speech for exercise sentences, phonetics, POV companions, and examples.
export async function playEnglishAudio(text: string, preferredVoice = 'en-US-JennyNeural'): Promise<HTMLAudioElement | void> {
  const speechText = cleanTextForTTS(text);
  if (!speechText) return;

  stopTutorVoice();

  const isFemale = !preferredVoice || preferredVoice.includes('Jenny') || preferredVoice.includes('Aria') || preferredVoice.includes('female');
  const targetVoice = preferredVoice || (isFemale ? 'en-US-JennyNeural' : 'en-US-RogerNeural');

  // 1. Try Backend Studio Edge Neural TTS
  try {
    const blob = await api.synthesize(speechText, targetVoice, 'calm', 0.95);
    if (blob && blob.size > 200) {
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

    const fallbackToBrowserSpeech = async () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        cleanupAndResolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        await ensureBrowserVoices();
        const utterance = new SpeechSynthesisUtterance(text.trim());
        const isEng = lang === 'en';
        utterance.lang = isEng ? 'en-US' : 'es-MX';
        utterance.rate = isEng ? 0.9 : 1.0;
        utterance.pitch = 1.0;

        const bestVoice = getBestBrowserVoice(isEng ? 'en' : 'es');
        if (bestVoice) utterance.voice = bestVoice;

        utterance.onend = () => cleanupAndResolve();
        utterance.onerror = () => cleanupAndResolve();

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        cleanupAndResolve();
      }
    };

    (async () => {
      try {
        const targetVoice = lang === 'en' ? 'en-US-JennyNeural' : 'female-shaonv';
        const blob = await api.synthesize(text, targetVoice);
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
