'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TutorAvatar, { TutorState, TutorEmotion } from './TutorAvatar';
import type { UpgradeStage } from '@/lib/guionbajoUpgrades';
import { ArrowLeftRight, Minimize2, Sparkles, Send } from 'lucide-react';

interface Guionbajo3DFloatingCompanionProps {
  state: TutorState;
  text?: string;
  audioProgress?: number;
  emotion?: TutorEmotion;
  audioElement?: HTMLAudioElement | null;
  upgradeStage?: UpgradeStage;
  phaseKey?: string | number;
}

export default function Guionbajo3DFloatingCompanion({
  state,
  text = '',
  audioProgress = 0,
  emotion,
  audioElement,
  upgradeStage = 0,
  phaseKey = 0,
}: Guionbajo3DFloatingCompanionProps) {
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [minimized, setMinimized] = useState(false);
  const [flightKey, setFlightKey] = useState(0);
  const [isFlyingIn, setIsFlyingIn] = useState(true);

  // Trigger fly-in when the lesson mounts or when phase changes
  useEffect(() => {
    setIsFlyingIn(true);
    const t = setTimeout(() => setIsFlyingIn(false), 1800);
    return () => clearTimeout(t);
  }, [phaseKey, flightKey]);

  const triggerFlyAgain = () => {
    setFlightKey((k) => k + 1);
  };

  // When parked on the right side, Guionbajo looks left (inward toward the board)
  // When parked on the left side, Guionbajo looks right (inward toward the board)
  const lookDirection = side === 'right' ? 'left' : 'right';

  if (minimized) {
    return (
      <div
        className={`fixed bottom-20 ${
          side === 'right' ? 'right-4' : 'left-4'
        } z-40 pointer-events-auto`}
      >
        <button
          type="button"
          onClick={() => {
            setMinimized(false);
            triggerFlyAgain();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-brand-cyan/50 text-brand-cyan text-xs font-bold shadow-2xl hover:bg-slate-900 transition-all"
          title="Desplegar a Guionbajo 3D volando"
        >
          <Sparkles size={14} className="animate-spin" />
          <span>Guionbajo 3D</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed top-1/2 -translate-y-1/2 ${
        side === 'right' ? 'right-2 sm:right-5' : 'left-2 sm:left-5'
      } z-40 pointer-events-none select-none flex flex-col items-center`}
      style={{ perspective: '1100px' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${side}-${flightKey}`}
          initial={{
            x: side === 'right' ? -280 : 280,
            y: -180,
            scale: 0.45,
            rotateZ: side === 'right' ? 22 : -22,
            opacity: 0,
          }}
          animate={{
            x: 0,
            y: [0, -10, 0],
            scale: 1,
            rotateZ: isFlyingIn ? (side === 'right' ? -8 : 8) : 0,
            opacity: 1,
          }}
          transition={{
            x: { type: 'spring', stiffness: 70, damping: 14, duration: 1.4 },
            y: {
              duration: 3.4,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            scale: { type: 'spring', stiffness: 80, damping: 15 },
            rotateZ: { duration: 0.8, ease: 'easeOut' },
            opacity: { duration: 0.35 },
          }}
          className="relative flex flex-col items-center"
        >
          {/* Halo de propulsión durante el vuelo de entrada */}
          {isFlyingIn && (
            <motion.div
              initial={{ opacity: 0.9, scale: 1.3 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 rounded-full bg-brand-cyan/25 blur-2xl pointer-events-none"
            />
          )}

          {/* Avatar 3D Volumétrico mirando hacia dentro de la pizarra */}
          <div className="drop-shadow-[0_20px_35px_rgba(0,212,255,0.28)]">
            <TutorAvatar
              state={state}
              text={text}
              audioProgress={audioProgress}
              emotion={emotion}
              size="md"
              headOnly={false}
              audioElement={audioElement}
              upgradeStage={upgradeStage}
              mode3D={true}
              lookDirection={lookDirection}
              pointAtBoard={state === 'speaking' || isFlyingIn}
            />
          </div>

          {/* Etiqueta flotante de estado + controles compactos */}
          <div className="mt-5 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 border border-brand-cyan/40 backdrop-blur-md shadow-xl">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
            <span className="text-[10px] font-mono font-bold text-white tracking-wide">
              {isFlyingIn
                ? 'Volando...'
                : state === 'speaking'
                ? 'Explicando'
                : state === 'listening'
                ? 'Escuchando'
                : '3D Activo'}
            </span>

            <button
              type="button"
              onClick={() => setSide((s) => (s === 'right' ? 'left' : 'right'))}
              className="p-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-brand-cyan transition-colors"
              title="Cambiar de lado de la pizarra"
            >
              <ArrowLeftRight size={11} />
            </button>

            <button
              type="button"
              onClick={triggerFlyAgain}
              className="p-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-brand-cyan transition-colors"
              title="Repetir vuelo de entrada"
            >
              <Send size={11} />
            </button>

            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="p-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-rose-300 transition-colors"
              title="Minimizar Guionbajo 3D"
            >
              <Minimize2 size={11} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
