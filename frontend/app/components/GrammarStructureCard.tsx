'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Volume2, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';

export interface GrammarToken {
  role?: string;
  label?: string;
  pattern?: string;
  token?: string;
  color?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan' | string;
}

export interface ExampleBreakdown {
  english: string;
  spanish?: string;
  parts?: Array<{
    role: string;
    text: string;
    color?: string;
  }>;
}

export interface GrammarStructureData {
  title?: string;
  formula?: string;
  formula_tokens?: GrammarToken[];
  explanation?: string;
  example_breakdowns?: ExampleBreakdown[];
  tips?: string;
}

interface GrammarStructureCardProps {
  structure: GrammarStructureData | string | null | undefined;
  onPlayAudio?: (text: string) => void;
  theme?: 'studio' | 'chalk' | 'neon' | 'whiteboard';
  activeTokenRole?: string | null;
  activeTokenPattern?: string | null;
  activeTokenIndex?: number | null;
  showExamples?: boolean;
}

// ─── Color Helper for Tokens ─────────────────────────────────────────────────
function getTokenColorClasses(color?: string) {
  switch (color) {
    case 'blue':
    case 'cyan':
      return {
        bg: 'bg-sky-500/10 border-sky-400/35 text-sky-200',
        badge: 'bg-sky-500/25 text-sky-200 border-sky-400/60 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
        glow: 'shadow-[0_0_15px_rgba(56,189,248,0.15)]',
        chip: 'bg-sky-400/15 border-sky-400/30 text-sky-100',
      };
    case 'purple':
    case 'accent':
      return {
        bg: 'bg-purple-500/10 border-purple-400/35 text-purple-200',
        badge: 'bg-purple-500/25 text-purple-200 border-purple-400/60 shadow-[0_0_8px_rgba(192,132,252,0.2)]',
        glow: 'shadow-[0_0_15px_rgba(192,132,252,0.15)]',
        chip: 'bg-purple-400/15 border-purple-400/30 text-purple-100',
      };
    case 'emerald':
    case 'green':
      return {
        bg: 'bg-emerald-500/10 border-emerald-400/35 text-emerald-200',
        badge: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60 shadow-[0_0_8px_rgba(52,211,153,0.2)]',
        glow: 'shadow-[0_0_15px_rgba(52,211,153,0.15)]',
        chip: 'bg-emerald-400/15 border-emerald-400/30 text-emerald-100',
      };
    case 'amber':
    case 'gold':
    case 'yellow':
      return {
        bg: 'bg-amber-500/10 border-amber-400/35 text-amber-200',
        badge: 'bg-amber-500/25 text-amber-200 border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.2)]',
        glow: 'shadow-[0_0_15px_rgba(251,191,36,0.15)]',
        chip: 'bg-amber-400/15 border-amber-400/30 text-amber-100',
      };
    case 'rose':
    case 'pink':
      return {
        bg: 'bg-rose-500/10 border-rose-400/35 text-rose-200',
        badge: 'bg-rose-500/25 text-rose-200 border-rose-400/60 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
        chip: 'bg-rose-400/15 border-rose-400/30 text-rose-100',
      };
    default:
      return {
        bg: 'bg-brand-accent/15 border-brand-accent/40 text-cyan-100',
        badge: 'bg-brand-accent/30 text-white border-brand-accent/60 shadow-[0_0_8px_rgba(108,99,255,0.2)]',
        glow: 'shadow-[0_0_15px_rgba(108,99,255,0.15)]',
        chip: 'bg-brand-accent/20 border-brand-accent/30 text-cyan-100',
      };
  }
}

