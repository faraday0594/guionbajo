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
      
      {/* ── Chorro de Vapor / Humo (cuando está Angry / Alterado y NO ahogado) ── */}
      <div className={styles.steamContainer}>
        <div className={`${styles.steamJet} ${styles.steamLeft} ${!drowned && currentEmotion === 'angry' ? styles.steamActive : ''}`} />
        <div className={`${styles.steamJet} ${styles.steamRight} ${!drowned && currentEmotion === 'angry' ? styles.steamActive : ''}`} />
      </div>

      {/* ── Cabeza del Robot ── */}
      <div
        className={`${styles.robotHead} ${headEmotionClass} ${tiltClass} ${isMouthArticulating ? styles.headSpeaking : ''}`}
        style={{
          transform: isMouthArticulating ? `translateY(${speechAperture * -3}px)` : undefined,
        }}
      >
        
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
        <div className={styles.robotBody}>
          
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
              <div key={side} className={`${styles.robotArm} ${armClass} ${animClass}`}>
                <div className={styles.armUpper} />
                <div className={styles.armJoint} />
                <div className={styles.armForearm} />
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

          {/* ══════════════════════════════════════════════════
              🔩 UPGRADE ACCESSORIES (overlays sobre el cuerpo)
              Cada upgrade se activa cuando upgradeStage ≥ N
              ══════════════════════════════════════════════════ */}
          {upgradeStage >= 1 && (
            <svg
              viewBox="0 0 120 140"
              className={styles.upgradeOverlay}
              overflow="visible"
              aria-hidden="true"
            >
              {/* Stage 1 🦾 — Brazos Articulados Cromados
                  Subraya los brazos base con piezas cromadas de acero azul */}
              {/* Placa cromada brazo izquierdo */}
              <rect x="2" y="62" width="16" height="5" rx="2.5"
                fill="url(#chromePlate)" stroke="#94a3b8" strokeWidth="0.8" />
              <rect x="1" y="74" width="14" height="4" rx="2"
                fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
              {/* Articulación izquierda */}
              <circle cx="9" cy="70" r="4" fill="#0f172a" stroke="#00D4FF" strokeWidth="1.2" />
              <circle cx="9" cy="70" r="1.5" fill="#00D4FF" opacity="0.9" />
              {/* Placa cromada brazo derecho */}
              <rect x="102" y="62" width="16" height="5" rx="2.5"
                fill="url(#chromePlate)" stroke="#94a3b8" strokeWidth="0.8" />
              <rect x="105" y="74" width="14" height="4" rx="2"
                fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
              {/* Articulación derecha */}
              <circle cx="111" cy="70" r="4" fill="#0f172a" stroke="#00D4FF" strokeWidth="1.2" />
              <circle cx="111" cy="70" r="1.5" fill="#00D4FF" opacity="0.9" />

              <defs>
                <linearGradient id="chromePlate" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="50%" stopColor="#cbd5e1" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {upgradeStage >= 2 && (
            <svg
              viewBox="0 0 120 140"
              className={styles.upgradeOverlay}
              overflow="visible"
              aria-hidden="true"
            >
              {/* Stage 2 🚀 — Jetpack Dorsal Doble Tobera
                  Dos toberas detrás del torso con plasma azul */}
              {/* Cuerpo del jetpack */}
              <rect x="38" y="68" width="12" height="30" rx="4"
                fill="#1e293b" stroke="#334155" strokeWidth="1.2" />
              <rect x="70" y="68" width="12" height="30" rx="4"
                fill="#1e293b" stroke="#334155" strokeWidth="1.2" />
              {/* Barra de conexión */}
              <rect x="42" y="72" width="36" height="6" rx="3"
                fill="#0f172a" stroke="#475569" strokeWidth="1" />
              {/* Toberas */}
              <rect x="39" y="96" width="10" height="5" rx="2"
                fill="url(#nozzleGrad)" stroke="#475569" strokeWidth="0.8" />
              <rect x="71" y="96" width="10" height="5" rx="2"
                fill="url(#nozzleGrad)" stroke="#475569" strokeWidth="0.8" />
              {/* Llamas de plasma (animadas) */}
              <ellipse cx="44" cy="104" rx="4" ry="7"
                fill="url(#plasmaFire)" opacity="0.85">
                <animate attributeName="ry" values="7;9;6;8;7" dur="0.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.85;0.7;0.9;0.8;0.85" dur="0.4s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="76" cy="104" rx="4" ry="7"
                fill="url(#plasmaFire)" opacity="0.85">
                <animate attributeName="ry" values="6;9;7;8;6" dur="0.45s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.75;0.85;0.7;0.9" dur="0.45s" repeatCount="indefinite" />
              </ellipse>
              {/* Núcleo brillante toberas */}
              <ellipse cx="44" cy="101" rx="2" ry="3" fill="#ffffff" opacity="0.9" />
              <ellipse cx="76" cy="101" rx="2" ry="3" fill="#ffffff" opacity="0.9" />

              <defs>
                <linearGradient id="nozzleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
                <linearGradient id="plasmaFire" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="25%" stopColor="#00d4ff" stopOpacity="0.95" />
                  <stop offset="65%" stopColor="#6366f1" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {upgradeStage >= 3 && (
            <svg
              viewBox="0 0 120 140"
              className={styles.upgradeOverlay}
              overflow="visible"
              aria-hidden="true"
            >
              {/* Stage 3 🥽 — Visor HUD Táctico Neón
                  Barra translúcida sobre los ojos con línea de escaneo */}
              <rect x="22" y="22" width="76" height="12" rx="4"
                fill="#0c1a2e" stroke="#00D4FF" strokeWidth="1.2" opacity="0.88" />
              {/* Líneas de HUD */}
              <line x1="26" y1="28" x2="42" y2="28" stroke="#00D4FF" strokeWidth="0.7" opacity="0.8" />
              <line x1="78" y1="28" x2="94" y2="28" stroke="#00D4FF" strokeWidth="0.7" opacity="0.8" />
              {/* Reticle central */}
              <circle cx="60" cy="28" r="3.5" fill="none" stroke="#00D4FF" strokeWidth="1" opacity="0.9" />
              <circle cx="60" cy="28" r="1" fill="#00D4FF" opacity="0.9" />
              {/* Scan line animada */}
              <rect x="24" y="26" width="72" height="1.5" fill="#00D4FF" opacity="0.35">
                <animate attributeName="y" values="24;32;24" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0.6;0.35" dur="2s" repeatCount="indefinite" />
              </rect>
              {/* Indicadores laterales */}
              <text x="26" y="30" fontFamily="monospace" fontSize="4" fill="#00D4FF" opacity="0.7">HUD</text>
              <text x="82" y="30" fontFamily="monospace" fontSize="4" fill="#00D4FF" opacity="0.7">ON</text>
            </svg>
          )}

          {upgradeStage >= 4 && (
            <svg
              viewBox="0 0 120 140"
              className={styles.upgradeOverlay}
              overflow="visible"
              aria-hidden="true"
            >
              {/* Stage 4 🛡️ — Ribetes de Chasis Dorados
                  Marco dorado sobre cabeza y torso */}
              {/* Marco cabeza */}
              <rect x="20" y="8" width="80" height="50" rx="12"
                fill="none" stroke="url(#goldFrame)" strokeWidth="2" opacity="0.85" />
              {/* Marco torso */}
              <rect x="30" y="62" width="60" height="38" rx="8"
                fill="none" stroke="url(#goldFrame)" strokeWidth="2" opacity="0.85" />
              {/* Insignia de nivel en el torso */}
              <text x="60" y="84" textAnchor="middle"
                fontFamily="monospace" fontSize="7" fontWeight="900"
                fill="#fbbf24" opacity="0.9">A2</text>
              {/* Corner accents */}
              <circle cx="21" cy="9" r="2" fill="#fbbf24" opacity="0.8" />
              <circle cx="99" cy="9" r="2" fill="#fbbf24" opacity="0.8" />

              <defs>
                <linearGradient id="goldFrame" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {upgradeStage >= 5 && (
            <svg
              viewBox="0 0 120 140"
              className={styles.upgradeOverlay}
              overflow="visible"
              aria-hidden="true"
            >
              {/* Stage 5 📡 — Bobina Tesla Cuántica
                  Reemplaza la antena simple con una bobina animada */}
              {/* Anillos de la bobina */}
              {[0, 1, 2, 3].map((i) => (
                <ellipse
                  key={i}
                  cx="60"
                  cy={-14 - i * 5}
                  rx="8"
                  ry="3"
                  fill="none"
                  stroke="#00D4FF"
                  strokeWidth="1.5"
                  opacity={0.9 - i * 0.15}
                >
                  <animate
                    attributeName="opacity"
                    values={`${0.9 - i * 0.15};${0.4 - i * 0.05};${0.9 - i * 0.15}`}
                    dur={`${1.2 + i * 0.2}s`}
                    repeatCount="indefinite"
                  />
                </ellipse>
              ))}
              {/* Arco eléctrico */}
              <path d="M 52 -14 Q 60 -18 68 -14" fill="none" stroke="#fef08a" strokeWidth="1.2" opacity="0.8">
                <animate attributeName="d"
                  values="M 52 -14 Q 60 -18 68 -14;M 52 -14 Q 60 -22 68 -14;M 52 -14 Q 60 -18 68 -14"
                  dur="0.6s" repeatCount="indefinite" />
              </path>
              {/* Destello central */}
              <circle cx="60" cy="-14" r="2.5" fill="#ffffff" opacity="0.9">
                <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.5s" repeatCount="indefinite" />
              </circle>
            </svg>
          )}

          {upgradeStage >= 6 && (
            <svg
              viewBox="0 0 120 140"
              className={styles.upgradeOverlay}
              overflow="visible"
              aria-hidden="true"
            >
              {/* Stage 6 🪽 — Alas Holográficas de Plasma
                  Alas translúcidas a los lados del torso */}
              {/* Ala izquierda */}
              <path d="M 30 75 Q 5 60 0 40 Q 10 55 30 80 Z"
                fill="url(#wingGrad)" stroke="#818cf8" strokeWidth="0.8" opacity="0.75">
                <animate attributeName="d"
                  values="M 30 75 Q 5 60 0 40 Q 10 55 30 80 Z;M 30 75 Q 3 58 -2 38 Q 8 53 30 80 Z;M 30 75 Q 5 60 0 40 Q 10 55 30 80 Z"
                  dur="2.5s" repeatCount="indefinite" />
              </path>
              {/* Ala derecha */}
              <path d="M 90 75 Q 115 60 120 40 Q 110 55 90 80 Z"
                fill="url(#wingGrad)" stroke="#818cf8" strokeWidth="0.8" opacity="0.75">
                <animate attributeName="d"
                  values="M 90 75 Q 115 60 120 40 Q 110 55 90 80 Z;M 90 75 Q 117 58 122 38 Q 112 53 90 80 Z;M 90 75 Q 115 60 120 40 Q 110 55 90 80 Z"
                  dur="2.5s" repeatCount="indefinite" />
              </path>
              {/* Plumas holográficas izquierda */}
              <line x1="30" y1="75" x2="5" y2="55" stroke="#818cf8" strokeWidth="0.6" opacity="0.5" />
              <line x1="30" y1="78" x2="8" y2="62" stroke="#818cf8" strokeWidth="0.6" opacity="0.5" />
              {/* Plumas holográficas derecha */}
              <line x1="90" y1="75" x2="115" y2="55" stroke="#818cf8" strokeWidth="0.6" opacity="0.5" />
              <line x1="90" y1="78" x2="112" y2="62" stroke="#818cf8" strokeWidth="0.6" opacity="0.5" />

              <defs>
                <linearGradient id="wingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {upgradeStage >= 7 && (
            <svg
              viewBox="0 0 120 140"
              className={styles.upgradeOverlay}
              overflow="visible"
              aria-hidden="true"
            >
              {/* Stage 7 🛸 — Mini-Dron "Guioncito" Orbital
                  Un pequeño dron que orbita alrededor del avatar */}
              {/* Órbita (trayectoria visual) */}
              <ellipse cx="60" cy="55" rx="50" ry="18"
                fill="none" stroke="#00D4FF" strokeWidth="0.5"
                strokeDasharray="4 4" opacity="0.3" />
              {/* El dron (grupo animado en órbita) */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 60 55"
                  to="360 60 55"
                  dur="4s"
                  repeatCount="indefinite"
                />
                {/* Cuerpo del mini-dron */}
                <circle cx="110" cy="55" r="5" fill="#0f172a" stroke="#00D4FF" strokeWidth="1.2" />
                <circle cx="110" cy="55" r="2" fill="#00D4FF" opacity="0.9">
                  <animate attributeName="opacity" values="0.9;0.4;0.9" dur="0.8s" repeatCount="indefinite" />
                </circle>
                {/* Mini pantalla underscore del dron */}
                <text x="110" y="57.5" textAnchor="middle"
                  fontFamily="monospace" fontSize="4" fontWeight="900"
                  fill="#ffffff">_</text>
                {/* Hélices del dron */}
                <line x1="104" y1="53" x2="108" y2="53" stroke="#94a3b8" strokeWidth="1" />
                <line x1="112" y1="53" x2="116" y2="53" stroke="#94a3b8" strokeWidth="1" />
                {/* Estela del dron */}
                <line x1="105" y1="56" x2="100" y2="57"
                  stroke="#00D4FF" strokeWidth="0.8" opacity="0.5" />
              </g>
            </svg>
          )}

          {upgradeStage >= 8 && (
            <svg
              viewBox="0 0 120 140"
              className={styles.upgradeOverlay}
              overflow="visible"
              aria-hidden="true"
            >
              {/* Stage 8 👑 — Corona Maestra + Aura Dorada
                  Corona flotante sobre la cabeza + resplandor áureo */}
              {/* Aura dorada pulsante */}
              <circle cx="60" cy="30" r="55" fill="url(#auraGrad)" opacity="0.18">
                <animate attributeName="r" values="55;62;55" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.18;0.08;0.18" dur="2.5s" repeatCount="indefinite" />
              </circle>
              {/* Corona */}
              <path d="M 42 -18 L 46 -30 L 52 -22 L 60 -34 L 68 -22 L 74 -30 L 78 -18 Z"
                fill="url(#crownGrad)" stroke="#f59e0b" strokeWidth="1.2"
                filter="url(#goldGlow)">
                <animate attributeName="transform"
                  attributeType="XML"
                  type="translate"
                  values="0,0;0,-3;0,0"
                  dur="2s" repeatCount="indefinite" />
              </path>
              {/* Diamantes de la corona */}
              <circle cx="52" cy="-25" r="2.5" fill="#ffffff" opacity="0.95" />
              <circle cx="60" cy="-31" r="3" fill="#fef08a" opacity="0.95" />
              <circle cx="68" cy="-25" r="2.5" fill="#ffffff" opacity="0.95" />
              {/* Destellos de maestría */}
              {[[28, -8], [92, -5], [15, 30], [105, 28]].map(([x, y], i) => (
                <g key={i}>
                  <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke="#fef08a" strokeWidth="1.2" opacity="0.7">
                    <animate attributeName="opacity" values="0.7;0;0.7" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
                  </line>
                  <line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke="#fef08a" strokeWidth="1.2" opacity="0.7">
                    <animate attributeName="opacity" values="0.7;0;0.7" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
                  </line>
                </g>
              ))}

              <defs>
                <radialGradient id="auraGrad" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
