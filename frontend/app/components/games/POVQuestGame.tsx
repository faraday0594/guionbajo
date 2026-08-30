'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  Mic,
  Square,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  Send,
  Loader2,
  Film,
  Award,
  Zap,
  Flame,
  VolumeX,
} from 'lucide-react';
import { api, playEnglishAudio, stopTutorVoice } from '@/lib/api';
import { toast } from 'react-hot-toast';

export interface QuestNodeData {
  node_id: string;
  pov_image_prompt: string;
  image_url?: string;
  companion_dialogue: string;
  pedagogical_goal: string;
  hint?: string;
  example_phrase?: string;
  validation_rules?: {
    must_include?: string[];
    intent?: string;
    min_words?: number;
  };
}

export interface StoryQuestData {
  story_id: string;
  title: string;
  grammar_topic: string;
  difficulty_level: string;
  companion_name?: string;
  companion_gender?: 'female' | 'male' | string;
  companion_voice?: string;
  companion_avatar?: string;
  nodes: QuestNodeData[];
}

interface POVQuestGameProps {
  questData: StoryQuestData;
  topic: string;
  sublevel: string;
  lessonId?: string;
  onFinishQuest: (result: {
    score: number;
    attemptCount: number;
    nodesCompleted: number;
    totalNodes: number;
    quest: StoryQuestData;
  }) => void;
  onSwitchGame?: () => void;
}

