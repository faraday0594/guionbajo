'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, clearToken } from '@/lib/auth';
import { Settings, Lock, Play, CheckCircle2, Flame, Award, Loader2, Sparkles, BookOpen, Layers, Check, ChevronRight, Mic, Activity, LogOut } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import PhoneticBoard from '@/app/components/PhoneticBoard';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';
import JourneyVisualStage from '@/app/components/dashboard/JourneyVisualStage';

interface Module {
  id?: string;
  module_id?: string;
  title: string;
  level?: string;
  sublevel?: string;
  status?: 'COMPLETED' | 'CURRENT' | 'LOCKED' | 'completed' | 'current' | 'locked';
  topic: string;
  focus?: string;
  description?: string;
  phonetic_contrast?: string[];
  class_index?: number;
}

// Professional CEFR Pensum Catalog across all 16 sublevels (64 Structured Classes)
const CEFR_PENSUM: Record<string, { title: string; badge: string; modules: Module[] }> = {
  // ─── A1 (Foundation) ───────────────────────────────────────────────────────────
  'A1.1': {
    title: 'A1.1 — Getting Started',
    badge: 'A1 Foundation',
    modules: [
      { id: 'a11-1', title: 'English Sounds & Introductions', topic: 'English Sounds & Introductions', focus: 'Introducción fonética y verbo To Be', description: 'Hello, I am..., My name is..., Sonidos /iː/, /ɪ/, /e/, /æ/' },
      { id: 'a11-2', title: 'Personal Information', topic: 'Personal Information', focus: 'Información personal y posesivos', description: 'Where are you from? Affirmative/Negative be, /iː/ vs /ɪ/' },
      { id: 'a11-3', title: 'Objects & Possession', topic: 'Objects & Possession', focus: 'Demostrativos y plurales', description: 'This/That/These/Those, Reglas fonéticas de plural /s/, /z/, /ɪz/' },
      { id: 'a11-4', title: 'Review & Communication', topic: 'Review & Communication', focus: 'Integración A1.1 y producción', description: 'Presentación completa y descripción de pertenencias' },
    ],
  },
  'A1.2': {
    title: 'A1.2 — Daily Life',
    badge: 'A1 Foundation',
    modules: [
      { id: 'a12-1', title: 'Daily Routines', topic: 'Daily Routines', focus: 'Present Simple y 3ra persona', description: 'Rutinas cotidianas, terminación -s (/s/, /z/, /ɪz/)' },
      { id: 'a12-2', title: 'Questions & Negatives', topic: 'Questions & Negatives', focus: 'Do/Does y oraciones negativas', description: 'Don\'t/Doesn\'t, Word stress y reducción de auxiliares' },
      { id: 'a12-3', title: 'Time & Frequency', topic: 'Time & Frequency', focus: 'Horas y adverbios de frecuencia', description: 'Always, Sometimes, Sonido Schwa /ə/ en palabras funcionales' },
      { id: 'a12-4', title: 'A1.2 Integration', topic: 'A1.2 Integration', focus: 'Present Simple completo', description: 'Hábitos, pasatiempos y ritmo acentual integrado' },
    ],
  },
  'A1.3': {
    title: 'A1.3 — The World Around Me',
    badge: 'A1 Expansion',
    modules: [
      { id: 'a13-1', title: 'Present Continuous', topic: 'Present Continuous', focus: 'Acciones en progreso (-ing)', description: 'Present Simple vs Continuous, Pronunciación de /ɪŋ/' },
      { id: 'a13-2', title: 'Places & There is/are', topic: 'Places & There is / There are', focus: 'Lugares y preposiciones', description: 'There is/are, Sonido dental /θ/ (think, three, thanks)' },
      { id: 'a13-3', title: 'Can & Abilities', topic: 'Can & Abilities', focus: 'Habilidades y peticiones', description: 'Can/Can\'t, Consonantes finales y contraste /k/ vs /g/' },
      { id: 'a13-4', title: 'A1.3 Integration', topic: 'A1.3 Integration', focus: 'Descripción del entorno', description: 'Describir el hogar, habilidades y actividades simultáneas' },
    ],
  },
  'A1.4': {
    title: 'A1.4 — Past & Future Basics',
    badge: 'A1 Consolidation',
    modules: [
      { id: 'a14-1', title: 'Past Simple: Was/Were & -ed', topic: 'Past Simple: Was / Were & Regular Verbs', focus: 'Pasado simple regular', description: 'Was/were, Reglas fonéticas de -ed (/t/, /d/, /ɪd/)' },
      { id: 'a14-2', title: 'Irregular Past & Questions', topic: 'Irregular Past & Questions', focus: 'Verbos irregulares y Did', description: 'Went, saw, had, Questions with did, Consonant clusters' },
      { id: 'a14-3', title: 'Future Plans with Be Going To', topic: 'Future Plans with Be Going To', focus: 'Planes futuros e intenciones', description: 'Be going to, Diptongos /əʊ/ vs /aʊ/' },
      { id: 'a14-4', title: 'A1 Final Capstone', topic: 'A1 Final Integration & Capstone', focus: 'Certificación de Nivel A1', description: 'Integración holística: Pasado, Presente, Futuro y Fonética' },
    ],
  },

  // ─── A2 (Expansion) ────────────────────────────────────────────────────────────
  'A2.1': {
    title: 'A2.1 — Experiences & Events',
    badge: 'A2 Expansion',
    modules: [
      { id: 'a21-1', title: 'Past Events Consolidation', topic: 'Past Events Consolidation', focus: 'Consolidación de pasado', description: 'Expresiones temporales, Sentence stress en relatos' },
      { id: 'a21-2', title: 'Past Continuous', topic: 'Past Continuous & Interrupted Actions', focus: 'Acciones interrumpidas', description: 'Past Simple vs Continuous, Vocales largas /ɜː/ vs /ɔː/' },
      { id: 'a21-3', title: 'Experiences & Present Perfect', topic: 'Experiences & Present Perfect Intro', focus: 'Introducción al Present Perfect', description: 'Ever/Never, Contraste dental /θ/ vs /ð/' },
      { id: 'a21-4', title: 'A2.1 Integration', topic: 'A2.1 Integration', focus: 'Narración de experiencias', description: 'Anécdotas pasadas e integración de tiempos verbales' },
    ],
  },
  'A2.2': {
    title: 'A2.2 — Comparing & Describing',
    badge: 'A2 Expansion',
    modules: [
      { id: 'a22-1', title: 'Comparatives', topic: 'Comparatives', focus: 'Adjetivos comparativos', description: 'Comparative + than, Contraste vocal /æ/ vs /ʌ/ (cat/cut)' },
      { id: 'a22-2', title: 'Superlatives', topic: 'Superlatives', focus: 'Superlativos relativos', description: 'The most / the least, Acento de palabra en adjetivos largos' },
      { id: 'a22-3', title: 'Quantities', topic: 'Quantities & Countable / Uncountable', focus: 'Contables e incontables', description: 'Some/any, much/many, Contraste /ʃ/ vs /tʃ/' },
      { id: 'a22-4', title: 'A2.2 Integration', topic: 'A2.2 Integration', focus: 'Comparación y cantidades', description: 'Comparar ciudades, productos y estilos de vida' },
    ],
  },
  'A2.3': {
    title: 'A2.3 — Future & Obligation',
    badge: 'A2 Expansion',
    modules: [
      { id: 'a23-1', title: 'Future Forms Contrast', topic: 'Future Forms Contrast', focus: 'Will vs Going To vs Present Continuous', description: 'Planes vs predicciones, Contraste /w/ vs /v/' },
      { id: 'a23-2', title: 'Advice & Obligation', topic: 'Advice & Obligation', focus: 'Modales de obligación', description: 'Should, Must, Have to, Contracciones y formas débiles' },
      { id: 'a23-3', title: 'Possibility with Modals', topic: 'Possibility with May, Might & Could', focus: 'Grados de posibilidad', description: 'May, Might, Could, Reducción de Schwa /ə/' },
      { id: 'a23-4', title: 'A2.3 Integration', topic: 'A2.3 Integration', focus: 'Toma de decisiones', description: 'Planes futuros, consejos y posibilidades integradas' },
    ],
  },
  'A2.4': {
    title: 'A2.4 — Communication',
    badge: 'A2 Consolidation',
    modules: [
      { id: 'a24-1', title: 'First Conditional', topic: 'First Conditional', focus: 'Condicional de causa real', description: 'If + present, will + verb, Entonación condicional' },
      { id: 'a24-2', title: 'Relative Clauses Intro', topic: 'Relative Clauses Introduction', focus: 'Pronombres relativos', description: 'Who, Which, That, Contraste alveolar /r/ vs /l/' },
      { id: 'a24-3', title: 'Spatial Phrasal Verbs', topic: 'Everyday Phrasal Verbs: Spatial & Physical Particles', focus: 'Dirección física y partículas espaciales', description: 'Get in/out, sit down, stand up, turn on/off, pick up y connected speech' },
      { id: 'a24-4', title: 'A2 Final Capstone', topic: 'A2 Final Integration & Capstone', focus: 'Certificación de Nivel A2', description: 'Comunicación independiente en viajes, trabajo y sociedad' },
    ],
  },

  // ─── B1 (Independent Communication) ────────────────────────────────────────────
  'B1.1': {
    title: 'B1.1 — Narration & Experience',
    badge: 'B1 Independent',
    modules: [
      { id: 'b11-1', title: 'Present Perfect vs Past Simple', topic: 'Present Perfect vs Past Simple', focus: 'Tiempos terminados vs abiertos', description: 'Life experiences, Connected speech en auxiliares' },
      { id: 'b11-2', title: 'Present Perfect Continuous', topic: 'Present Perfect Continuous', focus: 'Duración con For y Since', description: 'Have been + -ing, Weak form de been /bɪn/' },
      { id: 'b11-3', title: 'Narrative Tenses', topic: 'Narrative Tenses', focus: 'Secuencia narrativa compleja', description: 'Past Simple, Continuous y Past Perfect, Sentence rhythm' },
      { id: 'b11-4', title: 'Storytelling & Integration', topic: 'Storytelling & Integration', focus: 'Relato y anécdotas', description: 'Narración cronológica fluida con conectores' },
    ],
  },
  'B1.2': {
    title: 'B1.2 — Opinions & Communication',
    badge: 'B1 Independent',
    modules: [
      { id: 'b12-1', title: 'Giving Opinions', topic: 'Giving Opinions & Linking Expressions', focus: 'Estructuras de opinión', description: 'Conectores de discurso, Entonación asertiva' },
      { id: 'b12-2', title: 'Comparisons & Preferences', topic: 'Comparisons & Preferences', focus: 'Preferencias matizadas', description: 'Prefer / Would rather, Contrastive stress' },
      { id: 'b12-3', title: 'Cognitive Logic: OUT & UP', topic: 'Phrasal Verbs: Cognitive Logic of OUT & UP', focus: 'Semántica cognitiva de OUT y UP', description: 'Descubrimiento (find out), agotamiento (run out) y completitud (clean up, turn up)' },
      { id: 'b12-4', title: 'B1.2 Integration', topic: 'B1.2 Integration: Opinions, Deductions & Phrasal Fluency', focus: 'Debate, deducción y fluidez de partículas', description: 'Intercambio crítico, deducciones lógicas y resolución de problemas' },
    ],
  },
  'B1.3': {
    title: 'B1.3 — Hypothetical English',
    badge: 'B1 Independent',
    modules: [
      { id: 'b13-1', title: 'Second Conditional', topic: 'Second Conditional', focus: 'Situaciones imaginarias', description: 'If + past, would + verb, Reducción de palabras funcionales' },
      { id: 'b13-2', title: 'Third Conditional', topic: 'Third Conditional', focus: 'Hipótesis del pasado', description: 'If + past perfect, would have + V3, Connected speech' },
      { id: 'b13-3', title: 'Wish & Regret', topic: 'Wish & Regret', focus: 'Deseos y arrepentimientos', description: 'Wish + past / past perfect, Entonación emocional' },
      { id: 'b13-4', title: 'Mixed Conditionals', topic: 'Mixed Conditionals & Integration', focus: 'Condicionales mixtos', description: 'Causa pasada con efecto presente, Rhythm + stress' },
    ],
  },
  'B1.4': {
    title: 'B1.4 — Complex Everyday English',
    badge: 'B1 Consolidation',
    modules: [
      { id: 'b14-1', title: 'Passive Voice', topic: 'Passive Voice', focus: 'Voz pasiva presente y pasada', description: 'Modal passive, Pronunciación de participios pasados' },
      { id: 'b14-2', title: 'Reported Speech', topic: 'Reported Speech', focus: 'Estilo indirecto', description: 'Statements, questions, commands, Reporting verbs intonation' },
      { id: 'b14-3', title: 'Particles: OFF, ON, AWAY, BACK', topic: 'Phrasal Verbs: Particle Semantics of OFF, ON, AWAY & BACK', focus: 'Semántica de trayectoria y continuidad', description: 'Separación (take off, call off), continuidad (carry on) y retorno (pay back)' },
      { id: 'b14-4', title: 'B1 Final Capstone', topic: 'B1 Final Integration & Assessment', focus: 'Certificación de Nivel B1', description: 'Evaluación integral: Debate, hipótesis, voz pasiva y ritmo natural' },
    ],
  },

  // ─── B2 (Advanced Control) ─────────────────────────────────────────────────────
  'B2.1': {
    title: 'B2.1 — Complex Grammar',
    badge: 'B2 Advanced Control',
    modules: [
      { id: 'b21-1', title: 'Advanced Perfect Tenses', topic: 'Advanced Perfect Tenses', focus: 'Tiempos perfectos combinados', description: 'Present Perfect, Continuous, Past Perfect, Future Perfect, Weak forms' },
      { id: 'b21-2', title: 'Advanced Passive & Causatives', topic: 'Advanced Passive & Causatives', focus: 'Pasiva de reporte y causativos', description: 'It is claimed that / Have something done, Stress complejo' },
      { id: 'b21-3', title: 'Advanced Modals: Deduction & Regret', topic: 'Advanced Modals: Deduction & Regret', focus: 'Deducción y reproche pasado', description: 'Must have / Should have done, Entonación de certeza' },
      { id: 'b21-4', title: 'B2.1 Integration', topic: 'B2.1 Integration', focus: 'Evaluación de evidencia', description: 'Explicar situaciones complejas y evaluar causas' },
    ],
  },
  'B2.2': {
    title: 'B2.2 — Natural English',
    badge: 'B2 Advanced Control',
    modules: [
      { id: 'b22-1', title: 'Advanced Particle Networks', topic: 'Phrasal Verbs: Advanced Cognitive Semantics & Multi-Particle Networks', focus: 'Redes semánticas multi-partícula', description: 'Registro ejecutivo (iron out, step down, look over, follow through, phase out)' },
      { id: 'b22-2', title: 'Three-Part Phrasals & Syntax', topic: 'Three-Part Phrasal Verbs & Separability Mechanics', focus: 'Regla del sándwich del pronombre y 3 partes', description: 'Separabilidad (figure it out), inseparables (come up with, cut down on, put up with)' },
      { id: 'b22-3', title: 'Idiomatic English', topic: 'Idiomatic English & Fixed Expressions', focus: 'Modismos y colocaciones metafóricas', description: 'Idioms profesionales y casuales, Reducción y linking nativo' },
      { id: 'b22-4', title: 'B2.2 Integration', topic: 'Advanced Verb Patterns & B2.2 Integration', focus: 'Conversación ejecutiva y patrones verbales', description: 'Gerundio vs infinitivo con cambio de significado y síntesis idiomática' },
    ],
  },
  'B2.3': {
    title: 'B2.3 — Argumentation',
    badge: 'B2 Advanced Control',
    modules: [
      { id: 'b23-1', title: 'Advanced Conditionals & Inversion', topic: 'Advanced Conditionals & Inversion', focus: 'Condicionales invertidos', description: 'Had I known, Should you require, Énfasis prosódico' },
      { id: 'b23-2', title: 'Hedging & Nuanced Caution', topic: 'Hedging & Nuanced Caution', focus: 'Lenguaje diplomático cauteloso', description: 'It seems, Arguably, Tend to, Entonación de matiz' },
      { id: 'b23-3', title: 'Contrast & Concession', topic: 'Contrast & Concession', focus: 'Cláusulas de concesión', description: 'Although, Despite, Nevertheless, Contrastive stress' },
      { id: 'b23-4', title: 'High-Stakes Debate & Integration', topic: 'High-Stakes Debate & Integration', focus: 'Debate de alto impacto', description: 'Argumento, contra-argumento y refutación con pausas oratorias' },
    ],
  },
  'B2.4': {
    title: 'B2.4 — Professional & Academic Communication',
    badge: 'B2 Full Mastery',
    modules: [
      { id: 'b24-1', title: 'Formal English & Nominalization', topic: 'Formal English & Nominalization', focus: 'Nominalización y registro formal', description: 'Sustantivación de verbos, Ritmo de discurso ejecutivo' },
      { id: 'b24-2', title: 'Complex Relative Structures', topic: 'Complex Relative Structures', focus: 'Cláusulas relativas reducidas', description: 'Participle clauses, Thought chunking' },
      { id: 'b24-3', title: 'Nuance & Lexical Precision', topic: 'Nuance & Lexical Precision', focus: 'Precisión semántica entre sinónimos', description: 'Near-synonyms, Prosodia que altera el significado' },
      { id: 'b24-4', title: 'B2 Final Capstone: Professional Mastery', topic: 'B2 Final Capstone: Professional Mastery', focus: 'Certificación Final CEFR B2', description: 'Pitch ejecutivo, debate formal, fluidez nativa y prosodia avanzada' },
    ],
  },
};

