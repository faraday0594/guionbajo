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
  | 'alert'        // ACT 1: Alerta de sistema (0-1.4s)
  | 'installing'   // ACT 2: Deslizamiento y ensamblaje de piezas (1.4-4.2s)
  | 'booting'      // ACT 3: Boot-up / sistema actualizado (4.2-5.6s)
  | 'celebrate';   // ACT 4: Celebración final (5.6s+)

// ─── Componente de Piezas Deslizantes ─────────────────────────────────────────

function SlidingHardwarePiece({
  stage,
  isSliding,
  isSnapped,
}: {
  stage: UpgradeStage;
  isSliding: boolean;
  isSnapped: boolean;
}) {
  if (isSnapped) return null; // Una vez acoplado, el propio avatar lo renderiza

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
      {/* 🦾 STAGE 1: Brazos Gruesos Cromados deslizándose desde ambos lados */}
      {stage === 1 && isSliding && (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Brazo Izquierdo entrando desde la izquierda */}
          <motion.div
            className="absolute left-1 flex flex-col items-center"
            initial={{ x: -140, opacity: 0, rotate: -35 }}
            animate={{ x: 26, opacity: 1, rotate: 15 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120, duration: 0.9 }}
          >
            <div className="w-4 h-5 bg-gradient-to-r from-slate-400 via-slate-100 to-slate-500 border border-slate-300 rounded shadow-lg" />
            <div className="w-5 h-5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_#00d4ff]" />
            <div className="w-4 h-7 bg-gradient-to-r from-slate-500 via-slate-200 to-slate-700 border-2 border-slate-400 border-b-4 border-b-cyan-400 rounded-b shadow-lg" />
            <span className="text-[9px] font-mono font-bold text-cyan-300 mt-1 whitespace-nowrap bg-black/70 px-1 rounded">BRAZO_L</span>
          </motion.div>

          {/* Brazo Derecho entrando desde la derecha */}
          <motion.div
            className="absolute right-1 flex flex-col items-center"
            initial={{ x: 140, opacity: 0, rotate: 35 }}
            animate={{ x: -26, opacity: 1, rotate: -15 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120, duration: 0.9 }}
          >
            <div className="w-4 h-5 bg-gradient-to-r from-slate-400 via-slate-100 to-slate-500 border border-slate-300 rounded shadow-lg" />
            <div className="w-5 h-5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_#00d4ff]" />
            <div className="w-4 h-7 bg-gradient-to-r from-slate-500 via-slate-200 to-slate-700 border-2 border-slate-400 border-b-4 border-b-cyan-400 rounded-b shadow-lg" />
            <span className="text-[9px] font-mono font-bold text-cyan-300 mt-1 whitespace-nowrap bg-black/70 px-1 rounded">BRAZO_R</span>
          </motion.div>
        </div>
      )}

      {/* 🚀 STAGE 2: Jetpack Doble Tobera deslizándose desde abajo hacia la espalda */}
      {stage === 2 && isSliding && (
        <motion.div
          className="flex items-center gap-6"
          initial={{ y: 150, x: -60, scale: 0.5, opacity: 0 }}
          animate={{ y: 14, x: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 110, duration: 0.95 }}
        >
          {/* Canister izquierdo */}
          <div className="flex flex-col items-center">
            <div className="w-4 h-9 bg-gradient-to-b from-slate-300 via-slate-700 to-slate-900 border border-slate-400 rounded-t shadow-lg" />
            <div className="w-3 h-2 bg-slate-800 border-t border-yellow-400" />
            <div className="w-3 h-6 bg-gradient-to-b from-white via-cyan-400 to-transparent rounded-full blur-[1px] animate-pulse" />
          </div>
          {/* Canister derecho */}
          <div className="flex flex-col items-center">
            <div className="w-4 h-9 bg-gradient-to-b from-slate-300 via-slate-700 to-slate-900 border border-slate-400 rounded-t shadow-lg" />
            <div className="w-3 h-2 bg-slate-800 border-t border-yellow-400" />
            <div className="w-3 h-6 bg-gradient-to-b from-white via-cyan-400 to-transparent rounded-full blur-[1px] animate-pulse" />
          </div>
        </motion.div>
      )}

      {/* 🥽 STAGE 3: Visor HUD Neón deslizándose desde arriba */}
      {stage === 3 && isSliding && (
        <motion.div
          className="flex flex-col items-center"
          initial={{ y: -140, scale: 1.8, opacity: 0 }}
          animate={{ y: -22, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 130, duration: 0.9 }}
        >
          <div className="w-24 h-9 rounded-lg bg-cyan-400/50 border-2 border-cyan-300 shadow-[0_0_20px_#00f0ff] flex items-center justify-between px-2">
            <span className="text-[8px] font-mono font-bold text-white">HUD</span>
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ff0000] animate-ping" />
            <span className="text-[8px] font-mono font-bold text-white">SYS</span>
          </div>
          <span className="text-[8px] font-mono text-cyan-200 mt-1 bg-black/80 px-1 rounded">ACOPLANDO VISOR</span>
        </motion.div>
      )}

      {/* 🛡️ STAGE 4: Blindaje Dorado deslizándose (Hombreras + Peto) */}
      {stage === 4 && isSliding && (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Hombrera izquierda */}
          <motion.div
            className="absolute left-6 w-5 h-8 rounded-lg bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-700 border-2 border-yellow-200 shadow-[0_0_15px_rgba(245,158,11,0.7)]"
            initial={{ x: -140, y: -40, opacity: 0 }}
            animate={{ x: 28, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120 }}
          />
          {/* Hombrera derecha */}
          <motion.div
            className="absolute right-6 w-5 h-8 rounded-lg bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-700 border-2 border-yellow-200 shadow-[0_0_15px_rgba(245,158,11,0.7)]"
            initial={{ x: 140, y: -40, opacity: 0 }}
            animate={{ x: -28, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120 }}
          />
          {/* Peto frontal */}
          <motion.div
            className="w-16 h-4 rounded-b-md bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-600 border border-yellow-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 4, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120 }}
          />
        </div>
      )}

      {/* 📡 STAGE 5: Bobina Tesla descendiendo desde arriba con relámpagos */}
      {stage === 5 && isSliding && (
        <motion.div
          className="flex flex-col items-center"
          initial={{ y: -150, opacity: 0 }}
          animate={{ y: -50, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 120 }}
        >
          <div className="w-10 h-8 flex flex-col items-center justify-center relative">
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
            <div className="w-6 h-1.5 rounded-full border border-cyan-400 shadow-[0_0_8px_#00d4ff] mt-0.5" />
            <div className="w-8 h-2 rounded-full border border-cyan-400 shadow-[0_0_8px_#00d4ff] mt-0.5" />
            <div className="w-10 h-2.5 rounded-full border border-cyan-400 shadow-[0_0_8px_#00d4ff] mt-0.5" />
            {/* Relámpago */}
            <div className="absolute -left-2 top-0 text-yellow-300 text-xs animate-bounce">⚡</div>
            <div className="absolute -right-2 top-2 text-yellow-300 text-xs animate-pulse">⚡</div>
          </div>
          <span className="text-[8px] font-mono text-cyan-300 bg-black/80 px-1 rounded mt-1">BOBINA TESLA</span>
        </motion.div>
      )}

      {/* ⚔️ STAGE 6: Espadas Gemelas Cyber deslizándose diagonalmente a la espalda */}
      {stage === 6 && isSliding && (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Espada izquierda */}
          <motion.div
            className="absolute left-6 flex flex-col items-center filter drop-shadow-[0_0_10px_#a855f7]"
            initial={{ x: -160, y: -40, rotate: -70, opacity: 0 }}
            animate={{ x: 20, y: 16, rotate: -48, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120 }}
          >
            <div className="w-2 h-12 bg-gradient-to-b from-white via-purple-400 to-cyan-400 rounded-t border border-purple-200" />
            <div className="w-4 h-1.5 bg-slate-400 rounded-sm" />
            <div className="w-1.5 h-3.5 bg-slate-800" />
          </motion.div>

          {/* Espada derecha */}
          <motion.div
            className="absolute right-6 flex flex-col items-center filter drop-shadow-[0_0_10px_#a855f7]"
            initial={{ x: 160, y: -40, rotate: 70, opacity: 0 }}
            animate={{ x: -20, y: 16, rotate: 48, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120 }}
          >
            <div className="w-2 h-12 bg-gradient-to-b from-white via-purple-400 to-cyan-400 rounded-t border border-purple-200" />
            <div className="w-4 h-1.5 bg-slate-400 rounded-sm" />
            <div className="w-1.5 h-3.5 bg-slate-800" />
          </motion.div>
        </div>
      )}

      {/* 🛸 STAGE 7: Mini Dron descendiendo en espiral con luz roja */}
      {stage === 7 && isSliding && (
        <motion.div
          className="flex flex-col items-center"
          initial={{ x: -180, y: -120, scale: 2, opacity: 0 }}
          animate={{ x: 50, y: -10, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_12px_#ff0000] animate-ping" />
          <div className="px-2 py-1 rounded bg-slate-900 border border-cyan-400 flex items-center gap-1 shadow-lg">
            <span className="text-cyan-400 text-xs">🛸</span>
            <span className="text-[8px] font-mono text-cyan-300 font-bold">DRON_ORBIT</span>
          </div>
        </motion.div>
      )}

      {/* 👑 STAGE 8: Corona Maestra descendiendo de los cielos */}
      {stage === 8 && isSliding && (
        <motion.div
          className="flex flex-col items-center"
          initial={{ y: -180, scale: 2.2, opacity: 0 }}
          animate={{ y: -52, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 110 }}
        >
          <div className="text-4xl filter drop-shadow-[0_0_20px_#f59e0b] animate-bounce">👑</div>
          <span className="text-[9px] font-mono font-bold text-yellow-300 bg-black/80 px-2 py-0.5 rounded shadow">
            FORMA_MAESTRA
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function HardwareUpgradeModal({
  isOpen,
  newStage,
  sublevelCompleted,
  onClose,
}: HardwareUpgradeModalProps) {
  const [cinemaStage, setCinemaStage] = useState<CinemaStage>('alert');
  const [installProgress, setInstallProgress] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [isSnapped, setIsSnapped] = useState(false);
  const [showSnapShockwave, setShowSnapShockwave] = useState(false);
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
    setIsSliding(false);
    setIsSnapped(false);
    setShowSnapShockwave(false);
    setShowButton(false);

    // ACT 1 (0ms): Alerta de sistema — parpadeo rojo
    playSfx(() => sfx.playStrainRatchet());

    // ACT 2 (1400ms): Inicia instalación de hardware
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
        }, 50); // 50ms * 40 = 2000ms
      }, 1400)
    );

    // ACT 2B (2200ms): Las piezas se deslizan físicamente desde afuera hacia Guionbajo
    timersRef.current.push(
      setTimeout(() => {
        setIsSliding(true);
        playSfx(() => sfx.playWhoosh());
      }, 2200)
    );

    // ACT 2C (3200ms): ¡SNAP / LOCK! Las piezas encajan y reemplazan lo anterior
    timersRef.current.push(
      setTimeout(() => {
        setIsSnapped(true);
        setShowSnapShockwave(true);
        playSfx(() => sfx.playStreakFanfare());
      }, 3200)
    );

    // ACT 3 (4200ms): Boot-up / sistema actualizado
    timersRef.current.push(
      setTimeout(() => {
        setCinemaStage('booting');
        setShowSnapShockwave(false);
      }, 4200)
    );

    // ACT 4 (5600ms): Celebración final + botón
    timersRef.current.push(
      setTimeout(() => {
        setCinemaStage('celebrate');
        playSfx(() => sfx.playVictoryFanfare());
      }, 5600)
    );

    // Botón aparece en 6400ms
    timersRef.current.push(
      setTimeout(() => {
        setShowButton(true);
      }, 6400)
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
          relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border-2 ${borderColor}
          bg-gradient-to-br ${bgColor}
          shadow-2xl
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
                  className="text-4xl sm:text-5xl font-mono font-black text-red-400 tracking-widest text-center"
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
                    Iniciando ensamblaje de componentes...
                  </p>
                </div>
                <div className="min-h-[190px] w-full flex items-center justify-center relative my-2">
                  <TutorAvatar
                    size="lg"
                    emotion="nervous"
                    upgradeStage={prevDef?.stage as UpgradeStage}
                  />
                </div>
              </motion.div>
            )}

            {/* ACT 2: INSTALANDO Y DESLIZANDO PIEZAS */}
            {isInstalling && (
              <motion.div
                key="installing"
                className="flex flex-col items-center gap-4 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
              >
                <div className="text-brand-cyan font-mono text-base sm:text-lg font-bold tracking-wide flex items-center gap-2">
                  <span className="animate-spin">⚙</span>
                  <span>
                    {isSnapped ? '✓ PIEZA ACOPLADA Y CALIBRADA' : isSliding ? '>>> ACOPLANDO NUEVA PIEZA...' : 'ESCANEANDO BAHÍA DE HARDWARE...'}
                  </span>
                </div>

                {/* ZONA DE ENSAMBLAJE DE AVATAR */}
                <div className="min-h-[220px] w-full relative flex items-center justify-center my-2">
                  {/* Círculo de escaneo / mira telescópica */}
                  <div className="absolute inset-0 border border-brand-cyan/20 rounded-full animate-ping opacity-25 pointer-events-none" />

                  {/* Shockwave cuando encajan las piezas */}
                  {showSnapShockwave && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-cyan-300 bg-cyan-400/30"
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  )}

                  {/* PIEZAS DESLIZÁNDOSE DESDE LOS LADOS */}
                  <SlidingHardwarePiece
                    stage={newStage}
                    isSliding={isSliding}
                    isSnapped={isSnapped}
                  />

                  {/* Avatar: Antes del snap muestra prevStage, después del snap muestra newStage */}
                  <motion.div
                    animate={showSnapShockwave ? { scale: [1, 1.15, 1], y: [0, -4, 0] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <TutorAvatar
                      size="lg"
                      emotion={isSnapped ? 'victory' : 'thinking'}
                      upgradeStage={isSnapped ? newStage : (prevDef?.stage as UpgradeStage)}
                    />
                  </motion.div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full">
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                    <span>Ensamblando: {upgradeDef?.name}</span>
                    <span className="text-cyan-300 font-bold">{Math.round(installProgress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-brand-cyan via-blue-400 to-brand-cyan rounded-full"
                      style={{ width: `${installProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  {/* Líneas de log dinámicas */}
                  <div className="mt-2 space-y-0.5">
                    {installProgress > 15 && (
                      <p className="text-[10px] font-mono text-slate-500">✓ Alineando coordenadas de bahía...</p>
                    )}
                    {installProgress > 45 && (
                      <p className="text-[10px] font-mono text-cyan-400">⚡ Deslizando {upgradeDef?.name} hacia el chasis...</p>
                    )}
                    {installProgress > 75 && (
                      <p className="text-[10px] font-mono text-green-400 font-bold">✓ ¡Pieza bloqueada y asegurada con éxito!</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ACT 3: BOOT-UP */}
            {isBooting && (
              <motion.div
                key="booting"
                className="flex flex-col items-center gap-4 w-full"
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
                <div className="min-h-[210px] w-full flex items-center justify-center relative my-2">
                  <motion.div
                    className="absolute inset-0 max-w-[200px] max-h-[200px] m-auto rounded-full bg-emerald-400/25 blur-xl pointer-events-none"
                    animate={{ scale: [1, 1.8, 1] }}
                    transition={{ duration: 1, repeat: 2 }}
                  />
                  <TutorAvatar
                    size="lg"
                    emotion="happy"
                    upgradeStage={newStage}
                  />
                </div>

                <div className="relative z-20 text-center mt-2">
                  <p className="text-emerald-300 font-bold text-base">
                    {upgradeDef?.emoji} {upgradeDef?.name} instalado
                  </p>
                  <p className="text-slate-400 text-xs font-mono mt-1">
                    Subnivel {sublevelCompleted} completado — hardware activo
                  </p>
                </div>
              </motion.div>
            )}

            {/* ACT 4: CELEBRACIÓN */}
            {isCelebrate && (
              <motion.div
                key="celebrate"
                className="flex flex-col items-center gap-4 w-full"
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
                <div className="min-h-[220px] w-full flex items-center justify-center relative my-2">
                  <motion.div
                    className="absolute inset-0 max-w-[220px] max-h-[220px] m-auto rounded-full bg-gradient-to-r from-yellow-400/20 via-brand-cyan/20 to-yellow-400/20 blur-xl pointer-events-none"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  />
                  <div className="relative z-10">
                    <TutorAvatar
                      size="lg"
                      emotion="victory"
                      upgradeStage={newStage}
                    />
                  </div>
                </div>

                {/* Subtitle nivel completado posicionado claramente DEBAJO */}
                <div className="relative z-20 bg-slate-800/80 border border-slate-700/80 rounded-2xl px-5 py-2.5 text-center shadow-lg mt-2">
                  <p className="text-slate-300 text-xs sm:text-sm font-mono font-medium">
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
                  transition-all cursor-pointer
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
