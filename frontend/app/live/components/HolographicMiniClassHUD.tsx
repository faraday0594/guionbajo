'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Volume2,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { MiniClassData, MiniClassCard, MiniClassQuiz } from '@/lib/api';

// ── Token Color Helpers for Formulas ──────────────────────────────────────────
export function getFormulaTokenStyle(part: string) {
  const p = part.toLowerCase();
  if (p.includes('sujeto') || p.includes('subject') || p.includes('pronombre')) {
    return 'bg-sky-500/15 border-sky-400/40 text-sky-200';
  }
  if (p.includes('adverb') || p.includes('would') || p.includes('aux') || p.includes('modal')) {
    return 'bg-purple-500/20 border-purple-400/50 text-purple-200 shadow-[0_0_8px_rgba(192,132,252,0.25)]';
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

// ── Helper to render formula with colored pill tokens ─────────────────────────
export function renderFormulaTokens(formula: string) {
  if (!formula) return null;
  const parts = formula.split('+').map((s) => s.trim());

  return (
    <div className="flex items-center flex-wrap gap-1 py-0.5">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <span
            className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono-custom font-semibold tracking-wide ${getFormulaTokenStyle(
              part
            )}`}
          >
            {part}
          </span>
          {i < parts.length - 1 && (
            <span className="text-white/30 text-[10px] font-bold">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Helper to clean example sentences from parenthetical labels like (¡INCORRECTO!) or [CORRECTO]
export function cleanExampleSentence(sentence: string): string {
  if (!sentence) return '';
  return sentence
    .replace(/\s*\([^)]*(?:incorrect|correcto|wrong|error|bien|mal|nota|ojo)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(?:incorrect|correcto|wrong|error|bien|mal|nota|ojo)[^\]]*\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Helper to highlight words inside the example sentence ─────────────────────
export function renderHighlightedExample(example: string, highlight?: string) {
  const clean = cleanExampleSentence(example);
  if (!highlight || !clean.toLowerCase().includes(highlight.toLowerCase())) {
    return <span>"{clean}"</span>;
  }

  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = clean.split(regex);

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
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. FLANK CARD ITEM (Compact Card for Left/Right of Guionbajo)
// ══════════════════════════════════════════════════════════════════════════════
export function FlankCardItem({
  card,
  index,
  onPlayAudio,
}: {
  card: MiniClassCard;
  index: number;
  onPlayAudio?: (text: string) => void;
}) {
  const cleanExample = cleanExampleSentence(card.example);

  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="rounded-2xl glass border border-brand-cyan/30 hover:border-brand-cyan/60 bg-gradient-to-b from-brand-surface/90 to-black/80 p-3.5 flex flex-col justify-between space-y-2.5 shadow-xl shadow-brand-cyan/10 transition-all group backdrop-blur-md relative overflow-hidden"
    >
      {/* Laser Top Accent */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand-cyan/70 to-transparent" />

      {/* Badge & Title */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300">
            {card.badge || `Regla ${index + 1}`}
          </span>
          <span className="text-[10px] font-mono-custom text-brand-text-muted">
            #{index + 1}
          </span>
        </div>
        <h4 className="text-xs font-bold text-white group-hover:text-brand-cyan transition-colors leading-tight">
          {card.title}
        </h4>
      </div>

      {/* Formula Structure Pill */}
      {card.formula && (
        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
          <span className="text-[9px] font-bold uppercase text-brand-text-muted tracking-wider">
            Estructura:
          </span>
          {renderFormulaTokens(card.formula)}
        </div>
      )}

      {/* Example with Audio Playback */}
      <div className="p-2.5 rounded-xl bg-black/60 border border-brand-cyan/20 relative group/ex">
        <div className="flex items-center justify-between text-[9px] text-brand-text-muted mb-0.5">
          <span className="font-semibold text-brand-cyan">Ejemplo:</span>
          {onPlayAudio && cleanExample && (
            <button
              onClick={() => onPlayAudio(cleanExample)}
              className="text-brand-text-muted hover:text-brand-cyan transition-colors p-0.5"
              title="Escuchar pronunciación nativa"
            >
              <Volume2 size={12} />
            </button>
          )}
        </div>
        <p className="text-xs font-medium text-white font-mono-custom leading-snug">
          {renderHighlightedExample(cleanExample, card.highlight)}
        </p>
      </div>

      {/* Explanatory Rule / Mnemonic Tip */}
      <div className="flex items-start gap-1.5 pt-1 text-[11px] text-brand-text-secondary border-t border-white/5">
        <Lightbulb size={13} className="text-yellow-400 shrink-0 mt-0.5" />
        <p className="leading-snug">{card.explanation}</p>
      </div>
    </motion.div>
  );
}

// Helper to find matching quiz option from verbal transcript with word boundaries
function findMatchingOptionByVoice(voiceText: string, options: string[]): number | null {
  const cleanVoice = ` ${voiceText.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, ' ')} `;

  for (let idx = 0; idx < options.length; idx++) {
    const letter = ['a', 'b', 'c', 'd'][idx] || '';
    const num = (idx + 1).toString();

    // Specific verbal choice markers with word boundaries
    const markers = [
      `opcion ${letter}`,
      `opción ${letter}`,
      `la ${letter}`,
      `letra ${letter}`,
      ` ${letter} `,
      `opcion ${num}`,
      `opción ${num}`,
      `la ${num}`,
      `numero ${num}`,
      `número ${num}`,
      ` ${num} `,
    ];

    if (idx === 0) markers.push('primera', 'la primera', 'first');
    if (idx === 1) markers.push('segunda', 'la segunda', 'second');
    if (idx === 2) markers.push('tercera', 'la tercera', 'third');
    if (idx === 3) markers.push('cuarta', 'la cuarta', 'fourth');

    if (
      markers.some(
        (m) =>
          cleanVoice.includes(` ${m.trim()} `) ||
          (m.startsWith(' ') && cleanVoice.includes(m))
      )
    ) {
      return idx;
    }

    // Match spoken text against key words of the option
    const optClean = options[idx]
      .toLowerCase()
      .replace(/[^a-záéíóúüñ0-9]/g, ' ')
      .trim();
    if (optClean.length >= 3) {
      const words = optClean.split(/\s+/).filter((w) => w.length >= 3);
      if (words.length > 0 && words.every((w) => cleanVoice.includes(` ${w} `))) {
        return idx;
      }
    }
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. COMPACT MICRO-QUIZ BAR (Sleek Horizontal Bar under Guionbajo)
// ══════════════════════════════════════════════════════════════════════════════
export function CompactQuizBar({
  quiz,
  lastUserVoiceText,
  onCorrect,
}: {
  quiz: MiniClassQuiz;
  lastUserVoiceText?: string;
  onCorrect?: () => void;
}) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const initialUtteranceRef = useRef<string | undefined>(lastUserVoiceText);

  // Reset state when quiz question changes
  useEffect(() => {
    setSelectedOption(null);
    setIsAnswered(false);
    setShowCelebration(false);
    initialUtteranceRef.current = lastUserVoiceText;
  }, [quiz.question]);

  // Voice detection for answering the quiz automatically
  useEffect(() => {
    // If no voice text, or student already solved it correctly, do nothing
    if (!lastUserVoiceText || (isAnswered && selectedOption === quiz.correct_index)) return;

    // Critical: ignore the utterance that asked for the class in the first place!
    if (lastUserVoiceText === initialUtteranceRef.current) return;

    const matchedIdx = findMatchingOptionByVoice(lastUserVoiceText, quiz.options);
    if (matchedIdx !== null) {
      handleSelect(matchedIdx);
    }
  }, [lastUserVoiceText, quiz, isAnswered, selectedOption]);

  const handleSelect = (idx: number) => {
    // If already correctly answered, lock
    if (isAnswered && selectedOption === quiz.correct_index) return;

    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === quiz.correct_index) {
      setShowCelebration(true);
      onCorrect?.();
    }
  };

  const isSolved = isAnswered && selectedOption === quiz.correct_index;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      className="w-full my-2.5 rounded-2xl glass border border-brand-gold/40 bg-gradient-to-r from-brand-gold/10 via-brand-surface/90 to-purple-500/10 p-3 sm:p-4 shadow-xl shadow-brand-gold/10 relative overflow-hidden"
    >
      {showCelebration && (
        <div className="absolute inset-0 bg-emerald-500/15 pointer-events-none animate-pulse" />
      )}

      {/* Question Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center text-yellow-300">
            <Sparkles size={12} />
          </div>
          <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-wider">
            Micro-Quiz
          </span>
          <span className="text-white text-xs font-semibold leading-snug">
            {quiz.question}
          </span>
        </div>
        <span className="text-[9px] text-brand-text-muted font-medium shrink-0">
          Toca o di tu respuesta
        </span>
      </div>

      {/* Options Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {quiz.options.map((option, optIdx) => {
          const isSelected = selectedOption === optIdx;
          const isCorrect = optIdx === quiz.correct_index;

          let btnClass =
            'border-white/10 bg-white/[0.04] text-white hover:border-brand-cyan/60 hover:bg-brand-cyan/10 cursor-pointer';

          if (isAnswered) {
            if (isSelected && isCorrect) {
              btnClass =
                'border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.3)] font-bold';
            } else if (isSelected && !isCorrect) {
              btnClass =
                'border-red-400 bg-red-500/20 text-red-200 shadow-[0_0_12px_rgba(248,113,113,0.3)]';
            } else if (isSolved && !isCorrect) {
              btnClass = 'border-white/5 bg-white/[0.02] text-white/40 opacity-50';
            }
          }

          return (
            <button
              key={optIdx}
              onClick={() => handleSelect(optIdx)}
              disabled={isSolved}
              className={`flex items-start sm:items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all transform active:scale-95 min-h-[44px] ${btnClass}`}
            >
              <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0 font-mono-custom mt-0.5 sm:mt-0">
                {String.fromCharCode(65 + optIdx)}
              </span>
              <span className="flex-1 font-medium text-xs leading-snug break-words">{option}</span>
              {isAnswered && isSelected && isCorrect && (
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              {isAnswered && isSelected && !isCorrect && (
                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback Banner */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-2 pt-2 border-t text-[11px] flex items-start gap-1.5 ${
              isSolved
                ? 'border-emerald-500/30 text-emerald-300'
                : 'border-amber-500/30 text-amber-300'
            }`}
          >
            {isSolved ? (
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold">
                {isSolved
                  ? '¡Excelente! Regla dominada. Volviendo a la conversación...'
                  : 'Inténtalo de nuevo: '}
              </span>
              <span className="text-brand-text-secondary">{quiz.explanation}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. FULL HOLOGRAPHIC MINI CLASS HUD (Cockpit/Flanking wrapper)
// ══════════════════════════════════════════════════════════════════════════════
export function HolographicMiniClassHUD({
  data,
  onClose,
  onPlayAudio,
  lastUserVoiceText,
  onCorrect,
}: {
  data: MiniClassData;
  onClose: () => void;
  onPlayAudio?: (text: string) => void;
  lastUserVoiceText?: string;
  onCorrect?: () => void;
}) {
  const allCards = data.cards || [];
  const leftCards = allCards.filter((_, i) => i % 2 === 0);
  const rightCards =
    allCards.length > 1
      ? allCards.filter((_, i) => i % 2 !== 0)
      : [
          {
            id: 'summary-fallback',
            step: 2,
            badge: 'Resumen',
            title: 'Idea Principal',
            formula: '',
            example: data.summary || 'Aplica esta regla clave al hablar.',
            highlight: '',
            explanation: 'Sigue conversando o responde la pregunta para dominarla.',
          },
        ];

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 my-2.5">
      {/* Left Column */}
      <div className="lg:col-span-6 flex flex-col gap-2.5">
        {leftCards.map((card, i) => (
          <FlankCardItem key={card.id || i} card={card} index={i * 2} onPlayAudio={onPlayAudio} />
        ))}
      </div>
      {/* Right Column */}
      <div className="lg:col-span-6 flex flex-col gap-2.5">
        {rightCards.map((card, i) => (
          <FlankCardItem key={card.id || i} card={card} index={i * 2 + 1} onPlayAudio={onPlayAudio} />
        ))}
      </div>
      {/* Quiz Bar at Bottom */}
      {data.quiz && (
        <div className="lg:col-span-12">
          <CompactQuizBar
            quiz={data.quiz}
            lastUserVoiceText={lastUserVoiceText}
            onCorrect={onCorrect || onClose}
          />
        </div>
      )}
    </div>
  );
}
