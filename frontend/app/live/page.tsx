'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Radio,
  Volume1,
  Pause,
  Play,
  Send,
  CheckCircle2,
  Zap,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import TutorAvatar, { TutorState } from '@/app/components/TutorPanel/TutorAvatar';
import { getCurrentUpgradeStage, UpgradeStage } from '@/lib/guionbajoUpgrades';
import { api, LiveAudioStreamQueue, getSavedPreferredVoice, MiniClassData, playEnglishAudio } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  FlankCardItem,
  CompactQuizBar,
  HolographicMiniClassHUD,
} from './components/HolographicMiniClassHUD';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface GrammarCorrection {
  id: string;
  original: string;
  corrected: string;
  explanation: string;
  timestamp: Date;
}

const CONVERSATION_STARTERS = [
  { label: '🧭 Adverbios de Frecuencia', prompt: 'Guionbajo, explícame los adverbios de frecuencia y su posición en la oración.' },
  { label: '✨ Would like vs Will', prompt: 'Hola Guionbajo, ¿cuándo se usa would like to y cuál es la diferencia con will?' },
  { label: '☕ How was your day?', prompt: 'Hello Guionbajo! How was your day? I want to practice my English today.' },
  { label: '✈️ Favorite travel spot', prompt: 'Hola Guionbajo! Where is your favorite place to travel, and why?' },
  { label: '🎲 ¡Sorpréndeme Guionbajo!', prompt: '¡Hola Guionbajo! Sorpréndeme con un tema interesante para conversar hoy.' },
];

