'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, playEnglishAudio, cleanTextForTTS } from '@/lib/api';
import {
  BookOpen,
  Volume2,
  Mic,
  Square,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  Gamepad2,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Maximize2,
  X,
  Image as ImageIcon,
  User,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface ReadingWord {
  word: string;
  clean_word: string;
  ipa: string;
  is_target?: boolean;
  status?: 'correct' | 'mispronounced' | 'neutral';
  score?: number;
}

export interface ReadingChunk {
  chunk_id: string;
  order: number;
  text: string;
  translation?: string;
  has_new_image?: boolean;
  scene_context?: string;
  image_prompt?: string;
  words: ReadingWord[];
}

export interface CharacterProfile {
  name: string;
  description: string;
}

export interface CharacterBible {
  characters?: CharacterProfile[];
  base_setting?: string;
  art_style?: string;
}

export interface ReadingStory {
  title: string;
  title_es?: string;
  topic: string;
  sublevel: string;
  character_bible?: CharacterBible;
  target_keywords?: string[];
  chunks: ReadingChunk[];
}

interface ReadingPracticeArenaProps {
  topic: string;
  sublevel: string;
  lessonId?: string;
  onContinueToGames: () => void;
  onBackToLesson?: () => void;
}

// 🎨 Helper functions for image prompt sanitization, fallback, and preloading (consistent with Tutor content creation)
function sanitizeImagePrompt(prompt: string, topic: string, chunkIdx = 0): string {
  let clean = prompt || '';

  // 1. Remove IPA phonetic notations like /e/, /æ/, /iː/, /ʌ/, /ʃ/
  clean = clean.replace(/\/[A-Za-zʃʊʌæəɪɔɑɜθðʒŋːˈ\.\s]+\//g, ' ');

  // 2. Remove words that trigger fighting cartoon or textual artifacts
  clean = clean.replace(/\b(?:duel|versus|vs|fight|fighting|boxers|boxing ring|boxing gloves|letters|phoneme|alphabet|spelling|text|characters|subtitles)\b/gi, 'educational scene');

  // 3. Remove quotes, symbols, brackets
  clean = clean.replace(/[/\\|\[\](){}+=→<>_~*#^"“”‘`]/g, ' ');
  clean = clean.replace(/\s{2,}/g, ' ').trim();

  // If prompt is empty or short, build a rich visual scene
  if (clean.length < 12) {
    const cleanTopic = topic.replace(/\/[^\/]+\//g, '').replace(/Laboratorio Fonético/i, 'English conversation practice').trim();
    clean = `vibrant 2D digital vector educational illustration of a student learning ${cleanTopic || 'English language'} in a cozy modern study room with books and laptop, warm atmospheric lighting, colorful aesthetic`;
  }

  const negativeSuffix = 'vibrant 2D educational digital illustration, modern relatable setting, warm ambient lighting, expressive characters, rich colors, clean composition, strictly no text, no letters, no words, no writing, no labels, no captions, no typography, no watermarks, no alphabets';

  return clean.toLowerCase().includes('no text') ? clean : `${clean}, ${negativeSuffix}`;
}

function getFallbackImageUrl(prompt: string, topic: string, chunkIdx = 0): string {
  const cleanPrompt = sanitizeImagePrompt(prompt, topic, chunkIdx);
  const seed = (cleanPrompt + topic + chunkIdx).split('').reduce((acc: number, c: string) => (acc * 31 + c.charCodeAt(0)) & 0x7fffffff, 17);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=576&model=flux&nologo=true&enhance=false&seed=${seed}`;
}

function preloadImage(url: string, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || typeof window === 'undefined') { resolve(false); return; }
    const img = new Image();
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; resolve(false); }
    }, timeoutMs);
    img.onload = () => {
      if (!done) { done = true; clearTimeout(timer); resolve(true); }
    };
    img.onerror = () => {
      if (!done) { done = true; clearTimeout(timer); resolve(false); }
    };
    img.src = url;
  });
}

export default function ReadingPracticeArena({
  topic,
  sublevel,
  lessonId,
  onContinueToGames,
  onBackToLesson,
}: ReadingPracticeArenaProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [story, setStory] = useState<ReadingStory | null>(null);

  // Progressive vertical feed: activeChunkIdx tracks the highest unlocked chunk
  const [activeChunkIdx, setActiveChunkIdx] = useState<number>(0);
  const [showTranslations, setShowTranslations] = useState<Record<number, boolean>>({});

  // Audio playback state
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [playingChunkIdx, setPlayingChunkIdx] = useState<number | null>(null);

  // Per-chunk generated image URLs and loading states
  const [chunkImages, setChunkImages] = useState<Record<number, string>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [zoomedImage, setZoomedImage] = useState<{ url: string; caption?: string } | null>(null);

  // Recording & Evaluation states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [chunkEvaluations, setChunkEvaluations] = useState<Record<number, {
    is_correct: boolean;
    overall_score: number;
    accuracy_percent: number;
    correct_words_count: number;
    total_words_count: number;
    words_evaluation: ReadingWord[];
    mispronounced_words?: string[];
    feedback: string;
  }>>({});

  // Story completion state
  const [isStoryCompleted, setIsStoryCompleted] = useState<boolean>(false);
  const [totalXpEarned, setTotalXpEarned] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const audioHandleRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<string>('');
  const isEvaluatingRef = useRef<boolean>(false);
  const activeChunkRef = useRef<HTMLDivElement | null>(null);

  // 🎨 Generates & preloads image for a single chunk using MiniMax image-01 or fallback
  const generateSingleChunkImage = async (idx: number, rawPrompt: string, topicName: string): Promise<string> => {
    setImageLoading(prev => ({ ...prev, [idx]: true }));

    const sanitizedPrompt = sanitizeImagePrompt(rawPrompt, topicName, idx);
    let imageUrl = '';

    try {
      const res = await api.generateImage(sanitizedPrompt, '16:9').catch(() => null);
      if (res && res.success && (res.url || res.image_url)) {
        imageUrl = res.url || res.image_url;
      }
    } catch (err) {
      console.warn(`MiniMax image gen failed for reading chunk ${idx}:`, err);
    }

    if (!imageUrl) {
      imageUrl = getFallbackImageUrl(sanitizedPrompt, topicName, idx);
    }

    await preloadImage(imageUrl, 4000);

    setChunkImages(prev => ({ ...prev, [idx]: imageUrl }));
    setImageLoading(prev => ({ ...prev, [idx]: false }));
    return imageUrl;
  };

  // 1. Fetch or generate reading story & preload Chunk 0 image completely before starting
  useEffect(() => {
    let isMounted = true;
    async function loadStory() {
      setLoading(true);
      try {
        let res: any = null;
        if (lessonId && lessonId !== 'new' && !lessonId.startsWith('a1') && !lessonId.startsWith('a2')) {
          try {
            res = await api.getLessonReading(lessonId);
          } catch (e) {
            console.warn('Lesson reading not found by ID, generating new one...');
          }
        }

        if (!res || !res.story) {
          res = await api.generateReadingStory(topic, sublevel, lessonId);
        }

        if (isMounted && res && res.story) {
          setStory(res.story);

          // 🎨 STEP 1: Generate & Preload Chunk 0 image COMPLETELY before hiding loading screen!
          const chunk0 = res.story.chunks?.[0];
          if (chunk0 && chunk0.has_new_image !== false) {
            const prompt0 = chunk0.image_prompt || `${chunk0.scene_context || chunk0.text}, 2D vector educational illustration`;
            await generateSingleChunkImage(0, prompt0, topic);
          }

          // 🎨 STEP 2: Non-blocking background worker for subsequent chunks (1..N)
          (async () => {
            for (let idx = 1; idx < res.story.chunks.length; idx++) {
              if (!isMounted) break;
              const chunk = res.story.chunks[idx];
              if (chunk.has_new_image === false) continue;
              const prompt = chunk.image_prompt || `${chunk.scene_context || chunk.text}, 2D vector educational illustration`;
              await generateSingleChunkImage(idx, prompt, topic);
            }
          })();
        }
      } catch (err) {
        console.error('Failed to load reading story:', err);
        toast.error('Error al cargar la práctica de lectura.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStory();

    return () => {
      isMounted = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (audioHandleRef.current) {
        try { audioHandleRef.current.pause(); } catch (_) {}
      }
    };
  }, [topic, sublevel, lessonId]);

  // Scroll active chunk into focus when activeChunkIdx changes
  useEffect(() => {
    if (activeChunkRef.current) {
      setTimeout(() => {
        activeChunkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  }, [activeChunkIdx]);

  // Play individual word pronunciation
  const handlePlayWordAudio = async (word: string, cleanWord: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetWord = cleanWord || word;
    if (!targetWord) return;

    setPlayingWord(targetWord);
    try {
      await playEnglishAudio(targetWord);
    } catch (err) {
      console.warn('Play word audio error:', err);
    } finally {
      setTimeout(() => setPlayingWord(null), 700);
    }
  };

  // Play full chunk text
  const handlePlayFullChunk = async (chunkText: string, chunkIdx: number) => {
    if (!chunkText) return;
    if (playingChunkIdx === chunkIdx) {
      if (audioHandleRef.current) {
        try { audioHandleRef.current.pause(); } catch (_) {}
      }
      setPlayingChunkIdx(null);
      return;
    }

    setPlayingChunkIdx(chunkIdx);
    try {
      const audio = await playEnglishAudio(chunkText);
      if (audio && audio instanceof HTMLAudioElement) {
        audioHandleRef.current = audio;
        audio.onended = () => setPlayingChunkIdx(null);
      } else {
        setTimeout(() => setPlayingChunkIdx(null), 3500);
      }
    } catch (err) {
      console.warn('Play full chunk error:', err);
      setPlayingChunkIdx(null);
    }
  };

  // Voice recording for the active chunk
  const startReadingRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta reconocimiento de voz. Usa Google Chrome o Edge.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    transcriptRef.current = '';
    setLiveTranscript('');
    setIsRecording(true);

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    recognitionRef.current = rec;

    rec.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript + ' ';
      }
      const cleaned = fullTranscript.trim();
      transcriptRef.current = cleaned;
      setLiveTranscript(cleaned);
    };

    rec.onerror = (e: any) => {
      if (e?.error === 'aborted' || e?.error === 'no-speech') return;
      if (e?.error === 'not-allowed') {
        toast.error('Permiso de micrófono denegado en tu navegador.');
      } else {
        console.warn('Speech recognition warning:', e?.error || e);
      }
    };

    rec.onend = () => {
      setIsRecording(false);
      const textToEval = transcriptRef.current.trim();
      if (textToEval && !isEvaluatingRef.current) {
        evaluateAttempt(textToEval);
      }
    };

    try {
      rec.start();
    } catch (err) {
      console.warn('Error starting speech recognition:', err);
      setIsRecording(false);
    }
  };

  const stopReadingRecognition = () => {
    setIsRecording(false);
    const textToEval = transcriptRef.current.trim() || liveTranscript.trim();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }

    if (textToEval) {
      evaluateAttempt(textToEval);
    } else {
      toast('No se detectó voz. Por favor habla cerca del micrófono.', {
        icon: '🎙️',
        duration: 3500,
      });
    }
  };

  // Evaluate active chunk reading attempt
  const evaluateAttempt = async (transcript: string) => {
    const currentChunk = story?.chunks?.[activeChunkIdx];
    if (!currentChunk || !transcript.trim() || isEvaluatingRef.current) return;

    isEvaluatingRef.current = true;
    setIsEvaluating(true);
    try {
      const chunkWordsToSend = currentChunk.words.map(w => ({
        word: w.word,
        clean_word: w.clean_word,
        ipa: w.ipa,
        is_target: w.is_target,
      }));

      const res = await api.evaluateReadingChunk({
        chunk_words: chunkWordsToSend,
        transcript: transcript.trim(),
        lesson_id: lessonId,
        chunk_id: currentChunk.chunk_id,
      });

      setChunkEvaluations(prev => ({
        ...prev,
        [activeChunkIdx]: {
          is_correct: res.is_correct,
          overall_score: res.overall_score,
          accuracy_percent: res.accuracy_percent,
          correct_words_count: res.correct_words_count,
          total_words_count: res.total_words_count,
          words_evaluation: res.words_evaluation,
          mispronounced_words: res.mispronounced_words || [],
          feedback: res.feedback,
        },
      }));

      if (res.xp_earned) {
        setTotalXpEarned(prev => prev + res.xp_earned);
      }

      if (res.is_correct) {
        toast.success(`¡Excelente! ${res.accuracy_percent}% de precisión en este fragmento. 🎉`);
      } else {
        toast('Revisa las palabras en rojo y haz clic en ellas para escuchar cómo suenan.', {
          icon: '💡',
          duration: 4000,
        });
      }
    } catch (err) {
      console.error('Error evaluating reading chunk:', err);
      toast.error('Error al evaluar la pronunciación.');
    } finally {
      isEvaluatingRef.current = false;
      setIsEvaluating(false);
      setLiveTranscript('');
      transcriptRef.current = '';
    }
  };

  const handleRetryChunk = (chunkIdx: number) => {
    setChunkEvaluations(prev => {
      const next = { ...prev };
      delete next[chunkIdx];
      return next;
    });
    setActiveChunkIdx(chunkIdx);
    setLiveTranscript('');
    transcriptRef.current = '';
  };

  const handleNextChunk = () => {
    if (!story) return;
    if (activeChunkIdx < story.chunks.length - 1) {
      setActiveChunkIdx(prev => prev + 1);
    } else {
      setIsStoryCompleted(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 glass rounded-3xl border border-brand-border/60 min-h-[420px] text-center">
        <div className="w-16 h-16 rounded-full bg-brand-cyan/20 border-2 border-brand-cyan flex items-center justify-center mb-4 animate-pulse">
          <BookOpen className="w-8 h-8 text-brand-cyan" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Preparando Narrativa Visual...</h3>
        <p className="text-xs text-brand-text-secondary max-w-md">
          Diseñando historia para <strong className="text-white">{topic}</strong> con continuidad de personajes y fonética IPA palabra por palabra.
        </p>
        <Loader2 className="w-6 h-6 text-brand-accent animate-spin mt-4" />
      </div>
    );
  }

  // 🏆 STORY COMPLETED SUMMARY SCREEN
  if (isStoryCompleted && story) {
    const totalChunks = story.chunks.length;
    const evaluatedChunks = Object.values(chunkEvaluations);
    const avgScore = evaluatedChunks.length > 0
      ? Math.round(evaluatedChunks.reduce((acc, curr) => acc + curr.accuracy_percent, 0) / evaluatedChunks.length)
      : 90;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto w-full p-6 sm:p-8 glass rounded-3xl border border-emerald-500/40 shadow-2xl space-y-6 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <Award className="w-10 h-10 text-emerald-400 animate-bounce" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            ¡Historia Completa Leída y Superada!
          </span>
          <h2 className="text-2xl sm:text-3xl font-outfit font-extrabold text-white">
            {story.title}
          </h2>
          {story.title_es && (
            <p className="text-sm text-emerald-300/80 italic mt-0.5">{story.title_es}</p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Precisión Global</span>
            <span className="text-xl font-bold text-emerald-400">{avgScore}%</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Escenas Leídas</span>
            <span className="text-xl font-bold text-brand-cyan">{totalChunks}/{totalChunks}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-brand-text-muted uppercase font-bold block">XP Ganados</span>
            <span className="text-xl font-bold text-yellow-400">+{Math.max(30, totalXpEarned || 40)} XP</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-white/80 max-w-lg mx-auto leading-relaxed">
          Has completado la lectura visual guiada con fonética IPA y autocorrección. Ahora es momento de poner a prueba tus reflejos en la zona de juegos interactiva.
        </p>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsStoryCompleted(false);
              setActiveChunkIdx(0);
            }}
            className="px-4 py-2.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RotateCcw size={14} />
            <span>Releer Desde el Inicio</span>
          </button>

          <button
            type="button"
            onClick={onContinueToGames}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-brand-cyan hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-brand-accent/30 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Gamepad2 size={18} className="animate-bounce" />
            <span>Continuar a la Zona de Juegos 🎮</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    );
  }

  if (!story) return null;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full py-1">
      {/* 📖 Header Bar: Story Title, Character Bible Chips & Progress Stepper */}
      <div className="flex flex-col gap-3.5 glass p-4 sm:p-5 rounded-3xl border border-brand-border/80 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan flex-shrink-0">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 uppercase tracking-wider">
                  Práctica de Lectura Visual • {sublevel}
                </span>
                <span className="text-[11px] text-yellow-300 font-semibold flex items-center gap-1">
                  <Sparkles size={12} /> {topic}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-outfit font-bold text-white">
                {story.title}
                {story.title_es && (
                  <span className="text-xs font-normal text-brand-text-secondary ml-2 italic">
                    ({story.title_es})
                  </span>
                )}
              </h2>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <div className="flex items-center gap-1.5">
              {story.chunks.map((_, idx) => {
                const isDone = Boolean(chunkEvaluations[idx]);
                const isActive = idx === activeChunkIdx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveChunkIdx(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-6 bg-brand-cyan shadow-[0_0_8px_rgba(0,212,255,0.6)]'
                        : isDone
                        ? 'w-2.5 bg-emerald-400'
                        : 'w-2.5 bg-brand-border'
                    }`}
                    title={`Ir a Escena ${idx + 1}`}
                  />
                );
              })}
            </div>
            <span className="text-xs font-bold text-brand-cyan ml-1 bg-brand-surface px-2.5 py-1 rounded-xl border border-brand-border">
              Escena {activeChunkIdx + 1} de {story.chunks.length}
            </span>
          </div>
        </div>

        {/* 🎭 Character Bible Continuity Chips (if available) */}
        {story.character_bible?.characters && story.character_bible.characters.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/10 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-brand-text-muted flex items-center gap-1">
              <User size={12} className="text-brand-cyan" /> Personajes:
            </span>
            {story.character_bible.characters.map((char, cIdx) => (
              <div
                key={cIdx}
                className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-white/90 flex items-center gap-1.5 shadow-sm"
                title={char.description}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-yellow-300">{char.name}</span>
                <span className="text-[11px] text-brand-text-secondary truncate max-w-[200px] sm:max-w-xs">
                  {char.description}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📜 PROGRESSIVE VERTICAL STORY STREAM (Downward Narrative Timeline) */}
      <div className="flex flex-col gap-6">
        {story.chunks.slice(0, activeChunkIdx + 1).map((chunk, idx) => {
          const isActive = idx === activeChunkIdx;
          const evaluation = chunkEvaluations[idx];
          const wordsList = evaluation?.words_evaluation || chunk.words;
          const isPlayingChunk = playingChunkIdx === idx;
          const imageUrl = chunkImages[idx] || (chunk.has_new_image === false ? chunkImages[idx - 1] : undefined);
          const isImgLoading = imageLoading[idx];
          const showTrans = showTranslations[idx];

          return (
            <motion.div
              key={chunk.chunk_id || idx}
              ref={isActive ? activeChunkRef : null}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`rounded-3xl p-5 sm:p-7 shadow-2xl transition-all relative overflow-hidden ${
                isActive
                  ? 'board-chalkboard-green chalk-stage border-2 border-brand-cyan/60 ring-2 ring-brand-cyan/20'
                  : 'bg-brand-surface/90 border border-brand-border/90'
              }`}
            >
              {/* Card Header Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider font-chalk ${
                    isActive ? 'text-yellow-300' : 'text-emerald-400'
                  }`}>
                    📌 Escena {idx + 1} de {story.chunks.length} {isActive ? '(Leyendo Ahora)' : '✓ (Superada)'}
                  </span>
                  {chunk.scene_context && (
                    <span className="text-[11px] text-white/70 italic hidden md:inline">
                      • {chunk.scene_context}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Listen Full Chunk Audio Button */}
                  <button
                    type="button"
                    onClick={() => handlePlayFullChunk(chunk.text, idx)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                      isPlayingChunk
                        ? 'bg-yellow-400 text-black border-yellow-400 animate-pulse scale-105'
                        : 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border-yellow-400/40 hover:scale-105'
                    }`}
                    title="Escuchar pronunciación de esta escena"
                  >
                    <Volume2 size={14} className={isPlayingChunk ? 'animate-bounce' : ''} />
                    <span>{isPlayingChunk ? 'Reproduciendo...' : 'Escuchar Escena'}</span>
                  </button>

                  {/* Toggle Translation */}
                  {chunk.translation && (
                    <button
                      type="button"
                      onClick={() => setShowTranslations(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        showTrans
                          ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40'
                          : 'bg-black/30 hover:bg-black/50 text-white/70 hover:text-white border-white/15'
                      }`}
                      title={showTrans ? 'Ocultar traducción' : 'Ver traducción al español'}
                    >
                      {showTrans ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span className="hidden sm:inline">{showTrans ? 'Ocultar' : 'Traducción'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 🎨 SCENE VISUAL ILLUSTRATION & STORY PANEL */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center my-4">
                {/* Visual Scene Image (if chunk has an image or inherited from previous) */}
                {(chunk.has_new_image !== false || imageUrl) && (
                  <div className="lg:col-span-4 w-full">
                    <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-lg group bg-black/40 aspect-video lg:aspect-[4/3] flex items-center justify-center">
                      {imageUrl ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={`Escena ${idx + 1} - ${chunk.scene_context || story.title}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={() => setZoomedImage({ url: imageUrl, caption: chunk.scene_context || chunk.text })}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
                            title="Ampliar imagen"
                          >
                            <Maximize2 size={13} />
                          </button>
                        </>
                      ) : isImgLoading ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                          <Loader2 size={24} className="text-brand-cyan animate-spin" />
                          <span className="text-[10px] text-brand-text-secondary uppercase font-bold">
                            Generando Ilustración...
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-1 text-white/40">
                          <ImageIcon size={28} />
                          <span className="text-[10px]">Ilustración de Escena</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Interactive Stacked Ruby IPA Words */}
                <div className={`${(chunk.has_new_image !== false || imageUrl) ? 'lg:col-span-8' : 'lg:col-span-12'} w-full`}>
                  <div className="bg-black/45 p-4 sm:p-5 rounded-2xl border border-white/15 shadow-inner">
                    <div className="flex flex-wrap items-end gap-x-2.5 gap-y-4 leading-loose justify-start">
                      {wordsList.map((item, wIdx) => {
                        const isWordPlaying = playingWord === (item.clean_word || item.word);
                        const status = item.status || 'neutral';

                        let statusClasses = 'bg-black/40 border-white/20 hover:border-yellow-300 hover:bg-white/10 text-white shadow-sm';
                        let ipaClasses = 'text-yellow-300/80';
                        let badgeIcon = null;

                        if (status === 'correct') {
                          statusClasses = 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(0,230,118,0.25)] ring-1 ring-emerald-400/40';
                          ipaClasses = 'text-emerald-300 font-bold';
                          badgeIcon = <CheckCircle2 size={10} className="text-emerald-400" />;
                        } else if (status === 'mispronounced') {
                          statusClasses = 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_15px_rgba(255,82,82,0.3)] ring-1 ring-rose-400/50 animate-pulse';
                          ipaClasses = 'text-rose-300 font-bold';
                          badgeIcon = <AlertCircle size={10} className="text-rose-400" />;
                        }

                        if (isWordPlaying) {
                          statusClasses = 'bg-yellow-400 text-black border-yellow-300 scale-110 shadow-[0_0_20px_rgba(250,204,21,0.7)] z-20';
                          ipaClasses = 'text-black font-bold';
                        }

                        return (
                          <button
                            key={`${item.word}-${wIdx}`}
                            type="button"
                            onClick={(e) => handlePlayWordAudio(item.word, item.clean_word, e)}
                            className={`group/word relative inline-flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 ${statusClasses}`}
                            title={`Clic para escuchar: "${item.clean_word || item.word}" (${item.ipa})`}
                          >
                            {badgeIcon && (
                              <div className="absolute -top-1.5 -right-1.5 bg-black/80 rounded-full p-0.5 border border-white/20 z-10">
                                {badgeIcon}
                              </div>
                            )}

                            {/* English Word */}
                            <span className={`text-base sm:text-lg font-bold font-chalk tracking-wide select-none ${
                              isWordPlaying ? 'text-black font-extrabold' : ''
                            }`}>
                              {item.word}
                            </span>

                            {/* Phonetic IPA */}
                            <span className={`text-xs sm:text-sm font-mono tracking-tight select-none mt-0.5 ${ipaClasses}`}>
                              {item.ipa || '/.../'}
                            </span>

                            {/* Hover Audio Tooltip */}
                            <span className="absolute -bottom-5 opacity-0 group-hover/word:opacity-100 transition-opacity text-[9px] bg-black/90 text-yellow-300 px-1.5 py-0.5 rounded-md border border-white/20 whitespace-nowrap pointer-events-none z-20">
                              🔊 Escuchar
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Translation Display */}
              <AnimatePresence>
                {showTrans && chunk.translation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3.5 rounded-2xl bg-black/35 border border-brand-cyan/30 text-xs sm:text-sm text-cyan-200 font-chalk flex items-start gap-2.5 shadow-md mb-3"
                  >
                    <span className="font-bold text-brand-cyan flex-shrink-0">Traducción:</span>
                    <p className="italic leading-relaxed">{chunk.translation}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live Speech Recognition Box (Active Chunk Only) */}
              {isActive && isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-3 text-xs shadow-lg mb-3"
                >
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-rose-400 font-bold uppercase tracking-wider block text-[10px]">
                      Escuchando tu voz... Habla ahora en inglés:
                    </span>
                    <p className="font-mono text-white text-xs truncate mt-0.5">
                      {liveTranscript || 'Lee las oraciones de la pizarra con calma...'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={stopReadingRecognition}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-md flex-shrink-0"
                  >
                    <Square size={12} className="fill-white" />
                    <span>Detener y Calificar</span>
                  </button>
                </motion.div>
              )}

              {/* Evaluation Feedback & Self-Correction Banner */}
              {evaluation && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-2.5 mb-3 ${
                    evaluation.is_correct
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 font-bold">
                    <div className="flex items-center gap-2">
                      {evaluation.is_correct ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                      )}
                      <span className="text-sm">
                        {evaluation.is_correct ? '¡Escena Aprobada!' : 'Autocorrección Necesaria'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/15 text-yellow-300 font-bold">
                        Precisión: {evaluation.accuracy_percent}% ({evaluation.correct_words_count}/{evaluation.total_words_count} palabras)
                      </span>
                    </div>
                  </div>

                  <p className="leading-relaxed text-white/90 font-chalk">
                    💡 {evaluation.feedback}
                  </p>

                  {evaluation.mispronounced_words && evaluation.mispronounced_words.length > 0 && (
                    <div className="pt-1 text-[11px] text-white/80 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-yellow-300">👉 Toca las palabras en rojo:</span>
                      {evaluation.mispronounced_words.map((w, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={(e) => handlePlayWordAudio(w, w, e)}
                          className="px-2 py-0.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 border border-rose-400 text-rose-100 font-mono flex items-center gap-1 hover:scale-105 transition-all cursor-pointer"
                        >
                          <Volume2 size={11} /> {w}
                        </button>
                      ))}
                      <span>para escuchar su fonética antes de reintentar.</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 🎙️ Voice & Progressive Navigation Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {isActive && !evaluation ? (
                    <button
                      type="button"
                      onClick={isRecording ? stopReadingRecognition : startReadingRecognition}
                      disabled={isEvaluating}
                      className={`px-5 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg ${
                        isEvaluating
                          ? 'bg-brand-surface border-brand-accent text-brand-cyan animate-pulse'
                          : isRecording
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.6)] scale-105 animate-pulse'
                          : 'bg-brand-accent hover:bg-brand-accent/90 text-white border-brand-accent hover:scale-105 glow-accent'
                      }`}
                      title="Grabar tu voz leyendo las oraciones"
                    >
                      {isEvaluating ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : isRecording ? (
                        <Square size={16} className="fill-white" />
                      ) : (
                        <Mic size={16} />
                      )}
                      <span>
                        {isEvaluating
                          ? 'Calificando...'
                          : isRecording
                          ? 'Detener y Calificar'
                          : 'Leer en Voz Alta 🎤'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRetryChunk(idx)}
                      className="px-4 py-2.5 rounded-2xl bg-black/50 hover:bg-black/70 border border-white/20 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Reintentar esta escena"
                    >
                      <RotateCcw size={14} />
                      <span>Reintentar Escena 🔄</span>
                    </button>
                  )}

                  {isActive && (
                    <span className="text-[11px] text-white/70 italic hidden md:inline">
                      Presiona el micrófono y lee las oraciones con naturalidad.
                    </span>
                  )}
                </div>

                {/* Advance to Next Scene or Finish Story */}
                {isActive && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleNextChunk}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md ${
                        evaluation?.is_correct
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 hover:scale-105'
                          : 'bg-brand-cyan hover:bg-brand-cyan/90 text-brand-dark hover:scale-105'
                      }`}
                    >
                      <span>
                        {activeChunkIdx < story.chunks.length - 1
                          ? 'Avanzar a Siguiente Escena ↓'
                          : 'Finalizar Historia 🏆'}
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 🔍 Lightbox / Modal for Zoomed Image */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <div
              className="relative max-w-4xl w-full bg-brand-surface rounded-3xl overflow-hidden border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black text-white z-10 border border-white/20"
              >
                <X size={18} />
              </button>
              <img
                src={zoomedImage.url}
                alt="Escena ampliada"
                className="w-full h-auto max-h-[75vh] object-contain bg-black"
              />
              {zoomedImage.caption && (
                <div className="p-4 bg-brand-dark border-t border-white/10 text-xs sm:text-sm text-white/90 text-center font-chalk">
                  {zoomedImage.caption}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
