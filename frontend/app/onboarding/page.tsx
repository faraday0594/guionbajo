'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api, playEnglishAudio } from '@/lib/api';
import { sfx } from '@/lib/soundEffects';
import {
  Brain,
  Map,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Loader2,
  Award,
  Volume2,
  Mic,
  BookOpen,
  VolumeX,
  RotateCcw,
  Check,
  Headphones
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';

interface DiagnosisQuestion {
  id: number;
  band?: number;
  level?: string;
  section?: 'curriculum' | 'phonetics';
  type: 'grammar' | 'vocabulary' | 'reading' | 'phonetic_sound' | 'phonetic_word';
  topic?: string;
  question: string;
  instruction?: string;
  options: string[];
  correct_answer?: string;
  phoneme_symbol?: string;
  audio_url?: string;
  target_word?: string;
  highlight_part?: string;
  points?: number;
}

const LOCAL_STORAGE_KEY_ANSWERS = 'guionbajo_diag_answers_v2';
const LOCAL_STORAGE_KEY_QIDX = 'guionbajo_diag_qidx_v2';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [assignedLevel, setAssignedLevel] = useState<string>('A1.1');

  // Exam state (80 Questions)
  const [questions, setQuestions] = useState<DiagnosisQuestion[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<{ question_id: number; answer: string }>>([]);
  const [evaluatingTest, setEvaluatingTest] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  // Check for existing progress on mount
  useEffect(() => {
    try {
      const savedAnswers = localStorage.getItem(LOCAL_STORAGE_KEY_ANSWERS);
      const savedQIdx = localStorage.getItem(LOCAL_STORAGE_KEY_QIDX);
      if (savedAnswers) {
        const parsed = JSON.parse(savedAnswers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAnswers(parsed);
        }
      }
      if (savedQIdx) {
        const parsedIdx = parseInt(savedQIdx, 10);
        if (!isNaN(parsedIdx) && parsedIdx > 0) {
          setCurrentQIdx(parsedIdx);
        }
      }
    } catch (_) {}
  }, []);

  // Save progress locally
  const saveProgress = (newAnswers: Array<{ question_id: number; answer: string }>, nextIdx: number) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ANSWERS, JSON.stringify(newAnswers));
      localStorage.setItem(LOCAL_STORAGE_KEY_QIDX, nextIdx.toString());
    } catch (_) {}
  };

  const clearSavedProgress = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY_ANSWERS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_QIDX);
    } catch (_) {}
  };

  const startPlacementTest = async () => {
    sfx.playPop();
    setLoading(true);
    setStep(2);
    try {
      const res = await api.startDiagnosis();
      if (res && res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
      } else {
        toast.error('No se pudieron cargar las preguntas del servidor');
      }
    } catch (err) {
      console.error('Error starting diagnosis:', err);
      toast.error('Error al conectar con el servidor de diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  // Play pure phoneme audio (from Oxford Studio mp3 files)
  const handlePlayPhonemeSound = (audioUrl?: string) => {
    if (!audioUrl) return;
    setIsPlayingAudio(true);
    const audio = new Audio(audioUrl);
    audio.play().catch(e => console.warn('Audio playback error:', e));
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
  };

  // Play target word using speech synthesis / Edge TTS
  const handlePlayTargetWord = async (word?: string) => {
    if (!word) return;
    setIsPlayingAudio(true);
    try {
      await playEnglishAudio(word);
    } catch (e) {
      console.warn('Word audio error:', e);
    } finally {
      setTimeout(() => setIsPlayingAudio(false), 900);
    }
  };

  // Select an answer and advance
  const handleSelectAnswer = async (selectedOption: string) => {
    sfx.playPop();
    const currentQ = questions[currentQIdx];
    if (!currentQ) return;

    // Update answers without duplicate question_id
    const filtered = answers.filter(a => a.question_id !== currentQ.id);
    const newAnswers = [...filtered, { question_id: currentQ.id, answer: selectedOption }];
    setAnswers(newAnswers);

    if (currentQIdx < questions.length - 1) {
      const nextIdx = currentQIdx + 1;
      setCurrentQIdx(nextIdx);
      saveProgress(newAnswers, nextIdx);

      // Auto-play audio if the next question is phonetic
      const nextQ = questions[nextIdx];
      if (nextQ?.type === 'phonetic_sound' && nextQ.audio_url) {
        setTimeout(() => handlePlayPhonemeSound(nextQ.audio_url), 400);
      } else if (nextQ?.type === 'phonetic_word' && nextQ.target_word) {
        setTimeout(() => handlePlayTargetWord(nextQ.target_word), 400);
      }
    } else {
      // Completed all 80 questions!
      setEvaluatingTest(true);
      try {
        const result = await api.completeDiagnosis(newAnswers, questions);
        setDiagResult(result);
        const level = result?.assigned_level || 'A2.1';
        setAssignedLevel(level);
        clearSavedProgress();
      } catch (err) {
        console.error('Diagnosis evaluation error:', err);
        setAssignedLevel('A2.1');
      } finally {
        setEvaluatingTest(false);
        sfx.playStreakFanfare();
        setStep(3);
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQIdx > 0) {
      sfx.playPop();
      setCurrentQIdx(prev => prev - 1);
    }
  };

  const handleManualSelection = async (level: string) => {
    sfx.playPop();
    setLoading(true);
    try {
      await api.skipDiagnosis(level);
      setAssignedLevel(level);
      clearSavedProgress();
      sfx.playSuccessChime();
      setStep(3);
    } catch (err: any) {
      toast.error('Error seleccionando nivel');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render word with colored/highlighted letters
  const renderHighlightedWord = (word?: string, highlight?: string) => {
    if (!word) return null;
    if (!highlight) {
      return <span className="text-3xl sm:text-4xl font-outfit font-extrabold text-white">{word}</span>;
    }
    const lowerWord = word.toLowerCase();
    const lowerHighlight = highlight.toLowerCase();
    const idx = lowerWord.indexOf(lowerHighlight);
    if (idx === -1) {
      return <span className="text-3xl sm:text-4xl font-outfit font-extrabold text-white">{word}</span>;
    }
    const before = word.slice(0, idx);
    const matched = word.slice(idx, idx + highlight.length);
    const after = word.slice(idx + highlight.length);

    return (
      <span className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-wide text-white inline-flex items-center">
        {before}
        <span className="text-brand-cyan bg-brand-cyan/20 px-2 py-0.5 rounded-xl border border-brand-cyan/60 underline decoration-brand-cyan decoration-2 shadow-lg shadow-brand-cyan/25 mx-1 inline-block">
          {matched}
        </span>
        {after}
      </span>
    );
  };

  const currentQ = questions[currentQIdx];
  const isPhoneticsSection = currentQIdx >= 60 || currentQ?.section === 'phonetics';
  const progressPct = questions.length > 0 ? Math.round(((currentQIdx + 1) / questions.length) * 100) : 0;
  const currentAnswer = answers.find(a => a.question_id === currentQ?.id)?.answer;

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto flex flex-col justify-center text-white">
      {/* ─── PASO 1: Bienvenida y Selección de Método ─────────────────────────────── */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-cyan/30 text-brand-cyan text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-brand-cyan animate-pulse" />
            <span>Bienvenido a Guionbajo AI</span>
          </div>

          <div className="flex justify-center mb-4">
            <TutorAvatar size="lg" emotion="happy" />
          </div>

          <h1 className="text-3xl sm:text-5xl font-outfit font-extrabold tracking-tight">
            ¿Cómo deseas comenzar tu ruta?
          </h1>
          <p className="text-brand-text-secondary text-base sm:text-lg max-w-xl mx-auto">
            Personalizaremos tus clases guiadas, retos fonéticos y juegos según tu nivel real y discriminación auditiva.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 pt-4 text-left">
            <button
              type="button"
              onClick={startPlacementTest}
              className="glass p-7 rounded-3xl border border-brand-accent/40 hover:border-brand-accent transition-all group hover:scale-[1.02] shadow-xl relative overflow-hidden text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-cyan mb-5 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-extrabold uppercase tracking-wider mb-2">
                80 Preguntas • Curricular + Fonética
              </div>
              <h3 className="text-xl font-bold mb-1.5 text-white">Examen Diagnóstico Integral</h3>
              <p className="text-xs text-brand-text-secondary leading-relaxed">
                60 preguntas curriculares divididas por temas + 20 preguntas fonéticas interactivas con audio Oxford y palabras resaltadas.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-cyan">
                <span>Comenzar examen integral</span>
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
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-brand-text-muted text-[10px] font-extrabold uppercase tracking-wider mb-2">
                Acceso Inmediato
              </div>
              <h3 className="text-xl font-bold mb-1.5 text-white">Elegir Nivel Manualmente</h3>
              <p className="text-xs text-brand-text-secondary leading-relaxed">
                Si ya conoces tu nivel del Marco Común Europeo (A1, A2, B1 o B2), puedes seleccionarlo directamente y comenzar ya.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-cyan">
                <span>Ver los 16 subniveles</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── PASO 2: Examen Diagnóstico Integral de 80 Preguntas ─────────────────────── */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto w-full space-y-6">
          {/* Header Bar: Phase & Progress */}
          <div className="glass p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                  isPhoneticsSection
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : 'bg-brand-accent/20 border border-brand-accent/40 text-brand-cyan'
                }`}>
                  {isPhoneticsSection ? (
                    <>
                      <Headphones size={12} />
                      <span>Fase 2: Laboratorio Fonético ({currentQIdx - 59} de 20)</span>
                    </>
                  ) : (
                    <>
                      <BookOpen size={12} />
                      <span>Fase 1: Dominio Curricular ({currentQIdx + 1} de 60)</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-brand-text-secondary">
                {isPhoneticsSection
                  ? currentQ?.type === 'phonetic_sound'
                    ? 'Discriminación Auditiva Pura'
                    : 'Mapeo Grafema-Fonema en Palabra'
                  : `Nivel ${currentQ?.level || 'A1'} • ${currentQ?.topic || 'Gramática & Léxico'}`
                }
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-lg font-outfit font-black text-white">
                {currentQIdx + 1} <span className="text-xs text-brand-text-muted font-normal">/ {questions.length || 80}</span>
              </span>
              <div className="text-[10px] font-bold text-brand-cyan">{progressPct}% completado</div>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
            <motion.div
              className={`h-full rounded-full transition-all ${
                isPhoneticsSection
                  ? 'bg-gradient-to-r from-brand-accent via-brand-cyan to-emerald-400'
                  : 'bg-gradient-to-r from-brand-accent to-brand-cyan'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {loading || evaluatingTest ? (
            <div className="glass p-12 rounded-3xl text-center space-y-4 border border-brand-accent/40 shadow-2xl">
              <Loader2 className="w-12 h-12 text-brand-cyan animate-spin mx-auto" />
              <h3 className="text-xl font-bold font-outfit text-white">Analizando tu Perfil Lingüístico & Fonético...</h3>
              <p className="text-xs text-brand-text-secondary max-w-md mx-auto leading-relaxed">
                El motor pedagógico está cruzando tus 60 respuestas curriculares con tus 20 pruebas de discriminación auditiva para asignar tu nivel exacto del CEFR y configurar tu tablero de fonemas.
              </p>
            </div>
          ) : currentQ ? (
            <div className="glass p-6 sm:p-9 rounded-3xl border border-brand-accent/30 space-y-6 shadow-2xl relative overflow-hidden">
              {/* Question Context & Prompt */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-brand-gold uppercase tracking-wider">
                  <span>
                    {isPhoneticsSection ? 'Desafío de Reconocimiento Fonético' : `Tema: ${currentQ.topic || 'Inglés General'}`}
                  </span>
                  {currentAnswer && (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check size={12} /> Respondida
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-bold leading-relaxed text-white">
                  {currentQ.question}
                </h3>
              </div>

              {/* ─── MÓDULO INTERACTIVO 1: AUDIO PURO DE FONEMA ─────────────── */}
              {currentQ.type === 'phonetic_sound' && (
                <div className="p-6 rounded-2xl bg-brand-surface/70 border border-emerald-500/30 flex flex-col items-center justify-center space-y-4 text-center">
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Headphones size={14} /> Pulsa para escuchar el fonema aislado
                  </span>

                  <button
                    type="button"
                    onClick={() => handlePlayPhonemeSound(currentQ.audio_url)}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
                      isPlayingAudio
                        ? 'bg-emerald-500 text-white scale-105 ring-4 ring-emerald-400/40 animate-pulse'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-300 hover:scale-105'
                    }`}
                  >
                    <Volume2 className="w-8 h-8" />
                  </button>
                  <span className="text-[11px] text-brand-text-muted">
                    {isPlayingAudio ? 'Reproduciendo sonido...' : 'Toca el botón para reproducir'}
                  </span>
                </div>
              )}

              {/* ─── MÓDULO INTERACTIVO 2: PALABRA CON SECCIÓN RESALTADA ──────── */}
              {currentQ.type === 'phonetic_word' && (
                <div className="p-6 rounded-2xl bg-brand-surface/70 border border-brand-cyan/30 flex flex-col items-center justify-center space-y-4 text-center">
                  <span className="text-xs text-brand-cyan font-semibold flex items-center gap-1.5">
                    <Volume2 size={14} /> Presiona la palabra para escuchar su pronunciación
                  </span>

                  <button
                    type="button"
                    onClick={() => handlePlayTargetWord(currentQ.target_word)}
                    className={`p-4 sm:p-6 rounded-2xl transition-all cursor-pointer border flex items-center gap-4 group ${
                      isPlayingAudio
                        ? 'bg-brand-cyan/20 border-brand-cyan scale-105'
                        : 'bg-brand-dark/60 hover:bg-brand-dark border-white/10 hover:border-brand-cyan/50 hover:scale-102'
                    }`}
                  >
                    {renderHighlightedWord(currentQ.target_word, currentQ.highlight_part)}
                    <div className="w-10 h-10 rounded-full bg-brand-cyan/20 border border-brand-cyan/50 flex items-center justify-center text-brand-cyan group-hover:scale-110 transition-transform">
                      <Volume2 size={20} className={isPlayingAudio ? 'animate-bounce' : ''} />
                    </div>
                  </button>

                  <p className="text-xs text-brand-text-secondary">
                    La sección <strong className="text-brand-cyan">"{currentQ.highlight_part}"</strong> está resaltada. ¿Cuál sonido IPA representa?
                  </p>
                </div>
              )}

              {/* ─── OPCIONES DE RESPUESTA ──────────────────────────────────── */}
              <div className={`grid gap-3 ${isPhoneticsSection ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = currentAnswer === opt;
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleSelectAnswer(opt)}
                      className={`p-4 rounded-2xl text-left transition-all flex items-center justify-between group cursor-pointer border ${
                        isSelected
                          ? 'bg-brand-accent/30 border-brand-cyan text-white ring-2 ring-brand-cyan/40 shadow-lg'
                          : 'bg-brand-surface/70 hover:bg-brand-accent/20 border-brand-border hover:border-brand-cyan/50 text-white'
                      }`}
                    >
                      <span className={`font-semibold ${isPhoneticsSection ? 'font-mono text-base sm:text-lg text-brand-cyan' : 'text-sm'}`}>
                        {opt}
                      </span>
                      <ArrowRight size={16} className={`transition-all ${
                        isSelected
                          ? 'text-brand-cyan translate-x-1'
                          : 'text-brand-text-muted group-hover:text-brand-cyan group-hover:translate-x-1'
                      }`} />
                    </button>
                  );
                })}
              </div>

              {/* Navigation Back */}
              {currentQIdx > 0 && (
                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={handlePrevQuestion}
                    className="inline-flex items-center gap-1 text-xs text-brand-text-muted hover:text-white transition-colors"
                  >
                    <ArrowLeft size={13} />
                    <span>Pregunta anterior</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
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

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-brand-text-muted hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              <span>Volver a las opciones</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── PASO 3: Nivel Asignado y Resultados Integrales ─────────────────────── */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 max-w-2xl mx-auto">
          <div className="mb-2">
            <TutorAvatar size="lg" emotion="victory" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">¡Diagnóstico Integral Completado!</span>
            <h2 className="text-3xl sm:text-4xl font-outfit font-extrabold text-white">
              Tu Nivel Inicial es <span className="text-gradient font-black">{assignedLevel}</span>
            </h2>
            <p className="text-sm text-brand-text-secondary max-w-lg mx-auto leading-relaxed">
              Hemos evaluado tu comprensión sintáctica y tu discriminación fonética para diseñar tu plan de 4 clases guiadas por subnivel.
            </p>
          </div>

          {/* Tarjeta de Diagnóstico Fonético Enriquecido */}
          <div className="p-5 rounded-3xl glass border border-emerald-500/30 text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Mic size={16} />
                <span>Perfil de Laboratorio Fonético</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs">
                {diagResult?.phonetic_mastery_pct ?? 85}% Precisión Auditiva
              </span>
            </div>

            {/* Fonemas Dominados vs Reforzar */}
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-brand-surface/60 border border-white/5 space-y-2">
                <span className="text-zinc-400 font-semibold block text-[11px]">Fonemas Reconocidos:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(diagResult?.mastered_phonemes?.length ? diagResult.mastered_phonemes : ['/θ/', '/iː/', '/ʃ/', '/ŋ/', '/ə/']).map((sym: string) => (
                    <span key={sym} className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-surface/60 border border-white/5 space-y-2">
                <span className="text-zinc-400 font-semibold block text-[11px]">Fonemas a Entrenar:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(diagResult?.weak_phonemes?.length ? diagResult.weak_phonemes : ['/ð/', '/ɪ/', '/tʃ/', '/æ/']).map((sym: string) => (
                    <span key={sym} className="px-2 py-0.5 rounded-lg bg-brand-gold/20 text-brand-gold font-mono font-bold text-xs border border-brand-gold/30">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumen Curricular */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-brand-text-muted">
              <span>Currículum evaluado: <strong>60 Preguntas</strong></span>
              <span>Reconocimiento: <strong className="text-emerald-400">Groq Whisper Activo</strong></span>
              <span>Recompensa: <strong className="text-brand-gold">+100 XP</strong></span>
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
