'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Volume2,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { MiniClassData, MiniClassCard, MiniClassQuiz } from '@/lib/api';

interface HolographicMiniClassHUDProps {
  data: MiniClassData;
  onClose: () => void;
  onPlayAudio?: (text: string) => void;
  lastUserVoiceText?: string;
}

// ── Token Color Helpers for Formulas ──────────────────────────────────────────
function getFormulaTokenStyle(part: string) {
  const p = part.toLowerCase();
  if (p.includes('sujeto') || p.includes('subject') || p.includes('pronombre')) {
    return 'bg-sky-500/15 border-sky-400/40 text-sky-200';
  }
  if (p.includes('adverb') || p.includes('would') || p.includes('aux') || p.includes('modal')) {
    return 'bg-purple-500/20 border-purple-400/50 text-purple-200 shadow-[0_0_10px_rgba(192,132,252,0.2)]';
  }
  if (p.includes('verbo') || p.includes('verb') || p.includes('acción')) {
    return 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200';
  }
  if (p.includes('to be') || p.includes('be') || p.includes('is/are') || p.includes('was/were')) {
    return 'bg-amber-500/15 border-amber-400/40 text-amber-200';
  }
  if (p.includes('complement') || p.includes('objeto') || p.includes('resto')) {
    return 'bg-rose-500/15 border-rose-400/40 text-rose-200';
  }
  return 'bg-brand-cyan/15 border-brand-cyan/40 text-brand-cyan';
}