export default function GrammarStructureCard({
  structure,
  onPlayAudio,
  theme = 'studio',
  activeTokenRole,
  activeTokenPattern,
  activeTokenIndex,
  showExamples = true,
}: GrammarStructureCardProps) {
  if (!structure) return null;

  // Normalize structure if passed as plain string or partial object
  let data: GrammarStructureData = {};
  if (typeof structure === 'string') {
    data = {
      title: 'Estructura Gramatical',
      formula: structure,
      formula_tokens: structure
        .split(/\s*\+\s*|\s*→\s*|\s*\|\s*/)
        .filter(Boolean)
        .map((tok, idx) => {
          const colors = ['blue', 'purple', 'emerald', 'amber'];
          return {
            role: `Elemento ${idx + 1}`,
            pattern: tok.replace(/[\[\]]/g, '').trim(),
            color: colors[idx % colors.length],
          };
        }),
    };
  } else {
    data = structure;
  }

  const isChalk = theme === 'chalk';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl p-4 sm:p-5 transition-all duration-300 border relative overflow-hidden ${
        isChalk
          ? 'bg-black/60 border-yellow-400/30 text-white font-chalk shadow-2xl backdrop-blur-md'
          : 'grammar-formula-card border-brand-accent/40 text-white shadow-2xl backdrop-blur-xl bg-brand-surface/40'
      }`}
    >
      {/* 🌟 Top Header: Category Tag, Title, and Listen Button */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl flex items-center justify-center ${
              isChalk
                ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 shadow-[0_0_10px_rgba(250,204,21,0.25)]'
                : 'bg-brand-accent/25 text-brand-cyan border border-brand-cyan/40 shadow-[0_0_10px_rgba(0,212,255,0.3)]'
            }`}
          >
            <Lightbulb size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-cyan bg-brand-cyan/15 px-2 py-0.5 rounded-md border border-brand-cyan/30">
                ⚡ Patrón Sintáctico & Fórmula
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white font-outfit mt-0.5 leading-snug">
              {data.title || 'Estructura Gramatical Clave'}
            </h3>
          </div>
        </div>
      </div>

      {/* 📐 FORMULA VISUALIZER: Modular Spacious Blocks with Clear Role Badges */}
      <div className="my-3 space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-cyan/90 block">
          📐 Fórmula Visual:
        </span>

        {data.formula_tokens && data.formula_tokens.length > 0 ? (
          <div className="flex items-stretch gap-2 sm:gap-3 flex-wrap p-3 sm:p-4 rounded-2xl bg-black/50 border border-white/15 shadow-inner">
            {data.formula_tokens.map((token, idx) => {
              const roleName = token.role || token.label || `Elemento ${idx + 1}`;
              const textContent = token.pattern || token.token || '';
              const style = getTokenColorClasses(token.color);

              // Check if pattern contains multiple options separated by /
              const hasMultipleOptions = textContent.includes(' / ') || textContent.includes('/');
              const optionList = hasMultipleOptions
                ? textContent.split(/\s*\/\s*/).filter(Boolean)
                : [];

              const isTokenActive = Boolean(
                (typeof activeTokenIndex === 'number' && activeTokenIndex === idx) ||
                (activeTokenRole && (
                  roleName.toLowerCase().trim() === activeTokenRole.toLowerCase().trim() ||
                  roleName.toLowerCase().includes(activeTokenRole.toLowerCase()) ||
                  activeTokenRole.toLowerCase().includes(roleName.toLowerCase())
                )) ||
                (activeTokenPattern && (
                  textContent.toLowerCase().trim() === activeTokenPattern.toLowerCase().trim() ||
                  textContent.toLowerCase().includes(activeTokenPattern.toLowerCase()) ||
                  activeTokenPattern.toLowerCase().includes(textContent.toLowerCase())
                ))
              );

              return (
                <React.Fragment key={idx}>
                  <motion.div
                    animate={{
                      scale: isTokenActive ? 1.07 : 1,
                      y: isTokenActive ? -3 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    whileHover={{ scale: 1.02 }}
                    className={`flex flex-col justify-between gap-1.5 p-2.5 sm:p-3 rounded-xl border transition-all min-w-[125px] flex-1 relative ${
                      isTokenActive
                        ? 'bg-yellow-400/25 border-yellow-300 ring-4 ring-yellow-400 shadow-[0_0_45px_rgba(250,204,21,0.75)] z-10'
                        : `${style.bg} ${style.glow}`
                    }`}
                  >
                    {/* Top Role Badge */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          isTokenActive
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-300 text-black border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.9)] font-extrabold'
                            : style.badge
                        }`}
                      >
                        {roleName}
                      </span>
                      {isTokenActive && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
                          <span className="text-[9px] text-yellow-300 font-mono font-bold">Activo</span>
                        </span>
                      )}
                    </div>

                    {/* Pattern Content */}
                    {hasMultipleOptions && optionList.length > 1 ? (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {optionList.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className={`text-[11px] sm:text-xs font-bold font-mono px-1.5 py-0.5 rounded border ${
                              isTokenActive
                                ? 'bg-yellow-400/40 border-yellow-300 text-white font-extrabold shadow-sm'
                                : style.chip
                            }`}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={`text-xs sm:text-sm font-bold font-mono leading-snug ${
                        isTokenActive ? 'text-yellow-100 font-extrabold' : 'text-white'
                      }`}>
                        {textContent}
                      </span>
                    )}
                  </motion.div>

                  {/* '+' or '→' connector between tokens */}
                  {idx < (data.formula_tokens?.length || 0) - 1 && (
                    <div className="flex items-center justify-center px-0.5 text-brand-cyan/90 font-black text-sm sm:text-base select-none">
                      +
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-black/40 border border-brand-accent/30 font-mono text-xs sm:text-sm font-bold text-brand-cyan flex items-center gap-2">
            <Sparkles size={15} className="text-brand-gold flex-shrink-0" />
            <span>{data.formula}</span>
          </div>
        )}
      </div>

      {/* 💡 EXPLANATION / PEDAGOGICAL RULE */}
      {data.explanation && (
        <div className="mb-3 text-xs sm:text-sm text-brand-text-secondary leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10 font-mono">
          <span className="text-brand-cyan font-bold block mb-1">💡 Regla de Uso:</span>
          {data.explanation}
        </div>
      )}

      {/* 🔍 EXAMPLE SENTENCE BREAKDOWN: Clean 2-Column Responsive Grid (Only revealed in Examples chunk or full reveal) */}
      {data.example_breakdowns && data.example_breakdowns.length > 0 && showExamples && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-2 mt-3 pt-3 border-t border-white/10"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-brand-gold" />
            <span>Ejemplos Desglosados en Acción:</span>
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.example_breakdowns.map((ex, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-brand-cyan/40 transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold font-mono text-white">
                      &quot;{ex.english}&quot;
                    </span>
                    {onPlayAudio && (
                      <button
                        type="button"
                        onClick={() => onPlayAudio(ex.english)}
                        className="p-1 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan/30 text-brand-cyan transition-colors"
                        title="Escuchar oración"
                      >
                        <Volume2 size={12} />
                      </button>
                    )}
                  </div>
                  {ex.spanish && (
                    <span className="text-[11px] text-brand-text-secondary italic">
                      ({ex.spanish})
                    </span>
                  )}
                </div>

                {/* Pill mapping for example parts */}
                {ex.parts && ex.parts.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {ex.parts.map((p, pIdx) => {
                      const style = getTokenColorClasses(p.color);
                      return (
                        <div
                          key={pIdx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-mono ${style.bg}`}
                        >
                          <span className="text-[9px] font-extrabold uppercase opacity-80">
                            {p.role}:
                          </span>
                          <strong className="text-white">{p.text}</strong>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 📌 TIP / PEDAGOGICAL ADVICE */}
      {data.tips && showExamples && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-3 p-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/25 text-xs text-amber-200 flex items-start gap-2"
        >
          <HelpCircle size={14} className="text-brand-gold flex-shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong className="text-brand-gold font-bold">Consejo Clave: </strong>
            <span>{data.tips}</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
