'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from './TutorAvatar.module.css';
import {
  getAudioSpeechMetrics,
  attachAudioElementToAnalyzer,
  SpeechMetrics,
} from '@/lib/audioAnalyzer';
import type { UpgradeStage } from '@/lib/guionbajoUpgrades';

export type TutorState = 'idle' | 'speaking' | 'listening' | 'thinking';
export type TutorEmotion = 'neutral' | 'happy' | 'thinking' | 'nervous' | 'angry' | 'victory';

export interface TutorAvatarProps {
  state?: TutorState;
  text?: string;
  audioProgress?: number; // 0 to 100 (sincronizado con DynamicSubtitles / Audio)
  emotion?: TutorEmotion;
  size?: 'sm' | 'md' | 'lg' | 'toolbar';
  headOnly?: boolean;
  className?: string;
  audioElement?: HTMLAudioElement | null;
  crtLabel?: string;
  crtColor?: string;
  sparkBulb?: boolean;
  drowned?: boolean;
  panickedArms?: boolean;
  shortCircuit?: boolean;
  /** Nivel de evolución visual de Guionbajo (0 = base, 8 = maestro) */
  upgradeStage?: UpgradeStage;
}

interface EmotionSegment {
  emotion: TutorEmotion;
  text: string;
  relativeStart: number;
}

/**
 * Parsea el texto del tutor extrayendo tags [EMOTION: xxx] o segmentando por oraciones
 * para calcular los cambios de emoción en tiempo real a lo largo de la narración.
 */
function parseEmotionSegments(rawText: string): EmotionSegment[] {
  if (!rawText || typeof rawText !== 'string') {
    return [{ emotion: 'neutral', text: '', relativeStart: 0 }];
  }

  const clean = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const tagRegex = /\[?EMOTION:\s*(neutral|happy|thinking|nervous|angry|victory)\]?/gi;
  const matches: Array<{ emotion: string; index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(clean)) !== null) {
    matches.push({
      emotion: m[1],
      index: m.index,
      length: m[0].length,
    });
  }

  const segments: Array<{ emotion: TutorEmotion; text: string; charCount: number }> = [];

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const emo = match.emotion.toLowerCase() as TutorEmotion;
      const startIndex = match.index + match.length;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : clean.length;
      const segText = clean.substring(startIndex, endIndex).replace(/\[?EMOTION:\s*\w+\]?/gi, '').trim();

      if (segText.length > 0) {
        segments.push({
          emotion: emo,
          text: segText,
          charCount: segText.length,
        });
      }
    }
  }

  // Fallback: segmentar por oraciones y evaluar tono contextual
  if (segments.length === 0) {
    const sentences = clean.split(/(?<=[.?!—\n])\s+/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) {
      sentences.forEach(sentence => {
        segments.push({
          emotion: inferSentenceEmotion(sentence),
          text: sentence.trim(),
          charCount: sentence.trim().length,
        });
      });
    } else {
      segments.push({
        emotion: inferSentenceEmotion(clean),
        text: clean,
        charCount: clean.length,
      });
    }
  }

  const totalChars = segments.reduce((sum, s) => sum + s.charCount, 0) || 1;
  let cumulative = 0;

  return segments.map(s => {
    const relativeStart = cumulative / totalChars;
    cumulative += s.charCount;
    return {
      emotion: s.emotion,
      text: s.text,
      relativeStart,
    };
  });
}

function inferSentenceEmotion(text: string): TutorEmotion {
  const t = text.toLowerCase();
  if (/grrr|angry|furious|mad|rude|how dare|boiling|circuits|disrespect/i.test(t)) return 'angry';
  if (/suspense|scary|horror|dark|ghost|midnight|run|footsteps|breath|whisper|nervous/i.test(t)) return 'nervous';
  if (/haha|love|delicious|great|awesome|wonderful|yay|fantastic|excellent|perfect|glad|happy|fun/i.test(t)) return 'happy';
  if (/let me think|hmm|interesting|consider|ponder|actually|notice how|why|difference/i.test(t)) return 'thinking';
  if (/congratulations|you won|100%|champion|victory|correct!/i.test(t)) return 'victory';
  return 'neutral';
}

