'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Volume2,
  Clock,
  Flame,
  Award,
  RotateCcw,
  Bot,
  User as UserIcon,
  HelpCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { playTutorVoice, stopTutorVoice } from '@/lib/api';

export interface CardItem {
  uid: string;
  index: number;
  pairId: string;
  side: 'A' | 'B';
  text: string;
  icon: string;
  category: string;
  translation: string;
  audio_phrase: string;
  audio_translation: string;
  explanation: string;
}

export interface TwinCardPairData {
  pair_id: string;
  card_a: { text: string; icon: string; category: string; translation: string };
  card_b: { text: string; icon: string; category: string; translation: string };
  audio_phrase: string;
  audio_translation: string;
  explanation: string;
}

interface TwinCardsGameProps {
  pairs: TwinCardPairData[];
  topic: string;
  sublevel: string;
  onFinishGame: (result: {
    score: number;
    studentPairsCount: number;
    aiPairsCount: number;
    maxStreak: number;
    difficulty: string;
    pairs: TwinCardPairData[];
  }) => void;
  onSwitchGame?: () => void;
}

type DifficultyLevel = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<DifficultyLevel, { name: string; memoryFactor: number; turnTimeSec: number; color: string }> = {
  easy: { name: 'Fácil (45% Memoria IA)', memoryFactor: 0.45, turnTimeSec: 25, color: 'text-emerald-400 border-emerald-400/40 bg-emerald-500/10' },
  medium: { name: 'Balanceado (70% Memoria IA)', memoryFactor: 0.70, turnTimeSec: 20, color: 'text-brand-cyan border-brand-cyan/40 bg-brand-cyan/10' },
  hard: { name: 'Desafío (92% Memoria IA)', memoryFactor: 0.92, turnTimeSec: 15, color: 'text-amber-400 border-amber-400/40 bg-amber-500/10' },
};

