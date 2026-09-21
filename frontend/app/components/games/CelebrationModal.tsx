'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from '@/lib/soundEffects';
import { Trophy, ArrowRight, RotateCcw, Volume2, VolumeX, Sparkles, Award } from 'lucide-react';
import type { UpgradeStage } from '@/lib/guionbajoUpgrades';

export interface CelebrationModalProps {
  isOpen: boolean;
  score?: number;
  topic?: string;
  sublevel?: string;
  xpEarned?: number;
  onClose?: () => void;
  onContinue?: () => void;
  autoPlaySound?: boolean;
  /** Stage de upgrade visual de Guionbajo (0 = base, 8 = maestro) */
  upgradeStage?: UpgradeStage;
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
  upgradeStage = 0,
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

    // 0.25s: Strain ratchet (Guionbajo heaving on the rope)
    timeoutRefs.current.push(
      setTimeout(() => {
        playSfx(() => sfx.playStrainRatchet());
      }, 250)
    );

    // 1.0s: Second strain ratchet
    timeoutRefs.current.push(
      setTimeout(() => {
        playSfx(() => sfx.playStrainRatchet());
      }, 1000)
    );

    // 1.85s: Sudden SNAP! Tension gives way, score card rushes in from the right
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('snap');
        playSfx(() => sfx.playWhoosh());
      }, 1850)
    );

    // 2.2s: Loses balance backwards directly on the floor
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('fall');
      }, 2200)
    );

    // 2.6s: THUD! Lands seated flat on the ground plane ("pegado al piso")
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('landed');
        playSfx(() => sfx.playCartoonThud());
      }, 2600)
    );

    // 3.25s: Turns head right to inspect the giant 100% score card beside him
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('look_score');
      }, 3250)
    );

    // 3.95s: Turns head to the student, eyes morph to ^_^, beaming smile & confetti!
    timeoutRefs.current.push(
      setTimeout(() => {
        setStage('celebrate');
        playSfx(() => sfx.playVictoryFanfare());
      }, 3950)
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
              🎬 THE CINEMATIC STAGE (Grounded, Side-by-Side Architecture)
             ══════════════════════════════════════════════════════════════ */}
          <div className="relative w-full h-[360px] sm:h-[420px] bg-[#070814] select-none overflow-hidden flex items-end">
            
            {/* Stage Ambient Radial Glows */}
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-[90px] pointer-events-none" />

            {/* Cyber Floor Line & Perspective Grid at bottom-12 (48px from bottom) */}
            <div className="absolute left-0 right-0 bottom-12 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00D4FF] z-10" />
            <div className="absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-b from-[#090d1a] to-[#04060b] border-t border-cyan-500/20">
              {/* Floor grid lines */}
              <div className="w-full h-full flex justify-around opacity-20">
                <div className="w-px h-full bg-cyan-400 transform -skew-x-12" />
                <div className="w-px h-full bg-cyan-400 transform -skew-x-6" />
                <div className="w-px h-full bg-cyan-400" />
                <div className="w-px h-full bg-cyan-400 transform skew-x-6" />
                <div className="w-px h-full bg-cyan-400 transform skew-x-12" />
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                🪢 SLACK ROPE ON FLOOR (Appears when Guionbajo releases it)
               ══════════════════════════════════════════════════════════ */}
            {stage !== 'pulling' && (
              <div className="absolute bottom-12 left-28 right-16 sm:right-28 h-6 pointer-events-none z-15">
                <svg viewBox="0 0 600 24" preserveAspectRatio="none" className="w-full h-full">
                  <path
                    d="M 10 14 Q 100 22 180 10 Q 260 22 360 8 Q 460 20 590 14"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="9 3"
                    opacity={stage === 'celebrate' ? 0.35 : 0.85}
                  />
                  <path
                    d="M 10 14 Q 100 22 180 10 Q 260 22 360 8 Q 460 20 590 14"
                    fill="none"
                    stroke="#fef08a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="9 3"
                    opacity={stage === 'celebrate' ? 0.25 : 0.6}
                  />
                </svg>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                🤖 GUIONBAJO (LEFT SIDE, GROUNDED AT bottom-12 ON THE FLOOR)
               ══════════════════════════════════════════════════════════ */}
            <motion.div
              className="absolute bottom-12 left-8 sm:left-14 md:left-20 z-20 w-36 sm:w-40 h-48 flex items-end justify-center"
              style={{ transformOrigin: '70px 152px' }}
              animate={
                stage === 'pulling'
                  ? {
                      x: [0, -8, 0],
                      y: 0,
                      rotate: [-20, -23, -20],
                      scaleY: 1,
                      scaleX: 1,
                    }
                  : stage === 'snap'
                  ? {
                      x: -12,
                      y: 0,
                      rotate: -28,
                      scaleY: 1.04,
                      scaleX: 0.96,
                    }
                  : stage === 'fall'
                  ? {
                      // Loses balance backwards right onto the floor
                      x: -24,
                      y: 0,
                      rotate: [14, 2, 0],
                      scaleY: 0.95,
                      scaleX: 1.05,
                    }
                  : stage === 'landed'
                  ? {
                      // Sits flat on the floor plane with squash & stretch
                      x: -20,
                      y: 0,
                      rotate: 0,
                      scaleY: [1, 0.78, 1.08, 1],
                      scaleX: [1, 1.22, 0.95, 1],
                      transition: { duration: 0.42, ease: 'easeOut' },
                    }
                  : stage === 'look_score'
                  ? {
                      x: -20,
                      y: 0,
                      rotate: 0,
                      scaleY: 1,
                      scaleX: 1,
                    }
                  : {
                      // CELEBRATING: Resting seated on floor, breathing softly
                      x: -20,
                      y: [0, -3, 0],
                      rotate: 0,
                      scaleY: 1,
                      scaleX: 1,
                      transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
                    }
              }
              transition={
                stage === 'pulling'
                  ? { repeat: Infinity, duration: 0.45, ease: 'easeInOut' }
                  : { duration: 0.28 }
              }
            >
              <svg viewBox="0 0 140 180" className="w-full h-full overflow-visible">
                <defs>
                  <filter id="gbCyanGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <linearGradient id="gbChassis" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#374151" />
                    <stop offset="55%" stopColor="#1f2937" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>

                  <linearGradient id="gbStemGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>

                  <radialGradient id="gbVacuumBulb" cx="0.35" cy="0.35" r="0.65">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="35%" stopColor="#00d4ff" stopOpacity="0.85" />
                    <stop offset="75%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#090d14" stopOpacity="0.9" />
                  </radialGradient>

                  <linearGradient id="gbPlasmaOuter" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="25%" stopColor="#fef08a" stopOpacity="0.9" />
                    <stop offset="55%" stopColor="#f97316" stopOpacity="0.85" />
                    <stop offset="85%" stopColor="#00d4ff" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>

                  <linearGradient id="gbPlasmaCore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="20%" stopColor="#00d4ff" stopOpacity="0.95" />
                    <stop offset="65%" stopColor="#6366f1" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* ── Ground Shadow directly under chassis ── */}
                <ellipse cx="70" cy="154" rx="36" ry="7" fill="#030712" opacity="0.75" />

                {/* ── Impact Dust Puff Circles (Appears on landing) ── */}
                {(stage === 'landed' || stage === 'look_score') && (
                  <motion.g
                    initial={{ opacity: 0.9, scale: 0.3 }}
                    animate={{ opacity: 0, scale: 1.8 }}
                    transition={{ duration: 0.55 }}
                    style={{ transformOrigin: '70px 154px' }}
                  >
                    <circle cx="45" cy="153" r="10" fill="#94a3b8" opacity="0.4" />
                    <circle cx="95" cy="153" r="12" fill="#94a3b8" opacity="0.4" />
                    <circle cx="70" cy="154" r="8" fill="#cbd5e1" opacity="0.5" />
                  </motion.g>
                )}

                {/* ── PLASMA HOVER THRUSTER (Firing only during pull) ── */}
                {stage === 'pulling' && (
                  <g>
                    <path
                      d={
                        upgradeStage >= 2
                          ? 'M 54 152 Q 70 196 70 204 Q 70 196 86 152 Z'
                          : 'M 60 152 Q 70 178 70 182 Q 70 178 80 152 Z'
                      }
                      fill="url(#gbPlasmaOuter)"
                      opacity="0.9"
                      filter="url(#gbCyanGlow)"
                    />
                    <path
                      d={
                        upgradeStage >= 2
                          ? 'M 58 152 Q 70 188 70 192 Q 70 188 82 152 Z'
                          : 'M 64 152 Q 70 172 70 175 Q 70 172 76 152 Z'
                      }
                      fill="url(#gbPlasmaCore)"
                      opacity="0.95"
                    />
                    {/* Sparks */}
                    <motion.circle
                      cx="70"
                      cy="175"
                      r="2"
                      fill="#fef08a"
                      animate={{ cx: [70, 88], cy: [175, 180], opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.18 }}
                    />
                  </g>
                )}

                {/* Thruster Nozzle (Rests firmly flat on ground plane) */}
                <rect x="59" y="146" width="22" height="6" rx="2" fill="url(#gbStemGrad)" stroke="#334155" strokeWidth="1" />
                <rect x="62" y="150" width="16" height="2" rx="1" fill="#00D4FF" opacity={stage === 'pulling' ? 0.9 : 0.3} />

                {/* ── MECHANICAL ARMS & PULLING ROPE ── */}
                {stage === 'pulling' ? (
                  /* Grasping the rope forward */
                  <g>
                    {/* Upper and forearms */}
                    <path d="M 50 117 Q 80 120 105 125" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <path d="M 90 117 Q 110 120 125 125" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round" />

                    {/* 🪢 THE TAUT ROPE: Originates directly inside hands and shoots across to the right */}
                    {/* Outer glowing aura */}
                    <motion.path
                      d="M 85 125 L 125 125 Q 500 255 1000 440"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="10"
                      strokeLinecap="round"
                      opacity="0.45"
                      filter="url(#gbCyanGlow)"
                      animate={{
                        d: [
                          'M 85 125 L 125 125 Q 500 255 1000 440',
                          'M 85 125 L 125 125 Q 500 248 1000 440',
                          'M 85 125 L 125 125 Q 500 262 1000 440',
                        ],
                      }}
                      transition={{ repeat: Infinity, duration: 0.1 }}
                    />
                    {/* Braided rope core */}
                    <motion.path
                      d="M 85 125 L 125 125 Q 500 255 1000 440"
                      fill="none"
                      stroke="url(#gbPlasmaOuter)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="12 4"
                      animate={{
                        d: [
                          'M 85 125 L 125 125 Q 500 255 1000 440',
                          'M 85 125 L 125 125 Q 500 248 1000 440',
                          'M 85 125 L 125 125 Q 500 262 1000 440',
                        ],
                      }}
                      transition={{ repeat: Infinity, duration: 0.1 }}
                    />

                    {/* Wrist Knuckles */}
                    <circle cx="105" cy="125" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                    <circle cx="125" cy="125" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />

                    {/* Cyan Pincer Clamps tightly closed over the rope */}
                    <path d="M 102 120 Q 109 125 102 130" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" filter="url(#gbCyanGlow)" />
                    <path d="M 122 120 Q 129 125 122 130" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" filter="url(#gbCyanGlow)" />
                  </g>
                ) : stage === 'snap' || stage === 'fall' ? (
                  /* Arms thrown open in shock */
                  <g>
                    <path d="M 46 117 Q 25 100 15 90" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="15" cy="90" r="4.5" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                    <path d="M 94 117 Q 115 100 125 90" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="125" cy="90" r="4.5" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                  </g>
                ) : stage === 'celebrate' ? (
                  /* Left arm resting on floor, Right arm waving high! */
                  <g>
                    {/* Left arm resting on floor */}
                    <path d="M 46 117 Q 35 132 40 152" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="40" cy="152" r="4.5" fill="#334155" />
                    {/* Right arm waving to the student */}
                    <motion.g
                      animate={{ rotate: [-8, 14, -8] }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
                      style={{ transformOrigin: '94px 117px' }}
                    >
                      <path d="M 94 117 Q 115 95 120 75" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                      <circle cx="120" cy="75" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                      <path d="M 116 70 Q 120 63 127 70" fill="none" stroke="#00D4FF" strokeWidth="2" />
                    </motion.g>
                  </g>
                ) : (
                  /* Seated on floor: resting both hands beside base on floor */
                  <g>
                    <path d="M 46 117 Q 35 135 40 152" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="40" cy="152" r="4" fill="#334155" />
                    <path d="M 94 117 Q 105 135 100 152" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="100" cy="152" r="4" fill="#334155" />
                  </g>
                )}

                {/* ── ROBOT TORSO ── */}
                <rect x="46" y="112" width="48" height="34" rx="10" fill="url(#gbChassis)" stroke="#4b5563" strokeWidth="1.8" />
                {/* Torso CRT Screen */}
                <rect x="52" y="117" width="36" height="23" rx="5" fill="#020617" stroke="#334155" strokeWidth="1.2" />
                {/* Scanlines */}
                <line x1="54" y1="121" x2="86" y2="121" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <line x1="54" y1="126" x2="86" y2="126" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <line x1="54" y1="131" x2="86" y2="131" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                <line x1="54" y1="136" x2="86" y2="136" stroke="rgba(0,212,255,0.2)" strokeWidth="0.8" />
                {/* Underscore Insignia */}
                <text x="70" y="133" textAnchor="middle" fill="#00D4FF" fontFamily="monospace" fontSize="10" fontWeight="900" filter="url(#gbCyanGlow)">
                  _
                </text>

                {/* Mechanical Neck */}
                <rect x="65" y="106" width="10" height="7" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />

                {/* ── LATERAL EAR DIALS ── */}
                <rect x="33" y="75" width="7" height="18" rx="2" fill="url(#gbStemGrad)" stroke="#475569" strokeWidth="0.8" />
                <rect x="34" y="83" width="3.5" height="2" rx="1" fill="#00D4FF" filter="url(#gbCyanGlow)" />
                <rect x="100" y="75" width="7" height="18" rx="2" fill="url(#gbStemGrad)" stroke="#475569" strokeWidth="0.8" />
                <rect x="102.5" y="83" width="3.5" height="2" rx="1" fill="#00D4FF" filter="url(#gbCyanGlow)" />

                {/* ── ROBOT HEAD ── */}
                <g
                  // Turns to look right at the Score Card (18deg) vs facing front (0deg)
                  style={{
                    transform: stage === 'look_score' ? 'rotate(18deg)' : 'rotate(0deg)',
                    transformOrigin: '70px 84px',
                    transition: 'transform 0.4s ease',
                  }}
                >
                  <rect x="40" y="60" width="60" height="48" rx="12" fill="url(#gbChassis)" stroke="#4b5563" strokeWidth="2" />

                  {/* 4 Corner Rivets */}
                  <circle cx="46" cy="66" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                  <circle cx="94" cy="66" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                  <circle cx="46" cy="102" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />
                  <circle cx="94" cy="102" r="1.8" fill="#788a9e" stroke="#334155" strokeWidth="0.6" />

                  {/* ── ROBOT EYES ── */}
                  {stage === 'pulling' ? (
                    /* Straining concentrated eyes (> <) */
                    <g>
                      <path d="M 53 75 L 61 80 L 53 85" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#gbCyanGlow)" />
                      <path d="M 87 75 L 79 80 L 87 85" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#gbCyanGlow)" />
                    </g>
                  ) : stage === 'snap' || stage === 'fall' ? (
                    /* Shocked wide open eyes (O O) */
                    <g>
                      <circle cx="58" cy="80" r="8" fill="#090d14" stroke="#00D4FF" strokeWidth="2" filter="url(#gbCyanGlow)" />
                      <circle cx="58" cy="80" r="3.5" fill="#ffffff" />
                      <circle cx="82" cy="80" r="8" fill="#090d14" stroke="#00D4FF" strokeWidth="2" filter="url(#gbCyanGlow)" />
                      <circle cx="82" cy="80" r="3.5" fill="#ffffff" />
                    </g>
                  ) : stage === 'look_score' ? (
                    /* Looking to the right at the Score Card */
                    <g>
                      <circle cx="58" cy="80" r="8" fill="#090d14" stroke="#334155" strokeWidth="1.5" />
                      <circle cx="62" cy="80" r="4.5" fill="#00D4FF" filter="url(#gbCyanGlow)" />
                      <circle cx="82" cy="80" r="8" fill="#090d14" stroke="#334155" strokeWidth="1.5" />
                      <circle cx="86" cy="80" r="4.5" fill="#00D4FF" filter="url(#gbCyanGlow)" />
                    </g>
                  ) : (
                    /* CELEBRATING: Smiling glowing arc eyes (^ ^) looking at the student */
                    <g>
                      <path d="M 52 82 Q 58 72 64 82" fill="none" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" filter="url(#gbCyanGlow)" />
                      <path d="M 76 82 Q 82 72 88 82" fill="none" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" filter="url(#gbCyanGlow)" />
                    </g>
                  )}

                  {/* ── ROBOT MOUTH ── */}
                  <rect x="52" y="94" width="36" height="8" rx="3" fill="#090d14" stroke="#334155" strokeWidth="1.2" />

                  {stage === 'pulling' ? (
                    <text x="70" y="101" textAnchor="middle" fill="#00D4FF" fontFamily="monospace" fontSize="11" fontWeight="900" filter="url(#gbCyanGlow)">
                      _
                    </text>
                  ) : stage === 'snap' || stage === 'fall' ? (
                    <circle cx="70" cy="98" r="2.5" fill="#00D4FF" filter="url(#gbCyanGlow)" />
                  ) : stage === 'celebrate' ? (
                    <path d="M 61 97 Q 70 102 79 97" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" filter="url(#gbCyanGlow)" />
                  ) : (
                    <text x="70" y="101" textAnchor="middle" fill="#00D4FF" fontFamily="monospace" fontSize="11" fontWeight="900" filter="url(#gbCyanGlow)">
                      _
                    </text>
                  )}

                  {/* ── TOP ANTENNA & VACUUM BULB ── */}
                  {/* Stage 5+: Bobina Tesla en lugar de antena simple */}
                  {upgradeStage >= 5 ? (
                    <g>
                      <rect x="68.5" y="44" width="3" height="16" rx="1.5" fill="url(#gbStemGrad)" />
                      {/* Anillos de bobina */}
                      {[0, 1, 2].map((i) => (
                        <ellipse key={i} cx="70" cy={36 - i * 5} rx="7" ry="2.5"
                          fill="none" stroke="#00D4FF" strokeWidth="1.2" opacity={0.9 - i * 0.2} />
                      ))}
                      <circle cx="70" cy="21" r="3" fill="#ffffff" opacity="0.9" />
                    </g>
                  ) : (
                    <g>
                      <rect x="68.5" y="44" width="3" height="16" rx="1.5" fill="url(#gbStemGrad)" />
                      <circle cx="70" cy="37" r="7.5" fill="url(#gbVacuumBulb)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" />
                      <circle
                        cx="70"
                        cy="37"
                        r={stage === 'celebrate' ? 14 : 9}
                        fill={stage === 'celebrate' ? '#fde047' : '#00D4FF'}
                        opacity={stage === 'celebrate' ? 0.6 : 0.4}
                        filter="url(#gbCyanGlow)"
                      />
                      <path d="M 68 39 C 68 34 72 34 72 39" fill="none" stroke={stage === 'celebrate' ? '#fef08a' : '#00D4FF'} strokeWidth="1.2" />
                    </g>
                  )}
                </g>

                {/* ══ UPGRADE ACCESSORIES (sobre el SVG base) ══ */}

                {/* Stage 1+: Articulaciones y hombreras gruesas cromadas en brazos */}
                {upgradeStage >= 1 && (
                  <g>
                    <rect x="44" y="114" width="12" height="10" rx="3" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.5" />
                    <circle cx="50" cy="119" r="3" fill="#00D4FF" filter="url(#gbCyanGlow)" />
                    <rect x="84" y="114" width="12" height="10" rx="3" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.5" />
                    <circle cx="90" cy="119" r="3" fill="#00D4FF" filter="url(#gbCyanGlow)" />
                  </g>
                )}

                {/* Stage 2+: Jetpack dorsal con canisters realistas y mega llamas */}
                {upgradeStage >= 2 && (
                  <g>
                    <rect x="36" y="114" width="12" height="26" rx="4" fill="url(#gbChassis)" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1="36" y1="122" x2="48" y2="122" stroke="#f59e0b" strokeWidth="2" />
                    <rect x="92" y="114" width="12" height="26" rx="4" fill="url(#gbChassis)" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1="92" y1="122" x2="104" y2="122" stroke="#f59e0b" strokeWidth="2" />
                    {/* Mega Llamas de plasma */}
                    <ellipse cx="42" cy="148" rx="5" ry="12" fill="url(#gbPlasmaOuter)" opacity="0.9" filter="url(#gbCyanGlow)">
                      <animate attributeName="ry" values="10;15;9;14;10" dur="0.3s" repeatCount="indefinite" />
                    </ellipse>
                    <ellipse cx="98" cy="148" rx="5" ry="12" fill="url(#gbPlasmaOuter)" opacity="0.9" filter="url(#gbCyanGlow)">
                      <animate attributeName="ry" values="9;14;11;15;9" dur="0.32s" repeatCount="indefinite" />
                    </ellipse>
                  </g>
                )}

                {/* Stage 3+: Visor HUD Full Neón sobre los ojos */}
                {upgradeStage >= 3 && (
                  <g>
                    <rect x="36" y="62" width="68" height="26" rx="6"
                      fill="rgba(0, 229, 255, 0.45)" stroke="#00f0ff" strokeWidth="1.8" filter="url(#gbCyanGlow)" />
                    <line x1="38" y1="75" x2="102" y2="75" stroke="#ffffff" strokeWidth="1" opacity="0.7">
                      <animate attributeName="y1" values="64;86;64" dur="1.8s" repeatCount="indefinite" />
                      <animate attributeName="y2" values="64;86;64" dur="1.8s" repeatCount="indefinite" />
                    </line>
                    {/* Pupilas rojas tácticas visibles a través del visor */}
                    <circle cx="58" cy="75" r="4" fill="#FF0033" filter="url(#gbCyanGlow)" />
                    <circle cx="82" cy="75" r="4" fill="#FF0033" filter="url(#gbCyanGlow)" />
                  </g>
                )}

                {/* Stage 4+: Blindaje Pesado de Oro Real (Hombreras + Placa frontal) */}
                {upgradeStage >= 4 && (
                  <g>
                    {/* Hombreras de oro */}
                    <path d="M 38 110 L 28 116 L 34 130 L 44 124 Z" fill="url(#celebGoldFrame)" stroke="#fef08a" strokeWidth="1.5" />
                    <path d="M 102 110 L 112 116 L 106 130 L 96 124 Z" fill="url(#celebGoldFrame)" stroke="#fef08a" strokeWidth="1.5" />
                    {/* Placa frontal en cabeza */}
                    <rect x="42" y="58" width="56" height="6" rx="3" fill="url(#celebGoldFrame)" stroke="#fef08a" strokeWidth="1.2" />
                    {/* Ribetes dorados en chasis */}
                    <rect x="44" y="110" width="52" height="36" rx="9"
                      fill="none" stroke="url(#celebGoldFrame)" strokeWidth="2" opacity="0.9" />
                    <defs>
                      <linearGradient id="celebGoldFrame" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#b45309" />
                      </linearGradient>
                    </defs>
                  </g>
                )}

                {/* Stage 5: Rayos eléctricos en la bobina Tesla */}
                {upgradeStage >= 5 && (
                  <g>
                    <path d="M 60 30 L 54 24 L 62 21 L 58 14" stroke="#fef08a" strokeWidth="2" fill="none" strokeLinecap="round">
                      <animate attributeName="opacity" values="0.2;1;0.3;1;0.2" dur="0.25s" repeatCount="indefinite" />
                    </path>
                    <path d="M 80 30 L 86 24 L 78 21 L 82 14" stroke="#fef08a" strokeWidth="2" fill="none" strokeLinecap="round">
                      <animate attributeName="opacity" values="1;0.2;1;0.4;1" dur="0.3s" repeatCount="indefinite" />
                    </path>
                  </g>
                )}

                {/* Stage 6+: Espadas Gemelas Cyber montadas a los lados (Reemplaza alas) */}
                {upgradeStage >= 6 && (
                  <g>
                    {/* Espada izquierda */}
                    <g transform="rotate(-30 46 116)">
                      <rect x="44" y="60" width="5" height="52" rx="2" fill="url(#celebSwordGrad)" stroke="#e9d5ff" strokeWidth="1" filter="url(#gbCyanGlow)" />
                      <rect x="39" y="112" width="15" height="4" rx="1" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />
                      <rect x="45" y="116" width="3" height="12" rx="1" fill="#1e293b" />
                      <circle cx="46.5" cy="129" r="2.5" fill="#a855f7" />
                    </g>
                    {/* Espada derecha */}
                    <g transform="rotate(30 94 116)">
                      <rect x="91" y="60" width="5" height="52" rx="2" fill="url(#celebSwordGrad)" stroke="#e9d5ff" strokeWidth="1" filter="url(#gbCyanGlow)" />
                      <rect x="86" y="112" width="15" height="4" rx="1" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />
                      <rect x="92" y="116" width="3" height="12" rx="1" fill="#1e293b" />
                      <circle cx="93.5" cy="129" r="2.5" fill="#a855f7" />
                    </g>
                    <defs>
                      <linearGradient id="celebSwordGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="35%" stopColor="#c084fc" />
                        <stop offset="70%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#00f0ff" />
                      </linearGradient>
                    </defs>
                  </g>
                )}

                {/* Stage 8: Corona maestra flotante */}
                {upgradeStage >= 8 && (
                  <g>
                    <circle cx="70" cy="30" r="45" fill="#fbbf24" opacity="0.08">
                      <animate attributeName="r" values="45;54;45" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    <path d="M 52 16 L 56 5 L 63 13 L 70 2 L 77 13 L 84 5 L 88 16 Z"
                      fill="url(#crownGoldCeleb)" stroke="#f59e0b" strokeWidth="1.2">
                      <animate attributeName="transform" attributeType="XML"
                        type="translate" values="0,0;0,-3;0,0" dur="2s" repeatCount="indefinite" />
                    </path>
                    <circle cx="63" cy="11" r="2" fill="#ffffff" opacity="0.95" />
                    <circle cx="70" cy="5" r="2.5" fill="#fef08a" opacity="0.95" />
                    <circle cx="77" cy="11" r="2" fill="#ffffff" opacity="0.95" />
                    <defs>
                      <linearGradient id="crownGoldCeleb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="60%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#b45309" />
                      </linearGradient>
                    </defs>
                  </g>
                )}

              </svg>
            </motion.div>

            {/* ══════════════════════════════════════════════════════════
                🏆 THE SCORE MONOLITH (RIGHT SIDE, BESIDE GUIONBAJO)
                - Stays off-screen to the right during pulling
                - Snaps in smoothly beside Guionbajo on the right side
               ══════════════════════════════════════════════════════════ */}
            <motion.div
              className="absolute bottom-12 right-6 sm:right-12 md:right-16 z-20 w-[290px] sm:w-[360px] md:w-[400px]"
              initial={{ x: 600, opacity: 0 }}
              animate={
                stage === 'pulling'
                  ? { x: 500, opacity: 0 }
                  : {
                      x: 0,
                      opacity: 1,
                      transition: {
                        type: 'spring',
                        stiffness: 160,
                        damping: 17,
                        mass: 1.1,
                      },
                    }
              }
            >
              <div className="relative bg-gradient-to-b from-[#13182b]/95 via-[#0a0e19]/95 to-[#05070e]/95 border-2 border-amber-400/80 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.22)] backdrop-blur-xl flex flex-col gap-3">
                {/* Tech Eyelet on Left Edge (Where rope connected) */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1e293b] border-2 border-slate-400 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00D4FF]" />
                </div>

                {/* Top Badge Banner */}
                <div className="self-center px-4 py-1 rounded-xl bg-amber-500/15 border border-amber-400/60 text-amber-300 font-mono text-[11px] sm:text-xs font-bold tracking-wider text-center shadow-lg shadow-amber-500/10 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-yellow-400" />
                  <span>{isPerfect ? '★ 100% PERFECT SCORE ★' : '★ EXCELENTE RENDIMIENTO ★'}</span>
                </div>

                {/* Giant Percentage */}
                <div className="text-center">
                  <span className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]">
                    {score}
                    <span className="text-3xl sm:text-4xl text-amber-400 ml-0.5">%</span>
                  </span>
                </div>

                {/* Subtitle / Retos Superados */}
                <div className="bg-[#0e1322] border border-white/10 px-3 py-1.5 rounded-xl text-center">
                  <span className="text-xs sm:text-sm font-semibold text-zinc-300">
                    {sublevel} • 3/3 Retos Superados
                  </span>
                </div>

                {/* Rewards Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-emerald-400 block font-mono">RECOMPENSA</span>
                    <span className="text-sm font-black text-emerald-300">+{xpEarned} XP</span>
                  </div>
                  <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-amber-400 block font-mono">ESTADO</span>
                    <span className="text-sm font-black text-amber-300">✓ Graduado</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ══════════════════════════════════════════════════════════
                🎉 CONFETTI SHOWER (Erupts during celebration stage)
               ══════════════════════════════════════════════════════════ */}
            {stage === 'celebrate' && (
              <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                {[
                  { left: '20%', color: '#00D4FF', delay: 0 },
                  { left: '35%', color: '#F59E0B', delay: 0.1 },
                  { left: '50%', color: '#EC4899', delay: 0.05 },
                  { left: '65%', color: '#10B981', delay: 0.15 },
                  { left: '80%', color: '#A855F7', delay: 0.08 },
                  { left: '28%', color: '#FBBF24', delay: 0.2 },
                  { left: '42%', color: '#38BDF8', delay: 0.25 },
                  { left: '72%', color: '#F43F5E', delay: 0.18 },
                  { left: '88%', color: '#34D399', delay: 0.3 },
                ].map((p, idx) => (
                  <motion.div
                    key={idx}
                    className="absolute w-3 h-3 rounded-sm"
                    style={{ left: p.left, top: '-20px', backgroundColor: p.color }}
                    animate={{
                      y: [0, 420],
                      x: [0, idx % 2 === 0 ? 30 : -30],
                      rotate: [0, 360 * (idx % 2 === 0 ? 2 : -2)],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 2.4,
                      delay: p.delay,
                      repeat: Infinity,
                      repeatDelay: 0.6,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Narrative Status Pill */}
            <div className="absolute top-4 left-4 z-30 pointer-events-none">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-black/60 border border-white/10 text-zinc-300 backdrop-blur-md">
                {stage === 'pulling' && '⏳ Guionbajo jalando con fuerza la cuerda...'}
                {stage === 'snap' && '⚡ ¡TIRÓN MÁXIMO!'}
                {stage === 'fall' && '💨 ¡Woooah! Cae sentado en el piso'}
                {stage === 'landed' && '💥 ¡Plop!'}
                {stage === 'look_score' && '👀 ¡Mira el puntaje que trajiste!'}
                {stage === 'celebrate' && '🎉 ¡MISIÓN CUMPLIDA!'}
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              🚀 BOTTOM ACTION BAR & DASHBOARD TRANSITION
             ══════════════════════════════════════════════════════════ */}
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
