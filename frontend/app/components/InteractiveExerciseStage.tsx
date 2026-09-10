'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Mic,
  Image as ImageIcon,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Send,
  Square,
  Lock,
  Target,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { playEnglishAudio, api } from '@/lib/api';
import { sfx } from '@/lib/soundEffects';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export interface ExerciseItemData {
  id: string;
  sentence: string;
  options?: string[];
  expected_answer?: string;
  spanish_translation?: string;
  image_prompt?: string;
  image_url?: string;
  hint?: string;
}

interface InteractiveExerciseStageProps {
  exercises: ExerciseItemData[];
  phaseName: string;
  tutorSays?: string;
  phaseIdx: number;
  topicParam: string;
  lessonId?: string;
  minimaxImageMap: Record<string, string>;
  generatingImages: Record<string, boolean>;
  onFetchExerciseImage: (prompt: string, promptKey: string) => Promise<string>;
  onNextSlide: () => void;
  nextSlideLabel?: string;
  onProgressChange?: (correctCount: number, totalCount: number, isUnlocked: boolean) => void;
}

export default function InteractiveExerciseStage({
  exercises = [],
  phaseName,
  phaseIdx,
  topicParam,
  lessonId,
  minimaxImageMap,
  generatingImages,
  onFetchExerciseImage,
  onNextSlide,
  nextSlideLabel = "Pasar a la Práctica de Lectura 📖",
  onProgressChange,
}: InteractiveExerciseStageProps) {
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [evaluatedItems, setEvaluatedItems] = useState<Record<string, { isCorrect: boolean; feedback: string }>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isEvaluatingSpeech, setIsEvaluatingSpeech] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [groqWordFeedback, setGroqWordFeedback] = useState<Record<string, Array<{ word: string; status: 'correct' | 'mispronounced' | 'missing'; heard_as?: string }>>>({});
  const [groqPhoneticTips, setGroqPhoneticTips] = useState<Record<string, string>>({});

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Trigger image generation for all exercises on mount
  useEffect(() => {
    exercises.forEach((ex, idx) => {
      const promptKey = `ex-${phaseIdx}-${ex.id || idx}`;
      if (!minimaxImageMap[promptKey] && ex.image_prompt) {
        onFetchExerciseImage(ex.image_prompt, promptKey);
      }
    });
  }, [exercises, phaseIdx, onFetchExerciseImage, minimaxImageMap]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  if (!exercises || exercises.length === 0) {
    return null;
  }

  const currentEx = exercises[currentExIdx] || exercises[0];
  const promptKey = `ex-${phaseIdx}-${currentEx.id || currentExIdx}`;
  const exerciseImageUrl = minimaxImageMap[promptKey] || currentEx.image_url;
  const currentEval = evaluatedItems[currentEx.id];

  const handlePlayAudio = async (text: string) => {
    try {
      setPlayingAudio(text);
      await playEnglishAudio(text);
      setTimeout(() => setPlayingAudio(null), 1200);
    } catch (err) {
      console.error('Audio playback error:', err);
      setPlayingAudio(null);
    }
  };

  const silenceTimeoutRef = useRef<any>(null);
  const latestSpokenRef = useRef<string>('');

  const validateAnswer = async (answerText: string) => {
    if (!answerText || !answerText.trim()) {
      toast('Por favor di o escribe tu respuesta primero ✍️', { icon: '💡' });
      return;
    }

    const cleanAnswer = answerText.trim().toLowerCase().replace(/[.,!?;:"'()_-]/g, ' ').replace(/\s+/g, ' ').trim();
    const expected = (currentEx.expected_answer || '').trim().toLowerCase().replace(/[.,!?;:"'()_-]/g, ' ').replace(/\s+/g, ' ').trim();
    const fullSentence = (fullSentenceSpoken || '').toLowerCase().replace(/[.,!?;:"'()_-]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Strict, genuine evaluation:
    const answerWords = cleanAnswer.split(' ').filter(Boolean);
    const expectedWords = expected.split(' ').filter(Boolean);
    const fullSentenceWords = fullSentence.split(' ').filter(Boolean);

    let isDirectMatch = false;

    if (cleanAnswer === expected) {
      isDirectMatch = true;
    } else if (expectedWords.length === 1 && answerWords.includes(expectedWords[0])) {
      isDirectMatch = true;
    } else if (expectedWords.length > 1 && cleanAnswer.includes(expected)) {
      isDirectMatch = true;
    } else if (fullSentenceWords.length > 3) {
      // Check if student spoke the whole sentence (matches at least 65% of sentence words AND contains the expected target verb)
      const matchingCount = fullSentenceWords.filter(w => answerWords.includes(w)).length;
      const sentenceRatio = matchingCount / fullSentenceWords.length;
      const containsExpected = expectedWords.every(w => answerWords.includes(w));
      if (sentenceRatio >= 0.65 && containsExpected) {
        isDirectMatch = true;
      }
    }

    let isCorrect = isDirectMatch;
    let feedback = isCorrect
      ? `¡Excelente! Has respondido correctamente aplicando la regla de ${topicParam}.`
      : `Respuesta incorrecta: Tu respuesta fue "${answerText}". La forma correcta esperada es "${currentEx.expected_answer}". ${currentEx.hint || ''}`;

    // Backend AI evaluation if lessonId is present
    if (lessonId && answerText.length > 1) {
      try {
        setIsEvaluatingSpeech(true);
        const formData = new FormData();
        formData.append('phase', String(phaseIdx + 1));
        formData.append('answer', answerText);
        formData.append('question', currentEx.sentence || `Exercise ${currentExIdx + 1} for ${topicParam}`);
        formData.append('expected_answer', currentEx.expected_answer || '');
        const res = await api.evaluateLesson(lessonId, formData);
        if (res) {
          if (typeof res.is_correct === 'boolean') {
            isCorrect = res.is_correct;
          }
          if (res.feedback) {
            feedback = res.feedback;
          }
        }
      } catch (e) {
        console.warn('Backend evaluation fallback:', e);
      } finally {
        setIsEvaluatingSpeech(false);
      }
    }

    setEvaluatedItems(prev => ({
      ...prev,
      [currentEx.id]: { isCorrect, feedback }
    }));

    if (isCorrect) {
      sfx.playSuccessChime();
      toast.success('¡Correcto! 🎉', { id: `ex-eval-${currentEx.id}` });
      if (completedCount + 1 >= exercises.length) {
        setTimeout(() => sfx.playStreakFanfare(), 600);
      }
    } else {
      sfx.playMistake();
      toast.error('Respuesta incorrecta 💡', { id: `ex-eval-${currentEx.id}` });
    }
  };

  const handleSelectOption = (option: string) => {
    sfx.playPop();
    setSelectedAnswers(prev => ({ ...prev, [currentEx.id]: option }));
    setTextInputs(prev => ({ ...prev, [currentEx.id]: option }));
    validateAnswer(option);
  };

  // High-accuracy voice recording with Groq Whisper & Web Speech API preview
  const startVoiceRecording = async () => {
    if (typeof window === 'undefined') return;

    sfx.playMicStart();
    setLiveTranscript('');
    latestSpokenRef.current = '';
    audioChunksRef.current = [];

    // 1. Capture real audio stream via MediaRecorder for Groq Whisper
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start(100);
    } catch (err) {
      console.warn('MediaRecorder error or mic denied:', err);
    }

    // 2. Start live browser speech preview if available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const currentSpoken = (final || interim).trim();
        if (currentSpoken) {
          latestSpokenRef.current = currentSpoken;
          setLiveTranscript(currentSpoken);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('SpeechRecognition event in exercise:', e.error);
        }
      };

      recognitionRef.current = rec;
      try { rec.start(); } catch (_) {}
    }

    setIsRecording(true);
    toast('Micrófono activo 🎙️ Pronuncia la oración con calma.', { icon: '🎙️', duration: 3000 });
  };

  const stopVoiceRecording = async () => {
    setIsRecording(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = async () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 500) {
          setIsEvaluatingSpeech(true);
          try {
            const target = currentEx.expected_answer || fullSentenceSpoken;
            const res = await api.transcribeAndEvaluateSpeech(audioBlob, target, topicParam);
            if (res && res.success) {
              setLiveTranscript(res.transcription);
              setTextInputs(prev => ({ ...prev, [currentEx.id]: res.transcription }));
              setSelectedAnswers(prev => ({ ...prev, [currentEx.id]: res.transcription }));

              if (res.word_feedback && res.word_feedback.length > 0) {
                setGroqWordFeedback(prev => ({ ...prev, [currentEx.id]: res.word_feedback }));
              }
              if (res.phonetic_tip) {
                setGroqPhoneticTips(prev => ({ ...prev, [currentEx.id]: res.phonetic_tip }));
              }

              const isOk = res.is_correct;
              const fbk = res.phonetic_tip || (isOk ? '¡Pronunciación excelente!' : 'Revisa la articulación marcada.');

              setEvaluatedItems(prev => ({
                ...prev,
                [currentEx.id]: { isCorrect: isOk, feedback: fbk }
              }));

              if (isOk) {
                sfx.playSuccessChime();
                toast.success('¡Excelente pronunciación! 🎉');
                if (completedCount + 1 >= exercises.length) {
                  setTimeout(() => sfx.playStreakFanfare(), 600);
                }
              } else {
                sfx.playMistake();
                toast.error('Revisa la pronunciación marcada 💡');
              }
              return;
            }
          } catch (err) {
            console.warn('Groq speech evaluation error:', err);
          } finally {
            setIsEvaluatingSpeech(false);
          }
        }

        const textToValidate = latestSpokenRef.current.trim();
        if (textToValidate && textToValidate.length > 1) {
          validateAnswer(textToValidate);
        }
      };
      try { mr.stop(); } catch (_) {}
    } else {
      const textToValidate = latestSpokenRef.current.trim();
      if (textToValidate && textToValidate.length > 1) {
        validateAnswer(textToValidate);
      }
    }
  };

  const totalExercises = exercises.length;
  const minRequired = Math.ceil(totalExercises * 0.8);
  const completedCount = Object.keys(evaluatedItems).filter(k => evaluatedItems[k]?.isCorrect).length;
  const is80PercentMet = completedCount >= minRequired;
  const isAllCompleted = completedCount === totalExercises;
  const remainingTo80 = Math.max(0, minRequired - completedCount);
  const remainingToAll = Math.max(0, totalExercises - completedCount);
  const progressPercent = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  useEffect(() => {
    onProgressChange?.(completedCount, totalExercises, is80PercentMet);
  }, [completedCount, totalExercises, is80PercentMet, onProgressChange]);

  const handleNextClick = () => {
    if (!is80PercentMet) {
      sfx.playMistake();
      toast.error(
        `🔒 Práctica bloqueada: Debes resolver al menos ${remainingTo80} ejercicio${remainingTo80 > 1 ? 's' : ''} más correctamente (${minRequired} de ${totalExercises} para alcanzar el 80%).`,
        { id: 'practice-locked-toast', duration: 4500 }
      );
      return;
    }

    if (!isAllCompleted) {
      setShowIncompleteModal(true);
      return;
    }

    onNextSlide();
  };

  const handleFocusFirstIncomplete = () => {
    setShowIncompleteModal(false);
    const firstIncompleteIdx = exercises.findIndex(ex => !evaluatedItems[ex.id]?.isCorrect);
    if (firstIncompleteIdx !== -1) {
      setCurrentExIdx(firstIncompleteIdx);
    }
  };

  // Build full spoken sentence
  const fullSentenceSpoken = currentEx.sentence
    ? currentEx.sentence
        .replace(/_____/g, currentEx.expected_answer || '')
        .replace(/____/g, currentEx.expected_answer || '')
        .replace(/___/g, currentEx.expected_answer || '')
        .replace(/\[[^\]]+\]|\([^\)]+\)/g, currentEx.expected_answer || '')
        .trim()
    : '';

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-[#0a0f1d]/95 via-[#070a14]/98 to-[#04060b]/99 border border-brand-cyan/30 p-4 sm:p-7 md:p-8 shadow-2xl space-y-6 text-white relative overflow-hidden min-h-[560px] flex flex-col justify-between">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-gold/30 to-amber-500/20 border border-brand-gold/40 text-brand-gold shadow-lg shadow-brand-gold/10">
            <HelpCircle size={24} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-gold uppercase tracking-wider bg-brand-gold/15 px-2.5 py-0.5 rounded-full border border-brand-gold/30">
              <Sparkles size={13} className="animate-pulse" />
              <span>Desafíos Interáctivos ({exercises.length} Ejercicios)</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
              {phaseName || `Práctica de ${topicParam}`}
            </h3>
          </div>
        </div>

        {/* Exercise Switcher Navigation Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-black/50 p-1.5 rounded-2xl border border-white/10 overflow-x-auto max-w-full">
          {exercises.map((ex, idx) => {
            const isEvaluated = evaluatedItems[ex.id]?.isCorrect;
            const isSelected = idx === currentExIdx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (isRecording) stopVoiceRecording();
                  setCurrentExIdx(idx);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  isSelected
                    ? 'bg-brand-cyan text-black shadow-md shadow-brand-cyan/30 scale-105'
                    : isEvaluated
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{idx + 1}</span>
                {isEvaluated && <CheckCircle2 size={12} className="text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Arena: Split Diptych (Image on Left, Sentence Challenge on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto py-2 relative z-10 items-stretch">
        {/* LEFT: Contextual Scene Illustration */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="relative rounded-3xl overflow-hidden bg-black/70 border border-white/15 shadow-xl flex-1 flex flex-col justify-end min-h-[260px] sm:min-h-[320px] group">
            {exerciseImageUrl ? (
              <>
                <img
                  src={exerciseImageUrl}
                  alt={`Situación para ejercicio ${currentExIdx + 1}`}
                  className="w-full h-full max-h-[340px] object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                {/* Caption Tag */}
                <div className="absolute bottom-3 left-3 right-3 z-10">
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-black/85 backdrop-blur-md border border-white/15 shadow-lg">
                    <ImageIcon size={14} className="text-brand-cyan flex-shrink-0" />
                    <p className="text-xs text-zinc-200 leading-snug line-clamp-2">
                      {currentEx.spanish_translation || `Situación ilustrada para ${topicParam}`}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-black/60 min-h-[280px]">
                <Loader2 size={28} className="text-brand-cyan animate-spin mb-3" />
                <p className="text-xs text-white/70 font-mono">Generando ilustración de la escena...</p>
                <span className="text-[11px] text-zinc-500 mt-1 max-w-xs truncate">{currentEx.image_prompt}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Complete Sentence Challenge Arena */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4 p-5 sm:p-6 rounded-3xl bg-black/50 border border-white/15 backdrop-blur-md shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>Ejercicio {currentExIdx + 1} de {exercises.length}</span>
              </span>

              {fullSentenceSpoken && (
                <button
                  type="button"
                  onClick={() => handlePlayAudio(fullSentenceSpoken)}
                  className={`px-3 py-1 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    playingAudio === fullSentenceSpoken
                      ? 'bg-brand-cyan text-black border-brand-cyan'
                      : 'bg-white/10 hover:bg-white/20 border-white/20 text-brand-cyan'
                  }`}
                  title="Escuchar oración completa con pronunciación nativa"
                >
                  <Volume2 size={13} className="text-brand-cyan" />
                  <span>Escuchar Frase</span>
                </button>
              )}
            </div>

            {/* Complete Sentence Card with stylized blank */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2 shadow-inner">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold block">Oración a completar:</span>
              <p className="text-base sm:text-lg font-bold font-outfit text-white leading-relaxed">
                {currentEx.sentence}
              </p>
              {currentEx.spanish_translation && (
                <p className="text-xs text-zinc-400 italic pt-1 border-t border-white/5">
                  💡 "{currentEx.spanish_translation}"
                </p>
              )}
            </div>

            {/* Selectable Options Grid (if available) */}
            {currentEx.options && currentEx.options.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-300">Selecciona la opción correcta:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentEx.options.map((opt, oIdx) => {
                    const isSelected = (selectedAnswers[currentEx.id] || textInputs[currentEx.id]) === opt;
                    const isEvaluated = Boolean(currentEval);
                    const isCorrectOption = opt.trim().toLowerCase() === (currentEx.expected_answer || '').trim().toLowerCase();

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between gap-2 shadow-sm ${
                          isEvaluated && isCorrectOption
                            ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40'
                            : isEvaluated && isSelected && !isCorrectOption
                            ? 'bg-rose-500/25 border-rose-500 text-rose-300'
                            : isSelected
                            ? 'bg-brand-cyan text-black border-brand-cyan shadow-brand-cyan/20 scale-[1.02]'
                            : 'bg-zinc-900/90 hover:bg-zinc-800 border-white/10 text-white'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isEvaluated && isCorrectOption && <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />}
                        {isEvaluated && isSelected && !isCorrectOption && <XCircle size={15} className="text-rose-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Real-time Voice Transcript Live Indicator */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-3 text-xs text-rose-200"
                >
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
                  <div className="flex-1 truncate">
                    <span className="font-bold text-rose-300">Escuchando: </span>
                    <span className="italic">{liveTranscript || 'Pronuncia tu respuesta en inglés...'}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Word-level Groq Whisper Phonetic Alignment Badges */}
            {groqWordFeedback[currentEx.id] && groqWordFeedback[currentEx.id].length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-2xl bg-black/60 border border-brand-cyan/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-brand-cyan uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-brand-cyan" />
                    <span>Alineación Fonética Acústica (Groq Whisper)</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Evaluación palabra por palabra</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {groqWordFeedback[currentEx.id].map((wf, wIdx) => (
                    <span
                      key={wIdx}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-sm transition-all ${
                        wf.status === 'correct'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10'
                          : wf.status === 'mispronounced'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/10'
                      }`}
                      title={wf.heard_as ? `Escuchado como: "${wf.heard_as}"` : undefined}
                    >
                      <span>{wf.status === 'correct' ? '✓' : '⚠️'}</span>
                      <span>{wf.word}</span>
                      {wf.heard_as && wf.heard_as.toLowerCase() !== wf.word.toLowerCase() && (
                        <span className="text-[10px] opacity-80 font-normal">({wf.heard_as})</span>
                      )}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Smart Evaluation Feedback Box */}
            {currentEval && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                  currentEval.isCorrect
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}
              >
                {currentEval.isCorrect ? (
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <HelpCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block mb-0.5">
                    {currentEval.isCorrect ? '¡Excelente!' : '💡 Retroalimentación del Tutor:'}
                  </span>
                  <p className="leading-relaxed">{currentEval.feedback}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Voice Input, Typing & Action Buttons */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            {/* Direct Text Input for typing response */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribe tu respuesta o presiona el micrófono..."
                value={textInputs[currentEx.id] || ''}
                onChange={(e) => setTextInputs(prev => ({ ...prev, [currentEx.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    validateAnswer(textInputs[currentEx.id] || '');
                  }
                }}
                className="flex-1 bg-black/70 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-cyan"
              />
              <button
                type="button"
                disabled={isEvaluatingSpeech || !(textInputs[currentEx.id] || '').trim()}
                onClick={() => validateAnswer(textInputs[currentEx.id] || '')}
                className="px-3.5 py-2 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-black font-bold text-xs disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md shadow-brand-cyan/20"
                title="Validar respuesta escrita"
              >
                {isEvaluatingSpeech ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Validar</span>
              </button>
            </div>

            {/* Voice Recording Control */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 animate-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                }`}
              >
                {isRecording ? <Square size={14} className="fill-current" /> : <Mic size={14} />}
                <span>{isRecording ? 'Detener y Calificar ⏹️' : 'Responder por Voz 🎤'}</span>
              </motion.button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentExIdx === 0}
                  onClick={() => {
                    if (isRecording) stopVoiceRecording();
                    setCurrentExIdx(prev => Math.max(0, prev - 1));
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all"
                  title="Ejercicio anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  disabled={currentExIdx === exercises.length - 1}
                  onClick={() => {
                    if (isRecording) stopVoiceRecording();
                    setCurrentExIdx(prev => Math.min(exercises.length - 1, prev + 1));
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all"
                  title="Siguiente ejercicio"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 relative z-10 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-white/70">🎯 <strong>Progreso:</strong></span>
            <span className={`font-bold ${is80PercentMet ? 'text-emerald-400' : 'text-amber-400'}`}>
              {completedCount} de {totalExercises} completados ({progressPercent}%)
            </span>
          </div>
          <span className="text-zinc-500 text-[11px]">
            {is80PercentMet ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} className="inline" />
                Mínimo del 80% superado ({completedCount}/{totalExercises})
              </span>
            ) : (
              <span className="text-amber-400/90 font-medium flex items-center gap-1">
                <Lock size={12} className="inline" />
                Requiere 80% (mín. {minRequired} de {totalExercises} correctos • faltan {remainingTo80})
              </span>
            )}
          </span>
        </div>

        <motion.button
          type="button"
          onClick={handleNextClick}
          whileHover={is80PercentMet ? { scale: 1.03 } : { scale: 1.01 }}
          whileTap={is80PercentMet ? { scale: 0.97 } : {}}
          className={`w-full sm:w-auto px-7 py-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
            is80PercentMet
              ? 'bg-gradient-to-r from-brand-gold via-amber-400 to-brand-cyan text-black shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:shadow-[0_0_40px_rgba(251,191,36,0.7)] cursor-pointer'
              : 'bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 cursor-not-allowed opacity-80'
          }`}
          title={
            is80PercentMet
              ? (isAllCompleted ? 'Práctica completada al 100%. Avanzar al siguiente paso.' : 'Avanzar al siguiente paso (80% superado).')
              : `Bloqueado: Requiere al menos ${minRequired} de ${totalExercises} ejercicios correctos (80%)`
          }
        >
          {is80PercentMet ? (
            <>
              <span>{nextSlideLabel}</span>
              <ChevronRight size={18} />
            </>
          ) : (
            <>
              <Lock size={15} className="text-amber-400 animate-pulse" />
              <span>Bloqueado ({completedCount}/{minRequired} para 80%)</span>
            </>
          )}
        </motion.button>
      </div>

      {/* 🌟 Confirmation Modal: When 80% is met but some exercises remain incomplete */}
      <AnimatePresence>
        {showIncompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#13192f] via-[#0d1222] to-[#080c18] border border-brand-cyan/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(0,212,255,0.25)] text-white space-y-5"
            >
              {/* Header Badge & Title */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-lg shadow-brand-gold/10 flex-shrink-0">
                  <Target size={24} className="animate-pulse" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
                    🎯 Requisito del 80% superado ({completedCount}/{totalExercises})
                  </span>
                  <h4 className="text-lg sm:text-xl font-outfit font-extrabold text-white mt-1">
                    ¿Deseas continuar o completar la práctica al 100%?
                  </h4>
                </div>
              </div>

              {/* Engaging Pedagogical Notice */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                <p>
                  ¡Excelente avance! Ya has resuelto correctamente <strong className="text-emerald-400 font-bold">{completedCount} de {totalExercises} ejercicios</strong> ({progressPercent}%), cumpliendo el umbral mínimo pedagógico para avanzar.
                </p>
                <p className="text-zinc-400">
                  Sin embargo, aún te {remainingToAll === 1 ? 'queda' : 'quedan'} <strong className="text-brand-gold font-bold">{remainingToAll} {remainingToAll === 1 ? 'ejercicio pendiente' : 'ejercicios pendientes'}</strong>. Resolver todos los desafíos garantizará la fijación total de las estructuras gramaticales y el vocabulario en tu memoria a largo plazo.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                {/* Primary Button: Complete remaining */}
                <button
                  type="button"
                  onClick={handleFocusFirstIncomplete}
                  className="w-full sm:flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-accent via-indigo-500 to-brand-cyan hover:brightness-110 text-white font-extrabold text-xs sm:text-sm shadow-[0_0_25px_rgba(108,99,255,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles size={16} />
                  <span>Completar práctica al 100% 🎯</span>
                </button>

                {/* Secondary Button: Proceed anyway */}
                <button
                  type="button"
                  onClick={() => {
                    setShowIncompleteModal(false);
                    onNextSlide();
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-zinc-300 hover:text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Avanzar al siguiente slide</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
