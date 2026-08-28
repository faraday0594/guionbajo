'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Mic,
  Send,
  RefreshCw,
  Maximize2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Activity,
  X,
} from 'lucide-react';
import ScoreDisplay from './TutorPanel/ScoreDisplay';

export interface TimelineStepPayload {
  title?: string;
  topic?: string;
  caption?: string;
  formula?: string;
  formula_tokens?: Array<{
    role?: string;
    label?: string;
    pattern?: string;
    token?: string;
    color?: string;
  }>;
  explanation?: string;
  english?: string;
  spanish?: string;
  transformation?: {
    from: string;
    to: string;
    rule?: string;
  } | null;
  transformations?: Array<{
    from: string;
    to: string;
    rule?: string;
  }>;
  contrast?: {
    correct: string;
    incorrect: string;
    why?: string;
  } | null;
  contrasts?: Array<{
    correct: string;
    incorrect: string;
    why?: string;
  }>;
  phonetic_pairs?: Array<{
    word1: string;
    ipa1: string;
    trans1?: string;
    word2: string;
    ipa2: string;
    trans2?: string;
  }>;
  vocabulary_pillars?: Array<{
    english: string;
    translation?: string;
  }>;
  parts?: Array<{
    role: string;
    text: string;
    color?: string;
  }>;
  additional_examples?: Array<{
    english: string;
    translation?: string;
    spanish?: string;
  }>;
  frequency_scale?: Array<{
    adverb: string;
    spanish: string;
    percentage: string;
    color?: string;
  }>;
  svg?: string;
  notes?: string;
  student_task?: string;
  expected_answer?: string;
  exercises?: any[];
}

export interface TimelineStep {
  step_index: number;
  step_title?: string;
  tutor_audio: string;
  visual_action:
    | 'show_hero_image'
    | 'show_vocabulary_pillars'
    | 'show_grammar_formula'
    | 'show_example_sentence'
    | 'show_diagram'
    | 'show_board_notes'
    | 'show_duel_contrast'
    | 'show_challenge';
  payload?: TimelineStepPayload;
}

interface TimelineVisualRendererProps {
  timeline: TimelineStep[];
  activeStepIdx: number; // 0-based
  revealedStepCount: number; // 1 to timeline.length
  isFullBoardRevealed?: boolean;
  audioProgress?: number; // 0-100
  isPlaying?: boolean;
  tutorState?: string;
  theme?: 'chalk' | 'studio';
  onPlayAudio?: (text: string) => void;

  // Visual Image Props
  imageUrl?: string | null;
  imagePrompt?: string | null;
  imageLoading?: boolean;
  onRegenerateImage?: () => void;
  onOpenImageModal?: (url: string) => void;

  // Concept Table & Pedagogical Pro Tip
  diagramSvg?: string | null;
  frequencyScale?: Array<{ adverb: string; spanish: string; percentage: string; color?: string }>;
  pedagogicalTip?: string;

  // Pronunciation Practice Props
  onStartItemRecording?: (key: string, targetText: string) => void;
  onStopItemRecording?: () => void;
  itemRecordingKey?: string | null;
  itemProcessingKey?: string | null;
  itemLiveTranscript?: string;
  itemEvaluations?: Record<string, any>;

  // Practice & Quiz Interactive Props
  exercises?: any[];
  currentExerciseIdx?: number;
  onSelectExercise?: (idx: number) => void;
  onSelectOption?: (option: string) => void;
  selectedOption?: string | null;
  textInput?: string;
  onTextInputChange?: (value: string) => void;
  onSubmitAnswer?: () => void;
  onStartVoiceRecording?: () => void;
  onStopVoiceRecording?: () => void;
  isRecording?: boolean;
  isProcessing?: boolean;
  evaluation?: any;
}

// ── Color styling helper for grammar tokens ──
function getTokenClasses(color?: string) {
  switch (color) {
    case 'blue':
    case 'sky':
    case 'cyan':
      return {
        bg: 'bg-sky-500/15 border-sky-400/40 text-sky-200',
        badge: 'bg-sky-500/25 text-sky-200 border-sky-400/60',
      };
    case 'purple':
    case 'violet':
      return {
        bg: 'bg-purple-500/15 border-purple-400/40 text-purple-200',
        badge: 'bg-purple-500/25 text-purple-200 border-purple-400/60',
      };
    case 'emerald':
    case 'green':
      return {
        bg: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200',
        badge: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60',
      };
    case 'amber':
    case 'gold':
    case 'yellow':
      return {
        bg: 'bg-amber-500/15 border-amber-400/40 text-amber-200',
        badge: 'bg-amber-500/25 text-amber-200 border-amber-400/60',
      };
    case 'rose':
    case 'pink':
      return {
        bg: 'bg-rose-500/15 border-rose-400/40 text-rose-200',
        badge: 'bg-rose-500/25 text-rose-200 border-rose-400/60',
      };
    default:
      return {
        bg: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-100',
        badge: 'bg-cyan-500/25 text-white border-cyan-400/60',
      };
  }
}

