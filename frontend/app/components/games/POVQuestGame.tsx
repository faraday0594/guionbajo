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
  Maximize2,
  X,
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

// ─── HELPER: Preload Image Bitmap in Browser Memory ────────────────────────────
function preloadImageBitmap(url: string, timeoutMs = 15000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || typeof window === 'undefined') {
      resolve(false);
      return;
    }
    const img = new Image();
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(true);
      }
    };
    img.onerror = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(false);
      }
    };
    img.src = url;
  });
}

// ─── HELPER: Generate Node Image Exclusively with MiniMax image-01 ──────────────
async function generateNodeImageWithMiniMax(
  node: QuestNodeData,
  companionName = 'Emma',
  index = 0
): Promise<string> {
  if (node.image_url) {
    await preloadImageBitmap(node.image_url, 6000);
    return node.image_url;
  }

  try {
    const res: any = await api.generateImage(node.pov_image_prompt, '16:9');
    if (res && (res.url || res.image_url)) {
      const finalUrl = (res.url || res.image_url) as string;
      await preloadImageBitmap(finalUrl, 10000);
      return finalUrl;
    }
    console.warn(`MiniMax image-01 returned no URL for scene ${index}:`, res);
  } catch (err) {
    console.warn(`MiniMax image-01 generation error for scene ${index}:`, err);
  }

  return '';
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
  const [isExpandedImage, setIsExpandedImage] = useState(false);

  // Scene presentation readiness state (Image MUST be loaded before dialogue starts)
  const [isSceneReady, setIsSceneReady] = useState(false);

  // Preloaded image URL cache: node_id -> image_url
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});

  // Background pre-generation tracking
  const backgroundPreloadedRef = useRef<Set<string>>(new Set());

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
    suggested_enhancement?: string | null;
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

  // ─── Current Scene Image Loader & Scene Readiness Gating ─────────────────────
  useEffect(() => {
    if (!currentNode) return;
    let isCancelled = false;

    async function prepareCurrentScene() {
      // If already cached, mark ready immediately
      if (imageCache[currentNode.node_id]) {
        setIsSceneReady(true);
        return;
      }

      setIsSceneReady(false);
      setImageLoading((prev) => ({ ...prev, [currentNode.node_id]: true }));

      try {
        const url = await generateNodeImageWithMiniMax(
          currentNode,
          questData.companion_name || 'Emma',
          currentNodeIndex
        );

        if (!isCancelled && url) {
          setImageCache((prev) => ({ ...prev, [currentNode.node_id]: url }));
          setIsSceneReady(true);
        } else if (!isCancelled) {
          // If no image URL, set scene ready so user can still progress
          setIsSceneReady(true);
        }
      } catch (e) {
        console.warn('Error preparing scene image:', e);
        if (!isCancelled) {
          // If error occurs, still allow scene to open so user isn't permanently stuck
          setIsSceneReady(true);
        }
      } finally {
        if (!isCancelled) {
          setImageLoading((prev) => ({ ...prev, [currentNode.node_id]: false }));
        }
      }
    }

    prepareCurrentScene();
    return () => {
      isCancelled = true;
    };
  }, [currentNodeIndex, currentNode?.node_id]);

  // ─── Background Sequential Pre-generation for Remaining Scenes ───────────────
  // Pre-generates images with MiniMax for scenes 1, 2, ... N-1 while the student plays scene 0
  useEffect(() => {
    if (!nodes || nodes.length <= 1) return;
    let isCancelled = false;

    async function preheatRemainingScenes() {
      // Loop through all nodes starting from 1 to N-1
      for (let i = 1; i < nodes.length; i++) {
        if (isCancelled) break;
        const n = nodes[i];
        if (!n || imageCache[n.node_id] || backgroundPreloadedRef.current.has(n.node_id)) {
          continue;
        }

        backgroundPreloadedRef.current.add(n.node_id);

        try {
          const url = await generateNodeImageWithMiniMax(
            n,
            questData.companion_name || 'Emma',
            i
          );
          if (!isCancelled && url) {
            setImageCache((prev) => ({ ...prev, [n.node_id]: url }));
          }
        } catch (e) {
          console.warn(`Error pre-generating scene ${i} with MiniMax:`, e);
        }
      }
    }

    // Small delay to prioritize the current scene first
    const timer = setTimeout(() => {
      preheatRemainingScenes();
    }, 1200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [nodes, questData?.companion_name]);

  const isMaleCompanion =
    questData?.companion_gender === 'male' ||
    ['lucas', 'alex', 'davies', 'john', 'carlos'].some((n) =>
      (questData?.companion_name || '').toLowerCase().includes(n)
    );
  const resolvedCompanionVoice =
    questData?.companion_voice || (isMaleCompanion ? 'en-US-RogerNeural' : 'en-US-JennyNeural');

  // ─── Companion Audio Speech Motor ───────────────────────────────────────────
  const playDialogueAudio = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        setIsPlayingDialogue(true);
        await playEnglishAudio(text, resolvedCompanionVoice);
      } catch (e) {
        console.warn('Dialogue audio error:', e);
      } finally {
        setIsPlayingDialogue(false);
      }
    },
    [resolvedCompanionVoice]
  );

  // ─── GATED SPEECH: Companion speaks ONLY AFTER scene image is ready ──────────
  useEffect(() => {
    if (!isSceneReady || !currentNode?.companion_dialogue) return;

    // Natural 450ms cinematic beat: image is displayed first, then companion speaks!
    const timer = setTimeout(() => {
      playDialogueAudio(currentNode.companion_dialogue);
    }, 450);

    return () => clearTimeout(timer);
  }, [isSceneReady, currentNodeIndex, currentNode?.companion_dialogue, playDialogueAudio]);

  // Clean up voice when component unmounts
  useEffect(() => {
    return () => {
      stopTutorVoice();
    };
  }, []);

  // ─── Voice Recognition Engine (Speech-to-Text) ─────────────────────────────
  const startRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        'Tu navegador no soporta reconocimiento por voz. Puedes escribir tu respuesta en el campo de texto.'
      );
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
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

        // 3.8s silence detector
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
      try {
        recognitionRef.current.stop();
      } catch (_) {}
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
          feedback:
            res.feedback ||
            (res.is_correct
              ? '¡Excelente respuesta! Tu mensaje se entendió con claridad.'
              : 'Intenta de nuevo elaborando tu respuesta en inglés.'),
          correction: res.correction,
          suggested_enhancement: res.suggested_enhancement,
          detected_grammar_rule: res.detected_grammar_rule,
        });

        if (res.is_correct) {
          setStreak((prev) => prev + 1);
          toast.success('¡Objetivo completado! 🌟', { id: 'quest-eval-toast' });
        } else {
          setStreak(0);
          setScore((prev) => Math.max(40, prev - 8));
          toast.error('Revisa la retroalimentación e inténtalo de nuevo 💡', {
            id: 'quest-eval-toast',
          });
        }
      }
    } catch (err) {
      console.warn('Backend evaluation error, applying local validator:', err);
      // Local communicative fallback evaluation
      const clean = studentTranscript.toLowerCase();
      const rules = currentNode.validation_rules?.must_include || [];
      const wordCount = clean.trim().split(/\s+/).filter(Boolean).length;
      const isMatch =
        rules.length === 0 || rules.some((r) => clean.includes(r.toLowerCase())) || wordCount >= 3;

      setEvalResult({
        is_correct: isMatch,
        feedback: isMatch
          ? `¡Respuesta válida y comunicativa! Expresaste tu idea con claridad.`
          : `Por favor elabora una oración completa en inglés para continuar la historia.`,
        correction: currentNode.example_phrase,
        suggested_enhancement: currentNode.example_phrase,
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

  // ─── Advance to Next Scene ──────────────────────────────────────────────────
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
  const isImageLoading = imageLoading[currentNode.node_id] || !isSceneReady;

  return (
    <div className="w-full flex flex-col gap-4 text-white relative">
      {/* ── 1. Top Status Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-zinc-950/80 p-3 sm:p-3.5 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl">{questData.companion_avatar || '👩'}</span>
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
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/10">
            {nodes.map((n, idx) => {
              const isPast = idx < currentNodeIndex;
              const isCurrent = idx === currentNodeIndex;
              return (
                <div
                  key={n.node_id || idx}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    isPast
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                      : isCurrent
                      ? 'bg-brand-gold text-black ring-2 ring-brand-gold/50 scale-105'
                      : 'bg-white/10 text-zinc-400'
                  }`}
                  title={`Escena ${idx + 1}`}
                >
                  {isPast ? <CheckCircle2 size={13} className="stroke-[3]" /> : idx + 1}
                </div>
              );
            })}
          </div>

          {streak > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold animate-pulse">
              <Flame size={14} className="fill-amber-400" />
              <span>x{streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Dedicated POV Scene Viewport (100% Unobscured Image Frame) ── */}
      <div className="relative w-full aspect-[16/9] max-h-[260px] sm:max-h-[380px] md:max-h-[440px] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-zinc-950 flex flex-col justify-between group">
        {/* Background Scene Image */}
        <div className="absolute inset-0 z-0">
          {isSceneReady && currentImageUrl ? (
            <motion.img
              key={currentNode.node_id}
              src={currentImageUrl}
              alt={currentNode.pov_image_prompt}
              initial={{ scale: 1.04, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-950 via-purple-950/40 to-black relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-accent/20 via-transparent to-transparent animate-pulse" />
              <div className="relative z-10 flex flex-col items-center max-w-md">
                <div className="relative mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center animate-pulse">
                    <Sparkles size={26} className="text-purple-300 animate-spin" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-brand-cyan text-black font-extrabold text-[9px] uppercase tracking-wider shadow">
                    MiniMax AI
                  </div>
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  Generando Escena con MiniMax image-01...
                </h4>
                <p className="text-xs text-purple-200/80 mt-1 max-w-sm">
                  Pintando el entorno interactivo en primera persona (POV) con <strong className="text-white">{questData.companion_name || 'Emma'}</strong>.
                </p>
                <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-black/70 border border-white/10 text-[11px] text-zinc-300">
                  <Loader2 size={12} className="animate-spin text-brand-cyan" />
                  <span>Esperando creación de la foto para iniciar la escena...</span>
                </div>
              </div>
            </div>
          )}

          {/* Subtle cinematic gradient only at top/bottom edges for HUD readability */}
          <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        </div>

        {/* HUD Top Corner Badges (Non-intrusive) */}
        <div className="relative z-10 p-3 sm:p-4 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow">
            <Film size={13} className="text-brand-cyan" />
            <span>Escena {currentNodeIndex + 1} de {nodes.length}</span>
          </div>

          <div className="flex items-center gap-2">
            {currentImageUrl && (
              <button
                type="button"
                onClick={() => setIsExpandedImage(true)}
                className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 transition-all backdrop-blur-md"
                title="Ampliar imagen de la escena"
              >
                <Maximize2 size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHint((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 shadow backdrop-blur-md ${
                showHint
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-black/70 hover:bg-black/90 border-white/20 text-amber-300'
              }`}
              title="Ver pista gramatical"
            >
              <HelpCircle size={14} />
              <span>{showHint ? 'Ocultar Pista' : 'Pista'}</span>
            </button>
          </div>
        </div>

        {/* HUD Bottom Corner: Quick Replay Voice Button */}
        <div className="relative z-10 p-3 sm:p-4 flex items-center justify-end pointer-events-auto">
          <button
            type="button"
            disabled={!isSceneReady}
            onClick={() => playDialogueAudio(currentNode.companion_dialogue)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg backdrop-blur-md ${
              !isSceneReady
                ? 'bg-black/40 text-zinc-500 border-white/10 cursor-not-allowed opacity-50'
                : isPlayingDialogue
                ? 'bg-brand-cyan text-black border-brand-cyan animate-pulse'
                : 'bg-black/75 hover:bg-black/95 border-white/20 text-white'
            }`}
            title="Escuchar diálogo del acompañante"
          >
            <Volume2 size={14} className={isPlayingDialogue ? 'animate-bounce' : ''} />
            <span>{isPlayingDialogue ? 'Hablando...' : 'Escuchar Voz'}</span>
          </button>
        </div>
      </div>

      {/* ── 3. Pedagogical Goal & Hint Card (Outside Image Viewport) ── */}
      <div className="bg-zinc-900/90 border border-brand-gold/30 rounded-2xl p-3 sm:p-3.5 backdrop-blur-sm shadow-md">
        <div className="flex items-center gap-2 text-xs font-extrabold text-brand-gold uppercase tracking-wider mb-1">
          <Sparkles size={13} className="animate-pulse flex-shrink-0" />
          <span>Objetivo de la Escena {currentNodeIndex + 1}:</span>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-zinc-100 leading-snug">
          {currentNode.pedagogical_goal}
        </p>

        {/* Collapsible Clue / Hint */}
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
                  Ejemplo de respuesta: "{currentNode.example_phrase}"
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 4. Visual Novel Companion Speech Card ── */}
      <div className="bg-zinc-950/95 border border-white/20 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl space-y-2.5 relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-base">
              {questData.companion_avatar || '👩'}
            </div>
            <div>
              <span className="font-extrabold text-sm text-brand-cyan tracking-wide block">
                {questData.companion_name || 'Emma'}
              </span>
              <span className="text-[10px] text-zinc-400">
                {!isSceneReady
                  ? 'Esperando foto de la escena...'
                  : isPlayingDialogue
                  ? 'Hablando en inglés...'
                  : 'Esperando tu respuesta'}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={!isSceneReady}
            onClick={() => playDialogueAudio(currentNode.companion_dialogue)}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Volume2 size={13} />
            <span className="hidden sm:inline">Repetir</span>
          </button>
        </div>

        {/* Dialogue Text Subtitle */}
        {isSceneReady ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-base sm:text-lg font-bold font-outfit text-white leading-relaxed"
          >
            "{currentNode.companion_dialogue}"
          </motion.p>
        ) : (
          <div className="flex items-center gap-2 text-zinc-400 text-sm italic py-1">
            <Loader2 size={14} className="animate-spin text-brand-cyan" />
            <span>{questData.companion_name || 'Emma'} está entrando en escena (esperando foto de MiniMax AI)...</span>
          </div>
        )}
      </div>

      {/* ── 5. Student Interaction Bar (Mic Push-to-Talk + Text Input) ── */}
      <div className="bg-zinc-950/90 border border-white/15 p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-col gap-3">
        {/* Live Audio Transcription Display during speech */}
        {isRecording && (
          <div className="flex items-center gap-2.5 text-xs text-rose-200 animate-pulse bg-rose-950/60 p-3 rounded-xl border border-rose-500/40">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
            <span className="font-bold text-rose-300">Escuchando tu voz:</span>
            <span className="italic truncate font-medium">{liveTranscript || 'Habla tu respuesta en inglés...'}</span>
          </div>
        )}

        {/* Primary Action: High-Contrast Prominent Microphone Button */}
        <motion.button
          type="button"
          disabled={!isSceneReady || isEvaluating}
          whileTap={isSceneReady ? { scale: 0.97 } : undefined}
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-extrabold transition-all flex items-center justify-center gap-2.5 shadow-xl ${
            !isSceneReady
              ? 'bg-zinc-800 text-zinc-500 border border-white/10 cursor-not-allowed opacity-60'
              : isRecording
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 animate-pulse ring-4 ring-rose-400 cursor-pointer'
              : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-emerald-500/30 cursor-pointer'
          }`}
        >
          {isRecording ? (
            <Square size={17} className="fill-current" />
          ) : (
            <Mic size={18} className="stroke-[2.5]" />
          )}
          <span>
            {!isSceneReady
              ? 'Esperando creación de la foto 🎨...'
              : isRecording
              ? 'Detener y Validar Respuesta ⏹️'
              : 'Hablar por Micrófono 🎤'}
          </span>
        </motion.button>

        {/* Secondary Alternative: Text Input for typing */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/10">
          <input
            type="text"
            disabled={!isSceneReady || isEvaluating}
            placeholder={
              !isSceneReady
                ? 'Esperando creación de la foto para responder...'
                : 'O escribe tu respuesta en inglés aquí...'
            }
            value={textFallback}
            onChange={(e) => setTextFallback(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textFallback.trim() && !isEvaluating && isSceneReady) {
                handleEvaluateResponse(textFallback);
              }
            }}
            className="flex-1 bg-black/70 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-cyan disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled={!isSceneReady || isEvaluating || !textFallback.trim()}
            onClick={() => handleEvaluateResponse(textFallback)}
            className="px-4 py-2.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-black font-extrabold text-xs disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:cursor-not-allowed"
            title="Validar respuesta escrita"
          >
            {isEvaluating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            <span>Enviar</span>
          </button>
        </div>
      </div>

      {/* ── 6. Branch Evaluation Modal Overlay (Branch A vs Branch B) ── */}
      <AnimatePresence>
        {evalResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-md w-full rounded-2xl sm:rounded-3xl p-4 sm:p-7 border shadow-2xl space-y-4 sm:space-y-5 text-center ${
                evalResult.is_correct
                  ? 'bg-gradient-to-b from-emerald-950/95 via-zinc-950 to-black border-emerald-500/50 shadow-emerald-500/20'
                  : 'bg-gradient-to-b from-rose-950/95 via-zinc-950 to-black border-rose-500/50 shadow-rose-500/20'
              }`}
            >
              {/* Status Icon */}
              <div className="flex justify-center">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-xl ${
                    evalResult.is_correct
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400'
                      : 'bg-rose-500/20 border-2 border-rose-400 text-rose-400'
                  }`}
                >
                  {evalResult.is_correct ? (
                    <CheckCircle2 size={28} className="stroke-[2.5]" />
                  ) : (
                    <AlertCircle size={28} className="stroke-[2.5]" />
                  )}
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <h3 className="text-lg sm:text-2xl font-extrabold font-outfit text-white">
                  {evalResult.is_correct ? '¡Escena Superada con Éxito! 🎉' : 'Intenta de Nuevo 💡'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
                  {evalResult.feedback}
                </p>
              </div>

              {/* Formative Pedagogical Enhancement / Suggested Alternative */}
              {evalResult.is_correct && (evalResult.suggested_enhancement || evalResult.correction) && (
                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-zinc-900/90 border border-brand-cyan/30 text-left space-y-1.5 shadow-lg">
                  <span className="text-[10px] sm:text-[11px] font-bold text-brand-cyan uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} className="text-brand-cyan animate-pulse" />
                    <span>
                      {evalResult.correction
                        ? 'Corrección sugerida de tu oración:'
                        : 'Sugerencia para sonar más nativo / colaborativo:'}
                    </span>
                  </span>
                  <p className="text-xs sm:text-sm text-white font-medium italic">
                    "{evalResult.suggested_enhancement || evalResult.correction}"
                  </p>
                </div>
              )}

              {/* Retry Guidance when incorrect */}
              {!evalResult.is_correct && (evalResult.suggested_enhancement || evalResult.correction) && (
                <div className="p-3 rounded-xl sm:rounded-2xl bg-zinc-900/90 border border-amber-500/30 text-left space-y-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase block">
                    Ejemplo de respuesta sugerida:
                  </span>
                  <p className="text-xs sm:text-sm text-white font-medium italic">
                    "{evalResult.suggested_enhancement || evalResult.correction}"
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-1 sm:pt-2">
                {evalResult.is_correct ? (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNextScene}
                    className="w-full px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-brand-cyan text-black font-extrabold text-xs sm:text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isFinalNode ? 'Completar Misión 🏆' : 'Continuar Historia ➡️'}</span>
                    <ChevronRight size={18} />
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRetryScene}
                    className="w-full px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-extrabold text-xs sm:text-base shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw size={16} />
                    <span>Reintentar Escena 🎤</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 7. Optional Fullscreen Image Modal ── */}
      <AnimatePresence>
        {isExpandedImage && currentImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpandedImage(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
              <img
                src={currentImageUrl}
                alt={currentNode.pov_image_prompt}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setIsExpandedImage(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black border border-white/20 transition-all"
                title="Cerrar vista amplia"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
