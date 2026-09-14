'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Mic,
  BookOpen,
  MessageSquare,
  Radio,
  Check,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Volume2,
} from 'lucide-react';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';

// Pares mínimos fonéticos para demostración pedagógica visual
const PHONETIC_PAIRS = [
  {
    pair: '/iː/ vs /ɪ/',
    wordA: 'Sheep',
    wordB: 'Ship',
    ipaA: '/ʃiːp/',
    ipaB: '/ʃɪp/',
    meaningA: 'Oveja',
    meaningB: 'Barco',
    tipA: 'Vocal larga y tensa. Sonrisa labial pronunciada.',
    tipB: 'Vocal corta y relajada. Mandíbula ligeramente entreabierta.',
  },
  {
    pair: '/θ/ vs /s/',
    wordA: 'Think',
    wordB: 'Sink',
    ipaA: '/θɪŋk/',
    ipaB: '/sɪŋk/',
    meaningA: 'Pensar',
    meaningB: 'Hundirse',
    tipA: 'Sonido interdental. La punta de la lengua toca los dientes superiores.',
    tipB: 'Sonido alveolar. La lengua se ubica detrás de los dientes.',
  },
  {
    pair: '/b/ vs /v/',
    wordA: 'Berry',
    wordB: 'Very',
    ipaA: '/ˈberi/',
    ipaB: '/ˈveri/',
    meaningA: 'Baya / Fruto',
    meaningB: 'Muy / Mucho',
    tipA: 'Oclusiva bilabial. Ambos labios se juntan por completo.',
    tipB: 'Fricativa labiodental. Los dientes superiores tocan suavemente el labio inferior.',
  },
];

// Estructura oficial del plan de estudios CEFR
const CEFR_LEVELS = [
  {
    id: 'A1',
    badge: 'A1 • Fundamentos',
    title: 'De Cero a Conversación Básica',
    classes: 16,
    duration: '4-6 semanas',
    description: 'Adquiere los 44 sonidos fundamentales del inglés, aprende a presentarte con naturalidad y domina rutinas en presente.',
    highlights: ['44 Fonemas fundamentales', 'Pronunciación de terminaciones -ed y -s', 'Present Simple y To Be fluido'],
  },
  {
    id: 'A2',
    badge: 'A2 • Expansión',
    title: 'Comunicación en Contextos Reales',
    classes: 16,
    duration: '4-6 semanas',
    description: 'Narra experiencias pasadas, compara opciones en compras o viajes, y exprésate con modales y planes futuros.',
    highlights: ['Past Simple vs Continuous', 'Contraste dental /θ/ vs /ð/', 'Expresión de planes y viajes'],
  },
  {
    id: 'B1',
    badge: 'B1 • Fluidez Autónoma',
    title: 'Independencia y Enlace Conversacional',
    classes: 16,
    duration: '6-8 semanas',
    description: 'Conecta ideas complejas, participa en debates cotidianos, usa condicionales y domina el ritmo de habla natural.',
    highlights: ['Connected speech y enlace rítmico', 'Condicionales de causa y consecuencia', 'Narración de anécdotas espontáneas'],
  },
  {
    id: 'B2',
    badge: 'B2 • Maestría Profesional',
    title: 'Precisión y Matiz Ejecutivo',
    classes: 16,
    duration: '6-8 semanas',
    description: 'Comunícate en entornos laborales exigentes, defiende puntos de vista y domina la entonación nativa.',
    highlights: ['Negociación y expresión formal', 'Estructuras avanzadas de énfasis', 'Prosodia y dicción ejecutiva'],
  },
];

