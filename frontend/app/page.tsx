'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-white selection:bg-brand-accent/30 selection:text-white relative flex flex-col justify-between overflow-hidden font-sans">
      {/* ── Fondo ambiental sutil ───────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-brand-accent/20 via-brand-cyan/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[400px] bg-purple-900/15 blur-[140px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
      </div>

      {/* ── Barra de Navegación ────────────────────────────────────────────── */}
      <nav className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 flex items-center justify-center relative overflow-visible flex-shrink-0">
            <TutorAvatar size="sm" emotion="happy" />
          </div>
          <div className="flex flex-col">
            <span className="font-outfit text-xl font-bold tracking-tight text-white group-hover:text-brand-cyan transition-colors">
              Guionbajo
            </span>
            <span className="text-[10px] text-brand-text-muted -mt-0.5">
              Tutor Personal de Inglés con IA
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-brand-text-secondary hover:text-white transition-colors rounded-xl hover:bg-white/[0.05]"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-accent to-brand-cyan text-white text-sm font-bold tracking-wide shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] transition-all border border-white/20 active:scale-95"
          >
            Crear Cuenta
          </Link>
        </div>
      </nav>

      {/* ── Bienvenida Central de Guionbajo ─────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 max-w-3xl mx-auto text-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full flex flex-col items-center"
        >
          {/* Avatar de Guionbajo */}
          <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-b from-brand-surface to-black/70 border border-brand-cyan/30 flex items-center justify-center relative shadow-[0_0_35px_rgba(0,212,255,0.18)] mb-6 overflow-visible">
            <TutorAvatar size="lg" emotion="happy" />
          </div>

          {/* Nombre y Rol */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-outfit font-black tracking-tight text-white mb-1">
              Guionbajo
            </h1>
            <span className="text-xs sm:text-sm font-semibold text-brand-cyan uppercase tracking-wider">
              Tu Tutor Personal de IA
            </span>
          </div>

          {/* Burbuja del Mensaje de Bienvenida */}
          <div className="w-full p-6 sm:p-8 rounded-3xl glass border border-brand-cyan/30 bg-gradient-to-b from-brand-surface/90 to-brand-card/95 shadow-2xl relative mb-8 text-center sm:text-left">
            <p className="text-base sm:text-lg text-white/95 leading-relaxed">
              &ldquo;¡Hola! Te doy la bienvenida a <strong className="text-white">Guionbajo</strong>. Estoy aquí para acompañarte paso a paso a hablar inglés con fluidez y confianza: practicaremos juntos tu pronunciación en tiempo real, entrenaremos tus oídos para los sonidos del idioma y avanzaremos a tu propio ritmo.&rdquo;
            </p>
          </div>

          {/* Botones de Entrada */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-accent via-indigo-600 to-brand-cyan hover:from-brand-accent/90 hover:to-cyan-400 text-white font-extrabold text-base tracking-wide shadow-[0_4px_25px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_30px_rgba(0,212,255,0.5)] transition-all flex items-center justify-center gap-3 border border-white/20 active:scale-95"
            >
              <span>Comenzar Ahora</span>
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl glass border border-white/15 hover:border-white/30 text-white font-bold text-sm sm:text-base transition-all flex items-center justify-center hover:bg-white/[0.05]"
            >
              Iniciar Sesión
            </Link>
          </div>
        </motion.div>
      </main>

      {/* ── Pie de Página Minimalista ──────────────────────────────────────── */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-white/[0.06] text-center text-xs text-brand-text-muted flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} Guionbajo. Todos los derechos reservados.</span>
        <div className="flex gap-5">
          <Link href="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
          <Link href="/register" className="hover:text-white transition-colors">Crear Cuenta</Link>
        </div>
      </footer>
    </div>
  );
}
