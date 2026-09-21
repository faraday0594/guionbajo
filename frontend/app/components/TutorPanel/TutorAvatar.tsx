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

      {/* ── Stage 7: Mini-Dron en Órbita 3D Horizontal con Luz Roja Intermitente ── */}
      {upgradeStage >= 7 && (
        <div className={styles.miniDrone3dContainer}>
          <div className="flex flex-col items-center">
            {/* Bombillo rojo intermitente */}
            <div className={styles.droneRedStrobe} />
            {/* Chasis del mini dron */}
            <svg width="26" height="18" viewBox="0 0 26 18" fill="none" overflow="visible">
              <line x1="1" y1="5" x2="11" y2="5" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              <line x1="15" y1="5" x2="25" y2="5" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              <rect x="7" y="5" width="12" height="9" rx="3" fill="#0f172a" stroke="#00D4FF" strokeWidth="1.5" />
              <circle cx="13" cy="9.5" r="2.5" fill="#00D4FF" />
              <circle cx="2" cy="7" r="1.5" fill="#38bdf8" />
              <circle cx="24" cy="7" r="1.5" fill="#38bdf8" />
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
        {/* ── Stage 4: Placa Frontal Blindada de Oro ── */}
        {upgradeStage >= 4 && <div className={styles.goldenBrowArmor} />}

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

        {/* ── Stage 5: Bobina Tesla Cuántica con Rayos Eléctricos Animados ── */}
        {upgradeStage >= 5 && (
          <div className={styles.teslaCoil}>
            <svg width="38" height="28" viewBox="0 0 38 28" fill="none" overflow="visible">
              <ellipse cx="19" cy="22" rx="14" ry="4" stroke="#00D4FF" strokeWidth="1.8" opacity="0.95" />
              <ellipse cx="19" cy="15" rx="10" ry="3.2" stroke="#00D4FF" strokeWidth="1.8" opacity="0.85" />
              <ellipse cx="19" cy="8" rx="6" ry="2.2" stroke="#00D4FF" strokeWidth="1.8" opacity="0.75" />
              <circle cx="19" cy="3" r="3" fill="#ffffff" stroke="#00D4FF" strokeWidth="1" />
              {/* Rayos danzantes alrededor */}
              <path className={styles.teslaLightningBolt} d="M 9 20 L 5 14 L 11 11 L 8 4" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" />
              <path className={styles.teslaLightningBolt} d="M 29 20 L 33 14 L 27 11 L 30 4" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" style={{ animationDelay: '0.15s' }} />
              <path className={styles.teslaLightningBolt} d="M 19 4 L 22 0 L 17 -3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" style={{ animationDelay: '0.08s' }} />
            </svg>
          </div>
        )}

        {/* ── Stage 3: Visor HUD Full Neón (Todo el visor es de color neón) ── */}
        {upgradeStage >= 3 && (
          <div className={styles.headHudVisorFull}>
            <div className={styles.hudScanline} />
            <span style={{ fontSize: '7px', fontFamily: 'monospace', color: '#ffffff', fontWeight: 900, textShadow: '0 0 4px #00f0ff' }}>HUD</span>
            <span style={{ fontSize: '7px', fontFamily: 'monospace', color: '#ffffff', fontWeight: 900, textShadow: '0 0 4px #00f0ff' }}>TARGET</span>
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

              {/* Lente neón / pupila (se vuelve ROJO intenso en Stage >= 3) */}
              <div className={styles.eyeLens}>
                <div
                  className={`${styles.pupil} ${
                    drowned
                      ? styles.drownedPupil
                      : upgradeStage >= 3
                      ? styles.tacticalRedPupil
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
          
          {/* ── Stage 4: Blindaje Pesado de Oro Real (Hombreras + Peto) ── */}
          {upgradeStage >= 4 && (
            <>
              <div className={styles.goldenShoulderLeft} />
              <div className={styles.goldenShoulderRight} />
              <div className={styles.goldenChestplate} />
            </>
          )}

          {/* ── Stage 2: Jetpack Dorsal Realista con Doble Canister y Mega Llamas ── */}
          {upgradeStage >= 2 && (
            <div className={styles.bodyJetpack}>
              {/* Canister izquierdo */}
              <div className={styles.jetpackCanister}>
                <div className={styles.jetpackTank}>
                  <div className={styles.jetpackRing} />
                </div>
                <div className={styles.jetpackCone} />
                <div className={styles.jetpackFlameMega} />
              </div>
              {/* Canister derecho */}
              <div className={styles.jetpackCanister}>
                <div className={styles.jetpackTank}>
                  <div className={styles.jetpackRing} />
                </div>
                <div className={styles.jetpackCone} />
                <div className={styles.jetpackFlameMega} />
              </div>
            </div>
          )}

          {/* ── Stage 6: Espadas Gemelas Cyber (Reemplaza las alas) ── */}
          {upgradeStage >= 6 && (
            <div className={styles.dualSwordsContainer}>
              <div className={styles.cyberSwordLeft}>
                <div className={styles.swordBlade} />
                <div className={styles.swordGuard} />
                <div className={styles.swordHilt} />
                <div className={styles.swordPommel} />
              </div>
              <div className={styles.cyberSwordRight}>
                <div className={styles.swordBlade} />
                <div className={styles.swordGuard} />
                <div className={styles.swordHilt} />
                <div className={styles.swordPommel} />
              </div>
            </div>
          )}

          {/* Brazos Mecánicos (Stage >= 1: Brazos mucho más gruesos y cromados) */}
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
                className={`${styles.robotArm} ${armClass} ${animClass} ${upgradeStage >= 1 ? styles.thickArm : ''}`}
              >
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

          {/* Micropropulsor Magnético Inferior (Mega Llama cuando upgradeStage >= 2) */}
          <div className={styles.hoverThruster}>
            <div className={styles.thrusterNozzle} />
            {!drowned && (
              <div
                className={`${styles.plasmaFlame} ${isMouthArticulating ? styles.plasmaHigh : ''} ${
                  upgradeStage >= 2 ? styles.plasmaMega : ''
                }`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