export default function TwinCardsGame({
  pairs,
  topic,
  sublevel,
  onFinishGame,
  onSwitchGame,
}: TwinCardsGameProps) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedCardIndices, setFlippedCardIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  
  const [currentTurn, setCurrentTurn] = useState<'student' | 'ai'>('student');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  
  const [studentScore, setStudentScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [studentPairsCount, setStudentPairsCount] = useState(0);
  const [aiPairsCount, setAiPairsCount] = useState(0);
  
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(20);
  const [isTimerPaused, setIsTimerPaused] = useState(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronous State Refs to eliminate closure race conditions
  const matchedPairIdsRef = useRef<Set<string>>(new Set());
  const isGameOverRef = useRef<boolean>(false);
  const isAiThinkingRef = useRef<boolean>(false);
  const isEvaluatingRef = useRef<boolean>(false);
  const isVoiceActiveRef = useRef<boolean>(false);
  const aiTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const twinAiMemoryRef = useRef<Map<number, CardItem>>(new Map());
  const hasSpokenWelcomeRef = useRef<boolean>(false);
  const totalPairsCountRef = useRef<number>(6);

  // UI state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [tutorMessage, setTutorMessage] = useState('¡Tu turno! Voltea dos cartas para encontrar la pareja.');
  const [lastMatchedPair, setLastMatchedPair] = useState<TwinCardPairData | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);

  // 1. Initialize Board
  const initializeBoard = useCallback(() => {
    stopQuestionTimer();
    stopTutorVoice();
    if (aiTurnTimeoutRef.current) {
      clearTimeout(aiTurnTimeoutRef.current);
      aiTurnTimeoutRef.current = null;
    }

    isGameOverRef.current = false;
    isAiThinkingRef.current = false;
    isEvaluatingRef.current = false;
    isVoiceActiveRef.current = false;
    matchedPairIdsRef.current.clear();
    twinAiMemoryRef.current.clear();

    setMatchedPairIds(new Set());
    setFlippedCardIndices([]);
    setStudentScore(0);
    setAiScore(0);
    setStudentPairsCount(0);
    setAiPairsCount(0);
    setStreak(0);
    setMaxStreak(0);
    setIsGameOver(false);
    setLastMatchedPair(null);
    setCurrentTurn('student');

    const sourcePairs = pairs && pairs.length >= 6 ? pairs : [];
    totalPairsCountRef.current = sourcePairs.length;

    const generatedCards: CardItem[] = [];
    sourcePairs.forEach((p) => {
      generatedCards.push({
        uid: `${p.pair_id}-A`,
        index: 0,
        pairId: p.pair_id,
        side: 'A',
        text: p.card_a.text,
        icon: p.card_a.icon || '✨',
        category: p.card_a.category || topic,
        translation: p.card_a.translation,
        audio_phrase: p.audio_phrase,
        audio_translation: p.audio_translation,
        explanation: p.explanation,
      });

      generatedCards.push({
        uid: `${p.pair_id}-B`,
        index: 0,
        pairId: p.pair_id,
        side: 'B',
        text: p.card_b.text,
        icon: p.card_b.icon || '🎯',
        category: p.card_b.category || topic,
        translation: p.card_b.translation,
        audio_phrase: p.audio_phrase,
        audio_translation: p.audio_translation,
        explanation: p.explanation,
      });
    });

    // Shuffle
    for (let i = generatedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [generatedCards[i], generatedCards[j]] = [generatedCards[j], generatedCards[i]];
    }

    generatedCards.forEach((c, idx) => {
      c.index = idx;
    });

    setCards(generatedCards);
    resetQuestionTimerUI();

    // Start introductory voice with safe timing
    setTimeout(() => {
      speakTutorWelcome();
    }, 300);
  }, [pairs, topic]);

  useEffect(() => {
    initializeBoard();
    return () => {
      isGameOverRef.current = true;
      isEvaluatingRef.current = false;
      isVoiceActiveRef.current = false;
      stopQuestionTimer();
      stopTutorVoice();
      if (aiTurnTimeoutRef.current) {
        clearTimeout(aiTurnTimeoutRef.current);
      }
    };
  }, [initializeBoard]);

  // ─── 4 TIMER LIFECYCLE FUNCTIONS ────────────────────────────────────────────

  const resetQuestionTimerUI = () => {
    setTimeLeft(DIFFICULTY_CONFIG[difficulty].turnTimeSec);
    setIsTimerPaused(true);
  };

  const pauseQuestionTimer = () => {
    setIsTimerPaused(true);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const stopQuestionTimer = () => {
    setIsTimerPaused(true);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const startQuestionCountdown = () => {
    if (isGameOverRef.current) return;
    stopQuestionTimer();
    setIsTimerPaused(false);
    setTimeLeft(DIFFICULTY_CONFIG[difficulty].turnTimeSec);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopQuestionTimer();
          handleTurnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ─── SPEECH & TUTOR VOICE CONTROLLER ────────────────────────────────────────

  const speakTutorWelcome = async () => {
    if (isGameOverRef.current) return;
    const welcome = `¡Bienvenido a Cartas Gemelas! Encontraremos parejas conceptuales. Empiezas tú, ¡a ver cuántos pares logras!`;
    await playVoiceMessage(welcome);
    if (!isGameOverRef.current) {
      startQuestionCountdown();
    }
  };

  const playVoiceMessage = async (msg: string, lang = 'es') => {
    if (isGameOverRef.current && !msg.includes('Felicidades') && !msg.includes('jugado') && !msg.includes('Empate')) {
      return;
    }
    setTutorMessage(msg);
    setIsSpeaking(true);
    isVoiceActiveRef.current = true;
    pauseQuestionTimer();
    try {
      await playTutorVoice(msg, lang);
    } catch (e) {
      console.warn('Voice playback error:', e);
    } finally {
      setIsSpeaking(false);
      isVoiceActiveRef.current = false;
    }
  };

  // ─── STUDENT TURN INTERACTION ───────────────────────────────────────────────

  const handleStudentCardClick = async (cardIndex: number) => {
    if (
      currentTurn !== 'student' ||
      isEvaluatingRef.current ||
      isVoiceActiveRef.current ||
      isSpeaking ||
      isGameOverRef.current ||
      flippedCardIndices.length >= 2 ||
      flippedCardIndices.includes(cardIndex) ||
      matchedPairIdsRef.current.has(cards[cardIndex].pairId)
    ) {
      return;
    }

    const clickedCard = cards[cardIndex];
    twinAiMemoryRef.current.set(cardIndex, clickedCard);

    const newFlipped = [...flippedCardIndices, cardIndex];
    setFlippedCardIndices(newFlipped);

    if (newFlipped.length === 1) {
      return;
    }

    if (newFlipped.length === 2) {
      isEvaluatingRef.current = true;
      pauseQuestionTimer();
      const firstIdx = newFlipped[0];
      const secondIdx = newFlipped[1];
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      // Brief pause to allow the card flip visual animation to complete
      await new Promise((r) => setTimeout(r, 350));
      await evaluateMatch(firstCard, secondCard, 'student');
    }
  };

  const handleTurnTimeout = async () => {
    if (isGameOverRef.current) return;
    setFlippedCardIndices([]);
    setStreak(0);
    await playVoiceMessage('¡Tiempo agotado! Mi turno de buscar en el tablero.');
    if (!isGameOverRef.current) {
      triggerAiTurn();
    }
  };

  // ─── MATCH EVALUATION & AUDIO PRONUNCIATION ─────────────────────────────────

  const evaluateMatch = async (card1: CardItem, card2: CardItem, player: 'student' | 'ai') => {
    if (isGameOverRef.current) {
      isEvaluatingRef.current = false;
      return;
    }

    const isPair = card1.pairId === card2.pairId && card1.side !== card2.side;

    if (isPair) {
      // Synchronous update of ref
      matchedPairIdsRef.current.add(card1.pairId);
      setMatchedPairIds(new Set(matchedPairIdsRef.current));

      const matchedPairObj = pairs.find((p) => p.pair_id === card1.pairId) || null;
      setLastMatchedPair(matchedPairObj);

      if (player === 'student') {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > maxStreak) setMaxStreak(newStreak);

        const gainedPoints = 150 + (newStreak > 1 ? (newStreak - 1) * 50 : 0);
        setStudentScore((prev) => prev + gainedPoints);
        setStudentPairsCount((prev) => prev + 1);

        // Strict linear sequence: 1st announcement -> 2nd English audio
        const phraseMsg = `¡Correcto! Encontraste "${card1.text}" y "${card2.text}". Escucha la pronunciación:`;
        await playVoiceMessage(phraseMsg, 'es');
        if (!isGameOverRef.current) {
          await new Promise((r) => setTimeout(r, 250));
          await playVoiceMessage(card1.audio_phrase, 'en');
        }
      } else {
        setStreak(0);
        setAiScore((prev) => prev + 150);
        setAiPairsCount((prev) => prev + 1);

        const aiCelebration = `¡Punto para mí! Encontré la pareja: "${card1.text}" y "${card2.text}".`;
        await playVoiceMessage(aiCelebration, 'es');
        if (!isGameOverRef.current) {
          await new Promise((r) => setTimeout(r, 250));
          await playVoiceMessage(card1.audio_phrase, 'en');
        }
      }

      setFlippedCardIndices([]);
      isEvaluatingRef.current = false;

      // Check Victory Condition
      if (matchedPairIdsRef.current.size >= totalPairsCountRef.current) {
        handleGameOver();
        return;
      }

      // Next turn
      if (player === 'student') {
        setTutorMessage('¡Excelente racha! Sigues tú.');
        resetQuestionTimerUI();
        startQuestionCountdown();
      } else {
        if (!isGameOverRef.current) {
          aiTurnTimeoutRef.current = setTimeout(() => {
            if (!isGameOverRef.current) triggerAiTurn();
          }, 900);
        }
      }
    } else {
      if (player === 'student') {
        setStreak(0);
      }

      // Wait so the user clearly sees both cards
      await new Promise((r) => setTimeout(r, 1000));
      setFlippedCardIndices([]);

      if (isGameOverRef.current) {
        isEvaluatingRef.current = false;
        return;
      }

      if (player === 'student') {
        // Single concise message, then seamlessly start AI turn without overlapping chatter
        await playVoiceMessage('No hacen pareja. Ahora es mi turno.');
        isEvaluatingRef.current = false;
        if (!isGameOverRef.current) {
          await new Promise((r) => setTimeout(r, 400));
          triggerAiTurn();
        }
      } else {
        await playVoiceMessage('¡Vaya, no son pareja! Tu turno de jugar.');
        isEvaluatingRef.current = false;
        if (!isGameOverRef.current) {
          setCurrentTurn('student');
          resetQuestionTimerUI();
          startQuestionCountdown();
        }
      }
    }
  };

  // ─── AI TUTOR 2-STEP DECISION ENGINE ────────────────────────────────────────

  const triggerAiTurn = async () => {
    if (isGameOverRef.current || isAiThinkingRef.current) return;
    isAiThinkingRef.current = true;
    isEvaluatingRef.current = true;
    setCurrentTurn('ai');
    stopQuestionTimer();

    const mem = twinAiMemoryRef.current;
    const memoryProb = DIFFICULTY_CONFIG[difficulty].memoryFactor;

    // Filter strictly using synchronous Ref
    const unmatchedCards = cards.filter((c) => !matchedPairIdsRef.current.has(c.pairId));

    if (unmatchedCards.length === 0) {
      isAiThinkingRef.current = false;
      isEvaluatingRef.current = false;
      handleGameOver();
      return;
    }

    let firstCardIndex: number = -1;
    let secondCardIndex: number = -1;

    // Special Case: Exactly 1 pair (2 cards) remaining
    if (unmatchedCards.length === 2) {
      firstCardIndex = unmatchedCards[0].index;
      secondCardIndex = unmatchedCards[1].index;
    } else {
      // STEP 1: Scan memory for known pair
      let knownPairIndices: [number, number] | null = null;
      const memoryEntries = Array.from(mem.entries()).filter(
        ([idx, item]) => !matchedPairIdsRef.current.has(item.pairId)
      );

      for (let i = 0; i < memoryEntries.length; i++) {
        for (let j = i + 1; j < memoryEntries.length; j++) {
          const [idx1, item1] = memoryEntries[i];
          const [idx2, item2] = memoryEntries[j];
          if (item1.pairId === item2.pairId && item1.side !== item2.side) {
            knownPairIndices = [idx1, idx2];
            break;
          }
        }
        if (knownPairIndices) break;
      }

      const rollMemory = Math.random() < memoryProb;

      if (knownPairIndices && rollMemory) {
        [firstCardIndex, secondCardIndex] = knownPairIndices;
      } else {
        const unrevealed = unmatchedCards.filter((c) => !mem.has(c.index));
        const pool = unrevealed.length > 0 ? unrevealed : unmatchedCards;
        const chosen1 = pool[Math.floor(Math.random() * pool.length)];
        firstCardIndex = chosen1.index;
      }
    }

    if (isGameOverRef.current) {
      isAiThinkingRef.current = false;
      isEvaluatingRef.current = false;
      return;
    }

    // AI natural pause (500ms)
    await new Promise((r) => setTimeout(r, 500));

    // Reveal 1st card
    setFlippedCardIndices([firstCardIndex]);
    const firstCard = cards[firstCardIndex];
    mem.set(firstCardIndex, firstCard);

    await new Promise((r) => setTimeout(r, 750));
    if (isGameOverRef.current) {
      isAiThinkingRef.current = false;
      isEvaluatingRef.current = false;
      return;
    }

    // STEP 2: Pick 2nd card if not already decided
    if (secondCardIndex === -1 || secondCardIndex === firstCardIndex) {
      let companionInMem: number | null = null;
      for (const [idx, item] of Array.from(mem.entries())) {
        if (idx !== firstCardIndex && item.pairId === firstCard.pairId && item.side !== firstCard.side && !matchedPairIdsRef.current.has(item.pairId)) {
          companionInMem = idx;
          break;
        }
      }

      if (companionInMem !== null && Math.random() < memoryProb) {
        secondCardIndex = companionInMem;
      } else {
        const candidates = cards.filter(
          (c) => c.index !== firstCardIndex && !matchedPairIdsRef.current.has(c.pairId)
        );
        if (candidates.length > 0) {
          const randomChoice = candidates[Math.floor(Math.random() * candidates.length)];
          secondCardIndex = randomChoice.index;
        } else {
          secondCardIndex = firstCardIndex;
        }
      }
    }

    // Reveal 2nd card
    setFlippedCardIndices([firstCardIndex, secondCardIndex]);
    const secondCard = cards[secondCardIndex];
    mem.set(secondCardIndex, secondCard);

    await new Promise((r) => setTimeout(r, 700));
    isAiThinkingRef.current = false;

    if (isGameOverRef.current) {
      isEvaluatingRef.current = false;
      return;
    }

    // Evaluate Match
    await evaluateMatch(firstCard, secondCard, 'ai');
  };

  // ─── GAME OVER HANDLER ──────────────────────────────────────────────────────

  const handleGameOver = async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setIsGameOver(true);
    stopQuestionTimer();
    if (aiTurnTimeoutRef.current) {
      clearTimeout(aiTurnTimeoutRef.current);
    }

    const studentWon = studentPairsCount >= aiPairsCount;
    let endMsg = '';
    if (studentWon) {
      endMsg = `¡Felicidades! Has completado el tablero con ${studentPairsCount} parejas frente a mis ${aiPairsCount}. ¡Excelente memoria y vocabulario!`;
    } else {
      endMsg = `¡Bien jugado! Esta vez encontré ${aiPairsCount} parejas y tú ${studentPairsCount}. ¡Revisemos las cartas para dominar los conceptos!`;
    }

    await playVoiceMessage(endMsg);
  };

  const gridColsClass =
    cards.length <= 12
      ? 'grid-cols-3 sm:grid-cols-4'
      : cards.length <= 16
      ? 'grid-cols-4 sm:grid-cols-4'
      : 'grid-cols-4 sm:grid-cols-5';

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 text-white pb-10">
      {/* ── Top HUD: Difficulty, Score, Turn ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl glass border border-brand-border/60 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all ${
            currentTurn === 'student'
              ? 'bg-brand-cyan/20 border-brand-cyan text-white shadow-lg shadow-brand-cyan/20'
              : 'bg-brand-surface border-white/10 text-brand-text-muted opacity-60'
          }`}>
            <UserIcon size={16} className="text-brand-cyan" />
            <div>
              <div className="text-[10px] uppercase font-bold text-brand-cyan">Tú (Estudiante)</div>
              <div className="text-sm font-extrabold font-mono">{studentPairsCount} Pares ({studentScore} pts)</div>
            </div>
          </div>

          <span className="text-xs font-extrabold text-brand-text-muted">VS</span>

          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all ${
            currentTurn === 'ai'
              ? 'bg-purple-500/20 border-purple-400 text-white shadow-lg shadow-purple-500/20'
              : 'bg-brand-surface border-white/10 text-brand-text-muted opacity-60'
          }`}>
            <Bot size={16} className="text-purple-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-300">Guionbajo</div>
              <div className="text-sm font-extrabold font-mono">{aiPairsCount} Pares ({aiScore} pts)</div>
            </div>
          </div>
        </div>

        {/* Streak & Difficulty */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
            streak > 1
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 flame-streak'
              : 'bg-brand-surface/60 border-white/10 text-brand-text-muted'
          }`}>
            <Flame size={16} className={streak > 1 ? 'text-amber-400 animate-bounce' : ''} />
            <span className="text-xs font-bold">Racha: x{streak}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-brand-surface/80 p-1 rounded-xl border border-white/10 text-xs">
            <Sliders size={13} className="text-brand-cyan ml-1.5" />
            {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                disabled={matchedPairIds.size > 0}
                onClick={() => {
                  setDifficulty(lvl);
                  resetQuestionTimerUI();
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  difficulty === lvl
                    ? 'bg-brand-accent text-white shadow-md'
                    : 'text-brand-text-muted hover:text-white'
                }`}
              >
                {lvl === 'easy' ? 'Fácil' : lvl === 'medium' ? 'Normal' : 'Desafío'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Turn Timer Bar & Live Tutor Voice Message ── */}
      <div className="p-4 rounded-2xl glass border border-brand-border/60 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? 'bg-brand-cyan animate-ping' : 'bg-emerald-400'}`} />
            <span className="font-bold text-white">
              {currentTurn === 'student' ? '🎮 Tu Turno de Voltear Cartas' : '🤖 Pensando jugada del Tutor IA...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono font-bold text-brand-gold">
            <Clock size={14} className={timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-brand-gold'} />
            <span className={timeLeft <= 5 ? 'text-red-400 font-extrabold' : ''}>{timeLeft}s</span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-brand-surface rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-all duration-300 ${
              timeLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-brand-cyan to-brand-accent'
            }`}
            style={{
              width: `${(timeLeft / DIFFICULTY_CONFIG[difficulty].turnTimeSec) * 100}%`,
            }}
          />
        </div>

        <div className="bg-brand-surface/70 px-4 py-2.5 rounded-xl border border-brand-cyan/20 text-xs text-brand-text-secondary flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Volume2 size={15} className={`text-brand-cyan flex-shrink-0 ${isSpeaking ? 'animate-pulse text-brand-gold' : ''}`} />
            <span className="italic leading-relaxed">{tutorMessage}</span>
          </div>
          {lastMatchedPair && (
            <button
              type="button"
              onClick={() => playTutorVoice(lastMatchedPair.audio_phrase, 'en')}
              className="px-2.5 py-1 rounded-lg bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30 text-[11px] font-bold flex-shrink-0 flex items-center gap-1 border border-brand-cyan/30"
              title="Volver a escuchar pronunciación"
            >
              <Volume2 size={12} />
              <span>Pronunciar</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3D Twin Cards Grid Arena ── */}
      <div className={`grid ${gridColsClass} gap-3 sm:gap-4.5 justify-center`}>
        {cards.map((card, idx) => {
          const isFlipped = flippedCardIndices.includes(idx);
          const isMatched = matchedPairIds.has(card.pairId);

          return (
            <div
              key={card.uid}
              className={`twin-card h-32 sm:h-40 w-full cursor-pointer select-none ${
                isFlipped ? 'flipped' : ''
              } ${isMatched ? 'matched pointer-events-none' : ''}`}
              onClick={() => handleStudentCardClick(idx)}
            >
              <div className="twin-card-inner">
                {/* CARD FRONT */}
                <div className="card-face card-front bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-brand-border/80 hover:border-brand-cyan/80 p-3 flex flex-col items-center justify-between shadow-xl transition-all group hover:scale-[1.02]">
                  <div className="w-full flex justify-between items-center text-[10px] text-brand-cyan/40 font-mono">
                    <span>#{(idx + 1).toString().padStart(2, '0')}</span>
                    <Sparkles size={11} className="group-hover:text-brand-cyan transition-colors" />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-surface/60 border border-brand-cyan/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    🔮
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-brand-text-muted group-hover:text-brand-cyan uppercase">
                    GUIONBAJO
                  </span>
                </div>

                {/* CARD BACK */}
                <div
                  className={`card-face card-back-side p-3 sm:p-4 flex flex-col justify-between items-center text-center shadow-2xl border-2 transition-all ${
                    isMatched
                      ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border-emerald-400/80 shadow-emerald-500/20'
                      : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border-brand-cyan shadow-brand-cyan/30'
                  }`}
                >
                  <div className="w-full flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-brand-cyan">
                    <span className="truncate max-w-[80px]">{card.category}</span>
                    <span className="px-1.5 py-0.5 rounded bg-brand-surface text-brand-gold border border-brand-gold/30">
                      {card.side === 'A' ? 'EN' : 'ES'}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl my-1 filter drop-shadow-md">
                    {card.icon}
                  </div>

                  <div className="space-y-0.5 w-full">
                    <div className="font-outfit font-extrabold text-xs sm:text-sm text-white leading-tight">
                      {card.text}
                    </div>
                    {isMatched && (
                      <div className="text-[10px] text-emerald-300 font-semibold truncate">
                        ✓ {card.translation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Game Over Action Bar ── */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-6 rounded-3xl glass border-2 border-brand-accent shadow-[0_0_50px_rgba(108,99,255,0.4)] flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-3xl shadow-xl">
                🏆
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-outfit font-extrabold text-white">
                  ¡Partida de Cartas Gemelas Finalizada!
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  Tu puntuación: <strong className="text-brand-gold">{studentScore} pts</strong> ({studentPairsCount} parejas) | Guionbajo: <strong>{aiScore} pts</strong> ({aiPairsCount} parejas)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={initializeBoard}
                className="px-4 py-2.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Revancha</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onFinishGame({
                    score: studentScore,
                    studentPairsCount,
                    aiPairsCount,
                    maxStreak,
                    difficulty,
                    pairs,
                  });
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
