'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Lock,
  Target,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sfx } from '@/lib/soundEffects';

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
  slide_index?: number;
  part_number?: number;
  text: string;
  translation?: string;
  has_new_image?: boolean;
  scene_context?: string;
  image_prompt?: string;
  words: ReadingWord[];
}

export interface ReadingSlide {
  slide_id: string;
  slide_number: number;
  scene_title: string;
  scene_context: string;
  image_prompt?: string;
  image_url?: string;
  chunks: ReadingChunk[];
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
  slides?: ReadingSlide[];
  chunks?: ReadingChunk[];
}

interface ReadingPracticeArenaProps {
  topic: string;
  sublevel: string;
  lessonId?: string;
  onContinueToGames: () => void;
  onBackToLesson?: () => void;
}

// 🎨 Helper functions for image prompt sanitization & fallback
function sanitizeImagePrompt(prompt: string, topic: string, slideIdx = 0): string {
  let clean = prompt || '';

  clean = clean.replace(/\/[A-Za-zʃʊʌæəɪɔɑɜθðʒŋːˈ\.\s]+\//g, ' ');
  clean = clean.replace(/\b(?:duel|versus|vs|fight|fighting|boxers|boxing ring|boxing gloves|letters|phoneme|alphabet|spelling|text|characters|subtitles)\b/gi, 'educational scene');
  clean = clean.replace(/[/\\|\[\](){}+=→<>_~*#^"“”‘`]/g, ' ');
  clean = clean.replace(/\s{2,}/g, ' ').trim();

  if (clean.length < 12) {
    const cleanTopic = topic.replace(/\/[^\/]+\//g, '').replace(/Laboratorio Fonético/i, 'English conversation practice').trim();
    clean = `vibrant 2D digital vector educational illustration of a student learning ${cleanTopic || 'English language'} in a cozy modern study room with books and laptop, warm atmospheric lighting, colorful aesthetic`;
  }

  const negativeSuffix = 'vibrant 2D educational digital illustration, modern relatable setting, warm ambient lighting, expressive characters, rich colors, clean composition, strictly no text, no letters, no words, no writing, no labels, no captions, no typography, no watermarks, no alphabets';

  return clean.toLowerCase().includes('no text') ? clean : `${clean}, ${negativeSuffix}`;
}

function getFallbackImageUrl(prompt: string, topic: string, slideIdx = 0): string {
  const cleanPrompt = sanitizeImagePrompt(prompt, topic, slideIdx);
  const seed = (cleanPrompt + topic + slideIdx).split('').reduce((acc: number, c: string) => (acc * 31 + c.charCodeAt(0)) & 0x7fffffff, 17);
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

  // 🎬 Slide-based Navigation: currentSlideIdx tracks the current visual scene
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});

  // Audio playback state
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [playingChunkId, setPlayingChunkId] = useState<string | null>(null);

  // Per-slide generated image URLs and loading states
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [zoomedImage, setZoomedImage] = useState<{ url: string; caption?: string } | null>(null);

  // Recording & Evaluation states keyed by chunk_id
  const [recordingChunkId, setRecordingChunkId] = useState<string | null>(null);
  const [evaluatingChunkId, setEvaluatingChunkId] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [chunkEvaluations, setChunkEvaluations] = useState<Record<string, {
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

  // 🎨 Generates & preloads image for a slide
  const generateSlideImage = async (sIdx: number, rawPrompt: string, topicName: string): Promise<string> => {
    setImageLoading(prev => ({ ...prev, [sIdx]: true }));

    const sanitizedPrompt = sanitizeImagePrompt(rawPrompt, topicName, sIdx);
    let imageUrl = '';

    try {
      const res = await api.generateImage(sanitizedPrompt, '16:9').catch(() => null);
      if (res && res.success && (res.url || res.image_url)) {
        imageUrl = res.url || res.image_url;
      }
    } catch (err) {
      console.warn(`MiniMax image gen failed for reading slide ${sIdx}:`, err);
    }

    if (!imageUrl) {
      imageUrl = getFallbackImageUrl(sanitizedPrompt, topicName, sIdx);
    }

    await preloadImage(imageUrl, 4000);

    setSlideImages(prev => ({ ...prev, [sIdx]: imageUrl }));
    setImageLoading(prev => ({ ...prev, [sIdx]: false }));
    return imageUrl;
  };

  // 1. Fetch or generate reading story
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

          // Resolve first slide image
          const firstSlide = (res.story.slides && res.story.slides[0]) || null;
          const firstPrompt = firstSlide?.image_prompt || (res.story.chunks?.[0]?.image_prompt) || `${topic}, 2D educational illustration`;
          await generateSlideImage(0, firstPrompt, topic);

          // Background preloading for remaining slides
          (async () => {
            const slidesList = res.story.slides || [];
            for (let idx = 1; idx < slidesList.length; idx++) {
              if (!isMounted) break;
              const prompt = slidesList[idx].image_prompt || `${topic} scene ${idx + 1}, 2D illustration`;
              await generateSlideImage(idx, prompt, topic);
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

  // 📚 Normalize story into 3 visual slides with MINIMUM 3 chunks per slide
  const normalizedSlides: ReadingSlide[] = useMemo(() => {
    if (!story) return [];
    if (story.slides && story.slides.length > 0) {
      return story.slides;
    }
    // Fallback: group flat chunks into slides of 3 chunks each
    if (!story.chunks || story.chunks.length === 0) return [];
    const groups: ReadingSlide[] = [];
    const chunksPerSlide = 3;
    for (let i = 0; i < story.chunks.length; i += chunksPerSlide) {
      const slice = story.chunks.slice(i, i + chunksPerSlide);
      const slideNum = Math.floor(i / chunksPerSlide) + 1;
      groups.push({
        slide_id: `slide-${slideNum}`,
        slide_number: slideNum,
        scene_title: `Escena ${slideNum}`,
        scene_context: slice[0]?.scene_context || `Escena ${slideNum} de la historia`,
        image_prompt: slice[0]?.image_prompt || '',
        chunks: slice.map((c, pIdx) => ({
          ...c,
          slide_index: slideNum - 1,
          part_number: pIdx + 1,
        }))
      });
    }
    return groups;
  }, [story]);

  const currentSlide = normalizedSlides[currentSlideIdx] || normalizedSlides[0];
  const currentSlideChunks = currentSlide?.chunks || [];

  // 🎯 Progress calculation for the current slide
  const passedPartsCount = useMemo(() => {
    if (!currentSlideChunks || currentSlideChunks.length === 0) return 0;
    return currentSlideChunks.filter(c => {
      const ev = chunkEvaluations[c.chunk_id];
      return ev && ev.accuracy_percent >= 80;
    }).length;
  }, [currentSlideChunks, chunkEvaluations]);

  const totalPartsInCurrentSlide = currentSlideChunks.length || 3;
  const isCurrentSlideUnlocked = currentSlideChunks.length > 0 && passedPartsCount === currentSlideChunks.length;

  // Play individual word audio
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

  // Play full chunk audio
  const handlePlayChunkAudio = async (chunkId: string, chunkText: string) => {
    if (!chunkText) return;
    if (playingChunkId === chunkId) {
      if (audioHandleRef.current) {
        try { audioHandleRef.current.pause(); } catch (_) {}
      }
      setPlayingChunkId(null);
      return;
    }

    setPlayingChunkId(chunkId);
    try {
      const audio = await playEnglishAudio(chunkText);
      if (audio && audio instanceof HTMLAudioElement) {
        audioHandleRef.current = audio;
        audio.onended = () => setPlayingChunkId(null);
      } else {
        setTimeout(() => setPlayingChunkId(null), 3500);
      }
    } catch (err) {
      console.warn('Play chunk audio error:', err);
      setPlayingChunkId(null);
    }
  };

  // Start Speech Recognition for a specific chunk
  const startChunkRecognition = (chunk: ReadingChunk) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta reconocimiento de voz. Usa Google Chrome o Edge.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    try { sfx.playMicStart(); } catch (_) {}
    transcriptRef.current = '';
    setLiveTranscript('');
    setRecordingChunkId(chunk.chunk_id);

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
      setRecordingChunkId(null);
      try { sfx.playMicStop(); } catch (_) {}
      const textToEval = transcriptRef.current.trim();
      if (textToEval && !isEvaluatingRef.current) {
        evaluateChunkAttempt(chunk, textToEval);
      }
    };

    try {
      rec.start();
    } catch (err) {
      console.warn('Error starting speech recognition:', err);
      setRecordingChunkId(null);
    }
  };

  const stopChunkRecognition = (chunk: ReadingChunk) => {
    setRecordingChunkId(null);
    const textToEval = transcriptRef.current.trim() || liveTranscript.trim();

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }

    if (textToEval) {
      evaluateChunkAttempt(chunk, textToEval);
    } else {
      toast('No se detectó voz. Por favor habla cerca del micrófono.', {
        icon: '🎙️',
        duration: 3500,
      });
    }
  };

  // Evaluate speech attempt with the backend
  const evaluateChunkAttempt = async (chunk: ReadingChunk, transcript: string) => {
    if (!chunk || !transcript.trim() || isEvaluatingRef.current) return;

    isEvaluatingRef.current = true;
    setEvaluatingChunkId(chunk.chunk_id);
    try {
      const chunkWordsToSend = chunk.words.map(w => ({
        word: w.word,
        clean_word: w.clean_word,
        ipa: w.ipa,
        is_target: w.is_target,
      }));

      const res = await api.evaluateReadingChunk({
        chunk_words: chunkWordsToSend,
        transcript: transcript.trim(),
        lesson_id: lessonId,
        chunk_id: chunk.chunk_id,
      });

      const accuracy = res.accuracy_percent ?? res.overall_score ?? 0;
      const isPassed = accuracy >= 80;

      setChunkEvaluations(prev => ({
        ...prev,
        [chunk.chunk_id]: {
          is_correct: isPassed,
          overall_score: accuracy,
          accuracy_percent: accuracy,
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

      if (isPassed) {
        sfx.playSuccessChime();
        toast.success(`¡Excelente! ${accuracy}% en la Parte ${chunk.part_number || 1}. Superaste el 80% 🎉`);
      } else {
        sfx.playMistake();
        toast.error(`Obtuviste ${accuracy}%. Se requiere al menos 80% para aprobar esta parte. Revisa las palabras en rojo y reintenta 💡`);
      }
    } catch (err) {
      console.error('Error evaluating reading chunk:', err);
      toast.error('Error al evaluar la pronunciación.');
    } finally {
      isEvaluatingRef.current = false;
      setEvaluatingChunkId(null);
      setLiveTranscript('');
      transcriptRef.current = '';
    }
  };

  const handleRetryChunk = (chunkId: string) => {
    setChunkEvaluations(prev => {
      const next = { ...prev };
      delete next[chunkId];
      return next;
    });
    setLiveTranscript('');
    transcriptRef.current = '';
  };

  // Advance to next slide or finish story
  const handleAdvanceSlide = () => {
    if (!isCurrentSlideUnlocked) {
      sfx.playMistake();
      toast.error(
        `🔒 Debes aprobar las ${totalPartsInCurrentSlide} partes de esta escena con al menos 80% para avanzar (${passedPartsCount}/${totalPartsInCurrentSlide} completadas).`,
        { id: 'reading-slide-lock', duration: 4000 }
      );
      return;
    }

    if (currentSlideIdx < normalizedSlides.length - 1) {
      sfx.playPop();
      setCurrentSlideIdx(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      sfx.playStreakFanfare();
      setIsStoryCompleted(true);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIdx > 0) {
      sfx.playPop();
      setCurrentSlideIdx(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 glass rounded-3xl border border-brand-border/60 min-h-[440px] text-center">
        <div className="w-16 h-16 rounded-full bg-brand-cyan/20 border-2 border-brand-cyan flex items-center justify-center mb-4 animate-pulse">
          <BookOpen className="w-8 h-8 text-brand-cyan" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Construyendo Historia Visual...</h3>
        <p className="text-xs text-brand-text-secondary max-w-md">
          Diseñando 3 escenas completas sobre <strong className="text-white">{topic}</strong> con 3 partes de lectura por slide, continuidad de personajes y fonética IPA.
        </p>
        <Loader2 className="w-6 h-6 text-brand-accent animate-spin mt-4" />
      </div>
    );
  }

  // 🏆 STORY COMPLETED SUMMARY SCREEN
  if (isStoryCompleted && story) {
    const allChunks = normalizedSlides.flatMap(s => s.chunks);
    const evaluatedChunks = Object.values(chunkEvaluations);
    const avgScore = evaluatedChunks.length > 0
      ? Math.round(evaluatedChunks.reduce((acc, curr) => acc + curr.accuracy_percent, 0) / evaluatedChunks.length)
      : 88;

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
            <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Precisión Media</span>
            <span className="text-xl font-bold text-emerald-400">{avgScore}%</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Partes Aprobadas</span>
            <span className="text-xl font-bold text-brand-cyan">{allChunks.length}/{allChunks.length}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-brand-text-muted uppercase font-bold block">XP Ganados</span>
            <span className="text-xl font-bold text-yellow-400">+{Math.max(50, totalXpEarned || 60)} XP</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-white/80 max-w-lg mx-auto leading-relaxed">
          ¡Felicitaciones! Has superado todas las escenas de la historia con una precisión igual o superior al 80% en cada parte, consolidando tu fluidez lectora y fonética natural.
        </p>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsStoryCompleted(false);
              setCurrentSlideIdx(0);
            }}
            className="px-4 py-2.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Releer Desde el Inicio</span>
          </button>

          <button
            type="button"
            onClick={onContinueToGames}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-brand-cyan hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-brand-accent/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
          >
            <Gamepad2 size={18} className="animate-bounce" />
            <span>Continuar a la Zona de Juegos 🎮</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    );
  }

  if (!story || normalizedSlides.length === 0) return null;

  const currentSlideImage = slideImages[currentSlideIdx] || '';
  const isCurrentImgLoading = imageLoading[currentSlideIdx];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full py-1">
      {/* 📖 Header Bar: Story Title, Character Bible & Slide Stepper */}
      <div className="flex flex-col gap-3.5 glass p-4 sm:p-5 rounded-3xl border border-brand-border/80 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan flex-shrink-0">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 uppercase tracking-wider">
                  Lectura Guiada • {sublevel}
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

          {/* Stepper Progress: 3 Visual Slides */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <div className="flex items-center gap-1.5">
              {normalizedSlides.map((s, idx) => {
                const isSlideDone = s.chunks.every(c => chunkEvaluations[c.chunk_id]?.accuracy_percent >= 80);
                const isActive = idx === currentSlideIdx;
                return (
                  <button
                    key={s.slide_id || idx}
                    onClick={() => {
                      if (idx > currentSlideIdx && !isCurrentSlideUnlocked) {
                        sfx.playMistake();
                        toast.error(`🔒 Completa las ${totalPartsInCurrentSlide} partes de la Escena ${currentSlideIdx + 1} con ≥80% antes de avanzar.`);
                        return;
                      }
                      setCurrentSlideIdx(idx);
                    }}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-7 bg-brand-cyan shadow-[0_0_10px_rgba(0,212,255,0.7)]'
                        : isSlideDone
                        ? 'w-2.5 bg-emerald-400'
                        : 'w-2.5 bg-brand-border'
                    }`}
                    title={`Ir a Escena ${idx + 1}`}
                  />
                );
              })}
            </div>
            <span className="text-xs font-bold text-brand-cyan ml-1 bg-brand-surface px-2.5 py-1 rounded-xl border border-brand-border">
              Escena {currentSlideIdx + 1} de {normalizedSlides.length}
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

      {/* 🎬 ACTIVE VISUAL SLIDE CONTAINER */}
      <motion.div
        key={currentSlide.slide_id || currentSlideIdx}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl p-5 sm:p-7 shadow-2xl board-chalkboard-green chalk-stage border-2 border-brand-cyan/60 ring-2 ring-brand-cyan/20 space-y-6"
      >
        {/* Slide Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider font-chalk text-yellow-300">
              📌 Escena {currentSlideIdx + 1}: {currentSlide.scene_title}
            </span>
            {currentSlide.scene_context && (
              <span className="text-[11px] text-white/70 italic hidden md:inline">
                • {currentSlide.scene_context}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-3 py-1 rounded-full bg-black/50 border border-white/15 text-yellow-300 font-bold font-mono">
              🎯 Progreso de Escena: {passedPartsCount}/{totalPartsInCurrentSlide} partes (≥80%)
            </span>
          </div>
        </div>

        {/* 🎨 SCENE VISUAL ILLUSTRATION BANNER */}
        <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-xl group bg-black/40 aspect-[21/9] sm:aspect-[16/7] flex items-center justify-center">
          {currentSlideImage ? (
            <>
              <img
                src={currentSlideImage}
                alt={`Escena ${currentSlideIdx + 1} - ${currentSlide.scene_title}`}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                loading="eager"
              />
              <button
                type="button"
                onClick={() => setZoomedImage({ url: currentSlideImage, caption: currentSlide.scene_context || currentSlide.scene_title })}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black text-white/90 hover:text-white transition-all border border-white/20 shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Ampliar ilustración"
              >
                <Maximize2 size={14} />
                <span>Ampliar</span>
              </button>
            </>
          ) : isCurrentImgLoading ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
              <Loader2 size={28} className="text-brand-cyan animate-spin" />
              <span className="text-xs text-brand-text-secondary uppercase font-bold tracking-wider">
                Generando Ilustración de la Escena...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-1 text-white/40">
              <ImageIcon size={32} />
              <span className="text-xs">Ilustración de Escena</span>
            </div>
          )}
        </div>

        {/* 📜 3 NARRATIVE TEXT CHUNKS FOR THIS SLIDE */}
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-cyan font-outfit flex items-center gap-1.5">
              <Sparkles size={14} /> Partes de la Escena (Debes aprobar las 3 con ≥80%):
            </h4>
          </div>

          {currentSlideChunks.map((chunk, pIdx) => {
            const evaluation = chunkEvaluations[chunk.chunk_id];
            const wordsList = evaluation?.words_evaluation || chunk.words;
            const isPlayingThis = playingChunkId === chunk.chunk_id;
            const isRecordingThis = recordingChunkId === chunk.chunk_id;
            const isEvaluatingThis = evaluatingChunkId === chunk.chunk_id;
            const isPassed = evaluation && evaluation.accuracy_percent >= 80;
            const showTrans = showTranslations[chunk.chunk_id];

            return (
              <div
                key={chunk.chunk_id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 relative ${
                  isPassed
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : evaluation
                    ? 'bg-rose-950/25 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                    : isRecordingThis
                    ? 'bg-brand-surface/90 border-brand-accent shadow-[0_0_20px_rgba(108,99,255,0.25)]'
                    : 'bg-black/40 border-white/10'
                }`}
              >
                {/* Chunk Top Bar */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-white font-mono text-xs font-bold">
                      Parte {chunk.part_number || pIdx + 1} de {currentSlideChunks.length}
                    </span>

                    {/* Status Pill */}
                    {isPassed ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Aprobado ({evaluation.accuracy_percent}%)
                      </span>
                    ) : evaluation ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                        <AlertCircle size={12} /> {evaluation.accuracy_percent}% (Requiere ≥80%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 text-[10px] font-semibold">
                        Pendiente de lectura
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Listen to Full Part Audio */}
                    <button
                      type="button"
                      onClick={() => handlePlayChunkAudio(chunk.chunk_id, chunk.text)}
                      className={`px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        isPlayingThis
                          ? 'bg-yellow-400 text-black border-yellow-400 animate-pulse scale-105'
                          : 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border-yellow-400/40 hover:scale-105'
                      }`}
                      title="Escuchar audio de esta parte"
                    >
                      <Volume2 size={13} className={isPlayingThis ? 'animate-bounce' : ''} />
                      <span>{isPlayingThis ? 'Reproduciendo...' : 'Escuchar'}</span>
                    </button>

                    {/* Toggle Translation */}
                    {chunk.translation && (
                      <button
                        type="button"
                        onClick={() => setShowTranslations(prev => ({ ...prev, [chunk.chunk_id]: !prev[chunk.chunk_id] }))}
                        className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
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

                {/* Interactive Stacked Ruby IPA Words */}
                <div className="bg-black/45 p-3.5 sm:p-4 rounded-xl border border-white/15 shadow-inner">
                  <div className="flex flex-wrap items-end gap-x-2.5 gap-y-3 leading-loose justify-start">
                    {wordsList.map((item, wIdx) => {
                      const isWordPlaying = playingWord === (item.clean_word || item.word);
                      const status = item.status || 'neutral';

                      let statusClasses = 'bg-black/40 border-white/20 hover:border-yellow-300 hover:bg-white/10 text-white shadow-sm';
                      let ipaClasses = 'text-yellow-300/80';
                      let badgeIcon = null;

                      if (status === 'correct') {
                        statusClasses = 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(0,230,118,0.25)] ring-1 ring-emerald-400/40';
                        ipaClasses = 'text-emerald-300 font-bold';
                        badgeIcon = <CheckCircle2 size={10} className="text-emerald-400" />;
                      } else if (status === 'mispronounced') {
                        statusClasses = 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_12px_rgba(255,82,82,0.3)] ring-1 ring-rose-400/50 animate-pulse';
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
                          className={`group/word relative inline-flex flex-col items-center justify-center px-2 py-1 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 ${statusClasses}`}
                          title={`Clic para escuchar: "${item.clean_word || item.word}" (${item.ipa})`}
                        >
                          {badgeIcon && (
                            <div className="absolute -top-1.5 -right-1.5 bg-black/80 rounded-full p-0.5 border border-white/20 z-10">
                              {badgeIcon}
                            </div>
                          )}

                          <span className={`text-sm sm:text-base font-bold font-chalk tracking-wide select-none ${
                            isWordPlaying ? 'text-black font-extrabold' : ''
                          }`}>
                            {item.word}
                          </span>

                          <span className={`text-[11px] sm:text-xs font-mono tracking-tight select-none mt-0.5 ${ipaClasses}`}>
                            {item.ipa || '/.../'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Translation Display */}
                <AnimatePresence>
                  {showTrans && chunk.translation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 rounded-xl bg-black/35 border border-brand-cyan/30 text-xs sm:text-sm text-cyan-200 font-chalk flex items-start gap-2 shadow-md"
                    >
                      <span className="font-bold text-brand-cyan flex-shrink-0">Traducción:</span>
                      <p className="italic leading-relaxed">{chunk.translation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Live Recording Box for this chunk */}
                {isRecordingThis && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-3 text-xs shadow-lg"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-rose-400 font-bold uppercase tracking-wider block text-[9px]">
                        Escuchando... Lee la Parte {chunk.part_number || pIdx + 1} en inglés:
                      </span>
                      <p className="font-mono text-white text-xs truncate mt-0.5">
                        {liveTranscript || 'Habla con naturalidad cerca del micrófono...'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => stopChunkRecognition(chunk)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-md flex-shrink-0 cursor-pointer"
                    >
                      <Square size={12} className="fill-white" />
                      <span>Detener</span>
                    </button>
                  </motion.div>
                )}

                {/* Evaluation Feedback & Mispronounced Words */}
                {evaluation && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm space-y-2 ${
                      isPassed
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 font-bold">
                      <div className="flex items-center gap-2">
                        {isPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="text-xs sm:text-sm">
                          {isPassed ? '¡Parte Aprobada! (≥80%)' : 'Puntaje Insuficiente (<80%)'}
                        </span>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-lg bg-black/40 border border-white/15 text-yellow-300 font-bold text-xs">
                        Precisión: {evaluation.accuracy_percent}% ({evaluation.correct_words_count}/{evaluation.total_words_count} palabras)
                      </span>
                    </div>

                    <p className="leading-relaxed text-white/90 font-chalk text-xs">
                      💡 {evaluation.feedback}
                    </p>

                    {evaluation.mispronounced_words && evaluation.mispronounced_words.length > 0 && (
                      <div className="pt-1 text-[11px] text-white/80 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-yellow-300">👉 Toca las palabras en rojo:</span>
                        {evaluation.mispronounced_words.map((w, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => handlePlayWordAudio(w, w, e)}
                            className="px-2 py-0.5 rounded-md bg-rose-500/30 hover:bg-rose-500/50 border border-rose-400 text-rose-100 font-mono flex items-center gap-1 hover:scale-105 transition-all cursor-pointer"
                          >
                            <Volume2 size={10} /> {w}
                          </button>
                        ))}
                        <span>para escuchar su sonido antes de volver a grabar.</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Per-Chunk Voice Control Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {!isPassed ? (
                      <button
                        type="button"
                        onClick={isRecordingThis ? () => stopChunkRecognition(chunk) : () => startChunkRecognition(chunk)}
                        disabled={isEvaluatingThis}
                        className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                          isEvaluatingThis
                            ? 'bg-brand-surface border-brand-accent text-brand-cyan animate-pulse'
                            : isRecordingThis
                            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] scale-105 animate-pulse'
                            : 'bg-brand-accent hover:bg-brand-accent/90 text-white border-brand-accent hover:scale-105'
                        }`}
                        title="Leer esta parte en voz alta"
                      >
                        {isEvaluatingThis ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isRecordingThis ? (
                          <Square size={14} className="fill-white" />
                        ) : (
                          <Mic size={14} />
                        )}
                        <span>
                          {isEvaluatingThis
                            ? 'Calificando...'
                            : isRecordingThis
                            ? 'Detener y Calificar'
                            : evaluation
                            ? 'Reintentar Lectura 🔄'
                            : 'Leer en Voz Alta 🎤'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRetryChunk(chunk.chunk_id)}
                        className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Volver a practicar esta parte aprobada"
                      >
                        <RotateCcw size={12} />
                        <span>Practicar de nuevo</span>
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-zinc-400 italic hidden sm:inline">
                    {isPassed ? '✅ Parte completada satisfactoriamente' : 'Se requiere al menos 80% de precisión'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 🛡️ BOTTOM SLIDE PROGRESSION & 80% LOCK FOOTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={currentSlideIdx === 0}
            className="px-4 py-2.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer self-start sm:self-auto"
          >
            <ChevronLeft size={16} />
            <span>Escena Anterior</span>
          </button>

          {/* Slide Unlock Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono border ${
              isCurrentSlideUnlocked
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-800 text-amber-300 border-zinc-700'
            }`}>
              {isCurrentSlideUnlocked
                ? `✨ ¡Escena ${currentSlideIdx + 1} Completa! (3/3 partes ≥80%)`
                : `🔒 Faltan ${totalPartsInCurrentSlide - passedPartsCount} partes por aprobar con ≥80%`}
            </span>
          </div>

          {/* Siguiente Slide / Finalizar Button */}
          <motion.button
            type="button"
            onClick={handleAdvanceSlide}
            whileHover={!isCurrentSlideUnlocked ? {} : { scale: 1.03 }}
            whileTap={!isCurrentSlideUnlocked ? {} : { scale: 0.97 }}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              !isCurrentSlideUnlocked
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed opacity-75'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-cyan hover:brightness-110 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer'
            }`}
            title={
              !isCurrentSlideUnlocked
                ? `Bloqueado: Requiere aprobar las ${totalPartsInCurrentSlide} partes con al menos 80%`
                : 'Avanzar a la siguiente escena'
            }
          >
            {!isCurrentSlideUnlocked ? (
              <>
                <Lock size={15} className="text-amber-400" />
                <span>Bloqueado ({passedPartsCount}/{totalPartsInCurrentSlide} partes ≥80%)</span>
              </>
            ) : currentSlideIdx < normalizedSlides.length - 1 ? (
              <>
                <span>Avanzar a la Siguiente Escena ({currentSlideIdx + 2}/{normalizedSlides.length})</span>
                <ChevronRight size={16} />
              </>
            ) : (
              <>
                <span>Finalizar Historia 🏆</span>
                <Award size={16} />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

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
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black text-white z-10 border border-white/20 cursor-pointer"
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
