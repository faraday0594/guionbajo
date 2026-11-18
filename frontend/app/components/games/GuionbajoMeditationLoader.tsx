'use client';

import React, { useState, useEffect } from 'react';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';
import {
  getCurrentUpgradeStage,
  UPGRADE_DEFINITIONS,
  type UpgradeStage,
} from '@/lib/guionbajoUpgrades';

export interface GuionbajoMeditationLoaderProps {
  title?: string;
  subtitle?: string;
  sublevel?: string;
  upgradeStage?: UpgradeStage;
  compact?: boolean;
}

type EyePeekState = 'none' | 'right' | 'left';

/**
 * Animación en código que utiliza el componente REAL <TutorAvatar /> en la fase
 * evolutiva exacta donde va el estudiante (Stage 0 a Stage 8 según sublevel/progreso),
 * en postura de Meditación Budista (ojos cerrados con sus obturadores reales, brazos
 * plegados en mudra y apertura rápida de un ojo para espiar al estudiante).
 */
export default function GuionbajoMeditationLoader({
  title = 'Guionbajo está fabricando la escena...',
  subtitle,
  sublevel,
  upgradeStage,
  compact = false,
}: GuionbajoMeditationLoaderProps) {
  const [peekEye, setPeekEye] = useState<EyePeekState>('none');
  const [resolvedStage, setResolvedStage] = useState<UpgradeStage>(
    upgradeStage !== undefined ? upgradeStage : 0
  );

  useEffect(() => {
    if (upgradeStage !== undefined) {
      setResolvedStage(upgradeStage);
    } else {
      setResolvedStage(getCurrentUpgradeStage(sublevel));
    }
  }, [sublevel, upgradeStage]);

  useEffect(() => {
    let mounted = true;
    const timeoutIds: NodeJS.Timeout[] = [];

    const scheduleNextPeek = () => {
      const delay = 1700 + Math.random() * 1200;
      const mainTimer = setTimeout(() => {
        if (!mounted) return;
        const whichEye: EyePeekState = Math.random() > 0.25 ? 'right' : 'left';
        setPeekEye(whichEye);

        const closeTimer = setTimeout(() => {
          if (!mounted) return;
          setPeekEye('none');

          if (Math.random() < 0.45) {
            const doubleOpenTimer = setTimeout(() => {
              if (!mounted) return;
              setPeekEye(whichEye);
              const doubleCloseTimer = setTimeout(() => {
                if (!mounted) return;
                setPeekEye('none');
                scheduleNextPeek();
              }, 210);
              timeoutIds.push(doubleCloseTimer);
            }, 140);
            timeoutIds.push(doubleOpenTimer);
          } else {
            scheduleNextPeek();
          }
        }, 270);

        timeoutIds.push(closeTimer);
      }, delay);

      timeoutIds.push(mainTimer);
    };

    const initialTimer = setTimeout(() => {
      if (!mounted) return;
      setPeekEye('right');
      const closeInitial = setTimeout(() => {
        if (!mounted) return;
        setPeekEye('none');
        scheduleNextPeek();
      }, 280);
      timeoutIds.push(closeInitial);
    }, 950);
    timeoutIds.push(initialTimer);

    return () => {
      mounted = false;
      timeoutIds.forEach(clearTimeout);
    };
  }, []);

  const stageDef = UPGRADE_DEFINITIONS[resolvedStage] || UPGRADE_DEFINITIONS[0];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-gradient-to-br from-[#060814] via-[#0d1226] to-[#05060d] relative overflow-hidden select-none">
      {/* Ambient Zen Aura Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/12 via-purple-600/10 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Contenedor del Avatar Real de Guionbajo en su Fase Actual */}
        <div
          className={`relative flex items-center justify-center ${
            compact ? 'py-6' : 'py-9 sm:py-11'
          }`}
        >
          {/* Halo de Meditación Zen detrás del Avatar Real */}
          <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-amber-500/15 via-cyan-400/15 to-purple-500/15 blur-xl animate-pulse pointer-events-none" />
          <div className="absolute w-36 h-36 rounded-full border border-dashed border-amber-400/35 animate-[spin_20s_linear_infinite] pointer-events-none" />

          {/* El componente REAL TutorAvatar con la fase del estudiante */}
          <TutorAvatar
            size={compact ? 'md' : 'lg'}
            state="idle"
            emotion="neutral"
            upgradeStage={resolvedStage}
            meditating={true}
            peekEye={peekEye}
            sparkBulb={true}
            crtLabel="_"
          />
        </div>

        {/* Text Banner Below Real Meditating Guionbajo */}
        <div className="max-w-md space-y-1.5 mt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>
              {stageDef.emoji} Fase {resolvedStage}: {stageDef.name} • Meditando
            </span>
          </div>

          <h4 className="text-sm sm:text-base font-extrabold text-white tracking-wide font-outfit">
            {title}
          </h4>

          <p className="text-xs text-zinc-300/90 max-w-sm mx-auto leading-relaxed">
            {subtitle || 'Guionbajo está concentrado preparando el escenario interactivo...'}
          </p>
        </div>
      </div>
    </div>
  );
}
