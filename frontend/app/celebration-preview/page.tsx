'use client';

import React, { useState } from 'react';
import CelebrationModal from '@/app/components/games/CelebrationModal';
import { Play, Sparkles, Trophy, RotateCcw, Volume2, ArrowLeft, Award, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function CelebrationPreviewPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [mockScore, setMockScore] = useState<number>(100);
  const [mockXp, setMockXp] = useState<number>(150);
  const [mockTopic, setMockTopic] = useState<string>('Daily Habits & Routines');
  const [mockSublevel, setMockSublevel] = useState<string>('A1.2 — Clase 2');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleLaunch = (score = 100) => {
    setMockScore(score);
    setLastAction(null);
    setIsOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#06070e] text-white flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-2xl bg-brand-surface/40 border border-brand-border/60 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative z-10 flex flex-col gap-6">
        
        {/* Header with Back to Dashboard Link */}
        <div className="flex items-center justify-between border-b border-brand-border/40 pb-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Volver al Dashboard</span>
          </Link>
          <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            Laboratorio de Animación SVG
          </span>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-amber-500/20 border border-cyan-400/40 text-cyan-300 mb-1 shadow-lg shadow-cyan-500/10">
            <Trophy size={28} className="text-yellow-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Celebración de Clase de Guionbajo
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Animación cinemática 100% vectorial en SVG y Framer Motion con sonido procedural y física de dibujos animados.
          </p>
        </div>

        {/* Score Selector Controls */}
        <div className="space-y-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
            <Award size={15} className="text-cyan-400" />
            <span>Puntaje Simulado a Probar:</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleLaunch(100)}
              className={`p-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer ${
                mockScore === 100
                  ? 'bg-yellow-500/20 border-yellow-400/60 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <span className="text-base">100%</span>
              <span className="text-[10px] font-medium opacity-80">★ PERFECT SCORE</span>
            </button>

            <button
              type="button"
              onClick={() => handleLaunch(95)}
              className={`p-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer ${
                mockScore === 95
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(0,212,255,0.25)]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <span className="text-base">95%</span>
              <span className="text-[10px] font-medium opacity-80">Excelente</span>
            </button>

            <button
              type="button"
              onClick={() => handleLaunch(88)}
              className={`p-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer ${
                mockScore === 88
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <span className="text-base">88%</span>
              <span className="text-[10px] font-medium opacity-80">Aprobado</span>
            </button>
          </div>
        </div>

        {/* Action Button to Open Modal */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full py-4 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-black shadow-[0_0_30px_rgba(0,212,255,0.35)] hover:shadow-[0_0_40px_rgba(0,212,255,0.55)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          <Play size={18} fill="currentColor" />
          <span>Ver Animación de Guionbajo ({mockScore}%) 🎬</span>
        </button>

        {/* Narrative Step Breakdown Checklist */}
        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
            Fases Cinemáticas Programadas:
          </h4>
          <ul className="space-y-2 text-xs text-zinc-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-cyan-400 shrink-0 mt-0.5" />
              <span><strong>Acto 1 (Tensión):</strong> Guionbajo entra inclinado jalando una cuerda tensa con el propulsor chispeando.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-yellow-400 shrink-0 mt-0.5" />
              <span><strong>Acto 2 (Snap):</strong> El monolito con el 100% entra disparado al centro con aceleración elástica.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-purple-400 shrink-0 mt-0.5" />
              <span><strong>Acto 3 (Caída Cómica):</strong> Por el latigazo, Guionbajo sale despedido hacia atrás y cae sentado al suelo con rebote.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Acto 4 (Celebración):</strong> Mira el puntaje, gira al estudiante, sonríe <strong>^_^</strong> y estallan los confetis con fanfarria.</span>
            </li>
          </ul>
        </div>

        {/* Simulation Feedback Message */}
        {lastAction && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center font-medium animate-fade-in">
            {lastAction}
          </div>
        )}
      </div>

      {/* The Celebration Modal Itself */}
      <CelebrationModal
        isOpen={isOpen}
        score={mockScore}
        topic={mockTopic}
        sublevel={mockSublevel}
        xpEarned={mockXp}
        autoPlaySound={soundEnabled}
        onClose={() => {
          setIsOpen(false);
          setLastAction('Modal cerrado manualmente.');
        }}
        onContinue={() => {
          setIsOpen(false);
          setLastAction('🚀 Simulación de "Avanzar al Dashboard" activada. En producción, esto te dirige al Dashboard y dispara el avance en el sendero del mapa.');
        }}
      />
    </div>
  );
}