export default function TimelineVisualRenderer({
  timeline,
  activeStepIdx,
  revealedStepCount,
  isFullBoardRevealed = false,
  audioProgress = 0,
  isPlaying = false,
  tutorState = 'idle',
  theme = 'studio',
  onPlayAudio,
  imageUrl,
  imagePrompt,
  imageLoading = false,
  onRegenerateImage,
  onOpenImageModal,
  pedagogicalTip,
  diagramSvg,
  frequencyScale,
  onStartItemRecording,
  onStopItemRecording,
  itemRecordingKey = null,
  itemProcessingKey = null,
  itemLiveTranscript = '',
  itemEvaluations = {},
  exercises = [],
  currentExerciseIdx = 0,
  onSelectExercise,
  onSelectOption,
  selectedOption = null,
  textInput = '',
  onTextInputChange,
  onSubmitAnswer,
  onStartVoiceRecording,
  onStopVoiceRecording,
  isRecording = false,
  isProcessing = false,
  evaluation = null,
}: TimelineVisualRendererProps) {
  // Lightbox Zoom States for Diagram and Concept Scale
  const [isDiagramZoomed, setIsDiagramZoomed] = useState(false);
  const [isScaleZoomed, setIsScaleZoomed] = useState(false);

  // Resolve any active frequency scale from props or timeline steps
  const activeFrequencyScale = frequencyScale || 
    timeline.find(s => s.payload?.frequency_scale && s.payload.frequency_scale.length > 0)?.payload?.frequency_scale ||
    null;

  // Resolve any didactic SVG diagram from props or timeline steps
  const activeDiagramSvg = diagramSvg ||
    timeline.find(s => s.payload?.svg)?.payload?.svg ||
    null;

  const isHookOnly = timeline.length === 1;
  const isChalk = theme === 'chalk';

  // Extract non-image steps that have been revealed so far
  const revealedRightSteps = timeline.slice(1, isFullBoardRevealed ? timeline.length : revealedStepCount);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* ═══════════════════════════════════════════════════════════════════════
          🖼️ PERSISTENT HERO IMAGE (Centered on Hook; Left-docked on Concepts)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`w-full transition-all duration-500 ${
          isHookOnly
            ? 'lg:col-span-12 max-w-2xl mx-auto'
            : 'lg:col-span-5 flex flex-col gap-3 lg:sticky lg:top-4'
        }`}
      >
        <div
          className={`relative rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300 ${
            activeStepIdx === 0 && isPlaying
              ? 'ring-4 ring-brand-cyan/60 shadow-[0_0_50px_rgba(0,212,255,0.4)] border-brand-cyan'
              : 'border-white/15 bg-black/40'
          }`}
        >
          {/* Top image status badge */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-lg">
            <span className={`w-2 h-2 rounded-full ${activeStepIdx === 0 && isPlaying ? 'bg-brand-cyan animate-ping' : 'bg-brand-gold'}`} />
            <span>{isHookOnly ? '🌟 Situación Principal' : '🖼️ Contexto Visual'}</span>
          </div>

          {/* Top right quick actions */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            {imageUrl && onOpenImageModal && (
              <button
                type="button"
                onClick={() => onOpenImageModal(imageUrl)}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white/90 hover:text-white transition-all shadow-md"
                title="Ampliar imagen"
              >
                <Maximize2 size={13} />
              </button>
            )}
            {onRegenerateImage && (
              <button
                type="button"
                onClick={onRegenerateImage}
                disabled={imageLoading}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white/90 hover:text-white transition-all shadow-md disabled:opacity-40"
                title="Regenerar ilustración con IA"
              >
                <RefreshCw size={13} className={imageLoading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

          {/* Stable Image Display (Clean aspect ratio to prevent sudden zoom distortions) */}
          <div className={`w-full overflow-hidden bg-black/60 flex items-center justify-center ${isHookOnly ? 'aspect-[16/10] sm:aspect-video min-h-[300px]' : 'aspect-[16/10] min-h-[220px]'}`}>
            {imageLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin shadow-lg" />
                <span className="text-xs font-mono text-brand-cyan font-bold animate-pulse">
                  Generando ilustración situacional con IA...
                </span>
              </div>
            ) : imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageUrl}
                alt={imagePrompt || 'Ilustración didáctica de la situación'}
                className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-white/50 font-mono text-xs">
                <Sparkles size={24} className="text-brand-gold animate-bounce" />
                <span>Observa atentamente la situación en inglés</span>
              </div>
            )}
          </div>

          {/* Bottom Audio Progress Bar if active */}
          {activeStepIdx === 0 && isPlaying && (
            <div className="w-full bg-black/80 p-2 border-t border-white/10 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan font-mono pl-1">
                Locución
              </span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-cyan to-brand-accent rounded-full shadow-[0_0_10px_rgba(0,212,255,0.8)]"
                  style={{ width: `${Math.min(Math.max(audioProgress, 0), 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 🌡️ FREQUENCY SCALE / CONCEPT TABLE (Under Hero Image) */}
        {!isHookOnly && activeFrequencyScale && activeFrequencyScale.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-black/75 to-black/90 border border-purple-500/30 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  <Activity size={15} />
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                  Termómetro &amp; Escala de Frecuencia
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsScaleZoomed(true)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-all shadow-md"
                title="Ampliar tabla a pantalla completa"
              >
                <Maximize2 size={13} />
              </button>
            </div>
            <div className="space-y-2 pt-0.5">
              {activeFrequencyScale.map((item, fIdx) => {
                const pctNum = parseInt(item.percentage) || (item.adverb.toLowerCase() === 'always' ? 100 : item.adverb.toLowerCase() === 'usually' ? 80 : item.adverb.toLowerCase() === 'often' ? 70 : item.adverb.toLowerCase() === 'sometimes' ? 50 : 0);
                const colorClass = pctNum >= 90 
                  ? 'from-rose-500/30 via-rose-500/15 to-transparent border-rose-500/40 text-rose-200'
                  : pctNum >= 75
                  ? 'from-amber-500/30 via-amber-500/15 to-transparent border-amber-500/40 text-amber-200'
                  : pctNum >= 40
                  ? 'from-yellow-500/30 via-yellow-500/15 to-transparent border-yellow-500/40 text-yellow-200'
                  : 'from-sky-500/30 via-sky-500/15 to-transparent border-sky-500/40 text-sky-200';

                const barColor = pctNum >= 90 ? 'bg-rose-400' : pctNum >= 75 ? 'bg-amber-400' : pctNum >= 40 ? 'bg-yellow-400' : 'bg-sky-400';

                return (
                  <div
                    key={fIdx}
                    className={`p-2.5 rounded-xl bg-gradient-to-r ${colorClass} border flex items-center justify-between gap-2 shadow-sm`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs sm:text-sm font-black text-white w-24">
                        {item.adverb}
                      </span>
                      <span className="text-xs text-slate-300 italic">
                        {item.spanish}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pctNum}%` }} />
                      </div>
                      <span className="font-mono text-xs font-bold text-white min-w-[36px] text-right">
                        {item.percentage}
                      </span>
                      {onPlayAudio && (
                        <button
                          type="button"
                          onClick={() => onPlayAudio(item.adverb)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                          title={`Escuchar ${item.adverb}`}
                        >
                          <Volume2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 📊 DIDACTIC SVG DIAGRAM (Enlarged + Zoom Button) */}
        {!isHookOnly && activeDiagramSvg && (
          <div className="p-4 rounded-2xl bg-black/70 border border-cyan-500/30 shadow-2xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <Sparkles size={15} />
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                  Esquema Conceptual Didáctico
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDiagramZoomed(true)}
                className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 hover:text-white transition-all shadow-md"
                title="Ampliar esquema a pantalla completa"
              >
                <Maximize2 size={13} />
              </button>
            </div>
            <div
              className="w-full flex items-center justify-center overflow-hidden rounded-xl [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[380px] transition-transform"
              dangerouslySetInnerHTML={{ __html: activeDiagramSvg }}
            />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          📖 DYNAMIC SEQUENTIAL TEACHING FEED (Appears on Chunk 2+)
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {!isHookOnly && (
          <div className="lg:col-span-7 flex flex-col gap-4 w-full">
            {revealedRightSteps.map((step, idx) => {
              const currentStepNumber = step.step_index;
              const isStepActive = activeStepIdx + 1 === currentStepNumber && isPlaying;
              const p = step.payload || {};

              return (
                <motion.div
                  key={`timeline-step-${currentStepNumber}-${step.visual_action}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.04 }}
                  className={`w-full rounded-2xl transition-all duration-300 ${
                    isStepActive
                      ? 'ring-2 ring-brand-cyan shadow-[0_0_35px_rgba(0,212,255,0.35)]'
                      : 'shadow-lg'
                  }`}
                >
                  {/* ──────────────────────────────────────────────────────────
                      A. GRAMMAR FORMULA CARD
                      ────────────────────────────────────────────────────────── */}
                  {step.visual_action === 'show_grammar_formula' && (
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isChalk
                          ? 'bg-black/70 border-yellow-400/30 text-white font-chalk'
                          : 'bg-brand-surface/60 border-yellow-500/30 text-white shadow-xl backdrop-blur-md'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                            <Sparkles size={15} />
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-yellow-300 font-outfit">
                            {p.title || '⚡ Patrón Sintáctico & Fórmula'}
                          </h3>
                        </div>
                        {isStepActive && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-400/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-ping" />
                            <span>En Foco</span>
                          </span>
                        )}
                      </div>

                      {/* Visual Wagon / Formula Token Chips */}
                      {p.formula_tokens && p.formula_tokens.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap py-3 overflow-x-auto">
                          {p.formula_tokens.map((token, tIdx) => {
                            const style = getTokenClasses(token.color);
                            const roleText = token.role || token.label || `Elemento ${tIdx + 1}`;
                            const patternText = token.pattern || token.token || '';
                            return (
                              <React.Fragment key={tIdx}>
                                <div
                                  className={`flex flex-col items-center justify-center px-3.5 py-2 rounded-xl border font-mono shadow-md ${style.bg}`}
                                >
                                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">
                                    {roleText}
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-white mt-0.5">
                                    {patternText}
                                  </span>
                                </div>
                                {tIdx < p.formula_tokens!.length - 1 && (
                                  <span className="text-sm font-extrabold text-brand-gold font-mono px-0.5">
                                    +
                                  </span>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      ) : p.formula ? (
                        <div className="my-3 p-3 rounded-xl bg-black/50 border border-yellow-500/30 text-center font-mono font-bold text-yellow-200 text-sm">
                          {p.formula}
                        </div>
                      ) : null}

                      {p.explanation && (
                        <div className="text-xs text-slate-300 leading-relaxed font-sans pt-1 border-t border-white/10">
                          <strong className="text-yellow-300">💡 Regla de Uso: </strong>
                          {p.explanation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      B. EXAMPLE SENTENCE & PRONUNCIATION / TRANSFORMATION CARD
                      ────────────────────────────────────────────────────────── */}
                  {step.visual_action === 'show_example_sentence' && (
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isChalk
                          ? 'bg-black/70 border-emerald-400/30 text-white font-chalk'
                          : 'bg-brand-surface/60 border-emerald-500/30 text-white shadow-xl backdrop-blur-md'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 size={15} />
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-300 font-outfit">
                            {p.title || '🎯 Ejemplos y Práctica Oral'}
                          </h3>
                        </div>
                        {isStepActive && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                            <span>Pronunciando</span>
                          </span>
                        )}
                      </div>

                      {/* 1. Multiple or Single Visual Transformations */}
                      {(p.transformations || (p.transformation ? [p.transformation] : [])).map((tr, trIdx) => {
                        const trKey = `trans-${currentStepNumber}-${trIdx}`;
                        const isThisRecording = itemRecordingKey === trKey;
                        const isThisProcessing = itemProcessingKey === trKey;
                        const evalItem = itemEvaluations?.[trKey];

                        return (
                          <div
                            key={trIdx}
                            className="my-2.5 p-3 rounded-xl bg-gradient-to-r from-sky-500/15 via-purple-500/20 to-emerald-500/15 border border-purple-400/30 flex items-center justify-between gap-3 flex-wrap"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-200 border border-sky-400/30 text-xs font-mono font-bold">
                                &quot;{tr.from}&quot;
                              </span>
                              <ArrowRight size={16} className="text-purple-300 animate-pulse flex-shrink-0" />
                              <span className="px-3 py-1 rounded-lg bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 text-xs font-mono font-bold shadow-md">
                                &quot;{tr.to}&quot;
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {onPlayAudio && tr.to && (
                                <button
                                  type="button"
                                  onClick={() => onPlayAudio(tr.to)}
                                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                  title="Escuchar transformación"
                                >
                                  <Volume2 size={13} />
                                </button>
                              )}
                              {onStartItemRecording && tr.to && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isThisRecording) {
                                      onStopItemRecording?.();
                                    } else {
                                      onStartItemRecording(trKey, tr.to);
                                    }
                                  }}
                                  disabled={isThisProcessing}
                                  className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-xs ${
                                    isThisRecording
                                      ? 'bg-red-500 text-white animate-pulse border-red-400'
                                      : 'bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border-cyan-400/40'
                                  }`}
                                  title="Practicar con micrófono"
                                >
                                  <Mic size={13} />
                                </button>
                              )}
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300 bg-purple-500/25 px-2 py-0.5 rounded-full border border-purple-400/40">
                                Transformación
                              </span>
                            </div>

                            {/* Live Recording feedback */}
                            {isThisRecording && itemLiveTranscript && (
                              <div className="w-full text-xs font-mono text-cyan-300 bg-black/60 p-2 rounded-lg border border-cyan-500/40 mt-1 animate-pulse">
                                🎙️ Te escucho: &quot;{itemLiveTranscript}&quot;
                              </div>
                            )}

                            {/* Evaluation result badge */}
                            {evalItem && (
                              <div className="w-full text-xs font-mono p-1.5 rounded-lg bg-black/60 border border-white/15 flex items-center justify-between mt-1">
                                <span className={evalItem.score >= 80 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                  {evalItem.score >= 80 ? '🎯 Excelente' : '💡 Bien intentado'} ({evalItem.score}%)
                                </span>
                                {evalItem.feedback && (
                                  <span className="text-[11px] text-slate-300 italic">{evalItem.feedback}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* 2. Phonetic Minimal Pairs if detected */}
                      {p.phonetic_pairs && p.phonetic_pairs.length > 0 && (
                        <div className="my-2.5 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/90 block">
                            🔬 Pares Mínimos de Pronunciación:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {p.phonetic_pairs.map((pair, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 rounded-xl bg-black/50 border border-cyan-500/30 flex items-center justify-between gap-2"
                              >
                                <div className="text-xs space-y-0.5">
                                  <div className="font-mono font-bold text-white flex items-center gap-1.5">
                                    <span>{pair.word1}</span>
                                    <span className="text-[10px] text-cyan-300 font-normal">{pair.ipa1}</span>
                                    <span className="text-white/40">vs</span>
                                    <span>{pair.word2}</span>
                                    <span className="text-[10px] text-emerald-300 font-normal">{pair.ipa2}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  {onPlayAudio && (
                                    <button
                                      type="button"
                                      onClick={() => onPlayAudio(`${pair.word1}. ${pair.word2}.`)}
                                      className="p-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 transition-colors"
                                      title="Escuchar par mínimo"
                                    >
                                      <Volume2 size={12} />
                                    </button>
                                  )}
                                  {onStartItemRecording && (
                                    <button
                                      type="button"
                                      onClick={() => onStartItemRecording(`pair-${currentStepNumber}-${pIdx}`, `${pair.word1} ${pair.word2}`)}
                                      className="p-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 transition-colors"
                                      title="Practicar con micrófono"
                                    >
                                      <Mic size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Visual Contrasts */}
                      {(p.contrasts || (p.contrast ? [p.contrast] : [])).map((ct, ctIdx) => (
                        <div key={ctIdx} className="my-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between">
                            <span className="font-mono font-bold">✅ &quot;{ct.correct}&quot;</span>
                            <div className="flex items-center gap-1">
                              {onPlayAudio && (
                                <button
                                  type="button"
                                  onClick={() => onPlayAudio(ct.correct)}
                                  className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40"
                                >
                                  <Volume2 size={11} />
                                </button>
                              )}
                              {onStartItemRecording && (
                                <button
                                  type="button"
                                  onClick={() => onStartItemRecording(`contrast-${currentStepNumber}-${ctIdx}`, ct.correct)}
                                  className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40"
                                >
                                  <Mic size={11} />
                                </button>
                              )}
                              <span className="text-[9px] uppercase font-bold text-emerald-400">Correcto</span>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between">
                            <span className="font-mono line-through opacity-80">❌ &quot;{ct.incorrect}&quot;</span>
                            <span className="text-[9px] uppercase font-bold text-rose-400">Error común</span>
                          </div>
                        </div>
                      ))}

                      {/* 4. Main English Sentence / Core Target */}
                      {p.english && (
                        <div className="my-3 p-3.5 rounded-xl bg-black/50 border border-white/15 flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm sm:text-base font-bold font-mono text-white tracking-wide">
                              &quot;{p.english}&quot;
                            </div>
                            {p.spanish && (
                              <div className="text-xs text-brand-text-secondary italic">
                                ({p.spanish})
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {onPlayAudio && (
                              <button
                                type="button"
                                onClick={() => onPlayAudio(p.english!)}
                                className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-md"
                                title="Escuchar oración"
                              >
                                <Volume2 size={14} />
                                <span className="hidden sm:inline">Escuchar</span>
                              </button>
                            )}
                            {onStartItemRecording && (
                              <button
                                type="button"
                                onClick={() => {
                                  const mainKey = `main-${currentStepNumber}`;
                                  if (itemRecordingKey === mainKey) {
                                    onStopItemRecording?.();
                                  } else {
                                    onStartItemRecording(mainKey, p.english!);
                                  }
                                }}
                                disabled={itemProcessingKey === `main-${currentStepNumber}`}
                                className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold shadow-md ${
                                  itemRecordingKey === `main-${currentStepNumber}`
                                    ? 'bg-red-500 text-white animate-pulse border-red-400'
                                    : 'bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border-cyan-500/40'
                                }`}
                                title="Practicar pronunciación con micrófono"
                              >
                                <Mic size={14} />
                                <span className="hidden sm:inline">Practicar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Parts breakdown chips if available */}
                      {p.parts && p.parts.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {p.parts.map((pt, ptIdx) => {
                            const style = getTokenClasses(pt.color);
                            return (
                              <div
                                key={ptIdx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-mono ${style.bg}`}
                              >
                                <span className="text-[9px] font-extrabold uppercase opacity-80">
                                  {pt.role}:
                                </span>
                                <strong className="text-white">{pt.text}</strong>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. Additional secondary examples if present (with Listen + Mic practice) */}
                      {p.additional_examples && p.additional_examples.filter(ad => ad.english && ad.english.trim().length >= 2).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80 block">
                            Otros Ejemplos y Verbos Clave:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {p.additional_examples
                              .filter(ad => ad.english && ad.english.trim().length >= 2)
                              .map((ad, adIdx) => {
                                const exKey = `ex-${currentStepNumber}-${adIdx}`;
                                const isThisRecording = itemRecordingKey === exKey;
                                const isThisProcessing = itemProcessingKey === exKey;
                                const evalItem = itemEvaluations?.[exKey];

                                return (
                                  <div
                                    key={adIdx}
                                    className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 hover:border-emerald-400/40 transition-colors"
                                  >
                                    <div className="text-xs space-y-0.5">
                                      <div className="font-bold text-white font-mono">&quot;{ad.english}&quot;</div>
                                      {(ad.translation || ad.spanish) && (
                                        <div className="text-[10px] text-brand-text-secondary italic">
                                          {ad.translation || ad.spanish}
                                        </div>
                                      )}
                                      {evalItem && (
                                        <div className="text-[10px] font-mono text-emerald-400 font-bold">
                                          🎯 {evalItem.score}%
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {onPlayAudio && ad.english && (
                                        <button
                                          type="button"
                                          onClick={() => onPlayAudio(ad.english)}
                                          className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                                          title="Escuchar pronunciación"
                                        >
                                          <Volume2 size={12} />
                                        </button>
                                      )}
                                      {onStartItemRecording && ad.english && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (isThisRecording) {
                                              onStopItemRecording?.();
                                            } else {
                                              onStartItemRecording(exKey, ad.english);
                                            }
                                          }}
                                          disabled={isThisProcessing}
                                          className={`p-1.5 rounded-lg border transition-all ${
                                            isThisRecording
                                              ? 'bg-red-500 text-white animate-pulse border-red-400'
                                              : 'bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border-cyan-400/30'
                                          }`}
                                          title="Practicar con micrófono"
                                        >
                                          <Mic size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      C. DIDACTIC SVG DIAGRAM
                      ────────────────────────────────────────────────────────── */}
                  {step.visual_action === 'show_diagram' && p.svg && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-cyan-500/30 text-white shadow-xl backdrop-blur-md space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            <Sparkles size={15} />
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-300 font-outfit">
                            Gráfico Didáctico Conceptual
                          </h3>
                        </div>
                      </div>
                      <div
                        className="w-full flex items-center justify-center overflow-hidden rounded-xl [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[340px]"
                        dangerouslySetInnerHTML={{ __html: p.svg }}
                      />
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      D. DUEL / CONTRAST CARD
                      ────────────────────────────────────────────────────────── */}
                  {step.visual_action === 'show_duel_contrast' && p.contrast && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-amber-500/30 text-white shadow-xl backdrop-blur-md space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <AlertCircle size={15} />
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300 font-outfit">
                            Contraste de Conceptos (Evita Errores Comunes)
                          </h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1">
                            ❌ Incorrecto:
                          </span>
                          <span className="font-mono text-xs font-bold line-through opacity-80">
                            {p.contrast.incorrect}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                            ✅ Correcto:
                          </span>
                          <span className="font-mono text-xs font-bold">
                            {p.contrast.correct}
                          </span>
                        </div>
                      </div>
                      {p.contrast.why && (
                        <div className="text-xs text-amber-200/90 font-mono bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/25">
                          <strong>¿Por qué? </strong>
                          {p.contrast.why}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      E. INTERACTIVE PRACTICE CHALLENGE
                      ────────────────────────────────────────────────────────── */}
                  {step.visual_action === 'show_challenge' && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-brand-gold/40 text-white shadow-2xl backdrop-blur-md space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                            <HelpCircle size={15} />
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-gold font-outfit">
                            Desafío Interactivo de Práctica
                          </h3>
                        </div>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/30 font-mono font-bold">
                          Tu Turno
                        </span>
                      </div>

                      {/* Interactive Exercise Item */}
                      {exercises.length > 0 ? (
                        <div className="space-y-4">
                          {/* Tabs if multiple exercises */}
                          {exercises.length > 1 && onSelectExercise && (
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                              {exercises.map((ex, exIdx) => (
                                <button
                                  key={ex.id || exIdx}
                                  type="button"
                                  onClick={() => onSelectExercise(exIdx)}
                                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                                    currentExerciseIdx === exIdx
                                      ? 'bg-brand-gold text-black shadow-md scale-105'
                                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                                  }`}
                                >
                                  Ejercicio {exIdx + 1}
                                </button>
                              ))}
                            </div>
                          )}

                          {(() => {
                            const ex = exercises[currentExerciseIdx] || exercises[0];
                            return (
                              <div className="space-y-3">
                                <div className="p-3.5 rounded-xl bg-black/50 border border-white/15">
                                  <div className="text-sm sm:text-base font-bold font-mono text-white leading-relaxed">
                                    {ex.sentence || ex.question || p.student_task}
                                  </div>
                                  {ex.spanish_translation && (
                                    <div className="text-xs text-brand-text-secondary italic mt-1">
                                      💡 {ex.spanish_translation}
                                    </div>
                                  )}
                                </div>

                                {/* Options if available */}
                                {ex.options && ex.options.length > 0 && onSelectOption && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {ex.options.map((opt: string, optIdx: number) => (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        onClick={() => onSelectOption(opt)}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-xl border text-xs sm:text-sm font-mono font-semibold transition-all text-left flex items-center justify-between ${
                                          selectedOption === opt
                                            ? 'bg-brand-gold/25 border-brand-gold text-white ring-2 ring-brand-gold shadow-md'
                                            : 'bg-white/5 border-white/10 text-white/90 hover:bg-white/10 hover:border-brand-gold/40'
                                        }`}
                                      >
                                        <span>{opt}</span>
                                        {selectedOption === opt && (
                                          <CheckCircle2 size={15} className="text-brand-gold flex-shrink-0" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Mic and input response bar */}
                                {!evaluation ? (
                                  <div className="flex items-center gap-2 pt-2">
                                    {onStartVoiceRecording && onStopVoiceRecording && (
                                      <button
                                        type="button"
                                        onClick={isRecording ? onStopVoiceRecording : onStartVoiceRecording}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
                                          isRecording
                                            ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                                            : 'bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-cyan border border-brand-cyan/40 hover:scale-105 shadow-md'
                                        }`}
                                        title={isRecording ? 'Detener grabación' : 'Hablar con micrófono'}
                                      >
                                        <Mic size={18} />
                                      </button>
                                    )}

                                    {onTextInputChange && onSubmitAnswer && (
                                      <div className="flex-1 flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={textInput}
                                          onChange={(e) => onTextInputChange(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && onSubmitAnswer()}
                                          placeholder="Escribe o di tu respuesta en inglés..."
                                          disabled={isProcessing}
                                          className="flex-1 bg-black/50 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-accent transition-colors disabled:opacity-50"
                                        />
                                        <button
                                          type="button"
                                          onClick={onSubmitAnswer}
                                          disabled={!textInput.trim() || isProcessing}
                                          className="px-4 py-2.5 bg-brand-accent hover:bg-brand-accent/90 rounded-xl text-white disabled:opacity-40 transition-colors flex items-center justify-center shadow-md font-semibold text-xs gap-1.5"
                                        >
                                          <Send size={13} />
                                          <span className="hidden sm:inline">Enviar</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3.5 rounded-xl border border-white/10 bg-black/50 text-xs space-y-2">
                                    <div className="flex justify-between font-bold">
                                      <span>Resultado de Evaluación</span>
                                      <span
                                        className={`px-2.5 py-0.5 rounded-full text-xs ${
                                          evaluation.is_correct
                                            ? 'bg-brand-success/20 text-brand-success border border-brand-success/30'
                                            : 'bg-brand-error/20 text-brand-error border border-brand-error/30'
                                        }`}
                                      >
                                        {evaluation.is_correct ? 'Correcto ✅' : 'Reintentar ❌'}
                                      </span>
                                    </div>
                                    <ScoreDisplay scores={evaluation.scores} feedback={evaluation.feedback} />
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-brand-gold bg-brand-gold/10 p-3 rounded-xl border border-brand-gold/30">
                          {p.student_task || 'Completa la consigna que el tutor acaba de explicar.'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      F. BOARD NOTES / SUMMARY
                      ────────────────────────────────────────────────────────── */}
                  {step.visual_action === 'show_board_notes' && p.notes && (
                    <div className="p-4 rounded-2xl bg-black/50 border border-white/15 text-white/90 text-xs font-mono leading-relaxed space-y-1">
                      <strong className="text-brand-cyan block">📌 Nota Clave:</strong>
                      <p>{p.notes}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* 🔍 FULLSCREEN LIGHTBOX MODAL: Didactic SVG Diagram */}
      <AnimatePresence>
        {isDiagramZoomed && activeDiagramSvg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDiagramZoomed(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <div
              className="relative max-w-5xl w-full max-h-full flex flex-col items-center justify-center bg-black/90 p-6 rounded-3xl border border-cyan-500/40 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-outfit uppercase tracking-wider">
                      Esquema Conceptual Didáctico
                    </h3>
                    <p className="text-xs text-cyan-300/80">Vista ampliada en alta resolución</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDiagramZoomed(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
                  title="Cerrar vista amplia"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className="w-full flex items-center justify-center overflow-hidden rounded-2xl [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[75vh]"
                dangerouslySetInnerHTML={{ __html: activeDiagramSvg }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔍 FULLSCREEN LIGHTBOX MODAL: Frequency Scale / Concept Table */}
      <AnimatePresence>
        {isScaleZoomed && activeFrequencyScale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsScaleZoomed(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <div
              className="relative max-w-3xl w-full max-h-full flex flex-col bg-black/90 p-6 rounded-3xl border border-purple-500/40 shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    <Activity size={18} />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-outfit uppercase tracking-wider">
                      Termómetro &amp; Escala de Frecuencia
                    </h3>
                    <p className="text-xs text-purple-300/80">Uso, porcentajes y pronunciación</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScaleZoomed(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
                  title="Cerrar vista amplia"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {activeFrequencyScale.map((item, fIdx) => {
                  const pctNum = parseInt(item.percentage) || (item.adverb.toLowerCase() === 'always' ? 100 : item.adverb.toLowerCase() === 'usually' ? 80 : item.adverb.toLowerCase() === 'often' ? 70 : item.adverb.toLowerCase() === 'sometimes' ? 50 : 0);
                  const colorClass = pctNum >= 90 
                    ? 'from-rose-500/30 via-rose-500/15 to-transparent border-rose-500/50 text-rose-200'
                    : pctNum >= 75
                    ? 'from-amber-500/30 via-amber-500/15 to-transparent border-amber-500/50 text-amber-200'
                    : pctNum >= 40
                    ? 'from-yellow-500/30 via-yellow-500/15 to-transparent border-yellow-500/50 text-yellow-200'
                    : 'from-sky-500/30 via-sky-500/15 to-transparent border-sky-500/50 text-sky-200';

                  const barColor = pctNum >= 90 ? 'bg-rose-400' : pctNum >= 75 ? 'bg-amber-400' : pctNum >= 40 ? 'bg-yellow-400' : 'bg-sky-400';

                  return (
                    <div
                      key={fIdx}
                      className={`p-4 rounded-2xl bg-gradient-to-r ${colorClass} border flex items-center justify-between gap-4 shadow-lg`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono text-base font-black text-white">
                          {item.adverb}
                        </div>
                        <div className="text-xs text-slate-300 italic">
                          {item.spanish}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-28 sm:w-44 h-3 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pctNum}%` }} />
                        </div>
                        <span className="font-mono text-base font-extrabold text-white min-w-[48px] text-right">
                          {item.percentage}
                        </span>
                        {onPlayAudio && (
                          <button
                            type="button"
                            onClick={() => onPlayAudio(item.adverb)}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
                            title={`Escuchar ${item.adverb}`}
                          >
                            <Volume2 size={14} />
                            <span className="hidden sm:inline">Escuchar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