export function HolographicMiniClassHUD({
  data,
  onClose,
  onPlayAudio,
  lastUserVoiceText,
}: HolographicMiniClassHUDProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const quiz = data.quiz;

  // ── Voice detection for answering the quiz automatically ─────────────────────
  useEffect(() => {
    if (!quiz || isAnswered || !lastUserVoiceText) return;

    const lowerVoice = lastUserVoiceText.toLowerCase().trim();

    // Check letter or ordinal mentions ("opción a", "la primera", "la b", etc.)
    const firstMarkers = ['a', 'primera', 'uno', '1', 'first'];
    const secondMarkers = ['b', 'segunda', 'dos', '2', 'second'];
    const thirdMarkers = ['c', 'tercera', 'tres', '3', 'third'];

    if (quiz.options.length >= 1 && firstMarkers.some((m) => lowerVoice.includes(m))) {
      handleOptionSelect(0);
      return;
    }
    if (quiz.options.length >= 2 && secondMarkers.some((m) => lowerVoice.includes(m))) {
      handleOptionSelect(1);
      return;
    }
    if (quiz.options.length >= 3 && thirdMarkers.some((m) => lowerVoice.includes(m))) {
      handleOptionSelect(2);
      return;
    }

    // Check if the user spoke key words from any option
    quiz.options.forEach((opt, idx) => {
      const optClean = opt.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      const voiceClean = lowerVoice.replace(/[^a-z0-9 ]/g, '');
      if (optClean && voiceClean.includes(optClean)) {
        handleOptionSelect(idx);
      }
    });
  }, [lastUserVoiceText, quiz, isAnswered]);

  const handleOptionSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (quiz && idx === quiz.correct_index) {
      setShowCelebration(true);
    }
  };

  // Helper to render formula with colored pill tokens
  const renderFormulaTokens = (formula: string) => {
    if (!formula) return null;
    const parts = formula.split('+').map((s) => s.trim());

    return (
      <div className="flex items-center flex-wrap gap-1.5 py-1">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span
              className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-mono-custom font-semibold tracking-wide ${getFormulaTokenStyle(
                part
              )}`}
            >
              {part}
            </span>
            {i < parts.length - 1 && (
              <span className="text-white/40 text-xs font-bold">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Helper to highlight words inside the example sentence
  const renderHighlightedExample = (example: string, highlight?: string) => {
    if (!highlight || !example.toLowerCase().includes(highlight.toLowerCase())) {
      return <span>"{example}"</span>;
    }

    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = example.split(regex);

    return (
      <span>
        "
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span
              key={i}
              className="text-yellow-300 bg-yellow-400/20 px-1 py-0.5 rounded font-bold underline decoration-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.3)]"
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
        "
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 25, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ type: 'spring', damping: 25, stiffness: 260 }}
      className="w-full my-4 rounded-3xl glass border border-brand-cyan/40 bg-gradient-to-b from-brand-surface/95 via-[#0D1022]/90 to-black/90 backdrop-blur-2xl shadow-2xl shadow-brand-cyan/15 overflow-hidden relative"
    >
      {/* Top Holographic Laser Edge */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand-cyan to-transparent shadow-[0_0_12px_#00D4FF]" />

      {/* ─── Header Section ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 border border-brand-cyan/50 flex items-center justify-center text-brand-cyan shadow-sm shadow-brand-cyan/30">
            <Zap size={17} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan">
                Pizarra Holográfica
              </span>
              <span className="text-[10px] font-medium text-brand-text-muted">
                Mini-Clase Express
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-outfit font-bold text-white tracking-wide">
              {data.topic}
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl glass border border-white/10 text-brand-text-muted hover:text-white hover:bg-white/10 transition-all"
          title="Cerrar pizarra"
        >
          <X size={18} />
        </button>
      </div>

      {data.summary && (
        <div className="px-5 py-2 text-xs text-brand-text-secondary bg-brand-cyan/5 border-b border-white/5 flex items-center gap-2">
          <Sparkles size={14} className="text-brand-gold shrink-0" />
          <span>{data.summary}</span>
        </div>
      )}

      {/* ─── Holographic Cards Grid ─────────────────────────────────────────── */}
      <div className="p-4 sm:p-5">
        <div
          className={`grid gap-4 ${
            data.cards.length === 1
              ? 'grid-cols-1 max-w-lg mx-auto'
              : data.cards.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {data.cards.map((card, index) => (
            <motion.div
              key={card.id || index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.12 }}
              className="rounded-2xl glass border border-white/10 hover:border-brand-cyan/50 bg-black/40 p-4 flex flex-col justify-between space-y-3 transition-all group hover:shadow-lg hover:shadow-brand-cyan/10"
            >
              {/* Badge & Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300">
                    {card.badge || `Regla ${index + 1}`}
                  </span>
                  <span className="text-[10px] font-mono-custom text-brand-text-muted">
                    #{index + 1}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-brand-cyan transition-colors">
                  {card.title}
                </h4>
              </div>

              {/* Formula Structure Pill */}
              {card.formula && (
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-brand-text-muted tracking-wider">
                    Estructura:
                  </span>
                  {renderFormulaTokens(card.formula)}
                </div>
              )}

              {/* Example with Audio Playback */}
              <div className="p-3 rounded-xl bg-black/60 border border-brand-cyan/20 relative group/ex">
                <div className="flex items-center justify-between text-[10px] text-brand-text-muted mb-1">
                  <span className="font-semibold text-brand-cyan">Ejemplo:</span>
                  {onPlayAudio && (
                    <button
                      onClick={() => onPlayAudio(card.example)}
                      className="text-brand-text-muted hover:text-brand-cyan transition-colors p-1"
                      title="Escuchar pronunciación"
                    >
                      <Volume2 size={13} />
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium text-white font-mono-custom">
                  {renderHighlightedExample(card.example, card.highlight)}
                </p>
              </div>

              {/* Explanatory Rule / Mnemonic Tip */}
              <div className="flex items-start gap-2 pt-1 text-xs text-brand-text-secondary border-t border-white/5">
                <Lightbulb size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">{card.explanation}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ─── Interactive Micro-Quiz Section ─────────────────────────────────── */}
        {quiz && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: data.cards.length * 0.12 }}
            className="mt-5 rounded-2xl glass border border-brand-gold/40 bg-gradient-to-r from-brand-gold/10 via-brand-surface/70 to-purple-500/10 p-4 sm:p-5 relative overflow-hidden"
          >
            {/* Celebration Particle Flash */}
            {showCelebration && (
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-pulse" />
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center text-yellow-300">
                  <Sparkles size={14} />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Micro-Quiz: Ponte a Prueba
                </h4>
              </div>
              <span className="text-[10px] text-brand-text-muted font-medium">
                Responde tocando o con tu voz
              </span>
            </div>

            {/* Quiz Question */}
            <p className="text-sm sm:text-base font-semibold text-white mb-3">
              {quiz.question}
            </p>

            {/* Interactive Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {quiz.options.map((option, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrect = optIdx === quiz.correct_index;
                const showStatus = isAnswered;

                let buttonStyle =
                  'border-white/15 bg-white/[0.04] text-white hover:border-brand-cyan/60 hover:bg-brand-cyan/10';

                if (showStatus) {
                  if (isCorrect) {
                    buttonStyle =
                      'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.3)]';
                  } else if (isSelected && !isCorrect) {
                    buttonStyle =
                      'border-red-400 bg-red-500/20 text-red-200 shadow-[0_0_15px_rgba(248,113,113,0.3)]';
                  } else {
                    buttonStyle = 'border-white/5 bg-white/[0.02] text-white/40 opacity-60';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleOptionSelect(optIdx)}
                    disabled={isAnswered}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all transform active:scale-95 ${buttonStyle}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 font-mono-custom">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {showStatus && isCorrect && (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    )}
                    {showStatus && isSelected && !isCorrect && (
                      <AlertCircle size={16} className="text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Post-Answer Feedback Banner */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`mt-3 pt-3 border-t text-xs flex items-start gap-2 ${
                    selectedOption === quiz.correct_index
                      ? 'border-emerald-500/30 text-emerald-300'
                      : 'border-amber-500/30 text-amber-300'
                  }`}
                >
                  {selectedOption === quiz.correct_index ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">
                      {selectedOption === quiz.correct_index
                        ? '¡Excelente deducción! Regla dominada.'
                        : '¡Buen intento! Mira la explicación:'}
                    </p>
                    <p className="text-[11px] text-brand-text-secondary mt-0.5">
                      {quiz.explanation}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
