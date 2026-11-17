'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Crown, ArrowLeft, Mail, X, CheckCircle2 } from 'lucide-react';
import TutorAvatar from './TutorPanel/TutorAvatar';

interface PremiumLimitModalProps {
  open: boolean;
  onClose: () => void;
  onBackToDashboard?: () => void;
}

export default function PremiumLimitModal({
  open,
  onClose,
  onBackToDashboard,
}: PremiumLimitModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0f172a] to-[#090d16] border border-amber-400/40 p-6 sm:p-8 text-white shadow-[0_0_50px_rgba(251,191,36,0.2)] overflow-hidden"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <TutorAvatar size="sm" emotion="happy" upgradeStage={4} />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider mb-3">
              <Crown size={13} />
              Límite Diario Completado (2 / 2 Clases)
            </span>

            <h2 className="text-xl sm:text-2xl font-outfit font-black text-white mb-2">
              ¡Completaste tus 2 clases gratis de hoy!
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              Has alcanzado el máximo de <strong>2 clases diarias</strong> incluidas en tu acceso actual.
              ¿Quieres seguir avanzando hoy sin límites y dominar el inglés mucho más rápido?
            </p>

            <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-left space-y-2 mb-6">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} />
                Beneficios del Plan Premium
              </div>
              <ul className="text-xs text-slate-200 space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>Clases diarias <strong>ilimitadas</strong> (Pizarra, Quiz, Lectura y Juegos)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>Acceso completo sin esperas a los 16 subniveles CEFR (A1 a B2)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>Práctica oral y fonética ilimitada con Guionbajo IA</span>
                </li>
              </ul>
            </div>

            <div className="w-full space-y-2.5">
              <a
                href="mailto:megafer1994@gmail.com?subject=Consulta%20por%20el%20Plan%20Premium%20-%20Guionbajo&body=Hola%2C%20complet%C3%A9%20mis%202%20clases%20del%20d%C3%ADa%20y%20me%20gustar%C3%ADa%20preguntar%20por%20el%20Plan%20Premium%20para%20tener%20clases%20ilimitadas."
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
              >
                <Mail size={16} />
                <span>Preguntar por el Plan Premium</span>
              </a>

              <button
                type="button"
                onClick={onBackToDashboard || onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Volver al Mapa de Clases</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
