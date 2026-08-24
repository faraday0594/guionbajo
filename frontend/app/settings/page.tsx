'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  api,
  getSavedPreferredVoice,
  setSavedPreferredVoice,
  testVoicePreview,
  stopTutorVoice,
} from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import {
  Save,
  Key,
  LogOut,
  ArrowLeft,
  Shield,
  Volume2,
  VolumeX,
  Play,
  Square,
  Check,
  Sparkles,
  Bot,
  Globe,
  Radio,
  User,
  Loader2,
} from 'lucide-react';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';

export interface VoiceItem {
  id: string;
  name: string;
  provider: 'minimax' | 'google' | 'edge';
  gender: 'female' | 'male';
  lang: string;
  badge?: string;
  description: string;
  preview_text?: string;
}

export function getVoiceProvider(v: Partial<VoiceItem>): 'minimax' | 'google' | 'edge' {
  if (v.provider === 'minimax' || v.provider === 'google' || v.provider === 'edge') {
    return v.provider;
  }
  const id = (v.id || '').toLowerCase();
  if (id.startsWith('google') || id.startsWith('gtts')) return 'google';
  if (id.startsWith('edge') || id.startsWith('es-') || id.startsWith('en-')) return 'edge';
  return 'minimax';
}

const CURATED_VOICES: VoiceItem[] = [
  // ─── 1. MINIMAX NEURAL HD VOICES ──────────────────────────────────────────
  {
    id: 'female-yujie',
    name: 'Yujie (MiniMax - Madura / Elegante)',
    provider: 'minimax',
    gender: 'female',
    lang: 'es',
    badge: 'Recomendada',
    description: 'Voz femenina madura, calmada y con dicción pedagógica excelente para tutoría',
    preview_text: '¡Hola! Soy tu tutora de inglés. Hoy vamos a dominar la pronunciación y gramática juntos.',
  },
  {
    id: 'female-chengshu',
    name: 'Chengshu (MiniMax - Profesional)',
    provider: 'minimax',
    gender: 'female',
    lang: 'es',
    badge: 'Formal',
    description: 'Voz femenina clara, ejecutiva, articulada y con tono seguro',
    preview_text: '¡Hola! Revisemos la estructura gramatical con mucha atención en este ejemplo.',
  },
  {
    id: 'female-tianmei',
    name: 'Tianmei (MiniMax - Dulce)',
    provider: 'minimax',
    gender: 'female',
    lang: 'es',
    badge: 'Motivadora',
    description: 'Voz femenina dulce, amigable y motivadora para guiarte en el aprendizaje',
    preview_text: '¡Excelente trabajo! Vamos a practicar una nueva frase para mejorar tu fluidez.',
  },
  {
    id: 'female-shaonv',
    name: 'Shaonv (MiniMax - Juvenil)',
    provider: 'minimax',
    gender: 'female',
    lang: 'es',
    badge: 'Juvenil',
    description: 'Voz femenina juvenil, cálida y enérgica',
    preview_text: '¡Hola! Estoy lista para ayudarte con todos tus ejercicios de inglés hoy.',
  },
  {
    id: 'audiobook_female_1',
    name: 'Narradora Audiobook (MiniMax)',
    provider: 'minimax',
    gender: 'female',
    lang: 'es',
    badge: 'Narración',
    description: 'Voz femenina envolvente, pausada y didáctica para explicaciones',
    preview_text: 'Observa con atención cómo cambia el significado de la oración al usar este conector.',
  },
  {
    id: 'presenter_female',
    name: 'Locutora HD (MiniMax)',
    provider: 'minimax',
    gender: 'female',
    lang: 'es',
    badge: 'Studio HD',
    description: 'Voz femenina con tono de locutora profesional y claridad de estudio',
    preview_text: 'Bienvenidos a la sesión de hoy. Analicemos los puntos clave de esta lección.',
  },
  {
    id: 'male-qn-qingse',
    name: 'Qingse (MiniMax - Joven)',
    provider: 'minimax',
    gender: 'male',
    lang: 'es',
    badge: 'Dinámico',
    description: 'Voz masculina joven, dinámica y conversacional',
    preview_text: '¡Qué tal! Vamos a darle ritmo a esta práctica de conversación en inglés.',
  },
  {
    id: 'male-qn-jingying',
    name: 'Jingying (MiniMax - Ejecutivo)',
    provider: 'minimax',
    gender: 'male',
    lang: 'es',
    badge: 'Ejecutivo',
    description: 'Voz masculina formal con dicción nítida, firme y precisa',
    preview_text: 'Correcto. Fíjate en la posición de la lengua y los labios al pronunciar este fonema.',
  },
  {
    id: 'male-qn-daxuesheng',
    name: 'College Male (MiniMax - Universitario)',
    provider: 'minimax',
    gender: 'male',
    lang: 'es',
    badge: 'Moderno',
    description: 'Voz masculina fresca, moderna y conversacional',
    preview_text: '¡Hola! Practiquemos este diálogo paso a paso para ganar total confianza.',
  },
  {
    id: 'presenter_male',
    name: 'Locutor HD (MiniMax)',
    provider: 'minimax',
    gender: 'male',
    lang: 'es',
    badge: 'Studio HD',
    description: 'Voz masculina con tono de presentador de noticias',
    preview_text: 'Iniciamos la sección práctica. Presta atención al siguiente ejemplo fonético.',
  },
  {
    id: 'audiobook_male_1',
    name: 'Narrador Audiobook (MiniMax)',
    provider: 'minimax',
    gender: 'male',
    lang: 'es',
    badge: 'Narrador',
    description: 'Voz masculina profunda, reflexiva y calmada',
    preview_text: 'Cada palabra que practicamos hoy te acerca más a tu meta de dominar el inglés.',
  },

  // ─── 2. GOOGLE TTS VOICES ────────────────────────────────────────────────
  {
    id: 'google-es',
    name: 'Google Español (Latinoamérica)',
    provider: 'google',
    gender: 'female',
    lang: 'es-419',
    badge: 'Google Oficial',
    description: 'Voz clásica y natural de Google en español latinoamericano, limpia y nítida',
    preview_text: 'Hola, soy la voz de Google. Estoy lista para guiarte en tu aprendizaje de inglés.',
  },
  {
    id: 'google-es-mx',
    name: 'Google Español (México)',
    provider: 'google',
    gender: 'female',
    lang: 'es-MX',
    badge: 'México',
    description: 'Voz oficial de Google con entonación de México',
    preview_text: 'Hola, esta es la voz de Google México. Practiquemos juntos tus frases de inglés.',
  },
  {
    id: 'google-es-es',
    name: 'Google Español (España)',
    provider: 'google',
    gender: 'female',
    lang: 'es-ES',
    badge: 'España',
    description: 'Voz clásica de Google con acento castellano de España',
    preview_text: 'Hola, soy la voz de Google en español de España. Practiquemos juntos esta lección.',
  },
  {
    id: 'google-en-us',
    name: 'Google English (Estados Unidos)',
    provider: 'google',
    gender: 'female',
    lang: 'en-US',
    badge: 'Google US',
    description: 'Voz estándar de Google en inglés americano para entrenamiento fonético',
    preview_text: "Hello! I am the Google English voice. Let's practice your pronunciation together.",
  },
  {
    id: 'google-en-uk',
    name: 'Google English (Reino Unido / British)',
    provider: 'google',
    gender: 'female',
    lang: 'en-GB',
    badge: 'Google UK',
    description: 'Voz estándar de Google en inglés británico con excelente dicción',
    preview_text: "Hello! I am the Google British English voice. Let's practice your pronunciation.",
  },

  // ─── 3. MICROSOFT EDGE NEURAL STUDIO VOICES ─────────────────────────────
  {
    id: 'es-MX-DaliaNeural',
    name: 'Dalia (Edge Neural - México Femenina)',
    provider: 'edge',
    gender: 'female',
    lang: 'es-MX',
    badge: 'Ultra Natural',
    description: 'Voz neuronal de alta fidelidad, extremadamente fluida, natural y agradable',
    preview_text: 'Hola, soy Dalia. Te acompañaré durante toda tu lección de inglés con explicaciones claras.',
  },
  {
    id: 'es-MX-JorgeNeural',
    name: 'Jorge (Edge Neural - México Masculino)',
    provider: 'edge',
    gender: 'male',
    lang: 'es-MX',
    badge: 'Cálida',
    description: 'Voz neuronal cálida, amable y con excelente dicción para tutoría',
    preview_text: 'Hola, soy Jorge. Vamos a revisar paso a paso cada detalle para que hables con total confianza.',
  },
  {
    id: 'es-ES-ElviraNeural',
    name: 'Elvira (Edge Neural - España Femenina)',
    provider: 'edge',
    gender: 'female',
    lang: 'es-ES',
    badge: 'España HD',
    description: 'Voz neuronal de España, nítida, formal y pedagógica',
    preview_text: 'Hola, soy Elvira. Analicemos juntos las reglas y patrones de esta lección.',
  },
  {
    id: 'es-ES-AlvaroNeural',
    name: 'Álvaro (Edge Neural - España Masculino)',
    provider: 'edge',
    gender: 'male',
    lang: 'es-ES',
    badge: 'España HD',
    description: 'Voz neuronal serena, profesional y clara',
    preview_text: 'Hola, soy Álvaro. Con dedicación y práctica constante lograrás dominar el idioma.',
  },
  {
    id: 'es-US-PalomaNeural',
    name: 'Paloma (Edge Neural - US Spanish Bilingüe)',
    provider: 'edge',
    gender: 'female',
    lang: 'es-US',
    badge: 'Bilingüe HD',
    description: 'Voz femenina bilingüe con entonación natural de español estadounidense',
    preview_text: 'Hola, soy Paloma. Practicaremos la transición fonética entre español e inglés.',
  },
  {
    id: 'es-US-AlonsoNeural',
    name: 'Alonso (Edge Neural - US Spanish Bilingüe)',
    provider: 'edge',
    gender: 'male',
    lang: 'es-US',
    badge: 'Bilingüe HD',
    description: 'Voz masculina bilingüe con excelente articulación de ambos idiomas',
    preview_text: 'Hola, soy Alonso. Esta lección te ayudará a pronunciar como un hablante nativo.',
  },
  {
    id: 'en-US-RogerNeural',
    name: 'Roger (Edge Neural - Inglés Estudio HD)',
    provider: 'edge',
    gender: 'male',
    lang: 'en-US',
    badge: 'English Coach',
    description: 'Voz nativa de estudio en inglés americano, perfecta para entrenamiento fonético',
    preview_text: "Hello there! I am Roger, your native English pronunciation coach. Let's get started!",
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (Edge Neural - Inglés Estudio HD)',
    provider: 'edge',
    gender: 'female',
    lang: 'en-US',
    badge: 'English Coach',
    description: 'Voz nativa de estudio en inglés americano con claridad y tono natural impecable',
    preview_text: 'Hi everyone! I am Jenny. We will practice natural phrases and pronunciation rhythm.',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [savedMaskedKey, setSavedMaskedKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);

  const [voices, setVoices] = useState<VoiceItem[]>(CURATED_VOICES);
  const [selectedVoice, setSelectedVoice] = useState<string>('female-yujie');
  const [activeTab, setActiveTab] = useState<'all' | 'minimax' | 'google' | 'edge'>('all');
  
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load initial settings and voices
  useEffect(() => {
    // 1. Local saved preferred voice
    const localVoice = getSavedPreferredVoice();
    if (localVoice) {
      setSelectedVoice(localVoice);
    }

    // 2. Fetch voices catalog & user profile settings from backend
    async function loadData() {
      try {
        const [voicesRes, settingsRes] = await Promise.allSettled([
          api.getVoices(),
          api.getSettings(),
        ]);

        if (voicesRes.status === 'fulfilled' && Array.isArray(voicesRes.value) && voicesRes.value.length > 0) {
          // Merge backend list with curated metadata ensuring provider is never missing
          const enriched = voicesRes.value.map((bv: any) => {
            const match = CURATED_VOICES.find((cv) => cv.id === bv.id);
            return {
              id: bv.id,
              name: bv.name || match?.name || bv.id,
              provider: getVoiceProvider(bv),
              gender: bv.gender || match?.gender || 'female',
              lang: bv.lang || match?.lang || 'es',
              badge: bv.badge || match?.badge,
              description: bv.description || match?.description || 'Voz neuronal para lecciones',
              preview_text: bv.preview_text || match?.preview_text,
            };
          });
          setVoices(enriched);
        }

        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          if (settingsRes.value.minimax_api_key) {
            setSavedMaskedKey(settingsRes.value.minimax_api_key);
          }
          if (settingsRes.value.preferred_voice) {
            setSelectedVoice(settingsRes.value.preferred_voice);
            setSavedPreferredVoice(settingsRes.value.preferred_voice);
          }
        }
      } catch (err) {
        console.warn('Error loading settings/voices:', err);
      }
    }

    loadData();

    return () => {
      stopTutorVoice();
      activeAudioRef.current = null;
    };
  }, []);

  const handleSaveKey = async () => {
    if (!apiKey) return;
    setSavingKey(true);
    try {
      await api.saveMinimaxKey(apiKey);
      toast.success('Clave API guardada con éxito');
      setSavedMaskedKey(`${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);
      setApiKey('');
    } catch (err) {
      toast.error('Error al guardar la clave API');
    } finally {
      setSavingKey(false);
    }
  };

  const handleSelectVoice = async (voiceId: string) => {
    setSelectedVoice(voiceId);
    setSavedPreferredVoice(voiceId);

    const voiceObj = voices.find((v) => v.id === voiceId);
    toast.success(`Voz del tutor activada: ${voiceObj?.name || voiceId}`, {
      icon: '🎙️',
      duration: 3500,
    });

    try {
      await api.savePreferredVoice(voiceId);
    } catch (_) {}
  };

  const handlePlayVoicePreview = async (voice: VoiceItem) => {
    // If already playing this voice, stop it
    if (playingVoiceId === voice.id || loadingVoiceId === voice.id) {
      stopTutorVoice();
      activeAudioRef.current = null;
      setLoadingVoiceId(null);
      setPlayingVoiceId(null);
      setAudioProgress(0);
      return;
    }

    stopTutorVoice();
    activeAudioRef.current = null;
    setPlayingVoiceId(null);
    setAudioProgress(0);
    setLoadingVoiceId(voice.id); // State is 'thinking' while downloading audio

    const previewMsg =
      voice.preview_text ||
      `¡Hola! Soy tu tutor en Guionbajo. Esta es una prueba de la voz ${voice.name}.`;

    try {
      const audio = await testVoicePreview(voice.id, previewMsg);
      if (audio) {
        activeAudioRef.current = audio;

        // ONLY activate 'speaking' state when audio actually begins playing
        audio.onplay = () => {
          setLoadingVoiceId(null);
          setPlayingVoiceId(voice.id);
        };

        audio.ontimeupdate = () => {
          if (audio.duration && audio.duration > 0) {
            setAudioProgress((audio.currentTime / audio.duration) * 100);
          }
        };

        audio.onended = () => {
          activeAudioRef.current = null;
          setLoadingVoiceId(null);
          setPlayingVoiceId(null);
          setAudioProgress(0);
        };

        audio.onerror = () => {
          activeAudioRef.current = null;
          setLoadingVoiceId(null);
          setPlayingVoiceId(null);
          setAudioProgress(0);
          toast.error(`No se pudo reproducir la muestra de ${voice.name}`);
        };
      } else {
        setLoadingVoiceId(null);
        setPlayingVoiceId(null);
        setAudioProgress(0);
      }
    } catch (err) {
      activeAudioRef.current = null;
      setLoadingVoiceId(null);
      setPlayingVoiceId(null);
      setAudioProgress(0);
      toast.error('Error al reproducir la muestra de audio');
    }
  };

  const handleLogout = () => {
    stopTutorVoice();
    clearToken();
    toast.success('Sesión cerrada correctamente');
    router.push('/login');
  };

  // Filter voices based on active tab
  const filteredVoices = voices.filter((v) => {
    const prov = getVoiceProvider(v);
    if (activeTab === 'all') return true;
    return prov === activeTab;
  });

  const selectedVoiceObj = voices.find((v) => v.id === selectedVoice) || voices[0];
  const activeAvatarState = loadingVoiceId ? 'thinking' : playingVoiceId ? 'speaking' : 'idle';

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 max-w-5xl mx-auto text-white">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2.5 glass rounded-2xl hover:bg-brand-surface border border-brand-border text-brand-text-secondary hover:text-white transition-all flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver a la Pizarra</span>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-outfit font-black tracking-tight">
              Ajustes del Sistema
            </h1>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              Personaliza la voz de tu tutor, motor de síntesis e integraciones de IA.
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-white transition-all text-xs sm:text-sm font-semibold shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* ── SECCIÓN 1: SELECCIÓN Y PRUEBA DE VOCES DEL TUTOR ──────────────── */}
        <section className="glass p-6 sm:p-8 rounded-3xl border border-brand-accent/30 shadow-2xl relative overflow-hidden bg-gradient-to-b from-brand-surface/90 to-brand-surface/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-brand-border/60">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-2 rounded-xl bg-brand-accent/20 border border-brand-accent/40 text-brand-accent">
                  <Volume2 className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-outfit">
                  Voz del Tutor y Síntesis de Audio
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-brand-text-secondary">
                Selecciona tu voz favorita entre <strong>MiniMax Neural HD</strong>,{' '}
                <strong>Google TTS</strong> y <strong>Microsoft Edge Studio</strong>. Escucha una
                mini-prueba antes de elegir.
              </p>
            </div>

            {/* Avatar Preview Box */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-brand-border/70 self-start md:self-auto">
              <TutorAvatar
                state={activeAvatarState}
                text={selectedVoiceObj?.preview_text || 'Hola'}
                audioProgress={audioProgress}
                audioElement={activeAudioRef.current}
                size="sm"
              />
              <div className="text-left">
                <span className="text-[10px] text-brand-cyan font-bold uppercase tracking-wider block">
                  Voz Activa Actual
                </span>
                <span className="text-xs sm:text-sm font-bold text-white block truncate max-w-[170px]">
                  {selectedVoiceObj?.name || selectedVoice}
                </span>
                <span className="text-[10px] text-brand-text-muted capitalize">
                  {getVoiceProvider(selectedVoiceObj).toUpperCase()} •{' '}
                  {selectedVoiceObj?.gender === 'female' ? 'Femenina' : 'Masculina'}
                </span>
              </div>
            </div>
          </div>

          {/* Provider Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
            {[
              { id: 'all', label: 'Todas las Voces', count: voices.length, icon: Globe },
              {
                id: 'minimax',
                label: 'MiniMax Neural HD',
                count: voices.filter((v) => getVoiceProvider(v) === 'minimax').length,
                icon: Sparkles,
              },
              {
                id: 'google',
                label: 'Google TTS',
                count: voices.filter((v) => getVoiceProvider(v) === 'google').length,
                icon: Bot,
              },
              {
                id: 'edge',
                label: 'Microsoft Edge Studio',
                count: voices.filter((v) => getVoiceProvider(v) === 'edge').length,
                icon: Radio,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-brand-accent text-white border-brand-accent shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                      : 'bg-brand-surface/60 text-brand-text-secondary border-brand-border/60 hover:text-white hover:bg-brand-surface'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/25 text-white' : 'bg-black/40 text-brand-text-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Voice Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVoices.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              const isPlaying = playingVoiceId === voice.id;
              const isLoading = loadingVoiceId === voice.id;
              const provider = getVoiceProvider(voice);

              return (
                <motion.div
                  key={voice.id}
                  layout
                  className={`relative p-4 sm:p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-brand-accent/15 border-brand-accent shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                      : 'bg-black/30 border-brand-border/60 hover:border-brand-border hover:bg-black/40'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Provider Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          provider === 'minimax'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : provider === 'google'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {provider === 'minimax'
                          ? '⚡ MiniMax HD'
                          : provider === 'google'
                          ? '🌐 Google'
                          : '🎙️ Edge Studio'}
                      </span>

                      {/* Gender Badge */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-white/80 border border-white/10 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {voice.gender === 'female' ? 'Femenina' : 'Masculina'}
                      </span>

                      {/* Custom Tone Badge */}
                      {voice.badge && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-yellow-400/15 text-yellow-300 border border-yellow-400/25">
                          {voice.badge}
                        </span>
                      )}
                    </div>

                    {/* Selection Checkmark */}
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        Voz Activa
                      </span>
                    )}
                  </div>

                  {/* Voice Name & Description */}
                  <h3 className="font-bold text-base sm:text-lg text-white mb-1">{voice.name}</h3>
                  <p className="text-xs text-brand-text-secondary mb-4 leading-relaxed line-clamp-2">
                    {voice.description}
                  </p>

                  {/* Action Buttons: Preview & Select */}
                  <div className="flex items-center gap-2 pt-2 border-t border-brand-border/40">
                    {/* Mini-Preview Button */}
                    <button
                      onClick={() => handlePlayVoicePreview(voice)}
                      disabled={isLoading}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                        isPlaying
                          ? 'bg-yellow-400 text-black border-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                          : isLoading
                          ? 'bg-brand-surface text-brand-cyan border-brand-cyan/50 opacity-80 cursor-wait'
                          : 'bg-brand-surface hover:bg-brand-surface/90 text-brand-cyan border-brand-cyan/30 hover:border-brand-cyan/60'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Cargando audio...</span>
                        </>
                      ) : isPlaying ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Detener Muestra</span>
                          {/* Animated Waveform */}
                          <span className="flex items-center gap-0.5 ml-1">
                            <span className="w-1 h-3 bg-black rounded-full animate-bounce" />
                            <span className="w-1 h-4 bg-black rounded-full animate-bounce [animation-delay:0.15s]" />
                            <span className="w-1 h-2 bg-black rounded-full animate-bounce [animation-delay:0.3s]" />
                          </span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Probar Voz</span>
                        </>
                      )}
                    </button>

                    {/* Select as Active Voice Button */}
                    <button
                      onClick={() => handleSelectVoice(voice.id)}
                      disabled={isSelected}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-brand-accent hover:bg-brand-accent/90 text-white shadow-sm'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Seleccionada</span>
                        </>
                      ) : (
                        <span>Usar Voz</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── SECCIÓN 2: CLAVE API DE MINIMAX ────────────────────────────────── */}
        <section className="glass p-6 sm:p-8 rounded-3xl border border-brand-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-brand-accent" />
            <h2 className="text-xl font-bold font-outfit">Clave API de MiniMax (Opcional)</h2>
          </div>

          <p className="text-xs sm:text-sm text-brand-text-secondary mb-4 leading-relaxed">
            Si cuentas con una cuenta y clave API de MiniMax (t2a_v2), ingrésala aquí para activar
            la síntesis de ultra alta definición directamente con tu cuota. Si no tienes clave, el
            sistema usará automáticamente los motores de Google TTS y Microsoft Edge Studio con
            calidad excelente sin costo.
          </p>

          {savedMaskedKey && (
            <div className="mb-4 p-3 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-between text-xs">
              <span className="text-brand-text-secondary">Clave configurada actualmente:</span>
              <span className="font-mono text-emerald-400 font-bold">{savedMaskedKey}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveKey();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="password"
              name="minimax_api_key"
              id="minimax_api_key"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Introduce tu clave API personalizada de MiniMax"
              className="flex-1 bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-colors text-sm"
            />
            <button
              type="submit"
              disabled={savingKey || !apiKey}
              className="px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-sm"
            >
              <Save className="w-4 h-4" />
              {savingKey ? 'Guardando...' : 'Guardar Clave'}
            </button>
          </form>
        </section>

        {/* ── SECCIÓN 3: CUENTA Y SESIÓN ACTIVA ──────────────────────────────── */}
        <section className="glass p-6 sm:p-8 rounded-3xl border border-red-500/20 bg-red-950/10">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-red-400">
            <Shield className="w-5 h-5 text-red-400" />
            Cuenta y Sesión Activa
          </h2>
          <p className="text-xs sm:text-sm text-brand-text-secondary mb-6">
            Si deseas cambiar de cuenta de estudiante o cerrar tu sesión en este dispositivo, hazlo
            aquí.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-300 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión Ahora
          </button>
        </section>
      </div>
    </div>
  );
}
