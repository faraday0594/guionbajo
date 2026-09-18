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
  Film,
  Play,
  Zap,
  Flame,
  LayoutGrid,
  ChevronRight,
} from 'lucide-react';
import MysteryWordGame, { MysteryWordData } from './MysteryWordGame';
import TwinCardsGame, { TwinCardPairData } from './TwinCardsGame';
import POVQuestGame, { StoryQuestData } from './POVQuestGame';
import GameReviewModal from './GameReviewModal';
import { api, playTutorVoice, stopTutorVoice } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface GameArenaProps {
  topic: string;
  sublevel: string;
  lessonId?: string;
  onBackToLesson?: () => void;
  mysteryWordCompleted?: boolean;
  twinCardsCompleted?: boolean;
  povQuestCompleted?: boolean;
  onGameScoreUpdate?: (gameType: 'mystery_word' | 'twin_cards' | 'pov_quest', score: number) => void;
  onFinishClass?: () => void;
  onFinishAndGoToDashboard?: () => Promise<void> | void;
}

export default function GameArena({
  topic,
  sublevel,
  lessonId,
  onBackToLesson,
  mysteryWordCompleted = false,
  twinCardsCompleted = false,
  povQuestCompleted = false,
  onGameScoreUpdate,
  onFinishClass,
  onFinishAndGoToDashboard,
}: GameArenaProps) {
  const router = useRouter();
  // Starts on the Game Hub Lobby panel so the user chooses their game first
  const [activeTab, setActiveTab] = useState<'lobby' | 'twin_cards' | 'mystery_word' | 'pov_quest'>('lobby');
  const [loading, setLoading] = useState(true);
  const [localPovCompleted, setLocalPovCompleted] = useState(povQuestCompleted);

  useEffect(() => {
    if (povQuestCompleted) setLocalPovCompleted(true);
  }, [povQuestCompleted]);

  const [mysteryWordData, setMysteryWordData] = useState<MysteryWordData | null>(null);
  const [twinCardsPairs, setTwinCardsPairs] = useState<TwinCardPairData[]>([]);
  const [questData, setQuestData] = useState<StoryQuestData | null>(null);
  const [isRetryingWord, setIsRetryingWord] = useState(false);
  const [usedMysteryWords, setUsedMysteryWords] = useState<string[]>([]);

  // Track used words so retries always pick a new, different word
  useEffect(() => {
    if (mysteryWordData?.target_word) {
      setUsedMysteryWords((prev) => {
        if (!prev.includes(mysteryWordData.target_word)) {
          return [...prev, mysteryWordData.target_word];
        }
        return prev;
      });
    }
  }, [mysteryWordData?.target_word]);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [lastFinishedGameType, setLastFinishedGameType] = useState<'mystery_word' | 'twin_cards' | 'pov_quest'>('twin_cards');
  const [finalScore, setFinalScore] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [earnedXp, setEarnedXp] = useState(35);

  // Fallback vocabulary bank with multiple distinct words per CEFR level
  const getFallbackWordsForLevel = (lvl: string, top: string): MysteryWordData[] => {
    const isA2 = lvl.includes('A2');
    const isB1 = lvl.includes('B1') || lvl.includes('B2');

    if (isB1) {
      return [
        {
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
        },
        {
          target_word: 'CHALLENGE',
          category: 'Metas y Superación',
          clue_definition: 'Una tarea o situación que pone a prueba las habilidades o el valor de alguien.',
          clue_synonym: "Familia léxica: obstacle, test, achievement, goal. Colocación: 'face a challenge'.",
          image_prompt: 'Clean 2D vector educational art of an athlete looking at a mountain peak, bright colors, no text, no words.',
          clue_first_letter: "La palabra empieza con la letra 'C' y tiene 9 letras.",
          example_sentence: 'Learning a new language is a great challenge.',
          example_translation: 'Aprender un nuevo idioma es un gran desafío.',
          tutor_clue_speeches: [
            'Primera pista: Es una meta difícil que te impulsa a crecer.',
            'Segunda pista: Sinónimo de reto o desafío en inglés.',
            'Mira la ilustración en pantalla.',
            'Última pista: Empieza con C y tiene 9 letras.'
          ]
        },
        {
          target_word: 'OPPORTUNITY',
          category: 'Carrera y Oportunidades',
          clue_definition: 'Una serie de circunstancias favorables para hacer algo provechoso.',
          clue_synonym: "Familia léxica: chance, possibility, future, opening. Colocación: 'golden opportunity'.",
          image_prompt: 'Clean flat vector art of an open door with light coming through into a bright room, no text, no words.',
          clue_first_letter: "La palabra empieza con la letra 'O' y tiene 11 letras.",
          example_sentence: 'This new job is a wonderful career opportunity.',
          example_translation: 'Este nuevo empleo es una maravillosa oportunidad profesional.',
          tutor_clue_speeches: [
            'Primera pista: Es una ocasión dorada para progresar.',
            'Segunda pista: Se abre como una puerta hacia el futuro.',
            'Observa la ilustración que preparé.',
            'Última pista: Empieza con O y tiene 11 letras.'
          ]
        }
      ];
    }

    if (isA2) {
      return [
        {
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
        },
        {
          target_word: 'TOMORROW',
          category: 'Tiempo y Planes Futuros',
          clue_definition: 'El día posterior al día de hoy.',
          clue_synonym: "Familia léxica: future, next day, soon. Colocación: 'tomorrow morning'.",
          image_prompt: 'Clean 2D vector art of a sunrise with a clock ticking forward, bright optimistic colors, no text, no words.',
          clue_first_letter: "La palabra empieza con la letra 'T' y tiene 8 letras.",
          example_sentence: 'Tomorrow we will start our new English module.',
          example_translation: 'Mañana iniciaremos nuestro nuevo módulo de inglés.',
          tutor_clue_speeches: [
            'Pista 1: Es el día que comenzará tras descansar esta noche.',
            'Pista 2: La contraparte futura de yesterday.',
            'Mira la imagen que preparé en el tanque.',
            'Última pista: Empieza con T y tiene 8 letras.'
          ]
        },
        {
          target_word: 'VACATION',
          category: 'Viajes y Descanso',
          clue_definition: 'Periodo de tiempo en el que se suspenden las actividades habituales para descansar o viajar.',
          clue_synonym: "Familia léxica: holiday, travel, beach, summer, relax. Colocación: 'go on vacation'.",
          image_prompt: 'Clean 2D vector flat art of suitcases next to a sunny beach with palm trees, vibrant style, no text, no words.',
          clue_first_letter: "La palabra empieza con la letra 'V' y tiene 8 letras.",
          example_sentence: 'We are planning a sunny vacation in July.',
          example_translation: 'Estamos planeando unas vacaciones soleadas en julio.',
          tutor_clue_speeches: [
            'Primera pista: Es la época favorita del año para viajar o descansar.',
            'Segunda pista: Se relaciona con verano, playas y maletas.',
            'Observa la ilustración en pantalla.',
            'Última pista: Inicia con la letra V y tiene 8 letras.'
          ]
        }
      ];
    }

    return [
      {
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
      },
      {
        target_word: 'BREAKFAST',
        category: 'Comida y Rutina',
        clue_definition: 'La primera comida que se toma por la mañana después de despertar.',
        clue_synonym: "Familia léxica: morning, meal, eggs, coffee, cereal. Colocación: 'have breakfast'.",
        image_prompt: 'Clean flat 2D vector educational illustration of a morning breakfast table with pancakes, orange juice and toast, bright sunny morning, minimal style, no text, no words.',
        clue_first_letter: "La palabra empieza con la letra 'B' y tiene 9 letras.",
        example_sentence: "I always have breakfast at seven o'clock in the morning.",
        example_translation: 'Siempre desayuno a las siete en punto de la mañana.',
        tutor_clue_speeches: [
          '¡Primera pista! Es la comida más importante al inicio del día.',
          'Segunda pista: Se relaciona con café, jugo, huevos y la mañana.',
          'Observa la imagen que preparé para ti.',
          'Última pista: Comienza con la letra B y tiene 9 letras.'
        ]
      },
      {
        target_word: 'PASSPORT',
        category: 'Documentos y Viajes',
        clue_definition: 'Documento oficial con foto para poder viajar a otros países.',
        clue_synonym: "Familia léxica: travel, border, stamp, identification. Colocación: 'valid passport'.",
        image_prompt: 'Clean flat 2D vector illustration of a travel passport document with visa stamps, plane tickets next to it, minimal colorful vector style, no text, no words.',
        clue_first_letter: "La palabra empieza con la letra 'P' y tiene 8 letras.",
        example_sentence: 'You must show your passport at the immigration desk.',
        example_translation: 'Debes mostrar tu pasaporte en el mostrador de inmigración.',
        tutor_clue_speeches: [
          'Primera pista: Es un documento indispensable para cruzar fronteras.',
          'Segunda pista: Lleva tu fotografía y sellos de viaje.',
          'Mira la ilustración que acaba de aparecer en el tanque.',
          'Última pista: Inicia con la letra P y tiene 8 letras.'
        ]
      },
      {
        target_word: 'TEACHER',
        category: 'Profesiones y Escuela',
        clue_definition: 'Persona cuya profesión es enseñar y guiar a estudiantes en una clase.',
        clue_synonym: "Familia léxica: classroom, school, student, learn. Colocación: 'English teacher'.",
        image_prompt: 'Clean 2D vector illustration of a friendly teacher in a bright classroom pointing to an educational board, warm vector style, no text, no words.',
        clue_first_letter: "La palabra empieza con la letra 'T' y tiene 7 letras.",
        example_sentence: 'Our English teacher explains the grammar rules very clearly.',
        example_translation: 'Nuestro profesor de inglés explica las reglas gramaticales muy claramente.',
        tutor_clue_speeches: [
          '¡Pista 1! Es alguien que te ayuda a aprender cada día.',
          'Pista 2: Trabaja en salones de clase y explica lecciones.',
          'Observa la imagen didáctica en pantalla.',
          'Pista final: Empieza con la letra T y tiene 7 letras.'
        ]
      }
    ];
  };

  // Fallback data generator in case network or API is offline
  const getClientFallbackData = () => {
    const fallbackMysteryList = getFallbackWordsForLevel(sublevel, topic);
    const fallbackMystery = fallbackMysteryList[0];

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

    const fallbackQuest: StoryQuestData = {
      story_id: 'future_plans_campus_01',
      title: 'Un Día en el Campus Universitario',
      grammar_topic: topic || "Future simple with 'will'",
      difficulty_level: sublevel || 'A1',
      companion_name: 'Emma',
      companion_gender: 'female',
      companion_voice: 'en-US-JennyNeural',
      companion_avatar: '👩‍🦱',
      nodes: [
        {
          node_id: 'step_1_invitation',
          pov_image_prompt: 'First-person perspective shot sitting on a sunny university campus bench talking to a friendly female classmate with curly brown hair in a denim jacket, making an inviting gesture, warm sunlight, realistic photography, 16:9, no text, no words',
          companion_dialogue: 'Hey! A group of us are heading to the campus pool tomorrow afternoon. Do you want to join us?',
          pedagogical_goal: "Acepta la invitación explícitamente usando 'will' o 'I'll' (ej. 'Sure, I will go' o 'I will join you').",
          hint: "Usa 'will' o 'I'll': 'Yes, I will go with you' o 'I'll join you tomorrow'.",
          example_phrase: 'Yes, I will go with you tomorrow!',
          validation_rules: {
            must_include: ['will', "'ll", 'ill'],
            intent: 'affirmative_acceptance',
            min_words: 2
          }
        },
        {
          node_id: 'step_2_items_to_bring',
          pov_image_prompt: 'First-person perspective sitting inside a modern city bus next to the same smiling female classmate with curly brown hair looking towards you, cheerful atmosphere, realistic photography, 16:9, no text, no words',
          companion_dialogue: "Awesome! I'm so glad you're coming. What will you bring with you tomorrow?",
          pedagogical_goal: "Menciona al menos un objeto que llevarás usando 'I will bring...' o 'I'll bring...'",
          hint: "Di qué llevarás usando 'I will bring [objeto]' (ej. 'I will bring a towel').",
          example_phrase: 'I will bring a towel and sunscreen.',
          validation_rules: {
            must_include: ['will bring', "'ll bring", 'will take', "'ll take", 'will'],
            intent: 'item_declaration',
            min_words: 3
          }
        },
        {
          node_id: 'step_3_meeting_time',
          pov_image_prompt: 'First-person perspective arriving at the entrance of a bright modern campus swimming pool center, companion waving excitedly next to entrance gate, sunny summer day, realistic photography, 16:9, no text, no words',
          companion_dialogue: 'Great! The pool opens at two o\'clock. When will you arrive tomorrow?',
          pedagogical_goal: "Indica la hora a la que llegarás usando 'I will arrive at...' o 'I'll be there at...'",
          hint: "Responde con la hora de llegada usando 'will': 'I will arrive at two o\'clock'.",
          example_phrase: 'I will arrive at two o\'clock.',
          validation_rules: {
            must_include: ['will', "'ll", 'arrive', 'be there', 'come'],
            intent: 'time_declaration',
            min_words: 3
          }
        }
      ]
    };

    return { fallbackMystery, fallbackPairs, fallbackQuest };
  };

  // Load all 3 games from API
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

        // Fetch / Generate POV Quest
        try {
          const questRes = await api.generateQuest(topic, sublevel, lessonId);
          if (questRes && questRes.quest) {
            setQuestData(questRes.quest);
          } else {
            setQuestData(getClientFallbackData().fallbackQuest);
          }
        } catch (qErr) {
          console.warn('Error fetching POV quest, using fallback:', qErr);
          setQuestData(getClientFallbackData().fallbackQuest);
        }
      } catch (err) {
        console.warn('Game load error, activating local client fallback:', err);
        const { fallbackMystery, fallbackPairs, fallbackQuest } = getClientFallbackData();
        setMysteryWordData(fallbackMystery);
        setTwinCardsPairs(fallbackPairs);
        setQuestData(fallbackQuest);
      } finally {
        setLoading(false);
      }
    }

    loadGames();
    return () => {
      stopTutorVoice();
    };
  }, [topic, sublevel, lessonId]);

  // Handle Retry Mystery Word with a Different Word
  const handleRetryMysteryWord = async () => {
    setIsRetryingWord(true);
    try {
      // 1. Attempt generation from backend API
      const res = await api.generateGames(topic, sublevel, lessonId, 'mystery_word');
      if (
        res &&
        res.mystery_word &&
        res.mystery_word.target_word &&
        !usedMysteryWords.includes(res.mystery_word.target_word.toUpperCase())
      ) {
        setMysteryWordData(res.mystery_word);
        toast.success('¡Nueva palabra cargada! Adivina las letras 💡');
        return;
      }

      // 2. Select a different word from the local level bank
      const pool = getFallbackWordsForLevel(sublevel, topic);
      const available = pool.filter((w) => !usedMysteryWords.includes(w.target_word.toUpperCase()));
      const nextWord = available.length > 0 ? available[0] : pool[Math.floor(Math.random() * pool.length)];

      setMysteryWordData(nextWord);
      toast.success('¡Nueva palabra cargada! Adivina las letras 💡');
    } catch (e) {
      console.warn('Error generating new mystery word, using bank:', e);
      const pool = getFallbackWordsForLevel(sublevel, topic);
      const available = pool.filter((w) => !usedMysteryWords.includes(w.target_word.toUpperCase()));
      const nextWord = available.length > 0 ? available[0] : pool[Math.floor(Math.random() * pool.length)];
      setMysteryWordData(nextWord);
      toast.success('¡Nueva palabra cargada! Adivina las letras 💡');
    } finally {
      setIsRetryingWord(false);
    }
  };

  // Handle Mystery Word Completion
  const handleFinishMysteryWord = async (res: {
    score: number;
    mistakes: number;
    maxStreak: number;
    won: boolean;
    data: MysteryWordData;
  }) => {
    // Only validate if student actually WON the game
    if (!res.won) {
      toast.error('Debes adivinar la palabra para completar este reto.');
      return;
    }

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
      toast.success(submitRes.message || '¡Palabra Misteriosa superada con éxito!');
    } catch (e) {
      console.warn('Submit score error:', e);
      setEarnedXp(40);
    }

    if (onGameScoreUpdate) {
      // Award normalized passing grade (85-100%) for guessing the word
      const normalizedClassScore = Math.max(85, Math.min(100, 100 - res.mistakes * 2));
      onGameScoreUpdate('mystery_word', normalizedClassScore);
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
      toast.success(submitRes.message || '¡Cartas Gemelas completadas con éxito!');
    } catch (e) {
      console.warn('Submit score error:', e);
      setEarnedXp(45);
    }

    if (onGameScoreUpdate) {
      // Fair non-punitive score for playing vs AI:
      // Winning: 100%, Tie: 95%, Completed match: 90%
      const normalizedScore = res.studentPairsCount > res.aiPairsCount
        ? 100
        : res.studentPairsCount === res.aiPairsCount
        ? 95
        : 90;
      onGameScoreUpdate('twin_cards', normalizedScore);
    }

    setShowReviewModal(true);
  };

  // Handle POV Quest Completion
  const handleFinishPOVQuest = async (res: {
    score: number;
    attemptCount: number;
    nodesCompleted: number;
    totalNodes: number;
    quest: StoryQuestData;
  }) => {
    setLastFinishedGameType('pov_quest');
    setFinalScore(res.score);
    setMaxStreak(res.nodesCompleted);
    setLocalPovCompleted(true);

    if (onGameScoreUpdate) {
      onGameScoreUpdate('pov_quest', res.score);
    }

    try {
      const submitRes = await api.submitQuestScore({
        quest_id: res.quest.story_id,
        score: res.score,
        attempt_count: res.attemptCount,
        nodes_completed: res.nodesCompleted,
        total_nodes: res.totalNodes,
        lesson_id: lessonId,
      });
      setEarnedXp(submitRes.xp_earned || 50);
      toast.success(submitRes.message || '¡Misión POV completada con éxito!');
    } catch (e) {
      console.warn('Submit quest score error:', e);
      setEarnedXp(50);
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
        <h3 className="text-xl font-outfit font-extrabold mb-2">Preparando Zona de Juegos Didácticos...</h3>
        <p className="text-xs text-brand-text-secondary max-w-sm">
          Adaptando cartas, palabras misteriosas y misiones conversacionales para <strong className="text-brand-cyan">{topic}</strong> ({sublevel}).
        </p>
      </div>
    );
  }

  // ─── LOBBY / GAME SELECTOR VIEW ──────────────────────────────────────────────
  if (activeTab === 'lobby') {
    return (
      <div className="w-full flex flex-col gap-8 animate-fade-up">
        {/* Lobby Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
          <div className="flex items-center gap-3.5">
            {onBackToLesson && (
              <button
                type="button"
                onClick={() => {
                  stopTutorVoice();
                  onBackToLesson();
                }}
                className="p-2.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-white transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Regresar a la lección de teoría"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Pizarra / Lección</span>
              </button>
            )}

            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-accent to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-accent/20">
              <Gamepad2 size={22} className="text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[11px] font-bold uppercase tracking-wider border border-brand-cyan/30">
                  Game Arena
                </span>
                <span className="text-xs font-mono text-brand-text-muted">{sublevel}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-outfit font-extrabold text-white mt-0.5">
                Elige tu Modo de Juego
              </h1>
            </div>
          </div>

          <div className="text-xs text-zinc-400 bg-brand-surface/70 px-3.5 py-2 rounded-xl border border-white/10 self-start sm:self-auto">
            Tema activo: <strong className="text-brand-gold">{topic}</strong>
          </div>
        </div>

        {/* 3 Game Selection Showcase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Misión POV (Visual Novel) */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              stopTutorVoice();
              setActiveTab('pov_quest');
            }}
            className="rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-purple-950/70 via-slate-900/90 to-black border-2 border-purple-500/40 hover:border-purple-400 shadow-xl hover:shadow-purple-500/20 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                  🎬
                </div>
                {(povQuestCompleted || localPovCompleted) ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    Completado
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500/30 to-brand-cyan/30 border border-purple-400/40 text-purple-300 text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                    Nuevo • Conversación
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-outfit font-extrabold text-white group-hover:text-purple-300 transition-colors">
                  Misión POV (Visual Novel)
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Experiencia en primera persona. Habla por micrófono con tu acompañante ({questData?.companion_name || 'Emma'}), supera retos y desbloquea la historia.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/10">
                  📸 Escenas 16:9
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/10">
                  🎙️ Voz en Inglés (STT)
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                  +50 XP
                </span>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <button
                type="button"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-brand-cyan text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 group-hover:opacity-95 transition-all"
              >
                <span>{(povQuestCompleted || localPovCompleted) ? 'Repetir Misión POV' : 'Comenzar Misión POV'}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>

          {/* Card 2: Cartas Gemelas (3D) */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              stopTutorVoice();
              setActiveTab('twin_cards');
            }}
            className="rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-brand-accent/30 via-slate-900/90 to-black border-2 border-brand-accent/40 hover:border-brand-accent shadow-xl hover:shadow-brand-accent/20 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                  🎴
                </div>
                {twinCardsCompleted ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    Completado
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-[10px] font-extrabold uppercase tracking-wider">
                    Memoria & Reflejos
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-outfit font-extrabold text-white group-hover:text-brand-accent transition-colors">
                  Cartas Gemelas (3D)
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Asocia pares conceptuales en inglés y español en un tablero 3D con audio nativo y explicaciones gramaticales al instante.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/10">
                  🔄 Tablero 3D Flip
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/10">
                  🔊 Audio Fonético
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                  +45 XP
                </span>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <button
                type="button"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-accent to-brand-cyan text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-accent/30 flex items-center justify-center gap-2 group-hover:opacity-95 transition-all"
              >
                <span>Jugar Cartas Gemelas</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>

          {/* Card 3: Palabra Misteriosa (Tanque) */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              stopTutorVoice();
              setActiveTab('mystery_word');
            }}
            className="rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-amber-950/60 via-slate-900/90 to-black border-2 border-brand-gold/40 hover:border-brand-gold shadow-xl hover:shadow-brand-gold/20 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                  🔍
                </div>
                {mysteryWordCompleted ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    Completado
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                    ⚠️ Pendiente de completar
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-outfit font-extrabold text-white group-hover:text-brand-gold transition-colors">
                  Palabra Misteriosa (Tanque)
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Descifra el término secreto antes de que se agote la energía del tanque mediante definiciones, sinónimos, imágenes y pistas progresivas.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/10">
                  ⚡ Tanque Reactivo
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/10">
                  💡 4 Niveles de Pistas
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                  +35 XP
                </span>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <button
                type="button"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-gold/30 flex items-center justify-center gap-2 group-hover:opacity-95 transition-all"
              >
                <span>Descifrar Palabra</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* 🏆 Banner de Evaluación y Aprobación de la Clase */}
        {onFinishClass && (() => {
          const completedCount = (povQuestCompleted || localPovCompleted ? 1 : 0) + (twinCardsCompleted ? 1 : 0) + (mysteryWordCompleted ? 1 : 0);
          const allThreeDone = completedCount === 3;

          return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-brand-surface/40 border border-brand-border/60">
              <div className="space-y-2 text-center sm:text-left w-full sm:w-auto">
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award size={16} className="text-brand-gold" />
                    <span>3 Juegos Didácticos Obligatorios</span>
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold font-mono border ${
                    allThreeDone
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  }`}>
                    {completedCount}/3 Completados
                  </span>
                </div>
                
                {/* 3 mini status indicators */}
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap text-xs">
                  <span className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 border font-medium ${
                    (povQuestCompleted || localPovCompleted) ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-zinc-400 border-white/10'
                  }`}>
                    {(povQuestCompleted || localPovCompleted) ? '✓ Misión POV' : '○ Misión POV (Pendiente)'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 border font-medium ${
                    twinCardsCompleted ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-zinc-400 border-white/10'
                  }`}>
                    {twinCardsCompleted ? '✓ Cartas Gemelas' : '○ Cartas Gemelas (Pendiente)'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 border font-medium ${
                    mysteryWordCompleted ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-zinc-400 border-white/10'
                  }`}>
                    {mysteryWordCompleted ? '✓ P. Misteriosa' : '○ P. Misteriosa (Pendiente)'}
                  </span>
                </div>
                <p className="text-[11px] text-brand-text-secondary">
                  Debes jugar y completar los 3 modos para graduar la lección y avanzar al siguiente tema.
                </p>
              </div>

              <button
                type="button"
                onClick={onFinishClass}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition-all flex-shrink-0 cursor-pointer ${
                  allThreeDone
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-brand-cyan text-black font-extrabold shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-brand-accent to-brand-cyan text-white shadow-brand-accent/20'
                }`}
              >
                <span>{allThreeDone ? 'Finalizar Clase y Evaluar (3/3 Listos) 🏆' : `Finalizar Clase (${completedCount}/3 Completados)`}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          );
        })()}
      </div>
    );
  }

  // ─── ACTIVE GAME ARENA VIEW ──────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* ── Top Game Arena Navigation Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          {/* Button to return to Game Lobby */}
          <button
            type="button"
            onClick={() => {
              stopTutorVoice();
              setActiveTab('lobby');
            }}
            className="p-2.5 rounded-xl bg-brand-surface/90 hover:bg-brand-surface border border-white/15 text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer"
            title="Elegir otro modo de juego"
          >
            <LayoutGrid size={15} className="text-brand-cyan" />
            <span>Selector de Juegos</span>
          </button>

          {onBackToLesson && (
            <button
              type="button"
              onClick={() => {
                stopTutorVoice();
                onBackToLesson();
              }}
              className="p-2.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Regresar a la lección de teoría"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Pizarra</span>
            </button>
          )}
        </div>

        {/* Quick Switcher Tabs between the 3 Games */}
        <div className="flex items-center gap-1.5 bg-brand-surface/90 p-1.5 rounded-2xl border border-brand-border/60 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => {
              stopTutorVoice();
              setActiveTab('pov_quest');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
              activeTab === 'pov_quest'
                ? 'bg-gradient-to-r from-purple-600 to-brand-cyan text-white shadow-lg shadow-purple-500/30'
                : 'text-brand-text-muted hover:text-white'
            }`}
          >
            <Film size={14} className={activeTab === 'pov_quest' ? 'text-brand-gold' : ''} />
            <span>Misión POV (Visual Novel)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopTutorVoice();
              setActiveTab('twin_cards');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
              activeTab === 'mystery_word'
                ? 'bg-gradient-to-r from-brand-gold to-amber-500 text-black shadow-lg shadow-brand-gold/30'
                : 'text-brand-text-muted hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>Palabra Misteriosa</span>
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
            onRetryWithNewWord={handleRetryMysteryWord}
            isRetryingWord={isRetryingWord}
            onSwitchGame={() => setActiveTab('pov_quest')}
          />
        )}

        {activeTab === 'pov_quest' && questData && (
          <POVQuestGame
            questData={questData}
            topic={topic}
            sublevel={sublevel}
            lessonId={lessonId}
            onFinishQuest={handleFinishPOVQuest}
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
        questData={questData || undefined}
        onClose={() => setShowReviewModal(false)}
        onReplay={() => {
          setShowReviewModal(false);
          // Tab remains active for replay
        }}
        onGoToDashboard={() => {
          stopTutorVoice();
          setShowReviewModal(false);
          if (onFinishAndGoToDashboard) {
            onFinishAndGoToDashboard();
          } else if (onFinishClass) {
            onFinishClass();
          } else {
            router.push('/dashboard');
          }
        }}
      />
    </div>
  );
}
