'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Play,
  Trophy,
  Check,
  RotateCcw,
  Zap,
  Sliders,
  Layers,
  Award,
  Shield,
  Eye,
} from 'lucide-react';
import TutorAvatar, { TutorState, TutorEmotion } from '@/app/components/TutorPanel/TutorAvatar';
import HardwareUpgradeModal from '@/app/components/games/HardwareUpgradeModal';
import CelebrationModal from '@/app/components/games/CelebrationModal';
import {
  UPGRADE_DEFINITIONS,
  UPGRADE_TRIGGERS,
  type UpgradeStage,
} from '@/lib/guionbajoUpgrades';
import { toast } from 'react-hot-toast';

export default function GuionbajoLabPage() {
  const [selectedStage, setSelectedStage] = useState<UpgradeStage>(0);
  const [selectedEmotion, setSelectedEmotion] = useState<TutorEmotion>('happy');
  const [selectedState, setSelectedState] = useState<TutorState>('idle');
  const [selectedSize, setSelectedSize] = useState<'sm' | 'md' | 'lg' | 'toolbar'>('lg');
  
  // Modales interactivos de prueba
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  const currentDef = UPGRADE_DEFINITIONS[selectedStage];

  // Guardar en localStorage para que se vea reflejado en toda la app
  const applyStageToLocalStorage = (stage: UpgradeStage) => {
    try {
      // Mapear el stage a un subnivel completado representativo
      const sublevelMap: Record<UpgradeStage, { sublevel: string; classIndex: number }> = {
        0: { sublevel: 'A1.1', classIndex: 1 },
        1: { sublevel: 'A1.2', classIndex: 4 },
        2: { sublevel: 'A1.4', classIndex: 4 },
        3: { sublevel: 'A2.2', classIndex: 4 },
        4: { sublevel: 'A2.4', classIndex: 4 },
        5: { sublevel: 'B1.2', classIndex: 4 },
        6: { sublevel: 'B1.4', classIndex: 4 },
        7: { sublevel: 'B2.2', classIndex: 4 },
        8: { sublevel: 'B2.4', classIndex: 4 },
      };

      const target = sublevelMap[stage];
      localStorage.setItem(
        'guionbajo_class_just_completed',
        JSON.stringify({
          sublevel: target.sublevel,
          classIndex: target.classIndex,
          timestamp: Date.now(),
        })
      );

      localStorage.setItem(
        'guionbajo_checkpoint',
        JSON.stringify({
          sublevel: target.sublevel,
          classIndex: target.classIndex,
          quizCompleted: true,
          readingCompleted: true,
          mysteryWordCompleted: true,
        })
      );

      toast.success(`¡Stage ${stage} (${currentDef.name}) aplicado a tu perfil y dashboard!`, {
        icon: currentDef.emoji,
      });
    } catch (_) {
      toast.error('No se pudo guardar en localStorage');
    }
  };

  const emotions: TutorEmotion[] = ['neutral', 'happy', 'thinking', 'nervous', 'angry', 'victory'];
  const states: TutorState[] = ['idle', 'speaking', 'listening', 'thinking'];
  const sizes: Array<'sm' | 'md' | 'lg' | 'toolbar'> = ['toolbar', 'sm', 'md', 'lg'];

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans selection:bg-brand-cyan selection:text-black">
      {/* ── Background Grid & Glows ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-brand-cyan/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* ── Top Header ── */}
      <header className="relative z-10 border-b border-white/10 bg-brand-surface/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <ArrowLeft size={14} />
            <span>Volver al Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-cyan/20 text-brand-cyan">
              <Zap size={15} />
            </span>
            <h1 className="text-sm sm:text-base font-black tracking-wide bg-gradient-to-r from-white via-slate-200 to-brand-cyan bg-clip-text text-transparent">
              Laboratorio de Evolución de Guionbajo
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
            8 Upgrades CEFR
          </span>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* ═══════════════════════════════════════════════════════
            HERO: INSPECTOR DEL STAGE ACTIVO
            ═══════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card Principal: Visualizador del Avatar */}
          <div className="lg:col-span-7 bg-gradient-to-b from-[#0f172a]/90 to-[#0b1120]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {/* Stage badge superior */}
            <div className="w-full flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 flex items-center gap-1.5">
                <span>STAGE {selectedStage} / 8</span>
                <span className="text-white">•</span>
                <span>{currentDef.triggerSublevel ? `Desbloqueado en ${currentDef.triggerSublevel}` : 'Base'}</span>
              </span>

              <div className="text-xs font-mono text-slate-400">
                Tamaño: <span className="text-white font-bold uppercase">{selectedSize}</span>
              </div>
            </div>

            {/* Stage Title */}
            <div className="text-center mb-6">
              <div className="text-3xl mb-1">{currentDef.emoji}</div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {currentDef.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
                {currentDef.desc}
              </p>
            </div>

            {/* AVATAR DISPLAY STAGE */}
            <div className="min-h-[220px] w-full flex items-center justify-center relative py-6 my-2">
              <div className="absolute inset-0 bg-gradient-to-b from-brand-cyan/5 to-transparent rounded-2xl pointer-events-none" />
              <div className="transform transition-all duration-300">
                <TutorAvatar
                  size={selectedSize}
                  emotion={selectedEmotion}
                  state={selectedState}
                  upgradeStage={selectedStage}
                  text={selectedState === 'speaking' ? '¡Hello! I am Guionbajo, your AI English tutor.' : ''}
                />
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowUpgradeModal(true)}
                disabled={selectedStage === 0}
                className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-red-950/80 to-slate-900 border border-red-500/40 hover:border-red-400 text-xs font-bold text-red-200 hover:text-white flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Play size={13} />
                <span>Cinemática Upgrade</span>
              </button>

              <button
                onClick={() => setShowCelebrationModal(true)}
                className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/40 hover:border-amber-400 text-xs font-bold text-amber-200 hover:text-white flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Trophy size={13} />
                <span>Modal Celebración</span>
              </button>

              <button
                onClick={() => applyStageToLocalStorage(selectedStage)}
                className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-cyan/20 to-blue-600/30 border border-brand-cyan/50 hover:border-brand-cyan text-xs font-bold text-cyan-200 hover:text-white flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Check size={13} />
                <span>Guardar en Perfil</span>
              </button>
            </div>
          </div>

          {/* Panel Lateral: Controles en Tiempo Real */}
          <div className="lg:col-span-5 bg-[#0f172a]/70 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Sliders size={16} className="text-brand-cyan" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Controles de Simulación
                </h3>
              </div>

              {/* Selector de Nivel de Upgrade (0 - 8) */}
              <div>
                <label className="text-xs font-mono text-slate-400 mb-2 block flex items-center justify-between">
                  <span>SELECCIONAR EVOLUCIÓN:</span>
                  <span className="text-brand-cyan font-bold">Stage {selectedStage}</span>
                </label>
                <div className="grid grid-cols-9 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStage(s as UpgradeStage)}
                      className={`h-10 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                        selectedStage === s
                          ? 'bg-gradient-to-t from-brand-cyan to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 scale-105'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                      }`}
                      title={UPGRADE_DEFINITIONS[s].name}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Emoción */}
              <div>
                <label className="text-xs font-mono text-slate-400 mb-2 block">
                  EMOCIÓN DEL TUTOR:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {emotions.map((emo) => (
                    <button
                      key={emo}
                      onClick={() => setSelectedEmotion(emo)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                        selectedEmotion === emo
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Estado */}
              <div>
                <label className="text-xs font-mono text-slate-400 mb-2 block">
                  ESTADO FUNCIONAL:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {states.map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedState(st)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                        selectedState === st
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Tamaño */}
              <div>
                <label className="text-xs font-mono text-slate-400 mb-2 block">
                  TAMAÑO DE RENDERIZADO:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all cursor-pointer ${
                        selectedSize === sz
                          ? 'bg-brand-cyan text-slate-950 font-bold shadow-md'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Nota de ayuda */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-400 font-mono">
              💡 <span className="text-slate-200">Tip:</span> Al presionar <b className="text-cyan-300">Guardar en Perfil</b>, podrás ir al mapa de ruta (<Link href="/dashboard" className="underline text-brand-cyan">Dashboard</Link>) o a cualquier lección y ver a Guionbajo con este accesorio en tiempo real.
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            GALERÍA DE LAS 9 ETAPAS DE EVOLUCIÓN (STAGE 0 A 8)
            ═══════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-yellow-400" />
              <h3 className="text-base sm:text-lg font-black text-white">
                Galería Completa de Evoluciones (Stage 0 al 8)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Haz clic en cualquier tarjeta para inspeccionar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {UPGRADE_DEFINITIONS.map((def) => {
              const isCurrent = selectedStage === def.stage;
              return (
                <div
                  key={def.stage}
                  onClick={() => setSelectedStage(def.stage)}
                  className={`
                    p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between
                    ${
                      isCurrent
                        ? 'bg-slate-800/90 border-brand-cyan shadow-xl shadow-brand-cyan/20 ring-1 ring-brand-cyan'
                        : 'bg-[#0e1424]/80 border-slate-800/90 hover:border-slate-700 hover:bg-[#131b30]'
                    }
                  `}
                >
                  {/* Header de la tarjeta */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      STAGE {def.stage}
                    </span>
                    <span className="text-[11px] font-bold text-yellow-400">
                      {def.triggerSublevel ? `Al pasar ${def.triggerSublevel}` : 'Inicio'}
                    </span>
                  </div>

                  {/* Preview del Avatar */}
                  <div className="h-32 w-full flex items-center justify-center my-1 relative">
                    <TutorAvatar
                      size="sm"
                      emotion={isCurrent ? 'victory' : 'happy'}
                      upgradeStage={def.stage}
                    />
                  </div>

                  {/* Info de la mejora */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{def.emoji}</span>
                      <h4 className="text-xs font-bold text-white truncate">
                        {def.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {def.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TABLA RESUMEN DE HITOS CEFR
            ═══════════════════════════════════════════════════════ */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-brand-cyan" />
            <h4 className="text-sm font-bold text-white">
              Lógica de Desbloqueo Progresivo en el Currículo
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase">Nivel A1 (Acción)</span>
              <p className="text-slate-300 font-semibold">• A1.2: 🦾 Brazos articulados</p>
              <p className="text-slate-300 font-semibold">• A1.4: 🚀 Jetpack dorsal plasma</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold font-mono text-amber-400 uppercase">Nivel A2 (Estructura)</span>
              <p className="text-slate-300 font-semibold">• A2.2: 🥽 Visor HUD táctico</p>
              <p className="text-slate-300 font-semibold">• A2.4: 🛡️ Chasis cromado dorado</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold font-mono text-sky-400 uppercase">Nivel B1 (Expansión)</span>
              <p className="text-slate-300 font-semibold">• B1.2: 📡 Bobina Tesla cuántica</p>
              <p className="text-slate-300 font-semibold">• B1.4: 🪽 Alas holográficas</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold font-mono text-purple-400 uppercase">Nivel B2 (Maestría)</span>
              <p className="text-slate-300 font-semibold">• B2.2: 🛸 Mini-dron Guioncito</p>
              <p className="text-slate-300 font-semibold">• B2.4: 👑 Forma Maestra (Dios)</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Modal de prueba: Cinemática Hardware Upgrade ── */}
      <HardwareUpgradeModal
        isOpen={showUpgradeModal}
        newStage={selectedStage === 0 ? 1 : selectedStage}
        sublevelCompleted={currentDef.triggerSublevel || 'A1.2'}
        onClose={() => setShowUpgradeModal(false)}
      />

      {/* ── Modal de prueba: Celebration Score Modal ── */}
      <CelebrationModal
        isOpen={showCelebrationModal}
        score={100}
        topic={`Test de Upgrade: ${currentDef.name}`}
        sublevel={currentDef.triggerSublevel || 'A1.2'}
        upgradeStage={selectedStage}
        onClose={() => setShowCelebrationModal(false)}
        onContinue={() => setShowCelebrationModal(false)}
      />
    </div>
  );
}
