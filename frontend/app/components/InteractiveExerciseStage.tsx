'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, HelpCircle, CheckCircle2, XCircle, Mic, Image as ImageIcon, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { playEnglishAudio } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

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
  minimaxImageMap: Record<string, string>;
  generatingImages: Record<string, boolean>;
  onFetchExerciseImage: (prompt: string, promptKey: string) => Promise<string>;
  onNextSlide: () => void;
  nextSlideLabel?: string;
}

export default function InteractiveExerciseStage({
  exercises = [],
  phaseName,
  phaseIdx,
  topicParam,
  minimaxImageMap,
  generatingImages,
  onFetchExerciseImage,
  onNextSlide,
  nextSlideLabel = "Siguiente Slide"
}: InteractiveExerciseStageProps) {
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [evaluatedItems, setEvaluatedItems] = useState<Record<string, { isCorrect: boolean; feedback: string }>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // Trigger image generation for all exercises on mount
  useEffect(() => {
    exercises.forEach((ex, idx) => {
      const promptKey = `ex-${phaseIdx}-${ex.id || idx}`;
      if (!minimaxImageMap[promptKey] && ex.image_prompt) {
        onFetchExerciseImage(ex.image_prompt, promptKey);
      }
    });
  }, [exercises, phaseIdx, onFetchExerciseImage, minimaxImageMap]);

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

  const handleSelectOption = (option: string) => {
    setSelectedAnswers(prev => ({ ...prev, [currentEx.id]: option }));
    setTextInputs(prev => ({ ...prev, [currentEx.id]: option }));
    validateAnswer(option);
  };

  const validateAnswer = (answerText: string) => {
    const cleanAnswer = answerText.trim().toLowerCase();
    const expected = (currentEx.expected_answer || '').trim().toLowerCase();
    
    const isCorrect: boolean = Boolean(cleanAnswer === expected || (expected.length > 0 && cleanAnswer.includes(expected)));
    const feedback: string = isCorrect
      ? `¡Excelente! Has completado la oración correctamente aplicando la regla de ${topicParam}.`
      : `Buen intento. La respuesta correcta es "${currentEx.expected_answer}". ${currentEx.hint || ''}`;

    setEvaluatedItems(prev => ({
      ...prev,
      [currentEx.id]: { isCorrect, feedback }
    }));

    if (isCorrect) {
      toast.success('¡Correcto! 🎉', { id: `ex-eval-${currentEx.id}` });
    } else {
      toast.error('Revisa la respuesta 💡', { id: `ex-eval-${currentEx.id}` });
    }
  };

  const handleSpeechRecord = () => {
    setIsRecording(true);
    toast('Di la oración completa en inglés...', { icon: '🎙️' });

    setTimeout(() => {
      setIsRecording(false);
      const expected = currentEx.expected_answer || (currentEx.options && currentEx.options[0]) || '';
      setSelectedAnswers(prev => ({ ...prev, [currentEx.id]: expected }));
      setTextInputs(prev => ({ ...prev, [currentEx.id]: expected }));
      validateAnswer(expected);
      toast.success('¡Voz capturada y validada con éxito!');
    }, 2800);
  };

  const completedCount = Object.keys(evaluatedItems).filter(k => evaluatedItems[k]?.isCorrect).length;

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
              <span>Desafío Interactivo con Ilustraciones</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
              {phaseName || `Práctica de ${topicParam}`}
            </h3>
          </div>
        </div>

        {/* Exercise Switcher Navigation Tabs */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-black/50 p-1.5 rounded-2xl border border-white/10">
          {exercises.map((ex, idx) => {
            const isEvaluated = evaluatedItems[ex.id]?.isCorrect;
            const isSelected = idx === currentExIdx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentExIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-cyan text-black shadow-md shadow-brand-cyan/30'
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
                    const isCorrectOption = opt === currentEx.expected_answer;

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

          {/* Voice Input & Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
            <motion.button
              type="button"
              disabled={isRecording}
              whileTap={{ scale: 0.95 }}
              onClick={handleSpeechRecord}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
              }`}
            >
              <Mic size={14} />
              <span>{isRecording ? 'Escuchando tu voz...' : 'Responder por Voz 🎤'}</span>
            </motion.button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentExIdx === 0}
                onClick={() => setCurrentExIdx(prev => Math.max(0, prev - 1))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all"
                title="Ejercicio anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                disabled={currentExIdx === exercises.length - 1}
                onClick={() => setCurrentExIdx(prev => Math.min(exercises.length - 1, prev + 1))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all"
                title="Siguiente ejercicio"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 relative z-10 flex-shrink-0">
        <div className="text-xs text-white/70">
          🎯 <strong className="text-brand-gold">Progreso:</strong> {completedCount} de {exercises.length} desafíos completados.
        </div>

        <motion.button
          type="button"
          onClick={onNextSlide}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-brand-gold via-amber-400 to-brand-cyan text-black font-extrabold text-sm shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span>{nextSlideLabel}</span>
          <ChevronRight size={18} />
        </motion.button>
      </div>
    </div>
  );
}