export default function LiveChatPage() {
  const router = useRouter();

  // User & Voice Preferences
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('Estudiante');
  const [userLevel, setUserLevel] = useState<string>('A1.2');
  const [avatarUpgradeStage, setAvatarUpgradeStage] = useState<UpgradeStage>(1);
  const [preferredVoice, setPreferredVoice] = useState<string>('es-US-AlonsoNeural');

  // Hands-Free State Machine
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [micVolume, setMicVolume] = useState<number>(0);
  const [isSpeechDetected, setIsSpeechDetected] = useState<boolean>(false);
  const [silenceProgress, setSilenceProgress] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  // Live Speech Subtitles (Voice-Only Mode, replaces chat UI)
  const [currentTutorSubtitle, setCurrentTutorSubtitle] = useState<string>('¡Hola! Estoy listo para conversar contigo por voz. Haz clic en Iniciar y habla con libertad.');
  const [lastUserUtterance, setLastUserUtterance] = useState<string>('');

  // Messages & Session Memory (preserved in background for AI context)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: '¡Hola! Estoy listo para conversar contigo en modo Manos Libres. Habla cuando quieras en inglés o español.',
      timestamp: new Date(1700000000000),
    },
  ]);
  const [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  const [showCorrections, setShowCorrections] = useState<boolean>(false);
  const [activeMiniClass, setActiveMiniClass] = useState<MiniClassData | null>(null);

  const handlePlayMiniClassAudio = async (phraseText: string) => {
    try {
      const cleanText = phraseText
        .replace(/\s*\([^)]*(?:incorrect|correcto|wrong|error|bien|mal|nota|ojo)[^)]*\)/gi, '')
        .replace(/\s*\[[^\]]*(?:incorrect|correcto|wrong|error|bien|mal|nota|ojo)[^\]]*\]/gi, '')
        .trim();
      await playEnglishAudio(cleanText);
    } catch (e) {
      console.warn('Failed to play mini-class audio snippet:', e);
    }
  };

  const handleQuizCorrect = () => {
    toast.success('¡Respuesta correcta! Regla dominada.', {
      icon: '🎉',
      duration: 3000,
    });
    // Give 2.5s celebration feedback so the student sees their success, then return to normal conversation
    setTimeout(() => {
      setActiveMiniClass(null);
    }, 2500);
  };

  // Verbal Understanding Detector: auto-dismiss mini-class when student says "ya entendí", "todo claro", etc.
  useEffect(() => {
    if (!activeMiniClass || !lastUserUtterance) return;
    const lower = lastUserUtterance.toLowerCase().trim();
    const UNDERSTOOD_PATTERNS = [
      'ya entendí',
      'ya entendi',
      'todo claro',
      'me quedó claro',
      'me quedo claro',
      'ya comprendí',
      'ya comprendi',
      'perfecto',
      'got it',
      'understood',
      'ya me quedó claro',
      'ya me quedo claro',
      'i understand',
      'muchas gracias',
      'gracias guionbajo',
    ];

    if (UNDERSTOOD_PATTERNS.some((p) => lower.includes(p))) {
      const timer = setTimeout(() => {
        setActiveMiniClass(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lastUserUtterance, activeMiniClass]);

  // Audio Pipeline References (PERSISTENT REFS TO PREVENT V8 GARBAGE COLLECTION)
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Utterance Recorder & VAD Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isRecordingUtteranceRef = useRef<boolean>(false);
  const consecutiveSpeechFramesRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number>(0);
  const isSessionActiveRef = useRef<boolean>(false);
  const tutorStateRef = useRef<TutorState>('idle');
  const speakingStartTimeRef = useRef<number>(0);

  // Playback & Watchdog Refs
  const audioQueueRef = useRef<LiveAudioStreamQueue | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    tutorStateRef.current = tutorState;
  }, [tutorState]);

  // Initial Profile Load
  useEffect(() => {
    setIsMounted(true);
    setAvatarUpgradeStage(getCurrentUpgradeStage());

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    api.getMe()
      .then((data) => {
        if (data?.name) setUserName(data.name);
        if (data?.current_sublevel) {
          setUserLevel(data.current_sublevel);
          setAvatarUpgradeStage(getCurrentUpgradeStage(data.current_sublevel));
        }
      })
      .catch((err) => console.warn('Failed to load profile:', err));

    const savedVoice = getSavedPreferredVoice();
    if (savedVoice) setPreferredVoice(savedVoice);

    return () => {
      stopHandsFreeSession();
    };
  }, [router]);

  // Internal chat box scroll only (does NOT move the window camera or page scroll)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ── 1. Start Continuous Hands-Free Session ──────────────────
  const startHandsFreeSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      // 1. Initialize AudioContext
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // 2. Build Audio Processing Graph (Preserved on persistent Refs)
      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.15;
      analyserRef.current = analyser;

      // Silent gain sink so Chrome keeps pulling microphone frames
      const gain = ctx.createGain();
      gain.gain.value = 0.0;
      gainNodeRef.current = gain;

      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);

      setIsSessionActive(true);
      isSessionActiveRef.current = true;
      setTutorState('listening');

      // Reset VAD state
      isRecordingUtteranceRef.current = false;
      consecutiveSpeechFramesRef.current = 0;
      silenceStartRef.current = null;
      speechStartRef.current = 0;

      startContinuousVadLoop();
      toast.success('Micrófono abierto. ¡Habla cuando quieras!');
    } catch (err: any) {
      console.error('Microphone error:', err);
      toast.error('No se pudo acceder al micrófono. Por favor permite el acceso en tu navegador.');
      setIsSessionActive(false);
      setTutorState('idle');
    }
  };

  // ── 2. Real-Time RMS VAD Loop ─────────────────────────────
  const startContinuousVadLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const timeData = new Uint8Array(512);

    const checkFrame = () => {
      if (!analyserRef.current || !isSessionActiveRef.current) return;

      analyserRef.current.getByteTimeDomainData(timeData);

      // Calculate Root-Mean-Square (RMS) Acoustic Energy
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        const diff = timeData[i] - 128;
        sum += diff * diff;
      }
      const rms = Math.sqrt(sum / timeData.length);
      // Normalized volume (0 to 100). Room silence is typically 1-3. Speech is 15-60.
      const volume = Math.min(100, Math.round(rms * 2.8));
      setMicVolume(volume);

      const SPEECH_THRESHOLD = 8; // Threshold: normal speech easily exceeds 15-40
      const now = Date.now();
      const currentState = tutorStateRef.current;

      // ── BARGE-IN: If Guionbajo is speaking and user speaks clearly ──
      if (currentState === 'speaking') {
        const timeSinceSpeakingStart = now - (speakingStartTimeRef.current || 0);
        // Ignore first 500ms to avoid acoustic reflection from speakers
        // Threshold: 25 RMS (direct speech into mic is 35-70; speaker reflection is 10-18)
        // Duration: 350ms of sustained speech
        if (timeSinceSpeakingStart > 500 && volume >= 25) {
          if (!speechStartRef.current) speechStartRef.current = now;
          if (now - speechStartRef.current >= 350) {
            console.log('⚡ Interrupción: el estudiante comenzó a hablar');
            if (audioQueueRef.current) {
              audioQueueRef.current.stop();
            }
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            setTutorState('listening');
            startUtteranceRecording();
          }
        } else {
          speechStartRef.current = 0;
        }
        animationFrameRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      // If Guionbajo is thinking: do NOT abort on low/medium ambient noise; only loud deliberate speech (volume >= 35 for 500ms)
      if (currentState === 'thinking') {
        if (volume >= 35) {
          if (!speechStartRef.current) speechStartRef.current = now;
          if (now - speechStartRef.current >= 500) {
            console.log('⚡ Interrupción durante thinking');
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            setTutorState('listening');
            startUtteranceRecording();
          }
        } else {
          speechStartRef.current = 0;
        }
        animationFrameRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      // ── LISTENING STATE ───────────────────────────────────
      if (currentState === 'listening') {
        if (volume >= SPEECH_THRESHOLD) {
          consecutiveSpeechFramesRef.current += 1;

          // Start recorder cleanly when speech starts (after 2 consecutive frames ~30ms)
          if (!isRecordingUtteranceRef.current && consecutiveSpeechFramesRef.current >= 2) {
            startUtteranceRecording();
          }

          setIsSpeechDetected(true);
          silenceStartRef.current = null;
          setSilenceProgress(0);
        } else {
          // Below speech threshold
          consecutiveSpeechFramesRef.current = 0;
          setIsSpeechDetected(false);

          if (isRecordingUtteranceRef.current) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = now;
            }
            const silenceElapsed = now - silenceStartRef.current;
            const SILENCE_TIMEOUT_MS = 750;
            const progress = Math.min(100, Math.round((silenceElapsed / SILENCE_TIMEOUT_MS) * 100));
            setSilenceProgress(progress);

            // Fast 750ms silence commit after speech -> Commit user utterance immediately!
            if (silenceElapsed >= SILENCE_TIMEOUT_MS) {
              const utteranceDuration = now - speechStartRef.current;
              silenceStartRef.current = null;
              setSilenceProgress(0);

              if (utteranceDuration >= 350) {
                // Legitimate utterance! Stop recorder and commit to STT
                stopAndCommitUtterance();
              } else {
                // Noise bump (< 350ms): discard and continue listening
                cancelUtteranceRecording();
              }
            }
          } else {
            setSilenceProgress(0);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(checkFrame);
    };

    animationFrameRef.current = requestAnimationFrame(checkFrame);
  };

  // ── 3. MediaRecorder Utterance Management ─────────────────
  const startUtteranceRecording = () => {
    if (!audioStreamRef.current || isRecordingUtteranceRef.current) return;

    isRecordingUtteranceRef.current = true;
    speechStartRef.current = Date.now();
    recordedChunksRef.current = [];

    let mimeType = 'audio/webm';
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }
    }

    try {
      const recorder = new MediaRecorder(audioStreamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      // Starts generating clean chunks with complete WebM header at Chunk 0
      recorder.start(50);
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      isRecordingUtteranceRef.current = false;
    }
  };

  const cancelUtteranceRecording = () => {
    isRecordingUtteranceRef.current = false;
    speechStartRef.current = 0;
    silenceStartRef.current = null;
    setSilenceProgress(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    recordedChunksRef.current = [];
  };

  const stopAndCommitUtterance = () => {
    isRecordingUtteranceRef.current = false;
    setTutorState('thinking');
    setIsSpeechDetected(false);
    setSilenceProgress(0);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      resumeListeningState();
      return;
    }

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
      recordedChunksRef.current = [];

      if (audioBlob.size < 400) {
        console.warn('Audio blob too small, resuming listening...');
        resumeListeningState();
        return;
      }

      try {
        // Transcribe speech using MiniMax STT asr-1.0
        const stt = await api.live.transcribe(audioBlob);
        const text = stt.text?.trim();

        if (!text) {
          toast('No alcancé a captar el audio con claridad. Intenta de nuevo.', { icon: '👂' });
          resumeListeningState();
          return;
        }

        setLastUserUtterance(text);
        setCurrentTutorSubtitle('Guionbajo está pensando...');

        const userMsg: Message = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: text,
          timestamp: new Date(),
        };

        setMessages((prev) => {
          const updated = [...prev, userMsg];
          dispatchTutorResponse(updated);
          return updated;
        });
      } catch (err: any) {
        console.error('STT error:', err);
        toast.error('Error al procesar voz.');
        resumeListeningState();
      }
    };

    try {
      recorder.stop();
    } catch (e) {
      console.error('Error stopping recorder:', e);
      resumeListeningState();
    }
  };

  // ── 4. Streaming Response with Synchronized Voice ─────────
  const dispatchTutorResponse = async (history: Message[]) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    // Map to track spoken clauses by index to completely eliminate duplicate text
    const spokenClausesMap: Record<number, string> = {};

    const audioQueue = new LiveAudioStreamQueue({
      voiceId: preferredVoice || 'es-US-AlonsoNeural',
      onAudioElementChange: (audio) => {
        setActiveAudio(audio);
      },
      onStateChange: (state) => {
        if (!isMuted) {
          if (state === 'playing') {
            speakingStartTimeRef.current = Date.now();
          }
          setTutorState(state === 'playing' ? 'speaking' : 'idle');
        }
      },
      onClausePlay: (clauseIdx, clauseText) => {
        // Words appear in real-time in sync with Guionbajo pronouncing each clause
        spokenClausesMap[clauseIdx] = clauseText;
        const assembledText = Object.keys(spokenClausesMap)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => spokenClausesMap[Number(k)])
          .join(' ');

        setCurrentTutorSubtitle(assembledText);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: assembledText } : m
          )
        );
      },
      onAllEnded: () => {
        // Guionbajo finished speaking -> Automatically resume continuous hands-free listening!
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
        );
        resumeListeningState();
      },
    });
    audioQueueRef.current = audioQueue;

    try {
      const messagesPayload = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await api.live.streamResponse(
        messagesPayload,
        {
          student_name: userName,
          student_level: userLevel,
          voice_id: preferredVoice || 'es-US-AlonsoNeural',
          active_mini_class: activeMiniClass,
          signal: abortController.signal,
        },
        {
          onClause: (clause) => {
            if (!isMuted) {
              audioQueue.enqueue(clause.clause_index, clause.text);
            }
          },
          onCorrection: (corr) => {
            const newCorrection: GrammarCorrection = {
              id: `corr-${Date.now()}`,
              original: corr.original,
              corrected: corr.corrected,
              explanation: corr.explanation,
              timestamp: new Date(),
            };
            setCorrections((prev) => [newCorrection, ...prev]);
            toast.custom(
              (t) => (
                <div
                  className={`${
                    t.visible ? 'animate-enter' : 'animate-leave'
                  } max-w-md w-full bg-brand-surface border border-brand-cyan/50 shadow-2xl rounded-2xl pointer-events-auto flex p-4 gap-3 text-white`}
                >
                  <div className="p-2 rounded-xl bg-brand-cyan/20 text-brand-cyan shrink-0 h-fit">
                    <Sparkles size={20} />
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-brand-cyan text-sm">Tip de Guionbajo:</p>
                    <p className="text-brand-text-secondary line-through mt-0.5">{corr.original}</p>
                    <p className="font-semibold text-emerald-300">✓ {corr.corrected}</p>
                    <p className="text-brand-text-muted mt-1">{corr.explanation}</p>
                  </div>
                </div>
              ),
              { duration: 6000 }
            );
          },
          onMiniClass: (miniClassData) => {
            setActiveMiniClass(miniClassData);
            toast.custom(
              (t) => (
                <div
                  className={`${
                    t.visible ? 'animate-enter' : 'animate-leave'
                  } max-w-md w-full bg-brand-surface border border-purple-500/50 shadow-2xl rounded-2xl pointer-events-auto flex p-4 gap-3 text-white`}
                >
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 shrink-0 h-fit">
                    <Zap size={20} />
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-purple-300 text-sm">Pizarra Holográfica Desplegada:</p>
                    <p className="font-semibold text-white mt-0.5">{miniClassData.topic}</p>
                    <p className="text-brand-text-muted mt-0.5">{miniClassData.summary || 'Mini-clase interactiva abierta en pantalla.'}</p>
                  </div>
                </div>
              ),
              { duration: 5000 }
            );
          },
          onCloseMiniClass: () => {
            setActiveMiniClass(null);
            toast.success('¡Excelente! Has dominado el tema. Volviendo a la charla.', {
              icon: '✨',
              duration: 3000,
            });
          },
          onDone: (doneData) => {
            audioQueue.markStreamComplete();
            if (doneData?.full_text) {
              setCurrentTutorSubtitle(doneData.full_text);
            }
            if (doneData?.miniclass) {
              setActiveMiniClass(doneData.miniclass);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content || doneData.full_text }
                  : m
              )
            );
          },
          onError: (err) => {
            console.warn('Stream error:', err);
            resumeListeningState();
          },
        }
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Stream dispatch error:', err);
      }
      resumeListeningState();
    }
  };

  // ── 5. Resume Listening Loop ─────────────────────────────
  const resumeListeningState = () => {
    if (!isSessionActiveRef.current) return;
    setTutorState('listening');
    isRecordingUtteranceRef.current = false;
    consecutiveSpeechFramesRef.current = 0;
    speechStartRef.current = 0;
    silenceStartRef.current = null;
    setSilenceProgress(0);
    setIsSpeechDetected(false);

    if (!animationFrameRef.current) {
      startContinuousVadLoop();
    }
  };

  // ── 6. Stop Hands-Free Session ───────────────────────────
  const stopHandsFreeSession = () => {
    setIsSessionActive(false);
    isSessionActiveRef.current = false;
    setTutorState('idle');
    setMicVolume(0);
    setIsSpeechDetected(false);
    setSilenceProgress(0);
    cancelUtteranceRecording();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioQueueRef.current) {
      audioQueueRef.current.stop();
      audioQueueRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    sourceNodeRef.current = null;
    analyserRef.current = null;
    gainNodeRef.current = null;
  };

  // ── 7. Reset Memory ──────────────────────────────────────
  const handleResetSession = () => {
    if (audioQueueRef.current) {
      audioQueueRef.current.stop();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: '¡Conversación reiniciada! Estoy listo para escucharte de nuevo.',
        timestamp: new Date(),
      },
    ]);
    setCorrections([]);
    setActiveMiniClass(null);
    setCurrentTutorSubtitle('¡Conversación reiniciada! Estoy listo para escucharte.');
    setLastUserUtterance('');
    toast.success('Memoria de la conversación reiniciada.');
    if (isSessionActiveRef.current) {
      resumeListeningState();
    }
  };

  // Quick Starter Prompts
  const handleSendStarter = (promptText: string) => {
    setLastUserUtterance(promptText);
    setCurrentTutorSubtitle('Guionbajo está pensando...');
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date(),
    };
    setMessages((prev) => {
      const updated = [...prev, userMsg];
      dispatchTutorResponse(updated);
      return updated;
    });
  };

  // Mini-class cards flanking layout helpers
  const allMiniClassCards = activeMiniClass?.cards || [];
  const leftCards = allMiniClassCards.filter((_, i) => i % 2 === 0);
  const rightCards =
    allMiniClassCards.length > 1
      ? allMiniClassCards.filter((_, i) => i % 2 !== 0)
      : allMiniClassCards.length === 1
      ? [
          {
            id: 'summary-card',
            step: 2,
            badge: 'Resumen',
            title: 'Idea Principal',
            formula: '',
            example: activeMiniClass?.summary || 'Aplica esta regla clave al hablar.',
            highlight: '',
            explanation: 'Sigue conversando o responde la pregunta para dominarla.',
          },
        ]
      : [];

  const renderAvatarHero = (isCompact = false) => (
    <div
      className={`w-full flex flex-col items-center justify-center ${
        isCompact ? 'py-4 px-3' : 'py-6 px-4'
      } glass rounded-3xl border border-brand-accent/30 shadow-2xl relative overflow-hidden bg-gradient-to-b from-brand-surface/40 to-black/60`}
    >
      {/* Dynamic Background Glow */}
      <div
        className={`absolute -top-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          tutorState === 'speaking'
            ? 'bg-brand-cyan/25 scale-125'
            : isSpeechDetected
            ? 'bg-red-500/30 scale-125'
            : tutorState === 'listening'
            ? 'bg-emerald-500/20 scale-105'
            : tutorState === 'thinking'
            ? 'bg-brand-gold/25 animate-pulse'
            : 'bg-brand-accent/10'
        }`}
      />

      {/* Continuous Hands-Free Status Banner */}
      <div className="flex items-center gap-2 mb-2 z-10">
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
            !isSessionActive
              ? 'glass border-brand-border text-brand-text-muted'
              : tutorState === 'speaking'
              ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
              : isSpeechDetected
              ? 'bg-red-500/20 border-red-400 text-red-300 animate-pulse'
              : tutorState === 'thinking'
              ? 'bg-brand-gold/20 border-brand-gold text-brand-gold animate-pulse'
              : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
          }`}
        >
          <Radio
            size={14}
            className={
              isSpeechDetected
                ? 'animate-ping'
                : tutorState === 'speaking'
                ? 'animate-pulse'
                : ''
            }
          />
          <span>
            {!isSessionActive
              ? 'Sesión en pausa'
              : tutorState === 'speaking'
              ? 'Guionbajo está hablando (puedes interrumpirlo)'
              : isSpeechDetected
              ? '🎙️ ¡Detectando tu voz...!'
              : tutorState === 'thinking'
              ? 'Guionbajo está pensando...'
              : '🟢 Micrófono abierto — Habla con naturalidad'}
          </span>
        </div>
      </div>

      {/* Animated Guionbajo Avatar con Upgrades */}
      <div className={`relative z-10 ${isCompact ? 'my-1' : 'my-2'}`}>
        <TutorAvatar
          state={tutorState}
          text={tutorState === 'speaking' ? currentTutorSubtitle : ''}
          size={isCompact ? 'md' : 'lg'}
          audioElement={activeAudio}
          upgradeStage={avatarUpgradeStage}
        />
      </div>

      {/* Live Audio Level Meter (Visual Confidence) */}
      {isSessionActive && (
        <div className="w-64 max-w-full flex flex-col items-center gap-1 mt-2 z-10">
          <div className="w-full flex items-center justify-between text-[10px] text-brand-text-muted font-mono-custom">
            <span>Nivel de voz: {micVolume}%</span>
            <span className={micVolume >= 8 ? 'text-emerald-400 font-bold' : ''}>
              {micVolume >= 8 ? 'Hablando' : 'Silencio'}
            </span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-2.5 p-0.5 border border-white/10 relative overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all duration-75 ${
                micVolume >= 8
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-sm shadow-cyan-400/50'
                  : 'bg-brand-border/60'
              }`}
              style={{ width: `${Math.max(2, Math.min(100, micVolume * 2))}%` }}
            />
          </div>
        </div>
      )}

      {/* 1.5s Silence Countdown Bar */}
      {silenceProgress > 0 && (
        <div className="w-48 bg-black/40 rounded-full h-1.5 mt-2 overflow-hidden border border-white/10 z-10">
          <div
            className="bg-brand-cyan h-full transition-all duration-100 ease-linear"
            style={{ width: `${silenceProgress}%` }}
          />
        </div>
      )}
      {silenceProgress > 0 && (
        <span className="text-[10px] text-brand-cyan mt-1 z-10 font-mono-custom animate-pulse">
          Pausa detectada (1.5s): enviando...
        </span>
      )}

      {/* Master Hands-Free Session Button */}
      <div className={`${isCompact ? 'mt-3' : 'mt-5'} flex flex-col items-center gap-1.5 z-10`}>
        <button
          onClick={isSessionActive ? stopHandsFreeSession : startHandsFreeSession}
          className={`flex items-center gap-2.5 ${
            isCompact ? 'px-5 py-2.5 text-xs' : 'px-6 py-3 text-xs sm:text-sm'
          } rounded-2xl font-bold shadow-xl transition-all transform active:scale-95 ${
            isSessionActive
              ? 'bg-brand-surface border border-red-500/40 text-red-400 hover:bg-red-500/20'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 hover:scale-[1.02]'
          }`}
        >
          {isSessionActive ? (
            <>
              <Pause size={16} />
              <span>Pausar Manos Libres</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Iniciar Conversación Manos Libres</span>
            </>
          )}
        </button>

        {!isCompact && (
          <p className="text-[11px] text-brand-text-secondary text-center max-w-md">
            {isSessionActive
              ? 'El micrófono permanece abierto. Guionbajo procesa cuando haces una pausa breve y se pausa si lo interrumpes.'
              : 'Haz clic para abrir el micrófono continuo. No necesitarás presionar ningún botón más.'}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col text-white">
      {/* ─── Top Header Bar ─────────────────────────────────── */}
      <header className="px-4 py-3 sm:px-6 border-b border-brand-border/40 glass sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass border border-brand-border/60 hover:bg-brand-surface text-xs font-semibold text-brand-text-secondary hover:text-white transition-all"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-brand-border/40" />

          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isSessionActive ? 'bg-emerald-400 animate-ping' : 'bg-brand-text-muted'
              }`}
            />
            <span className="font-outfit font-bold text-sm sm:text-base">
              Guionbajo Manos Libres
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-cyan">
              {userLevel}
            </span>
            {isMounted && avatarUpgradeStage > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/40 text-yellow-300 flex items-center gap-1">
                <span>⚡</span> Stage {avatarUpgradeStage}/8
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mute Voice */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl glass border transition-all ${
              isMuted
                ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                : 'border-brand-border text-brand-text-secondary hover:text-white'
            }`}
            title={isMuted ? 'Activar audio' : 'Silenciar voz'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Reset Memory */}
          <button
            onClick={handleResetSession}
            className="p-2 rounded-xl glass border border-brand-border text-brand-text-secondary hover:text-white hover:bg-brand-surface transition-all"
            title="Reiniciar conversación (borrar memoria temporal)"
          >
            <RotateCcw size={16} />
          </button>

          {/* Feedback Drawer Toggle */}
          <button
            onClick={() => setShowCorrections(!showCorrections)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              corrections.length > 0
                ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan shadow-sm shadow-brand-cyan/20'
                : 'glass border-brand-border text-brand-text-muted hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Tips</span>
            <span className="px-1.5 py-0.2 rounded-full bg-brand-cyan/30 text-[10px] font-bold">
              {corrections.length}
            </span>
          </button>

          {/* Active Mini-Class Badge */}
          {activeMiniClass && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-purple-500/20 border-purple-400 text-purple-300 shadow-sm shadow-purple-500/20 animate-pulse"
              title={`Mini-clase activa: ${activeMiniClass.topic}`}
            >
              <Zap size={14} className="text-purple-300" />
              <span className="hidden sm:inline">Pizarra</span>
            </div>
          )}
        </div>
      </header>

      {/* ─── Main Content Split Layout ─────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT / CENTER: Interactive Voice Stage */}
            <div
              className={`flex-1 flex flex-col p-4 sm:p-6 lg:p-8 mx-auto w-full overflow-y-auto transition-all duration-500 ease-in-out ${
                activeMiniClass ? 'max-w-6xl' : 'max-w-3xl'
              }`}
            >
              {/* Cockpit Flanking Layout vs Normal Centered Stage */}
              <AnimatePresence mode="wait">
                {activeMiniClass ? (
                  <motion.div
                    key="cockpit-stage"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                    className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start mb-3"
                  >
                    {/* LEFT FLANK: Card 1 (and Card 3) */}
                    <div className="lg:col-span-3 flex flex-col gap-2.5 order-2 lg:order-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-brand-cyan uppercase tracking-wider px-1">
                        <span className="flex items-center gap-1.5 truncate">
                          <Sparkles size={12} className="shrink-0 text-brand-cyan" />
                          <span className="truncate">{activeMiniClass.topic || 'Pizarra'}</span>
                        </span>
                        <span className="text-[9px] font-mono-custom text-brand-text-muted shrink-0">
                          Regla 1
                        </span>
                      </div>
                      {leftCards.map((card, idx) => (
                        <FlankCardItem
                          key={card.id || `left-${idx}`}
                          card={card}
                          index={idx * 2}
                          onPlayAudio={handlePlayMiniClassAudio}
                        />
                      ))}
                    </div>

                    {/* CENTER: Guionbajo Hero + Compact Micro Quiz */}
                    <div className="lg:col-span-6 flex flex-col items-center order-1 lg:order-2">
                      {renderAvatarHero(true)}

                      {/* Compact Horizontal Micro-Quiz Bar Directly Below Guionbajo */}
                      {activeMiniClass.quiz && (
                        <div className="w-full">
                          <CompactQuizBar
                            quiz={activeMiniClass.quiz}
                            lastUserVoiceText={lastUserUtterance}
                            onCorrect={handleQuizCorrect}
                          />
                        </div>
                      )}
                    </div>

                    {/* RIGHT FLANK: Card 2 (and Card 4) */}
                    <div className="lg:col-span-3 flex flex-col gap-2.5 order-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 uppercase tracking-wider px-1">
                        <span className="flex items-center gap-1.5">
                          <Zap size={12} className="shrink-0 text-purple-300" />
                          <span>Estructuras</span>
                        </span>
                        <button
                          onClick={() => setActiveMiniClass(null)}
                          className="text-brand-text-muted hover:text-white flex items-center gap-1 text-[10px] transition-colors p-1 rounded-lg hover:bg-white/10"
                          title="Cerrar pizarra holográfica y volver a normal"
                        >
                          <span>Cerrar</span>
                          <X size={12} />
                        </button>
                      </div>
                      {rightCards.map((card, idx) => (
                        <FlankCardItem
                          key={card.id || `right-${idx}`}
                          card={card}
                          index={idx * 2 + 1}
                          onPlayAudio={handlePlayMiniClassAudio}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="normal-stage"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                    className="w-full mb-5"
                  >
                    {renderAvatarHero(false)}
                  </motion.div>
                )}
              </AnimatePresence>

          {/* ── Subtítulos Dinámicos en Vivo (Modo Voz Pura — Sin Chat) ── */}
          <div className="w-full max-w-xl mx-auto text-center mt-2 mb-4 p-5 rounded-3xl glass border border-brand-cyan/30 bg-black/40 backdrop-blur-md shadow-2xl space-y-2">
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-cyan">
              <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
              <span>Guionbajo en Tiempo Real</span>
            </div>
            <p className="text-base sm:text-lg text-white font-medium leading-relaxed min-h-[52px] flex items-center justify-center px-2">
              {currentTutorSubtitle}
            </p>

            {lastUserUtterance && (
              <div className="pt-2.5 border-t border-white/10 text-xs text-brand-text-secondary flex items-center justify-center gap-1.5 truncate">
                <Mic size={13} className="text-emerald-400 shrink-0" />
                <span className="truncate">Tú: "{lastUserUtterance}"</span>
              </div>
            )}
          </div>

          {/* Quick Icebreaker Starter Prompts */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none flex-wrap">
            <span className="text-xs text-brand-text-muted flex items-center gap-1 shrink-0">
              <Sparkles size={12} className="text-brand-gold" /> Temas sugeridos:
            </span>
            {CONVERSATION_STARTERS.map((starter, i) => (
              <button
                key={i}
                onClick={() => handleSendStarter(starter.prompt)}
                disabled={tutorState === 'thinking'}
                className="shrink-0 text-xs px-3 py-1.5 rounded-xl glass border border-brand-border/60 hover:border-brand-cyan/60 hover:text-white text-brand-text-secondary transition-all disabled:opacity-50 active:scale-95"
              >
                {starter.label}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Pedagogical Feedback & Grammar Drawer */}
        <AnimatePresence>
          {showCorrections && (
            <motion.aside
              initial={{ opacity: 0, x: 50, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 340 }}
              exit={{ opacity: 0, x: 50, width: 0 }}
              className="glass border-l border-brand-border/40 p-5 overflow-y-auto flex flex-col shrink-0"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-border/40 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-cyan" />
                  <h3 className="font-bold text-sm text-white">Correcciones en Vivo</h3>
                </div>
                <button
                  onClick={() => setShowCorrections(false)}
                  className="text-xs text-brand-text-muted hover:text-white"
                >
                  Cerrar
                </button>
              </div>

              {corrections.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-brand-text-muted">
                  <CheckCircle2 size={32} className="text-emerald-400 mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-white mb-1">¡Excelente fluidez!</p>
                  <p className="text-[11px]">
                    Aún no hay errores detectados en tu conversación. Sigue platicando libremente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {corrections.map((corr) => (
                    <div
                      key={corr.id}
                      className="p-3.5 rounded-2xl bg-brand-surface/70 border border-brand-cyan/30 text-xs space-y-1.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-[10px] text-brand-text-muted">
                        <span className="font-bold text-amber-400">Expresión Original</span>
                        <span>{corr.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="line-through text-red-400 font-mono-custom">{corr.original}</p>

                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-emerald-400">Forma Natural:</span>
                        <p className="text-emerald-300 font-semibold font-mono-custom">
                          {corr.corrected}
                        </p>
                      </div>

                      <p className="text-[11px] text-brand-text-secondary pt-1 border-t border-white/5">
                        {corr.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
