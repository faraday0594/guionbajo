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

  // Exact real-time score tracking refs to eliminate off-by-one / stale speech announcements
  const studentScoreRef = useRef<number>(0);
  const aiScoreRef = useRef<number>(0);
  const studentPairsCountRef = useRef<number>(0);
  const aiPairsCountRef = useRef<number>(0);
  const hasAnnouncedFinalFourRef = useRef<boolean>(false);

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

    studentScoreRef.current = 0;
    aiScoreRef.current = 0;
    studentPairsCountRef.current = 0;
    aiPairsCountRef.current = 0;
    hasAnnouncedFinalFourRef.current = false;

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

  // ─── 4-CARDS FINAL CLIMAX ANNOUNCEMENT ──────────────────────────────────────
  const announceFinalFourClimax = async () => {
    if (hasAnnouncedFinalFourRef.current || isGameOverRef.current) return;
    hasAnnouncedFinalFourRef.current = true;

    const sPairs = studentPairsCountRef.current;
    const aPairs = aiPairsCountRef.current;

    let contextualComment = '';
    if (aPairs > sPairs) {
      const diff = aPairs - sPairs;
      if (diff === 1) {
        contextualComment = 'Si encuentras la siguiente pareja, ¡me ganas la partida! Pero si la encuentro yo, ¡me aseguro la victoria!';
      } else if (diff === 2) {
        contextualComment = '¡Con estos dos puntos puedes empatarme el juego! ¿Lograrás la remontada?';
      } else {
        contextualComment = '¡Aún puedes sumar dos parejas y acortar distancia!';
      }
    } else if (sPairs > aPairs) {
      const diff = sPairs - aPairs;
      if (diff === 1) {
        contextualComment = 'Vas ganando por una, ¡pero si la saco yo te puedo dar vuelta al marcador!';
      } else if (diff === 2) {
        contextualComment = '¡Si haces la pareja sellas tu victoria! Pero cuidado, que si la hago yo te empato.';
      } else {
        contextualComment = '¡Llevas una gran ventaja! Con esta jugada puedes coronar la partida.';
      }
    } else {
      contextualComment = `¡Estamos empatados ${sPairs} a ${aPairs}! Quien encuentre esta pareja se lleva la victoria definitiva por ${sPairs + 2} a ${aPairs}.`;
    }

    const climaxSpeech = `¡Atención! Quedan solo 4 cartas en el tablero. Quien haga la siguiente pareja se llevará automáticamente la última y ganará doble puntuación. ${contextualComment}`;
    await playVoiceMessage(climaxSpeech, 'es');
  };

  const handleTurnTimeout = async () => {
    if (isGameOverRef.current) return;
    setFlippedCardIndices([]);
    setStreak(0);
    await playVoiceMessage('¡Tiempo agotado! Mi turno de buscar en el tablero.');
    if (!isGameOverRef.current) {
      if (totalPairsCountRef.current - matchedPairIdsRef.current.size === 2 && !hasAnnouncedFinalFourRef.current) {
        await announceFinalFourClimax();
      }
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
    const unmatchedPairsBefore = totalPairsCountRef.current - matchedPairIdsRef.current.size;

    if (isPair) {
      const wasFinalFourMatch = unmatchedPairsBefore === 2;

      if (wasFinalFourMatch) {
        // Double pair resolution: finding this pair automatically resolves the 1 remaining pair (the last 2 cards)!
        const remainingCards = cards.filter(
          (c) => c.pairId !== card1.pairId && !matchedPairIdsRef.current.has(c.pairId)
        );
        const otherPairId = remainingCards.length > 0 ? remainingCards[0].pairId : null;
        const otherPairObj = otherPairId ? pairs.find((p) => p.pair_id === otherPairId) || null : null;

        // Synchronously add BOTH pairs to ref
        matchedPairIdsRef.current.add(card1.pairId);
        if (otherPairId) {
          matchedPairIdsRef.current.add(otherPairId);
        }
        setMatchedPairIds(new Set(matchedPairIdsRef.current));

        const matchedPairObj = pairs.find((p) => p.pair_id === card1.pairId) || null;
        setLastMatchedPair(matchedPairObj);

        if (player === 'student') {
          const newStreak = streak + 2;
          setStreak(newStreak);
          if (newStreak > maxStreak) setMaxStreak(newStreak);

          studentPairsCountRef.current += 2;
          setStudentPairsCount(studentPairsCountRef.current);

          const gainedPoints = 300 + (newStreak > 1 ? (newStreak - 1) * 75 : 0);
          studentScoreRef.current += gainedPoints;
          setStudentScore(studentScoreRef.current);

          const doubleMsg = `¡Doble pareja conseguida! Encontraste "${card1.text}" y "${card2.text}", y te llevas automáticamente la última pareja: "${otherPairObj?.card_a.text || ''}" y "${otherPairObj?.card_b.text || ''}". ¡Dos puntos en una sola jugada!`;
          await playVoiceMessage(doubleMsg, 'es');

          if (!isGameOverRef.current) {
            await new Promise((r) => setTimeout(r, 250));
            await playVoiceMessage(card1.audio_phrase, 'en');
            if (otherPairObj?.audio_phrase) {
              await new Promise((r) => setTimeout(r, 300));
              await playVoiceMessage(otherPairObj.audio_phrase, 'en');
            }
          }
        } else {
          setStreak(0);
          aiPairsCountRef.current += 2;
          setAiPairsCount(aiPairsCountRef.current);

          aiScoreRef.current += 300;
          setAiScore(aiScoreRef.current);

          const aiDoubleCelebration = `¡Doble pareja para mí! Encontré "${card1.text}" y "${card2.text}", y me llevo también la última pareja: "${otherPairObj?.card_a.text || ''}" y "${otherPairObj?.card_b.text || ''}". ¡Dos puntos de un solo intento!`;
          await playVoiceMessage(aiDoubleCelebration, 'es');

          if (!isGameOverRef.current) {
            await new Promise((r) => setTimeout(r, 250));
            await playVoiceMessage(card1.audio_phrase, 'en');
            if (otherPairObj?.audio_phrase) {
              await new Promise((r) => setTimeout(r, 300));
              await playVoiceMessage(otherPairObj.audio_phrase, 'en');
            }
          }
        }

        setFlippedCardIndices([]);
        isEvaluatingRef.current = false;
        await handleGameOver(studentPairsCountRef.current, aiPairsCountRef.current);
        return;
      }

      // Normal single pair match
      matchedPairIdsRef.current.add(card1.pairId);
      setMatchedPairIds(new Set(matchedPairIdsRef.current));

      const matchedPairObj = pairs.find((p) => p.pair_id === card1.pairId) || null;
      setLastMatchedPair(matchedPairObj);

      if (player === 'student') {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > maxStreak) setMaxStreak(newStreak);

        studentPairsCountRef.current += 1;
        setStudentPairsCount(studentPairsCountRef.current);

        const gainedPoints = 150 + (newStreak > 1 ? (newStreak - 1) * 50 : 0);
        studentScoreRef.current += gainedPoints;
        setStudentScore(studentScoreRef.current);

        // Strict linear sequence: 1st announcement -> 2nd English audio
        const phraseMsg = `¡Correcto! Encontraste "${card1.text}" y "${card2.text}". Escucha la pronunciación:`;
        await playVoiceMessage(phraseMsg, 'es');
        if (!isGameOverRef.current) {
          await new Promise((r) => setTimeout(r, 250));
          await playVoiceMessage(card1.audio_phrase, 'en');
        }
      } else {
        setStreak(0);
        aiPairsCountRef.current += 1;
        setAiPairsCount(aiPairsCountRef.current);

        aiScoreRef.current += 150;
        setAiScore(aiScoreRef.current);

        const aiCelebration = `¡Punto para mí! Encontré la pareja: "${card1.text}" y "${card2.text}".`;
        await playVoiceMessage(aiCelebration, 'es');
        if (!isGameOverRef.current) {
          await new Promise((r) => setTimeout(r, 250));
          await playVoiceMessage(card1.audio_phrase, 'en');
        }
      }

      setFlippedCardIndices([]);
      isEvaluatingRef.current = false;

      const remainingPairsNow = totalPairsCountRef.current - matchedPairIdsRef.current.size;

      // Check Victory Condition
      if (remainingPairsNow <= 0) {
        await handleGameOver(studentPairsCountRef.current, aiPairsCountRef.current);
        return;
      }

      // If exactly 2 pairs (4 cards) remain, trigger the dramatic climax announcement!
      if (remainingPairsNow === 2 && !hasAnnouncedFinalFourRef.current) {
        await announceFinalFourClimax();
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

      const remainingPairsNow = totalPairsCountRef.current - matchedPairIdsRef.current.size;
      if (remainingPairsNow === 2 && !hasAnnouncedFinalFourRef.current) {
        await announceFinalFourClimax();
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

  const handleGameOver = async (finalStudentPairs?: number, finalAiPairs?: number) => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setIsGameOver(true);
    stopQuestionTimer();
    if (aiTurnTimeoutRef.current) {
      clearTimeout(aiTurnTimeoutRef.current);
      aiTurnTimeoutRef.current = null;
    }

    const sPairs = finalStudentPairs !== undefined ? finalStudentPairs : studentPairsCountRef.current;
    const aPairs = finalAiPairs !== undefined ? finalAiPairs : aiPairsCountRef.current;

    let endMsg = '';
    if (sPairs > aPairs) {
      endMsg = `¡Felicidades! Has ganado la partida con ${sPairs} parejas frente a mis ${aPairs}. ¡Excelente memoria y vocabulario!`;
    } else if (sPairs === aPairs) {
      endMsg = `¡Gran partida! Hemos quedado en empate con ${sPairs} parejas cada uno. ¡Demostraste una memoria impecable!`;
    } else {
      endMsg = `¡Bien jugado! Esta vez gané yo con ${aPairs} parejas frente a tus ${sPairs}. ¡Revisemos las cartas para dominar los conceptos!`;
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
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 sm:gap-5 text-white pb-8 px-1 sm:px-0">
      {/* ── Top HUD: Scoreboard, Streak, Difficulty ── */}
      <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl glass border border-brand-border/60 shadow-2xl flex flex-col gap-2.5 sm:gap-3.5">
        {/* Scoreboard: Tú vs Guionbajo */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 items-center">
          {/* Student Score Badge */}
          <div
            className={`flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border transition-all ${
              currentTurn === 'student'
                ? 'bg-brand-cyan/20 border-brand-cyan text-white shadow-lg shadow-brand-cyan/20'
                : 'bg-brand-surface/60 border-white/10 text-brand-text-muted opacity-70'
            }`}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
              <UserIcon size={15} className="text-brand-cyan" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-brand-cyan truncate">
                Tú (Estudiante)
              </div>
              <div className="text-xs sm:text-sm font-extrabold font-mono truncate">
                {studentPairsCount} Pares <span className="text-[10px] sm:text-xs text-white/60">({studentScore} pts)</span>
              </div>
            </div>
          </div>

          {/* AI Score Badge (Guionbajo) */}
          <div
            className={`flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border transition-all ${
              currentTurn === 'ai'
                ? 'bg-purple-500/20 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                : 'bg-brand-surface/60 border-white/10 text-brand-text-muted opacity-70'
            }`}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Bot size={15} className="text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-purple-300 truncate">
                Guionbajo (IA)
              </div>
              <div className="text-xs sm:text-sm font-extrabold font-mono truncate">
                {aiPairsCount} Pares <span className="text-[10px] sm:text-xs text-white/60">({aiScore} pts)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Streak & Difficulty bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-white/[0.06]">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg sm:rounded-xl border transition-all ${
              streak > 1
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 flame-streak'
                : 'bg-brand-surface/60 border-white/10 text-brand-text-muted'
            }`}
          >
            <Flame size={14} className={streak > 1 ? 'text-amber-400 animate-bounce' : ''} />
            <span className="text-[11px] sm:text-xs font-bold">Racha: x{streak}</span>
          </div>

          <div className="flex items-center gap-1 bg-brand-surface/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-white/10 text-xs">
            <Sliders size={12} className="text-brand-cyan ml-1 hidden sm:inline" />
            {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                disabled={matchedPairIds.size > 0}
                onClick={() => {
                  setDifficulty(lvl);
                  resetQuestionTimerUI();
                }}
                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer ${
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
      <div className="p-2.5 sm:p-4 rounded-2xl glass border border-brand-border/60 flex flex-col gap-2 sm:gap-3 shadow-xl">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                isSpeaking ? 'bg-brand-cyan animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span className="font-bold text-white truncate text-[11px] sm:text-xs">
              {currentTurn === 'student' ? '🎮 Tu Turno de Jugar' : '🤖 Turno de Guionbajo...'}
            </span>
          </div>

          {/* Cronómetro / Timer: Always flex-shrink-0 and highly visible */}
          <div className="flex items-center gap-1.5 font-mono font-bold px-2.5 py-1 rounded-lg bg-black/50 border border-brand-gold/40 text-brand-gold flex-shrink-0 shadow-sm">
            <Clock size={13} className={timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-brand-gold'} />
            <span className={`text-xs sm:text-sm font-extrabold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : ''}`}>
              {timeLeft}s
            </span>
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

        {/* High-Stakes Final 4 Cards Banner */}
        {cards.length > 0 && totalPairsCountRef.current - matchedPairIds.size === 2 && !isGameOver && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-between gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-brand-gold/25 to-amber-500/20 border border-brand-gold/60 text-brand-gold text-[11px] sm:text-xs font-bold shadow-lg shadow-brand-gold/15"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles size={14} className="animate-spin text-amber-300 flex-shrink-0" />
              <span className="truncate">⚡ ¡ÚLTIMAS 4 CARTAS! Doble punto</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black text-[9px] sm:text-[10px] font-extrabold uppercase font-mono tracking-wider shadow-sm flex-shrink-0">
              Decisiva
            </span>
          </motion.div>
        )}

        <div className="bg-brand-surface/70 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-brand-cyan/20 text-[11px] sm:text-xs text-brand-text-secondary flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Volume2
              size={14}
              className={`text-brand-cyan flex-shrink-0 ${
                isSpeaking ? 'animate-pulse text-brand-gold' : ''
              }`}
            />
            <span className="italic leading-snug line-clamp-2 sm:line-clamp-1">{tutorMessage}</span>
          </div>
          {lastMatchedPair && (
            <button
              type="button"
              onClick={() => playTutorVoice(lastMatchedPair.audio_phrase, 'en')}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30 text-[10px] sm:text-[11px] font-bold flex-shrink-0 flex items-center gap-1 border border-brand-cyan/30 cursor-pointer"
              title="Volver a escuchar pronunciación"
            >
              <Volume2 size={11} />
              <span>Oír</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3D Twin Cards Grid Arena ── */}
      <div className={`grid ${gridColsClass} gap-2 sm:gap-3.5 md:gap-4.5 justify-center`}>
        {cards.map((card, idx) => {
          const isFlipped = flippedCardIndices.includes(idx);
          const isMatched = matchedPairIds.has(card.pairId);

          return (
            <div
              key={card.uid}
              className={`twin-card h-28 sm:h-36 md:h-40 w-full cursor-pointer select-none ${
                isFlipped ? 'flipped' : ''
              } ${isMatched ? 'matched pointer-events-none' : ''}`}
              onClick={() => handleStudentCardClick(idx)}
            >
              <div className="twin-card-inner">
                {/* CARD FRONT */}
                <div className="card-face card-front bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-brand-border/80 hover:border-brand-cyan/80 p-2 sm:p-3 flex flex-col items-center justify-between shadow-xl transition-all group hover:scale-[1.02] overflow-hidden">
                  <div className="w-full flex justify-between items-center text-[9px] sm:text-[10px] text-brand-cyan/50 font-mono">
                    <span>#{(idx + 1).toString().padStart(2, '0')}</span>
                    <Sparkles size={10} className="group-hover:text-brand-cyan transition-colors" />
                  </div>
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-surface/60 border border-brand-cyan/20 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-110 transition-transform">
                    🔮
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-black tracking-wide sm:tracking-wider text-brand-text-muted group-hover:text-brand-cyan uppercase truncate max-w-full text-center px-1">
                    GUIONBAJO
                  </span>
                </div>

                {/* CARD BACK */}
                <div
                  className={`card-face card-back-side p-2 sm:p-3 md:p-4 flex flex-col justify-between items-center text-center shadow-2xl border-2 transition-all overflow-hidden ${
                    isMatched
                      ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border-emerald-400/80 shadow-emerald-500/20'
                      : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border-brand-cyan shadow-brand-cyan/30'
                  }`}
                >
                  <div className="w-full flex justify-between items-center text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-brand-cyan">
                    <span className="truncate max-w-[60px] sm:max-w-[80px]">{card.category}</span>
                    <span className="px-1 py-0.2 rounded bg-brand-surface text-brand-gold border border-brand-gold/30 text-[8px] sm:text-[9px]">
                      {card.side === 'A' ? 'EN' : 'ES'}
                    </span>
                  </div>

                  <div className="text-2xl sm:text-3xl md:text-4xl my-0.5 filter drop-shadow-md">
                    {card.icon}
                  </div>

                  <div className="space-y-0.5 w-full min-w-0">
                    <div className="font-outfit font-extrabold text-[11px] sm:text-xs md:text-sm text-white leading-tight line-clamp-2">
                      {card.text}
                    </div>
                    {isMatched && (
                      <div className="text-[9px] sm:text-[10px] text-emerald-300 font-semibold truncate">
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
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl shadow-xl ${
                studentPairsCount > aiPairsCount
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : studentPairsCount === aiPairsCount
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
              }`}>
                {studentPairsCount > aiPairsCount ? '🏆' : studentPairsCount === aiPairsCount ? '🤝' : '💡'}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-outfit font-extrabold text-white">
                  {studentPairsCount > aiPairsCount
                    ? '¡Victoria! Has Ganado la Partida'
                    : studentPairsCount === aiPairsCount
                    ? '¡Partida Reñida! Empate Técnico'
                    : '¡Buen Intento! Sigue Practicando'}
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  Tu puntuación: <strong className="text-brand-gold">{studentScore} pts</strong> ({studentPairsCount} parejas) &mdash; Guionbajo: <strong className="text-purple-300">{aiScore} pts</strong> ({aiPairsCount} parejas)
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
                    score: studentScoreRef.current,
                    studentPairsCount: studentPairsCountRef.current,
                    aiPairsCount: aiPairsCountRef.current,
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
