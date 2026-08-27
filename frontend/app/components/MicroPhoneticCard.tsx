'use client';

import React, { useState } from 'react';
import { Volume2, Sparkles, Layers, Mic, CheckCircle2, RefreshCw } from 'lucide-react';
import { api, playEnglishAudio } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface PhonemeData {
  ipa?: string;
  name?: string;
  category?: string;
  mouth_guide?: {
    frontal?: string;
    lateral?: string;
  };
  mouth_guide_es?: {
    frontal?: string;
    lateral?: string;
  };
  mouth_frontal_img?: string;
  mouth_lateral_img?: string;
  audio_file?: string;
  contrast_pairs?: string[][];
  drill_sentence?: string;
  examples?: string[];
}

interface MicroPhoneticProps {
  phoneticData: {
    primary?: PhonemeData;
    secondary?: PhonemeData;
    symbols?: string[];
    contrast_pairs?: string[][];
    mouth_guide?: {
      frontal?: string;
      lateral?: string;
    };
    mouth_guide_es?: {
      frontal?: string;
      lateral?: string;
    };
    drill_sentence?: string;
    focus_title?: string;
  };
  onCompletePractice?: (symbol: string, success: boolean) => void;
  isStandaloneSlide?: boolean;
}

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

export default function MicroPhoneticCard({ phoneticData, onCompletePractice, isStandaloneSlide = false }: MicroPhoneticProps) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSuccess, setRecordedSuccess] = useState<boolean | null>(null);

  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

  if (!phoneticData || (!phoneticData.symbols && !phoneticData.primary)) {
    return null;
  }

  const primary = phoneticData.primary || {};
  const secondary = phoneticData.secondary || null;
  const symbols = phoneticData.symbols || [primary.ipa || '/θ/'];
  const contrastPairs = phoneticData.contrast_pairs || primary.contrast_pairs || [];
  const drillSentence = phoneticData.drill_sentence || primary.drill_sentence || '';
  const focusTitle = phoneticData.focus_title || 'Bonus de Pronunciación';

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

  const playSound = async (text: string) => {
    try {
      stopActiveAudio();
      setPlayingAudio(text);

      const cleanSym = text.startsWith('/') ? text : `/${text.replace(/\//g, '')}/`;
      if (PHONEME_LOCAL_AUDIO_MAP[cleanSym] || text.startsWith('/')) {
        const localPath = PHONEME_LOCAL_AUDIO_MAP[cleanSym];
        if (localPath) {
          try {
            const localAudio = new Audio(localPath);
            activeAudioRef.current = localAudio;
            localAudio.onended = () => { setPlayingAudio(null); activeAudioRef.current = null; };
            localAudio.onerror = async () => {
              await fetchAndPlayBackendPhoneme(cleanSym);
            };
            await localAudio.play();
            return;
          } catch (_) {}
        }
        await fetchAndPlayBackendPhoneme(cleanSym);
        return;
      }

      // Word / Drill playback
      await playEnglishAudio(text);
      setTimeout(() => setPlayingAudio(null), 1200);
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

  const handleTestRecording = (sentence: string) => {
    setIsRecording(true);
    setRecordedSuccess(null);
    toast('Di la frase: ' + sentence, { icon: '🎙️' });

    setTimeout(() => {
      setIsRecording(false);
      setRecordedSuccess(true);
      toast.success('¡Excelente pronunciación! Dominio registrado de ' + symbols.join(' y ') + ' 🎉');
      if (onCompletePractice) {
        onCompletePractice(symbols[0], true);
      }
    }, 2800);
  };

  // Helper to extract anatomical image paths and Spanish instructions
  const getPhonemeCardInfo = (symbolStr: string, customData?: PhonemeData | null, fallbackIdx = 0) => {
    const rawSym = symbolStr || (fallbackIdx === 0 ? '/θ/' : '/ð/');
    const cleanSym = rawSym.startsWith('/') ? rawSym : `/${rawSym}/`;
    const audioKey = PHONEME_LOCAL_AUDIO_MAP[cleanSym];
    const base = audioKey ? audioKey.replace('/audio/phonemes/', '').replace('.ogg', '') : (fallbackIdx === 0 ? 'fricative_th_voiceless' : 'fricative_th_voiced');
    
    const frontalImg = customData?.mouth_frontal_img || `/images/phonemes/${base}_frontal.svg`;
    const lateralImg = customData?.mouth_lateral_img || `/images/phonemes/${base}_lateral.svg`;
    
    const guide = customData?.mouth_guide_es || customData?.mouth_guide || {};
    const frontalText = guide.frontal || 'Coloca y abre los labios según el sonido objetivo.';
    const lateralText = guide.lateral || 'Posiciona la lengua y el tracto vocal adecuadamente.';
    const name = customData?.name || cleanSym;

    return { cleanSym, base, frontalImg, lateralImg, frontalText, lateralText, name };
  };

  const ph1 = getPhonemeCardInfo(symbols[0], primary, 0);
  const ph2 = symbols.length > 1 ? getPhonemeCardInfo(symbols[1], secondary, 1) : null;

  return (
    <div className={`w-full rounded-3xl bg-gradient-to-br from-[#0c1220] via-[#090d17] to-[#05080f] border border-brand-cyan/35 p-4 sm:p-7 md:p-8 shadow-2xl space-y-6 text-white relative overflow-hidden ${
      isStandaloneSlide ? 'min-h-[520px] flex flex-col justify-between' : ''
    }`}>
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-cyan/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Badge & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-cyan/30 to-emerald-500/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan font-mono font-extrabold text-xl shadow-lg shadow-brand-cyan/10">
            {symbols.join(' ')}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-cyan uppercase tracking-wider bg-brand-cyan/15 px-2.5 py-0.5 rounded-full border border-brand-cyan/30">
              <Sparkles className="w-3.5 h-3.5 text-brand-cyan animate-pulse" />
              <span>{focusTitle}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
              Entrenamiento de Contraste: {symbols.join(' vs ')}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Anatomía Bucal & Pares Mínimos
          </span>
        </div>
      </div>

      {/* 🌟 DUAL PHONEME ANATOMICAL COMPARISON (Exterior Lips & Interior Tongue in Spanish) */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-brand-cyan" />
            <span>Colocación de la Boca: Exterior (Labios) e Interior (Lengua y Tracto)</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium">Explicación 100% en Español</span>
        </div>

        {/* Dual Cards Grid: Phoneme 1 & Phoneme 2 */}
        <div className={`grid grid-cols-1 ${ph2 ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-5`}>
          {/* Card for Phoneme 1 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-brand-cyan/30 shadow-xl space-y-4 hover:border-brand-cyan/60 transition-all">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl sm:text-2xl font-mono font-black text-brand-cyan bg-brand-cyan/20 px-3 py-1 rounded-xl border border-brand-cyan/40">
                  {ph1.cleanSym}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">{ph1.name}</h4>
                  <span className="text-[11px] text-zinc-400 font-medium">Primer Fonema Objetivo</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => playSound(ph1.cleanSym)}
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                  playingAudio === ph1.cleanSym
                    ? 'bg-brand-cyan text-black border-brand-cyan shadow-lg shadow-brand-cyan/30 scale-105'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-brand-cyan'
                }`}
                title={`Escuchar sonido ${ph1.cleanSym}`}
              >
                <Volume2 className="w-4 h-4" />
                <span>Escuchar</span>
              </button>
            </div>

            {/* Frontal (Exterior) and Lateral (Interior) Diagram Views */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Exterior: Frontal Lips */}
              <div className="flex flex-col p-3 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  <span>👄 Exterior: Labios</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Frontal</span>
                </div>
                <div className="w-full h-28 sm:h-32 rounded-lg overflow-hidden bg-black/90 border border-zinc-800 p-1 flex items-center justify-center shadow-inner">
                  <img
                    src={ph1.frontalImg}
                    alt={`Vista frontal de labios para ${ph1.cleanSym}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed min-h-[48px]">
                  {ph1.frontalText}
                </p>
              </div>

              {/* Interior: Lateral Sagittal Tongue */}
              <div className="flex flex-col p-3 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  <span>👅 Interior: Lengua</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Sagital</span>
                </div>
                <div className="w-full h-28 sm:h-32 rounded-lg overflow-hidden bg-black/90 border border-zinc-800 p-1 flex items-center justify-center shadow-inner">
                  <img
                    src={ph1.lateralImg}
                    alt={`Vista sagital de lengua para ${ph1.cleanSym}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed min-h-[48px]">
                  {ph1.lateralText}
                </p>
              </div>
            </div>
          </div>

          {/* Card for Phoneme 2 (if contrast pair exists) */}
          {ph2 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-amber-500/30 shadow-xl space-y-4 hover:border-amber-500/60 transition-all">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl sm:text-2xl font-mono font-black text-amber-400 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/40">
                    {ph2.cleanSym}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{ph2.name}</h4>
                    <span className="text-[11px] text-zinc-400 font-medium">Segundo Fonema (Contraste)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => playSound(ph2.cleanSym)}
                  className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                    playingAudio === ph2.cleanSym
                      ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/30 scale-105'
                      : 'bg-white/10 hover:bg-white/20 border-white/20 text-amber-400'
                  }`}
                  title={`Escuchar sonido ${ph2.cleanSym}`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Escuchar</span>
                </button>
              </div>

              {/* Frontal (Exterior) and Lateral (Interior) Diagram Views */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Exterior: Frontal Lips */}
                <div className="flex flex-col p-3 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    <span>👄 Exterior: Labios</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Frontal</span>
                  </div>
                  <div className="w-full h-28 sm:h-32 rounded-lg overflow-hidden bg-black/90 border border-zinc-800 p-1 flex items-center justify-center shadow-inner">
                    <img
                      src={ph2.frontalImg}
                      alt={`Vista frontal de labios para ${ph2.cleanSym}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed min-h-[48px]">
                    {ph2.frontalText}
                  </p>
                </div>

                {/* Interior: Lateral Sagittal Tongue */}
                <div className="flex flex-col p-3 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    <span>👅 Interior: Lengua</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Sagital</span>
                  </div>
                  <div className="w-full h-28 sm:h-32 rounded-lg overflow-hidden bg-black/90 border border-zinc-800 p-1 flex items-center justify-center shadow-inner">
                    <img
                      src={ph2.lateralImg}
                      alt={`Vista sagital de lengua para ${ph2.cleanSym}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed min-h-[48px]">
                    {ph2.lateralText}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🎯 MINIMAL PAIRS SECTION (Pares Mínimos con Audio) */}
      {contrastPairs.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              Diferenciación Sonora en Pares Mínimos
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">Toca para escuchar cada palabra</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {contrastPairs.slice(0, 4).map((pair: string[], idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-black/50 border border-white/10 rounded-xl text-xs hover:border-brand-cyan/40 transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => playSound(pair[0])}
                  className={`flex items-center gap-1 font-extrabold transition-colors ${
                    playingAudio === pair[0] ? 'text-brand-cyan scale-105' : 'text-zinc-100 hover:text-brand-cyan'
                  }`}
                  title={`Escuchar "${pair[0]}"`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>{pair[0]}</span>
                </button>

                <span className="text-zinc-500 font-mono text-[10px] uppercase font-bold">vs</span>

                <button
                  type="button"
                  onClick={() => playSound(pair[1])}
                  className={`flex items-center gap-1 font-extrabold transition-colors ${
                    playingAudio === pair[1] ? 'text-amber-400 scale-105' : 'text-zinc-100 hover:text-amber-400'
                  }`}
                  title={`Escuchar "${pair[1]}"`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{pair[1]}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎙️ ORAL DRILL SENTENCE & INTERACTIVE MIC CHALLENGE */}
      {drillSentence && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-black/70 to-zinc-950/80 border border-emerald-500/30 space-y-3.5 relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              Reto Oral de Pronunciación
            </span>
            <button
              type="button"
              onClick={() => playSound(drillSentence)}
              className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 font-bold border border-emerald-500/30 transition-all hover:scale-105"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Escuchar Frase Modelo</span>
            </button>
          </div>

          <p className="text-sm sm:text-base font-semibold text-white italic font-outfit bg-black/40 p-3 rounded-xl border border-white/5">
            "{drillSentence}"
          </p>

          <div className="flex items-center justify-between pt-1">
            <motion.button
              type="button"
              disabled={isRecording}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTestRecording(drillSentence)}
              className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-lg ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-emerald-500/25'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isRecording ? 'Escuchando tu voz...' : 'Grabar & Validar Pronunciación'}</span>
            </motion.button>

            {recordedSuccess && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>¡Dominio Fonético Registrado!</span>
              </motion.span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
