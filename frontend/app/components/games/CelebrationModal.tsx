'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from '@/lib/soundEffects';
import { Trophy, ArrowRight, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export interface CelebrationModalProps {
  isOpen: boolean;
  score?: number;
  topic?: string;
  sublevel?: string;
  xpEarned?: number;
  onClose?: () => void;
  onContinue?: () => void;
  autoPlaySound?: boolean;
}

type StageType = 'pulling' | 'snap' | 'fall' | 'landed' | 'look_score' | 'celebrate';

export default function CelebrationModal({
  isOpen,
  score = 100,
  topic = 'Past Continuous & Storytelling',
  sublevel = 'A1.2',
  xpEarned = 150,
  onClose,
  onContinue,
  autoPlaySound = true,
}: CelebrationModalProps) {
  const [stage, setStage] = useState<StageType>('pulling');
  const [soundEnabled, setSoundEnabled] = useState(autoPlaySound);
  const [replayKey, setReplayKey] = useState(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  const playSfx = (fn: () => void) => {
    if (soundEnabled) {
      try {
        fn();
      } catch (_) {}
    }
  };

  // 🎬 Sequencer Timeline
  const runSequence = () => {
    clearAllTimers();
    setStage('pulling');

    // 0.25s: Mechanical strain sound (heaving on the rope)
    timeoutRefs.current.push(
      setTimeout(() => {
        playSfx(() => sfx.playStrainRatchet());
      }, 250)
    );

    // 1.1s: Second strain ratchet
    timeoutRefs.current.push(
      setTimeout(() => {
        playSfx(() => sfx.playStrainRatchet());
      }, 1100)
    );

    // 1.9s: Sudden SNAP / Whoosh! The score breaks loose and slides in
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('snap');
        playSfx(() => sfx.playWhoosh());
      }, 1900)
    );

    // 2.25s: Guionbajo loses balance and falls backward directly to the ground
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('fall');
      }, 2250)
    );

    // 2.65s: THUD! Hits the floor seated ("pegado al piso") with squash & stretch
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('landed');
        playSfx(() => sfx.playCartoonThud());
      }, 2650)
    );

    // 3.3s: Turns head to the right to inspect the giant score card beside him
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('look_score');
      }, 3300)
    );

    // 4.0s: Turns head to the student, eyes morph to ^_^, smiles & confetti fanfare!
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('celebrate');
        playSfx(() => sfx.playVictoryFanfare());
      }, 4000)
    );
  };

  useEffect(() => {
    if (isOpen) {
      runSequence();
    } else {
      clearAllTimers();
    }
    return () => clearAllTimers();
  }, [isOpen, replayKey]);

  if (!isOpen) return null;

  const isPerfect = score >= 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-[#06070E]/90 backdrop-blur-xl overflow-y-auto">
        {/* Ambient Glows */}
        <div className="absolute w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none -top-10 -left-10" />
        <div className="absolute w-96 h-96 rounded-full bg-purple-600/15 blur-[140px] pointer-events-none -bottom-10 -right-10" />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-gradient-to-b from-[#0D0F1E] via-[#090A17] to-[#060710] border border-cyan-500/30 rounded-3xl shadow-[0_0_80px_rgba(0,212,255,0.18)] overflow-hidden flex flex-col"
        >
          {/* Top Control Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-cyan-400 font-bold tracking-wider ml-2">
                GUIONBAJO_CELEBRATION_PROTOCOL.EXE
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                  soundEnabled
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                    : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                }`}
                title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                <span className="hidden sm:inline text-[11px] font-mono">
                  {soundEnabled ? 'AUDIO ON' : 'AUDIO OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReplayKey((k) => k + 1)}
                className="p-2 px-3 rounded-xl text-xs font-medium border bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-cyan-400/40 transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
              >
                <RotateCcw size={14} className="text-cyan-400" />
                <span className="text-[11px] font-bold">Repetir 🔄</span>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              🎨 THE CINEMATIC SVG STAGE (800 x 440)
             ══════════════════════════════════════════════════════════════ */}
          <div className="relative w-full aspect-[16/9] max-h-[460px] bg-[#070814] select-none overflow-hidden">
            <svg
              viewBox="0 0 800 440"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Glow Filters */}
                <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Robot Gradients */}
                <linearGradient id="robotChassis" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="55%" stopColor="#1f2937" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                <linearGradient id="antennaStemGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                <radialGradient id="vacuumBulbGrad" cx="0.35" cy="0.35" r="0.65">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="35%" stopColor="#00d4ff" stopOpacity="0.85" />
                  <stop offset="75%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#090d14" stopOpacity="0.9" />
                </radialGradient>

                <linearGradient id="earDialGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="50%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Plasma Thruster */}
                <linearGradient id="plasmaFlameCore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="20%" stopColor="#00d4ff" stopOpacity="0.95" />
                  <stop offset="65%" stopColor="#6366f1" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="plasmaFlameOuter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="25%" stopColor="#fef08a" stopOpacity="0.9" />
                  <stop offset="55%" stopColor="#f97316" stopOpacity="0.85" />
                  <stop offset="85%" stopColor="#00d4ff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>

                {/* Rope Texture */}
                <linearGradient id="ropeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="50%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>

                {/* Monolith Gradient */}
                <linearGradient id="cardBgGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#13182b" />
                  <stop offset="50%" stopColor="#0a0e19" />
                  <stop offset="100%" stopColor="#05070e" />
                </linearGradient>
              </defs>

              {/* ── STAGE BACKGROUND & CYBER GRID FLOOR ── */}
              <rect width="800" height="440" fill="#070914" />
              {/* Background ambient radial glow */}
              <circle cx="560" cy="220" r="280" fill="#1e1b4b" opacity="0.35" />
              <circle cx="160" cy="360" r="180" fill="#083344" opacity="0.25" />

              {/* Floor Horizon Line & Grid at Y = 360 */}
              <line x1="0" y1="360" x2="800" y2="360" stroke="#1e293b" strokeWidth="2" />
              <line x1="0" y1="361" x2="800" y2="361" stroke="#00D4FF" strokeWidth="1" opacity="0.45" filter="url(#cyanGlow)" />

              {/* Floor Perspective Lines */}
              <line x1="120" y1="360" x2="60" y2="440" stroke="#0e1726" strokeWidth="1.5" />
              <line x1="280" y1="360" x2="250" y2="440" stroke="#0e1726" strokeWidth="1.5" />
              <line x1="440" y1="360" x2="440" y2="440" stroke="#0e1726" strokeWidth="1.5" />
              <line x1="600" y1="360" x2="630" y2="440" stroke="#0e1726" strokeWidth="1.5" />
              <line x1="740" y1="360" x2="790" y2="440" stroke="#0e1726" strokeWidth="1.5" />

              {/* ══════════════════════════════════════════════════════════
                  🪢 THE ROPE (Directly links Guionbajo hands to the Score Card)
                 ══════════════════════════════════════════════════════════ */}
              {stage === 'pulling' && (
                <g>
                  {/* Outer glow shadow */}
                  <motion.path
                    d="M 215 315 Q 310 300 860 220"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="7"
                    strokeLinecap="round"
                    opacity="0.3"
                    filter="url(#goldGlow)"
                    animate={{
                      d: [
                        'M 215 315 Q 310 300 860 220',
                        'M 215 317 Q 310 296 860 220',
                        'M 215 313 Q 310 304 860 220',
                      ],
                    }}
                    transition={{ repeat: Infinity, duration: 0.12 }}
                  />
                  {/* Twisted rope strand */}
                  <motion.path
                    d="M 215 315 Q 310 300 860 220"
                    fill="none"
                    stroke="url(#ropeGrad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="9 3"
                    animate={{
                      d: [
                        'M 215 315 Q 310 300 860 220',
                        'M 215 317 Q 310 296 860 220',
                        'M 215 313 Q 310 304 860 220',
                      ],
                    }}
                    transition={{ repeat: Infinity, duration: 0.12 }}
                  />
                </g>
              )}

              {(stage === 'snap' || stage === 'fall' || stage === 'landed' || stage === 'look_score' || stage === 'celebrate') && (
                <motion.g
                  initial={{ opacity: 1 }}
                  animate={{ opacity: stage === 'celebrate' ? 0.3 : 0.65 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Loose rope lying slack on the floor */}
                  <path
                    d="M 195 358 C 230 370, 270 355, 310 360 C 340 364, 360 357, 378 359"
                    fill="none"
                    stroke="url(#ropeGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="8 3"
                  />
                </motion.g>
              )}

              {/* ══════════════════════════════════════════════════════════
                  🏆 THE SCORE MONOLITH (Rushed in to X=380, BESIDE Guionbajo)
                 ══════════════════════════════════════════════════════════ */}
              <motion.g
                initial={{ x: 880, y: 105 }}
                animate={
                  stage === 'pulling'
                    ? { x: 860, y: 105 }
                    : {
                        x: 375, // Positioned on right half (375 to 725), completely beside Guionbajo
                        y: 105,
                        transition: {
                          type: 'spring',
                          stiffness: 160,
                          damping: 17,
                          mass: 1.1,
                        },
                      }
                }
              >
                {/* Monolith ground shadow */}
                <ellipse cx="170" cy="254" rx="155" ry="14" fill="#030712" opacity="0.8" />

                {/* Monolith Card Body (Width 350 x Height 245) */}
                <rect
                  x="0"
                  y="0"
                  width="350"
                  height="245"
                  rx="24"
                  fill="url(#cardBgGrad)"
                  stroke={isPerfect ? '#F59E0B' : '#00D4FF'}
                  strokeWidth="2.5"
                  filter={isPerfect ? 'url(#goldGlow)' : 'url(#cyanGlow)'}
                />

                {/* Inner Tech Frame */}
                <rect
                  x="10"
                  y="10"
                  width="330"
                  height="225"
                  rx="18"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                />

                {/* Heavy Eyelet Ring on Left Edge (Where the rope pulled!) */}
                <circle cx="10" cy="122" r="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                <circle cx="10" cy="122" r="3.5" fill="#00D4FF" />
                <path d="M 0 122 L -18 130" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />

                {/* Top Badge Banner */}
                <rect
                  x="35"
                  y="22"
                  width="280"
                  height="30"
                  rx="9"
                  fill={isPerfect ? 'rgba(234, 179, 8, 0.15)' : 'rgba(0, 212, 255, 0.15)'}
                  stroke={isPerfect ? '#fde047' : '#00D4FF'}
                  strokeWidth="1"
                />
                <text
                  x="175"
                  y="42"
                  textAnchor="middle"
                  fill={isPerfect ? '#fef08a' : '#67e8f9'}
                  fontFamily="monospace"
                  fontSize="12.5"
                  fontWeight="bold"
                  letterSpacing="1"
                >
                  {isPerfect ? '★ 100% PERFECT SCORE ★' : '★ EXCELENTE RENDIMIENTO ★'}
                </text>

                {/* Giant Percentage */}
                <text
                  x="175"
                  y="124"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontFamily="system-ui, sans-serif"
                  fontSize="64"
                  fontWeight="900"
                  letterSpacing="-1"
                >
                  {score}
                  <tspan fontSize="40" fill={isPerfect ? '#facc15' : '#00D4FF'}>
                    %
                  </tspan>
                </text>

                {/* Subtitle / Topic Pill */}
                <rect
                  x="30"
                  y="146"
                  width="290"
                  height="24"
                  rx="7"
                  fill="#0e1322"
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x="175"
                  y="162"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11.5"
                  fontWeight="600"
                >
                  {sublevel} • 3/3 Retos Superados
                </text>

                {/* Bottom Rewards Row */}
                <g transform="translate(35, 186)">
                  {/* XP Badge */}
                  <rect x="0" y="0" width="132" height="34" rx="10" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="1" />
                  <text x="66" y="22" textAnchor="middle" fill="#6ee7b7" fontSize="13" fontWeight="bold">
                    +{xpEarned} XP
                  </text>

                  {/* Status Badge */}
                  <rect x="148" y="0" width="132" height="34" rx="10" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1" />
                  <text x="214" y="22" textAnchor="middle" fill="#fde047" fontSize="12" fontWeight="bold">
                    ✓ Graduado
                  </text>
                </g>

                {/* Corner Tech Rivets */}
                <circle cx="18" cy="18" r="3" fill="#64748b" />
                <circle cx="332" cy="18" r="3" fill="#64748b" />
                <circle cx="18" cy="227" r="3" fill="#64748b" />
                <circle cx="332" cy="227" r="3" fill="#64748b" />
              </motion.g>


              {/* ══════════════════════════════════════════════════════════
                  🤖 GUIONBAJO (Normalized (0,0) Rig, Seated Firmly on Floor)
                  - Positioned on LEFT side (x ≈ 155), beside the card
                  - In landed/celebrate stage: sits directly on floor (y = 317)
                 ══════════════════════════════════════════════════════════ */}
              <motion.g
                // Kinematics: pulling -> snap -> fall to ground -> seated flat on floor
                animate={
                  stage === 'pulling'
                    ? {
                        x: [170, 164, 170],
                        y: 304,
                        rotate: [-18, -21, -18],
                        scaleY: 1,
                        scaleX: 1,
                      }
                    : stage === 'snap'
                    ? {
                        x: 156,
                        y: 300,
                        rotate: -26,
                        scaleY: 1.05,
                        scaleX: 0.95,
                      }
                    : stage === 'fall'
                    ? {
                        // Slips and tilts backwards directly towards the floor (no flying launch)
                        x: 146,
                        y: 312,
                        rotate: 16,
                        scaleY: 0.95,
                        scaleX: 1.05,
                      }
                    : stage === 'landed'
                    ? {
                        // Impact flat on the floor plane ("pegado al piso") at y = 317
                        x: 148,
                        y: 317,
                        rotate: 0,
                        scaleY: [1, 0.78, 1.06, 1],
                        scaleX: [1, 1.22, 0.96, 1],
                        transition: { duration: 0.45, ease: 'easeOut' },
                      }
                    : stage === 'look_score'
                    ? {
                        x: 148,
                        y: 317,
                        rotate: 0,
                        scaleY: 1,
                        scaleX: 1,
                      }
                    : {
                        // CELEBRATING: Resting seated on floor, breathing softly
                        x: 148,
                        y: [317, 314, 317],
                        rotate: 0,
                        scaleY: 1,
                        scaleX: 1,
                        transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
                      }
                }
                transition={
                  stage === 'pulling'
                    ? { repeat: Infinity, duration: 0.5, ease: 'easeInOut' }
                    : { duration: 0.28 }
                }
                style={{ transformOrigin: '0px 43px' }}
              >
                {/* ── Ground Shadow directly under chassis ── */}
                <ellipse
                  cx="0"
                  cy="43"
                  rx={stage === 'pulling' ? 28 : 34}
                  ry={stage === 'pulling' ? 6 : 8}
                  fill="#030712"
                  opacity="0.75"
                />

                {/* ── Impact Dust Puff Circles (Appears on landing) ── */}
                {(stage === 'landed' || stage === 'look_score') && (
                  <motion.g
                    initial={{ opacity: 0.85, scale: 0.3 }}
                    animate={{ opacity: 0, scale: 1.7 }}
                    transition={{ duration: 0.55 }}
                    style={{ transformOrigin: '0px 43px' }}
                  >
                    <circle cx="-25" cy="42" r="10" fill="#94a3b8" opacity="0.35" />
                    <circle cx="25" cy="42" r="12" fill="#94a3b8" opacity="0.35" />
                    <circle cx="0" cy="43" r="8" fill="#cbd5e1" opacity="0.45" />
                  </motion.g>
                )}

                {/* ── PLASMA HOVER THRUSTER (Firing only during pull) ── */}
                {stage === 'pulling' && (
                  <g>
                    {/* Flame plume shooting forward/downward */}
                    <path
                      d="M -11 43 Q 0 85 0 92 Q 0 85 11 43 Z"
                      fill="url(#plasmaFlameOuter)"
                      opacity="0.85"
                      filter="url(#cyanGlow)"
                    />
                    <path
                      d="M -6 43 Q 0 74 0 78 Q 0 74 6 43 Z"
                      fill="url(#plasmaFlameCore)"
                      opacity="0.95"
                    />
                    {/* Sparks */}
                    <motion.circle
                      cx="0"
                      cy="78"
                      r="2"
                      fill="#fef08a"
                      animate={{ cx: [0, 20], cy: [78, 85], opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.2 }}
                    />
                  </g>
                )}

                {/* Thruster Nozzle (Rests firmly on ground in seated pose) */}
                <rect x="-11" y="37" width="22" height="6" rx="2" fill="url(#antennaStemGrad)" stroke="#334155" strokeWidth="1" />
                <rect x="-8" y="41" width="16" height="2" rx="1" fill="#00D4FF" opacity={stage === 'pulling' ? 0.9 : 0.3} />

                {/* ── MECHANICAL ARMS ── */}
                {stage === 'pulling' ? (
                  /* Grasping the rope forward */
                  <g>
                    <path d="M -20 8 Q 10 12 45 15" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="45" cy="15" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                    <path d="M 12 8 Q 35 12 65 15" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="65" cy="15" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                  </g>
                ) : stage === 'snap' || stage === 'fall' ? (
                  /* Arms thrown open in surprise */
                  <g>
                    <path d="M -24 8 Q -45 -10 -55 -20" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="-55" cy="-20" r="4.5" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                    <path d="M 24 8 Q 45 -10 55 -20" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="55" cy="-20" r="4.5" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                  </g>
                ) : stage === 'celebrate' ? (
                  /* Left arm resting on floor, Right arm waving happily */
                  <g>
                    {/* Left arm resting on floor */}
                    <path d="M -24 8 Q -38 22 -32 40" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="-32" cy="40" r="4.5" fill="#334155" />
                    {/* Right arm waving high to the student! */}
                    <motion.g
                      animate={{ rotate: [-8, 14, -8] }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
                      style={{ transformOrigin: '24px 8px' }}
                    >
                      <path d="M 24 8 Q 42 -12 50 -32" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                      <circle cx="50" cy="-32" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                      <path d="M 46 -37 Q 50 -44 57 -37" fill="none" stroke="#00D4FF" strokeWidth="2" />
                    </motion.g>
                  </g>
                ) : (
                  /* Seated on floor: resting both hands beside base on floor */
                  <g>
                    <path d="M -24 8 Q -38 24 -32 41" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="-32" cy="41" r="4" fill="#334155" />
                    <path d="M 24 8 Q 38 24 32 41" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="32" cy="41" r="4" fill="#334155" />
                  </g>
                )}

                {/* ── ROBOT TORSO ── */}
                <rect x="-24" y="3" width="48" height="34" rx="10" fill="url(#robotChassis)" stroke="#4b5563" strokeWidth="1.8" />
                {/* Torso CRT Screen */}
                <rect x="-18" y="8" width="36" height="23" rx="5" fill="#020617" stroke="#334155" strokeWidth="1.2" />
                {/* Horizontal Scanlines */}
                <line x1="-16" y1="12" x2="16" y2="12" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <line x1="-16" y1="17" x2="16" y2="17" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <line x1="-16" y1="22" x2="16" y2="22" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <line x1="-16" y1="27" x2="16" y2="27" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />

                {/* Torso Underscore Insignia */}
                <text x="0" y="24" textAnchor="middle" fill="#00D4FF" fontFamily="monospace" fontSize="10" fontWeight="900" filter="url(#cyanGlow)">
                  _
                </text>

                {/* Mechanical Neck */}
                <rect x="-5" y="-3" width="10" height="7" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />

                {/* ── LATERAL EAR DIALS ── */}
                <rect x="-37" y="-34" width="7" height="18" rx="2" fill="url(#earDialGrad)" stroke="#475569" strokeWidth="0.8" />
                <rect x="-36" y="-26" width="3.5" height="2" rx="1" fill="#00D4FF" filter="url(#cyanGlow)" />
                <rect x="30" y="-34" width="7" height="18" rx="2" fill="url(#earDialGrad)" stroke="#475569" strokeWidth="0.8" />
                <rect x="32.5" y="-26" width="3.5" height="2" rx="1" fill="#00D4FF" filter="url(#cyanGlow)" />

                {/* ── ROBOT HEAD ── */}
                <g
                  // Turns to look at the Score Card on the right (18deg) vs facing front (0deg)
                  style={{
                    transform: stage === 'look_score' ? 'rotate(18deg)' : 'rotate(0deg)',
                    transformOrigin: '0px -25px',
                    transition: 'transform 0.4s ease',
                  }}
                >
                  <rect x="-30" y="-50" width="60" height="48" rx="12" fill="url(#robotChassis)" stroke="#4b5563" strokeWidth="2" />

                  {/* 4 Corner Rivets */}
                  <circle cx="-24" cy="-44" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                  <circle cx="24" cy="-44" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                  <circle cx="-24" cy="-8" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                  <circle cx="24" cy="-8" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />

                  {/* ── ROBOT EYES ── */}
                  {stage === 'pulling' ? (
                    /* Straining concentrated eyes (> <) */
                    <g>
                      <path d="M -17 -36 L -9 -31 L -17 -26" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#cyanGlow)" />
                      <path d="M 17 -36 L 9 -31 L 17 -26" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#cyanGlow)" />
                    </g>
                  ) : stage === 'snap' || stage === 'fall' ? (
                    /* Shocked wide open eyes (O O) */
                    <g>
                      <circle cx="-12" cy="-31" r="8" fill="#090d14" stroke="#00D4FF" strokeWidth="2" filter="url(#cyanGlow)" />
                      <circle cx="-12" cy="-31" r="3.5" fill="#ffffff" />
                      <circle cx="12" cy="-31" r="8" fill="#090d14" stroke="#00D4FF" strokeWidth="2" filter="url(#cyanGlow)" />
                      <circle cx="12" cy="-31" r="3.5" fill="#ffffff" />
                    </g>
                  ) : stage === 'look_score' ? (
                    /* Looking to the right at the Score Card */
                    <g>
                      <circle cx="-12" cy="-31" r="8" fill="#090d14" stroke="#334155" strokeWidth="1.5" />
                      <circle cx="-8" cy="-31" r="4.5" fill="#00D4FF" filter="url(#cyanGlow)" />
                      <circle cx="12" cy="-31" r="8" fill="#090d14" stroke="#334155" strokeWidth="1.5" />
                      <circle cx="16" cy="-31" r="4.5" fill="#00D4FF" filter="url(#cyanGlow)" />
                    </g>
                  ) : (
                    /* CELEBRATING: Smiling glowing arc eyes (^ ^) looking at the student */
                    <g>
                      <path d="M -18 -29 Q -12 -39 -6 -29" fill="none" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" filter="url(#cyanGlow)" />
                      <path d="M 6 -29 Q 12 -39 18 -29" fill="none" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" filter="url(#cyanGlow)" />
                    </g>
                  )}

                  {/* ── ROBOT MOUTH ── */}
                  <rect x="-18" y="-16" width="36" height="8" rx="3" fill="#090d14" stroke="#334155" strokeWidth="1.2" />

                  {stage === 'pulling' ? (
                    /* Tight terminal cursor */
                    <text x="0" y="-9" textAnchor="middle" fill="#00D4FF" fontFamily="monospace" fontSize="11" fontWeight="900" filter="url(#cyanGlow)">
                      _
                    </text>
                  ) : stage === 'snap' || stage === 'fall' ? (
                    /* Surprise O */
                    <circle cx="0" cy="-12" r="2.5" fill="#00D4FF" filter="url(#cyanGlow)" />
                  ) : stage === 'celebrate' ? (
                    /* BIG BEAMING SMILE (‿) */
                    <path
                      d="M -9 -13 Q 0 -8 9 -13"
                      fill="none"
                      stroke="#00D4FF"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      filter="url(#cyanGlow)"
                    />
                  ) : (
                    /* Normal underscore */
                    <text x="0" y="-9" textAnchor="middle" fill="#00D4FF" fontFamily="monospace" fontSize="11" fontWeight="900" filter="url(#cyanGlow)">
                      _
                    </text>
                  )}

                  {/* ── TOP ANTENNA & VACUUM BULB ── */}
                  <rect x="-1.5" y="-66" width="3" height="16" rx="1.5" fill="url(#antennaStemGrad)" />
                  <circle cx="0" cy="-73" r="7.5" fill="url(#vacuumBulbGrad)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" />

                  {/* Glowing Bulb Bloom */}
                  <circle
                    cx="0"
                    cy="-73"
                    r={stage === 'celebrate' ? 14 : 9}
                    fill={stage === 'celebrate' ? '#fde047' : '#00D4FF'}
                    opacity={stage === 'celebrate' ? 0.6 : 0.4}
                    filter="url(#cyanGlow)"
                  />
                  {/* Filament */}
                  <path d="M -2 -71 C -2 -76 2 -76 2 -71" fill="none" stroke={stage === 'celebrate' ? '#fef08a' : '#00D4FF'} strokeWidth="1.2" />
                </g>
              </motion.g>

              {/* ══════════════════════════════════════════════════════════
                  🎉 CONFETTI SHOWER (Erupts during celebration stage)
                 ══════════════════════════════════════════════════════════ */}
              {stage === 'celebrate' && (
                <g>
                  {[
                    { cx: 520, cy: 70, color: '#f59e0b', r: 4.5, dx: -40, dy: 200 },
                    { cx: 560, cy: 60, color: '#00D4FF', r: 5, dx: 40, dy: 220 },
                    { cx: 480, cy: 90, color: '#ec4899', r: 4.5, dx: -70, dy: 180 },
                    { cx: 620, cy: 80, color: '#10b981', r: 4, dx: 70, dy: 210 },
                    { cx: 540, cy: 50, color: '#a855f7', r: 5, dx: 15, dy: 240 },
                    { cx: 660, cy: 90, color: '#fbbf24', r: 4.5, dx: 60, dy: 190 },
                    { cx: 420, cy: 110, color: '#38bdf8', r: 4, dx: -80, dy: 170 },
                    { cx: 700, cy: 100, color: '#f43f5e', r: 5, dx: 60, dy: 180 },
                    { cx: 500, cy: 40, color: '#fde047', r: 4, dx: -35, dy: 250 },
                    { cx: 580, cy: 45, color: '#34d399', r: 4.5, dx: 45, dy: 245 },
                    { cx: 160, cy: 190, color: '#00D4FF', r: 4.5, dx: -30, dy: 130 },
                    { cx: 180, cy: 180, color: '#f59e0b', r: 4, dx: 30, dy: 140 },
                    { cx: 140, cy: 210, color: '#ec4899', r: 4, dx: -20, dy: 110 },
                  ].map((p, idx) => (
                    <motion.circle
                      key={idx}
                      cx={p.cx}
                      cy={p.cy}
                      r={p.r}
                      fill={p.color}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0, 1.2, 1, 0.8],
                        cx: p.cx + p.dx,
                        cy: p.cy + p.dy,
                      }}
                      transition={{
                        duration: 2.2,
                        delay: idx * 0.05,
                        repeat: Infinity,
                        repeatDelay: 0.8,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </g>
              )}
            </svg>

            {/* Stage narrative status pill */}
            <div className="absolute top-4 left-4 pointer-events-none">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-black/60 border border-white/10 text-zinc-300 backdrop-blur-md">
                {stage === 'pulling' && '⏳ Guionbajo arrastrando tu resultado...'}
                {stage === 'snap' && '⚡ ¡TIRÓN MÁXIMO!'}
                {stage === 'fall' && '💨 ¡Woooah!'}
                {stage === 'landed' && '💥 ¡Plop! Cae sentado en el piso'}
                {stage === 'look_score' && '👀 ¡Mira el puntaje que trajiste!'}
                {stage === 'celebrate' && '🎉 ¡MISIÓN CUMPLIDA!'}
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              🚀 BOTTOM ACTION BAR & DASHBOARD TRANSITION
             ══════════════════════════════════════════════════════════════ */}
          <div className="p-5 sm:p-6 bg-gradient-to-t from-black via-[#080a14] to-transparent border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2">
                <Trophy className="text-yellow-400" size={20} />
                <span>¡Excelente trabajo, lección aprobada!</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Tema: <strong className="text-zinc-200">{topic}</strong> • Nivel {sublevel}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 sm:w-auto px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Cerrar
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onContinue) {
                    onContinue();
                  } else if (onClose) {
                    onClose();
                  }
                }}
                className="w-full sm:w-auto px-7 py-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black shadow-[0_0_30px_rgba(52,211,153,0.35)] hover:shadow-[0_0_40px_rgba(52,211,153,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <span>Avanzar en el Mapa de Aprendizaje 🚀</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
