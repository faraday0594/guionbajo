'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Sparkles, X, Layers, Award, Mic, Info, Play, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';

interface PhonemeItem {
  ipa: string;
  name: string;
  category: string;
  voicing: string;
  tongue_position: string;
  mouth_aperture: string;
  airflow: string;
  mouth_guide: { frontal: string; lateral: string; };
  examples: string[];
  contrast_with?: string;
  contrast_pairs?: string[][];
  introduced_at: string;
  drill_sentence: string;
  mastery?: number;
  times_practiced?: number;
  mouth_frontal_img?: string;
  mouth_lateral_img?: string;
  audio_file?: string;
}

interface CategoryGroup {
  id: string;
  title: string;
  badge: string;
  color: string;
  phonemes: PhonemeItem[];
}


interface PhoneticBoardProps {
  inLessonMode?: boolean;
  onClose?: () => void;
}

export default function PhoneticBoard({ inLessonMode = false, onClose }: PhoneticBoardProps = {}) {
  const router = useRouter();
  const [boardData, setBoardData] = useState<Record<string, PhonemeItem[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoneme, setSelectedPhoneme] = useState<PhonemeItem | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [overallMastery, setOverallMastery] = useState<number>(0);
  const [isStartingLesson, setIsStartingLesson] = useState<boolean>(false);

  const startPhoneticLesson = async (phoneme: PhonemeItem) => {
    try {
      setIsStartingLesson(true);
      toast.loading(`Generando clase especializada de fonética para ${phoneme.ipa}...`, { id: 'ph-gen' });
      const res = await api.post('/phonetics/generate-lesson', {
        phoneme_symbol: phoneme.ipa,
        contrast_symbol: phoneme.contrast_with,
        sublevel: phoneme.introduced_at || 'A1.1'
      });
      toast.success('¡Clase lista! Iniciando sesión...', { id: 'ph-gen' });
      if (res && res.lesson_id) {
        setSelectedPhoneme(null);
        router.push(`/lesson/${res.lesson_id}`);
      }
    } catch (err) {
      console.error('Error launching phonetic lesson:', err);
      toast.error('No se pudo generar la clase de fonética', { id: 'ph-gen' });
    } finally {
      setIsStartingLesson(false);
    }
  };

  useEffect(() => {
    if (getToken()) {
      fetchBoard();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/phonetics/board');
      if (res && res.categories) {
        setBoardData(res.categories);
        setOverallMastery(res.overall_phonetic_mastery || 0);
      }
    } catch (err) {
      console.error('Error fetching phonetic board:', err);
      toast.error('No se pudo cargar el tablero fonético');
    } finally {
      setLoading(false);
    }
  };

  // Handle for currently active audio playback
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const stopActiveAudio = () => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch (_) {}
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  };

  /** Speak word/sentence via Studio Neural Backend (primary) with Web Speech fallback. */
  const playTTS = async (text: string, id?: string) => {
    stopActiveAudio();
    const key = id || text;
    setPlayingAudio(key);

    // 1. Primary: High-Definition Backend Neural Audio (en-US-JennyNeural)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('guionbajo_token') : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/tts/synthesize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text, voice: 'en-US-RogerNeural', emotion: 'calm', speed: 0.9 }),
        }
      );

      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 200) {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          activeAudioRef.current = audio;
          audio.onended = () => { setPlayingAudio(null); URL.revokeObjectURL(url); activeAudioRef.current = null; };
          audio.onerror = () => { setPlayingAudio(null); URL.revokeObjectURL(url); activeAudioRef.current = null; };
          await audio.play();
          return;
        }
      }
    } catch (_) {}

    // 2. Fallback: Browser Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-US';
      utt.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Jenny') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira')));
      if (enVoice) utt.voice = enVoice;
      utt.onend = () => setPlayingAudio(null);
      utt.onerror = () => setPlayingAudio(null);
      window.speechSynthesis.speak(utt);
    } else {
      setPlayingAudio(null);
    }
  };

