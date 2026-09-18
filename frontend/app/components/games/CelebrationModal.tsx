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

    // 0.25s: Mechanical strain sound
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

    // 1.9s: Sudden SNAP / Whoosh!
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('snap');
        playSfx(() => sfx.playWhoosh());
      }, 1900)
    );

    // 2.3s: Guionbajo recoils & falls backward
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('fall');
      }, 2300)
    );

    // 2.85s: THUD / Lands seated on floor with squash & stretch
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('landed');
        playSfx(() => sfx.playCartoonThud());
      }, 2850)
    );

    // 3.4s: Turns head to inspect the heavy score card he dragged in
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('look_score');
      }, 3400)
    );

    // 4.15s: Turns head directly to student, eyes morph to ^_^, smiles & confetti fanfare!
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('celebrate');
        playSfx(() => sfx.playVictoryFanfare());
      }, 4150)
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

  // Visual score badge colors
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
                {/* Filters */}
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

                <linearGradient id="goldBadgeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="40%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ca8a04" />
                </linearGradient>
              </defs>

              {/* ── STAGE BACKGROUND & CYBER GRID FLOOR ── */}
              <rect width="800" height="440" fill="#070914" />
              {/* Background ambient radial glow */}
              <circle cx="480" cy="220" r="260" fill="#1e1b4b" opacity="0.3" />
              <circle cx="200" cy="360" r="160" fill="#083344" opacity="0.25" />

              {/* Floor Horizon Line & Grid at Y = 360 */}
              <line x1="0" y1="360" x2="800" y2="360" stroke="#1e293b" strokeWidth="2" />
              <line x1="0" y1="361" x2="800" y2="361" stroke="#00D4FF" strokeWidth="1" opacity="0.4" filter="url(#cyanGlow)" />

              {/* Floor Perspective Lines */}
              <line x1="120" y1="360" x2="60" y2="440" stroke="#0e1726" strokeWidth="1.5" />
              <line x1="280" y1="360" x2="250" y2="440" stroke="#0e1726" strokeWidth="1.5" />
              <line x1="440" y1="360" x2="440" y2="440" stroke="#0e1726" strokeWidth="1.5" />
              <line x1="600" y1="360" x2="630" y2="440" stroke="#0e1726" strokeWidth="1.5" />
              <line x1="740" y1="360" x2="790" y2="440" stroke="#0e1726" strokeWidth="1.5" />

              {/* ══════════════════════════════════════════════════════════
                  🪢 THE ROPE (Taut when pulling, snapped/loose when released)
                 ══════════════════════════════════════════════════════════ */}
              {stage === 'pulling' && (
                <g>
                  {/* Outer glow shadow */}
                  <motion.path
                    d="M 270 292 Q 480 290 850 255"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="7"
                    strokeLinecap="round"
                    opacity="0.3"
                    filter="url(#goldGlow)"
                    animate={{
                      d: [
                        'M 270 292 Q 480 290 850 255',
                        'M 270 294 Q 480 286 850 255',
                        'M 270 290 Q 480 292 850 255',
                      ],
                    }}
                    transition={{ repeat: Infinity, duration: 0.12 }}
                  />
                  {/* Twisted rope strand */}
                  <motion.path
                    d="M 270 292 Q 480 290 850 255"
                    fill="none"
                    stroke="url(#ropeGrad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="9 3"
                    animate={{
                      d: [
                        'M 270 292 Q 480 290 850 255',
                        'M 270 294 Q 480 286 850 255',
                        'M 270 290 Q 480 292 850 255',
                      ],
                    }}
                    transition={{ repeat: Infinity, duration: 0.12 }}
                  />
                </g>
              )}

              {(stage === 'snap' || stage === 'fall' || stage === 'landed' || stage === 'look_score' || stage === 'celebrate') && (
                <motion.g
                  initial={{ opacity: 1 }}
                  animate={{ opacity: stage === 'celebrate' ? 0.2 : 0.6 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Loose rope lying on the floor */}
                  <path
                    d="M 210 358 C 240 370, 270 355, 310 360 C 350 365, 370 356, 400 359"
                    fill="none"
                    stroke="url(#ropeGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="8 3"
                  />
                </motion.g>
              )}

              {/* ══════════════════════════════════════════════════════════
                  🏆 THE SCORE MONOLITH (Rushed in from off-screen right)
                 ══════════════════════════════════════════════════════════ */}
              <motion.g
                initial={{ x: 880, y: 130 }}
                animate={
                  stage === 'pulling'
                    ? { x: 860, y: 130 }
                    : {
                        x: 430,
                        y: 130,
                        transition: {
                          type: 'spring',
                          stiffness: 170,
                          damping: 17,
                          mass: 1.1,
                        },
                      }
                }
              >
                {/* Monolith ground shadow */}
                <ellipse cx="140" cy="235" rx="130" ry="12" fill="#030712" opacity="0.75" />

                {/* Monolith Card Body */}
                <rect
                  x="0"
                  y="0"
                  width="290"
                  height="225"
                  rx="22"
                  fill="url(#cardBgGrad)"
                  stroke={isPerfect ? '#F59E0B' : '#00D4FF'}
                  strokeWidth="2.5"
                  filter={isPerfect ? 'url(#goldGlow)' : 'url(#cyanGlow)'}
                />

                {/* Inner Tech Frame */}
                <rect
                  x="8"
                  y="8"
                  width="274"
                  height="209"
                  rx="16"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                />

                {/* Heavy Eyelet Rings on Left Edge (Where the rope was tied!) */}
                <circle cx="8" cy="112" r="7" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                <circle cx="8" cy="112" r="3" fill="#00D4FF" />
                <path d="M 0 112 L -20 120" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />

                {/* Top Badge Banner */}
                <rect
                  x="30"
                  y="20"
                  width="230"
                  height="28"
                  rx="8"
                  fill={isPerfect ? 'rgba(234, 179, 8, 0.15)' : 'rgba(0, 212, 255, 0.15)'}
                  stroke={isPerfect ? '#fde047' : '#00D4FF'}
                  strokeWidth="1"
                />
                <text
                  x="145"
                  y="39"
                  textAnchor="middle"
                  fill={isPerfect ? '#fef08a' : '#67e8f9'}
                  fontFamily="monospace"
                  fontSize="12"
                  fontWeight="bold"
                  letterSpacing="1"
                >
                  {isPerfect ? '★ 100% PERFECT SCORE ★' : '★ EXCELENTE RENDIMIENTO ★'}
                </text>

                {/* Giant Percentage */}
                <text
                  x="145"
                  y="112"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontFamily="system-ui, sans-serif"
                  fontSize="58"
                  fontWeight="900"
                  letterSpacing="-1"
                >
                  {score}
                  <tspan fontSize="36" fill={isPerfect ? '#facc15' : '#00D4FF'}>
                    %
                  </tspan>
                </text>

                {/* Subtitle / Topic Pill */}
                <rect
                  x="20"
                  y="132"
                  width="250"
                  height="22"
                  rx="6"
                  fill="#0e1322"
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x="145"
                  y="147"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="600"
                >
                  {sublevel} • 3/3 Retos Superados
                </text>

                {/* Bottom Rewards Row */}
                <g transform="translate(25, 170)">
                  {/* XP Badge */}
                  <rect x="0" y="0" width="112" height="30" rx="8" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="1" />
                  <text x="56" y="20" textAnchor="middle" fill="#6ee7b7" fontSize="12" fontWeight="bold">
                    +{xpEarned} XP
                  </text>

                  {/* Status Badge */}
                  <rect x="126" y="0" width="112" height="30" rx="8" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1" />
                  <text x="182" y="20" textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="bold">
                    ✓ Graduado
                  </text>
                </g>

                {/* Corner Tech Rivets */}
                <circle cx="16" cy="16" r="2.5" fill="#64748b" />
                <circle cx="274" cy="16" r="2.5" fill="#64748b" />
                <circle cx="16" cy="209" r="2.5" fill="#64748b" />
                <circle cx="274" cy="209" r="2.5" fill="#64748b" />
              </motion.g>

              {/* ══════════════════════════════════════════════════════════
                  🤖 GUIONBAJO (Multi-Stage Rig: Pulling, Snap, Fall, Smile)
                 ══════════════════════════════════════════════════════════ */}
              <motion.g
                // Dynamic kinematics driven by sequence state
                animate={
                  stage === 'pulling'
                    ? {
                        x: [190, 205, 190],
                        y: 250,
                        rotate: [-20, -23, -20],
                        scaleY: 1,
                        scaleX: 1,
                      }
                    : stage === 'snap'
                    ? {
                        x: 160,
                        y: 240,
                        rotate: -34,
                        scaleY: 1.05,
                        scaleX: 0.95,
                      }
                    : stage === 'fall'
                    ? {
                        x: 95,
                        y: 220,
                        rotate: 32,
                        scaleY: 1,
                        scaleX: 1,
                      }
                    : stage === 'landed'
                    ? {
                        x: 110,
                        y: 310,
                        rotate: 0,
                        scaleY: [1, 0.76, 1.08, 1],
                        scaleX: [1, 1.25, 0.95, 1],
                        transition: { duration: 0.45, ease: 'easeOut' },
                      }
                    : stage === 'look_score'
                    ? {
                        x: 110,
                        y: 310,
                        rotate: 0,
                        scaleY: 1,
                        scaleX: 1,
                      }
                    : {
                        // Celebrating (Seated proudly smiling at student)
                        x: 110,
                        y: [310, 306, 310],
                        rotate: 0,
                        scaleY: 1,
                        scaleX: 1,
                        transition: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
                      }
                }
                transition={
                  stage === 'pulling'
                    ? { repeat: Infinity, duration: 0.5, ease: 'easeInOut' }
                    : { duration: 0.3 }
                }
                style={{ transformOrigin: '475px 300px' }}
              >
                {/* ── Ground Shadow / Plasma bloom ── */}
                <ellipse
                  cx="475"
                  cy="338"
                  rx={stage === 'pulling' ? 32 : stage === 'fall' ? 12 : 38}
                  ry={stage === 'pulling' ? 7 : stage === 'fall' ? 3 : 9}
                  fill="#030712"
                  opacity="0.6"
                />

                {/* ── Impact Dust Puff Circles (Appears on landing) ── */}
                {(stage === 'landed' || stage === 'look_score') && (
                  <motion.g
                    initial={{ opacity: 0.8, scale: 0.4 }}
                    animate={{ opacity: 0, scale: 1.6 }}
                    transition={{ duration: 0.6 }}
                    style={{ transformOrigin: '475px 335px' }}
                  >
                    <circle cx="445" cy="335" r="10" fill="#94a3b8" opacity="0.3" />
                    <circle cx="505" cy="335" r="12" fill="#94a3b8" opacity="0.3" />
                    <circle cx="475" cy="338" r="8" fill="#cbd5e1" opacity="0.4" />
                  </motion.g>
                )}

                {/* ── PLASMA HOVER THRUSTER ── */}
                {stage === 'pulling' && (
                  <g>
                    {/* Flame plume */}
                    <path
                      d="M 462 318 Q 475 365 475 372 Q 475 365 488 318 Z"
                      fill="url(#plasmaFlameOuter)"
                      opacity="0.85"
                      filter="url(#cyanGlow)"
                    />
                    <path
                      d="M 467 318 Q 475 352 475 356 Q 475 352 483 318 Z"
                      fill="url(#plasmaFlameCore)"
                      opacity="0.95"
                    />
                    {/* Strain Sparks shooting forward */}
                    <motion.circle
                      cx="475"
                      cy="360"
                      r="2"
                      fill="#fef08a"
                      animate={{ cx: [475, 495], cy: [360, 365], opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.2 }}
                    />
                    <motion.circle
                      cx="472"
                      cy="355"
                      r="1.8"
                      fill="#00D4FF"
                      animate={{ cx: [472, 450], cy: [355, 368], opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.25 }}
                    />
                  </g>
                )}

                {/* Thruster Nozzle */}
                <rect x="464" y="312" width="22" height="6" rx="2" fill="url(#antennaStemGrad)" stroke="#334155" strokeWidth="1" />
                <rect x="467" y="316" width="16" height="2" rx="1" fill="#00D4FF" opacity={stage === 'pulling' ? 0.9 : 0.3} />

                {/* ── MECHANICAL ARMS ── */}
                {stage === 'pulling' ? (
                  /* Arms grasping the rope tightly forward */
                  <g>
                    {/* Left Arm grasping */}
                    <path d="M 456 282 Q 475 288 510 292" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="510" cy="292" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                    {/* Right Arm grasping */}
                    <path d="M 488 282 Q 510 286 535 292" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="535" cy="292" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                  </g>
                ) : stage === 'snap' || stage === 'fall' ? (
                  /* Arms flying back in shock */
                  <g>
                    <path d="M 451 282 Q 430 260 415 250" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="415" cy="250" r="4.5" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                    <path d="M 499 282 Q 520 260 535 250" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="535" cy="250" r="4.5" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                  </g>
                ) : stage === 'celebrate' ? (
                  /* Right arm waving happily, Left arm resting on ground */
                  <g>
                    {/* Left arm resting */}
                    <path d="M 451 282 Q 436 295 440 318" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="440" cy="318" r="4" fill="#334155" />
                    {/* Right arm waving high! */}
                    <motion.g
                      animate={{ rotate: [-8, 12, -8] }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
                      style={{ transformOrigin: '499px 282px' }}
                    >
                      <path d="M 499 282 Q 518 260 528 238" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                      <circle cx="528" cy="238" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                      {/* Pincer clamp open waving */}
                      <path d="M 524 233 Q 528 226 535 233" fill="none" stroke="#00D4FF" strokeWidth="2" />
                    </motion.g>
                  </g>
                ) : (
                  /* Seated on floor resting hands */
                  <g>
                    <path d="M 451 282 Q 438 300 445 320" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="445" cy="320" r="4" fill="#334155" />
                    <path d="M 499 282 Q 512 300 505 320" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="505" cy="320" r="4" fill="#334155" />
                  </g>
                )}

                {/* ── ROBOT TORSO ── */}
                <rect x="451" y="278" width="48" height="34" rx="10" fill="url(#robotChassis)" stroke="#4b5563" strokeWidth="1.8" />
                {/* Torso CRT Screen */}
                <rect x="457" y="283" width="36" height="23" rx="5" fill="#020617" stroke="#334155" strokeWidth="1.2" />
                {/* Horizontal Scanlines */}
                <line x1="459" y1="287" x2="491" y2="287" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <line x1="459" y1="292" x2="491" y2="292" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <line x1="459" y1="297" x2="491" y2="297" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <line x1="459" y1="302" x2="491" y2="302" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />

                {/* Torso Underscore Insignia */}
                <text x="475" y="299" textAnchor="middle" fill="#00D4FF" fontFamily="monospace" fontSize="10" fontWeight="900" filter="url(#cyanGlow)">
                  _
                </text>

                {/* Mechanical Neck */}
                <rect x="470" y="272" width="10" height="7" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />

                {/* ── LATERAL EAR DIALS ── */}
                <rect x="438" y="241" width="7" height="18" rx="2" fill="url(#earDialGrad)" stroke="#475569" strokeWidth="0.8" />
                <rect x="439" y="249" width="3.5" height="2" rx="1" fill="#00D4FF" filter="url(#cyanGlow)" />
                <rect x="505" y="241" width="7" height="18" rx="2" fill="url(#earDialGrad)" stroke="#475569" strokeWidth="0.8" />
                <rect x="507.5" y="249" width="3.5" height="2" rx="1" fill="#00D4FF" filter="url(#cyanGlow)" />

                {/* ── ROBOT HEAD ── */}
                <g
                  // Dynamic head angle (looking at score vs looking forward)
                  style={{
                    transform: stage === 'look_score' ? 'rotate(15deg)' : 'rotate(0deg)',
                    transformOrigin: '475px 250px',
                    transition: 'transform 0.4s ease',
                  }}
                >
                  <rect x="445" y="226" width="60" height="48" rx="12" fill="url(#robotChassis)" stroke="#4b5563" strokeWidth="2" />

                  {/* 4 Corner Rivets */}
                  <circle cx="451" cy="232" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                  <circle cx="499" cy="232" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                  <circle cx="451" cy="268" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                  <circle cx="499" cy="268" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />

                  {/* ── ROBOT EYES (Contextual Emotions) ── */}
                  {stage === 'pulling' ? (
                    /* Straining concentrated eyes (> <) */
                    <g>
                      {/* Left eye: > */}
                      <path d="M 458 241 L 466 246 L 458 251" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#cyanGlow)" />
                      {/* Right eye: < */}
                      <path d="M 492 241 L 484 246 L 492 251" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#cyanGlow)" />
                    </g>
                  ) : stage === 'snap' || stage === 'fall' ? (
                    /* Shocked wide open eyes (O O) */
                    <g>
                      <circle cx="463" cy="246" r="8" fill="#090d14" stroke="#00D4FF" strokeWidth="2" filter="url(#cyanGlow)" />
                      <circle cx="463" cy="246" r="3.5" fill="#ffffff" />
                      <circle cx="487" cy="246" r="8" fill="#090d14" stroke="#00D4FF" strokeWidth="2" filter="url(#cyanGlow)" />
                      <circle cx="487" cy="246" r="3.5" fill="#ffffff" />
                    </g>
                  ) : stage === 'look_score' ? (
                    /* Looking sideways at the score */
                    <g>
                      <circle cx="463" cy="246" r="8" fill="#090d14" stroke="#334155" strokeWidth="1.5" />
                      <circle cx="467" cy="246" r="4" fill="#00D4FF" filter="url(#cyanGlow)" />
                      <circle cx="487" cy="246" r="8" fill="#090d14" stroke="#334155" strokeWidth="1.5" />
                      <circle cx="491" cy="246" r="4" fill="#00D4FF" filter="url(#cyanGlow)" />
                    </g>
                  ) : (
                    /* CELEBRATING: Smiling glowing arc eyes (^ ^) */
                    <g>
                      {/* Left Happy Arc */}
                      <path d="M 457 248 Q 463 238 469 248" fill="none" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" filter="url(#cyanGlow)" />
                      {/* Right Happy Arc */}
                      <path d="M 481 248 Q 487 238 493 248" fill="none" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" filter="url(#cyanGlow)" />
                    </g>
                  )}

                  {/* ── ROBOT MOUTH (Contextual) ── */}
                  <rect x="457" y="260" width="36" height="8" rx="3" fill="#090d14" stroke="#334155" strokeWidth="1.2" />

                  {stage === 'pulling' ? (
                    /* Tight terminal cursor */
                    <text x="475" y="267" textAnchor="middle" fill="#00D4FF" fontFamily="monospace" fontSize="11" fontWeight="900" filter="url(#cyanGlow)">
                      _
                    </text>
                  ) : stage === 'snap' || stage === 'fall' ? (
                    /* Surprise O */
                    <circle cx="475" cy="264" r="2.5" fill="#00D4FF" filter="url(#cyanGlow)" />
                  ) : stage === 'celebrate' ? (
                    /* BIG CHEERFUL BEAMING SMILE (‿) */
                    <path
                      d="M 466 263 Q 475 268 484 263"
                      fill="none"
                      stroke="#00D4FF"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      filter="url(#cyanGlow)"
                    />
                  ) : (
                    /* Normal underscore */
                    <text x="475" y="267" textAnchor="middle" fill="#00D4FF" fontFamily="monospace" fontSize="11" fontWeight="900" filter="url(#cyanGlow)">
                      _
                    </text>
                  )}

                  {/* ── TOP ANTENNA & VACUUM BULB ── */}
                  <rect x="473.5" y="210" width="3" height="16" rx="1.5" fill="url(#antennaStemGrad)" />
                  <circle cx="475" cy="203" r="7.5" fill="url(#vacuumBulbGrad)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" />

                  {/* Glowing Bulb Bloom */}
                  <circle
                    cx="475"
                    cy="203"
                    r={stage === 'celebrate' ? 14 : 9}
                    fill={stage === 'celebrate' ? '#fde047' : '#00D4FF'}
                    opacity={stage === 'celebrate' ? 0.6 : 0.4}
                    filter="url(#cyanGlow)"
                  />
                  {/* Filament */}
                  <path d="M 473 205 C 473 200 477 200 477 205" fill="none" stroke={stage === 'celebrate' ? '#fef08a' : '#00D4FF'} strokeWidth="1.2" />
                </g>
              </motion.g>

              {/* ══════════════════════════════════════════════════════════
                  🎉 CONFETTI SHOWER (Erupts during celebration stage)
                 ══════════════════════════════════════════════════════════ */}
              {stage === 'celebrate' && (
                <g>
                  {[
                    { cx: 480, cy: 90, color: '#f59e0b', r: 4, dx: -30, dy: 180 },
                    { cx: 520, cy: 80, color: '#00D4FF', r: 5, dx: 40, dy: 200 },
                    { cx: 450, cy: 110, color: '#ec4899', r: 4.5, dx: -70, dy: 160 },
                    { cx: 570, cy: 95, color: '#10b981', r: 4, dx: 80, dy: 190 },
                    { cx: 500, cy: 70, color: '#a855f7', r: 5, dx: 15, dy: 220 },
                    { cx: 620, cy: 100, color: '#fbbf24', r: 4.5, dx: 60, dy: 170 },
                    { cx: 400, cy: 130, color: '#38bdf8', r: 4, dx: -90, dy: 150 },
                    { cx: 660, cy: 120, color: '#f43f5e', r: 5, dx: 70, dy: 160 },
                    { cx: 460, cy: 60, color: '#fde047', r: 4, dx: -45, dy: 230 },
                    { cx: 540, cy: 65, color: '#34d399', r: 4.5, dx: 55, dy: 225 },
                    { cx: 330, cy: 150, color: '#818cf8', r: 4, dx: -80, dy: 140 },
                    { cx: 360, cy: 180, color: '#fb7185', r: 4.5, dx: -50, dy: 120 },
                    { cx: 240, cy: 220, color: '#00D4FF', r: 4, dx: -40, dy: 90 },
                    { cx: 280, cy: 210, color: '#f59e0b', r: 4, dx: -30, dy: 100 },
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

            {/* Stage narrative status pill (floating overlay) */}
            <div className="absolute top-4 left-4 pointer-events-none">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-black/60 border border-white/10 text-zinc-300 backdrop-blur-md">
                {stage === 'pulling' && '⏳ Guionbajo arrastrando tu resultado...'}
                {stage === 'snap' && '⚡ ¡TIRÓN MÁXIMO!'}
                {stage === 'fall' && '💨 ¡Woooah!'}
                {stage === 'landed' && '💥 ¡Plop!'}
                {stage === 'look_score' && '👀 ¡Mira lo que trajiste!'}
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
