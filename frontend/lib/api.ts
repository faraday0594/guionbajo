import { getToken } from './auth';

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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 2500));
      return fetchWithAuth(url, options, retries - 1);
    }
    throw err;
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

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error en síntesis de voz');
  }
  return response.blob();
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
  synthesize: (text: string, voice = 'female-shaonv', emotion = 'calm', speed = 1.0): Promise<Blob> =>
    fetchAudio('/tts/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text, voice, emotion, speed }),
    }),

  getVoices: () => fetchWithAuth('/tts/voices'),

  // ─── Image Generation (MiniMax image-01) ─────────
  generateImage: (prompt: string, aspect_ratio = '16:9') =>
    fetchWithAuth('/image/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, aspect_ratio }),
    }),

  // ─── Settings ────────────────────────────────────
  saveMinimaxKey: (api_key: string) =>
    fetchWithAuth('/settings/minimax-key', {
      method: 'POST',
      body: JSON.stringify({ api_key }),
    }),

  testTtsConnection: () =>
    fetchAudio('/tts/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text: 'Testing TTS connection' }),
    }),
};

// Global audio handle & state for linear serialization
let activeAudioElement: HTMLAudioElement | null = null;
let currentResolveHandler: (() => void) | null = null;

// Stop any currently speaking tutor voice
export function stopTutorVoice() {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch (_) {}
    activeAudioElement = null;
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

// Standard playTTS (immediate audio start for Tutor speech via MiniMax HD)
export async function playTTS(text: string, voice = 'female-shaonv', emotion = 'calm'): Promise<HTMLAudioElement> {
  const speechText = cleanTextForTTS(text);
  const blob = await api.synthesize(speechText, voice, emotion);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  activeAudioElement = audio;

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
    if (activeAudioElement === audio) activeAudioElement = null;
  };
  return audio;
}

// ─── PLAY ENGLISH AUDIO (Roger Neural HD / Edge-TTS) ───────────────────────────
// High-definition natural English speech for exercise sentences, phonetics, and examples.
export async function playEnglishAudio(text: string): Promise<HTMLAudioElement | void> {
  const speechText = cleanTextForTTS(text);
  if (!speechText) return;

  // 1. Try Backend Studio Edge Neural TTS (en-US-RogerNeural)
  try {
    const blob = await api.synthesize(speechText, 'en-US-RogerNeural', 'calm', 0.95);
    if (blob && blob.size > 200) {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioElement = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err && err.name !== 'AbortError') {
            console.warn('Roger Audio play error:', err);
          }
        });
      }
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (activeAudioElement === audio) activeAudioElement = null;
      };
      return audio;
    }
  } catch (e) {
    console.warn('Backend Roger TTS synthesis fallback to browser:', e);
  }

  // 2. Fallback to Browser Web Speech API prioritizing Roger / Natural
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = 1.0;

      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return null;
        const priority = [
          (v: SpeechSynthesisVoice) => (v.name.includes('Roger') || v.name.includes('Natural')) && v.lang.startsWith('en'),
          (v: SpeechSynthesisVoice) => (v.name.includes('Guy') || v.name.includes('Male')) && v.lang.startsWith('en'),
          (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('en'),
          (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang.startsWith('en-US'),
          (v: SpeechSynthesisVoice) => v.lang.startsWith('en-US'),
          (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
        ];
        for (const test of priority) {
          const found = voices.find(test);
          if (found) return found;
        }
        return null;
      };

      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }
}

// ─── ASYNC TUTOR VOICE MOTOR (playTutorVoice) ──────────────────────────────────
// Returns a Promise that resolves ONLY when the tutor finishes speaking (onended).
// Eliminates audio collision, overlapping, and premature timeouts.
export async function playTutorVoice(text: string, lang = 'es'): Promise<void> {
  const speechText = cleanTextForTTS(text);
  if (!speechText) return Promise.resolve();

  // 1. Terminate any previous active voice cleanly
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

    // Generous fallback safety timeout (e.g. 15-25s based on words) to prevent infinite freeze only
    const wordsCount = text.split(/\s+/).filter(Boolean).length;
    const maxSafetyMs = Math.max(wordsCount * 650, 6000) + 12000;
    safetyTimer = setTimeout(() => {
      cleanupAndResolve();
    }, maxSafetyMs);

    const fallbackToBrowserSpeech = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        cleanupAndResolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.lang = lang === 'en' ? 'en-US' : 'es-MX';
        utterance.rate = lang === 'en' ? 0.9 : 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const voice = voices.find((v) =>
            lang === 'en'
              ? (v.name.includes('Jenny') || v.name.includes('Google') || v.name.includes('Natural') || v.lang.startsWith('en-US'))
              : v.lang.startsWith('es') || v.name.includes('Jorge') || v.name.includes('Spanish')
          );
          if (voice) utterance.voice = voice;
        }

        utterance.onend = () => {
          cleanupAndResolve();
        };
        utterance.onerror = () => {
          cleanupAndResolve();
        };

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

        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (activeAudioElement === audio) activeAudioElement = null;
          cleanupAndResolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
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
