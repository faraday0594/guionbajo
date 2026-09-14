'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Play,
  Volume2,
  VolumeX,
  Mic,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  Headphones,
  ChevronRight,
  Zap,
  Radio,
  Check,
} from 'lucide-react';
import TutorAvatar, { TutorState } from '@/app/components/TutorPanel/TutorAvatar';
import { testVoicePreview, stopTutorVoice } from '@/lib/api';

// Curated interactive phonetic pairs showcase
const PHONETIC_PAIRS = [
  {
    pair: '/iː/ vs /ɪ/',
    wordA: 'Sheep',
    wordB: 'Ship',
    ipaA: '/ʃiːp/',
    ipaB: '/ʃɪp/',
    meaningA: 'Oveja (vocal larga)',
    meaningB: 'Barco (vocal corta relajada)',
    sampleAudioText: 'Sheep, /ʃiːp/. Ship, /ʃɪp/. Notice the tongue tension difference.',
  },
  {
    pair: '/θ/ vs /s/',
    wordA: 'Think',
    wordB: 'Sink',
    ipaA: '/θɪŋk/',
    ipaB: '/sɪŋk/',
    meaningA: 'Pensar (lengua entre dientes)',
    meaningB: 'Hundirse (lengua detrás de dientes)',
    sampleAudioText: 'Think, /θɪŋk/. Sink, /sɪŋk/. Place your tongue between your teeth for think.',
  },
  {
    pair: '/b/ vs /v/',
    wordA: 'Berry',
    wordB: 'Very',
    ipaA: '/ˈberi/',
    ipaB: '/ˈveri/',
    meaningA: 'Baya (bilabial oclusiva)',
    meaningB: 'Muy (labiodental fricativa)',
    sampleAudioText: 'Berry, /ˈberi/. Very, /ˈveri/. Teeth touch the lower lip for very.',
  },
];

// CEFR Pensum overview tabs
const CEFR_LEVELS = [
  {
    id: 'A1',
    badge: 'A1 • Fundamentos',
    title: 'De Cero a Conversación Básica',
    classes: 16,
    duration: '4-6 semanas',
    description: 'Aprende los 44 sonidos fonéticos del inglés, presentarte con naturalidad y dominar rutinas en presente.',
    highlights: ['44 Fonemas con boca 3D', 'Pronunciación de -ed y -s', 'To Be y Present Simple fluido'],
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
    title: 'Independencia y Fluidez de Enlace',
    classes: 16,
    duration: '6-8 semanas',
    description: 'Conecta ideas complejas, opina en debates laborales, usa condicionales y domina el ritmo de habla natural.',
    highlights: ['Connected speech & linking', 'Condicionales 1 y 2', 'Narración de anécdotas espontáneas'],
  },
  {
    id: 'B2',
    badge: 'B2 • Maestría Profesional',
    title: 'Precisión y Matiz Ejecutivo',
    classes: 16,
    duration: '6-8 semanas',
    description: 'Comunícate en reuniones de alto nivel, defiende ideas con diplomacia, y domina la entonación y acentuación nativa.',
    highlights: ['Debate y negociación formal', 'Inversión de condicionales', 'Prosodia y dicción ejecutiva'],
  },
];