// Official local authentic audio files for all 44 English phonemes
const PHONEME_LOCAL_AUDIO_MAP: Record<string, string> = {
  "/ɪ/": "/audio/phonemes/vowel_short_i.ogg",
  "/e/": "/audio/phonemes/vowel_short_e.ogg",
  "/æ/": "/audio/phonemes/vowel_short_ae.ogg",
  "/ʌ/": "/audio/phonemes/vowel_short_wedge.ogg",
  "/ɒ/": "/audio/phonemes/vowel_short_o.ogg",
  "/ʊ/": "/audio/phonemes/vowel_short_upsilon.ogg",
  "/ə/": "/audio/phonemes/vowel_schwa.ogg",
  "/iː/": "/audio/phonemes/vowel_long_i.ogg",
  "/ɑː/": "/audio/phonemes/vowel_long_a.ogg",
  "/ɔː/": "/audio/phonemes/vowel_long_o.ogg",
  "/uː/": "/audio/phonemes/vowel_long_u.ogg",
  "/ɜː/": "/audio/phonemes/vowel_long_er.ogg",
  "/eɪ/": "/audio/phonemes/diphthong_ei.ogg",
  "/aɪ/": "/audio/phonemes/diphthong_ai.ogg",
  "/ɔɪ/": "/audio/phonemes/diphthong_oi.ogg",
  "/aʊ/": "/audio/phonemes/diphthong_au.ogg",
  "/əʊ/": "/audio/phonemes/diphthong_ou.ogg",
  "/ɪə/": "/audio/phonemes/diphthong_ia.ogg",
  "/eə/": "/audio/phonemes/diphthong_ea.ogg",
  "/ʊə/": "/audio/phonemes/diphthong_ua.ogg",
  "/f/": "/audio/phonemes/fricative_f.ogg",
  "/v/": "/audio/phonemes/fricative_v.ogg",
  "/θ/": "/audio/phonemes/fricative_th_voiceless.ogg",
  "/ð/": "/audio/phonemes/fricative_th_voiced.ogg",
  "/s/": "/audio/phonemes/fricative_s.ogg",
  "/z/": "/audio/phonemes/fricative_z.ogg",
  "/ʃ/": "/audio/phonemes/fricative_sh.ogg",
  "/ʒ/": "/audio/phonemes/fricative_zh.ogg",
  "/h/": "/audio/phonemes/fricative_h.ogg",
  "/tʃ/": "/audio/phonemes/affricate_ch.ogg",
  "/dʒ/": "/audio/phonemes/affricate_j.ogg",
  "/p/": "/audio/phonemes/plosive_p.ogg",
  "/b/": "/audio/phonemes/plosive_b.ogg",
  "/t/": "/audio/phonemes/plosive_t.ogg",
  "/d/": "/audio/phonemes/plosive_d.ogg",
  "/k/": "/audio/phonemes/plosive_k.ogg",
  "/g/": "/audio/phonemes/plosive_g.ogg",
  "/m/": "/audio/phonemes/nasal_m.ogg",
  "/n/": "/audio/phonemes/nasal_n.ogg",
  "/ŋ/": "/audio/phonemes/nasal_ng.ogg",
  "/l/": "/audio/phonemes/approximant_l.ogg",
  "/r/": "/audio/phonemes/approximant_r.ogg",
  "/j/": "/audio/phonemes/approximant_j.ogg",
  "/w/": "/audio/phonemes/approximant_w.ogg",
};

  /** Speak the REAL ISOLATED phoneme sound with 0ms latency from local static audio. */
  const playPhoneme = async (ipa: string) => {
    stopActiveAudio();
    const key = `phoneme:${ipa}`;
    setPlayingAudio(key);

    const cleanSymbol = ipa.startsWith('/') ? ipa : `/${ipa}/`;
    const localAudioPath = PHONEME_LOCAL_AUDIO_MAP[cleanSymbol];

    // 1. Primary: Direct instant playback of local authentic OGG audio
    if (localAudioPath) {
      try {
        const audio = new Audio(localAudioPath);
        activeAudioRef.current = audio;
        audio.onended = () => { setPlayingAudio(null); activeAudioRef.current = null; };
        audio.onerror = async () => {
          // Fallback to backend API if local audio element fails
          await playPhonemeFromBackend(cleanSymbol);
        };
        await audio.play();
        return;
      } catch (_) {
        // Fall through to backend API
      }
    }

    // 2. Fallback: Backend /tts/phoneme endpoint
    await playPhonemeFromBackend(cleanSymbol);
  };

  const playPhonemeFromBackend = async (cleanSymbol: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('guionbajo_token') : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/tts/phoneme?symbol=${encodeURIComponent(cleanSymbol)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!res.ok) throw new Error('No se pudo cargar el fonema');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      audio.onended = () => { setPlayingAudio(null); URL.revokeObjectURL(url); activeAudioRef.current = null; };
      audio.onerror = () => { setPlayingAudio(null); URL.revokeObjectURL(url); activeAudioRef.current = null; };
      await audio.play();
    } catch (err) {
      console.error('Error al reproducir fonema puro:', err);
      setPlayingAudio(null);
      toast.error(`No se pudo reproducir el fonema ${cleanSymbol}`);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-medium">Cargando Tablero Fonético...</p>
      </div>
    );
  }

  const categoryGroups: CategoryGroup[] = [
    {
      id: 'vowels_short',
      title: 'Vocales Cortas (Short Vowels)',
      badge: 'Lax Vowels',
      color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
      phonemes: boardData?.vowels_short || [],
    },
    {
      id: 'vowels_long',
      title: 'Vocales Largas (Long Vowels)',
      badge: 'Tense Vowels',
      color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400',
      phonemes: boardData?.vowels_long || [],
    },
    {
      id: 'diphthongs',
      title: 'Diptongos (Diphthongs)',
      badge: 'Gliding Vowels',
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
      phonemes: boardData?.diphthongs || [],
    },
    {
      id: 'consonants_fricatives',
      title: 'Fricativas & Africadas',
      badge: 'Friction & Affricates',
      color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
      phonemes: boardData?.consonants_fricatives || [],
    },
    {
      id: 'consonants_plosives',
      title: 'Oclusivas / Plosivas (Stops)',
      badge: 'Air Bursts',
      color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
      phonemes: boardData?.consonants_plosives || [],
    },
    {
      id: 'consonants_other',
      title: 'Nasales & Aproximantes',
      badge: 'Resonant Sounds',
      color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400',
      phonemes: boardData?.consonants_other || [],
    },
  ];

  return (
    <div className="space-y-8">

      {/* ── Top Banner ─────────────────────────────────────────────────── */}
      {inLessonMode ? (
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/90 border border-emerald-500/30 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Tablero Fonético Rápido (44 Sonidos)
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Consulta de Fonemas & Pronunciación
            </h2>
            <p className="text-zinc-400 text-xs mt-0.5">
              Haz clic en cualquier símbolo IPA para escuchar su sonido aislado o en sus palabras de ejemplo.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-colors flex-shrink-0"
              title="Volver a la lección"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Tablero Fonético de 44 Sonidos
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Mapa Fonético & Articulatorio del Inglés
              </h2>
              <p className="text-zinc-400 text-sm mt-1 max-w-xl">
                Haz clic en <Volume2 className="inline w-3.5 h-3.5 text-emerald-400" /> para escuchar el fonema aislado.
                Haz clic en la palabra para escucharla en contexto.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-zinc-800/80 backdrop-blur border border-zinc-700/60 rounded-xl p-4 self-start md:self-auto">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-zinc-400 font-medium">Dominio Fonético Global</div>
                <div className="text-2xl font-black text-white">{overallMastery}%</div>
                <div className="w-28 bg-zinc-700 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, overallMastery)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Phoneme Grids by Category ───────────────────────────────────── */}
      <div className="space-y-8">
        {categoryGroups.map((group) => (
          <div key={group.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-zinc-200">{group.title}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium">
                  {group.badge}
                </span>
              </div>
              <span className="text-xs text-zinc-500">{group.phonemes.length} fonemas</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {group.phonemes.map((ph) => {
                const mastery = ph.mastery || 0;
                const isSelected = selectedPhoneme?.ipa === ph.ipa;
                const phonemeKey = `phoneme:${ph.ipa}`;
                const exampleWord = (ph.examples && ph.examples.length > 0) ? ph.examples[0] : '';

                return (
                  <motion.div
                    key={ph.ipa}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={`group relative p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between min-h-[110px] ${
                      isSelected
                        ? 'bg-zinc-800 border-emerald-500 shadow-lg shadow-emerald-500/10'
                        : 'bg-zinc-900/90 hover:bg-zinc-800/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Header: Clickable Big IPA Symbol (Plays Pure Isolated Phoneme) */}
                    <div className="flex items-start justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playPhoneme(ph.ipa);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
                          playingAudio === phonemeKey
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/30 animate-pulse'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                        title={`Reproducir sonido puro aislado: ${ph.ipa}`}
                      >
                        <span className="text-xl font-black font-mono leading-none">
                          {ph.ipa}
                        </span>
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Modal Info Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhoneme(ph);
                        }}
                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                        title="Ver guía de articulación y pares mínimos"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Example Word Pill (Plays ONLY the single example word, never the description) */}
                    {exampleWord && (
                      <div className="my-1.5 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTTS(exampleWord, `word:${exampleWord}`);
                          }}
                          className={`text-left text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors truncate max-w-full flex items-center gap-1 ${
                            playingAudio === `word:${exampleWord}`
                              ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                              : 'bg-zinc-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-zinc-300 border-zinc-700/60'
                          }`}
                          title={`Escuchar palabra de ejemplo: "${exampleWord}"`}
                        >
                          <Volume2 className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                          <span className="truncate">{exampleWord}</span>
                        </button>
                      </div>
                    )}

                    {/* Footer: Phoneme Category Label & Mastery Bar */}
                    <div className="mt-auto pt-1">
                      <div className="text-[10px] text-zinc-400 truncate">{ph.name.split('(')[0].trim()}</div>
                      <div className="mt-1 w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            mastery >= 70 ? 'bg-emerald-500' : mastery >= 40 ? 'bg-amber-500' : 'bg-zinc-600'
                          }`}
                          style={{ width: `${Math.max(mastery, 4)}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Phoneme Detail Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPhoneme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                <div className="flex items-center gap-4">
                  {/* Clickable IPA badge → isolated sound */}
                  <button
                    onClick={() => playPhoneme(selectedPhoneme.ipa)}
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                      playingAudio === `phoneme:${selectedPhoneme.ipa}`
                        ? 'border-emerald-400 shadow-lg shadow-emerald-500/30 animate-pulse'
                        : 'border-emerald-500/30 hover:border-emerald-400'
                    }`}
                    title={`Escuchar sonido aislado ${selectedPhoneme.ipa}`}
                  >
                    <span className="text-3xl font-black font-mono text-emerald-400">
                      {selectedPhoneme.ipa}
                    </span>
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedPhoneme.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {selectedPhoneme.voicing === 'voiced' ? 'Sonoro (Voiced)' : 'Sordo (Voiceless)'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Nivel: {selectedPhoneme.introduced_at}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Haz clic en el símbolo IPA para escuchar el sonido puro
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPhoneme(null)}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">

                {/* Articulation Guide with Mouth Diagrams */}
                <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                      <Layers className="w-4 h-4" />
                      Guía Visual y Articulación Bucal ({selectedPhoneme.ipa})
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">Anatomía Articulatoria</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Frontal Lip View */}
                    <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 flex items-center gap-3">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 p-1 shadow-inner">
                        {(() => {
                          const base = selectedPhoneme.mouth_frontal_img || (() => {
                            const clean = selectedPhoneme.ipa.replace(/\//g, '');
                            const audioPath = PHONEME_LOCAL_AUDIO_MAP[`/${clean}/`];
                            return audioPath ? audioPath.replace('/audio/phonemes/', '/images/phonemes/').replace('.ogg', '_frontal.svg') : '/images/phonemes/vowel_long_i_frontal.svg';
                          })();
                          return (
                            <img
                              src={base}
                              alt={`Frontal Lip shape for ${selectedPhoneme.ipa}`}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          );
                        })()}
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="text-rose-400 font-bold uppercase text-[11px] tracking-wide">👄 Vista Frontal (Labios)</div>
                        <div className="text-zinc-300 leading-relaxed text-[11.5px]">{selectedPhoneme.mouth_guide?.frontal || 'Posición labial específica.'}</div>
                      </div>
                    </div>

                    {/* Lateral Sagittal View */}
                    <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 flex items-center gap-3">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 p-1 shadow-inner">
                        {(() => {
                          const base = selectedPhoneme.mouth_lateral_img || (() => {
                            const clean = selectedPhoneme.ipa.replace(/\//g, '');
                            const audioPath = PHONEME_LOCAL_AUDIO_MAP[`/${clean}/`];
                            return audioPath ? audioPath.replace('/audio/phonemes/', '/images/phonemes/').replace('.ogg', '_lateral.svg') : '/images/phonemes/vowel_long_i_lateral.svg';
                          })();
                          return (
                            <img
                              src={base}
                              alt={`Lateral Sagittal shape for ${selectedPhoneme.ipa}`}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          );
                        })()}
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="text-cyan-400 font-bold uppercase text-[11px] tracking-wide">👅 Vista Lateral (Lengua/Paladar)</div>
                        <div className="text-zinc-300 leading-relaxed text-[11.5px]">{selectedPhoneme.mouth_guide?.lateral || 'Posición de la lengua y resonancia.'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-zinc-400 border-t border-zinc-800/80">
                    <div><span className="text-zinc-500">Posición Lengua:</span> {selectedPhoneme.tongue_position}</div>
                    <div><span className="text-zinc-500">Apertura Bucal:</span> {selectedPhoneme.mouth_aperture}</div>
                    <div><span className="text-zinc-500">Flujo de Aire:</span> {selectedPhoneme.airflow}</div>
                  </div>
                </div>

                {/* Contrast Pairs */}
                {selectedPhoneme.contrast_pairs && selectedPhoneme.contrast_pairs.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Pares Mínimos ({selectedPhoneme.ipa} vs {selectedPhoneme.contrast_with})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedPhoneme.contrast_pairs.map((pair, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-zinc-950/40 border border-zinc-800 rounded-lg text-xs">
                          <button
                            onClick={() => playTTS(pair[0], pair[0])}
                            className="flex items-center gap-1.5 font-bold text-emerald-400 hover:underline"
                          >
                            <Volume2 className="w-3 h-3" /> {pair[0]}
                          </button>
                          <span className="text-zinc-600 font-mono">vs</span>
                          <button
                            onClick={() => playTTS(pair[1], pair[1])}
                            className="flex items-center gap-1.5 font-bold text-amber-400 hover:underline"
                          >
                            <Volume2 className="w-3 h-3" /> {pair[1]}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Example Words */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-zinc-200">Palabras de Práctica</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPhoneme.examples.map((word, idx) => (
                      <button
                        key={idx}
                        onClick={() => playTTS(word, word)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          playingAudio === word
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                        }`}
                      >
                        <Volume2 className="w-3 h-3 text-emerald-400" /> {word}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drill Sentence */}
                {selectedPhoneme.drill_sentence && (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400">Frase de Entrenamiento</span>
                      <button
                        onClick={() => playTTS(selectedPhoneme.drill_sentence, `drill:${selectedPhoneme.ipa}`)}
                        className={`flex items-center gap-1 text-xs font-medium ${
                          playingAudio === `drill:${selectedPhoneme.ipa}`
                            ? 'text-amber-400'
                            : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Escuchar Frase
                      </button>
                    </div>
                    <p className="text-sm text-white font-medium italic">
                      "{selectedPhoneme.drill_sentence}"
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-zinc-400 text-center sm:text-left">
                  {inLessonMode
                    ? '💡 Consulta de pronunciación y anatomía articulatoria.'
                    : '🎓 Clase guiada de 6 fases con voz del tutor, pronunciación y evaluación en tiempo real'}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setSelectedPhoneme(null)}
                    disabled={isStartingLesson}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {inLessonMode ? 'Volver al Tablero' : 'Cerrar'}
                  </button>
                  {!inLessonMode && (
                    <button
                      onClick={() => startPhoneticLesson(selectedPhoneme)}
                      disabled={isStartingLesson}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isStartingLesson ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generando Clase...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-black" />
                          Practicar en Clase Guiada
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
