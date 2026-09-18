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
import { StoryQuestData } from './POVQuestGame';

interface GameReviewModalProps {
  isOpen: boolean;
  gameType: 'mystery_word' | 'twin_cards' | 'pov_quest';
  score: number;
  maxStreak: number;
  xpEarned: number;
  topic: string;
  sublevel: string;
  twinPairs?: TwinCardPairData[];
  mysteryWordData?: MysteryWordData;
  questData?: StoryQuestData;
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
  questData,
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="w-full max-w-4xl bg-gradient-to-b from-slate-900 via-brand-dark to-slate-950 border-2 border-brand-accent/60 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 shadow-2xl flex flex-col gap-4 sm:gap-6 max-h-[92vh] overflow-y-auto"
      >
        {/* ── Modal Header: Summary, Trophy, XP & Streak ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-brand-border/60 pb-3 sm:pb-5">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand-cyan via-brand-accent to-brand-gold flex items-center justify-center text-2xl sm:text-3xl shadow-xl shadow-brand-cyan/20 flex-shrink-0">
              🏆
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  Cierre Pedagógico
                </span>
                <span className="text-[10px] sm:text-xs text-brand-text-muted font-mono">{sublevel}</span>
              </div>
              <h2 className="text-base sm:text-xl md:text-2xl font-outfit font-extrabold text-white mt-0.5 leading-tight">
                {gameType === 'pov_quest'
                  ? 'Misión POV Completada con Éxito'
                  : gameType === 'mystery_word'
                  ? 'Dominio de Palabra Misteriosa'
                  : 'Tabla de Repaso: Cartas Gemelas'}
              </h2>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
            <div className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-brand-surface border border-brand-gold/40 text-brand-gold">
              <Award size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-brand-gold/80 truncate">Puntos Totales</div>
                <div className="text-xs sm:text-base font-extrabold font-mono truncate">{score} pts</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300">
              <Sparkles size={16} className="sm:w-[18px] sm:h-[18px] text-emerald-400 animate-pulse flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 truncate">XP Ganado</div>
                <div className="text-xs sm:text-base font-extrabold font-mono truncate">+{xpEarned} XP</div>
              </div>
            </div>

            {maxStreak > 1 && (
              <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300">
                <Flame size={16} className="text-amber-400 flex-shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold">Racha x{maxStreak}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Pedagogical Review Content ── */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <BookOpen size={16} className="text-brand-cyan sm:w-[18px] sm:h-[18px]" />
              <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                Conceptos Clave & Práctica de Pronunciación
              </h3>
            </div>
            <span className="text-[10px] sm:text-xs text-brand-text-muted">
              Haz clic en el altavoz o micrófono para practicar
            </span>
          </div>

          {/* Table / List of review pairs for Twin Cards */}
          {gameType === 'twin_cards' && twinPairs && (
            <div className="space-y-2.5 sm:space-y-3">
              {twinPairs.map((pair, idx) => {
                const isPlaying = activeSpeechIdx === idx;
                const isRecording = spokenTestIndex === idx;
                const passed = recognitionSuccess[idx];

                return (
                  <div
                    key={pair.pair_id || idx}
                    className="p-3 sm:p-4 rounded-xl sm:rounded-2xl glass border border-brand-border/60 hover:border-brand-cyan/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 group"
                  >
                    {/* Concept Pairing */}
                    <div className="space-y-1.5 flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-brand-surface border border-brand-cyan/30 text-white font-extrabold text-[11px] sm:text-xs flex items-center gap-1">
                          <span>{pair.card_a.icon}</span>
                          <span>{pair.card_a.text}</span>
                        </span>

                        <span className="text-brand-cyan text-xs font-bold">↔</span>

                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-brand-surface border border-purple-400/30 text-white font-extrabold text-[11px] sm:text-xs flex items-center gap-1">
                          <span>{pair.card_b.icon}</span>
                          <span>{pair.card_b.text}</span>
                        </span>

                        <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-surface/60 text-brand-text-muted">
                          {pair.card_a.category}
                        </span>
                      </div>

                      {/* Explanation */}
                      <p className="text-[11px] sm:text-xs text-brand-text-secondary leading-relaxed">
                        {pair.explanation}
                      </p>

                      {/* Example sentence with translation */}
                      <div className="text-[11px] sm:text-xs font-semibold text-brand-cyan bg-brand-cyan/10 p-2 sm:p-2.5 rounded-xl border border-brand-cyan/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                        <span>"{pair.audio_phrase}"</span>
                        <span className="text-brand-text-muted text-[10px] sm:text-[11px] italic font-normal">
                          ({pair.audio_translation})
                        </span>
                      </div>
                    </div>

                    {/* Audio & Mic Practice Controls */}
                    <div className="w-full md:w-auto grid grid-cols-2 md:flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(pair.audio_phrase, idx)}
                        className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold ${
                          isPlaying
                            ? 'bg-brand-cyan text-slate-900 border-brand-cyan shadow-lg shadow-brand-cyan/40 scale-105'
                            : 'bg-brand-surface hover:bg-brand-surface/80 text-brand-cyan border-brand-cyan/30'
                        }`}
                        title="Escuchar pronunciación completa"
                      >
                        <Volume2 size={14} className={isPlaying ? 'animate-pulse' : ''} />
                        <span>Escuchar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartPracticeMic(pair.audio_phrase, idx)}
                        className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold ${
                          isRecording
                            ? 'bg-red-500 text-white border-red-500 animate-pulse'
                            : passed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-brand-surface hover:bg-brand-surface/80 text-brand-gold border-brand-gold/30'
                        }`}
                        title="Repite la frase por voz para validar tu pronunciación"
                      >
                        {passed ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Mic size={14} />}
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
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl glass border border-brand-cyan/30 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-outfit font-extrabold text-brand-cyan uppercase tracking-wider">
                  {mysteryWordData.target_word}
                </span>
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-brand-surface border border-white/10 text-[11px] sm:text-xs font-mono text-brand-gold">
                  {mysteryWordData.category || topic}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                <div className="p-2.5 sm:p-3 rounded-xl bg-brand-surface/60 border border-white/10">
                  <strong className="text-brand-cyan block mb-1 text-[11px] sm:text-xs">Definición Pedagógica:</strong>
                  <p className="text-brand-text-secondary text-[11px] sm:text-xs leading-relaxed">{mysteryWordData.clue_definition}</p>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-brand-surface/60 border border-white/10">
                  <strong className="text-purple-400 block mb-1 text-[11px] sm:text-xs">Sinónimos & Colocaciones:</strong>
                  <p className="text-brand-text-secondary text-[11px] sm:text-xs leading-relaxed">{mysteryWordData.clue_synonym}</p>
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 w-full">
                  <div className="text-xs sm:text-sm font-extrabold text-white font-outfit">
                    "{mysteryWordData.example_sentence}"
                  </div>
                  <div className="text-[10px] sm:text-xs text-brand-text-secondary italic">
                    {mysteryWordData.example_translation}
                  </div>
                </div>

                <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(mysteryWordData.example_sentence, 999)}
                    className="px-3 py-2 rounded-xl bg-brand-cyan text-slate-950 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-105 transition-transform"
                  >
                    <Volume2 size={14} />
                    <span>Escuchar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartPracticeMic(mysteryWordData.example_sentence, 999)}
                    className="px-3 py-2 rounded-xl bg-brand-gold/20 text-brand-gold border border-brand-gold/40 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 hover:bg-brand-gold/30 transition-colors"
                  >
                    <Mic size={14} />
                    <span>Repetir</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* POV Quest Review */}
          {gameType === 'pov_quest' && questData && questData.nodes && (
            <div className="space-y-2.5 sm:space-y-3">
              {questData.nodes.map((node, idx) => {
                const isPlaying = activeSpeechIdx === idx;
                const isRecording = spokenTestIndex === idx;
                const passed = recognitionSuccess[idx];
                const phraseToPractice = node.example_phrase || node.companion_dialogue;

                return (
                  <div
                    key={node.node_id || idx}
                    className="p-3 sm:p-4 rounded-xl sm:rounded-2xl glass border border-brand-border/60 hover:border-brand-gold/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-2 flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-brand-gold/20 text-brand-gold font-bold text-[11px] sm:text-xs flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold text-white leading-snug">{node.pedagogical_goal}</span>
                      </div>

                      <div className="p-2 sm:p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
                        <div className="text-[11px] sm:text-xs font-semibold text-brand-cyan">
                          {questData.companion_name || 'Emma'}: "{node.companion_dialogue}"
                        </div>
                        {node.example_phrase && (
                          <div className="text-[10px] sm:text-xs text-emerald-300 font-medium italic">
                            💡 Respuesta modelo: "{node.example_phrase}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Audio & Mic Practice Controls */}
                    <div className="w-full md:w-auto grid grid-cols-2 md:flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(phraseToPractice, idx)}
                        className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold ${
                          isPlaying
                            ? 'bg-brand-cyan text-slate-900 border-brand-cyan shadow-lg shadow-brand-cyan/40 scale-105'
                            : 'bg-brand-surface hover:bg-brand-surface/80 text-brand-cyan border-brand-cyan/30'
                        }`}
                        title="Escuchar modelo de pronunciación"
                      >
                        <Volume2 size={14} className={isPlaying ? 'animate-pulse' : ''} />
                        <span>Escuchar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartPracticeMic(phraseToPractice, idx)}
                        className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold ${
                          isRecording
                            ? 'bg-red-500 text-white border-red-500 animate-pulse'
                            : passed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-brand-surface hover:bg-brand-surface/80 text-brand-gold border-brand-gold/30'
                        }`}
                        title="Repite la frase por voz para validar tu pronunciación"
                      >
                        {passed ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Mic size={14} />}
                        <span>{isRecording ? 'Grabando...' : passed ? '¡Excelente!' : 'Practicar'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer Navigation Actions ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 border-t border-brand-border/60 pt-3 sm:pt-4 mt-1 sm:mt-2">
          <button
            type="button"
            onClick={onReplay}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl glass hover:bg-brand-surface border border-brand-border text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={15} />
            <span>Jugar de Nuevo</span>
          </button>

          <button
            type="button"
            onClick={onGoToDashboard}
            className="w-full sm:w-auto px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-brand-accent to-brand-cyan hover:opacity-95 text-white text-xs sm:text-sm font-extrabold transition-all shadow-xl shadow-brand-accent/30 flex items-center justify-center gap-2 hover:scale-105"
          >
            <span>Guardar Progreso & Volver al Panel</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
