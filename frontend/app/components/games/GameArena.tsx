'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  Layers,
  Sparkles,
  Award,
  ArrowLeft,
  Loader2,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import MysteryWordGame, { MysteryWordData } from './MysteryWordGame';
import TwinCardsGame, { TwinCardPairData } from './TwinCardsGame';
import GameReviewModal from './GameReviewModal';
import { api, playTutorVoice, stopTutorVoice } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface GameArenaProps {
  topic: string;
  sublevel: string;
  lessonId?: string;
  onBackToLesson?: () => void;
}

export default function GameArena({
  topic,
  sublevel,
  lessonId,
  onBackToLesson,
}: GameArenaProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'twin_cards' | 'mystery_word'>('twin_cards');
  const [loading, setLoading] = useState(true);

  const [mysteryWordData, setMysteryWordData] = useState<MysteryWordData | null>(null);
  const [twinCardsPairs, setTwinCardsPairs] = useState<TwinCardPairData[]>([]);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [lastFinishedGameType, setLastFinishedGameType] = useState<'mystery_word' | 'twin_cards'>('twin_cards');
  const [finalScore, setFinalScore] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [earnedXp, setEarnedXp] = useState(35);

  // Load games from API
  useEffect(() => {
    async function loadGames() {
      setLoading(true);
      try {
        let res;
        if (lessonId && !lessonId.startsWith('gen-')) {
          res = await api.getLessonGames(lessonId);
        } else {
          res = await api.generateGames(topic, sublevel, lessonId, 'all', 6);
        }

        if (res.mystery_word) {
          setMysteryWordData(res.mystery_word);
        }
        if (res.twin_cards && Array.isArray(res.twin_cards)) {
          setTwinCardsPairs(res.twin_cards);
        }
      } catch (err) {
        console.warn('Game load error:', err);
        // Fallback default generation will be handled by backend or generator
      } finally {
        setLoading(false);
      }
    }

    loadGames();
    return () => {
      stopTutorVoice();
    };
  }, [topic, sublevel, lessonId]);

  // Handle Mystery Word Completion
  const handleFinishMysteryWord = async (res: {
    score: number;
    mistakes: number;
    maxStreak: number;
    won: boolean;
    data: MysteryWordData;
  }) => {
    setLastFinishedGameType('mystery_word');
    setFinalScore(res.score);
    setMaxStreak(res.maxStreak);

    try {
      const submitRes = await api.submitGameScore({
        game_type: 'mystery_word',
        score: res.score,
        mistakes: res.mistakes,
        max_streak: res.maxStreak,
        lesson_id: lessonId,
      });
      setEarnedXp(submitRes.xp_earned || 35);
      toast.success(submitRes.message || '¡Puntaje guardado con éxito!');
    } catch (e) {
      console.warn('Submit score error:', e);
      setEarnedXp(40);
    }

    setShowReviewModal(true);
  };

  // Handle Twin Cards Completion
  const handleFinishTwinCards = async (res: {
    score: number;
    studentPairsCount: number;
    aiPairsCount: number;
    maxStreak: number;
    difficulty: string;
    pairs: TwinCardPairData[];
  }) => {
    setLastFinishedGameType('twin_cards');
    setFinalScore(res.score);
    setMaxStreak(res.maxStreak);

    try {
      const submitRes = await api.submitGameScore({
        game_type: 'twin_cards',
        score: res.score,
        max_streak: res.maxStreak,
        lesson_id: lessonId,
      });
      setEarnedXp(submitRes.xp_earned || 45);
      toast.success(submitRes.message || '¡Puntaje guardado con éxito!');
    } catch (e) {
      console.warn('Submit score error:', e);
      setEarnedXp(45);
    }

    setShowReviewModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center animate-ping absolute inset-0" />
          <div className="w-16 h-16 rounded-full bg-brand-surface border-2 border-brand-cyan flex items-center justify-center relative z-10 shadow-xl shadow-brand-cyan/20">
            <Gamepad2 className="w-8 h-8 text-brand-cyan animate-pulse" />
          </div>
        </div>
        <h3 className="text-xl font-outfit font-extrabold mb-2">Preparando Juegos Didácticos...</h3>
        <p className="text-xs text-brand-text-secondary max-w-sm">
          Adaptando cartas y misterios para <strong className="text-brand-cyan">{topic}</strong> ({sublevel}).
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* ── Game Mode Switcher Tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
        <div className="flex items-center gap-3">
          {onBackToLesson && (
            <button
              type="button"
              onClick={() => {
                stopTutorVoice();
                onBackToLesson();
              }}
              className="p-2.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Regresar a la lección de teoría"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Pizarra / Lección</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-accent/20 border border-brand-accent flex items-center justify-center">
              <Gamepad2 size={18} className="text-brand-accent" />
            </div>
            <div>
              <h1 className="text-lg font-outfit font-extrabold text-white">Game Arena Educativo</h1>
              <p className="text-[11px] text-brand-text-muted">Práctica lúdica posterior a la clase</p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-brand-surface/90 p-1.5 rounded-2xl border border-brand-border/60">
          <button
            type="button"
            onClick={() => {
              stopTutorVoice();
              setActiveTab('twin_cards');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'twin_cards'
                ? 'bg-gradient-to-r from-brand-accent to-brand-cyan text-white shadow-lg shadow-brand-accent/30'
                : 'text-brand-text-muted hover:text-white'
            }`}
          >
            <Layers size={14} />
            <span>Cartas Gemelas (3D)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopTutorVoice();
              setActiveTab('mystery_word');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'mystery_word'
                ? 'bg-gradient-to-r from-brand-accent to-brand-cyan text-white shadow-lg shadow-brand-accent/30'
                : 'text-brand-text-muted hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>Palabra Misteriosa (Tanque)</span>
          </button>
        </div>
      </div>

      {/* ── Active Game Arena Engine ── */}
      <div className="w-full">
        {activeTab === 'twin_cards' && (
          <TwinCardsGame
            pairs={twinCardsPairs}
            topic={topic}
            sublevel={sublevel}
            onFinishGame={handleFinishTwinCards}
            onSwitchGame={() => setActiveTab('mystery_word')}
          />
        )}

        {activeTab === 'mystery_word' && mysteryWordData && (
          <MysteryWordGame
            data={mysteryWordData}
            topic={topic}
            sublevel={sublevel}
            onFinishGame={handleFinishMysteryWord}
            onSwitchGame={() => setActiveTab('twin_cards')}
          />
        )}
      </div>

      {/* ── Pedagogical Review & XP Closing Modal ── */}
      <GameReviewModal
        isOpen={showReviewModal}
        gameType={lastFinishedGameType}
        score={finalScore}
        maxStreak={maxStreak}
        xpEarned={earnedXp}
        topic={topic}
        sublevel={sublevel}
        twinPairs={twinCardsPairs}
        mysteryWordData={mysteryWordData || undefined}
        onClose={() => setShowReviewModal(false)}
        onReplay={() => {
          setShowReviewModal(false);
          // Tab remains active for replay
        }}
        onGoToDashboard={() => {
          stopTutorVoice();
          router.push('/dashboard');
        }}
      />
    </div>
  );
}
