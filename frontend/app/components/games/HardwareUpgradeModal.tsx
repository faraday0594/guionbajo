'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from '@/lib/soundEffects';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';
import { UPGRADE_DEFINITIONS, type UpgradeStage } from '@/lib/guionbajoUpgrades';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface HardwareUpgradeModalProps {
  isOpen: boolean;
  newStage: UpgradeStage;         // El stage que acaba de desbloquear
  sublevelCompleted: string;       // Ej: "A1.2"
  onClose: () => void;
}

// ─── Fases de la cinemática ────────────────────────────────────────────────────

type CinemaStage =
  | 'alert'        // ACT 1: Alerta de sistema (0-1.5s)
  | 'installing'   // ACT 2: Instalando hardware (1.5-3.5s)
  | 'booting'      // ACT 3: Boot-up / sistema actualizado (3.5-5s)
  | 'celebrate';   // ACT 4: Celebración final (5s+)

// ─── Componente ───────────────────────────────────────────────────────────────

export default function HardwareUpgradeModal({
  isOpen,
  newStage,
  sublevelCompleted,
  onClose,
}: HardwareUpgradeModalProps) {
  const [cinemaStage, setCinemaStage] = useState<CinemaStage>('alert');
  const [installProgress, setInstallProgress] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const upgradeDef = UPGRADE_DEFINITIONS[newStage];
  const prevDef = UPGRADE_DEFINITIONS[Math.max(0, newStage - 1)];

  const clearAll = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (progressRef.current) clearInterval(progressRef.current);
  };

  const playSfx = (fn: () => void) => {
    try { fn(); } catch (_) {}
  };

  const runSequence = () => {
    clearAll();
    setCinemaStage('alert');
    setInstallProgress(0);
    setShowButton(false);

    // ACT 1 (0ms): Alerta de sistema — parpadeo rojo
    playSfx(() => sfx.playStrainRatchet());

    // ACT 2 (1400ms): Instalar hardware
    timersRef.current.push(
      setTimeout(() => {
        setCinemaStage('installing');
        setInstallProgress(0);
        // Barra de progreso animada
        let pct = 0;
        progressRef.current = setInterval(() => {
          pct += 2.5;
          setInstallProgress(Math.min(100, pct));
          if (pct >= 100) {
            if (progressRef.current) clearInterval(progressRef.current);
          }
        }, 50); // 50ms * 40 steps = 2s para llegar al 100%
      }, 1400)
    );

    // ACT 3 (3600ms): Boot-up / sistema actualizado
    timersRef.current.push(
      setTimeout(() => {
        setCinemaStage('booting');
        playSfx(() => sfx.playWhoosh());
      }, 3600)
    );

    // ACT 4 (5200ms): Celebración final + botón
    timersRef.current.push(
      setTimeout(() => {
        setCinemaStage('celebrate');
        playSfx(() => sfx.playVictoryFanfare());
      }, 5200)
    );

    // Botón aparece en 6200ms
    timersRef.current.push(
      setTimeout(() => {
        setShowButton(true);
      }, 6200)
    );
  };

  useEffect(() => {
    if (isOpen) {
      runSequence();
    } else {
      clearAll();
    }
    return () => clearAll();
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Colores y textos por acto ─────────────────────────────────────────────

  const isAlert = cinemaStage === 'alert';
  const isInstalling = cinemaStage === 'installing';
  const isBooting = cinemaStage === 'booting';
  const isCelebrate = cinemaStage === 'celebrate';

  const bgColor = isAlert
    ? 'from-red-950/95 via-slate-950/98 to-slate-950/98'
    : isInstalling
    ? 'from-slate-950/98 via-slate-900/95 to-slate-950/98'
    : isBooting
    ? 'from-emerald-950/95 via-slate-950/98 to-slate-950/98'
    : 'from-slate-950/98 via-[#0e1224]/98 to-slate-950/98';

  const borderColor = isAlert
    ? 'border-red-500/60'
    : isInstalling
    ? 'border-brand-cyan/40'
    : isBooting
    ? 'border-emerald-400/60'
    : 'border-yellow-400/60';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Panel principal */}
      <motion.div
        className={`
          relative z-10 w-full max-w-lg rounded-3xl border-2 ${borderColor}
          bg-gradient-to-br ${bgColor}
          shadow-2xl overflow-hidden
          transition-colors duration-700
        `}
        initial={{ scale: 0.7, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        {/* ── Scanlines overlay ── */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10 z-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,212,255,0.3) 0px, transparent 1px, transparent 3px)',
            backgroundSize: '100% 4px',
          }}
        />

        {/* ── Header del sistema ── */}
        <div className={`
          relative z-10 px-6 pt-5 pb-3 border-b
          ${isAlert ? 'border-red-500/40' : isBooting ? 'border-emerald-400/30' : isCelebrate ? 'border-yellow-400/30' : 'border-brand-cyan/20'}
          flex items-center gap-3
        `}>
          {/* Indicador de estado */}
          <div className={`
            w-3 h-3 rounded-full
            ${isAlert ? 'bg-red-500 animate-pulse' : isInstalling ? 'bg-brand-cyan animate-pulse' : isBooting ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}
          `} />
          <span className="font-mono text-xs font-bold tracking-widest text-slate-400 uppercase">
            GUIONBAJO_SYS v2.0 — Hardware Upgrade Protocol
          </span>
        </div>

        {/* ── Contenido central ── */}
        <div className="relative z-10 px-6 py-6 flex flex-col items-center gap-6">

          {/* ACT 1: ALERTA */}
          <AnimatePresence mode="wait">
            {isAlert && (
              <motion.div
                key="alert"
                className="flex flex-col items-center gap-4 w-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="text-5xl font-mono font-black text-red-400 tracking-widest"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                >
                  ⚠ UPGRADE DETECTED ⚠
                </motion.div>
                <div className="text-center">
                  <p className="text-slate-300 text-sm font-mono">
                    Nuevo hardware detectado: <span className="text-red-300 font-bold">{upgradeDef?.emoji} {upgradeDef?.name}</span>
                  </p>
                  <p className="text-slate-500 text-xs font-mono mt-1">
                    Iniciando protocolo de instalación...
                  </p>
                </div>
                {/* Avatar con cara de sorpresa */}
                <div className="w-24 h-28">
                  <TutorAvatar
                    size="lg"
                    emotion="nervous"
                    upgradeStage={prevDef?.stage as UpgradeStage}
                  />
                </div>
              </motion.div>
            )}

            {/* ACT 2: INSTALANDO */}
            {isInstalling && (
              <motion.div
                key="installing"
                className="flex flex-col items-center gap-5 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
              >
                <div className="text-brand-cyan font-mono text-lg font-bold tracking-wide">
                  ⚙ INSTALANDO HARDWARE...
                </div>

                {/* Avatar con accesorios apareciendo */}
                <div className="w-28 h-32 relative">
                  {/* Efecto magnético al instalar */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-brand-cyan/20 blur-lg"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                  />
                  <TutorAvatar
                    size="lg"
                    emotion="thinking"
                    upgradeStage={prevDef?.stage as UpgradeStage}
                  />
                </div>

                {/* Barra de progreso */}
                <div className="w-full">
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                    <span>Instalando: {upgradeDef?.name}</span>
                    <span>{Math.round(installProgress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-brand-cyan via-blue-400 to-brand-cyan rounded-full"
                      style={{ width: `${installProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  {/* Líneas de log */}
                  <div className="mt-2 space-y-0.5">
                    {installProgress > 20 && (
                      <p className="text-[10px] font-mono text-slate-500">✓ Kernel de hardware cargado</p>
                    )}
                    {installProgress > 50 && (
                      <p className="text-[10px] font-mono text-slate-500">✓ Calibrando servomotores...</p>
                    )}
                    {installProgress > 80 && (
                      <p className="text-[10px] font-mono text-green-400">✓ Sincronización completa</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ACT 3: BOOT-UP */}
            {isBooting && (
              <motion.div
                key="booting"
                className="flex flex-col items-center gap-5 w-full"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className="text-emerald-400 font-mono text-lg font-bold tracking-wide"
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ repeat: 3, duration: 0.4 }}
                >
                  ✓ SISTEMA ACTUALIZADO
                </motion.div>

                {/* Avatar con nuevo upgrade visible */}
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-emerald-400/25 blur-xl"
                    animate={{ scale: [1, 1.8, 1] }}
                    transition={{ duration: 1, repeat: 2 }}
                  />
                  <div className="w-28 h-32">
                    <TutorAvatar
                      size="lg"
                      emotion="happy"
                      upgradeStage={newStage}
                    />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-emerald-300 font-bold text-base">
                    {upgradeDef?.emoji} {upgradeDef?.name} instalado
                  </p>
                  <p className="text-slate-400 text-xs font-mono mt-1">
                    Subnivel {sublevelCompleted} completado — upgrade activo
                  </p>
                </div>
              </motion.div>
            )}

            {/* ACT 4: CELEBRACIÓN */}
            {isCelebrate && (
              <motion.div
                key="celebrate"
                className="flex flex-col items-center gap-5 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Confeti de estrellas */}
                <div className="relative w-full flex justify-center">
                  {['✨', '⭐', '🌟', '💫', '✨'].map((star, i) => (
                    <motion.span
                      key={i}
                      className="absolute text-xl"
                      initial={{ y: 0, x: (i - 2) * 40, opacity: 1 }}
                      animate={{ y: -60, opacity: 0 }}
                      transition={{ delay: i * 0.12, duration: 1.2 }}
                    >
                      {star}
                    </motion.span>
                  ))}
                </div>

                {/* Título del upgrade */}
                <div className="text-center space-y-1">
                  <p className="text-yellow-300 font-mono text-xs font-bold tracking-widest uppercase">
                    UPGRADE DESBLOQUEADO
                  </p>
                  <p className="text-4xl">{upgradeDef?.emoji}</p>
                  <p className="text-white font-black text-xl tracking-wide">{upgradeDef?.name}</p>
                  <p className="text-slate-400 text-sm">{upgradeDef?.desc}</p>
                </div>

                {/* Avatar en modo victoria con nuevo upgrade */}
                <div className="relative">
                  <motion.div
                    className="absolute -inset-4 rounded-full bg-gradient-to-r from-yellow-400/20 via-brand-cyan/20 to-yellow-400/20 blur-xl"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  />
                  <div className="w-28 h-32 relative z-10">
                    <TutorAvatar
                      size="lg"
                      emotion="victory"
                      upgradeStage={newStage}
                    />
                  </div>
                </div>

                {/* Subtitle nivel completado */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-2 text-center">
                  <p className="text-slate-300 text-xs font-mono">
                    Nivel <span className="text-brand-cyan font-bold">{sublevelCompleted}</span> completado
                    {' — '}
                    Stage <span className="text-yellow-300 font-bold">{newStage}/8</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer con botón ── */}
        <div className="relative z-10 px-6 pb-6 pt-0 flex justify-center">
          <AnimatePresence>
            {showButton && (
              <motion.button
                className="
                  px-8 py-3 rounded-2xl font-black text-sm tracking-wide
                  bg-gradient-to-r from-yellow-400 via-brand-cyan to-yellow-400
                  text-slate-950 shadow-lg shadow-brand-cyan/30
                  hover:shadow-brand-cyan/50 hover:scale-105
                  transition-all
                "
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={onClose}
              >
                ¡Continuar! →
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