const STAGES = ['A1', 'A2', 'B1', 'B2'];
const SUBLEVEL_MAP: Record<string, string[]> = {
  'A1': ['A1.1', 'A1.2', 'A1.3', 'A1.4'],
  'A2': ['A2.1', 'A2.2', 'A2.3', 'A2.4'],
  'B1': ['B1.1', 'B1.2', 'B1.3', 'B1.4'],
  'B2': ['B2.1', 'B2.2', 'B2.3', 'B2.4'],
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    name: 'Estudiante',
    current_level: 'A1',
    current_sublevel: 'A1.1',
    total_xp: 0,
    streak_days: 0,
  });

  const [currentClassIndex, setCurrentClassIndex] = useState(1);
  const [activeCheckpoint, setActiveCheckpoint] = useState<any>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!getToken()) {
        router.replace('/login');
        return;
      }
      try {
        const [me, stats, checkpointRes] = await Promise.all([
          api.getMe().catch(() => null),
          api.getStats().catch(() => null),
          api.getLessonCheckpoint().catch(() => null),
        ]);

        if (me) {
          setUserStats(prev => ({ ...prev, name: me.name || prev.name }));
        }

        const userSublevel = stats?.current_sublevel || 'A1.1';
        const userStage = userSublevel.split('.')[0] || 'A1';
        const classIdx = stats?.current_class_index || checkpointRes?.current_class_index || 1;

        setUserStats(prev => ({
          ...prev,
          current_level: userStage,
          current_sublevel: userSublevel,
          total_xp: stats?.total_xp ?? prev.total_xp,
          streak_days: stats?.streak_days ?? prev.streak_days,
        }));
        setCurrentClassIndex(classIdx);

        let cp = checkpointRes?.checkpoint || stats?.active_checkpoint || null;
        if (!cp && typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('guionbajo_lesson_checkpoint');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && (!parsed.sublevel || parsed.sublevel === userSublevel)) {
                cp = parsed;
              }
            }
          } catch (_) {}
        }
        setActiveCheckpoint(cp);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const [dashboardTab, setDashboardTab] = useState<'curriculum' | 'phonetics'>('curriculum');

  const handleLaunchMission = () => {
    const pensum = CEFR_PENSUM[userStats.current_sublevel] || CEFR_PENSUM['A1.1'];
    const activeMod = pensum.modules[currentClassIndex - 1] || pensum.modules[0];
    const topic = activeCheckpoint?.topic || activeMod.topic || activeMod.title;
    const sublevel = userStats.current_sublevel;
    const classIdx = currentClassIndex;
    const lessonId = activeCheckpoint?.lesson_id || 'new';

    toast.success(`Continuando Clase ${classIdx}: "${topic}" (${sublevel})`);
    router.push(`/lesson/${lessonId}?topic=${encodeURIComponent(topic)}&sublevel=${encodeURIComponent(sublevel)}&class_index=${classIdx}&resume=true`);
  };

  const handleLogout = () => {
    clearToken();
    toast.success('Sesión cerrada correctamente');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-brand-accent animate-spin mb-4" />
        <p className="text-brand-text-secondary animate-pulse">Cargando tu pensum profesional de inglés...</p>
      </div>
    );
  }

  const currentPensum = CEFR_PENSUM[userStats.current_sublevel] || CEFR_PENSUM['A1.1'];
  const activeModule = currentPensum.modules[currentClassIndex - 1] || currentPensum.modules[0];
  const activeTopic = activeCheckpoint?.topic || activeModule?.topic || activeModule?.title || 'Daily Workout';

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row text-white">
      {/* Main Dashboard Workspace */}
      <main className="flex-1 p-4 sm:p-8 md:p-12 overflow-y-auto max-w-6xl mx-auto w-full">
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-brand-border/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-cyan">
                Nivel Activo: {userStats.current_sublevel}
              </span>
              <span className="text-xs text-brand-text-muted">Pensum Adaptativo de 7 Capas</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-outfit font-bold">
              ¡Hola, {userStats.name}! 👋
            </h1>
          </div>

          {/* User Stats Badges & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 glass rounded-2xl border border-brand-gold/30">
              <Flame className="w-4 h-4 text-brand-gold fill-brand-gold animate-bounce" />
              <div>
                <div className="text-[10px] text-brand-text-muted">Racha</div>
                <div className="text-xs font-bold text-brand-gold">{userStats.streak_days} días</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 glass rounded-2xl border border-brand-cyan/30">
              <Award className="w-4 h-4 text-brand-cyan" />
              <div>
                <div className="text-[10px] text-brand-text-muted">XP Total</div>
                <div className="text-xs font-bold text-brand-cyan">{userStats.total_xp} XP</div>
              </div>
            </div>

            <Link href="/settings" className="p-2.5 glass rounded-2xl hover:bg-brand-surface border border-brand-border transition-colors" title="Configuración">
              <Settings className="w-4 h-4 text-brand-text-secondary hover:text-white" />
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 glass rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-white transition-all text-xs font-semibold"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>

        {/* Dashboard Top Mode Switcher */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setDashboardTab('curriculum')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              dashboardTab === 'curriculum'
                ? 'bg-brand-accent border border-brand-cyan text-white shadow-lg shadow-brand-accent/20'
                : 'glass border border-brand-border text-brand-text-secondary hover:text-white hover:bg-brand-surface'
            }`}
          >
            <BookOpen size={16} className={dashboardTab === 'curriculum' ? 'text-brand-cyan' : ''} />
            <span>Tu Clase del Día (Ruta Personalizada)</span>
          </button>

          <button
            onClick={() => setDashboardTab('phonetics')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              dashboardTab === 'phonetics'
                ? 'bg-emerald-600 border border-emerald-400 text-white shadow-lg shadow-emerald-600/20'
                : 'glass border border-brand-border text-brand-text-secondary hover:text-white hover:bg-brand-surface'
            }`}
          >
            <Mic size={16} className={dashboardTab === 'phonetics' ? 'text-emerald-300' : ''} />
            <span>Tablero Fonético Explorable (44 Sonidos)</span>
          </button>
        </div>

        {dashboardTab === 'phonetics' ? (
          <PhoneticBoard />
        ) : (
          <>
            {/* 🌌 Cyberpunk 3D Perspective Journey & GPS Radar Stage */}
            <JourneyVisualStage
              sublevel={userStats.current_sublevel}
              classIndex={currentClassIndex}
              activeCheckpoint={activeCheckpoint}
              onLaunchClass={handleLaunchMission}
            />

            {/* 📍 Checkpoint Timeline Status Bar (4 Etapas de la Clase Actual) */}
            <div className="mb-8 p-6 rounded-3xl glass border border-brand-accent/30 shadow-xl bg-brand-surface/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Estado en Vivo de tu Clase • {userStats.current_sublevel} Clase {currentClassIndex}
                  </span>
                </div>
                {activeCheckpoint && (
                  <div className="flex items-center gap-2 text-xs py-1 px-3 rounded-xl bg-black/40 border border-white/10">
                    <Activity size={13} className={activeCheckpoint.overall_score >= 80 ? 'text-emerald-400' : 'text-amber-400'} />
                    <span className="text-brand-text-secondary">Puntaje Global:</span>
                    <strong className={activeCheckpoint.overall_score >= 80 ? 'text-emerald-300' : 'text-amber-300'}>
                      {activeCheckpoint.overall_score || 0}%
                    </strong>
                    <span className="text-[10px] text-brand-text-muted">
                      (Requiere ≥ 80% para aprobar)
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Etapa 1: Pizarra Didáctica */}
                <div className={`p-3 rounded-2xl border text-xs transition-all ${
                  activeCheckpoint?.current_slide > 0 || activeCheckpoint?.quiz_completed
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-sm'
                    : 'bg-brand-surface/50 border-brand-border/70 text-brand-text-secondary'
                }`}>
                  <div className="font-bold flex items-center justify-between gap-1 mb-1">
                    <span>1. Pizarra</span>
                    {activeCheckpoint?.current_slide > 0 || activeCheckpoint?.quiz_completed ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-accent/30 text-brand-cyan">Activa</span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-85 truncate">
                    {activeCheckpoint?.current_slide ? `Diapositiva ${activeCheckpoint.current_slide + 1}` : 'Explicación'}
                  </div>
                </div>

                {/* Etapa 2: Examen Teórico */}
                <div className={`p-3 rounded-2xl border text-xs transition-all ${
                  activeCheckpoint?.quiz_completed
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : activeCheckpoint && activeCheckpoint.current_slide >= 2
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                      : 'bg-brand-surface/50 border-brand-border/70 text-brand-text-secondary'
                }`}>
                  <div className="font-bold flex items-center justify-between gap-1 mb-1">
                    <span>2. Examen</span>
                    {activeCheckpoint?.quiz_completed ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : activeCheckpoint && activeCheckpoint.current_slide >= 2 ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300">Repetir</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] opacity-85 truncate">
                    {activeCheckpoint?.quiz_completed
                      ? `${activeCheckpoint.quiz_score || 80}% pts`
                      : activeCheckpoint && activeCheckpoint.current_slide >= 2
                        ? 'Pendiente de repetir'
                        : 'Práctica Quiz'}
                  </div>
                </div>

                {/* Etapa 3: Lectura IPA */}
                <div className={`p-3 rounded-2xl border text-xs transition-all ${
                  activeCheckpoint?.reading_completed
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : activeCheckpoint?.view_mode === 'reading'
                      ? 'bg-brand-cyan/20 border-brand-cyan/50 text-brand-cyan'
                      : 'bg-brand-surface/50 border-brand-border/70 text-brand-text-secondary'
                }`}>
                  <div className="font-bold flex items-center justify-between gap-1 mb-1">
                    <span>3. Lectura IPA</span>
                    {activeCheckpoint?.reading_completed ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : null}
                  </div>
                  <div className="text-[11px] opacity-85 truncate">
                    {activeCheckpoint?.reading_completed
                      ? `${activeCheckpoint.reading_score || 85}% pts`
                      : '3 Escenas Visuales'}
                  </div>
                </div>

                {/* Etapa 4: Zona de Juegos */}
                <div className={`p-3 rounded-2xl border text-xs transition-all ${
                  activeCheckpoint?.mystery_word_completed
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : activeCheckpoint?.view_mode === 'games'
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                      : 'bg-brand-surface/50 border-brand-border/70 text-brand-text-secondary'
                }`}>
                  <div className="font-bold flex items-center justify-between gap-1 mb-1">
                    <span>4. Juegos</span>
                    {activeCheckpoint?.mystery_word_completed ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : activeCheckpoint?.view_mode === 'games' ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300">Pendiente</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] opacity-85 truncate">
                    {activeCheckpoint?.mystery_word_completed
                      ? 'Palabra Resuelta'
                      : 'Palabra Misteriosa'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
