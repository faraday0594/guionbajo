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
  Lock,
  RefreshCw,
  X,
  Maximize2,
} from 'lucide-react';
import { playTutorVoice, stopTutorVoice, playEnglishAudio, api } from '@/lib/api';
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

function playElectricZapSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch (_) { /* Audio API no disponible */ }
}

function playBubbleSound(count = 6) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const baseTime = ctx.currentTime;
    for (let i = 0; i < count; i++) {
      const startTime = baseTime + i * 0.085 + Math.random() * 0.03;
      const duration = 0.11 + Math.random() * 0.04;

      // 1. Primary bubble cavity oscillator (sine sweep rising rapidly)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';

      const startFreq = 340 + Math.random() * 160;
      const endFreq = startFreq + 600 + Math.random() * 450;

      osc1.frequency.setValueAtTime(startFreq, startTime);
      osc1.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration * 0.85);

      gain1.gain.setValueAtTime(0.001, startTime);
      gain1.gain.linearRampToValueAtTime(0.42, startTime + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(startTime);
      osc1.stop(startTime + duration + 0.02);

      // 2. Secondary resonant plop sub-oscillator (adds acoustic liquid body)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';

      const subStartFreq = 180 + Math.random() * 50;
      osc2.frequency.setValueAtTime(subStartFreq, startTime);
      osc2.frequency.exponentialRampToValueAtTime(subStartFreq * 0.6, startTime + duration * 0.6);

      gain2.gain.setValueAtTime(0.001, startTime);
      gain2.gain.linearRampToValueAtTime(0.24, startTime + 0.012);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.7);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(startTime);
      osc2.stop(startTime + duration + 0.02);
    }
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

// ── Tank Water & Submersion Calibration (Strict User Specification) ────
// 0: Dry (0%) - Guionbajo feliz, flotando tranquilo
// 1: Agua un poco abajo de Guionbajo (18%) - Se ve un poco preocupado
// 2: Agua casi a la mitad de su tamaño (30%) - Más preocupado
// 3: Sube más el agua (40%) - Muy preocupado, rayos de corto circuito
// 4: Tapado hasta el cuello, justo antes de la boca (49%) - Desesperado, rayos, manos sumergidas
// 5: Tapado por completo (88%) - Burbujas continuas, sonido burbujas, sumergido total, NO habla
// 6: Totalmente tapado / tanque 100% - Drowned X_X, inerte al fondo, NO habla
const WATER_LEVELS_PCT = [0, 18, 30, 40, 49, 88, 100];
const ROBOT_SINK_Y_PX = [0, 1, 2, 3, 5, 14, 42];
const ROBOT_SINK_Y_PX_SM = [0, 0, 1, 2, 3, 8, 24];

interface GuionbajoTankState {
  emotion: TutorEmotion;
  crtLabel: string;
  crtColor?: string;
  sparkBulb: boolean;
  drowned: boolean;
}

