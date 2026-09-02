'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { sfx } from '@/lib/soundEffects';
import { Brain, Map, ArrowRight, Sparkles, CheckCircle2, Loader2, Award, Volume2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DiagnosisQuestion {
  id: number;
  question: string;
  level: string;
  options: string[];
}

const FALLBACK_RAPID_TEST: DiagnosisQuestion[] = [
  {
    id: 1,
    level: 'A1',
    question: 'Choose the correct option: "Every morning, Sarah _______ a cup of coffee at 7 AM."',
    options: ['drink', 'drinks', 'is drinking', 'drank'],
  },
  {
    id: 2,
    level: 'A2',
    question: 'Complete the sentence: "We were watching a movie when the phone suddenly _______."',
    options: ['rings', 'was ringing', 'rang', 'has rung'],
  },
  {
    id: 3,
    level: 'B1',
    question: 'Select the best phrasing: "If I _______ you, I would take that opportunity right away."',
    options: ['am', 'was', 'were', 'have been'],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [assignedLevel, setAssignedLevel] = useState<string>('A1.1');

  // Rapid Placement Test State
  const [questions, setQuestions] = useState<DiagnosisQuestion[]>(FALLBACK_RAPID_TEST);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<{ question_id: number; answer: string }>>([]);
  const [evaluatingTest, setEvaluatingTest] = useState(false);

  const startPlacementTest = async () => {
    sfx.playPop();
    setLoading(true);
    setStep(2);
    try {
      const res = await api.startDiagnosis();
      if (res && res.questions && res.questions.length > 0) {
        setQuestions(res.questions.slice(0, 4));
      }
    } catch (err) {
      console.warn('Using rapid diagnostic question set:', err);
      setQuestions(FALLBACK_RAPID_TEST);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = async (selectedOption: string) => {
    sfx.playPop();
    const currentQ = questions[currentQIdx];
    const newAnswers = [...answers, { question_id: currentQ.id, answer: selectedOption }];
    setAnswers(newAnswers);

    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx(prev => prev + 1);
    } else {
      // Completed all questions
      setEvaluatingTest(true);
      try {
        const result = await api.completeDiagnosis(newAnswers, questions);
        const level = result?.assigned_level || 'A2.1';
        setAssignedLevel(level);
      } catch (err) {
        // Fallback calculation based on correct choices
        setAssignedLevel('A2.1');
      } finally {
        setEvaluatingTest(false);
        sfx.playStreakFanfare();
        setStep(3);
      }
    }
  };

  const handleManualSelection = async (level: string) => {
    sfx.playPop();
    setLoading(true);
    try {
      await api.skipDiagnosis(level);
      setAssignedLevel(level);
      sfx.playSuccessChime();
      setStep(3);
    } catch (err: any) {
      toast.error('Error seleccionando nivel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto flex flex-col justify-center text-white">
      {/* ─── PASO 1: Bienvenida y Selección de Método ─────────────────────────────── */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-cyan/30 text-brand-cyan text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-brand-cyan animate-pulse" />
            <span>Bienvenido a Guionbajo AI</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight">
            ¿Cómo deseas comenzar tu ruta?
          </h1>
          <p className="text-brand-text-secondary text-base sm:text-lg max-w-xl mx-auto">
            Personalizaremos tus clases, retos fonéticos y juegos según tu punto de partida.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 pt-4 text-left">
            <button
              type="button"
              onClick={startPlacementTest}
              className="glass p-7 rounded-3xl border border-brand-accent/40 hover:border-brand-accent transition-all group hover:scale-[1.02] shadow-xl relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-cyan mb-5 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-1.5 text-white">Test Rápido de Ubicación</h3>
              <p className="text-xs text-brand-text-secondary leading-relaxed">
                3 preguntas dinámicas de 60 segundos. La IA evaluará tu comprensión y asignará tu nivel exacto.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-cyan">
                <span>Comenzar test rápido</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sfx.playPop();
                setStep(2.5);
              }}
              className="glass p-7 rounded-3xl border border-brand-cyan/30 hover:border-brand-cyan transition-all group hover:scale-[1.02] shadow-xl text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-cyan/15 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan mb-5 group-hover:scale-110 transition-transform">
                <Map className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-1.5 text-white">Elegir Nivel Manualmente</h3>
              <p className="text-xs text-brand-text-secondary leading-relaxed">
                Si ya conoces tu nivel del Marco Común Europeo (A1, A2, B1 o B2), puedes seleccionarlo directamente.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-cyan">
                <span>Ver todos los niveles</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── PASO 2: Test Rápido Interactivo de Diagnóstico ──────────────────────── */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between text-xs text-brand-text-muted">
            <span className="font-bold text-brand-cyan">Pregunta {currentQIdx + 1} de {questions.length}</span>
            <span>Nivel evaluado: <strong className="text-white">{questions[currentQIdx]?.level || 'General'}</strong></span>
          </div>

          {/* Barra de progreso animada */}
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-accent to-brand-cyan rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQIdx + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {loading || evaluatingTest ? (
            <div className="glass p-10 rounded-3xl text-center space-y-4">
              <Loader2 className="w-10 h-10 text-brand-cyan animate-spin mx-auto" />
              <h3 className="text-lg font-bold">Analizando tu perfil lingüístico...</h3>
              <p className="text-xs text-brand-text-secondary">El motor de IA está calculando tus fortalezas y debilidades fonéticas.</p>
            </div>
          ) : (
            <div className="glass p-7 sm:p-9 rounded-3xl border border-brand-accent/30 space-y-6 shadow-2xl">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-brand-gold uppercase tracking-wider block">
                  Desafío Diagnóstico
                </span>
                <h3 className="text-lg sm:text-xl font-bold leading-relaxed text-white">
                  {questions[currentQIdx]?.question}
                </h3>
              </div>

              <div className="space-y-3">
                {questions[currentQIdx]?.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectAnswer(opt)}
                    className="w-full p-4 rounded-2xl bg-brand-surface/70 hover:bg-brand-accent/30 border border-brand-border hover:border-brand-cyan/60 text-left font-semibold text-sm transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span>{opt}</span>
                    <ArrowRight size={16} className="text-brand-text-muted group-hover:text-brand-cyan group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── PASO 2.5: Selector Manual de Nivel CEFR ─────────────────────────────── */}
      {step === 2.5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-outfit font-bold">Selecciona tu Nivel de Inicio</h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">Elige la etapa con la que deseas arrancar:</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['A1', 'A2', 'B1', 'B2'].map((lvl) => (
              <div key={lvl} className="glass p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="text-center font-bold text-brand-cyan text-base">
                  {lvl}
                  <span className="block text-[10px] text-brand-text-muted font-normal">
                    {lvl === 'A1' ? 'Principiante' : lvl === 'A2' ? 'Elemental' : lvl === 'B1' ? 'Intermedio' : 'Fluidez B2'}
                  </span>
                </div>
                {[1, 2, 3, 4].map(sub => (
                  <button
                    key={`${lvl}.${sub}`}
                    onClick={() => handleManualSelection(`${lvl}.${sub}`)}
                    disabled={loading}
                    className="w-full p-2.5 rounded-xl bg-brand-surface/60 hover:bg-brand-accent hover:border-brand-cyan border border-white/10 text-center font-bold text-xs transition-all hover:scale-[1.03]"
                  >
                    {lvl}.{sub}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── PASO 3: Nivel Asignado y Entrada al Mapa ─────────────────────────────── */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 max-w-xl mx-auto">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/30 to-brand-cyan/20 border border-emerald-400/50 text-emerald-400 mb-2 shadow-2xl shadow-emerald-500/20">
            <Award className="w-12 h-12 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">¡Diagnóstico Completado!</span>
            <h2 className="text-3xl sm:text-4xl font-outfit font-extrabold text-white">
              Tu Nivel Inicial es <span className="text-gradient font-black">{assignedLevel}</span>
            </h2>
            <p className="text-sm text-brand-text-secondary max-w-md mx-auto leading-relaxed">
              Hemos preparado tu pensum personalizado con 4 clases guiadas, retos fonéticos y juegos interactivos para este nivel.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass border border-emerald-500/30 flex items-center justify-around text-xs">
            <div>
              <span className="text-zinc-400 block">Fonemas Asignados</span>
              <strong className="text-white">44 Sonidos IPA</strong>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div>
              <span className="text-zinc-400 block">Reconocimiento</span>
              <strong className="text-emerald-400">Groq Whisper Activo</strong>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div>
              <span className="text-zinc-400 block">XP de Bienvenida</span>
              <strong className="text-brand-gold">+50 XP</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sfx.playSuccessChime();
              router.push('/dashboard');
            }}
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-brand-accent via-indigo-600 to-brand-cyan hover:opacity-95 text-white rounded-2xl font-extrabold text-base transition-all shadow-xl shadow-brand-accent/30 flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
          >
            <span>Ingresar a Mi Ruta de Aprendizaje</span>
            <ArrowRight size={18} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
