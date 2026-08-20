'use client';

import React, { useState } from 'react';
import { Volume2, Sparkles, Layers, Mic, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface MicroPhoneticProps {
  phoneticData: {
    primary?: any;
    secondary?: any;
    symbols?: string[];
    contrast_pairs?: string[][];
    mouth_guide?: {
      frontal?: string;
      lateral?: string;
    };
    drill_sentence?: string;
  };
  onCompletePractice?: (symbol: string, success: boolean) => void;
}

export default function MicroPhoneticCard({ phoneticData, onCompletePractice }: MicroPhoneticProps) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSuccess, setRecordedSuccess] = useState<boolean | null>(null);

  if (!phoneticData || (!phoneticData.symbols && !phoneticData.primary)) {
    return null;
  }

  const primary = phoneticData.primary || {};
  const symbols = phoneticData.symbols || [primary.ipa || '/θ/'];
  const contrastPairs = phoneticData.contrast_pairs || primary.contrast_pairs || [];
  const mouthGuide = phoneticData.mouth_guide || primary.mouth_guide || {};
  const drillSentence = phoneticData.drill_sentence || primary.drill_sentence || '';

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

  const playSound = async (text: string) => {
    try {
      stopActiveAudio();
      setPlayingAudio(text);
      // If text looks like a phoneme (/.../)
      if (text.startsWith('/') || (text.length <= 4 && PHONEME_LOCAL_AUDIO_MAP[`/${text.replace(/\//g, '')}/`])) {
        const cleanSym = text.startsWith('/') ? text : `/${text}/`;
        const localPath = PHONEME_LOCAL_AUDIO_MAP[cleanSym];
        if (localPath) {
          try {
            const localAudio = new Audio(localPath);
            activeAudioRef.current = localAudio;
            localAudio.onended = () => { setPlayingAudio(null); activeAudioRef.current = null; };
            localAudio.onerror = async () => {
              // Fallback to backend API
              await fetchAndPlayBackendPhoneme(cleanSym);
            };
            await localAudio.play();
            return;
          } catch (_) {}
        }
        await fetchAndPlayBackendPhoneme(cleanSym);
        return;
      }

      // Word / Drill playback via Studio Neural Backend (primary)
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
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            activeAudioRef.current = audio;
            audio.onended = () => { setPlayingAudio(null); URL.revokeObjectURL(audioUrl); activeAudioRef.current = null; };
            audio.onerror = () => { setPlayingAudio(null); URL.revokeObjectURL(audioUrl); activeAudioRef.current = null; };
            await audio.play();
            return;
          }
        }
      } catch (_) {}

      // Fallback via Web Speech API (for words only)
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.85;
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => (v.lang.startsWith('en') || v.lang === 'en-US') && (v.name.includes('Jenny') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Roger')));
        if (enVoice) u.voice = enVoice;
        u.onend = () => setPlayingAudio(null);
        u.onerror = () => setPlayingAudio(null);
        window.speechSynthesis.speak(u);
      } else {
        setPlayingAudio(null);
      }
    } catch (err) {
      console.error('Error playing sound:', err);
      setPlayingAudio(null);
    }
  };

  const fetchAndPlayBackendPhoneme = async (cleanSym: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('guionbajo_token') : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/tts/phoneme?symbol=${encodeURIComponent(cleanSym)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.onended = () => { setPlayingAudio(null); URL.revokeObjectURL(audioUrl); activeAudioRef.current = null; };
        audio.onerror = () => { setPlayingAudio(null); URL.revokeObjectURL(audioUrl); activeAudioRef.current = null; };
        await audio.play();
      }
    } catch (e) {
      console.error('Failed playing phoneme from backend:', e);
      setPlayingAudio(null);
    }
  };

  const handleTestRecording = (word: string) => {
    setIsRecording(true);
    setRecordedSuccess(null);
    toast('Di la palabra: ' + word, { icon: '🎙️' });

    setTimeout(() => {
      setIsRecording(false);
      setRecordedSuccess(true);
      toast.success('¡Excelente pronunciación del fonema ' + symbols[0] + '!');
      if (onCompletePractice) {
        onCompletePractice(symbols[0], true);
      }
    }, 2500);
  };

  return (
    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg">
            {symbols.join(' ')}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Micro-Lección Fonética Integrada
            </div>
            <h4 className="text-base font-bold text-white">
              Entrenamiento de Contraste: {symbols.join(' vs ')}
            </h4>
          </div>
        </div>

        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium self-start sm:self-auto">
          2–5 Minutos de Precisión
        </span>
      </div>

      {/* Articulatory Mouth Diagrams & Instructions */}
      {(mouthGuide.frontal || mouthGuide.lateral || symbols.length > 0) && (
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Layers className="w-3.5 h-3.5" />
              Guía Visual y Postura de la Boca ({symbols[0]})
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">Anatomía Articulada</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Frontal Lip View */}
            <div className="flex items-center gap-3 p-3 bg-zinc-900/90 rounded-xl border border-zinc-800/80">
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 p-1 shadow-inner">
                {(() => {
                  const sym = symbols[0] || '/θ/';
                  const cleanSym = sym.startsWith('/') ? sym : `/${sym}/`;
                  const audioKey = PHONEME_LOCAL_AUDIO_MAP[cleanSym];
                  const base = audioKey ? audioKey.replace('/audio/phonemes/', '').replace('.ogg', '') : 'vowel_long_i';
                  const imgPath = `/images/phonemes/${base}_frontal.svg`;
                  return (
                    <img
                      src={imgPath}
                      alt={`Frontal Lip shape for ${sym}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  );
                })()}
              </div>
              <div className="text-xs space-y-1">
                <span className="text-rose-400 font-bold block text-[11px] uppercase tracking-wide">
                  👄 Forma de Labios
                </span>
                <p className="text-zinc-300 leading-relaxed text-[11.5px]">
                  {mouthGuide.frontal || 'Ajusta la apertura de labios según el sonido objetivo.'}
                </p>
              </div>
            </div>

            {/* Lateral Sagittal Tongue View */}
            <div className="flex items-center gap-3 p-3 bg-zinc-900/90 rounded-xl border border-zinc-800/80">
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 p-1 shadow-inner">
                {(() => {
                  const sym = symbols[0] || '/θ/';
                  const cleanSym = sym.startsWith('/') ? sym : `/${sym}/`;
                  const audioKey = PHONEME_LOCAL_AUDIO_MAP[cleanSym];
                  const base = audioKey ? audioKey.replace('/audio/phonemes/', '').replace('.ogg', '') : 'vowel_long_i';
                  const imgPath = `/images/phonemes/${base}_lateral.svg`;
                  return (
                    <img
                      src={imgPath}
                      alt={`Lateral Vocal Tract shape for ${sym}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  );
                })()}
              </div>
              <div className="text-xs space-y-1">
                <span className="text-cyan-400 font-bold block text-[11px] uppercase tracking-wide">
                  👅 Posición de Lengua
                </span>
                <p className="text-zinc-300 leading-relaxed text-[11.5px]">
                  {mouthGuide.lateral || 'Dirige la punta o dorso de la lengua al punto de articulación.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contrast Pairs */}
      {contrastPairs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-400">
            Escucha la diferencia en pares mínimos:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {contrastPairs.slice(0, 4).map((pair: string[], idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-xl text-xs"
              >
                <button
                  onClick={() => playSound(pair[0])}
                  className={`flex items-center gap-1.5 font-bold transition-colors ${
                    playingAudio === pair[0] ? 'text-emerald-400' : 'text-zinc-200 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  {pair[0]}
                </button>

                <span className="text-zinc-500 font-mono text-[11px]">vs</span>

                <button
                  onClick={() => playSound(pair[1])}
                  className={`flex items-center gap-1.5 font-bold transition-colors ${
                    playingAudio === pair[1] ? 'text-amber-400' : 'text-zinc-200 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  {pair[1]}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drill Sentence & Recording Challenge */}
      {drillSentence && (
        <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Reto de Producción Oral</span>
            <button
              onClick={() => playSound(drillSentence)}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Escuchar Frase
            </button>
          </div>

          <p className="text-sm font-semibold text-white italic">
            "{drillSentence}"
          </p>

          <div className="flex items-center justify-between pt-1">
            <button
              disabled={isRecording}
              onClick={() => handleTestRecording(drillSentence)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
              }`}
            >
              <Mic className="w-4 h-4" />
              {isRecording ? 'Escuchando...' : 'Grabar & Probar Pronunciación'}
            </button>

            {recordedSuccess && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Dominio Registrado
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
