'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Radio,
  Volume1,
  Pause,
  Play,
  Send,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import TutorAvatar, { TutorState } from '@/app/components/TutorPanel/TutorAvatar';
import { api, LiveAudioStreamQueue, getSavedPreferredVoice } from '@/lib/api';
import { getToken } from '@/lib/auth';

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
  { label: '☕ How was your day?', prompt: 'Hello Guionbajo! How was your day? I want to practice my English today.' },
  { label: '✈️ Favorite travel spot', prompt: 'Hola Guionbajo! Where is your favorite place to travel, and why?' },
  { label: '🍕 Food & cooking', prompt: 'What kind of food do you like the most? Can you tell me in English?' },
  { label: '🎲 ¡Sorpréndeme Guionbajo!', prompt: '¡Hola Guionbajo! Sorpréndeme con un tema interesante para conversar hoy.' },
];

export default function LiveChatPage() {
  const router = useRouter();

  // User Profile
  const [userName, setUserName] = useState<string>('Estudiante');
  const [userLevel, setUserLevel] = useState<string>('A1.2');
  const [preferredVoice, setPreferredVoice] = useState<string>('male-qn-qingse');

  // Hands-Free State Machine
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [micVolume, setMicVolume] = useState<number>(0);
  const [speechThreshold, setSpeechThreshold] = useState<number>(8);
  const [isSpeechDetected, setIsSpeechDetected] = useState<boolean>(false);
  const [silenceProgress, setSilenceProgress] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [textInput, setTextInput] = useState<string>('');

  // Messages & Corrections (Temporary Session Memory)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: '¡Hola! Estoy listo para conversar contigo en modo Manos Libres. Habla cuando quieras en inglés o español.',
      timestamp: new Date(),
    },
  ]);
  const [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  const [showCorrections, setShowCorrections] = useState<boolean>(false);

  // Audio Processing Refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const currentRecorderRef = useRef<MediaRecorder | null>(null);
  const currentChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // VAD Tracking Refs
  const isRecordingUtteranceRef = useRef<boolean>(false);
  const speechStartTimeRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const ambientNoiseFloorRef = useRef<number>(2);
  const isSessionActiveRef = useRef<boolean>(false);
  const tutorStateRef = useRef<TutorState>('idle');

  // Playback & Stream Refs
  const audioQueueRef = useRef<LiveAudioStreamQueue | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    tutorStateRef.current = tutorState;
  }, [tutorState]);

  // Initial Load
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    api.getMe()
      .then((data) => {
        if (data?.name) setUserName(data.name);
        if (data?.current_sublevel) setUserLevel(data.current_sublevel);
      })
      .catch((err) => console.warn('Failed to load profile for live room:', err));

    const savedVoice = getSavedPreferredVoice();
    if (savedVoice) setPreferredVoice(savedVoice);

    return () => {
      stopHandsFreeSession();
    };
  }, [router]);

  // Scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, silenceProgress]);

  // ── 1. Start Hands-Free Session ──────────────────────────
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

      // Initialize Web Audio Context & Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;
      analyserRef.current = analyser;

      source.connect(analyser);

      setIsSessionActive(true);
      setTutorState('listening');
      isRecordingUtteranceRef.current = false;
      silenceStartRef.current = null;
      ambientNoiseFloorRef.current = 2;

      startContinuousVadLoop();
      toast.success('Micrófono abierto en modo Manos Libres. ¡Habla cuando quieras!');
    } catch (err: any) {
      console.error('Error starting hands-free session:', err);
      toast.error('No se pudo acceder al micrófono. Por favor permite el acceso en tu navegador.');
      setIsSessionActive(false);
      setTutorState('idle');
    }
  };

  // ── 2. Real-Time RMS VAD Loop ─────────────────────────────
  const startContinuousVadLoop = () => {
    const timeData = new Uint8Array(256);

    const checkFrame = () => {
      if (!analyserRef.current || !isSessionActiveRef.current) return;

      analyserRef.current.getByteTimeDomainData(timeData);

      // Calculate True Root-Mean-Square (RMS) Energy (accurate voice pressure)
      let sumSquares = 0;
      for (let i = 0; i < timeData.length; i++) {
        const norm = (timeData[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / timeData.length);
      const volume = Math.min(100, Math.round(rms * 280));
      setMicVolume(volume);

      // Adaptive ambient noise floor calculation
      if (volume < 6) {
        ambientNoiseFloorRef.current = ambientNoiseFloorRef.current * 0.96 + volume * 0.04;
      }
      const threshold = Math.max(6, Math.round(ambientNoiseFloorRef.current + 4));
      setSpeechThreshold(threshold);

      const now = Date.now();
      const currentState = tutorStateRef.current;

      // ── BARGE-IN INTERRUPTION ─────────────────────────────
      // If Guionbajo is speaking and student starts talking loudly (> threshold + 4 for > 250ms):
      if (currentState === 'speaking' || currentState === 'thinking') {
        if (volume >= threshold + 3) {
          if (!speechStartTimeRef.current) speechStartTimeRef.current = now;
          if (now - speechStartTimeRef.current >= 250) {
            console.log('⚡ Interrupción (Barge-in): Pausando voz de Guionbajo');
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
          speechStartTimeRef.current = 0;
        }
        animationFrameRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      // ── NORMAL LISTENING & SILENCE DETECTION ──────────────
      if (currentState === 'listening') {
        if (volume >= threshold) {
          // Voice detected!
          if (!isRecordingUtteranceRef.current) {
            startUtteranceRecording();
          }
          setIsSpeechDetected(true);
          silenceStartRef.current = null;
          setSilenceProgress(0);
        } else {
          // Volume is below threshold
          setIsSpeechDetected(false);

          if (isRecordingUtteranceRef.current) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = now;
            }
            const silenceElapsed = now - silenceStartRef.current;
            const progress = Math.min(100, Math.round((silenceElapsed / 1500) * 100));
            setSilenceProgress(progress);

            // Exactly 1.5 seconds of silence reached -> Finalize user utterance!
            if (silenceElapsed >= 1500) {
              const utteranceDuration = now - speechStartTimeRef.current;
              silenceStartRef.current = null;
              setSilenceProgress(0);

              if (utteranceDuration >= 400) {
                // Legitimate speech utterance! Commit turn.
                stopAndCommitUtterance();
                return;
              } else {
                // Too short (< 400ms, likely a cough or click): discard and keep listening
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
    speechStartTimeRef.current = Date.now();
    currentChunksRef.current = [];

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
      currentRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          currentChunksRef.current.push(e.data);
        }
      };

      recorder.start(100); // 100ms slices
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      isRecordingUtteranceRef.current = false;
    }
  };

  const cancelUtteranceRecording = () => {
    isRecordingUtteranceRef.current = false;
    speechStartTimeRef.current = 0;
    silenceStartRef.current = null;
    setSilenceProgress(0);
    if (currentRecorderRef.current && currentRecorderRef.current.state !== 'inactive') {
      try {
        currentRecorderRef.current.stop();
      } catch (_) {}
    }
    currentChunksRef.current = [];
  };

  const stopAndCommitUtterance = () => {
    isRecordingUtteranceRef.current = false;
    setTutorState('thinking');
    setIsSpeechDetected(false);
    setSilenceProgress(0);

    const recorder = currentRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      resumeListeningState();
      return;
    }

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(currentChunksRef.current, { type: mimeType });
      currentChunksRef.current = [];

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
          toast('No alcancé a captar el audio con claridad. Vuelve a decirme.', { icon: '👂' });
          resumeListeningState();
          return;
        }

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
        toast.error('Error al transcribir voz.');
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

    const audioQueue = new LiveAudioStreamQueue({
      voiceId: preferredVoice || 'male-qn-qingse',
      onAudioElementChange: (audio) => {
        setActiveAudio(audio);
      },
      onStateChange: (state) => {
        if (!isMuted) {
          setTutorState(state === 'playing' ? 'speaking' : 'idle');
        }
      },
      onClausePlay: (_clauseIdx, clauseText) => {
        // Spoken words appear in real-time as Guionbajo pronounces them!
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: (m.content ? m.content + ' ' : '') + clauseText }
              : m
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
          voice_id: preferredVoice || 'male-qn-qingse',
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
          onDone: (doneData) => {
            audioQueue.markStreamComplete();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: doneData.full_text || m.content } : m
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
    speechStartTimeRef.current = 0;
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
  };

  // ── 7. Reset Temporary Session Memory ────────────────────
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
    toast.success('Memoria de la conversación reiniciada.');
    if (isSessionActive) {
      resumeListeningState();
    }
  };

  // Replay a message
  const handleReplayMessage = async (msg: Message) => {
    if (!msg.content) return;
    try {
      setTutorState('speaking');
      const blob = await api.live.synthesizeChunk(msg.content, preferredVoice);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setActiveAudio(audio);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setActiveAudio(null);
        if (isSessionActive) resumeListeningState();
        else setTutorState('idle');
      };
      audio.play();
    } catch (e) {
      console.warn('Replay failed:', e);
      if (isSessionActive) resumeListeningState();
      else setTutorState('idle');
    }
  };

  // Quick Starter Prompts
  const handleSendStarter = (promptText: string) => {
    if (!isSessionActive) {
      startHandsFreeSession().then(() => {
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
      });
    } else {
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
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col text-white">
      {/* ─── Top Bar ────────────────────────────────────────── */}
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
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mute Toggle */}
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
        </div>
      </header>

      {/* ─── Main Content Split Layout ─────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT / CENTER: Interactive Voice Stage */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          {/* Stage Hero: Avatar, Live Meter & Hands-Free Controller */}
          <div className="flex flex-col items-center justify-center py-6 px-4 glass rounded-3xl border border-brand-accent/30 shadow-2xl relative overflow-hidden mb-6 bg-gradient-to-b from-brand-surface/40 to-black/60">
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

            {/* Animated Guionbajo Avatar */}
            <div className="relative z-10 my-2">
              <TutorAvatar
                state={tutorState}
                size="lg"
                audioElement={activeAudio}
              />
            </div>

            {/* Live Audio Level Meter (Visual Confidence) */}
            {isSessionActive && (
              <div className="w-64 max-w-full flex flex-col items-center gap-1 mt-2 z-10">
                <div className="w-full flex items-center justify-between text-[10px] text-brand-text-muted font-mono-custom">
                  <span>Voz: {micVolume}%</span>
                  <span className={micVolume >= speechThreshold ? 'text-emerald-400 font-bold' : ''}>
                    Umbral: {speechThreshold}%
                  </span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2 p-0.5 border border-white/10 relative overflow-hidden">
                  {/* Threshold indicator needle */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/80 z-20"
                    style={{ left: `${speechThreshold}%` }}
                    title={`Umbral de activación: ${speechThreshold}%`}
                  />
                  {/* Energy bar */}
                  <motion.div
                    className={`h-full rounded-full transition-all duration-75 ${
                      micVolume >= speechThreshold
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-sm shadow-cyan-400/50'
                        : 'bg-brand-border/60'
                    }`}
                    style={{ width: `${Math.max(2, micVolume)}%` }}
                  />
                </div>
              </div>
            )}

            {/* 1.5s Silence Countdown Bar */}
            {silenceProgress > 0 && (
              <div className="w-48 bg-black/40 rounded-full h-1.5 mt-3 overflow-hidden border border-white/10 z-10">
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
            <div className="mt-5 flex flex-col items-center gap-2 z-10">
              <button
                onClick={isSessionActive ? stopHandsFreeSession : startHandsFreeSession}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-xl transition-all transform active:scale-95 ${
                  isSessionActive
                    ? 'bg-brand-surface border border-red-500/40 text-red-400 hover:bg-red-500/20'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 hover:scale-[1.02]'
                }`}
              >
                {isSessionActive ? (
                  <>
                    <Pause size={18} />
                    <span>Pausar Manos Libres</span>
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    <span>Iniciar Conversación Manos Libres</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-brand-text-secondary text-center max-w-md">
                {isSessionActive
                  ? 'El micrófono permanece abierto automáticamente. Guionbajo procesa cuando dejas de hablar por 1.5s y se pausa si lo interrumpes.'
                  : 'Haz clic para abrir el micrófono continuo. No necesitarás presionar ningún botón más.'}
              </p>
            </div>
          </div>

          {/* Quick Icebreaker Starter Prompts */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            <span className="text-xs text-brand-text-muted flex items-center gap-1 shrink-0">
              <Sparkles size={12} className="text-brand-gold" /> Temas:
            </span>
            {CONVERSATION_STARTERS.map((starter, i) => (
              <button
                key={i}
                onClick={() => handleSendStarter(starter.prompt)}
                disabled={tutorState === 'thinking'}
                className="shrink-0 text-xs px-3 py-1.5 rounded-xl glass border border-brand-border/60 hover:border-brand-cyan/60 hover:text-white text-brand-text-secondary transition-all disabled:opacity-50"
              >
                {starter.label}
              </button>
            ))}
          </div>

          {/* ─── Chat Transcript Stream (Voice-Synchronized) ─── */}
          <div className="flex-1 glass rounded-3xl border border-brand-border/40 p-4 sm:p-6 overflow-y-auto max-h-[360px] space-y-4 mb-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar Mini Icon */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isUser
                        ? 'bg-brand-accent text-white'
                        : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                    }`}
                  >
                    {isUser ? userName.slice(0, 1).toUpperCase() : 'GB'}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-brand-accent text-white rounded-tr-none'
                        : 'bg-brand-surface/80 border border-brand-border/60 text-white rounded-tl-none shadow-md'
                    }`}
                  >
                    <p>{msg.content || (msg.isStreaming ? 'Guionbajo está pensando...' : '')}</p>

                    {/* Replay voice button */}
                    {!isUser && msg.content && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-brand-text-muted">
                        <span>Guionbajo AI</span>
                        <button
                          onClick={() => handleReplayMessage(msg)}
                          className="flex items-center gap-1 hover:text-brand-cyan transition-colors"
                          title="Volver a escuchar audio"
                        >
                          <Volume1 size={13} /> Escuchar
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Fallback Text Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!textInput.trim() || tutorState === 'thinking') return;
              const text = textInput.trim();
              setTextInput('');
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
            }}
            className="flex items-center gap-2 glass rounded-2xl border border-brand-border/60 p-1.5"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="O escribe un mensaje si prefieres..."
              disabled={tutorState === 'thinking'}
              className="flex-1 bg-transparent px-3 py-1.5 text-sm text-white placeholder-brand-text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || tutorState === 'thinking'}
              className="p-2.5 rounded-xl bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </form>
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