export default function TutorAvatar({
  state = 'idle',
  text = '',
  audioProgress = 0,
  emotion: explicitEmotion,
  size = 'md', // callers can use lg for hero sections
  headOnly = false,
  className = '',
  audioElement,
  crtLabel,
  crtColor: explicitCrtColor,
  sparkBulb = false,
  drowned = false,
  panickedArms = false,
  shortCircuit = false,
  upgradeStage = 0,
}: TutorAvatarProps) {
  // El avatar está en modo speaking si el estado es speaking y el progreso no ha concluido
  const isSpeaking = state === 'speaking' && (audioProgress === undefined || audioProgress < 99);

  // Auto-attach passed audio element to analyser if available
  useEffect(() => {
    if (audioElement) {
      attachAudioElementToAnalyzer(audioElement);
    }
  }, [audioElement]);

  // ── 60 FPS Real-time Web Audio & Syllabic Lip-Sync Engine ────────────────
  const [speechAperture, setSpeechAperture] = useState(0); // 0.0 (closed) to 1.0 (fully open)
  const [teethBands, setTeethBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const audioProgressRef = useRef(audioProgress);
  audioProgressRef.current = audioProgress;

  useEffect(() => {
    if (!isSpeaking) {
      setSpeechAperture(0);
      setTeethBands([0, 0, 0, 0, 0, 0, 0]);
      return;
    }

    let rafId: number;
    const startTime = performance.now();

    const animateSpeech = (time: number) => {
      // 1. Primary: Direct Web Audio API Analyser (Zero Latency Live Speech Analysis)
      const metrics: SpeechMetrics = getAudioSpeechMetrics();

      if (metrics.hasActiveAudio) {
        // Only open mouth if real acoustic voice energy is present
        setSpeechAperture(metrics.aperture);
        setTeethBands(metrics.bandEnergies);
      } else if (audioElement && !audioElement.paused && !audioElement.ended) {
        // 2. Natural Syllabic Articulation while audio element is actively playing
        const elapsed = (time - startTime) / 1000;
        const primarySyllable = Math.abs(Math.sin(elapsed * 12)) * 0.6 + Math.abs(Math.sin(elapsed * 6)) * 0.4;
        const rawAperture = Math.min(0.85, Math.max(0.08, primarySyllable * 0.7));

        setSpeechAperture(rawAperture);
        setTeethBands([
          rawAperture * 0.6,
          rawAperture * 0.8,
          rawAperture * 1.0,
          rawAperture * 1.0,
          rawAperture * 1.0,
          rawAperture * 0.8,
          rawAperture * 0.6,
        ]);
      } else {
        // No acoustic energy / no audio playback: mouth stays closed and restful
        setSpeechAperture(0);
        setTeethBands([0, 0, 0, 0, 0, 0, 0]);
      }

      rafId = requestAnimationFrame(animateSpeech);
    };

    rafId = requestAnimationFrame(animateSpeech);
    return () => cancelAnimationFrame(rafId);
  }, [isSpeaking, audioElement]);

  // Parsear segmentos de emoción
  const segments = useMemo(() => parseEmotionSegments(text), [text]);

  // Determinar la emoción activa según audioProgress (0 a 100)
  const currentEmotion: TutorEmotion = useMemo(() => {
    if (explicitEmotion) return explicitEmotion;
    if (state === 'thinking') return 'thinking';
    if (state === 'listening') return 'happy';

    if (state === 'speaking' && segments.length > 0) {
      const progress = Math.min(1, Math.max(0, audioProgress / 100));
      let active = segments[0];
      for (let i = 0; i < segments.length; i++) {
        if (progress >= segments[i].relativeStart) {
          active = segments[i];
        } else {
          break;
        }
      }
      return active.emotion || 'neutral';
    }

    return segments[0]?.emotion || 'neutral';
  }, [explicitEmotion, state, segments, audioProgress]);

  // Boca activa únicamente cuando hay habla Y energía acústica real (> 0.04)
  const isMouthArticulating = isSpeaking && speechAperture > 0.04;

  // Alturas dinámicas de boca según tamaño
  const isToolbar = size === 'toolbar';
  const minMouthHeight = (size === 'sm' || isToolbar) ? 6 : size === 'lg' ? 10 : 8;
  const maxMouthHeight = isToolbar ? 12 : size === 'sm' ? 18 : size === 'lg' ? 32 : 24;
  const dynamicMouthHeight = !isMouthArticulating
    ? minMouthHeight
    : Math.round(minMouthHeight + speechAperture * (maxMouthHeight - minMouthHeight));

  // Clases por tamaño
  const sizeClass =
    isToolbar
      ? styles.sizeToolbar
      : size === 'sm'
      ? styles.sizeSm
      : size === 'lg'
      ? styles.sizeLg
      : styles.sizeMd;

  // Clases por emoción en cabeza
  const headEmotionClass =
    currentEmotion === 'happy'
      ? styles.headHappy
      : currentEmotion === 'thinking'
      ? styles.headThinking
      : currentEmotion === 'angry'
      ? styles.headAngry
      : currentEmotion === 'nervous'
      ? styles.headNervous
      : currentEmotion === 'victory'
      ? styles.headVictory
      : '';

  // Inclinación de cabeza (Head Tilt)
  const tiltClass =
    currentEmotion === 'thinking' || state === 'thinking'
      ? styles.tiltThinking
      : currentEmotion === 'nervous'
      ? styles.tiltNervous
      : currentEmotion === 'happy'
      ? styles.tiltHappy
      : '';

  // Glifo de pantalla CRT
  const crtGlyph =
    currentEmotion === 'happy'
      ? '^_^'
      : currentEmotion === 'thinking'
      ? '? ?'
      : currentEmotion === 'angry'
      ? 'ERR'
      : currentEmotion === 'nervous'
      ? '! !'
      : currentEmotion === 'victory'
      ? 'A+'
      : state === 'listening'
      ? 'REC'
      : '_';

  const crtColor =
    explicitCrtColor ||
    (drowned
      ? '#64748B'
      : currentEmotion === 'happy'
      ? '#00E676'
      : currentEmotion === 'thinking'
      ? '#6C63FF'
      : currentEmotion === 'angry'
      ? '#FF5252'
      : currentEmotion === 'nervous'
      ? '#FFB627'
      : currentEmotion === 'victory'
      ? '#FFB627'
      : '#00D4FF');

  return (
    <div className={`${styles.avatarWrapper} ${sizeClass} ${className}`}>
      
      {/* ── Stage 8: Aura Divina (Detrás de todo el avatar) ── */}
      {upgradeStage >= 8 && <div className={styles.godAura} />}

      {/* ── Stage 7: Mini-Dron Guioncito Orbital ── */}
      {upgradeStage >= 7 && (
        <div className={styles.miniDroneOrbit}>
          <div className={styles.miniDroneBody}>
            <svg width="24" height="20" viewBox="0 0 24 20" fill="none" overflow="visible">
              <line x1="2" y1="4" x2="10" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14" y1="4" x2="22" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="10" r="6" fill="#0f172a" stroke="#00D4FF" strokeWidth="1.5" />
              <circle cx="12" cy="10" r="2.5" fill="#00D4FF" />
              <line x1="12" y1="4" x2="12" y2="1" stroke="#00D4FF" strokeWidth="1" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Chorro de Vapor / Humo (cuando está Angry / Alterado y NO ahogado) ── */}
      <div className={styles.steamContainer}>
        <div className={`${styles.steamJet} ${styles.steamLeft} ${!drowned && currentEmotion === 'angry' ? styles.steamActive : ''}`} />
        <div className={`${styles.steamJet} ${styles.steamRight} ${!drowned && currentEmotion === 'angry' ? styles.steamActive : ''}`} />
      </div>

      {/* ── Cabeza del Robot ── */}
      <div
        className={`${styles.robotHead} ${headEmotionClass} ${tiltClass} ${isMouthArticulating ? styles.headSpeaking : ''} ${upgradeStage >= 4 ? styles.goldTrimHead : ''}`}
        style={{
          transform: isMouthArticulating ? `translateY(${speechAperture * -3}px)` : undefined,
        }}
      >
        {/* ── Stage 8: Corona Maestra Flotante ── */}
        {upgradeStage >= 8 && (
          <div className={styles.headCrown}>
            <svg width="44" height="26" viewBox="0 0 44 26" fill="none" overflow="visible">
              <path d="M 4 22 L 7 4 L 16 14 L 22 2 L 28 14 L 37 4 L 40 22 Z" fill="url(#crownGradHead)" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="7" cy="4" r="2" fill="#ffffff" />
              <circle cx="22" cy="2" r="2.5" fill="#fef08a" />
              <circle cx="37" cy="4" r="2" fill="#ffffff" />
              <defs>
                <linearGradient id="crownGradHead" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* ── Stage 5: Bobina Tesla Cuántica ── */}
        {upgradeStage >= 5 && (
          <div className={styles.teslaCoil}>
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none" overflow="visible">
              <ellipse cx="16" cy="18" rx="12" ry="3.5" stroke="#00D4FF" strokeWidth="1.5" opacity="0.95" />
              <ellipse cx="16" cy="12" rx="9" ry="2.8" stroke="#00D4FF" strokeWidth="1.5" opacity="0.8" />
              <ellipse cx="16" cy="6" rx="6" ry="2" stroke="#00D4FF" strokeWidth="1.5" opacity="0.7" />
              <circle cx="16" cy="2" r="2" fill="#ffffff" />
            </svg>
          </div>
        )}

        {/* ── Stage 3: Visor HUD Táctico Neón ── */}
        {upgradeStage >= 3 && (
          <div className={styles.headHudVisor}>
            <div className={styles.hudScanline} />
            <span style={{ fontSize: '7px', fontFamily: 'monospace', color: '#00D4FF', fontWeight: 900 }}>HUD</span>
            <span style={{ fontSize: '7px', fontFamily: 'monospace', color: '#00D4FF', fontWeight: 900 }}>SYS</span>
          </div>
        )}
        
        {/* Diales laterales tipo potenciómetro */}
        <div className={`${styles.earDial} ${styles.earLeft}`}>
          <div className={styles.dialNotch} />
        </div>
        <div className={`${styles.earDial} ${styles.earRight}`}>
          <div className={styles.dialNotch} />
        </div>

        {/* Remaches */}
        <div className={`${styles.rivet} ${styles.rTl}`} />
        <div className={`${styles.rivet} ${styles.rTr}`} />
        <div className={`${styles.rivet} ${styles.rBl}`} />
        <div className={`${styles.rivet} ${styles.rBr}`} />

        {/* Antena con bulbo de vacío y filamento */}
        <div className={styles.robotAntenna}>
          <div className={styles.antennaStem} />
          <div
            className={`${styles.vacuumBulb} ${
              !drowned && (isSpeaking || state === 'listening') ? styles.bulbActive : ''
            } ${!drowned && (currentEmotion === 'thinking' || state === 'thinking' || sparkBulb || shortCircuit) ? styles.bulbSpark : ''}`}
          >
            <div className={styles.bulbFilament} />
          </div>
        </div>

        {/* Ojos con Obturadores / Párpados Mecánicos */}
        <div className={styles.robotEyes}>
          {[0, 1].map(i => (
            <div key={i} className={styles.eyeSocket}>
              {/* Párpado superior mecánico */}
              <div
                className={`${styles.shutter} ${styles.shutterTop} ${
                  drowned
                    ? styles.shutterClosedTop
                    : currentEmotion === 'angry'
                    ? `${styles.angryShutterTop} ${i === 0 ? styles.angryShutterLeft : styles.angryShutterRight}`
                    : state === 'idle' && currentEmotion === 'neutral'
                    ? `${styles.idleBlink} ${i === 1 ? styles.shutterRight : ''}`
                    : ''
                }`}
              />

              {/* Lente neón / pupila */}
              <div className={styles.eyeLens}>
                <div
                  className={`${styles.pupil} ${
                    drowned
                      ? styles.drownedPupil
                      : currentEmotion === 'happy' || currentEmotion === 'victory'
                      ? styles.happyPupil
                      : currentEmotion === 'angry'
                      ? styles.angryPupil
                      : currentEmotion === 'thinking' || state === 'thinking'
                      ? styles.thinkingPupil
                      : currentEmotion === 'nervous'
                      ? styles.nervousPupil
                      : state === 'idle' && currentEmotion === 'neutral'
                      ? styles.idleLook
                      : ''
                  }`}
                />
                {!drowned && <div className={styles.eyeGlint} />}
              </div>

              {/* Párpado inferior mecánico */}
              <div
                className={`${styles.shutter} ${styles.shutterBottom} ${
                  drowned
                    ? styles.shutterClosedBottom
                    : currentEmotion === 'happy' || currentEmotion === 'victory'
                    ? styles.happyShutterBottom
                    : ''
                }`}
              />
            </div>
          ))}
        </div>

        {/* Boca: Dientes Bender de 7 barras o Cursor Terminal '_' en reposo/silencio */}
        <div
          className={`${styles.mouthFrame} ${!isMouthArticulating ? styles.mouthClosed : styles.mouthSpeaking}`}
          style={{
            height: `${dynamicMouthHeight}px`,
          }}
        >
          {!isMouthArticulating ? (
            // Reposo / Silencio: Cursor terminal titilante '_' en hendidura cerrada
            <div className={styles.terminalCursorMouth}>_</div>
          ) : (
            // Hablando con sonido activo: Rejilla de 7 dientes neón modulados a 60 FPS con análisis espectral
            <div className={styles.benderTeethGrille}>
              {[0, 1, 2, 3, 4, 5, 6].map(barIdx => {
                const bandEnergy = teethBands[barIdx] || 0;
                const isCenter = barIdx >= 2 && barIdx <= 4;
                const isLit = speechAperture > 0.05 && (bandEnergy > 0.15 || (isCenter && speechAperture > 0.2));
                const barHeight = Math.max(
                  4,
                  Math.round(dynamicMouthHeight * (0.35 + (isLit ? bandEnergy * 0.55 + 0.1 : 0.1)))
                );
                return (
                  <div
                    key={barIdx}
                    className={`${styles.toothBar} ${isLit ? styles.toothLit : styles.toothDim}`}
                    style={{
                      height: `${barHeight}px`,
                      opacity: isLit ? Math.min(1, 0.4 + bandEnergy * 0.6) : 0.2,
                      boxShadow: isLit
                        ? `0 0 ${Math.max(2, Math.round(speechAperture * 10))}px 2px rgba(255,255,200,0.95)`
                        : 'none',
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Torso / Pantalla CRT abombada ── */}
      {!headOnly && (
        <div className={`${styles.robotBody} ${upgradeStage >= 4 ? styles.goldTrimBody : ''}`}>
          
          {/* ── Stage 2: Jetpack Dorsal Doble Tobera ── */}
          {upgradeStage >= 2 && (
            <div className={styles.bodyJetpack}>
              <div className="flex flex-col items-center">
                <div className="w-3 sm:w-3.5 h-6 sm:h-7 rounded-sm bg-gradient-to-b from-slate-700 to-slate-950 border border-slate-600 shadow-md" />
                <div className="w-2.5 sm:w-3 h-1.5 bg-slate-800 rounded-b border-t border-cyan-400" />
                <div className="w-2 sm:w-2.5 h-3.5 sm:h-4 bg-gradient-to-b from-cyan-300 via-blue-500 to-transparent rounded-full blur-[0.5px] animate-pulse" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-3 sm:w-3.5 h-6 sm:h-7 rounded-sm bg-gradient-to-b from-slate-700 to-slate-950 border border-slate-600 shadow-md" />
                <div className="w-2.5 sm:w-3 h-1.5 bg-slate-800 rounded-b border-t border-cyan-400" />
                <div className="w-2 sm:w-2.5 h-3.5 sm:h-4 bg-gradient-to-b from-cyan-300 via-blue-500 to-transparent rounded-full blur-[0.5px] animate-pulse" />
              </div>
            </div>
          )}

          {/* ── Stage 6: Alas Holográficas de Plasma ── */}
          {upgradeStage >= 6 && (
            <div className={styles.plasmaWings}>
              <svg width="40" height="46" viewBox="0 0 40 46" fill="none" overflow="visible">
                <path d="M 38 35 Q 8 20 2 2 Q 12 18 38 25 Z" fill="url(#wingGradLeft)" stroke="#818cf8" strokeWidth="1" opacity="0.85" />
                <line x1="36" y1="28" x2="10" y2="16" stroke="#c7d2fe" strokeWidth="0.8" opacity="0.6" />
                <defs>
                  <linearGradient id="wingGradLeft" x1="1" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
              </svg>
              <svg width="40" height="46" viewBox="0 0 40 46" fill="none" overflow="visible">
                <path d="M 2 35 Q 32 20 38 2 Q 28 18 2 25 Z" fill="url(#wingGradRight)" stroke="#818cf8" strokeWidth="1" opacity="0.85" />
                <line x1="4" y1="28" x2="30" y2="16" stroke="#c7d2fe" strokeWidth="0.8" opacity="0.6" />
                <defs>
                  <linearGradient id="wingGradRight" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* Brazos Mecánicos */}
          {['left', 'right'].map((side) => {
            const isLeft = side === 'left';
            const armClass = isLeft ? styles.armLeft : styles.armRight;
            let animClass = '';
            if (panickedArms && !drowned) {
              animClass = isLeft ? styles.armPanicLeft : styles.armPanicRight;
            } else if (currentEmotion === 'happy' || currentEmotion === 'victory') {
              animClass = isLeft ? styles.armCelebrateLeft : styles.armCelebrateRight;
            } else if (isMouthArticulating) {
              animClass = isLeft ? styles.armSpeakingLeft : styles.armSpeakingRight;
            }
            return (
              <div
                key={side}
                className={`${styles.robotArm} ${armClass} ${animClass}`}
                style={upgradeStage >= 1 ? { filter: 'drop-shadow(0 0 3px rgba(0,212,255,0.7))' } : undefined}
              >
                <div className={styles.armUpper} style={upgradeStage >= 1 ? { background: 'linear-gradient(180deg, #94a3b8, #475569)' } : undefined} />
                <div className={styles.armJoint} style={upgradeStage >= 1 ? { background: '#00D4FF', boxShadow: '0 0 4px #00D4FF' } : undefined} />
                <div className={styles.armForearm} style={upgradeStage >= 1 ? { background: 'linear-gradient(180deg, #64748b, #334155)', borderBottom: '2px solid #00D4FF' } : undefined} />
              </div>
            );
          })}

          <div className={`${styles.crtMonitor} ${styles.crtFlicker}`}>
            <div className={styles.crtScanlines} />
            <div className={styles.crtContent} style={{ color: crtColor }}>
              {state === 'speaking' ? (
                <div className={styles.eqContainer}>
                  <div className={styles.eqBar} />
                  <div className={styles.eqBar} />
                  <div className={styles.eqBar} />
                </div>
              ) : state === 'thinking' ? (
                <span className={styles.loadingDots} />
              ) : state === 'listening' ? (
                <span className={styles.pulseRec}>●REC</span>
              ) : (
                crtLabel || crtGlyph
              )}
            </div>
          </div>

          {/* Micropropulsor Magnético Inferior */}
          <div className={styles.hoverThruster}>
            <div className={styles.thrusterNozzle} />
            {!drowned && (
              <div className={`${styles.plasmaFlame} ${isMouthArticulating ? styles.plasmaHigh : ''}`} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
