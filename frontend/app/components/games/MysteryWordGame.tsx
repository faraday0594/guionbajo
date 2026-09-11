'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Volume2,
  HelpCircle,
  RotateCcw,
  Award,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Flame,
  Layers,
  Image as ImageIcon,
  BookOpen,
  FastForward,
  Play,
} from 'lucide-react';
import { playTutorVoice, stopTutorVoice, playEnglishAudio } from '@/lib/api';
import TutorAvatar, { TutorEmotion } from '@/app/components/TutorPanel/TutorAvatar';

export interface MysteryWordData {
  target_word: string;
  category?: string;
  clue_definition: string;
  clue_synonym: string;
  image_prompt?: string;
  clue_first_letter: string;
  example_sentence: string;
  example_translation: string;
  tutor_clue_speeches?: string[];
}

interface MysteryWordGameProps {
  data: MysteryWordData;
  topic: string;
  sublevel: string;
  onFinishGame: (result: {
    score: number;
    mistakes: number;
    maxStreak: number;
    won: boolean;
    data: MysteryWordData;
  }) => void;
  onSwitchGame?: () => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MAX_MISTAKES = 6;

// ── Web Audio helpers ────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

function playCorrectSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.28);
  } catch (_) { /* Audio API no disponible */ }
}

function playErrorSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.32);
  } catch (_) { /* Audio API no disponible */ }
}

function playWinSound() {
  try {
    const ctx = getAudioCtx();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.14, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.35);
    });
  } catch (_) { /* Audio API no disponible */ }
}

// ── Confetti particle data ───────────────────────────────────────
const CONFETTI_COLORS = ['#6C63FF', '#00D4FF', '#FFB627', '#34D399', '#F472B6', '#FB923C'];
function generateConfetti(count = 18) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    cx: `${(Math.random() - 0.5) * 120}px`,
    cy: `${-40 - Math.random() * 70}px`,
    cr: `${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360)}deg`,
    cd: `${Math.random() * 0.35}s`,
    w: `${5 + Math.random() * 6}px`,
    h: `${3 + Math.random() * 4}px`,
    left: `${10 + Math.random() * 80}%`,
  }));
}

// ── Bubble config ────────────────────────────────────────────────
const BUBBLES = [
  { size: 6,  left: '15%', bottom: '5%',  duration: '3.2s', delay: '0s' },
  { size: 4,  left: '30%', bottom: '10%', duration: '4.5s', delay: '0.8s' },
  { size: 8,  left: '50%', bottom: '3%',  duration: '3.8s', delay: '1.5s' },
  { size: 5,  left: '65%', bottom: '8%',  duration: '5s',   delay: '0.3s' },
  { size: 7,  left: '80%', bottom: '6%',  duration: '4.1s', delay: '2s' },
  { size: 3,  left: '42%', bottom: '15%', duration: '3s',   delay: '1s' },
];

// ── Tank Water & Submersion Calibration ─────────────────────────
// Calibrated so that each mistake level submerges the next anatomical milestone:
// 0: Dry hover above water (0%)
// 1: Thruster enters water (28%)
// 2: Lower torso submerged (45%)
// 3: CRT screen and arms submerged (60%)
// 4: Neck and chin submerged (75%)
// 5: Mouth submerged, bubbles erupt (88%)
// 6: Fully submerged / drowned (100%)
const WATER_LEVELS_PCT = [0, 28, 45, 60, 75, 88, 100];
const ROBOT_SINK_Y_PX = [0, 14, 28, 44, 62, 78, 95];

interface GuionbajoTankState {
  emotion: TutorEmotion;
  crtLabel: string;
  crtColor?: string;
  sparkBulb: boolean;
  drowned: boolean;
  meterText: string;
}

