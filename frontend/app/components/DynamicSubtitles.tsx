'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripHorizontal, X, Type, RotateCcw } from 'lucide-react';

export type SubtitleStyle = 'pop' | 'chalk' | 'cyber' | 'rounded' | 'editorial';

interface DynamicSubtitlesProps {
  text: string;
  audioProgress: number; // 0 to 100
  isPlaying: boolean;
  onClose?: () => void;
}

interface StyleConfig {
  name: string;
  badge: string;
  containerClass: string;
  textClass: string;
  activeClass: string;
  passedClass: string;
  upcomingClass: string;
}

const SUBTITLE_STYLES: Record<SubtitleStyle, StyleConfig> = {
  pop: {
    name: 'Pop Viral',
    badge: '⚡ Pop',
    containerClass: 'bg-black/80 backdrop-blur-xl border border-yellow-400/30 shadow-[0_12px_40px_rgba(0,0,0,0.85)]',
    textClass: 'font-outfit font-black uppercase tracking-wider text-xl sm:text-2xl md:text-3xl',
    activeClass: 'text-yellow-300 drop-shadow-[0_0_16px_rgba(253,224,71,1)]',
    passedClass: 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-95',
    upcomingClass: 'text-white/35 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]',
  },
  chalk: {
    name: 'Pizarra',
    badge: '✏️ Pizarra',
    containerClass: 'bg-[#12281b]/90 backdrop-blur-xl border border-emerald-400/40 shadow-[0_12px_40px_rgba(0,0,0,0.85)]',
    textClass: 'font-chalk font-bold tracking-wide text-2xl sm:text-3xl md:text-4xl',
    activeClass: 'text-emerald-300 drop-shadow-[0_0_14px_rgba(110,231,183,0.95)]',
    passedClass: 'text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.7)] opacity-95',
    upcomingClass: 'text-white/40',
  },
  cyber: {
    name: 'Cyber Neon',
    badge: '🔮 Cyber',
    containerClass: 'bg-[#0a0f1d]/90 backdrop-blur-xl border border-cyan-400/40 shadow-[0_12px_40px_rgba(0,212,255,0.25)]',
    textClass: 'font-mono-custom font-extrabold uppercase tracking-widest text-lg sm:text-xl md:text-2xl',
    activeClass: 'text-cyan-300 drop-shadow-[0_0_16px_rgba(0,212,255,1)]',
    passedClass: 'text-cyan-100/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
    upcomingClass: 'text-cyan-200/30',
  },
  rounded: {
    name: 'Moderna',
    badge: '✨ Moderna',
    containerClass: 'bg-indigo-950/85 backdrop-blur-xl border border-pink-400/30 shadow-[0_12px_40px_rgba(99,102,241,0.3)]',
    textClass: 'font-rounded font-black tracking-normal text-xl sm:text-2xl md:text-3xl',
    activeClass: 'text-pink-400 drop-shadow-[0_0_16px_rgba(244,114,182,1)]',
    passedClass: 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-95',
    upcomingClass: 'text-white/35',
  },
  editorial: {
    name: 'Editorial',
    badge: '📜 Serif',
    containerClass: 'bg-zinc-950/90 backdrop-blur-xl border border-amber-200/25 shadow-[0_12px_40px_rgba(0,0,0,0.85)]',
    textClass: 'font-serif-custom italic font-bold tracking-wide text-xl sm:text-2xl md:text-3xl',
    activeClass: 'text-amber-200 drop-shadow-[0_0_16px_rgba(253,230,138,0.95)]',
    passedClass: 'text-stone-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-95',
    upcomingClass: 'text-stone-400/40',
  },
};

const STYLE_KEYS: SubtitleStyle[] = ['pop', 'chalk', 'cyber', 'rounded', 'editorial'];

