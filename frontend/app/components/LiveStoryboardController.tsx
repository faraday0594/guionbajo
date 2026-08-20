'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  BookOpen,
  Image as ImageIcon,
  HelpCircle,
  Volume2,
  CheckCircle2,
} from 'lucide-react';

export interface StoryboardStep {
  step_id: string;
  step_index: number;
  element_type: string;
  label: string;
  tutor_speech_snippet?: string;
  trigger_ratio: number;
  animation?: string;
  chalk_color?: string;
  highlight_target?: string;
}

interface LiveStoryboardControllerProps {
  steps: StoryboardStep[];
  activeStepIdx: number;
  revealedCount: number;
  audioProgress: number; // 0 to 100
  isPlaying: boolean;
  isFullBoardRevealed: boolean;
  onStepClick: (index: number) => void;
  onTogglePlay: () => void;
  onReplayStep: () => void;
  onRevealAll: () => void;
  onResetReveal: () => void;
  onPrevStep?: () => void;
  onNextStep?: () => void;
}

export default function LiveStoryboardController({
  steps,
  activeStepIdx,
  revealedCount,
  audioProgress,
  isPlaying,
  isFullBoardRevealed,
  onStepClick,
  onTogglePlay,
  onReplayStep,
  onRevealAll,
  onResetReveal,
}: LiveStoryboardControllerProps) {
  if (!steps || steps.length === 0) return null;

  const currentStep = steps[activeStepIdx] || steps[0];

  const getStepIcon = (type: string, isPast: boolean) => {
    if (isPast) return <CheckCircle2 size={13} className="text-emerald-400" />;
    switch (type) {
      case 'title':
        return <BookOpen size={13} />;
      case 'illustration':
        return <ImageIcon size={13} />;
      case 'concepts':
        return <Layers size={13} />;
      case 'diagram':
      case 'timeline':
        return <Sparkles size={13} className="text-brand-cyan" />;
      case 'grammar':
      case 'phonetics':
        return <Sparkles size={13} />;
      case 'audio_practice':
        return <Volume2 size={13} />;
      case 'exercise':
        return <HelpCircle size={13} />;
      default:
        return <Sparkles size={13} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-2xl bg-black/60 backdrop-blur-xl border border-brand-cyan/25 shadow-xl p-3 sm:p-4 space-y-3 relative overflow-hidden"
    >
      {/* Dynamic ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/5 via-brand-cyan/10 to-transparent pointer-events-none" />

      {/* Top row: Status, Speech Snippet & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
        
        {/* Left: Step indicator & live speech excerpt */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-xs font-bold flex-shrink-0 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
            <span>Paso {activeStepIdx + 1} de {steps.length}</span>
          </div>

          <div className="truncate flex-1">
            <p className="text-xs sm:text-sm font-semibold text-white truncate">
              {currentStep.label || `Paso ${activeStepIdx + 1}`}
            </p>
            {currentStep.tutor_speech_snippet && (
              <p className="text-[11px] text-brand-text-secondary truncate italic">
                &quot;{currentStep.tutor_speech_snippet}&quot;
              </p>
            )}
          </div>
        </div>

        {/* Right: Media & Navigation Controls */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
          {/* Play / Pause Tutor speech */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
              isPlaying
                ? 'bg-brand-accent text-white border-brand-accent shadow-[0_0_15px_rgba(108,99,255,0.4)]'
                : 'glass hover:bg-brand-surface border-brand-border text-brand-cyan hover:text-white'
            }`}
            title={isPlaying ? 'Pausar locución' : 'Continuar locución del tutor'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} className="fill-current" />}
            <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
          </button>

          {/* Replay Step */}
          <button
            type="button"
            onClick={onReplayStep}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-brand-text-muted hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
            title="Repetir explicación de este paso"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Repetir</span>
          </button>

          {/* Reveal All / Progressive Mode Toggle */}
          {!isFullBoardRevealed ? (
            <button
              type="button"
              onClick={onRevealAll}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-brand-gold/20 hover:from-amber-500/30 hover:to-brand-gold/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:scale-105"
              title="Mostrar todo el contenido de la pizarra"
            >
              <Sparkles size={13} className="text-amber-300 animate-pulse" />
              <span>✨ Revelar Todo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetReveal}
              className="px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-brand-border border border-brand-border text-brand-text-muted hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Reiniciar explicación paso a paso"
            >
              <Layers size={13} />
              <span>Repetir Paso a Paso</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: Interactive Step Timeline Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-1">
        {steps.map((step, idx) => {
          const isActive = idx === activeStepIdx;
          const isRevealed = isFullBoardRevealed || idx < revealedCount || idx <= activeStepIdx;
          const isPast = isRevealed && !isActive;

          return (
            <button
              key={step.step_id || idx}
              type="button"
              onClick={() => onStepClick(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border flex-shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-brand-cyan/25 to-brand-accent/25 border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(0,212,255,0.35)] scale-[1.02]'
                  : isPast
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200 hover:border-emerald-400'
                  : 'bg-black/30 border-white/10 text-white/40 hover:text-white hover:border-white/20'
              }`}
              title={`Ir al paso ${idx + 1}: ${step.label}`}
            >
              <span className="flex-shrink-0">{getStepIcon(step.element_type, isPast)}</span>
              <span className="truncate max-w-[130px] sm:max-w-[160px]">{step.label}</span>
              {isActive && isPlaying && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Audio & Step Progress Line */}
      <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden border border-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-cyan via-brand-accent to-emerald-400 rounded-full"
          animate={{
            width: isFullBoardRevealed ? '100%' : `${Math.max(audioProgress, ((activeStepIdx + 1) / steps.length) * 100 * 0.4)}%`,
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}
