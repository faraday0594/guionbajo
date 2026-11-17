'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TutorAvatar, { TutorState, TutorEmotion } from './TutorAvatar';
import type { UpgradeStage } from '@/lib/guionbajoUpgrades';
import { ArrowLeftRight, CornerRightUp, Send } from 'lucide-react';

interface Guionbajo3DFloatingCompanionProps {
  state: TutorState;
  text?: string;
  audioProgress?: number;
  emotion?: TutorEmotion;
  audioElement?: HTMLAudioElement | null;
  upgradeStage?: UpgradeStage;
  phaseKey?: string | number;
  deployed: boolean;
  onDockChange: (deployed: boolean) => void;
}

export default function Guionbajo3DFloatingCompanion({
  state,
  text = '',
  audioProgress = 0,
  emotion,
  audioElement,
  upgradeStage = 0,
  phaseKey = 0,
  deployed,
  onDockChange,
}: Guionbajo3DFloatingCompanionProps) {
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [flightKey, setFlightKey] = useState(0);
  const [isLaunching, setIsLaunching] = useState(true);
  const [currentYaw, setCurrentYaw] = useState(0);
  const [dockOffset, setDockOffset] = useState<{ x: number; y: number }>({ x: -120, y: -320 });
  const anchorRef = useRef<HTMLDivElement>(null);

  const targetYaw = side === 'right' ? -28 : 28;
  const lookDirection = side === 'right' ? 'left' : 'right';

  // Calculate exact delta from #guionbajo-toolbar-dock to resting 3D position
  const computeDockDelta = () => {
    if (typeof window === 'undefined') return;
    const dockEl = document.getElementById('guionbajo-toolbar-dock');
    const anchorEl = anchorRef.current;
    if (dockEl && anchorEl) {
      const dockRect = dockEl.getBoundingClientRect();
      const anchorRect = anchorEl.getBoundingClientRect();
      const dockCenterX = dockRect.left + dockRect.width / 2;
      const dockCenterY = dockRect.top + dockRect.height / 2;
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      const anchorCenterY = anchorRect.top + anchorRect.height / 2;
      setDockOffset({
        x: dockCenterX - anchorCenterX,
        y: dockCenterY - anchorCenterY,
      });
    }
  };

  // Trigger launch animation from toolbar dock when deployed or when phase changes
  useEffect(() => {
    if (!deployed) return;
    computeDockDelta();
    setIsLaunching(true);
    // Start flat (0 deg) in the toolbar, then morph to 3D angle (-28 / +28 deg) as it descends
    setCurrentYaw(0);
    const tYaw = setTimeout(() => setCurrentYaw(targetYaw), 260);
    const tDone = setTimeout(() => setIsLaunching(false), 1450);
    return () => {
      clearTimeout(tYaw);
      clearTimeout(tDone);
    };
  }, [deployed, phaseKey, flightKey, side, targetYaw]);

  if (!deployed) {
    return null;
  }

  return (
    <div
      ref={anchorRef}
      className={`hidden lg:flex fixed top-[54%] -translate-y-1/2 ${
        side === 'right' ? 'right-5 xl:right-8' : 'left-5 xl:left-8'
      } z-40 pointer-events-none select-none flex-col items-center`}
      style={{ perspective: '1100px' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${side}-${flightKey}`}
          initial={{
            x: dockOffset.x,
            y: dockOffset.y,
            scale: 0.48,
            rotateZ: 0,
            opacity: 1,
          }}
          animate={{
            x: [dockOffset.x, dockOffset.x * 0.35, 0],
            y: [dockOffset.y, dockOffset.y * 0.25, 0],
            scale: [0.48, 0.82, 1],
            rotateZ: [0, side === 'right' ? -12 : 12, 0],
            opacity: 1,
          }}
          exit={{
            x: dockOffset.x,
            y: dockOffset.y,
            scale: 0.48,
            rotateZ: 0,
            opacity: 0.6,
            transition: { duration: 0.65, ease: 'easeInOut' },
          }}
          transition={{
            duration: 1.35,
            times: [0, 0.55, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative flex flex-col items-center"
        >
          {/* Floating bobbing wrapper once settled */}
          <motion.div
            animate={
              isLaunching
                ? { y: 0 }
                : {
                    y: [0, -9, 0],
                  }
            }
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative flex flex-col items-center"
          >
            {/* Estela de plasma al despegar de la toolbar */}
            {isLaunching && (
              <motion.div
                initial={{ opacity: 0.95, scale: 0.7 }}
                animate={{ opacity: 0, scale: 1.9 }}
                transition={{ duration: 1.1 }}
                className="absolute -inset-4 rounded-full bg-brand-cyan/30 blur-2xl pointer-events-none"
              />
            )}

            {/* Avatar 3D Volumétrico mirando hacia dentro de la pizarra */}
            <div className="drop-shadow-[0_22px_36px_rgba(0,212,255,0.3)]">
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
                yawAngle={currentYaw}
                pointAtBoard={state === 'speaking' || isLaunching}
              />
            </div>

            {/* Controles compactos debajo del robot 3D */}
            <div className="mt-5 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/90 border border-brand-cyan/40 backdrop-blur-md shadow-xl">
              <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
              <span className="text-[10px] font-mono font-bold text-white tracking-wide">
                {isLaunching
                  ? 'Despegando...'
                  : state === 'speaking'
                  ? 'Explicando'
                  : state === 'listening'
                  ? 'Escuchando'
                  : '3D en Vuelo'}
              </span>

              <button
                type="button"
                onClick={() => setSide((s) => (s === 'right' ? 'left' : 'right'))}
                className="p-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-brand-cyan transition-colors cursor-pointer"
                title="Cambiar de lado de la pizarra"
              >
                <ArrowLeftRight size={11} />
              </button>

              <button
                type="button"
                onClick={() => setFlightKey((k) => k + 1)}
                className="p-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-brand-cyan transition-colors cursor-pointer"
                title="Repetir despegue desde la barra superior"
              >
                <Send size={11} />
              </button>

              <button
                type="button"
                onClick={() => onDockChange(false)}
                className="p-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                title="Regresar a su hueco en la barra superior"
              >
                <CornerRightUp size={11} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
