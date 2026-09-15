'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Radio,
  Globe,
  MessageSquare,
  Flame,
  Zap,
  BookOpen,
  Volume1,
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
  audioBlob?: Blob;
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
  { label: '🎲 ¡Sorpréndeme Guionbajo!', prompt: '¡Hola Guionbajo! Sorpréndeme con un tema interesante para practicar hoy.' },
];

export default function LiveChatPage() {
  const router = useRouter();

  // User & Settings
  const [userName, setUserName] = useState<string>('Estudiante');
  const [userLevel, setUserLevel] = useState<string>('A1.2');
  const [preferredVoice, setPreferredVoice] = useState<string>('');

  // Live state
  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [inputMode, setInputMode] = useState<'vad' | 'push'>('push');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  // Messages & Corrections
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: '¡Hola! Qué gusto saludarte. Estoy listo para platicar contigo en español o en inglés. ¿Qué tal estuvo tu día today?',
      timestamp: new Date(),
    },
  ]);
  const [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  const [showCorrections, setShowCorrections] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');

  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenRef = useRef<boolean>(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioQueueRef = useRef<LiveAudioStreamQueue | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Authentication & Profile Load
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

    setPreferredVoice(getSavedPreferredVoice());
  }, [router]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      cleanupAudioStream();
      audioQueueRef.current?.stop();
    };
  }, []);

  const cleanupAudioStream = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setMicVolume(0);
    setRecordingSeconds(0);
  };

  // 2. Start Microphone Recording (Push-to-Talk or VAD)
  const startRecording = async () => {
    if (isRecording || isProcessing) return;

    // Stop Guionbajo if currently speaking
    if (audioQueueRef.current) {
      audioQueueRef.current.stop();
    }
    setTutorState('listening');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      hasSpokenRef.current = false;

      // Web Audio API volume monitoring for Visualizer & VAD
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicVolume(normalized);

        // VAD (Voice Activity Detection) logic
        if (inputMode === 'vad') {
          if (normalized > 18) {
            hasSpokenRef.current = true;
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else if (hasSpokenRef.current) {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                // Auto-stop after 1.4s of quiet
                stopRecording();
              }, 1400);
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();

      // Setup MediaRecorder
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

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        cleanupAudioStream();

        if (audioBlob.size > 100) {
          await processUserSpeech(audioBlob);
        } else {
          setTutorState('idle');
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied or error:', err);
      toast.error('No se pudo acceder al micrófono. Verifica los permisos de tu navegador.');
      cleanupAudioStream();
      setTutorState('idle');
    }
  };

  // 3. Stop Microphone Recording
  const stopRecording = (cancel = false) => {
    if (cancel) {
      audioChunksRef.current = [];
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupAudioStream();
      setTutorState('idle');
    }
  };

  // 4. Process Speech (Transcribe & Generate Streaming Response)
  const processUserSpeech = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTutorState('thinking');

    try {
      // 1. MiniMax Speech to Text
      const sttResult = await api.live.transcribe(audioBlob);
      const userText = sttResult.text?.trim();

      if (!userText) {
        toast('No alcancé a escuchar con claridad. ¿Podrías repetir?', { icon: '👂' });
        setTutorState('idle');
        setIsProcessing(false);
        return;
      }

      // Add user message
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userText,
        timestamp: new Date(),
        audioBlob,
      };

      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);

      // Now generate Guionbajo's response
      await dispatchTutorResponse(updatedHistory);
    } catch (err: any) {
      console.error('Error processing speech:', err);
      toast.error('Ocurrió un error al procesar tu audio. Inténtalo de nuevo.');
      setTutorState('idle');
      setIsProcessing(false);
    }
  };

  // 5. Text Message Fallback
  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend || textInput).trim();
    if (!text || isProcessing || isRecording) return;

    setTextInput('');
    setIsProcessing(true);
    setTutorState('thinking');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);

    await dispatchTutorResponse(updatedHistory);
  };

  // 6. Core Response Dispatch with Streaming & Audio Queue
  const dispatchTutorResponse = async (history: Message[]) => {
    // Abort any prior stream
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
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    // Setup LiveAudioStreamQueue for clause-by-clause audio pipelining
    const audioQueue = new LiveAudioStreamQueue({
      voiceId: preferredVoice || undefined,
      onAudioElementChange: (audio) => {
        setActiveAudio(audio);
      },
      onStateChange: (state) => {
        if (!isMuted) {
          setTutorState(state === 'playing' ? 'speaking' : 'idle');
        }
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
          voice_id: preferredVoice || undefined,
          signal: abortController.signal,
        },
        {
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: (msg.content + token).replace(/\[CORRECTION:[\s\S]*?\]/g, '') }
                  : msg
              )
            );
          },
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
                  } max-w-md w-full bg-brand-surface border border-brand-cyan/40 shadow-2xl rounded-2xl pointer-events-auto flex p-4 gap-3 text-white`}
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
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, content: doneData.full_text } : msg
              )
            );
            audioQueue.markStreamComplete();
            setIsProcessing(false);
          },
          onError: (err) => {
            console.warn('Stream error:', err);
            setIsProcessing(false);
            setTutorState('idle');
          },
        }
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Response dispatch error:', err);
        toast.error('Error al generar respuesta.');
      }
      setIsProcessing(false);
      setTutorState('idle');
    }
  };

  // Replay a specific message audio
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
        setTutorState('idle');
      };
      audio.play();
    } catch (e) {
      console.warn('Replay failed:', e);
      setTutorState('idle');
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col text-white">
      {/* ─── Top Navigation Bar ────────────────────────────── */}
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
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-outfit font-bold text-sm sm:text-base">
              Guionbajo Live Room
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
            title={isMuted ? 'Activar audio' : 'Silenciar audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Corrections Drawer Button */}
          <button
            onClick={() => setShowCorrections(!showCorrections)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              corrections.length > 0
                ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan shadow-sm shadow-brand-cyan/20'
                : 'glass border-brand-border text-brand-text-muted hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Feedback</span>
            <span className="px-1.5 py-0.2 rounded-full bg-brand-cyan/30 text-[10px] font-bold">
              {corrections.length}
            </span>
          </button>
        </div>
      </header>

      {/* ─── Main Content Split Layout ─────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT / CENTER: The Interactive Voice Stage */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          {/* Stage Hero: Tutor Avatar & Audio Visualizer */}
          <div className="flex flex-col items-center justify-center py-6 glass rounded-3xl border border-brand-accent/30 shadow-2xl relative overflow-hidden mb-6 bg-gradient-to-b from-brand-surface/40 to-black/60">
            {/* Ambient Background Glow */}
            <div
              className={`absolute -top-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                tutorState === 'speaking'
                  ? 'bg-brand-cyan/25 scale-125'
                  : tutorState === 'listening'
                  ? 'bg-red-500/25 scale-125'
                  : tutorState === 'thinking'
                  ? 'bg-brand-gold/20 animate-pulse'
                  : 'bg-brand-accent/10'
              }`}
            />

            {/* Mode & Status Pill */}
            <div className="flex items-center gap-3 mb-3 z-10">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-brand-border text-[11px] font-semibold text-brand-text-secondary">
                <Radio size={12} className={tutorState === 'speaking' ? 'text-brand-cyan animate-pulse' : 'text-brand-text-muted'} />
                <span>
                  {tutorState === 'speaking'
                    ? 'Guionbajo está hablando...'
                    : tutorState === 'listening'
                    ? 'Escuchándote...'
                    : tutorState === 'thinking'
                    ? 'Pensando respuesta...'
                    : 'Listo para conversar'}
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center rounded-full glass border border-brand-border p-0.5">
                <button
                  onClick={() => setInputMode('push')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    inputMode === 'push'
                      ? 'bg-brand-accent text-white shadow-sm'
                      : 'text-brand-text-muted hover:text-white'
                  }`}
                >
                  Push-to-Talk
                </button>
                <button
                  onClick={() => setInputMode('vad')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    inputMode === 'vad'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-brand-text-muted hover:text-white'
                  }`}
                >
                  Manos Libres
                </button>
              </div>
            </div>

            {/* Guionbajo 3D / SVG Animated Avatar */}
            <div className="relative z-10 my-2">
              <TutorAvatar
                state={tutorState}
                size="lg"
                audioElement={activeAudio}
              />
            </div>

            {/* Live Audio Equalizer / Waveform Display */}
            <div className="h-8 flex items-center gap-1 mt-2 z-10">
              {Array.from({ length: 18 }).map((_, idx) => {
                const dynamicHeight = isRecording
                  ? Math.max(4, Math.min(32, (micVolume * 0.4) * (Math.sin(idx + Date.now() / 200) + 1.2)))
                  : tutorState === 'speaking'
                  ? Math.max(4, Math.sin(idx * 0.5 + Date.now() / 150) * 20 + 8)
                  : 4;

                return (
                  <motion.div
                    key={idx}
                    animate={{ height: dynamicHeight }}
                    transition={{ duration: 0.08 }}
                    className={`w-1 rounded-full transition-colors ${
                      isRecording
                        ? 'bg-red-400'
                        : tutorState === 'speaking'
                        ? 'bg-brand-cyan'
                        : 'bg-brand-border/60'
                    }`}
                  />
                );
              })}
            </div>

            {/* Main Microphone Action Controller */}
            <div className="mt-5 flex flex-col items-center gap-2 z-10">
              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping pointer-events-none" />
                )}
                <button
                  onClick={isRecording ? () => stopRecording() : startRecording}
                  disabled={isProcessing}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${
                    isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600 ring-4 ring-red-400/40'
                      : isProcessing
                      ? 'bg-brand-surface text-brand-text-muted cursor-not-allowed border border-brand-border'
                      : 'bg-gradient-to-tr from-brand-accent to-brand-cyan text-white hover:scale-105 shadow-brand-accent/40'
                  }`}
                >
                  {isRecording ? (
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-sm bg-white mb-0.5" />
                      <span className="text-[9px] font-bold font-mono-custom">
                        {recordingSeconds}s
                      </span>
                    </div>
                  ) : (
                    <Mic size={32} />
                  )}
                </button>
              </div>

              <span className="text-xs font-semibold text-brand-text-secondary mt-1">
                {isRecording
                  ? inputMode === 'vad'
                    ? 'Habla con libertad... (se enviará al pausar)'
                    : 'Grabando... Pulsa para enviar'
                  : isProcessing
                  ? 'Guionbajo está respondiendo...'
                  : inputMode === 'vad'
                  ? 'Pulsa para activar modo Manos Libres'
                  : 'Pulsa el micrófono para hablar'}
              </span>
            </div>
          </div>

          {/* Quick Icebreaker Starter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            <span className="text-xs text-brand-text-muted flex items-center gap-1 shrink-0">
              <Sparkles size={12} className="text-brand-gold" /> Temas:
            </span>
            {CONVERSATION_STARTERS.map((starter, i) => (
              <button
                key={i}
                onClick={() => handleSendText(starter.prompt)}
                disabled={isProcessing || isRecording}
                className="shrink-0 text-xs px-3 py-1.5 rounded-xl glass border border-brand-border/60 hover:border-brand-cyan/60 hover:text-white text-brand-text-secondary transition-all disabled:opacity-50"
              >
                {starter.label}
              </button>
            ))}
          </div>

          {/* ─── Chat Transcript Stream ──────────────────────── */}
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
                    className={`max-w-[80%] sm:max-w-[70%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-brand-accent text-white rounded-tr-none'
                        : 'bg-brand-surface/80 border border-brand-border/60 text-white rounded-tl-none shadow-md'
                    }`}
                  >
                    <p>{msg.content}</p>

                    {/* Footer / Audio Replay */}
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
              handleSendText();
            }}
            className="flex items-center gap-2 glass rounded-2xl border border-brand-border/60 p-1.5"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="O escribe un mensaje en inglés o español..."
              disabled={isProcessing || isRecording}
              className="flex-1 bg-transparent px-3 py-1.5 text-sm text-white placeholder-brand-text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing || isRecording}
              className="p-2.5 rounded-xl bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* RIGHT: Pedagogical Feedback & Grammar Drawer (Desktop sidebar / Toggle on mobile) */}
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
                    Aún no hay errores detectados en tu conversación. Sigue practicando.
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