export default function POVQuestGame({
  questData,
  topic,
  sublevel,
  lessonId,
  onFinishQuest,
  onSwitchGame,
}: POVQuestGameProps) {
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [textFallback, setTextFallback] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlayingDialogue, setIsPlayingDialogue] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Preloaded image URL cache: node_id -> image_url
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});

  // Session & Attempt Tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [nodeAttempts, setNodeAttempts] = useState<Record<number, number>>({});
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(100);

  // Evaluation Branch Overlay State
  const [evalResult, setEvalResult] = useState<{
    is_correct: boolean;
    feedback: string;
    correction?: string | null;
    detected_grammar_rule?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestSpeechRef = useRef<string>('');

  const nodes = questData?.nodes || [];
  const currentNode = nodes[currentNodeIndex] || nodes[0];
  const isFinalNode = currentNodeIndex === nodes.length - 1;

  // ─── Initialize Session ─────────────────────────────────────────────────────
  useEffect(() => {
    async function initSession() {
      try {
        const res = await api.startQuestSession(questData.story_id, topic, sublevel);
        if (res && res.session_id) {
          setSessionId(res.session_id);
        }
      } catch (err) {
        console.debug('Guest/Local quest session mode:', err);
      }
    }
    if (questData?.story_id) {
      initSession();
    }
  }, [questData, topic, sublevel]);

  // ─── Image Generation & Preloading Pipeline ──────────────────────────────────
  const fetchNodeImage = useCallback(async (node: QuestNodeData) => {
    if (!node || !node.pov_image_prompt) return;
    if (imageCache[node.node_id] || imageLoading[node.node_id]) return;

    setImageLoading((prev) => ({ ...prev, [node.node_id]: true }));
    try {
      const res = await api.generateImage(node.pov_image_prompt, '16:9');
      if (res && res.url) {
        setImageCache((prev) => ({ ...prev, [node.node_id]: res.url }));
        // Pre-warm browser image cache
        const img = new Image();
        img.src = res.url;
      }
    } catch (e) {
      console.warn(`Error generating image for node ${node.node_id}:`, e);
    } finally {
      setImageLoading((prev) => ({ ...prev, [node.node_id]: false }));
    }
  }, [imageCache, imageLoading]);

  // Load current node image and preload next node image (Latency Optimization)
  useEffect(() => {
    if (currentNode) {
      fetchNodeImage(currentNode);
    }
    // Preload next node image
    const nextNode = nodes[currentNodeIndex + 1];
    if (nextNode) {
      fetchNodeImage(nextNode);
    }
  }, [currentNodeIndex, currentNode, nodes, fetchNodeImage]);

  const isMaleCompanion = questData?.companion_gender === 'male' || ['lucas', 'alex', 'davies', 'john', 'carlos'].some(n => (questData?.companion_name || '').toLowerCase().includes(n));
  const resolvedCompanionVoice = questData?.companion_voice || (isMaleCompanion ? 'en-US-RogerNeural' : 'en-US-JennyNeural');

  // ─── Autoplay companion dialogue on scene entry ────────────────────────────
  const playDialogueAudio = useCallback(async (text: string) => {
    if (!text) return;
    try {
      setIsPlayingDialogue(true);
      await playEnglishAudio(text, resolvedCompanionVoice);
    } catch (e) {
      console.warn('Dialogue audio error:', e);
    } finally {
      setIsPlayingDialogue(false);
    }
  }, [resolvedCompanionVoice]);

  useEffect(() => {
    if (currentNode?.companion_dialogue) {
      const timer = setTimeout(() => {
        playDialogueAudio(currentNode.companion_dialogue);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentNodeIndex, currentNode?.companion_dialogue, playDialogueAudio]);

  // ─── Voice Recognition Engine (Speech-to-Text) ─────────────────────────────
  const startRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta reconocimiento por voz. Puedes escribir tu respuesta abajo.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    stopTutorVoice();
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    setLiveTranscript('');
    latestSpeechRef.current = '';
    setIsRecording(true);
    setEvalResult(null);

    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      const spoken = (final || interim).trim();
      if (spoken) {
        latestSpeechRef.current = spoken;
        setLiveTranscript(spoken);
        setTextFallback(spoken);

        // Generous 3.8s silence detector
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopRecording();
        }, 3800);
      }
    };

    rec.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      setIsRecording(false);
      if (event.error !== 'aborted') {
        toast.error('Micrófono inactivo. Intenta de nuevo o escribe tu respuesta.');
      }
    };

    rec.onend = () => {
      setIsRecording(false);
      const textToValidate = latestSpeechRef.current.trim();
      if (textToValidate.length > 1) {
        handleEvaluateResponse(textToValidate);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsRecording(false);
  };

  // ─── Evaluation Engine Handler (Branch A vs Branch B) ──────────────────────
  const handleEvaluateResponse = async (studentTranscript: string) => {
    if (!studentTranscript || !studentTranscript.trim()) {
      toast('Por favor habla o escribe tu respuesta primero 🎙️', { icon: '💡' });
      return;
    }

    setIsEvaluating(true);
    setAttemptCount((prev) => prev + 1);
    setNodeAttempts((prev) => ({
      ...prev,
      [currentNodeIndex]: (prev[currentNodeIndex] || 0) + 1,
    }));

    try {
      const res = await api.evaluateQuestNode({
        quest_id: questData.story_id,
        session_id: sessionId || undefined,
        node_index: currentNodeIndex,
        transcript: studentTranscript.trim(),
        topic: topic,
        node_data: currentNode,
        all_nodes: nodes,
      });

      if (res) {
        setEvalResult({
          is_correct: Boolean(res.is_correct),
          feedback: res.feedback || (res.is_correct ? '¡Excelente respuesta!' : 'Intenta de nuevo aplicando la estructura.'),
          correction: res.correction,
          detected_grammar_rule: res.detected_grammar_rule,
        });

        if (res.is_correct) {
          setStreak((prev) => prev + 1);
          toast.success('¡Objetivo completado! 🌟', { id: 'quest-eval-toast' });
        } else {
          setStreak(0);
          setScore((prev) => Math.max(40, prev - 8));
          toast.error('Revisa la retroalimentación e inténtalo de nuevo 💡', { id: 'quest-eval-toast' });
        }
      }
    } catch (err) {
      console.warn('Backend evaluation error, applying local validator:', err);
      // Local fallback evaluation
      const clean = studentTranscript.toLowerCase();
      const rules = currentNode.validation_rules?.must_include || [];
      const isMatch = rules.length === 0 || rules.some((r) => clean.includes(r.toLowerCase()));

      setEvalResult({
        is_correct: isMatch,
        feedback: isMatch
          ? `¡Excelente! Cumpliste con el objetivo de ${topic}.`
          : `Recuerda incluir la regla esperada (${rules.join(', ')}) para continuar.`,
        correction: currentNode.example_phrase,
      });

      if (isMatch) {
        setStreak((prev) => prev + 1);
      } else {
        setStreak(0);
        setScore((prev) => Math.max(40, prev - 8));
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  // ─── Advance to Next Scene (Branch B Transition) ────────────────────────────
  const handleNextScene = () => {
    setEvalResult(null);
    setLiveTranscript('');
    setTextFallback('');
    setShowHint(false);

    if (isFinalNode) {
      // Quest Completed!
      onFinishQuest({
        score: score,
        attemptCount: attemptCount,
        nodesCompleted: nodes.length,
        totalNodes: nodes.length,
        quest: questData,
      });
    } else {
      setCurrentNodeIndex((prev) => prev + 1);
    }
  };

  const handleRetryScene = () => {
    setEvalResult(null);
    setLiveTranscript('');
    setTextFallback('');
    stopRecording();
  };

  const currentImageUrl = imageCache[currentNode.node_id] || currentNode.image_url;
  const isImageLoading = imageLoading[currentNode.node_id];

  return (
    <div className="w-full flex flex-col gap-5 text-white">
      {/* ── Top Status Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/70 p-3.5 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{questData.companion_avatar || '👩'}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                {questData.title || 'Misión Conversacional POV'}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40">
                {questData.difficulty_level || sublevel}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Acompañante: <strong className="text-zinc-200">{questData.companion_name || 'Emma'}</strong> • {topic}
            </p>
          </div>
        </div>

        {/* Node Step Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
            {nodes.map((n, idx) => {
              const isPast = idx < currentNodeIndex;
              const isCurrent = idx === currentNodeIndex;
              return (
                <div
                  key={n.node_id || idx}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    isPast
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                      : isCurrent
                      ? 'bg-brand-gold text-black ring-2 ring-brand-gold/50 scale-105'
                      : 'bg-white/10 text-zinc-400'
                  }`}
                  title={`Escena ${idx + 1}`}
                >
                  {isPast ? <CheckCircle2 size={14} className="stroke-[3]" /> : idx + 1}
                </div>
              );
            })}
          </div>

          {streak > 1 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold animate-pulse">
              <Flame size={14} className="fill-amber-400" />
              <span>x{streak} Racha</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main POV Visual Novel Screen (16:9 Viewport) ── */}
      <div className="relative w-full aspect-[16/9] min-h-[380px] sm:min-h-[460px] md:min-h-[520px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black flex flex-col justify-between group">
        {/* Background POV Scene Image */}
        <div className="absolute inset-0 z-0">
          {currentImageUrl ? (
            <motion.img
              key={currentNode.node_id}
              src={currentImageUrl}
              alt={currentNode.pov_image_prompt}
              initial={{ scale: 1.05, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-950 via-slate-900 to-black">
              {isImageLoading ? (
                <>
                  <Loader2 size={32} className="text-brand-cyan animate-spin mb-3" />
                  <p className="text-xs font-mono text-white/80">Generando escena POV cinematográfica...</p>
                  <span className="text-[11px] text-zinc-500 mt-1 max-w-sm line-clamp-2">
                    {currentNode.pov_image_prompt}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <Film size={32} className="text-brand-cyan/60" />
                  <p className="text-xs">Escena en Primera Persona (POV)</p>
                </div>
              )}
            </div>
          )}

          {/* Cinematic Vignette and Dark Overlays for Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/30 pointer-events-none" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/20 to-black/70 pointer-events-none" />
        </div>

        {/* ── Top Floating Pedagogical Target Badge ── */}
        <div className="relative z-10 p-4 sm:p-6 flex items-start justify-between gap-4">
          <div className="bg-black/80 backdrop-blur-md border border-brand-gold/40 p-3 sm:p-3.5 rounded-2xl shadow-xl max-w-xl">
            <div className="flex items-center gap-2 text-xs font-extrabold text-brand-gold uppercase tracking-wider mb-1">
              <Sparkles size={14} className="animate-pulse" />
              <span>Misión Pedagógica (Escena {currentNodeIndex + 1}/{nodes.length})</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white leading-snug">
              {currentNode.pedagogical_goal}
            </p>

            {/* Expandable Clue / Hint */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2.5 pt-2.5 border-t border-white/10 text-xs text-amber-200 space-y-1"
                >
                  <p className="font-semibold">💡 Pista: {currentNode.hint || 'Usa la estructura objetivo.'}</p>
                  {currentNode.example_phrase && (
                    <p className="text-zinc-300 text-[11px] italic">
                      Ejemplo: "{currentNode.example_phrase}"
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg backdrop-blur-md ${
              showHint
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-black/70 hover:bg-black/90 border-white/20 text-amber-300'
            }`}
            title="Ver pista gramatical"
          >
            <HelpCircle size={15} />
            <span className="hidden sm:inline">{showHint ? 'Ocultar Pista' : 'Ver Pista'}</span>
          </button>
        </div>

        {/* ── Bottom Dialogue & Visual Novel Speech Box ── */}
        <div className="relative z-10 p-4 sm:p-6 space-y-3">
          {/* Companion Dialogue Bubble */}
          <div className="bg-black/85 backdrop-blur-xl border border-white/20 p-4 sm:p-5 rounded-3xl shadow-2xl space-y-3 relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-base">
                  {questData.companion_avatar || '👩'}
                </div>
                <span className="font-extrabold text-sm text-brand-cyan tracking-wide">
                  {questData.companion_name || 'Emma'}
                </span>
              </div>

              {/* Dialogue Voice Button */}
              <button
                type="button"
                onClick={() => playDialogueAudio(currentNode.companion_dialogue)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isPlayingDialogue
                    ? 'bg-brand-cyan text-black border-brand-cyan animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
                title="Escuchar diálogo del acompañante"
              >
                <Volume2 size={14} className={isPlayingDialogue ? 'animate-bounce' : ''} />
                <span>{isPlayingDialogue ? 'Hablando...' : 'Escuchar'}</span>
              </button>
            </div>

            {/* Dialogue Text Subtitle */}
            <p className="text-base sm:text-lg font-bold font-outfit text-white leading-relaxed">
              "{currentNode.companion_dialogue}"
            </p>
          </div>

          {/* ── Real-Time Spoken Interim & Action Bar ── */}
          <div className="bg-zinc-950/90 backdrop-blur-md border border-white/15 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Live Spoken Transcript or typing input */}
            <div className="flex-1 w-full">
              {isRecording ? (
                <div className="flex items-center gap-2.5 text-xs text-rose-200 animate-pulse bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/40">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
                  <span className="font-bold text-rose-300">Escuchando:</span>
                  <span className="italic truncate">{liveTranscript || 'Habla tu respuesta en inglés...'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Habla con el micrófono o escribe tu respuesta en inglés..."
                    value={textFallback}
                    onChange={(e) => setTextFallback(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && textFallback.trim() && !isEvaluating) {
                        handleEvaluateResponse(textFallback);
                      }
                    }}
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-cyan"
                  />
                  <button
                    type="button"
                    disabled={isEvaluating || !textFallback.trim()}
                    onClick={() => handleEvaluateResponse(textFallback)}
                    className="px-3 py-2 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-black font-bold text-xs disabled:opacity-40 transition-all flex items-center gap-1 shadow-md"
                    title="Validar respuesta escrita"
                  >
                    {isEvaluating ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>Enviar</span>
                  </button>
                </div>
              )}
            </div>

            {/* Voice Push-to-Talk Record Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 animate-pulse ring-2 ring-rose-400'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-emerald-500/30'
              }`}
            >
              {isRecording ? <Square size={14} className="fill-current" /> : <Mic size={14} />}
              <span>{isRecording ? 'Detener y Evaluar ⏹️' : 'Hablar por Micrófono 🎤'}</span>
            </motion.button>
          </div>
        </div>

        {/* ── Branch Evaluation Modal Overlay (Branch A vs Branch B) ── */}
        <AnimatePresence>
          {evalResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            >
              <div
                className={`max-w-lg w-full rounded-3xl p-6 sm:p-7 border shadow-2xl space-y-5 text-center ${
                  evalResult.is_correct
                    ? 'bg-gradient-to-b from-emerald-950/90 via-black to-black border-emerald-500/50 shadow-emerald-500/20'
                    : 'bg-gradient-to-b from-rose-950/90 via-black to-black border-rose-500/50 shadow-rose-500/20'
                }`}
              >
                {/* Status Icon */}
                <div className="flex justify-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl ${
                      evalResult.is_correct
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400'
                        : 'bg-rose-500/20 border-2 border-rose-400 text-rose-400'
                    }`}
                  >
                    {evalResult.is_correct ? (
                      <CheckCircle2 size={32} className="stroke-[2.5]" />
                    ) : (
                      <AlertCircle size={32} className="stroke-[2.5]" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold font-outfit text-white">
                    {evalResult.is_correct ? '¡Escena Superada con Éxito! 🎉' : 'Intenta de Nuevo 💡'}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
                    {evalResult.feedback}
                  </p>
                </div>

                {/* Suggested English correction if incorrect */}
                {!evalResult.is_correct && evalResult.correction && (
                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-white/10 text-left space-y-1">
                    <span className="text-[11px] font-bold text-amber-400 uppercase block">
                      Ejemplo de respuesta correcta:
                    </span>
                    <p className="text-xs text-white font-medium italic">
                      "{evalResult.correction}"
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  {evalResult.is_correct ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleNextScene}
                      className="w-full px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-brand-cyan text-black font-extrabold text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{isFinalNode ? 'Completar Misión 🏆' : 'Continuar Historia ➡️'}</span>
                      <ChevronRight size={18} />
                    </motion.button>
                  ) : (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleRetryScene}
                      className="w-full px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-extrabold text-sm shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw size={16} />
                      <span>Reintentar Escena 🎤</span>
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
