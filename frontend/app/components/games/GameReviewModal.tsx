'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Sparkles,
  Volume2,
  Mic,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Flame,
  BookOpen,
  X,
  Languages,
} from 'lucide-react';
import { playTutorVoice, stopTutorVoice } from '@/lib/api';
import { TwinCardPairData } from './TwinCardsGame';
import { MysteryWordData } from './MysteryWordGame';

interface GameReviewModalProps {
  isOpen: boolean;
  gameType: 'mystery_word' | 'twin_cards';
  score: number;
  maxStreak: number;
  xpEarned: number;
  topic: string;
  sublevel: string;
  twinPairs?: TwinCardPairData[];
  mysteryWordData?: MysteryWordData;
  onClose: () => void;
  onReplay: () => void;
  onGoToDashboard: () => void;
}

export default function GameReviewModal({
  isOpen,
  gameType,
  score,
  maxStreak,
  xpEarned,
  topic,
  sublevel,
  twinPairs,
  mysteryWordData,
  onClose,
  onReplay,
  onGoToDashboard,
}: GameReviewModalProps) {
  const [activeSpeechIdx, setActiveSpeechIdx] = useState<number | null>(null);
  const [spokenTestIndex, setSpokenTestIndex] = useState<number | null>(null);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [recognitionSuccess, setRecognitionSuccess] = useState<Record<number, boolean>>({});

  if (!isOpen) return null;

  // Speak target phrase with English TTS
  const handlePlayAudio = async (text: string, idx: number) => {
    setActiveSpeechIdx(idx);
    try {
      await playTutorVoice(text, 'en');
    } catch (err) {
      console.warn('Review audio playback error:', err);
    } finally {
      setActiveSpeechIdx(null);
    }
  };

  // Student speech practice with native Web Speech Recognition
  const handleStartPracticeMic = (targetPhrase: string, idx: number) => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Tu navegador no soporta reconocimiento de voz nativo.');
      return;
    }

    setSpokenTestIndex(idx);
    setUserTranscript('');

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      setUserTranscript(t);
    };

    rec.onend = () => {
      setSpokenTestIndex(null);
      // Clean and compare
      const cleanTarget = targetPhrase.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const cleanUser = userTranscript.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const isMatch = cleanUser.length > 0 && (cleanTarget.includes(cleanUser) || cleanUser.includes(cleanTarget));
      
      setRecognitionSuccess((prev) => ({
        ...prev,
        [idx]: isMatch,
      }));
    };

    rec.onerror = () => {
      setSpokenTestIndex(null);
    };

    rec.start();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="w-full max-w-4xl bg-gradient-to-b from-slate-900 via-brand-dark to-slate-950 border-2 border-brand-accent/60 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
      >
        {/* ── Modal Header: Summary, Trophy, XP & Streak ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-cyan via-brand-accent to-brand-gold flex items-center justify-center text-3xl shadow-xl shadow-brand-cyan/20">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider">
                  Cierre Pedagógico
                </span>
                <span className="text-xs text-brand-text-muted font-mono">{sublevel}</span>
              </div>
              <h2 className="text-2xl font-outfit font-extrabold text-white mt-0.5">
                {gameType === 'mystery_word' ? 'Dominio de Palabra Misteriosa' : 'Tabla de Repaso: Cartas Gemelas'}
              </h2>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-brand-surface border border-brand-gold/40 text-brand-gold">
              <Award size={18} />
              <div>
                <div className="text-[10px] uppercase font-bold text-brand-gold/80">Puntos Totales</div>
                <div className="text-base font-extrabold font-mono">{score} pts</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300">
              <Sparkles size={18} className="text-emerald-400 animate-pulse" />
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-400">XP Ganado</div>
                <div className="text-base font-extrabold font-mono">+{xpEarned} XP</div>
              </div>
            </div>

            {maxStreak > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300">
                <Flame size={18} className="text-amber-400" />
                <span className="text-xs font-bold">Racha x{maxStreak}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Pedagogical Review Content ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-brand-cyan" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Conceptos Clave & Práctica de Pronunciación
              </h3>
            </div>
            <span className="text-xs text-brand-text-muted">
              Haz clic en el altavoz o micrófono para practicar
            </span>
          </div>

          {/* Table / List of review pairs for Twin Cards */}
          {gameType === 'twin_cards' && twinPairs && (
            <div className="space-y-3">
              {twinPairs.map((pair, idx) => {
                const isPlaying = activeSpeechIdx === idx;
                const isRecording = spokenTestIndex === idx;
                const passed = recognitionSuccess[idx];

                return (
                  <div
                    key={pair.pair_id || idx}
                    className="p-4 rounded-2xl glass border border-brand-border/60 hover:border-brand-cyan/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                  >
                    {/* Concept Pairing */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl bg-brand-surface border border-brand-cyan/30 text-white font-extrabold text-xs flex items-center gap-1.5">
                          <span>{pair.card_a.icon}</span>
                          <span>{pair.card_a.text}</span>
                        </span>

                        <span className="text-brand-cyan text-xs font-bold">↔</span>

                        <span className="px-2.5 py-1 rounded-xl bg-brand-surface border border-purple-400/30 text-white font-extrabold text-xs flex items-center gap-1.5">
                          <span>{pair.card_b.icon}</span>
                          <span>{pair.card_b.text}</span>
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-surface/60 text-brand-text-muted">
                          {pair.card_a.category}
                        </span>
                      </div>

                      {/* Explanation */}
                      <p className="text-xs text-brand-text-secondary leading-relaxed">
                        {pair.explanation}
                      </p>

                      {/* Example sentence with translation */}
                      <div className="text-xs font-semibold text-brand-cyan bg-brand-cyan/10 p-2.5 rounded-xl border border-brand-cyan/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span>"{pair.audio_phrase}"</span>
                        <span className="text-brand-text-muted text-[11px] italic font-normal">
                          ({pair.audio_translation})
                        </span>
                      </div>
                    </div>

                    {/* Audio & Mic Practice Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(pair.audio_phrase, idx)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                          isPlaying
                            ? 'bg-brand-cyan text-slate-900 border-brand-cyan shadow-lg shadow-brand-cyan/40 scale-105'
                            : 'bg-brand-surface hover:bg-brand-surface/80 text-brand-cyan border-brand-cyan/30'
                        }`}
                        title="Escuchar pronunciación completa"
                      >
                        <Volume2 size={15} className={isPlaying ? 'animate-pulse' : ''} />
                        <span>Escuchar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartPracticeMic(pair.audio_phrase, idx)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                          isRecording
                            ? 'bg-red-500 text-white border-red-500 animate-pulse'
                            : passed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-brand-surface hover:bg-brand-surface/80 text-brand-gold border-brand-gold/30'
                        }`}
                        title="Repite la frase por voz para validar tu pronunciación"
                      >
                        {passed ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Mic size={15} />}
                        <span>{isRecording ? 'Grabando...' : passed ? '¡Perfecto!' : 'Practicar'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mystery Word Review */}
          {gameType === 'mystery_word' && mysteryWordData && (
            <div className="p-5 rounded-2xl glass border border-brand-cyan/30 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-outfit font-extrabold text-brand-cyan uppercase tracking-wider">
                  {mysteryWordData.target_word}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-brand-surface border border-white/10 text-xs font-mono text-brand-gold">
                  {mysteryWordData.category || topic}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-brand-surface/60 border border-white/10">
                  <strong className="text-brand-cyan block mb-1">Definición Pedagógica:</strong>
                  <p className="text-brand-text-secondary">{mysteryWordData.clue_definition}</p>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface/60 border border-white/10">
                  <strong className="text-purple-400 block mb-1">Sinónimos & Colocaciones:</strong>
                  <p className="text-brand-text-secondary">{mysteryWordData.clue_synonym}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-extrabold text-white font-outfit">
                    "{mysteryWordData.example_sentence}"
                  </div>
                  <div className="text-xs text-brand-text-secondary italic">
                    {mysteryWordData.example_translation}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(mysteryWordData.example_sentence, 999)}
                    className="px-3 py-2 rounded-xl bg-brand-cyan text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md hover:scale-105 transition-transform"
                  >
                    <Volume2 size={14} />
                    <span>Escuchar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartPracticeMic(mysteryWordData.example_sentence, 999)}
                    className="px-3 py-2 rounded-xl bg-brand-gold/20 text-brand-gold border border-brand-gold/40 font-extrabold text-xs flex items-center gap-1.5 hover:bg-brand-gold/30 transition-colors"
                  >
                    <Mic size={14} />
                    <span>Repetir</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Navigation Actions ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-brand-border/60 pt-4 mt-2">
          <button
            type="button"
            onClick={onReplay}
            className="w-full sm:w-auto px-5 py-3 rounded-xl glass hover:bg-brand-surface border border-brand-border text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            <span>Jugar de Nuevo</span>
          </button>

          <button
            type="button"
            onClick={onGoToDashboard}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-brand-cyan hover:opacity-95 text-white text-xs sm:text-sm font-extrabold transition-all shadow-xl shadow-brand-accent/30 flex items-center justify-center gap-2 hover:scale-105"
          >
            <span>Guardar Progreso & Volver al Panel</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