function getGuionbajoState(mistakes: number, isWon: boolean, gameOver: boolean): GuionbajoTankState {
  if (isWon) {
    return {
      emotion: 'victory',
      crtLabel: 'WIN!',
      crtColor: '#FFD700',
      sparkBulb: false,
      drowned: false,
      meterText: '¡SALVADO! SISTEMA SEGURO',
    };
  }

  if (gameOver || mistakes >= 6) {
    return {
      emotion: 'angry',
      crtLabel: 'X_X',
      crtColor: '#EF4444',
      sparkBulb: false,
      drowned: true,
      meterText: 'NIVEL 6: ¡DESBORDE TOTAL!',
    };
  }

  switch (mistakes) {
    case 0:
      return {
        emotion: 'happy',
        crtLabel: 'OK!',
        crtColor: '#00E676',
        sparkBulb: false,
        drowned: false,
        meterText: 'NIVEL 0: ESTABLE',
      };
    case 1:
      return {
        emotion: 'thinking',
        crtLabel: '? ?',
        crtColor: '#00D4FF',
        sparkBulb: false,
        drowned: false,
        meterText: 'NIVEL 1: ALERTA LEVE',
      };
    case 2:
      return {
        emotion: 'nervous',
        crtLabel: '! !',
        crtColor: '#FFB627',
        sparkBulb: false,
        drowned: false,
        meterText: 'NIVEL 2: INESTABLE',
      };
    case 3:
      return {
        emotion: 'nervous',
        crtLabel: 'WARN',
        crtColor: '#FB923C',
        sparkBulb: false,
        drowned: false,
        meterText: 'NIVEL 3: ADVERTENCIA',
      };
    case 4:
      return {
        emotion: 'angry',
        crtLabel: 'SOS',
        crtColor: '#FF5252',
        sparkBulb: true,
        drowned: false,
        meterText: 'NIVEL 4: PELIGRO ALTO',
      };
    case 5:
      return {
        emotion: 'angry',
        crtLabel: 'HELP',
        crtColor: '#FFFFFF',
        sparkBulb: true,
        drowned: false,
        meterText: 'NIVEL 5: ¡CRÍTICO!',
      };
    default:
      return {
        emotion: 'angry',
        crtLabel: 'X_X',
        crtColor: '#EF4444',
        sparkBulb: false,
        drowned: true,
        meterText: 'NIVEL 6: ¡DESBORDE!',
      };
  }
}