export default function LandingPage() {
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);
  const [activeAvatarState, setActiveAvatarState] = useState<TutorState>('idle');
  const [greetingText, setGreetingText] = useState('¡Hola! Soy Guionbajo, tu tutor de inglés con IA.');
  const [activePhoneticIdx, setActivePhoneticIdx] = useState(0);
  const [selectedCefr, setSelectedCefr] = useState('A1');
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play Guionbajo live voice greeting
  const handlePlayVoice = async (textToSpeak?: string) => {
    if (isPlayingGreeting) {
      stopTutorVoice();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      setIsPlayingGreeting(false);
      setActiveAvatarState('idle');
      return;
    }

    const message = textToSpeak || '¡Hola! Soy Guionbajo, tu tutor personal de inglés con inteligencia artificial. Cada lección la creo especialmente para ti, evaluando tu pronunciación y acento en tiempo real. ¿Listo para empezar?';
    setGreetingText(message);
    setIsPlayingGreeting(true);
    setActiveAvatarState('speaking');

    try {
      const audio = await testVoicePreview('female-yujie', message);
      if (audio) {
        activeAudioRef.current = audio;
        audio.onended = () => {
          setIsPlayingGreeting(false);
          setActiveAvatarState('idle');
        };
        audio.onerror = () => {
          setIsPlayingGreeting(false);
          setActiveAvatarState('idle');
        };
      } else {
        setTimeout(() => {
          setIsPlayingGreeting(false);
          setActiveAvatarState('idle');
        }, 5000);
      }
    } catch {
      setIsPlayingGreeting(false);
      setActiveAvatarState('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#070913] text-white selection:bg-brand-accent/30 selection:text-white relative overflow-x-hidden font-sans">
      {/* ── Ambient Background Glows ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-brand-accent/20 via-brand-cyan/10 to-transparent blur-[130px] rounded-full" />
        <div className="absolute top-[40%] left-[-15%] w-[600px] h-[500px] bg-purple-900/15 blur-[150px] rounded-full" />
        <div className="absolute top-[70%] right-[-15%] w-[600px] h-[500px] bg-cyan-900/15 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#070913]/70 border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 flex items-center justify-center relative overflow-visible flex-shrink-0">
              <TutorAvatar size="sm" emotion="happy" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-outfit text-2xl font-black tracking-tight text-white group-hover:text-brand-cyan transition-colors">
                  Guionbajo
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan">
                  AI Academy
                </span>
              </div>
              <span className="text-[10px] text-brand-text-muted -mt-1 hidden sm:inline">
                Tutor de Pronunciación & Conversación
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-text-secondary">
            <a href="#metodologia" className="hover:text-white transition-colors">
              Metodología
            </a>
            <a href="#fonetica" className="hover:text-white transition-colors">
              Laboratorio Fonético
            </a>
            <a href="#pensum" className="hover:text-white transition-colors">
              Currículum CEFR
            </a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-brand-text-secondary hover:text-white transition-all rounded-xl hover:bg-white/[0.05]"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="group relative px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-accent to-brand-cyan text-white text-xs sm:text-sm font-bold tracking-wide shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] transition-all flex items-center gap-2 border border-white/20 active:scale-95"
            >
              <span>Comenzar Gratis</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 1. Hero Section: La Presentación de Clase Mundial ─────────────── */}
      <section className="relative pt-12 sm:pt-20 pb-20 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Release Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full glass border border-brand-cyan/40 mb-8 bg-brand-surface/40 shadow-[0_0_15px_rgba(0,212,255,0.15)]"
        >
          <Sparkles className="w-4 h-4 text-brand-cyan animate-pulse" />
          <span className="text-xs sm:text-sm font-semibold text-white/90">
            MiniMax Neural M3 • Groq Whisper LPU • 64 Clases CEFR
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-outfit font-black tracking-tight max-w-5xl leading-[1.08] mb-6"
        >
          Aprende inglés hablando con un tutor de IA que{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-brand-cyan to-emerald-400">
            escucha cada uno de tus fonemas.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-xl text-brand-text-secondary max-w-3xl mb-10 leading-relaxed font-normal"
        >
          No es un chatbot genérico. Guionbajo combina síntesis de voz neuronal de ultra alta
          fidelidad, alineación acústica con Groq Whisper y novelas visuales interactivas para que
          hables con dicción, confianza y acento natural desde el primer día.
        </motion.p>

        {/* Primary CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16"
        >
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-accent via-indigo-600 to-brand-cyan hover:from-brand-accent/90 hover:to-cyan-400 text-white font-extrabold text-base tracking-wide shadow-[0_4px_30px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_35px_rgba(0,212,255,0.6)] transition-all flex items-center justify-center gap-3 border border-white/20 active:scale-95"
          >
            <span>Crear Cuenta Gratis</span>
            <ArrowRight size={18} />
          </Link>

          <button
            onClick={() => handlePlayVoice()}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl glass border border-white/15 hover:border-brand-cyan/60 hover:bg-white/[0.06] text-white font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-3 shadow-lg group"
          >
            {isPlayingGreeting ? (
              <>
                <VolumeX size={18} className="text-red-400 animate-pulse" />
                <span className="text-red-300">Detener Voz</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan group-hover:scale-110 transition-transform">
                  <Play size={14} className="fill-current" />
                </div>
                <span>Escuchar a Guionbajo en Vivo</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Interactive Guionbajo Hero Showcase Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-4xl rounded-3xl glass border border-brand-border/80 bg-gradient-to-b from-brand-surface/70 to-brand-card/90 p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] relative overflow-hidden"
        >
          {/* Subtle Top Indicator Pill */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-5 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Tutor Activo en Línea • MiniMax Neural Studio HD
              </span>
            </div>
            <span className="text-xs text-brand-cyan font-mono font-bold bg-brand-cyan/10 px-2.5 py-1 rounded-lg border border-brand-cyan/30">
              60 FPS Lip-Sync Engine
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Left: Avatar with glowing pedestal */}
            <div className="relative flex flex-col items-center justify-center flex-shrink-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-b from-brand-surface to-black/80 border border-brand-cyan/30 flex items-center justify-center relative shadow-[0_0_40px_rgba(0,212,255,0.2)] overflow-visible">
                <TutorAvatar
                  state={activeAvatarState}
                  text={greetingText}
                  audioProgress={isPlayingGreeting ? 40 : 0}
                  size="lg"
                />
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs font-bold text-white block">Guionbajo</span>
                <span className="text-[11px] text-brand-cyan">Tutor Cognitivo Retro-Futurista</span>
              </div>
            </div>

            {/* Right: Real-time Dialog & Acoustic Feedback Preview */}
            <div className="flex-1 text-left w-full space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-brand-border/70 relative">
                <div className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted mb-1.5 flex items-center gap-2">
                  <Headphones size={13} className="text-brand-cyan" />
                  <span>Audio del Tutor (Demostración)</span>
                </div>
                <p className="text-sm sm:text-base text-white/95 leading-relaxed italic font-serif-custom">
                  &ldquo;{greetingText}&rdquo;
                </p>
              </div>

              {/* Acoustic Alignment Metric Mockup */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-brand-surface/40 border border-brand-border/60 text-center">
                  <span className="text-[10px] text-brand-text-muted block font-semibold">Precisión Fonética</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 font-outfit">98.4%</span>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface/40 border border-brand-border/60 text-center">
                  <span className="text-[10px] text-brand-text-muted block font-semibold">Latencia Groq</span>
                  <span className="text-base sm:text-lg font-black text-brand-cyan font-outfit">320ms</span>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface/40 border border-brand-border/60 text-center">
                  <span className="text-[10px] text-brand-text-muted block font-semibold">Resolución Audio</span>
                  <span className="text-base sm:text-lg font-black text-purple-400 font-outfit">24 kHz HD</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── 2. Showcase del Método Pedagógico en 4 Etapas ───────────────────── */}
      <section id="metodologia" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-brand-cyan uppercase tracking-widest bg-brand-cyan/10 px-3 py-1 rounded-full border border-brand-cyan/20">
            Pedagogía de Alto Rendimiento
          </span>
          <h2 className="text-3xl sm:text-5xl font-outfit font-black tracking-tight mt-4 mb-4">
            Cómo dominas cada lección en 4 pasos
          </h2>
          <p className="text-sm sm:text-base text-brand-text-secondary">
            Un ciclo neuro-lingüístico diseñado para que no memorices reglas muertas, sino que
            internalices patrones articulatorios mediante práctica inmersiva.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Paso 1 */}
          <div className="p-6 rounded-3xl glass border border-brand-accent/30 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 hover:border-brand-accent/60 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent mb-6 group-hover:scale-110 transition-transform">
              <BookOpen size={24} />
            </div>
            <span className="text-xs font-bold font-mono text-brand-cyan uppercase tracking-wider block mb-1">
              Fase 1
            </span>
            <h3 className="text-lg font-bold text-white mb-2 font-outfit">
              Pizarra Didáctica
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Explicaciones claras y contextuales guiadas por la voz de Guionbajo. Reglas visuales,
              ejemplos naturales y notas de contraste con el español.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="p-6 rounded-3xl glass border border-emerald-500/30 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 hover:border-emerald-400/60 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Mic size={24} />
            </div>
            <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider block mb-1">
              Fase 2
            </span>
            <h3 className="text-lg font-bold text-white mb-2 font-outfit">
              Reto de Pronunciación
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Hablas al micrófono y el motor acústico de Groq Whisper analiza tus fonemas uno por
              uno, señalando con colores exactos dónde corregir la posición de la boca.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="p-6 rounded-3xl glass border border-purple-500/30 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 hover:border-purple-400/60 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare size={24} />
            </div>
            <span className="text-xs font-bold font-mono text-purple-400 uppercase tracking-wider block mb-1">
              Fase 3
            </span>
            <h3 className="text-lg font-bold text-white mb-2 font-outfit">
              Visual Novel POV
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Simulaciones conversacionales en primera persona. Respóndele a interlocutores en
              hoteles, aeropuertos y reuniones donde tus decisiones determinan la historia.
            </p>
          </div>

          {/* Paso 4 */}
          <div className="p-6 rounded-3xl glass border border-yellow-500/30 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 hover:border-yellow-400/60 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-400/40 flex items-center justify-center text-yellow-400 mb-6 group-hover:scale-110 transition-transform">
              <Radio size={24} />
            </div>
            <span className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-wider block mb-1">
              Fase 4
            </span>
            <h3 className="text-lg font-bold text-white mb-2 font-outfit">
              Story Reading con IPA
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
              Lecturas cortas con transcripción fonética palabra por palabra. Entrena el enlace
              rítmico del inglés (*connected speech*) con evaluación acústica en tiempo real.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Laboratorio Fonético Interactivo ─────────────────────────────── */}
      <section id="fonetica" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 text-left">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Alineación Acústica de Precisión
            </span>
            <h2 className="text-3xl sm:text-5xl font-outfit font-black tracking-tight mt-4 mb-6">
              El secreto para dejar de hablar con acento plano
            </h2>
            <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed mb-6">
              El español tiene solo 5 vocales; el inglés tiene más de 12 vocales y 44 fonemas
              distintos. Nuestro laboratorio fonético te entrena en los pares mínimos donde más se
              equivocan los hispanohablantes.
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-white/90">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <span>Detección acústica inmediata de vocales largas y cortas</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <span>Guía visual de articulación y posición de labios y lengua</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <span>Tablero interactivo completo con los 44 sonidos del alfabeto IPA</span>
              </div>
            </div>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-sm transition-all"
            >
              <span>Explorar los 44 fonemas en el curso</span>
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Right: Interactive Minimal Pairs Playground */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl glass border border-brand-border/80 bg-brand-surface/40 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-brand-gold" />
                  Prueba Interactiva de Pares Mínimos
                </span>
                <span className="text-[11px] text-brand-text-muted">Haz clic para escuchar</span>
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
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Palabra A */}
                      <div className="p-5 rounded-2xl bg-black/40 border border-brand-cyan/30 text-center relative overflow-hidden group">
                        <span className="text-xs font-mono font-bold text-brand-cyan block mb-1">
                          {current.ipaA}
                        </span>
                        <h4 className="text-2xl sm:text-3xl font-black font-outfit text-white mb-1">
                          {current.wordA}
                        </h4>
                        <span className="text-xs text-brand-text-muted block mb-4">
                          {current.meaningA}
                        </span>
                        <button
                          onClick={() => handlePlayVoice(`${current.wordA}. ${current.meaningA}`)}
                          className="w-full py-2.5 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <Volume2 size={14} />
                          <span>Escuchar {current.wordA}</span>
                        </button>
                      </div>

                      {/* Palabra B */}
                      <div className="p-5 rounded-2xl bg-black/40 border border-emerald-400/30 text-center relative overflow-hidden group">
                        <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">
                          {current.ipaB}
                        </span>
                        <h4 className="text-2xl sm:text-3xl font-black font-outfit text-white mb-1">
                          {current.wordB}
                        </h4>
                        <span className="text-xs text-brand-text-muted block mb-4">
                          {current.meaningB}
                        </span>
                        <button
                          onClick={() => handlePlayVoice(`${current.wordB}. ${current.meaningB}`)}
                          className="w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <Volume2 size={14} />
                          <span>Escuchar {current.wordB}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePlayVoice(current.sampleAudioText)}
                      className="w-full py-3.5 rounded-xl glass border border-white/20 hover:border-brand-accent/60 text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Play size={14} className="fill-current text-brand-gold" />
                      <span>Escuchar explicación pedagógica con Guionbajo</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Currículum Oficial CEFR (64 Clases Estructuradas) ────────────── */}
      <section id="pensum" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Marco Común Europeo (CEFR)
          </span>
          <h2 className="text-3xl sm:text-5xl font-outfit font-black tracking-tight mt-4 mb-4">
            Un plan de 64 clases estructuradas
          </h2>
          <p className="text-sm sm:text-base text-brand-text-secondary">
            Avanza paso a paso desde el primer sonido hasta negociar con solvencia en inglés formal.
          </p>
        </div>

        {/* Level Switcher Tabs */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-10 overflow-x-auto pb-2">
          {CEFR_LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setSelectedCefr(lvl.id)}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all border ${
                selectedCefr === lvl.id
                  ? 'bg-gradient-to-r from-brand-accent to-purple-600 text-white border-white/30 shadow-lg shadow-brand-accent/30'
                  : 'glass border-white/10 text-brand-text-secondary hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {lvl.badge}
            </button>
          ))}
        </div>

        {/* Level Detail Card */}
        {(() => {
          const current = CEFR_LEVELS.find((l) => l.id === selectedCefr) || CEFR_LEVELS[0];
          return (
            <div className="p-8 sm:p-12 rounded-3xl glass border border-brand-border/80 bg-gradient-to-b from-brand-surface/60 to-brand-card/80 max-w-4xl mx-auto shadow-2xl">
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
                  {current.classes} Clases con Examen Checkpoint
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

      {/* ── 5. Final CTA Banner ────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-r from-brand-accent/30 via-indigo-900/40 to-brand-cyan/20 border border-brand-cyan/40 glass relative overflow-hidden shadow-[0_0_80px_rgba(108,99,255,0.25)]">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center mx-auto mb-6 relative overflow-visible">
            <TutorAvatar size="sm" emotion="victory" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-outfit font-black tracking-tight mb-4">
            Tu próximo nivel de inglés empieza hoy
          </h2>
          <p className="text-sm sm:text-lg text-brand-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed">
            Sin miedo al ridículo. Guionbajo te escucha pacientemente, te corrige con precisión y
            se adapta a tu ritmo en cada segundo.
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-brand-accent to-brand-cyan text-white font-black text-base sm:text-lg tracking-wide shadow-[0_0_35px_rgba(0,212,255,0.6)] hover:shadow-[0_0_50px_rgba(0,212,255,0.8)] transition-all border border-white/30 active:scale-95"
          >
            <span>Crear Mi Cuenta Gratuita</span>
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center text-xs text-brand-text-muted flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-outfit font-black text-white text-base">Guionbajo</span>
          <span>• AI Cognitive English Tutor</span>
        </div>
        <div className="flex gap-6">
          <Link href="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
          <Link href="/register" className="hover:text-white transition-colors">Registro</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Pizarra</Link>
        </div>
        <span>© {new Date().getFullYear()} Guionbajo. Todos los derechos reservados.</span>
      </footer>
    </div>
  );
}