export default function LandingPage() {
  const [activePhoneticIdx, setActivePhoneticIdx] = useState(0);
  const [selectedCefr, setSelectedCefr] = useState('A1');

  return (
    <div className="min-h-screen bg-[#070913] text-white selection:bg-brand-accent/30 selection:text-white relative overflow-x-hidden font-sans">
      {/* ── Fondo ambiental ─────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-b from-brand-accent/20 via-brand-cyan/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[45%] left-[-15%] w-[550px] h-[450px] bg-purple-900/15 blur-[140px] rounded-full" />
        <div className="absolute top-[75%] right-[-15%] w-[550px] h-[450px] bg-cyan-900/15 blur-[140px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* ── Barra de Navegación ────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#070913]/80 border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 flex items-center justify-center relative overflow-visible flex-shrink-0">
              <TutorAvatar size="sm" emotion="happy" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-outfit text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-brand-cyan transition-colors">
                  Guionbajo
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan">
                  AI Academy
                </span>
              </div>
              <span className="text-[10px] text-brand-text-muted -mt-0.5 hidden sm:inline">
                Tutor de Pronunciación & Conversación
              </span>
            </div>
          </Link>

          {/* Enlaces de Navegación */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-text-secondary">
            <a href="#metodologia" className="hover:text-white transition-colors">
              Metodología
            </a>
            <a href="#fonetica" className="hover:text-white transition-colors">
              Fonética
            </a>
            <a href="#pensum" className="hover:text-white transition-colors">
              Plan de Estudios
            </a>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs sm:text-sm font-bold text-brand-text-secondary hover:text-white transition-all rounded-xl hover:bg-white/[0.05]"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="group px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-accent to-brand-cyan text-white text-xs sm:text-sm font-bold tracking-wide shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] transition-all flex items-center gap-2 border border-white/20 active:scale-95"
            >
              <span>Comenzar Ahora</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 1. Hero Section ────────────────────────────────────────────────── */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Badge Superior */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-brand-cyan/30 mb-8 bg-brand-surface/40"
        >
          <Sparkles className="w-4 h-4 text-brand-cyan" />
          <span className="text-xs sm:text-sm font-semibold text-white/90">
            Tutor Cognitivo de Inglés con Inteligencia Artificial
          </span>
        </motion.div>

        {/* Titular Principal */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-outfit font-black tracking-tight max-w-4xl leading-[1.1] mb-6"
        >
          Aprende a hablar inglés con fluidez, confianza y{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-brand-cyan to-emerald-400">
            pronunciación real.
          </span>
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-brand-text-secondary max-w-2xl mb-12 leading-relaxed font-normal"
        >
          Guionbajo te acompaña lección por lección. Evalúa tu articulación en tiempo real,
          te enseña a distinguir los fonemas del idioma y te prepara para comunicarte en situaciones reales.
        </motion.p>

        {/* Presentación Central: Guionbajo con su Mensaje de Bienvenida */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="w-full rounded-3xl glass border border-brand-border/80 bg-gradient-to-b from-brand-surface/80 to-brand-card/90 p-6 sm:p-8 shadow-2xl relative mb-10 overflow-visible"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            {/* Avatar pedestal */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-b from-brand-surface to-black/70 border border-brand-cyan/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(0,212,255,0.15)] overflow-visible">
                <TutorAvatar size="md" emotion="happy" />
              </div>
              <div className="mt-3 text-center">
                <span className="text-sm font-bold text-white block font-outfit">Guionbajo</span>
                <span className="text-xs text-brand-cyan">Tu Tutor de IA</span>
              </div>
            </div>

            {/* Mensaje de Guionbajo */}
            <div className="flex-1 text-left relative">
              <div className="p-5 sm:p-6 rounded-2xl bg-black/40 border border-brand-cyan/20 relative">
                {/* Flecha indicadora en desktop */}
                <div className="hidden sm:block absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[8px] border-r-brand-cyan/30" />
                <p className="text-sm sm:text-base text-white/95 leading-relaxed">
                  &ldquo;¡Hola! Soy <span className="text-brand-cyan font-bold">Guionbajo</span>, tu tutor personal de inglés. Estoy aquí para acompañarte paso a paso: practicaremos tu pronunciación, entrenaremos tus oídos para los sonidos del inglés y avanzaremos a tu propio ritmo hasta que converses con total seguridad.&rdquo;
                </p>
              </div>

              {/* Pilares clave */}
              <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-brand-text-muted">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Guía personalizada</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-cyan" />
                  <span>Corrección en tiempo real</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  <span>Práctica conversacional</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Botones de Acción */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-accent via-indigo-600 to-brand-cyan hover:from-brand-accent/90 hover:to-cyan-400 text-white font-extrabold text-base tracking-wide shadow-[0_4px_25px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_30px_rgba(0,212,255,0.5)] transition-all flex items-center justify-center gap-3 border border-white/20 active:scale-95"
          >
            <span>Comenzar Ahora</span>
            <ArrowRight size={18} />
          </Link>

          <a
            href="#metodologia"
            className="w-full sm:w-auto px-6 py-4 rounded-2xl glass border border-white/15 hover:border-white/30 text-white font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 hover:bg-white/[0.05]"
          >
            <span>Conoce la Metodología</span>
            <ChevronRight size={16} />
          </a>
        </motion.div>
      </section>

      {/* ── 2. Metodología: Las 4 Etapas de Aprendizaje ────────────────────── */}
      <section id="metodologia" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-brand-cyan uppercase tracking-widest bg-brand-cyan/10 px-3 py-1 rounded-full border border-brand-cyan/20">
            Metodología Estructurada
          </span>
          <h2 className="text-3xl sm:text-4xl font-outfit font-black tracking-tight mt-4 mb-4">
            Cómo dominas cada lección en 4 pasos
          </h2>
          <p className="text-sm sm:text-base text-brand-text-secondary">
            Un ciclo pedagógico diseñado para asimilar el idioma de forma práctica e interactiva.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Paso 1 */}
          <div className="p-6 rounded-3xl glass border border-brand-accent/30 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 hover:border-brand-accent/60 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent mb-5">
              <BookOpen size={22} />
            </div>
            <span className="text-xs font-bold font-mono text-brand-cyan uppercase tracking-wider block mb-1">
              Fase 1
            </span>
            <h3 className="text-lg font-bold text-white mb-2 font-outfit">
              Pizarra Didáctica
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Explicaciones claras y contextuales guiadas por Guionbajo. Reglas visuales,
              ejemplos naturales y notas de contraste con el español.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="p-6 rounded-3xl glass border border-emerald-500/30 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 hover:border-emerald-400/60 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mb-5">
              <Mic size={22} />
            </div>
            <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider block mb-1">
              Fase 2
            </span>
            <h3 className="text-lg font-bold text-white mb-2 font-outfit">
              Reto de Pronunciación
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Practica tu habla directamente al micrófono. El sistema evalúa tu articulación fonema por fonema
              y te orienta en dónde ajustar la posición de tu boca.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="p-6 rounded-3xl glass border border-purple-500/30 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 hover:border-purple-400/60 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 mb-5">
              <MessageSquare size={22} />
            </div>
            <span className="text-xs font-bold font-mono text-purple-400 uppercase tracking-wider block mb-1">
              Fase 3
            </span>
            <h3 className="text-lg font-bold text-white mb-2 font-outfit">
              Simulación Conversacional
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Participa en diálogos interactivos en primera persona simulando situaciones reales:
              entrevistas, viajes, reuniones y vida cotidiana.
            </p>
          </div>

          {/* Paso 4 */}
          <div className="p-6 rounded-3xl glass border border-yellow-500/30 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 hover:border-yellow-400/60 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-400/40 flex items-center justify-center text-yellow-400 mb-5">
              <Radio size={22} />
            </div>
            <span className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-wider block mb-1">
              Fase 4
            </span>
            <h3 className="text-lg font-bold text-white mb-2 font-outfit">
              Lectura y Fonética
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Lecturas cortas acompañadas de transcripción fonética internacional (IPA) para
              perfeccionar la entonación y el enlace rítmico de las frases.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Laboratorio Fonético Visual ─────────────────────────────────── */}
      <section id="fonetica" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 text-left">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Precisión Articulada
            </span>
            <h2 className="text-3xl sm:text-4xl font-outfit font-black tracking-tight mt-4 mb-5">
              Aprende a diferenciar los sonidos que no existen en español
            </h2>
            <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed mb-6">
              El español cuenta con 5 sonidos vocálicos; el inglés tiene más de 12 vocales y 44 fonemas en total.
              Guionbajo te ayuda a entrenar tu oído y tus músculos articulatorios en los pares mínimos donde más ocurren errores.
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-white/90">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <span>Distinción clara entre vocales cortas y vocales largas</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <span>Indicaciones visuales de posición de lengua, dientes y labios</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <span>Entrenamiento fonético integrado en cada lección del curso</span>
              </div>
            </div>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-sm transition-all"
            >
              <span>Explorar los fonemas en el curso</span>
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Tarjetas Visuales de Pares Mínimos */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl glass border border-brand-border/80 bg-brand-surface/40 shadow-xl">
              <div className="border-b border-white/[0.08] pb-4 mb-6">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Ejemplos de Pares Mínimos
                </span>
              </div>

              {/* Selector de pares */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {PHONETIC_PAIRS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhoneticIdx(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                      activePhoneticIdx === idx
                        ? 'bg-brand-accent text-white border-brand-cyan shadow-[0_0_15px_rgba(108,99,255,0.4)]'
                        : 'bg-black/40 text-brand-text-secondary border-brand-border hover:text-white'
                    }`}
                  >
                    {item.pair}
                  </button>
                ))}
              </div>

              {/* Tarjeta de Contraste Activo */}
              {(() => {
                const current = PHONETIC_PAIRS[activePhoneticIdx];
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Palabra A */}
                    <div className="p-5 rounded-2xl bg-black/40 border border-brand-cyan/30 text-left">
                      <span className="text-xs font-mono font-bold text-brand-cyan block mb-1">
                        {current.ipaA}
                      </span>
                      <h4 className="text-2xl font-black font-outfit text-white mb-1">
                        {current.wordA}
                      </h4>
                      <span className="text-xs text-brand-text-muted block mb-3 font-medium">
                        Significado: {current.meaningA}
                      </span>
                      <div className="p-3 rounded-xl bg-brand-surface/60 border border-white/[0.08] text-xs text-brand-text-secondary leading-relaxed">
                        <strong className="text-white block mb-1">Articulación:</strong>
                        {current.tipA}
                      </div>
                    </div>

                    {/* Palabra B */}
                    <div className="p-5 rounded-2xl bg-black/40 border border-emerald-400/30 text-left">
                      <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">
                        {current.ipaB}
                      </span>
                      <h4 className="text-2xl font-black font-outfit text-white mb-1">
                        {current.wordB}
                      </h4>
                      <span className="text-xs text-brand-text-muted block mb-3 font-medium">
                        Significado: {current.meaningB}
                      </span>
                      <div className="p-3 rounded-xl bg-brand-surface/60 border border-white/[0.08] text-xs text-brand-text-secondary leading-relaxed">
                        <strong className="text-white block mb-1">Articulación:</strong>
                        {current.tipB}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Plan de Estudios CEFR ───────────────────────────────────────── */}
      <section id="pensum" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Marco Común Europeo (CEFR)
          </span>
          <h2 className="text-3xl sm:text-4xl font-outfit font-black tracking-tight mt-4 mb-4">
            Un plan de 64 clases estructuradas
          </h2>
          <p className="text-sm sm:text-base text-brand-text-secondary">
            Avanza paso a paso desde los fundamentos fonéticos hasta la soltura conversacional.
          </p>
        </div>

        {/* Pestañas de Niveles */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-10 overflow-x-auto pb-2">
          {CEFR_LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setSelectedCefr(lvl.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all border ${
                selectedCefr === lvl.id
                  ? 'bg-gradient-to-r from-brand-accent to-purple-600 text-white border-white/30 shadow-lg shadow-brand-accent/30'
                  : 'glass border-white/10 text-brand-text-secondary hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {lvl.badge}
            </button>
          ))}
        </div>

        {/* Detalle del Nivel Seleccionado */}
        {(() => {
          const current = CEFR_LEVELS.find((l) => l.id === selectedCefr) || CEFR_LEVELS[0];
          return (
            <div className="p-8 sm:p-10 rounded-3xl glass border border-brand-border/80 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 max-w-4xl mx-auto shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6 mb-6">
                <div>
                  <span className="text-xs font-mono font-bold text-brand-cyan uppercase tracking-wider block mb-1">
                    {current.badge} • {current.duration}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black font-outfit text-white">
                    {current.title}
                  </h3>
                </div>
                <div className="px-4 py-2 rounded-xl bg-brand-accent/20 border border-brand-accent/40 text-brand-cyan text-xs font-bold self-start sm:self-auto">
                  {current.classes} Clases con Checkpoint
                </div>
              </div>

              <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed mb-8">
                {current.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {current.highlights.map((h, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Check size={14} />
                    </div>
                    <span className="text-xs font-semibold text-white/90">{h}</span>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-black hover:bg-white/90 font-bold text-sm transition-all shadow-lg active:scale-95"
                >
                  <span>Comenzar en el nivel {current.id}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          );
        })()}
      </section>

      {/* ── 5. Banner de Cierre ────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-brand-accent/30 via-indigo-900/30 to-brand-cyan/20 border border-brand-cyan/30 glass relative overflow-hidden shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center mx-auto mb-6 relative overflow-visible">
            <TutorAvatar size="sm" emotion="happy" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-outfit font-black tracking-tight mb-4">
            Comienza a dominar el inglés hoy mismo
          </h2>
          <p className="text-sm sm:text-base text-brand-text-secondary max-w-xl mx-auto mb-8 leading-relaxed">
            Avanza a tu propio ritmo, supera el miedo al error y construye una pronunciación sólida con la guía constante de Guionbajo.
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-accent to-brand-cyan text-white font-black text-base tracking-wide shadow-[0_0_30px_rgba(0,212,255,0.4)] hover:shadow-[0_0_40px_rgba(0,212,255,0.6)] transition-all border border-white/30 active:scale-95"
          >
            <span>Crear Cuenta</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center text-xs text-brand-text-muted flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-outfit font-black text-white text-base">Guionbajo</span>
          <span>• Tutor de Inglés con Inteligencia Artificial</span>
        </div>
        <div className="flex gap-6">
          <Link href="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
          <Link href="/register" className="hover:text-white transition-colors">Crear Cuenta</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Pizarra</Link>
        </div>
        <span>© {new Date().getFullYear()} Guionbajo. Todos los derechos reservados.</span>
      </footer>
    </div>
  );
}