export default function MysteryWordGame({
  data,
  topic,
  sublevel,
  onFinishGame,
  onSwitchGame,
}: MysteryWordGameProps) {
  const targetWord = (data?.target_word || 'ENGLISH').toUpperCase().replace(/[^A-Z]/g, '');

  // ── Core game state ──────────────────────────────────────────
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [unlockedTier, setUnlockedTier] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [loadingAiImage, setLoadingAiImage] = useState(false);

  // ── New improvement states ───────────────────────────────────
  /** Letter that just flashed green — cleared after animation */
  const [flashLetter, setFlashLetter] = useState<string | null>(null);
  /** Trigger scared emoji jump on error */
  const [isScared, setIsScared] = useState(false);
  /** Show splash particle on water rise */
  const [showSplash, setShowSplash] = useState(false);
  /** Win confetti particles */
  const [confettiParticles, setConfettiParticles] = useState<ReturnType<typeof generateConfetti>>([]);

  // ── Linearity & Speech Control ───────────────────────────────
  const [tutorSpeaking, setTutorSpeaking] = useState(false);
  const [tutorSpeechText, setTutorSpeechText] = useState('Preparando palabra misteriosa...');
  const [gameStarted, setGameStarted] = useState(false);

  const tankRef = useRef<HTMLDivElement>(null);
  const isComponentMountedRef = useRef(true);
  const speechAbortControllerRef = useRef<boolean>(false);
  /** FIX #2: timeout ID to force-unlock teclado si la voz falla */
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived values ───────────────────────────────────────────
  const currentWaterPct = isWon ? 0 : WATER_LEVELS_PCT[Math.min(mistakes, 6)];
  const currentSinkY = isWon ? -20 : ROBOT_SINK_Y_PX[Math.min(mistakes, 6)];
  const robotState = getGuionbajoState(mistakes, isWon, gameOver);
  const isDanger = mistakes >= 4;

  // ── 1. Speak helper — FIX #2: timeout fallback ──────────────
  const speakTutor = useCallback(async (text: string) => {
    if (!text || !isComponentMountedRef.current) return;
    speechAbortControllerRef.current = false;
    setTutorSpeaking(true);
    setTutorSpeechText(text);

    // Safety net: always unlock keyboard after 12 seconds max
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      if (isComponentMountedRef.current) setTutorSpeaking(false);
    }, 12000);

    try {
      await playTutorVoice(text, 'es');
    } catch (err) {
      console.warn('Mystery Word voice error:', err);
    } finally {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (isComponentMountedRef.current) setTutorSpeaking(false);
    }
  }, []);

  // Skip ongoing voice
  const handleSkipVoice = () => {
    speechAbortControllerRef.current = true;
    stopTutorVoice();
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    setTutorSpeaking(false);
  };

  // ── 2. Start game ────────────────────────────────────────────
  const handleStartGame = useCallback(async () => {
    setGameStarted(true);
    const welcomeMsg = `¡Bienvenido a la Palabra Misteriosa! Tienes una palabra de ${targetWord.length} letras sobre ${topic}. Adivina las letras antes de que el tanque se llene. ¡Si fallas, te daré pistas para ayudarte!`;
    await speakTutor(welcomeMsg);
  }, [targetWord.length, topic, speakTutor]);

  useEffect(() => {
    isComponentMountedRef.current = true;
    const timer = setTimeout(() => { handleStartGame(); }, 400);
    return () => {
      isComponentMountedRef.current = false;
      stopTutorVoice();
      clearTimeout(timer);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, [handleStartGame]);

  // ── 3. Tank shake trigger ────────────────────────────────────
  const triggerReflowShake = () => {
    setIsShaking(true);
    if (tankRef.current) void tankRef.current.offsetWidth;
    setTimeout(() => {
      if (isComponentMountedRef.current) setIsShaking(false);
    }, 650);
  };

  // ── 4. Scared emoji (NEW) ────────────────────────────────────
  const triggerScare = useCallback(() => {
    setIsScared(true);
    setTimeout(() => {
      if (isComponentMountedRef.current) setIsScared(false);
    }, 600);
  }, []);

  // ── 5. Splash particle (NEW) ─────────────────────────────────
  const triggerSplash = useCallback(() => {
    setShowSplash(true);
    setTimeout(() => {
      if (isComponentMountedRef.current) setShowSplash(false);
    }, 800);
  }, []);

  // ── 6. Clue tier unlocker ────────────────────────────────────
  const unlockClueTier = useCallback(async (tier: number, currentUnlocked: number) => {
    if (tier > currentUnlocked && tier <= 4) {
      setUnlockedTier(tier);

      // Tier 3: Fetch AI Illustration
      if (tier >= 3 && !aiImageUrl && !loadingAiImage && data.image_prompt) {
        generateIllustration(data.image_prompt);
      }

      let speech = '';
      if (tier === 1) {
        speech = `¡Primera pista! Revisa la definición: ${data.clue_definition}`;
      } else if (tier === 2) {
        speech = `Segunda pista: Observa los sinónimos y familia léxica en pantalla.`;
      } else if (tier === 3) {
        speech = `Tercera pista: Observa la ilustración visual que acabo de crear para ti.`;
      } else {
        speech = `Pista de auxilio final: ${data.clue_first_letter}`;
      }

      await speakTutor(speech);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiImageUrl, loadingAiImage, data, speakTutor]);

  // ── 7. Image generator (tier 3) ──────────────────────────────
  const generateIllustration = async (prompt: string) => {
    setLoadingAiImage(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspect_ratio: '1:1' }),
      });
      const json = await res.json();
      if (json.success && json.url && isComponentMountedRef.current) {
        setAiImageUrl(json.url);
      }
    } catch (e) {
      console.warn('AI image gen error for clue:', e);
    } finally {
      if (isComponentMountedRef.current) setLoadingAiImage(false);
    }
  };

  // ── 8. Win handler ───────────────────────────────────────────
  const handleGameWin = useCallback(async (finalScore: number) => {
    setIsWon(true);
    setGameOver(true);
    // FIX #3: single setScore here, removed the redundant one in handleLetterClick
    setScore(finalScore);
    setConfettiParticles(generateConfetti(22));
    playWinSound();
    const winMsg = `¡Increíble! Adivinaste la palabra "${targetWord}". ¡Has salvado el tanque de agua y dominado el vocabulario!`;
    await speakTutor(winMsg);
  }, [targetWord, speakTutor]);

  // ── 9. Loss handler ──────────────────────────────────────────
  const handleGameOver = useCallback(async () => {
    setGameOver(true);
    setIsWon(false);
    const lossMsg = `¡El tanque se ha llenado! La palabra misteriosa era "${targetWord}". ¡Revisemos las pistas para consolidar el aprendizaje!`;
    await speakTutor(lossMsg);
  }, [targetWord, speakTutor]);

  // ── 10. Letter click — FIX #1: wrapped in useCallback ───────
  const handleLetterClick = useCallback(async (letter: string) => {
    if (gameOver || guessedLetters.has(letter) || tutorSpeaking) return;

    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);

    const isMatch = targetWord.includes(letter);

    if (isMatch) {
      playCorrectSound();
      // Flash the newly revealed tile
      setFlashLetter(letter);
      setTimeout(() => {
        if (isComponentMountedRef.current) setFlashLetter(null);
      }, 560);

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      // FIX #3: only accumulate here, pass final to handleGameWin
      const pointsEarned = 100 + (newStreak > 1 ? (newStreak - 1) * 50 : 0);
      const updatedScore = score + pointsEarned;

      const allLettersFound = targetWord.split('').every((char) => newGuessed.has(char));
      if (allLettersFound) {
        await handleGameWin(updatedScore + 300);
      } else {
        setScore(updatedScore);
      }
    } else {
      // Wrong letter
      playErrorSound();
      setStreak(0);
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      triggerReflowShake();
      triggerScare();
      triggerSplash();

      if (newMistakes >= MAX_MISTAKES) {
        await handleGameOver();
      } else {
        // FIX #4: pass current unlockedTier explicitly to avoid stale closure
        await unlockClueTier(newMistakes, unlockedTier);
      }
    }
  }, [
    gameOver, guessedLetters, tutorSpeaking, targetWord,
    streak, maxStreak, score, mistakes, unlockedTier,
    handleGameWin, handleGameOver, unlockClueTier,
    triggerScare, triggerSplash,
  ]);

  // ── 11. Physical keyboard listener — FIX #1 ─────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || tutorSpeaking) return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) handleLetterClick(key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, tutorSpeaking, handleLetterClick]);

  // ── 12. Word audio (Jenny Neural HD) ───────────────────────────
  const playWordAudio = (word: string) => {
    if (!word) return;
    playEnglishAudio(word);
  };


  // ── Framer animate values for water ─────────────────────────
  // FIX VISUAL: background moved into `animate` so Framer interpolates color
  const waterColors = isDanger
    ? { background: 'linear-gradient(180deg, rgba(239,68,68,0.75) 0%, rgba(185,28,28,0.95) 100%)' }
    : { background: 'linear-gradient(180deg, rgba(0,212,255,0.65) 0%, rgba(108,99,255,0.9) 100%)' };

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 text-white pb-10">

      {/* ── Top HUD: Category, Topic, Score, Streak ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass border border-brand-border/60 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-cyan to-brand-accent flex items-center justify-center shadow-lg shadow-brand-cyan/20">
            <Sparkles size={20} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">
                {data.category || 'Palabra Misteriosa'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-brand-surface text-brand-text-muted text-[10px] font-mono border border-white/10">
                {sublevel}
              </span>
            </div>
            <h2 className="text-lg font-outfit font-extrabold text-white">Mystery Word Tank</h2>
          </div>
        </div>

        {/* Score & Streak */}
        <div className="flex items-center gap-4">
          <motion.div
            key={score}
            initial={{ scale: 1.25, color: '#FFD700' }}
            animate={{ scale: 1, color: '#FFB627' }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-surface/80 border border-brand-gold/30 text-brand-gold"
          >
            <Award size={16} />
            <span className="text-sm font-extrabold font-mono">{score} pts</span>
          </motion.div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
            streak > 1
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 flame-streak'
              : 'bg-brand-surface/60 border-white/10 text-brand-text-muted'
          }`}>
            <Flame size={16} className={streak > 1 ? 'text-amber-400 animate-bounce' : ''} />
            <span className="text-xs font-bold">Racha: x{streak}</span>
          </div>
        </div>
      </div>

      {/* ── Tutor Speaking Banner ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl glass border border-brand-cyan/30 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            tutorSpeaking ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40' : 'bg-brand-surface text-brand-text-muted'
          }`}>
            <Volume2 size={16} className={tutorSpeaking ? 'animate-pulse text-brand-gold' : ''} />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase font-bold text-brand-cyan">
              {tutorSpeaking ? 'Tutor Explicando en Vivo' : 'Tutor en Espera'}
            </div>
            <p className="text-xs text-white/90 italic truncate">{tutorSpeechText}</p>
          </div>
        </div>

        {tutorSpeaking && (
          <button
            type="button"
            onClick={handleSkipVoice}
            className="px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-brand-accent text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5 flex-shrink-0"
            title="Saltar voz y habilitar teclado inmediatamente"
          >
            <FastForward size={13} />
            <span>Saltar Voz</span>
          </button>
        )}
      </div>

      {/* ── Main Arena ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── 1. Reactive Water Tank ── */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div
            ref={tankRef}
            className={`relative w-full max-w-[280px] h-[360px] rounded-3xl overflow-hidden border-4 transition-all duration-500 flex flex-col justify-end bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 shadow-2xl ${
              isDanger ? 'tank-danger-glow border-red-500' : 'border-brand-cyan/40'
            } ${isShaking ? 'tank-shake' : ''}`}
          >
            {/* ── Layer 1: Background Infrastructure (Pipes, Depth Grid) ── */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#6C63FF_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

            {/* ── Layer 2: Robot Guionbajo (TutorAvatar) with progressive sinking & reactions ── */}
            <motion.div
              className="absolute inset-x-0 top-7 flex flex-col items-center justify-start pointer-events-none z-10"
              animate={
                isScared
                  ? {
                      y: currentSinkY - 14,
                      scale: 1.12,
                      rotate: [-2, 3, -3, 2, 0],
                    }
                  : isWon
                  ? {
                      y: currentSinkY,
                      scale: 1.08,
                      rotate: 0,
                    }
                  : mistakes >= 5
                  ? {
                      y: [currentSinkY - 2, currentSinkY + 3, currentSinkY - 2],
                      rotate: [-2.5, 2.5, -2.5],
                    }
                  : mistakes >= 3
                  ? {
                      y: [currentSinkY - 1.5, currentSinkY + 2, currentSinkY - 1.5],
                      rotate: [-1.5, 1.5, -1.5],
                    }
                  : {
                      y: [currentSinkY - 2, currentSinkY + 2, currentSinkY - 2],
                      rotate: 0,
                    }
              }
              transition={
                isScared
                  ? { duration: 0.55, ease: 'easeOut' }
                  : isWon
                  ? { duration: 0.8, type: 'spring' }
                  : { duration: mistakes >= 4 ? 0.35 : 2.4, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <div className="relative">
                <TutorAvatar
                  size="md"
                  emotion={robotState.emotion}
                  crtLabel={robotState.crtLabel}
                  crtColor={robotState.crtColor}
                  sparkBulb={robotState.sparkBulb}
                  drowned={robotState.drowned}
                  state={tutorSpeaking ? 'speaking' : 'idle'}
                  text={tutorSpeechText}
                />

                {/* Mouth Bubbles Emitter (activates when mouth is submerged: mistakes >= 5) */}
                {mistakes >= 5 && !robotState.drowned && (
                  <div className="absolute top-[70px] left-1/2 -translate-x-1/2 pointer-events-none">
                    <span className="mouth-bubble" style={{ width: 8, height: 8, left: -5, animationDelay: '0s' }} />
                    <span className="mouth-bubble" style={{ width: 6, height: 6, left: 3, animationDelay: '0.4s' }} />
                    <span className="mouth-bubble" style={{ width: 10, height: 10, left: -1, animationDelay: '0.85s' }} />
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── Layer 3: Dynamic Rising Water (In Front of Guionbajo!) ── */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 w-full z-20 overflow-hidden pointer-events-none"
              animate={{
                height: `${currentWaterPct}%`,
                ...waterColors,
              }}
              style={{
                backdropFilter: currentWaterPct > 0 ? 'blur(1.5px)' : 'none',
                WebkitBackdropFilter: currentWaterPct > 0 ? 'blur(1.5px)' : 'none',
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 85, background: { duration: 0.8 } }}
            >
              {/* Glowing Water Surface Wave Crest (Top edge line of the water) */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-white to-cyan-400 shadow-[0_0_12px_#00D4FF] water-surface-glow z-30" />

              {/* Splash particle on level rise */}
              {showSplash && (
                <span
                  className="splash-drop"
                  style={{ width: 12, height: 12, left: `${35 + Math.random() * 30}%` }}
                />
              )}

              {/* Wave 1 — left to right */}
              <div className="absolute -top-6 left-0 w-[200%] h-8 opacity-75 animate-wave-motion">
                <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-current text-cyan-300">
                  <path d="M0,0 C150,90 350,-40 500,50 C650,140 900,10 1200,40 L1200,120 L0,120 Z" />
                </svg>
              </div>

              {/* Wave 2 — right to left (counter-wave) */}
              <div className="absolute -top-4 left-0 w-[200%] h-8 opacity-45 animate-wave-reverse">
                <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-current text-blue-200">
                  <path d="M0,0 C200,70 400,-20 600,60 C800,120 1000,20 1200,50 L1200,120 L0,120 Z" />
                </svg>
              </div>

              {/* Wave 3 — slow baseline */}
              <div className="absolute -top-2 left-0 w-[200%] h-6 opacity-25 animate-wave-motion-slow">
                <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-current text-white">
                  <path d="M0,20 C300,80 600,-10 900,50 C1050,80 1150,40 1200,30 L1200,120 L0,120 Z" />
                </svg>
              </div>

              {/* Underwater Bubbles */}
              {currentWaterPct > 10 && BUBBLES.map((b, i) => (
                <span
                  key={i}
                  className="bubble"
                  style={{
                    width: b.size,
                    height: b.size,
                    left: b.left,
                    bottom: b.bottom,
                    '--bubble-duration': b.duration,
                    '--bubble-delay': b.delay,
                  } as React.CSSProperties}
                />
              ))}

              {/* Water level percentage text */}
              <div className="w-full h-full flex items-end justify-center pb-3 relative">
                <span className="text-3xl font-extrabold font-mono text-white/20 select-none">
                  {Math.round(currentWaterPct)}%
                </span>
              </div>
            </motion.div>

            {/* ── Layer 4: Glass measurements overlay & Danger Meter ── */}
            <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3.5">
              <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                <span className={isDanger ? 'text-red-400 animate-pulse' : 'text-brand-cyan'}>
                  {robotState.meterText}
                </span>
                <span className={isDanger ? 'text-red-400 font-extrabold' : 'text-brand-cyan/80'}>
                  {mistakes}/{MAX_MISTAKES} FALLOS
                </span>
              </div>

              <div className="w-full space-y-7 border-l-2 border-dashed border-white/20 pl-2">
                <div className="text-[9px] font-mono text-red-400/80 font-bold">- NIVEL 6 (DESBORDE / AHOGADO)</div>
                <div className="text-[9px] font-mono text-amber-400/80 font-bold">- NIVEL 4 (PELIGRO / CUELLO)</div>
                <div className="text-[9px] font-mono text-cyan-400/80 font-bold">- NIVEL 2 (PROPULSOR SUMERGIDO)</div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-white/60 tracking-wider uppercase">
                <span>Tanque Guionbajo</span>
                <span className="text-[9px] font-mono text-white/40">HIDRÁULICO IA</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-text-secondary">
            <AlertTriangle size={14} className={isDanger ? 'text-red-400 animate-pulse' : 'text-brand-cyan'} />
            <span>{MAX_MISTAKES - mistakes} errores restantes antes de perder</span>
          </div>
        </div>

        {/* ── 2. Word Tiles & 4-Tier Clue System ── */}
        <div className="lg:col-span-7 flex flex-col gap-5">

          {/* Letter Tiles */}
          <div className="p-6 rounded-3xl glass border border-brand-border/60 flex flex-col items-center gap-4 shadow-2xl">
            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">
              Palabra Oculta ({targetWord.length} Letras)
            </span>

            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 py-2">
              {targetWord.split('').map((letter, idx) => {
                const isGuessed = guessedLetters.has(letter) || gameOver;
                const isFlashing = flashLetter === letter;

                return (
                  <div key={idx} className="relative">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`w-11 h-14 sm:w-13 sm:h-16 rounded-2xl flex items-center justify-center font-outfit text-2xl sm:text-3xl font-extrabold border-2 transition-all duration-300 shadow-lg ${
                        isFlashing
                          ? 'bg-emerald-500/30 border-emerald-300 text-emerald-200 tile-correct-flash'
                          : isGuessed
                          ? isWon
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-emerald-500/20'
                            : 'bg-brand-surface border-brand-cyan text-white shadow-brand-cyan/30'
                          : 'bg-brand-surface/40 border-dashed border-white/20 text-transparent'
                      }`}
                    >
                      {isGuessed ? letter : ''}
                    </motion.div>

                    {/* Win confetti burst per tile */}
                    {isWon && confettiParticles.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none overflow-visible">
                        {confettiParticles.slice(0, 3).map((p) => (
                          <span
                            key={`${idx}-${p.id}`}
                            className="confetti-particle"
                            style={{
                              '--cx': p.cx,
                              '--cy': p.cy,
                              '--cr': p.cr,
                              '--cd': `${parseFloat(p.cd) + idx * 0.04}s`,
                              width: p.w,
                              height: p.h,
                              background: p.color,
                              left: p.left,
                              top: '50%',
                            } as React.CSSProperties}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {(isWon || gameOver) && (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => playWordAudio(targetWord)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-cyan/20 border border-brand-cyan/50 text-brand-cyan hover:bg-brand-cyan/30 font-semibold text-xs transition-all hover:scale-105"
              >
                <Volume2 size={15} />
                <span>Escuchar Pronunciación en Inglés</span>
              </motion.button>
            )}
          </div>

          {/* 4-Tier Clue System */}
          <div className="p-5 rounded-3xl glass border border-brand-border/60 flex flex-col gap-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-brand-gold animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Pistas Desbloqueadas ({unlockedTier}/4)
                </h3>
              </div>
              <span className="text-[11px] text-brand-text-muted font-medium">
                Se revelan automáticamente al equivocarte
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Tier 1 */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                unlockedTier >= 1
                  ? 'bg-blue-500/15 border-blue-500/50 text-blue-100 shadow-lg shadow-blue-500/10'
                  : 'bg-brand-surface/30 border-white/5 opacity-50'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={14} className={unlockedTier >= 1 ? 'text-blue-400' : 'text-white/30'} />
                    1. Definición Pedagógica
                  </span>
                  {unlockedTier >= 1 ? <CheckCircle2 size={14} className="text-emerald-400" /> : <span className="text-[10px] text-white/40">1º Fallo</span>}
                </div>
                {unlockedTier >= 1 ? (
                  <p className="text-xs leading-relaxed text-blue-200">{data.clue_definition}</p>
                ) : (
                  <p className="text-xs text-white/30 italic">Comete un fallo para desbloquear la definición.</p>
                )}
              </div>

              {/* Tier 2 */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                unlockedTier >= 2
                  ? 'bg-purple-500/15 border-purple-500/50 text-purple-100 shadow-lg shadow-purple-500/10'
                  : 'bg-brand-surface/30 border-white/5 opacity-50'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className={unlockedTier >= 2 ? 'text-purple-400' : 'text-white/30'} />
                    2. Sinónimos & Familia Léxica
                  </span>
                  {unlockedTier >= 2 ? <CheckCircle2 size={14} className="text-emerald-400" /> : <span className="text-[10px] text-white/40">2º Fallo</span>}
                </div>
                {unlockedTier >= 2 ? (
                  <p className="text-xs leading-relaxed text-purple-200">{data.clue_synonym}</p>
                ) : (
                  <p className="text-xs text-white/30 italic">Revelará la familia léxica y colocaciones.</p>
                )}
              </div>

              {/* Tier 3 */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                unlockedTier >= 3
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-100 shadow-lg shadow-amber-500/10'
                  : 'bg-brand-surface/30 border-white/5 opacity-50'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon size={14} className={unlockedTier >= 3 ? 'text-amber-400' : 'text-white/30'} />
                    3. Ilustración Visual Didáctica
                  </span>
                  {unlockedTier >= 3 ? <CheckCircle2 size={14} className="text-emerald-400" /> : <span className="text-[10px] text-white/40">3º Fallo</span>}
                </div>
                {unlockedTier >= 3 ? (
                  <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
                    {aiImageUrl ? (
                      <img
                        src={aiImageUrl}
                        alt="Pista visual de la palabra misteriosa"
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-amber-400/40 shadow-md"
                      />
                    ) : loadingAiImage ? (
                      <div className="w-24 h-24 rounded-xl bg-amber-500/20 flex items-center justify-center text-xs text-amber-300 animate-pulse border border-amber-400/30">
                        Generando imagen...
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-brand-surface flex items-center justify-center text-3xl border border-white/10">
                        🎨
                      </div>
                    )}
                    <p className="text-xs text-amber-200/90 leading-relaxed flex-1">
                      {data.image_prompt ? data.image_prompt.replace(/no text.*$/i, '').trim() : 'Ilustración conceptual del concepto.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-white/30 italic">Desbloqueará una ilustración visual.</p>
                )}
              </div>

              {/* Tier 4 */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                unlockedTier >= 4
                  ? 'bg-rose-500/15 border-rose-500/50 text-rose-100 shadow-lg shadow-rose-500/10'
                  : 'bg-brand-surface/30 border-white/5 opacity-50'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <HelpCircle size={14} className={unlockedTier >= 4 ? 'text-rose-400' : 'text-white/30'} />
                    4. Pista de Auxilio Final
                  </span>
                  {unlockedTier >= 4 ? <CheckCircle2 size={14} className="text-emerald-400" /> : <span className="text-[10px] text-white/40">4º Fallo</span>}
                </div>
                {unlockedTier >= 4 ? (
                  <p className="text-xs font-bold leading-relaxed text-rose-200">{data.clue_first_letter}</p>
                ) : (
                  <p className="text-xs text-white/30 italic">Último salvavidas con la letra inicial.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Virtual Keyboard ── */}
      <div className="p-5 rounded-3xl glass border border-brand-border/60 flex flex-col items-center gap-3 shadow-2xl">
        <div className="flex items-center justify-between w-full max-w-2xl px-2">
          <span className="text-xs font-bold text-brand-text-muted uppercase">
            {tutorSpeaking ? '⏳ Escucha al tutor...' : '🎯 Selecciona una letra'}
          </span>
          <span className="text-xs text-brand-cyan font-medium">Puedes usar tu teclado físico</span>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-13 gap-1.5 sm:gap-2 w-full max-w-3xl justify-center">
          {ALPHABET.map((letter) => {
            const isGuessed = guessedLetters.has(letter);
            const isCorrect = isGuessed && targetWord.includes(letter);
            const isWrong = isGuessed && !targetWord.includes(letter);

            return (
              <motion.button
                key={letter}
                type="button"
                disabled={isGuessed || gameOver || tutorSpeaking}
                onClick={() => handleLetterClick(letter)}
                whileTap={!isGuessed && !gameOver && !tutorSpeaking ? { scale: 0.88 } : {}}
                whileHover={!isGuessed && !gameOver && !tutorSpeaking ? { scale: 1.1, y: -2 } : {}}
                className={`h-11 sm:h-12 rounded-xl font-outfit text-sm sm:text-base font-extrabold transition-colors duration-150 flex items-center justify-center shadow-md ${
                  isCorrect
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-95'
                    : isWrong
                    ? 'bg-slate-800 text-white/20 border border-white/5 cursor-not-allowed opacity-40'
                    : tutorSpeaking
                    ? 'bg-brand-surface/50 text-white/40 border border-white/10 cursor-not-allowed'
                    : 'bg-brand-surface text-white border border-brand-border/60'
                }`}
              >
                {letter}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Win / Game Over Action Bar ── */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="p-6 rounded-3xl glass border-2 border-brand-accent shadow-[0_0_50px_rgba(108,99,255,0.4)] flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl ${
                isWon ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}>
                {isWon ? '🏆' : '💡'}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-outfit font-extrabold text-white">
                  {isWon ? '¡Misión Cumplida! Palabra Resuelta' : '¡Fin de la Partida! Sigue Practicando'}
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  Palabra objetivo: <strong className="text-brand-cyan">{targetWord}</strong> | Puntaje final: <strong className="text-brand-gold">{score} pts</strong>
                </p>
                {/* FIX #5: fixed literal quotes */}
                {data.example_sentence && (
                  <p className="text-xs text-brand-text-muted mt-1 italic">
                    &ldquo;{data.example_sentence}&rdquo; &mdash; {data.example_translation}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {onSwitchGame && (
                <button
                  type="button"
                  onClick={onSwitchGame}
                  className="px-4 py-2.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Jugar Cartas Gemelas</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onFinishGame({ score, mistakes, maxStreak, won: isWon, data });
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-accent to-brand-cyan hover:opacity-90 text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-brand-accent/30 flex items-center gap-2 hover:scale-105"
              >
                <Award size={16} />
                <span>Ver Cierre Pedagógico & XP</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
