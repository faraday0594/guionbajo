'use client';

import React, { memo } from 'react';

interface ChalkboardBackgroundWritingProps {
  topic?: string;
  className?: string;
}

/**
 * ChalkboardBackgroundWriting
 * 
 * Hyper-realistic classroom chalk background layer rendered onto the green chalkboard stage.
 * It features authentic chalk handwritten formulas, IPA phonetics, timeline sketches,
 * grammar rules, teacher notes, eraser swipe smudges, and chalk dust haze.
 * 
 * Strictly decorative (pointer-events-none, select-none, z-0) so it peeks through gaps,
 * padding, and margins between cards, imparting a real classroom blackboard depth.
 */
function ChalkboardBackgroundWritingComponent({
  topic = '',
  className = '',
}: ChalkboardBackgroundWritingProps) {
  const displayTopic = topic ? topic.replace(/^[0-9]+\.\s*/, '').trim() : 'English Grammar & Structures';

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none z-0 overflow-hidden chalk-dust-haze chalk-eraser-swipes ${className}`}
      style={{ minHeight: '100%' }}
    >
      {/* ─── SVG Chalk Filters & Graphic Primitives ─────────────────── */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          {/* Microscopic chalk porous roughness displacement filter */}
          <filter id="chalk-texture-rough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Faint chalk dust grain pattern */}
          <pattern id="chalk-dust-grain" width="120" height="120" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="25" r="0.6" fill="rgba(255,255,255,0.18)" />
            <circle cx="65" cy="40" r="0.8" fill="rgba(255,255,255,0.12)" />
            <circle cx="95" cy="80" r="0.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="45" cy="100" r="0.7" fill="rgba(255,255,255,0.1)" />
            <circle cx="110" cy="15" r="0.4" fill="rgba(255,255,255,0.16)" />
          </pattern>
        </defs>
      </svg>

      {/* Chalk dust grain overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.04)_0%,transparent_75%)] opacity-80" />

      {/* ─── FELT ERASER SWIPE MARKS (Historic chalkboard residue) ──── */}
      <div
        className="absolute -top-10 -left-10 w-[120%] h-32 opacity-25 transform -rotate-2"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.05) 70%, transparent 100%)',
          filter: 'blur(6px)',
        }}
      />
      <div
        className="absolute top-1/3 -right-20 w-[90%] h-28 opacity-20 transform rotate-3"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.07) 60%, transparent 100%)',
          filter: 'blur(8px)',
        }}
      />
      <div
        className="absolute bottom-10 left-10 w-[70%] h-24 opacity-20 transform -rotate-1"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%)',
          filter: 'blur(5px)',
        }}
      />

      {/* ─── MAIN CHALKBOARD CONTENT CONTAINER ─────────────────────── */}
      <div
        className="relative w-full h-full p-4 sm:p-7 md:p-8 flex flex-col justify-between font-chalk leading-tight"
        style={{ filter: 'url(#chalk-texture-rough)' }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            TOP BAR: Classroom Header, Date, Subject, Topic Underlined
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-2 mb-2">
          {/* Top-Left: Date & Department */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-yellow-200/50 tracking-wider">
              <span>English Dept.</span>
              <span>•</span>
              <span>Unit Notes</span>
              <span>•</span>
              <span className="text-white/40">Room 101</span>
            </div>
            <div className="text-sm sm:text-base md:text-lg text-white/60 flex items-center gap-2">
              <span className="text-yellow-100/70 font-bold">Topic:</span>
              <span className="text-white/75 underline decoration-white/30 decoration-wavy underline-offset-4">
                {displayTopic}
              </span>
            </div>
          </div>

          {/* Top-Right: Teacher's Motivational Note & Star */}
          <div className="text-right hidden sm:block">
            <div className="text-xs sm:text-sm text-cyan-200/50 flex items-center justify-end gap-1.5">
              <span className="text-yellow-300/70">★</span>
              <span>"Practice makes progress"</span>
            </div>
            <div className="text-[11px] text-white/35">
              Rule #1: Always speak aloud with confidence!
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            MIDDLE CANVAS: Grammar Architecture, Timeline, Formulas, IPA
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-auto py-2">
          
          {/* LEFT COLUMN (Cols 1-4): S + V + C Box, 3rd Person & Auxiliaries */}
          <div className="md:col-span-4 space-y-4">
            {/* Boxed Core Formula */}
            <div className="p-3.5 rounded-2xl border border-dashed border-white/25 bg-white/[0.015] shadow-inner space-y-2">
              <div className="flex items-center justify-between text-yellow-300/60 text-xs sm:text-sm font-bold">
                <span>[ CORE PATTERN ]</span>
                <span className="text-white/30 text-[11px]">Formula I</span>
              </div>
              <div className="text-sm sm:text-base text-white/70 tracking-wide">
                [ Subject ] + [ Verb (base) ] + [ Complement ]
              </div>
              <div className="pt-1.5 border-t border-white/10 space-y-1 text-xs sm:text-sm text-white/50">
                <div className="flex items-center justify-between">
                  <span>• I / You / We / They</span>
                  <span className="text-cyan-200/70">➔ speak</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>• He / She / It</span>
                  <span className="text-yellow-200/70 font-bold">➔ speaks (+s)</span>
                </div>
              </div>
            </div>

            {/* Question & Negative Auxiliaries Note */}
            <div className="space-y-1.5 pl-2 border-l-2 border-dashed border-cyan-400/25">
              <div className="text-xs sm:text-sm font-bold text-cyan-200/65 flex items-center gap-1.5">
                <span>⚡ Auxiliaries: DO / DOES</span>
              </div>
              <p className="text-xs text-white/55">
                Do / Does + [ Subject ] + [ Verb (base) ] ?
              </p>
              <div className="text-[11px] text-emerald-300/50 space-y-0.5">
                <div>✓ "Does he like coffee?"</div>
                <div className="text-rose-300/40 line-through">✗ "Does he likes...?" (No double -s!)</div>
              </div>
            </div>

            {/* Common Contractions Doodle */}
            <div className="text-xs text-white/45 space-y-0.5 pt-1">
              <div className="text-yellow-200/50 font-bold">Quick Contractions:</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/10">do not = don't</span>
                <span className="bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/10">does not = doesn't</span>
              </div>
            </div>
          </div>

          {/* CENTER COLUMN (Cols 5-8): Time Machine Timeline & Irregular Verbs */}
          <div className="md:col-span-4 space-y-4 flex flex-col justify-center">
            {/* Timeline Arrow Diagram */}
            <div className="text-center space-y-2 py-1">
              <div className="text-xs text-yellow-200/60 font-bold tracking-wider uppercase">
                ⏱️ Verb Tenses Timeline
              </div>

              {/* Hand-drawn chalk arrow line */}
              <div className="relative py-2 flex items-center justify-between text-xs text-white/60">
                <div className="flex flex-col items-center">
                  <span className="text-cyan-200/70 font-bold">Past (V2)</span>
                  <span className="text-[11px] text-white/40">yesterday</span>
                  <span className="text-white/30 text-xs">▲</span>
                </div>

                <div className="flex-1 h-[1.5px] bg-white/25 mx-2 relative">
                  <div className="absolute inset-y-0 left-0 w-2 h-[1.5px] bg-cyan-400/40" />
                  <div className="absolute inset-y-0 right-0 w-2 h-[1.5px] bg-yellow-400/40" />
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-emerald-200/80 font-bold">Present (V1)</span>
                  <span className="text-[11px] text-white/40">now / daily</span>
                  <span className="text-emerald-300/50 text-xs">▲</span>
                </div>

                <div className="flex-1 h-[1.5px] bg-white/25 mx-2 relative">
                  <div className="absolute inset-y-0 right-0 w-2 h-[1.5px] bg-yellow-400/40" />
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-yellow-200/70 font-bold">Future</span>
                  <span className="text-[11px] text-white/40">will + V</span>
                  <span className="text-white/30 text-xs">▲</span>
                </div>
              </div>
            </div>

            {/* Chameleon Verbs Chalk Table */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-white/55 space-y-1.5">
              <div className="flex items-center justify-between text-yellow-200/65 font-bold">
                <span>🦎 Irregular Verbs (V1 ➔ V2):</span>
                <span className="text-white/30">Past form</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] sm:text-xs">
                <div className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>go (ir)</span>
                  <span className="text-cyan-200/70 font-bold">went</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>see (ver)</span>
                  <span className="text-cyan-200/70 font-bold">saw</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>have (tener)</span>
                  <span className="text-cyan-200/70 font-bold">had</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>eat (comer)</span>
                  <span className="text-cyan-200/70 font-bold">ate</span>
                </div>
              </div>
            </div>

            {/* Faint erased chalk residue / Ghost text */}
            <div className="text-[11px] text-white/20 italic text-center select-none pt-1">
              "Remember to practice sentence repetition 3x daily..."
            </div>
          </div>

          {/* RIGHT COLUMN (Cols 9-12): Phonetics, IPA, Intonation & Tips */}
          <div className="md:col-span-4 space-y-3.5">
            {/* Phonetics & IPA Card */}
            <div className="p-3.5 rounded-2xl border border-dashed border-emerald-400/20 bg-white/[0.015] space-y-2">
              <div className="flex items-center justify-between text-emerald-300/65 text-xs sm:text-sm font-bold">
                <span>🗣️ PHONETIC LAB (IPA)</span>
                <span className="text-white/30 text-[10px]">Sounds</span>
              </div>

              <div className="space-y-1.5 text-xs text-white/60">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-200/75 font-mono text-sm">/θ/</span>
                  <span className="text-white/45">think, three, mouth</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-200/75 font-mono text-sm">/ð/</span>
                  <span className="text-white/45">this, that, mother</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-1">
                  <span className="text-yellow-200/75 font-mono text-sm">/iː/ vs /ɪ/</span>
                  <span className="text-white/45">sheep (largo) vs ship (corto)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-200/75 font-mono text-sm">/æ/ vs /ʌ/</span>
                  <span className="text-white/45">cat (abierta) vs cut (media)</span>
                </div>
              </div>
            </div>

            {/* Intonation Rules */}
            <div className="space-y-1 pl-2 border-l-2 border-dashed border-yellow-400/25 text-xs text-white/50">
              <div className="font-bold text-yellow-200/60 flex items-center gap-1.5">
                <span>🎵 Musical Intonation</span>
              </div>
              <div className="text-[11px] space-y-0.5">
                <div>↗ Rising pitch: Yes/No questions ("Are you ready? ↗")</div>
                <div>↘ Falling pitch: Wh- questions ("Where are you? ↘")</div>
              </div>
            </div>

            {/* Word Stress Doodle */}
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/40 flex items-center justify-between">
              <span>Stress syllable:</span>
              <span className="text-cyan-200/60 font-bold">'PRE-sent (n.) vs pre-'SENT (v.)</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            BOTTOM BAR: Adverbs of Frequency, Goals Checklist & Chalk Notes
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/45">
          {/* Adverb frequency scale */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-yellow-200/50 font-bold">Frequency:</span>
            <span className="bg-white/[0.03] px-2 py-0.5 rounded text-[11px]">100% Always</span>
            <span className="bg-white/[0.03] px-2 py-0.5 rounded text-[11px]">80% Usually</span>
            <span className="bg-white/[0.03] px-2 py-0.5 rounded text-[11px]">50% Sometimes</span>
            <span className="bg-white/[0.03] px-2 py-0.5 rounded text-[11px]">0% Never</span>
          </div>

          {/* Lesson Checklist */}
          <div className="flex items-center gap-3 text-[11px] text-emerald-200/40">
            <span>☑ Listening</span>
            <span>☑ Pronunciation</span>
            <span>☑ Speaking</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ChalkboardBackgroundWriting = memo(ChalkboardBackgroundWritingComponent);
export default ChalkboardBackgroundWriting;
