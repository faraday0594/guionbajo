'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface GuionbajoMeditationLoaderProps {
  title?: string;
  subtitle?: string;
  companionName?: string;
  compact?: boolean;
}

type EyePeekState = 'closed' | 'peek_right' | 'peek_left';

/**
 * Animación en código (SVG + Framer Motion) de Guionbajo (_) sentado en postura
 * de Meditador Budista (Loto + Mudra Zen) fabricando mentalmente la escena/clase.
 * Mantiene ambos ojos cerrados en concentración profunda y de repente abre y cierra
 * un ojo rápidamente para espiar al estudiante.
 */
export default function GuionbajoMeditationLoader({
  title = 'Guionbajo está fabricando la escena...',
  subtitle,
  companionName,
  compact = false,
}: GuionbajoMeditationLoaderProps) {
  const [eyeState, setEyeState] = useState<EyePeekState>('closed');

  useEffect(() => {
    let mounted = true;
    let timeoutIds: NodeJS.Timeout[] = [];

    const scheduleNextPeek = () => {
      // Wait between 1.8s and 3.1s with eyes closed in meditation, then peek rapidly!
      const delay = 1800 + Math.random() * 1300;
      const mainTimer = setTimeout(() => {
        if (!mounted) return;
        const whichEye: EyePeekState = Math.random() > 0.25 ? 'peek_right' : 'peek_left';
        setEyeState(whichEye);

        // Quick open-and-close (260ms)
        const closeTimer = setTimeout(() => {
          if (!mounted) return;
          setEyeState('closed');

          // 40% chance of a quick mischievous second wink right after!
          if (Math.random() < 0.4) {
            const doubleOpenTimer = setTimeout(() => {
              if (!mounted) return;
              setEyeState(whichEye);
              const doubleCloseTimer = setTimeout(() => {
                if (!mounted) return;
                setEyeState('closed');
                scheduleNextPeek();
              }, 210);
              timeoutIds.push(doubleCloseTimer);
            }, 140);
            timeoutIds.push(doubleOpenTimer);
          } else {
            scheduleNextPeek();
          }
        }, 260);

        timeoutIds.push(closeTimer);
      }, delay);

      timeoutIds.push(mainTimer);
    };

    // First peek occurs soon after mount (1.1s) so the student sees the gag immediately
    const initialTimer = setTimeout(() => {
      if (!mounted) return;
      setEyeState('peek_right');
      const closeInitial = setTimeout(() => {
        if (!mounted) return;
        setEyeState('closed');
        scheduleNextPeek();
      }, 280);
      timeoutIds.push(closeInitial);
    }, 1100);
    timeoutIds.push(initialTimer);

    return () => {
      mounted = false;
      timeoutIds.forEach(clearTimeout);
    };
  }, []);

  const isLeftOpen = eyeState === 'peek_left';
  const isRightOpen = eyeState === 'peek_right';
  const isPeeking = eyeState !== 'closed';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-gradient-to-br from-[#060814] via-[#0d1025] to-[#05060d] relative overflow-hidden select-none">
      {/* Ambient Zen Aura Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/12 via-purple-600/10 to-transparent pointer-events-none" />

      {/* Concentric Telepathic Brainwaves radiating while he fabricates the scene */}
      <div className="relative flex flex-col items-center justify-center z-10">
        <div
          className={`relative flex items-center justify-center ${
            compact ? 'w-44 h-40' : 'w-56 h-52 sm:w-64 sm:h-56'
          }`}
        >
          {/* Floating Zen SVG Robot */}
          <svg
            viewBox="0 0 220 210"
            className="w-full h-full overflow-visible"
            aria-label="Guionbajo meditando"
          >
            <defs>
              <filter id="zenCyanGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="zenGoldGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="zenChassis" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="55%" stopColor="#1f2937" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              <linearGradient id="zenMetalLimb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              <radialGradient id="zenBulb" cx="0.35" cy="0.35" r="0.65">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
                <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="75%" stopColor="#00d4ff" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#090d14" stopOpacity="0.9" />
              </radialGradient>

              <radialGradient id="zenLotusHalo" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.28" />
                <stop offset="55%" stopColor="#00d4ff" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ── 1. HOLOGRAPHIC ZEN LOTUS MANDALA ON THE FLOOR ── */}
            <g transform="translate(110, 184)">
              {/* Soft floor shadow */}
              <ellipse cx="0" cy="4" rx="64" ry="12" fill="#020617" opacity="0.85" />

              {/* Outer Lotus Ring */}
              <motion.ellipse
                cx="0"
                cy="0"
                rx="68"
                ry="14"
                fill="none"
                stroke="#00D4FF"
                strokeWidth="1.6"
                strokeDasharray="10 6"
                opacity="0.65"
                filter="url(#zenCyanGlow)"
                animate={{
                  rx: [66, 72, 66],
                  opacity: [0.45, 0.85, 0.45],
                }}
                transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
              />

              {/* Middle Golden Zen Ring */}
              <motion.ellipse
                cx="0"
                cy="0"
                rx="48"
                ry="10"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                opacity="0.7"
                filter="url(#zenGoldGlow)"
                animate={{
                  rx: [46, 52, 46],
                  opacity: [0.5, 0.9, 0.5],
                }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              />

              {/* Inner Cyan Core Ring */}
              <ellipse
                cx="0"
                cy="0"
                rx="26"
                ry="5.5"
                fill="rgba(0, 212, 255, 0.15)"
                stroke="#00D4FF"
                strokeWidth="1.4"
              />
            </g>

            {/* ── 2. FLOATING ENLIGHTENMENT PARTICLES ── */}
            {[
              { cx: 42, cy: 145, r: 2.2, col: '#fbbf24', dur: 2.6, delay: 0 },
              { cx: 178, cy: 140, r: 2.5, col: '#00D4FF', dur: 2.9, delay: 0.5 },
              { cx: 52, cy: 85, r: 2, col: '#00D4FF', dur: 2.3, delay: 0.9 },
              { cx: 168, cy: 82, r: 2.2, col: '#fbbf24', dur: 2.7, delay: 0.3 },
            ].map((p, i) => (
              <motion.circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill={p.col}
                filter="url(#zenCyanGlow)"
                animate={{
                  y: [0, -18, 0],
                  opacity: [0.25, 0.95, 0.25],
                  scale: [0.8, 1.25, 0.8],
                }}
                transition={{
                  repeat: Infinity,
                  duration: p.dur,
                  delay: p.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}

            {/* ── 3. LEVITATING GUIONBAJO IN BUDDHIST LOTUS MEDITATION POSE ── */}
            <motion.g
              animate={{
                y: [0, -9, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.0,
                ease: 'easeInOut',
              }}
            >
              {/* Sacred Buddhist Halo behind Guionbajo's Head & Torso */}
              <motion.circle
                cx="110"
                cy="92"
                r="74"
                fill="url(#zenLotusHalo)"
                animate={{
                  r: [70, 80, 70],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ repeat: Infinity, duration: 3.0, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="110"
                cy="86"
                r="48"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.2"
                strokeDasharray="6 6"
                opacity="0.45"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
                style={{ transformOrigin: '110px 86px' }}
              />

              {/* ── CROSSED LOTUS MECHANICAL LEGS / STABILIZERS (Padmasana Base) ── */}
              <g>
                {/* Left folded leg */}
                <path
                  d="M 92 152 Q 62 154 64 166 Q 66 174 106 168"
                  fill="none"
                  stroke="url(#zenMetalLimb)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Right folded leg crossed over left */}
                <path
                  d="M 128 152 Q 158 154 156 166 Q 154 174 114 168"
                  fill="none"
                  stroke="url(#zenMetalLimb)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Knee spherical joints */}
                <circle cx="63" cy="162" r="5" fill="#1e293b" stroke="#00D4FF" strokeWidth="1.5" />
                <circle cx="157" cy="162" r="5" fill="#1e293b" stroke="#00D4FF" strokeWidth="1.5" />
                {/* Lotus foot pads tucked in center */}
                <rect x="96" y="164" width="12" height="6" rx="3" fill="#334155" stroke="#00D4FF" strokeWidth="1.2" />
                <rect x="112" y="164" width="12" height="6" rx="3" fill="#334155" stroke="#00D4FF" strokeWidth="1.2" />

                {/* Bottom Hover Thruster Nozzle & Soft Zen Flame */}
                <rect x="98" y="150" width="24" height="6" rx="2" fill="url(#zenMetalLimb)" stroke="#334155" strokeWidth="1" />
                <motion.ellipse
                  cx="110"
                  cy="175"
                  rx="10"
                  ry="5"
                  fill="#00D4FF"
                  opacity="0.65"
                  filter="url(#zenCyanGlow)"
                  animate={{ rx: [8, 13, 8], opacity: [0.4, 0.85, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                />
              </g>

              {/* ── ROBOT TORSO & CRT MONITOR ── */}
              <rect
                x="84"
                y="114"
                width="52"
                height="36"
                rx="11"
                fill="url(#zenChassis)"
                stroke="#4b5563"
                strokeWidth="2"
              />
              {/* Torso CRT Screen */}
              <rect
                x="91"
                y="119"
                width="38"
                height="25"
                rx="5"
                fill="#020617"
                stroke="#334155"
                strokeWidth="1.4"
              />
              {/* CRT Scanlines */}
              <line x1="93" y1="124" x2="127" y2="124" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
              <line x1="93" y1="129" x2="127" y2="129" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
              <line x1="93" y1="134" x2="127" y2="134" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
              <line x1="93" y1="139" x2="127" y2="139" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
              {/* CRT Text: OM_ */}
              <text
                x="110"
                y="135"
                textAnchor="middle"
                fill="#fbbf24"
                fontFamily="monospace"
                fontSize="10.5"
                fontWeight="900"
                filter="url(#zenGoldGlow)"
              >
                OM_
              </text>

              {/* ── MEDITATION ARMS IN BUDDHIST GYAN MUDRA (Resting on knees, pincers forming 'O') ── */}
              {/* Left Arm */}
              <g>
                {/* Shoulder & Elbow */}
                <path
                  d="M 84 122 Q 62 128 54 146"
                  fill="none"
                  stroke="url(#zenMetalLimb)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="56" cy="143" r="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
                {/* Wrist resting above left knee */}
                <path
                  d="M 54 146 Q 48 152 44 150"
                  fill="none"
                  stroke="url(#zenMetalLimb)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {/* Left Hand Mudra Circle (Thumb & Index pincer touching in 'O') */}
                <circle
                  cx="40"
                  cy="147"
                  r="5.5"
                  fill="rgba(0, 212, 255, 0.18)"
                  stroke="#00D4FF"
                  strokeWidth="2.2"
                  filter="url(#zenCyanGlow)"
                />
                {/* Floating energy orb above left Mudra hand */}
                <motion.circle
                  cx="40"
                  cy="135"
                  r="3"
                  fill="#fbbf24"
                  filter="url(#zenGoldGlow)"
                  animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                />
              </g>

              {/* Right Arm */}
              <g>
                <path
                  d="M 136 122 Q 158 128 166 146"
                  fill="none"
                  stroke="url(#zenMetalLimb)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="164" cy="143" r="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
                <path
                  d="M 166 146 Q 172 152 176 150"
                  fill="none"
                  stroke="url(#zenMetalLimb)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {/* Right Hand Mudra Circle ('O') */}
                <circle
                  cx="180"
                  cy="147"
                  r="5.5"
                  fill="rgba(0, 212, 255, 0.18)"
                  stroke="#00D4FF"
                  strokeWidth="2.2"
                  filter="url(#zenCyanGlow)"
                />
                {/* Floating energy orb above right Mudra hand */}
                <motion.circle
                  cx="180"
                  cy="135"
                  r="3"
                  fill="#fbbf24"
                  filter="url(#zenGoldGlow)"
                  animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.8, delay: 0.9, ease: 'easeInOut' }}
                />
              </g>

              {/* Mechanical Neck */}
              <rect x="105" y="108" width="10" height="7" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />

              {/* ── LATERAL EAR DIALS ── */}
              <rect x="69" y="73" width="7" height="20" rx="2.5" fill="url(#zenMetalLimb)" stroke="#475569" strokeWidth="1" />
              <rect x="70" y="82" width="4" height="2" rx="1" fill="#00D4FF" filter="url(#zenCyanGlow)" />
              <rect x="144" y="73" width="7" height="20" rx="2.5" fill="url(#zenMetalLimb)" stroke="#475569" strokeWidth="1" />
              <rect x="146" y="82" width="4" height="2" rx="1" fill="#00D4FF" filter="url(#zenCyanGlow)" />

              {/* ── ROBOT HEAD ── */}
              <g>
                <rect
                  x="76"
                  y="56"
                  width="68"
                  height="54"
                  rx="14"
                  fill="url(#zenChassis)"
                  stroke={isPeeking ? '#00D4FF' : '#fbbf24'}
                  strokeWidth="2.2"
                />

                {/* 4 Corner Rivets */}
                <circle cx="83" cy="63" r="2" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                <circle cx="137" cy="63" r="2" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                <circle cx="83" cy="103" r="2" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                <circle cx="137" cy="103" r="2" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />

                {/* Peaceful Buddhist Third-Eye Bindu Dot on Forehead */}
                <motion.circle
                  cx="110"
                  cy="64"
                  r="2.4"
                  fill="#fbbf24"
                  filter="url(#zenGoldGlow)"
                  animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.2, 0.9] }}
                  transition={{ repeat: Infinity, duration: 2.0 }}
                />

                {/* ── LEFT EYE SOCKET (cx=96, cy=79) ── */}
                <circle cx="96" cy="79" r="10.5" fill="#090d14" stroke="#334155" strokeWidth="1.6" />
                {isLeftOpen ? (
                  /* RAPID PEEK: Eye wide open looking directly at the student! */
                  <g>
                    <circle cx="96" cy="79" r="5.5" fill="#00D4FF" filter="url(#zenCyanGlow)" />
                    <circle cx="94" cy="77" r="1.8" fill="#ffffff" />
                  </g>
                ) : (
                  /* MEDITATING: Serene closed eyelid arc */
                  <g>
                    <path
                      d="M 88 79 Q 96 86 104 79"
                      fill="none"
                      stroke="#00D4FF"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      filter="url(#zenCyanGlow)"
                    />
                  </g>
                )}

                {/* ── RIGHT EYE SOCKET (cx=124, cy=79) ── */}
                <circle cx="124" cy="79" r="10.5" fill="#090d14" stroke="#334155" strokeWidth="1.6" />
                {isRightOpen ? (
                  /* RAPID PEEK: Right eye wide open peeking at the student! */
                  <g>
                    <circle cx="124" cy="79" r="5.5" fill="#00D4FF" filter="url(#zenCyanGlow)" />
                    <circle cx="122" cy="77" r="1.8" fill="#ffffff" />
                  </g>
                ) : (
                  /* MEDITATING: Serene closed eyelid arc */
                  <g>
                    <path
                      d="M 116 79 Q 124 86 132 79"
                      fill="none"
                      stroke="#00D4FF"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      filter="url(#zenCyanGlow)"
                    />
                  </g>
                )}

                {/* ── ROBOT MOUTH (Recessed Frame with '_' Cursor) ── */}
                <rect
                  x="90"
                  y="95"
                  width="40"
                  height="9"
                  rx="3.5"
                  fill="#090d14"
                  stroke="#334155"
                  strokeWidth="1.2"
                />
                <text
                  x="110"
                  y="102.5"
                  textAnchor="middle"
                  fill="#00D4FF"
                  fontFamily="monospace"
                  fontSize="11.5"
                  fontWeight="900"
                  filter="url(#zenCyanGlow)"
                >
                  _
                </text>

                {/* ── TOP ANTENNA & VACUUM BULB WITH TELEPATHIC RIPPLES ── */}
                <rect x="108.5" y="40" width="3" height="16" rx="1.5" fill="url(#zenMetalLimb)" />
                {/* Expanding Mental Fabrication Ripples around Antenna Bulb */}
                <motion.circle
                  cx="110"
                  cy="32"
                  r="10"
                  fill="none"
                  stroke="#00D4FF"
                  strokeWidth="1.4"
                  animate={{ r: [9, 26], opacity: [0.85, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                />
                <motion.circle
                  cx="110"
                  cy="32"
                  r="10"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.2"
                  animate={{ r: [9, 26], opacity: [0.75, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, delay: 0.9, ease: 'easeOut' }}
                />
                <circle
                  cx="110"
                  cy="32"
                  r="8"
                  fill="url(#zenBulb)"
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth="1.3"
                />
                <path
                  d="M 107.5 34 C 107.5 28.5 112.5 28.5 112.5 34"
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="1.4"
                />
              </g>
            </motion.g>
          </svg>
        </div>

        {/* Text Banner Below Meditating Guionbajo */}
        <div className="max-w-md space-y-1.5 mt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Modo Zen • Creando Experiencia</span>
          </div>

          <h4 className="text-sm sm:text-base font-extrabold text-white tracking-wide font-outfit">
            {title}
          </h4>

          <p className="text-xs text-zinc-300/90 max-w-sm mx-auto leading-relaxed">
            {subtitle ? (
              subtitle
            ) : companionName ? (
              <>
                Guionbajo está concentrado preparando el escenario interactivo junto a{' '}
                <strong className="text-brand-cyan">{companionName}</strong>...
              </>
            ) : (
              'Guionbajo está concentrado preparando tu actividad interactiva...'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