function getGuionbajoState(mistakes: number, isWon: boolean, gameOver: boolean): GuionbajoTankState {
  if (isWon) {
    return {
      emotion: 'happy',
      crtLabel: 'WIN!',
      crtColor: '#00E676',
      sparkBulb: false,
      drowned: false,
    };
  }

  if (gameOver || mistakes >= 6) {
    return {
      emotion: 'angry',
      crtLabel: 'X_X',
      crtColor: '#EF4444',
      sparkBulb: false,
      drowned: true,
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
      };
    case 1:
      return {
        emotion: 'thinking',
        crtLabel: '?!',
        crtColor: '#00D4FF',
        sparkBulb: false,
        drowned: false,
      };
    case 2:
      return {
        emotion: 'nervous',
        crtLabel: 'WARN',
        crtColor: '#FFB627',
        sparkBulb: false,
        drowned: false,
      };
    case 3:
      return {
        emotion: 'nervous',
        crtLabel: 'ERR!',
        crtColor: '#FB923C',
        sparkBulb: true,
        drowned: false,
      };
    case 4:
      return {
        emotion: 'angry',
        crtLabel: 'SOS',
        crtColor: '#FF5252',
        sparkBulb: true,
        drowned: false,
      };
    case 5:
      return {
        emotion: 'angry',
        crtLabel: '*GLUB*',
        crtColor: '#00D4FF',
        sparkBulb: true,
        drowned: false,
      };
    default:
      return {
        emotion: 'angry',
        crtLabel: 'X_X',
        crtColor: '#EF4444',
        sparkBulb: false,
        drowned: true,
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
  const [mobileSelectedTier, setMobileSelectedTier] = useState<number>(1);
  const [selectedDesktopTier, setSelectedDesktopTier] = useState<number>(1);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

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
  const isGeneratingImageRef = useRef(false);
  const preGeneratedWordRef = useRef<string | null>(null);

  const isWonRef = useRef(isWon);
  isWonRef.current = isWon;
  const mistakesRef = useRef(mistakes);
  mistakesRef.current = mistakes;
  const gameOverRef = useRef(gameOver);
  gameOverRef.current = gameOver;

  // ── Derived values ───────────────────────────────────────────
  const currentWaterPct = isWon ? 0 : WATER_LEVELS_PCT[Math.min(mistakes, 6)];
  const currentSinkY = isWon ? -20 : ROBOT_SINK_Y_PX[Math.min(mistakes, 6)];
  const currentSinkYMobile = isWon ? -12 : ROBOT_SINK_Y_PX_SM[Math.min(mistakes, 6)];
  const robotState = getGuionbajoState(mistakes, isWon, gameOver);
  const isDanger = !isWon && mistakes >= 4;

  // ── 1. Speak helper — Muted underwater, but ALWAYS speaks when saved (isWon) ────────
  const speakTutor = useCallback(async (text: string) => {
    if (!text || !isComponentMountedRef.current) return;
    if (!isWonRef.current && (mistakesRef.current >= 5 || gameOverRef.current)) return;
    speechAbortControllerRef.current = false;
    setTutorSpeaking(true);
    setTutorSpeechText(text);

    // Safety net: scale timeout to words count so long speech is never cut off
    const words = text.split(/\s+/).filter(Boolean).length;
    const safetyMs = Math.max(words * 750, 18000);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      if (isComponentMountedRef.current) setTutorSpeaking(false);
    }, safetyMs);

    try {
      await playTutorVoice(text, 'es');
    } catch (err) {
      console.warn('Mystery Word voice error:', err);
    } finally {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (isComponentMountedRef.current) setTutorSpeaking(false);
    }
  }, []);

  // Periodic bubble sound effect while completely submerged on error 5
  useEffect(() => {
    if (mistakes === 5 && !gameOver && !isWon) {
      playBubbleSound(5);
      const interval = setInterval(() => {
        if (isComponentMountedRef.current) {
          playBubbleSound(4);
        }
      }, 2400);
      return () => clearInterval(interval);
    }
  }, [mistakes, gameOver, isWon]);

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

  // ── 6. Image generator (tier 3) ──────────────────────────────
  const generateIllustration = useCallback(async (promptOverride?: string) => {
    if (isGeneratingImageRef.current && !promptOverride) return;
    isGeneratingImageRef.current = true;
    setLoadingAiImage(true);

    let rawPrompt = promptOverride || data.image_prompt || '';
    if (!rawPrompt && data.clue_definition) {
      rawPrompt = `Pedagogical conceptual illustration representing: ${data.clue_definition}`;
    } else if (!rawPrompt) {
      rawPrompt = `Educational illustration representing a vocabulary concept in ${data.category || topic}`;
    }

    // Strictly mask secret target word so it never appears in image prompt or generated visual
    if (data.target_word) {
      const escaped = data.target_word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rawPrompt = rawPrompt.replace(new RegExp(escaped, 'gi'), 'the secret item');
    }

    const prompt =
      rawPrompt.replace(/no text.*$/i, '').trim() +
      ', 2D vector flat educational illustration, clean vector art, vibrant colors, strictly no text, no letters, no words, no writing, no labels, 1:1 aspect ratio';

    try {
      const res = await api.generateImage(prompt, '1:1');
      const imgUrl = res?.url || res?.image_url;
      if (imgUrl && isComponentMountedRef.current) {
        setAiImageUrl(imgUrl);
      }
    } catch (e) {
      console.warn('MiniMax image gen error for clue:', e);
    } finally {
      isGeneratingImageRef.current = false;
      if (isComponentMountedRef.current) setLoadingAiImage(false);
    }
  }, [data.image_prompt, data.clue_definition, data.target_word, data.category, topic]);

  // Pre-generate MiniMax clue image silently in the background as soon as target_word is set
  useEffect(() => {
    if (data?.target_word && preGeneratedWordRef.current !== data.target_word) {
      preGeneratedWordRef.current = data.target_word;
      setAiImageUrl(null);
      generateIllustration();
    }
  }, [data?.target_word, generateIllustration]);

  // ── 7. Clue tier unlocker ────────────────────────────────────
  const unlockClueTier = useCallback(async (tier: number, currentUnlocked: number) => {
    if (tier > currentUnlocked && tier <= 4) {
      setUnlockedTier(tier);
      setMobileSelectedTier(tier);
      setSelectedDesktopTier(tier);

      // Tier 3: Fetch AI Illustration if not already ready/generating
      if (tier >= 3 && !aiImageUrl && !isGeneratingImageRef.current) {
        generateIllustration();
      }

      let speech = '';
      if (tier === 1) {
        speech = `¡Primera pista! Revisa la definición: ${data.clue_definition}`;
      } else if (tier === 2) {
        speech = `Segunda pista: Observa los sinónimos y familia léxica en pantalla.`;
      } else if (tier === 3) {
        speech = `Tercera pista: Observa la ilustración visual que preparé para ti.`;
      } else {
        speech = `Pista de auxilio final: ${data.clue_first_letter}`;
      }

      await speakTutor(speech);
    }
  }, [aiImageUrl, data, speakTutor, generateIllustration]);

  // ── 8. Win handler ───────────────────────────────────────────
  const handleGameWin = useCallback(async (finalScore: number) => {
    isWonRef.current = true;
    setIsWon(true);
    setGameOver(true);
    setScore(finalScore);
    setConfettiParticles(generateConfetti(22));
    stopTutorVoice();
    playWinSound();
    const winMsg = `¡Increíble! Adivinaste la palabra "${targetWord}". ¡Has salvado a Guionbajo y vaciado el tanque de agua!`;
    await speakTutor(winMsg);
  }, [targetWord, speakTutor]);

  // ── 9. Loss handler — Guionbajo is drowned under water: NO SPEECH ───
  const handleGameOver = useCallback(async () => {
    setGameOver(true);
    setIsWon(false);
    stopTutorVoice();
    setTutorSpeaking(false);
    // Underwater: Guionbajo is submerged and cannot speak inside the tank
    setTutorSpeechText(`¡Tanque lleno! La palabra misteriosa era "${targetWord}".`);
    playBubbleSound(8);
  }, [targetWord]);

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

      if (newMistakes === 3 || newMistakes === 4) {
        playElectricZapSound();
      } else if (newMistakes === 5) {
        playBubbleSound(7);
      }

      if (newMistakes >= MAX_MISTAKES) {
        await handleGameOver();
      } else if (newMistakes === 5) {
        // Error 5: Guionbajo is submerged under water. He CANNOT speak!
        stopTutorVoice();
        setTutorSpeaking(false);
        setTutorSpeechText('¡Glub glub glub...! (Guionbajo está bajo el agua y no puede hablar)');
      } else {
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


  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 sm:gap-6 text-white pb-10">

      {/* ── Top HUD: Category, Topic, Score, Streak ── */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl glass border border-brand-border/60 shadow-xl">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-brand-cyan to-brand-accent flex items-center justify-center shadow-lg shadow-brand-cyan/20 flex-shrink-0">
            <Sparkles size={18} className="text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-cyan truncate max-w-[140px] sm:max-w-none">
                {data.category || 'Palabra Misteriosa'}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-brand-surface text-brand-text-muted text-[9px] sm:text-[10px] font-mono border border-white/10">
                {sublevel}
              </span>
            </div>
            <h2 className="text-sm sm:text-lg font-outfit font-extrabold text-white truncate">Mystery Word Tank</h2>
          </div>
        </div>

        {/* Score & Streak */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <motion.div
            key={score}
            initial={{ scale: 1.25, color: '#FFD700' }}
            animate={{ scale: 1, color: '#FFB627' }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-brand-surface/80 border border-brand-gold/30 text-brand-gold"
          >
            <Award size={14} />
            <span className="text-xs sm:text-sm font-extrabold font-mono">{score} pts</span>
          </motion.div>

          <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border transition-all ${
            streak > 1
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 flame-streak'
              : 'bg-brand-surface/60 border-white/10 text-brand-text-muted'
          }`}>
            <Flame size={14} className={streak > 1 ? 'text-amber-400 animate-bounce' : ''} />
            <span className="text-[11px] sm:text-xs font-bold">x{streak}</span>
          </div>
        </div>
      </div>

      {/* ── Tutor Speaking Banner ── */}
      <div className="p-2.5 sm:p-3.5 rounded-2xl glass border border-brand-cyan/30 flex items-center justify-between gap-2.5 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            tutorSpeaking ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40' : 'bg-brand-surface text-brand-text-muted'
          }`}>
            <Volume2 size={15} className={tutorSpeaking ? 'animate-pulse text-brand-gold' : ''} />
          </div>
          <div className="truncate min-w-0">
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-brand-cyan">
              {isWon
                ? (tutorSpeaking ? '¡Guionbajo Salvado & Celebrando!' : '¡Victoria Conseguida!')
                : mistakes >= 5
                ? 'Guionbajo Bajo el Agua'
                : tutorSpeaking
                ? 'Tutor Guionbajo Hablando'
                : 'Tutor en Espera'}
            </div>
            <p className="text-[11px] sm:text-xs text-white/90 italic truncate">{tutorSpeechText}</p>
          </div>
        </div>

        {tutorSpeaking && (
          <button
            type="button"
            onClick={handleSkipVoice}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-brand-surface hover:bg-brand-accent text-white text-[11px] sm:text-xs font-bold transition-all border border-white/15 flex items-center gap-1 flex-shrink-0"
            title="Saltar voz y habilitar teclado"
          >
            <FastForward size={12} />
            <span>Saltar</span>
          </button>
        )}
      </div>

      {/* ── MOBILE VIEW (< lg): Zero-scroll compact layout ── */}
      <div className="flex lg:hidden flex-col gap-2.5 w-full">
        {/* Row 1: Side-by-Side Tank (Left) + Word & Active Clue Card (Right) */}
        <div className="flex items-stretch gap-2.5 w-full">

          {/* Left: Compact Tank (Zero Text Inside) */}
          <div className="w-[118px] sm:w-[135px] flex-shrink-0 flex flex-col items-center justify-between">
            <div
              className={`relative w-full h-[175px] rounded-2xl overflow-hidden border-2 transition-all duration-500 flex flex-col justify-end bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 shadow-xl ${
                isWon
                  ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                  : isDanger
                  ? 'tank-danger-glow border-red-500'
                  : 'border-brand-cyan/40'
              } ${isShaking ? 'tank-shake' : ''}`}
            >
              {/* Background grid */}
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#6C63FF_1px,transparent_1px)] [background-size:12px_12px]" />

              {/* Guionbajo TutorAvatar (size="sm") with progressive sinking */}
              <motion.div
                className="absolute inset-x-0 top-[42px] flex flex-col items-center justify-start pointer-events-none z-10"
                animate={
                  isScared
                    ? { y: currentSinkYMobile - 8, scale: 1.1, rotate: [-2, 3, -3, 2, 0] }
                    : isWon
                    ? { y: currentSinkYMobile, scale: 1.05, rotate: 0 }
                    : mistakes >= 5
                    ? { y: [currentSinkYMobile - 1.5, currentSinkYMobile + 2, currentSinkYMobile - 1.5], rotate: [-2, 2, -2] }
                    : mistakes >= 3
                    ? { y: [currentSinkYMobile - 1, currentSinkYMobile + 1.5, currentSinkYMobile - 1], rotate: [-1, 1, -1] }
                    : { y: [currentSinkYMobile - 1, currentSinkYMobile + 1, currentSinkYMobile - 1], rotate: 0 }
                }
                transition={
                  isScared
                    ? { duration: 0.55, ease: 'easeOut' }
                    : isWon
                    ? { duration: 0.8, type: 'spring' }
                    : { duration: mistakes >= 4 ? 0.35 : 2.4, repeat: Infinity, ease: 'easeInOut' }
                }
              >
                <div className="relative scale-90">
                  <TutorAvatar
                    size="sm"
                    emotion={robotState.emotion}
                    crtLabel={robotState.crtLabel}
                    crtColor={robotState.crtColor}
                    sparkBulb={robotState.sparkBulb}
                    drowned={robotState.drowned}
                    state={!isWon && (mistakes >= 5 || robotState.drowned) ? 'idle' : (tutorSpeaking ? 'speaking' : 'idle')}
                    text={!isWon && (mistakes >= 5 || robotState.drowned) ? '' : tutorSpeechText}
                    panickedArms={!isWon && mistakes >= 4 && !robotState.drowned}
                    shortCircuit={!isWon && mistakes >= 3 && !robotState.drowned}
                  />

                  {/* Mouth Bubbles Emitter (!isWon && mistakes >= 5 && !drowned) */}
                  {!isWon && mistakes >= 5 && !robotState.drowned && (
                    <div className="absolute top-[44px] left-1/2 -translate-x-1/2 pointer-events-none">
                      <span className="mouth-bubble" style={{ width: 6, height: 6, left: -4, animationDelay: '0s' }} />
                      <span className="mouth-bubble" style={{ width: 5, height: 5, left: 2, animationDelay: '0.4s' }} />
                    </div>
                  )}

                  {/* Continuous Underwater Bubble Stream (!isWon && mistakes >= 5 && !drowned) */}
                  {!isWon && mistakes >= 5 && !robotState.drowned && (
                    <div className="absolute top-[20px] left-1/2 -translate-x-1/2 pointer-events-none w-10 h-20">
                      <span className="bubble-stream-particle" style={{ width: 8, height: 8, left: '25%', bottom: '10px', animationDelay: '0s' }} />
                      <span className="bubble-stream-particle" style={{ width: 6, height: 6, left: '55%', bottom: '15px', animationDelay: '0.4s' }} />
                      <span className="bubble-stream-particle" style={{ width: 10, height: 10, left: '40%', bottom: '5px', animationDelay: '0.8s' }} />
                      <span className="bubble-stream-particle" style={{ width: 5, height: 5, left: '70%', bottom: '20px', animationDelay: '1.1s' }} />
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Electric Short Circuit Sparks (!isWon && mistakes >= 3 && !drowned) */}
              {!isWon && mistakes >= 3 && !robotState.drowned && (
                <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 120 160">
                    <path
                      d="M 35,45 L 48,60 L 42,65 L 56,85 L 50,88 L 62,105"
                      stroke="#00D4FF"
                      strokeWidth="2"
                      fill="none"
                      className="electric-arc-path-1"
                    />
                    <path
                      d="M 85,42 L 72,58 L 78,63 L 64,82 L 70,85 L 58,100"
                      stroke="#FFD700"
                      strokeWidth="1.8"
                      fill="none"
                      className="electric-arc-path-2"
                    />
                  </svg>
                </div>
              )}

              {/* Dynamic Rising Water (In Front of Guionbajo) */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 w-full z-20 overflow-hidden pointer-events-none"
                animate={{ height: `${currentWaterPct}%` }}
                transition={{ type: 'spring', damping: 20, stiffness: 85 }}
              >
                {/* Visible translucent water gradient - Clean aquatic blue, NO color changes */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-sky-600/80 to-cyan-300/85 transition-opacity duration-500"
                  style={{
                    boxShadow: 'inset 0 6px 20px rgba(6, 182, 212, 0.55)'
                  }}
                />

                {/* Surface wave crest */}
                <div className="absolute top-0 left-0 right-0 h-1 water-surface-glow z-30 bg-gradient-to-r from-cyan-400 via-white to-cyan-400 shadow-[0_0_10px_#00D4FF]" />

                {/* Wave SVGs */}
                <div className="absolute -top-4 left-0 w-[200%] h-6 opacity-75 animate-wave-motion">
                  <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-current text-cyan-300">
                    <path d="M0,0 C150,90 350,-40 500,50 C650,140 900,10 1200,40 L1200,120 L0,120 Z" />
                  </svg>
                </div>
              </motion.div>
            </div>

            {/* Error indicator capsules outside tank */}
            <div className="mt-1.5 flex items-center justify-center gap-1 w-full">
              {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < mistakes
                      ? i >= 4
                        ? 'w-3.5 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                        : i >= 2
                        ? 'w-3.5 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]'
                        : 'w-3.5 bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]'
                      : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right: Word Tiles & Compact Clue Tabs */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
            {/* Word Tiles Card */}
            <div className="p-2 rounded-2xl glass border border-white/10 flex flex-wrap justify-center gap-1 shadow-md">
              {targetWord.split('').map((letter, idx) => {
                const isGuessed = guessedLetters.has(letter) || gameOver;
                const isFlashing = flashLetter === letter;

                return (
                  <div
                    key={idx}
                    className={`w-7 h-9 xs:w-8 xs:h-10 rounded-xl flex items-center justify-center font-outfit text-base xs:text-lg font-extrabold border transition-all duration-200 ${
                      isFlashing
                        ? 'bg-emerald-500/30 border-emerald-300 text-emerald-200'
                        : isGuessed
                        ? isWon
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-brand-surface border-brand-cyan text-white'
                        : 'bg-brand-surface/40 border-dashed border-white/20 text-transparent'
                    }`}
                  >
                    {isGuessed ? letter : ''}
                  </div>
                );
              })}
            </div>

            {/* Compact Clue Card with Tabs */}
            <div className="p-2 rounded-2xl glass border border-white/10 flex flex-col gap-1.5 flex-1 shadow-md">
              {/* Tab Selector: 1 Def, 2 Sin, 3 IA, 4 1ª */}
              <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1">
                  {[
                    { tier: 1, label: 'Def', icon: BookOpen },
                    { tier: 2, label: 'Sin', icon: Layers },
                    { tier: 3, label: 'Img', icon: ImageIcon },
                    { tier: 4, label: '1ª', icon: HelpCircle },
                  ].map((t) => {
                    const isUnlocked = unlockedTier >= t.tier;
                    const isSelected = mobileSelectedTier === t.tier;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.tier}
                        type="button"
                        onClick={() => setMobileSelectedTier(t.tier)}
                        className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-brand-cyan text-black shadow-sm'
                            : isUnlocked
                            ? 'bg-white/10 text-white hover:bg-white/15'
                            : 'bg-black/20 text-white/30'
                        }`}
                      >
                        <Icon size={10} />
                        <span>{t.label}</span>
                        {t.tier === 3 && aiImageUrl && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Ilustración lista" />
                        )}
                        {isUnlocked && <CheckCircle2 size={8} className={isSelected ? 'text-black' : 'text-emerald-400'} />}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[9px] font-mono text-white/50">{unlockedTier}/4</span>
              </div>

              {/* Tab Content */}
              <div className="flex-1 flex flex-col justify-center min-h-[52px]">
                {mobileSelectedTier === 1 && (
                  unlockedTier >= 1 ? (
                    <p className="text-[11px] leading-tight text-blue-200 line-clamp-3">{data.clue_definition}</p>
                  ) : (
                    <p className="text-[10px] text-white/35 italic">1º fallo desbloquea definición.</p>
                  )
                )}

                {mobileSelectedTier === 2 && (
                  unlockedTier >= 2 ? (
                    <p className="text-[11px] leading-tight text-purple-200 line-clamp-3">{data.clue_synonym}</p>
                  ) : (
                    <p className="text-[10px] text-white/35 italic">2º fallo desbloquea sinónimos.</p>
                  )
                )}

                {mobileSelectedTier === 3 && (
                  unlockedTier >= 3 ? (
                    <div className="flex items-center gap-2 w-full">
                      {aiImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setExpandedImage(aiImageUrl)}
                          className="relative group flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400/70 shadow-md active:scale-95 transition-transform bg-black/40 flex items-center justify-center cursor-pointer"
                          title="Toca para ampliar pista visual"
                        >
                          <img
                            src={aiImageUrl}
                            alt="Ilustración didáctica"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end justify-center pb-0.5">
                            <span className="text-[8px] font-black text-amber-300 flex items-center gap-0.5">
                              <Maximize2 size={7} /> Ver
                            </span>
                          </div>
                        </button>
                      ) : loadingAiImage ? (
                        <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-amber-500/20 border border-amber-400/40 flex flex-col items-center justify-center text-[8px] text-amber-300 animate-pulse text-center p-0.5">
                          <Sparkles size={12} className="animate-spin mb-0.5 text-amber-400" />
                          <span>Creando</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => generateIllustration()}
                          className="px-2 py-1 rounded-xl bg-amber-500/25 border border-amber-400/50 text-[10px] font-bold text-amber-300 flex items-center gap-1 hover:bg-amber-500/40 active:scale-95"
                        >
                          <Sparkles size={11} />
                          <span>Generar</span>
                        </button>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                            <Sparkles size={10} className="text-amber-400" />
                            Ilustración Visual
                          </span>
                          {aiImageUrl && (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 font-semibold">
                              Lista
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-amber-100/80 leading-tight line-clamp-2 mt-0.5">
                          Observa los elementos de la escena para identificar la palabra oculta.
                        </p>
                        {aiImageUrl && (
                          <button
                            type="button"
                            onClick={() => setExpandedImage(aiImageUrl)}
                            className="text-[9px] text-cyan-300 hover:text-cyan-200 font-semibold text-left flex items-center gap-1 mt-0.5"
                          >
                            <span>🔍 Toca para ver en grande</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-white/40">
                      <Lock size={12} />
                      <p className="text-[10px] italic">3º fallo desbloquea ilustración visual.</p>
                      {loadingAiImage && (
                        <span className="text-[9px] text-amber-400/70 ml-auto animate-pulse">
                          (Preparando...)
                        </span>
                      )}
                    </div>
                  )
                )}

                {mobileSelectedTier === 4 && (
                  unlockedTier >= 4 ? (
                    <p className="text-[11px] font-bold text-rose-200 line-clamp-2">{data.clue_first_letter}</p>
                  ) : (
                    <p className="text-[10px] text-white/35 italic">4º fallo desbloquea pista inicial.</p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Mobile Virtual Keyboard */}
        <div className="p-2 rounded-2xl glass border border-brand-border/60 flex flex-col items-center gap-1 shadow-lg w-full">
          <div className="grid grid-cols-7 sm:grid-cols-9 gap-1 w-full justify-center">
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
                  className={`h-8 sm:h-9 rounded-lg font-outfit text-xs sm:text-sm font-extrabold transition-colors duration-150 flex items-center justify-center shadow-sm ${
                    isCorrect
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : isWrong
                      ? 'bg-slate-800 text-white/20 border border-white/5 cursor-not-allowed opacity-40'
                      : tutorSpeaking
                      ? 'bg-brand-surface/50 text-white/40 border border-white/10 cursor-not-allowed'
                      : 'bg-brand-surface text-white border border-brand-border/60 active:bg-brand-cyan active:text-black'
                  }`}
                >
                  {letter}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── DESKTOP VIEW (>= lg): Full Spacious 12-Column Grid Layout ── */}
      <div className="hidden lg:flex flex-col gap-6 w-full">
        {/* Row 1: 12-Col Grid (Tank 5 cols, Word & Clues 7 cols) */}
        <div className="grid grid-cols-12 gap-6 items-start">

          {/* 1. Large Reactive Tank (Zero Text Inside) */}
          <div className="col-span-5 flex flex-col items-center">
            <div
              ref={tankRef}
              className={`relative w-full max-w-[275px] h-[360px] rounded-3xl overflow-hidden border-4 transition-all duration-500 flex flex-col justify-end bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 shadow-2xl ${
                isWon
                  ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.45)]'
                  : isDanger
                  ? 'tank-danger-glow border-red-500'
                  : 'border-brand-cyan/40'
              } ${isShaking ? 'tank-shake' : ''}`}
            >
              {/* Background grid */}
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#6C63FF_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

              {/* Guionbajo Robot with progressive sinking */}
              <motion.div
                className="absolute inset-x-0 top-[90px] flex flex-col items-center justify-start pointer-events-none z-10"
                animate={
                  isScared
                    ? { y: currentSinkY - 14, scale: 1.12, rotate: [-2, 3, -3, 2, 0] }
                    : isWon
                    ? { y: currentSinkY, scale: 1.08, rotate: 0 }
                    : mistakes >= 5
                    ? { y: [currentSinkY - 2, currentSinkY + 3, currentSinkY - 2], rotate: [-2.5, 2.5, -2.5] }
                    : mistakes >= 3
                    ? { y: [currentSinkY - 1.5, currentSinkY + 2, currentSinkY - 1.5], rotate: [-1.5, 1.5, -1.5] }
                    : { y: [currentSinkY - 2, currentSinkY + 2, currentSinkY - 2], rotate: 0 }
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
                    state={!isWon && (mistakes >= 5 || robotState.drowned) ? 'idle' : (tutorSpeaking ? 'speaking' : 'idle')}
                    text={!isWon && (mistakes >= 5 || robotState.drowned) ? '' : tutorSpeechText}
                    panickedArms={!isWon && mistakes >= 4 && !robotState.drowned}
                    shortCircuit={!isWon && mistakes >= 3 && !robotState.drowned}
                  />

                  {/* Mouth Bubbles Emitter (!isWon && mistakes >= 5 && !drowned) */}
                  {!isWon && mistakes >= 5 && !robotState.drowned && (
                    <div className="absolute top-[70px] left-1/2 -translate-x-1/2 pointer-events-none">
                      <span className="mouth-bubble" style={{ width: 8, height: 8, left: -5, animationDelay: '0s' }} />
                      <span className="mouth-bubble" style={{ width: 6, height: 6, left: 3, animationDelay: '0.4s' }} />
                      <span className="mouth-bubble" style={{ width: 10, height: 10, left: -1, animationDelay: '0.85s' }} />
                    </div>
                  )}

                  {/* Continuous Underwater Bubble Stream (!isWon && mistakes >= 5 && !drowned) */}
                  {!isWon && mistakes >= 5 && !robotState.drowned && (
                    <div className="absolute top-[30px] left-1/2 -translate-x-1/2 pointer-events-none w-16 h-28">
                      <span className="bubble-stream-particle" style={{ width: 10, height: 10, left: '20%', bottom: '15px', animationDelay: '0s' }} />
                      <span className="bubble-stream-particle" style={{ width: 8, height: 8, left: '60%', bottom: '25px', animationDelay: '0.35s' }} />
                      <span className="bubble-stream-particle" style={{ width: 14, height: 14, left: '42%', bottom: '10px', animationDelay: '0.7s' }} />
                      <span className="bubble-stream-particle" style={{ width: 7, height: 7, left: '75%', bottom: '30px', animationDelay: '1.05s' }} />
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Electric Short Circuit Sparks (!isWon && mistakes >= 3 && !drowned) */}
              {!isWon && mistakes >= 3 && !robotState.drowned && (
                <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 200 280">
                    <path
                      d="M 50,85 L 68,110 L 60,118 L 82,150 L 74,155 L 95,190"
                      stroke="#00D4FF"
                      strokeWidth="2.5"
                      fill="none"
                      className="electric-arc-path-1"
                    />
                    <path
                      d="M 150,80 L 132,108 L 140,115 L 118,148 L 126,152 L 105,185"
                      stroke="#FFD700"
                      strokeWidth="2.2"
                      fill="none"
                      className="electric-arc-path-2"
                    />
                    <path
                      d="M 90,45 L 108,68 L 100,74 L 115,100"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      fill="none"
                      className="electric-arc-path-1"
                    />
                  </svg>
                </div>
              )}

              {/* Dynamic Rising Water (In Front of Guionbajo) */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 w-full z-20 overflow-hidden pointer-events-none"
                animate={{ height: `${currentWaterPct}%` }}
                transition={{ type: 'spring', damping: 20, stiffness: 85 }}
              >
                {/* Visible translucent water gradient - Clean aquatic blue, NO color changes */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-sky-600/80 to-cyan-300/85 transition-opacity duration-500"
                  style={{
                    boxShadow: 'inset 0 10px 30px rgba(6, 182, 212, 0.55), 0 -8px 25px rgba(6, 182, 212, 0.6)'
                  }}
                />

                {/* Glowing Water Surface Wave Crest */}
                <div className="absolute top-0 left-0 right-0 h-1.5 water-surface-glow z-30 bg-gradient-to-r from-cyan-400 via-white to-cyan-400 shadow-[0_0_15px_#00D4FF]" />

                {/* Splash drop on water rise */}
                {showSplash && (
                  <span
                    className="splash-drop"
                    style={{ width: 12, height: 12, left: `${35 + Math.random() * 30}%` }}
                  />
                )}

                {/* Wave 1 */}
                <div className="absolute -top-3.5 left-0 w-[200%] h-6 opacity-75 animate-wave-motion">
                  <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-current text-cyan-300">
                    <path d="M0,0 C150,90 350,-40 500,50 C650,140 900,10 1200,40 L1200,120 L0,120 Z" />
                  </svg>
                </div>

                {/* Wave 2 */}
                <div className="absolute -top-2.5 left-0 w-[200%] h-5 opacity-45 animate-wave-reverse">
                  <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-current text-blue-200">
                    <path d="M0,0 C200,70 400,-20 600,60 C800,120 1000,20 1200,50 L1200,120 L0,120 Z" />
                  </svg>
                </div>

                {/* Wave 3 */}
                <div className="absolute -top-1.5 left-0 w-[200%] h-4 opacity-25 animate-wave-motion-slow">
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
              </motion.div>
            </div>

            {/* Error indicator capsules outside tank */}
            <div className="mt-3 flex items-center justify-center gap-2">
              {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i < mistakes
                      ? i >= 4
                        ? 'w-5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                        : i >= 2
                        ? 'w-5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                        : 'w-5 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                      : 'w-2.5 bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 2. Word Tiles & Fixed-Height Tabbed Clue System */}
          <div className="col-span-7 flex flex-col gap-4">
            {/* Letter Tiles Card */}
            <div className="p-4 sm:p-5 rounded-3xl glass border border-brand-border/60 flex flex-col items-center gap-2.5 shadow-2xl">
              <div className="flex items-center justify-between w-full px-1">
                <span className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">
                  Palabra Oculta ({targetWord.length} Letras)
                </span>
                {(isWon || gameOver) && (
                  <motion.button
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => playWordAudio(targetWord)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-cyan/20 border border-brand-cyan/50 text-brand-cyan hover:bg-brand-cyan/30 font-bold text-xs transition-all hover:scale-105 cursor-pointer"
                  >
                    <Volume2 size={13} />
                    <span>Pronunciación</span>
                  </motion.button>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 py-1">
                {targetWord.split('').map((letter, idx) => {
                  const isGuessed = guessedLetters.has(letter) || gameOver;
                  const isFlashing = flashLetter === letter;

                  return (
                    <div key={idx} className="relative">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`w-10 h-13 sm:w-11 sm:h-14 rounded-2xl flex items-center justify-center font-outfit text-xl sm:text-2xl font-extrabold border-2 transition-all duration-300 shadow-lg ${
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

                      {/* Win confetti */}
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
            </div>

            {/* Desktop Fixed-Height Tabbed Clue System (Zero Overflow, Never Pushes Keyboard) */}
            <div className="p-4 sm:p-5 rounded-3xl glass border border-brand-border/60 flex flex-col justify-between shadow-xl h-[235px]">
              {/* Clue Tab Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 mr-1">
                    <Lightbulb size={15} className="text-brand-gold animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider hidden xl:inline">
                      Pistas
                    </span>
                  </div>
                  {[
                    { tier: 1, label: '1. Definición', icon: BookOpen },
                    { tier: 2, label: '2. Sinónimos', icon: Layers },
                    { tier: 3, label: '3. Ilustración', icon: ImageIcon },
                    { tier: 4, label: '4. Letra Inicial', icon: HelpCircle },
                  ].map((t) => {
                    const isUnlocked = unlockedTier >= t.tier;
                    const isSelected = selectedDesktopTier === t.tier;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.tier}
                        type="button"
                        onClick={() => setSelectedDesktopTier(t.tier)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-cyan text-black shadow-md shadow-brand-cyan/25'
                            : isUnlocked
                            ? 'bg-white/10 text-white hover:bg-white/20'
                            : 'bg-black/25 text-white/35 hover:bg-black/35'
                        }`}
                      >
                        <Icon size={12} />
                        <span>{t.label}</span>
                        {t.tier === 3 && aiImageUrl && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Ilustración lista" />
                        )}
                        {isUnlocked && (
                          <CheckCircle2 size={11} className={isSelected ? 'text-black' : 'text-emerald-400'} />
                        )}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] font-mono text-brand-cyan font-bold flex-shrink-0">
                  {unlockedTier}/4
                </span>
              </div>

              {/* Active Clue Content */}
              <div className="flex-1 flex flex-col justify-center py-2 min-h-0 overflow-y-auto">
                {selectedDesktopTier === 1 && (
                  unlockedTier >= 1 ? (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                        Definición Pedagógica
                      </span>
                      <p className="text-sm leading-relaxed text-blue-100 font-medium line-clamp-3">
                        {data.clue_definition}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-white/40">
                      <Lock size={16} />
                      <p className="text-xs italic">Comete tu 1º error para desbloquear la definición pedagógica.</p>
                    </div>
                  )
                )}

                {selectedDesktopTier === 2 && (
                  unlockedTier >= 2 ? (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                        Sinónimos & Familia Léxica
                      </span>
                      <p className="text-sm leading-relaxed text-purple-100 font-medium line-clamp-3">
                        {data.clue_synonym}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-white/40">
                      <Lock size={16} />
                      <p className="text-xs italic">Comete tu 2º error para revelar los sinónimos y colocaciones.</p>
                    </div>
                  )
                )}

                {selectedDesktopTier === 3 && (
                  unlockedTier >= 3 ? (
                    <div className="flex items-center gap-4">
                      {aiImageUrl ? (
                        <div className="relative group flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedImage(aiImageUrl)}
                            className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-lg cursor-pointer active:scale-95 transition-transform bg-black/40 block"
                            title="Ampliar ilustración"
                          >
                            <img
                              src={aiImageUrl}
                              alt="Ilustración didáctica"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-1">
                              <span className="text-[9px] font-extrabold text-amber-300 flex items-center gap-1">
                                <Maximize2 size={9} /> Ver
                              </span>
                            </div>
                          </button>
                        </div>
                      ) : loadingAiImage ? (
                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex flex-col items-center justify-center text-[10px] text-amber-300 animate-pulse text-center p-2 flex-shrink-0">
                          <Sparkles size={16} className="animate-spin mb-1 text-amber-400" />
                          <span>Generando...</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => generateIllustration()}
                          className="px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold transition-all flex flex-col items-center gap-1 flex-shrink-0"
                        >
                          <Sparkles size={16} />
                          <span>Generar Ilustración</span>
                        </button>
                      )}

                      <div className="flex-1 space-y-1 min-w-0">
                        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon size={13} />
                          <span>Ilustración Visual Didáctica</span>
                        </span>
                        <p className="text-xs text-amber-100/90 leading-relaxed font-medium">
                          Observa los elementos de la escena para identificar la palabra oculta.
                        </p>
                        {aiImageUrl && (
                          <div className="flex items-center gap-3 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setExpandedImage(aiImageUrl)}
                              className="text-xs text-cyan-300 hover:text-cyan-200 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Maximize2 size={12} />
                              <span>Ver en tamaño grande</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => generateIllustration()}
                              className="inline-flex items-center gap-1 text-xs text-amber-400/80 hover:text-amber-200 underline cursor-pointer"
                            >
                              <RefreshCw size={11} />
                              <span>Nueva imagen</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-white/40">
                      <Lock size={16} />
                      <p className="text-xs italic">Comete tu 3º error para desbloquear una ilustración visual didáctica.</p>
                      {loadingAiImage && (
                        <span className="text-[11px] text-amber-400/70 ml-auto animate-pulse">
                          (Preparando ilustración en segundo plano...)
                        </span>
                      )}
                    </div>
                  )
                )}

                {selectedDesktopTier === 4 && (
                  unlockedTier >= 4 ? (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                        Pista de Auxilio Final
                      </span>
                      <p className="text-sm font-bold leading-relaxed text-rose-100">
                        {data.clue_first_letter}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-white/40">
                      <Lock size={16} />
                      <p className="text-xs italic">Comete tu 4º error para revelar el último salvavidas con la letra inicial.</p>
                    </div>
                  )
                )}
              </div>

              {/* Clue Footer */}
              <div className="border-t border-white/5 pt-1.5 flex items-center justify-between text-[10px] text-white/40">
                <span>Las pistas se revelan automáticamente cuando te equivocas</span>
                <span>Fallos: {mistakes}/{MAX_MISTAKES}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Desktop Virtual Keyboard (Balanced 3-Row Horizontal Layout) */}
        <div className="p-5 rounded-3xl glass border border-brand-border/60 flex flex-col items-center gap-3.5 shadow-2xl">
          <div className="flex items-center justify-between w-full max-w-2xl px-2">
            <span className="text-xs font-bold text-brand-text-muted uppercase">
              {tutorSpeaking ? '⏳ Escucha al tutor...' : '🎯 Selecciona una letra'}
            </span>
            <span className="text-xs text-brand-cyan font-medium">Puedes usar tu teclado físico</span>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-2xl items-center">
            {/* Row 1: A - I */}
            <div className="flex justify-center gap-2 w-full">
              {ALPHABET.slice(0, 9).map((letter) => {
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
                    whileHover={!isGuessed && !gameOver && !tutorSpeaking ? { scale: 1.08, y: -2 } : {}}
                    className={`w-11 sm:w-12 h-11 sm:h-12 rounded-xl font-outfit text-sm sm:text-base font-extrabold transition-colors duration-150 flex items-center justify-center shadow-md ${
                      isCorrect
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-95'
                        : isWrong
                        ? 'bg-slate-800 text-white/20 border border-white/5 cursor-not-allowed opacity-40'
                        : tutorSpeaking
                        ? 'bg-brand-surface/50 text-white/40 border border-white/10 cursor-not-allowed'
                        : 'bg-brand-surface text-white border border-brand-border/60 hover:border-brand-cyan hover:bg-brand-surface/80 active:scale-95'
                    }`}
                  >
                    {letter}
                  </motion.button>
                );
              })}
            </div>

            {/* Row 2: J - R */}
            <div className="flex justify-center gap-2 w-full">
              {ALPHABET.slice(9, 18).map((letter) => {
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
                    whileHover={!isGuessed && !gameOver && !tutorSpeaking ? { scale: 1.08, y: -2 } : {}}
                    className={`w-11 sm:w-12 h-11 sm:h-12 rounded-xl font-outfit text-sm sm:text-base font-extrabold transition-colors duration-150 flex items-center justify-center shadow-md ${
                      isCorrect
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-95'
                        : isWrong
                        ? 'bg-slate-800 text-white/20 border border-white/5 cursor-not-allowed opacity-40'
                        : tutorSpeaking
                        ? 'bg-brand-surface/50 text-white/40 border border-white/10 cursor-not-allowed'
                        : 'bg-brand-surface text-white border border-brand-border/60 hover:border-brand-cyan hover:bg-brand-surface/80 active:scale-95'
                    }`}
                  >
                    {letter}
                  </motion.button>
                );
              })}
            </div>

            {/* Row 3: S - Z */}
            <div className="flex justify-center gap-2 w-full">
              {ALPHABET.slice(18).map((letter) => {
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
                    whileHover={!isGuessed && !gameOver && !tutorSpeaking ? { scale: 1.08, y: -2 } : {}}
                    className={`w-11 sm:w-12 h-11 sm:h-12 rounded-xl font-outfit text-sm sm:text-base font-extrabold transition-colors duration-150 flex items-center justify-center shadow-md ${
                      isCorrect
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-95'
                        : isWrong
                        ? 'bg-slate-800 text-white/20 border border-white/5 cursor-not-allowed opacity-40'
                        : tutorSpeaking
                        ? 'bg-brand-surface/50 text-white/40 border border-white/10 cursor-not-allowed'
                        : 'bg-brand-surface text-white border border-brand-border/60 hover:border-brand-cyan hover:bg-brand-surface/80 active:scale-95'
                    }`}
                  >
                    {letter}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Image Zoom Modal ── */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-sm sm:max-w-md w-full max-h-[92vh] bg-slate-900/95 border-2 border-amber-400/50 rounded-3xl p-4 sm:p-5 flex flex-col items-center gap-3 shadow-[0_0_50px_rgba(251,191,36,0.25)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between w-full pb-1 border-b border-white/10">
                <span className="text-xs sm:text-sm font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={16} className="text-amber-400" />
                  <span>Ilustración Visual Didáctica</span>
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedImage(null)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Cerrar vista grande"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Contained Responsive Image */}
              <div className="w-full flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden border border-white/10 p-1">
                <img
                  src={expandedImage}
                  alt="Ilustración didáctica de la palabra misteriosa"
                  className="w-full max-h-[46vh] sm:max-h-[56vh] object-contain rounded-xl shadow-lg"
                />
              </div>

              {/* Clue Context */}
              <p className="text-xs text-amber-100/90 text-center font-medium px-1">
                Observa los detalles de la escena para descubrir la palabra en inglés.
              </p>

              {/* Action Button: Volver al juego */}
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-black font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Volver al Juego y Adivinar</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
