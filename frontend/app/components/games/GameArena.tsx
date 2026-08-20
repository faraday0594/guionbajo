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

  // Fallback data generator in case network or API is offline
  const getClientFallbackData = () => {
    const isA2 = sublevel.includes('A2');
    const isB1 = sublevel.includes('B1') || sublevel.includes('B2');

    const fallbackMystery: MysteryWordData = isB1 ? {
      target_word: 'EXPERIENCE',
      category: 'Vida y Present Perfect',
      clue_definition: 'Conocimiento o habilidad práctica adquirida a través de la vivencia directa de eventos.',
      clue_synonym: "Familia léxica: knowledge, background, skill, trial. Colocación: 'work experience'.",
      image_prompt: 'Clean 2D vector flat art of a young professional climbing stairs towards goals, achieving milestones, bright vector style, no text, no words.',
      clue_first_letter: "La palabra empieza con la letra 'E' y tiene 10 letras.",
      example_sentence: 'Traveling abroad gives you unforgettable life experience.',
      example_translation: 'Viajar al extranjero te brinda una experiencia de vida inolvidable.',
      tutor_clue_speeches: [
        '¡Pista 1! Es aquello que ganas al vivir situaciones y superar desafíos.',
        'Segunda pista: Es fundamental en entrevistas laborales y en el Present Perfect.',
        'Observa la ilustración generada para inspirarte.',
        'Última pista: Comienza con la letra E y tiene 10 letras.'
      ]
    } : isA2 ? {
      target_word: 'YESTERDAY',
      category: 'Marcadores de Tiempo Pasado',
      clue_definition: 'El día inmediatamente anterior al día de hoy.',
      clue_synonym: "Familia léxica: past, time, morning, last night. Colocación: 'yesterday afternoon'.",
      image_prompt: 'Clean 2D vector educational calendar illustration showing a past highlighted day marked with a checkmark, clean vector art, no text, no words.',
      clue_first_letter: "La palabra empieza con la letra 'Y' y tiene 9 letras.",
      example_sentence: 'Yesterday I visited my grandparents and watched a movie.',
      example_translation: 'Ayer visité a mis abuelos y vi una película.',
      tutor_clue_speeches: [
        '¡Pista 1! Es un marcador temporal que nos lleva al pasado reciente.',
        'Segunda pista: Se refiere al día que terminó hace unas horas.',
        'Revisa la ilustración que apareció en pantalla.',
        'Última pista: Comienza con la letra Y y tiene 9 letras.'
      ]
    } : {
      target_word: 'AIRPORT',
      category: 'Viajes y Lugares',
      clue_definition: 'Lugar grande con pistas de despegue donde las personas abordan aviones para viajar.',
      clue_synonym: "Familia léxica: airplane, terminal, flight, boarding pass. Colocación: 'at the airport'.",
      image_prompt: 'Clean flat 2D vector educational illustration of a modern airport departure terminal with airplanes on runway, sunny day, minimal style, vibrant colors, no text, no words.',
      clue_first_letter: "La palabra empieza con la letra 'A' y tiene 7 letras.",
      example_sentence: 'We arrived at the airport two hours before our flight.',
      example_translation: 'Llegamos al aeropuerto dos horas antes de nuestro vuelo.',
      tutor_clue_speeches: [
        '¡Primera pista! Es un lugar donde despegas hacia nuevas aventuras.',
        'Segunda pista: Se relaciona con aviones, terminales y maletas.',
        'Mira la ilustración en pantalla. ¿Qué lugar representa?',
        'Última pista: Empieza con la letra A y tiene 7 letras.'
      ]
    };

    const fallbackPairs: TwinCardPairData[] = [
      {
        pair_id: 'pair-1',
        card_a: { text: 'Good morning', icon: '🌅', category: 'Saludos', translation: 'Buenos días' },
        card_b: { text: 'Buenos días', icon: '☀️', category: 'Saludos', translation: 'Good morning' },
        audio_phrase: 'Good morning, nice to meet you today!',
        audio_translation: '¡Buenos días, un gusto conocerte hoy!',
        explanation: "'Good morning' es el saludo formal y amigable que se utiliza desde el amanecer hasta el mediodía."
      },
      {
        pair_id: 'pair-2',
        card_a: { text: 'Thank you', icon: '🙏', category: 'Cortesía', translation: 'Gracias' },
        card_b: { text: 'Gracias', icon: '✨', category: 'Cortesía', translation: 'Thank you' },
        audio_phrase: 'Thank you very much for your help.',
        audio_translation: 'Muchas gracias por tu ayuda.',
        explanation: "'Thank you' es la fórmula universal en inglés para expresar gratitud y cortesía."
      },
      {
        pair_id: 'pair-3',
        card_a: { text: 'See you later', icon: '👋', category: 'Despedidas', translation: 'Hasta luego' },
        card_b: { text: 'Hasta luego', icon: '⏳', category: 'Despedidas', translation: 'See you later' },
        audio_phrase: 'Goodbye, see you later tomorrow!',
        audio_translation: '¡Adiós, nos vemos más tarde mañana!',
        explanation: "'See you later' se utiliza al despedirte de alguien a quien esperas volver a ver pronto."
      },
      {
        pair_id: 'pair-4',
        card_a: { text: 'My name is', icon: '🪪', category: 'Presentaciones', translation: 'Mi nombre es' },
        card_b: { text: 'Mi nombre es', icon: '🗣️', category: 'Presentaciones', translation: 'My name is' },
        audio_phrase: 'Hello, my name is Alex and I am a student.',
        audio_translation: 'Hola, mi nombre es Alex y soy estudiante.',
        explanation: "'My name is...' es la estructura básica para presentarte con confianza."
      },
      {
        pair_id: 'pair-5',
        card_a: { text: 'Please', icon: '🤝', category: 'Cortesía', translation: 'Por favor' },
        card_b: { text: 'Por favor', icon: '🪄', category: 'Cortesía', translation: 'Please' },
        audio_phrase: 'Could you help me with this exercise, please?',
        audio_translation: '¿Podrías ayudarme con este ejercicio, por favor?',
        explanation: "'Please' es la palabra clave de cortesía para realizar solicitudes de manera amable."
      },
      {
        pair_id: 'pair-6',
        card_a: { text: 'You are welcome', icon: '😊', category: 'Cortesía', translation: 'De nada' },
        card_b: { text: 'De nada', icon: '🌟', category: 'Cortesía', translation: 'You are welcome' },
        audio_phrase: 'You are very welcome, anytime!',
        audio_translation: '¡De nada, cuando quieras!',
        explanation: "'You are welcome' es la respuesta estándar y educada ante un agradecimiento ('Thank you')."
      }
    ];

    return { fallbackMystery, fallbackPairs };
  };

  // Load games from API
  useEffect(() => {
    async function loadGames() {
      setLoading(true);
      try {
        let res: any = null;
        if (lessonId && !lessonId.startsWith('gen-')) {
          try {
            res = await api.getLessonGames(lessonId);
          } catch (e) {
            console.warn('getLessonGames failed, attempting generateGames fallback:', e);
            res = await api.generateGames(topic, sublevel, lessonId, 'all', 6);
          }
        } else {
          res = await api.generateGames(topic, sublevel, lessonId, 'all', 6);
        }

        if (res && res.mystery_word) {
          setMysteryWordData(res.mystery_word);
        } else {
          setMysteryWordData(getClientFallbackData().fallbackMystery);
        }

        if (res && res.twin_cards && Array.isArray(res.twin_cards) && res.twin_cards.length > 0) {
          setTwinCardsPairs(res.twin_cards);
        } else {
          setTwinCardsPairs(getClientFallbackData().fallbackPairs);
        }
      } catch (err) {
        console.warn('Game load error, activating local client fallback:', err);
        const { fallbackMystery, fallbackPairs } = getClientFallbackData();
        setMysteryWordData(fallbackMystery);
        setTwinCardsPairs(fallbackPairs);
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