export default function DynamicSubtitles({
  text,
  audioProgress,
  isPlaying,
  onClose,
}: DynamicSubtitlesProps) {
  const [currentStyle, setCurrentStyle] = useState<SubtitleStyle>('pop');
  const [positionKey, setPositionKey] = useState(0); // Trigger reset position

  // Load saved style preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('guionbajo_subtitle_style') as SubtitleStyle;
      if (saved && SUBTITLE_STYLES[saved]) {
        setCurrentStyle(saved);
      }
    } catch (_) {}
  }, []);

  const cycleStyle = () => {
    const nextIdx = (STYLE_KEYS.indexOf(currentStyle) + 1) % STYLE_KEYS.length;
    const nextStyle = STYLE_KEYS[nextIdx];
    setCurrentStyle(nextStyle);
    try {
      localStorage.setItem('guionbajo_subtitle_style', nextStyle);
    } catch (_) {}
  };

  // Clean raw text
  const cleanText = useMemo(() => {
    if (!text) return '';
    return text
      .replace(/[*_#~`]/g, '') // remove markdown symbols
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, [text]);

  const words = useMemo(() => {
    return cleanText.split(/\s+/).filter(Boolean);
  }, [cleanText]);

  // ─── Phonetic & Punctuation Pause Weighting Model ─────────────────────────
  const wordTimings = useMemo(() => {
    if (words.length === 0) return [];

    const weights: number[] = [];
    for (let i = 0; i < words.length; i++) {
      const rawWord = words[i];
      const cleanWord = rawWord.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]/g, '');
      const vowelCount = (cleanWord.match(/[aeiouyáéíóúü]/gi) || []).length;
      
      // Base speech duration: syllables + character length weight
      let weight = Math.max(cleanWord.length * 0.4 + Math.max(vowelCount, 1) * 1.2, 1.8);

      // Natural pause detection calibrated for Neural TTS (Edge-TTS / MiniMax)
      if (/[.!?:]$/.test(rawWord)) {
        weight += 1.6; // short natural pause for full stop
      } else if (/[,;\-—]$/.test(rawWord)) {
        weight += 0.9; // subtle breath pause for comma
      } else if (/\.\.\.$/.test(rawWord)) {
        weight += 2.0;
      }

      weights.push(weight);
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return [];

    let accum = 0;
    return weights.map((w, i) => {
      const startRatio = accum / totalWeight;
      accum += w;
      const endRatio = accum / totalWeight;
      return {
        word: words[i],
        startRatio,
        endRatio,
      };
    });
  }, [words]);

  // Calculate current active word index calibrated to TTS audio speech window (zero initial latency)
  const activeWordIdx = useMemo(() => {
    if (!isPlaying) return -1;
    if (audioProgress >= 99) return words.length;
    if (!wordTimings || wordTimings.length === 0) return 0;

    const rawRatio = Math.min(Math.max(audioProgress / 100, 0), 1);
    
    // Calibrated for Neural TTS tight start/end padding (0.5% lead, 1.5% trail)
    const SPEECH_START = 0.005;
    const SPEECH_END = 0.985;
    const speechRatio = Math.min(
      Math.max((rawRatio - SPEECH_START) / (SPEECH_END - SPEECH_START), 0),
      1
    );

    for (let i = 0; i < wordTimings.length; i++) {
      if (speechRatio >= wordTimings[i].startRatio && speechRatio <= wordTimings[i].endRatio) {
        return i;
      }
    }
    return Math.min(Math.floor(speechRatio * words.length), words.length - 1);
  }, [audioProgress, isPlaying, wordTimings, words.length]);

  // 🎯 STRICT MAXIMUM OF 3 WORDS AT A TIME
  const CHUNK_SIZE = 3;
  const currentChunkStart = Math.max(0, Math.floor(Math.max(activeWordIdx, 0) / CHUNK_SIZE) * CHUNK_SIZE);
  const currentChunkWords = words.slice(currentChunkStart, currentChunkStart + CHUNK_SIZE);

  const styleConfig = SUBTITLE_STYLES[currentStyle] || SUBTITLE_STYLES.pop;

  // ONLY render when isPlaying is TRUE and there is text
  if (!isPlaying || !cleanText || words.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={`subtitles-${positionKey}`}
        drag
        dragMomentum={false}
        dragElastic={0.08}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
        whileDrag={{ scale: 1.04, cursor: 'grabbing' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 cursor-grab select-none pointer-events-auto max-w-xl px-3 group"
        title="Arrastra para mover a cualquier espacio en blanco de la pantalla"
      >
        <div className="relative flex flex-col items-center justify-center">
          {/* Top Floating Mini-Toolbar on Hover */}
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-1.5 bg-black/80 px-2.5 py-0.5 rounded-full border border-white/15 text-[11px] text-white/80 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-1 text-brand-cyan">
              <GripHorizontal size={12} />
              <span className="font-mono text-[10px]">Arrastrar</span>
            </div>

            <span className="text-white/20">•</span>

            {/* Font Style Switcher */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cycleStyle();
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-white/10 text-yellow-300 hover:text-yellow-200 transition-colors font-medium text-[10px]"
              title="Cambiar estilo de letra del subtítulo"
            >
              <Type size={11} />
              <span>{styleConfig.badge}</span>
            </button>

            <span className="text-white/20">•</span>

            {/* Reset Position Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPositionKey((prev) => prev + 1);
              }}
              className="p-0.5 hover:text-white text-white/60 transition-colors"
              title="Centrar abajo"
            >
              <RotateCcw size={11} />
            </button>

            {onClose && (
              <>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-0.5 hover:text-red-400 text-white/60 transition-colors"
                  title="Ocultar subtítulos"
                >
                  <X size={11} />
                </button>
              </>
            )}
          </div>

          {/* Kinetic 3-Word Display Box with Zero Vibration */}
          <div
            className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl ${styleConfig.containerClass} text-center min-w-[200px] max-w-lg transition-all duration-200`}
          >
            <p
              className={`${styleConfig.textClass} leading-tight flex flex-wrap items-center justify-center gap-x-3 gap-y-0`}
            >
              {currentChunkWords.map((word, relIdx) => {
                const globalIdx = currentChunkStart + relIdx;
                const isActive = globalIdx === activeWordIdx;
                const isPassed = globalIdx < activeWordIdx;

                return (
                  <span
                    key={`${globalIdx}-${word}`}
                    className={`inline-block transition-[color,opacity,text-shadow] duration-200 ${
                      isActive
                        ? `${styleConfig.activeClass} font-black`
                        : isPassed
                        ? styleConfig.passedClass
                        : styleConfig.upcomingClass
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
