'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Volume2, VolumeX, Play, Sparkles, ChevronRight, MapPin } from 'lucide-react';
import { JOURNEY_TOPICS, getTopicIndex, JourneyTopic } from '@/lib/journeyTopics';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';

interface JourneyVisualStageProps {
  sublevel: string;
  classIndex: number;
  activeCheckpoint?: any;
  onLaunchClass: () => void;
}

/* ─── CEFR Level palette (warm, nature-inspired) ─── */
const LEVEL_PALETTE: Record<string, { primary: string; glow: string; flag: string; badge: string }> = {
  '#00e676': { primary: '#34d399', glow: '#6ee7b7', flag: '#10b981', badge: 'bg-emerald-900/40 border-emerald-400/50 text-emerald-300' },
  '#ffd600': { primary: '#fbbf24', glow: '#fde68a', flag: '#f59e0b', badge: 'bg-amber-900/40 border-amber-400/50 text-amber-300' },
  '#00b0ff': { primary: '#38bdf8', glow: '#7dd3fc', flag: '#0ea5e9', badge: 'bg-sky-900/40 border-sky-400/50 text-sky-300' },
  '#d500f9': { primary: '#c084fc', glow: '#d8b4fe', flag: '#a855f7', badge: 'bg-purple-900/40 border-purple-400/50 text-purple-300' },
};

const getPalette = (color: string) => LEVEL_PALETTE[color] || LEVEL_PALETTE['#00e676'];

export default function JourneyVisualStage({
  sublevel,
  classIndex,
  activeCheckpoint,
  onLaunchClass,
}: JourneyVisualStageProps) {
  const targetIndex = useMemo(() => getTopicIndex(sublevel, classIndex), [sublevel, classIndex]);

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const justCompletedStr = localStorage.getItem('guionbajo_class_just_completed');
        if (justCompletedStr) {
          const data = JSON.parse(justCompletedStr);
          return getTopicIndex(data.sublevel, data.classIndex);
        }
        const lastSeenStr = localStorage.getItem('guionbajo_last_seen_topic_index');
        if (lastSeenStr !== null) {
          const lastSeen = parseInt(lastSeenStr, 10);
          if (!isNaN(lastSeen) && lastSeen < targetIndex) {
            return lastSeen;
          }
        }
      } catch (_) {}
    }
    return targetIndex;
  });
  const [isTraveling, setIsTraveling] = useState(false);
  const [travelProgress, setTravelProgress] = useState(0); // 0 to 1 during walk
  const [travelFrom, setTravelFrom] = useState<number>(targetIndex);
  const [travelTo, setTravelTo] = useState<number>(targetIndex);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [legPhase, setLegPhase] = useState(0); // 0=idle, 1..4=walk cycle

  const isTravelingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentTopic: JourneyTopic = JOURNEY_TOPICS[currentIndex] || JOURNEY_TOPICS[0];
  const nextTopic: JourneyTopic | null = JOURNEY_TOPICS[currentIndex + 1] || null;

  // Destination topic during transition
  const destinationTopic: JourneyTopic = JOURNEY_TOPICS[travelTo] || currentTopic;
  const upcomingTopic: JourneyTopic | null = JOURNEY_TOPICS[travelTo + 1] || null;

  const palette = getPalette(currentTopic.levelColor);

  // Soft footstep sound (dirt / gravel crunch)
  const playStepSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.13;
      noise.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(720 + Math.random() * 120, now);
      filter.Q.setValueAtTime(1.4, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.stop(now + 0.12);
    } catch (_) {}
  };

  // Pleasant victory chime upon arriving at the new flag
  const playArrivalChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.65);
      });
    } catch (_) {}
  };

  // 🚶 The smooth advance animation:
  // Everything scrolls backward past the student while the student walks in place.
  const triggerAdvance = (fromIdx: number, toIdx: number) => {
    if (isTravelingRef.current || fromIdx === toIdx) return;
    isTravelingRef.current = true;
    setIsTraveling(true);
    setTravelFrom(fromIdx);
    setTravelTo(toIdx);
    setCurrentIndex(fromIdx);

    const startTime = performance.now();
    const duration = 1850; // 1.85 seconds of smooth walking

    // Play footstep audio in rhythm
    let stepCount = 0;
    playStepSound();
    stepIntervalRef.current = setInterval(() => {
      playStepSound();
      stepCount++;
      setLegPhase((stepCount % 4) + 1);
    }, 220);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      // Smooth easeInOutQuad curve
      const eased =
        rawProgress < 0.5
          ? 2 * rawProgress * rawProgress
          : -1 + (4 - 2 * rawProgress) * rawProgress;

      setTravelProgress(eased);

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Arrived at destination!
        if (stepIntervalRef.current) {
          clearInterval(stepIntervalRef.current);
          stepIntervalRef.current = null;
        }
        playArrivalChime();
        setTravelProgress(0);
        setCurrentIndex(toIdx);
        setIsTraveling(false);
        isTravelingRef.current = false;
        setLegPhase(0);
        localStorage.setItem('guionbajo_last_seen_topic_index', toIdx.toString());
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, []);

  // 🎯 Check if a class was just completed or needs auto-advance
  const hasCheckedAutoAdvance = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if user just completed a class (set by lesson page upon 100% completion)
    const justCompletedStr = localStorage.getItem('guionbajo_class_just_completed');
    if (justCompletedStr) {
      try {
        const data = JSON.parse(justCompletedStr);
        localStorage.removeItem('guionbajo_class_just_completed');
        const completedFrom = getTopicIndex(data.sublevel, data.classIndex);
        const advanceTo = Math.max(completedFrom + 1, targetIndex);
        // Start from completed station and advance smoothly
        setCurrentIndex(completedFrom);
        setTravelFrom(completedFrom);
        setTravelTo(advanceTo);
        const timer = setTimeout(() => {
          triggerAdvance(completedFrom, advanceTo);
        }, 650);
        return () => clearTimeout(timer);
      } catch (_) {}
    }

    // 2. Fallback: check last-seen index in localStorage
    if (!hasCheckedAutoAdvance.current) {
      hasCheckedAutoAdvance.current = true;
      const lastSeenStr = localStorage.getItem('guionbajo_last_seen_topic_index');
      if (lastSeenStr !== null) {
        const lastSeen = parseInt(lastSeenStr, 10);
        if (!isNaN(lastSeen) && lastSeen < targetIndex) {
          setCurrentIndex(lastSeen);
          const timer = setTimeout(() => {
            triggerAdvance(lastSeen, targetIndex);
          }, 650);
          return () => clearTimeout(timer);
        }
      }
      setCurrentIndex(targetIndex);
      localStorage.setItem('guionbajo_last_seen_topic_index', targetIndex.toString());
    } else if (targetIndex !== currentIndex && !isTravelingRef.current) {
      triggerAdvance(currentIndex, targetIndex);
    }
  }, [targetIndex]);

  // Minimap GPS point calculation (x: 28 to 532, y: sinusoidal around y=36)
  const getMinimapPoint = (index: number) => {
    const total = 63;
    const t = Math.max(0, Math.min(1, index / total));
    const x = 28 + t * (532 - 28);
    const angle = t * Math.PI * 4;
    const y = 36 - Math.sin(angle) * 13;
    return { x, y };
  };

  // Interpolated minimap beacon point during travel
  const currentPoint = getMinimapPoint(currentIndex);
  const targetPoint = getMinimapPoint(isTraveling ? travelTo : currentIndex);
  const beaconPoint = isTraveling
    ? {
        x: currentPoint.x + (targetPoint.x - currentPoint.x) * travelProgress,
        y: currentPoint.y + (targetPoint.y - currentPoint.y) * travelProgress,
      }
    : currentPoint;

  return (
    <div className="w-full rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl relative bg-[#0c1a0e] mb-8">
      {/* ==================== HEADER HUD ==================== */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-b from-[#0a1510]/95 via-[#0c1a0e]/80 to-transparent border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-colors duration-700 shadow-md flex-shrink-0"
            style={{
              borderColor: `${palette.primary}55`,
              backgroundColor: `${palette.primary}18`,
              color: palette.primary,
            }}
          >
            <MapPin size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-outfit font-extrabold text-xs sm:text-sm tracking-wider text-white/90 uppercase">
                Ruta de Aprendizaje
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-700 font-mono"
                style={{
                  borderColor: `${palette.primary}55`,
                  backgroundColor: `${palette.primary}18`,
                  color: palette.primary,
                }}
              >
                NIVEL {currentTopic.level}
              </span>
            </div>
            <p className="text-[11px] text-white/40">
              64 Clases Oficiales CEFR — Estación {currentIndex + 1}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Manual test / preview button */}
          <button
            onClick={() => {
              if (isTraveling) return;
              const nextIdx = (currentIndex + 1) % 64;
              triggerAdvance(currentIndex, nextIdx);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-emerald-300 transition border border-white/[0.08] flex items-center gap-1.5 text-[11px] font-mono font-bold cursor-pointer"
            title="Ver animación de avance al siguiente banderín"
          >
            <Sparkles size={13} className={isTraveling ? 'animate-spin text-emerald-400' : ''} />
            <span className="hidden sm:inline">
              {isTraveling ? 'Avanzando...' : 'Avanzar'}
            </span>
          </button>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-white/35 font-mono block">Ubicación</span>
            <span className="text-xs font-bold font-mono" style={{ color: palette.primary }}>
              Clase {currentIndex + 1} de 64
            </span>
          </div>

          <div className="w-14 sm:w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden border border-white/[0.08]">
            <div
              className="h-full transition-all duration-700 rounded-full"
              style={{
                width: `${((currentIndex + 1) / 64) * 100}%`,
                backgroundColor: palette.primary,
              }}
            />
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/35 hover:text-white/70 transition border border-white/[0.06]"
            title={soundEnabled ? 'Silenciar' : 'Activar audio'}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* ==================== MAIN LANDSCAPE SCENE ==================== */}
      <div className="relative w-full h-[200px] sm:h-[240px] md:h-[280px] overflow-hidden">
        <svg
          viewBox="0 0 960 340"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full block"
        >
          <defs>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="flagGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bright, clear sky */}
            <linearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="30%" stopColor="#bae6fd" />
              <stop offset="55%" stopColor="#e0f2fe" />
              <stop offset="75%" stopColor="#fef9c3" stopOpacity="0.5" />
              <stop offset="90%" stopColor="#fef3c7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0.4" />
            </linearGradient>

            {/* Warm horizon glow */}
            <radialGradient id="sunGlow" cx="0.5" cy="0.42" r="0.3">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.7" />
              <stop offset="40%" stopColor="#fde68a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>

            {/* Ground / grass gradient */}
            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d8b55" />
              <stop offset="25%" stopColor="#2d7a42" />
              <stop offset="60%" stopColor="#226b36" />
              <stop offset="100%" stopColor="#1a5c2e" />
            </linearGradient>

            {/* Distant hills */}
            <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5da06e" />
              <stop offset="100%" stopColor="#4a8c5c" />
            </linearGradient>
            <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a8c5c" />
              <stop offset="100%" stopColor="#3a7d4c" />
            </linearGradient>

            {/* Trail / dirt path */}
            <linearGradient id="trailGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b89a6a" />
              <stop offset="40%" stopColor="#c9a87a" />
              <stop offset="100%" stopColor="#d4b48a" />
            </linearGradient>
            <linearGradient id="trailEdge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8a7050" />
              <stop offset="100%" stopColor="#9a8060" />
            </linearGradient>
          </defs>

          {/* ═══ SKY LAYER (Fixed horizon) ═══ */}
          <rect width="960" height="340" fill="url(#skyWarm)" />
          <rect x="0" y="60" width="960" height="120" fill="url(#sunGlow)" />

          {/* Clouds */}
          <g opacity="0.6">
            <ellipse cx="160" cy="40" rx="55" ry="12" fill="#ffffff" />
            <ellipse cx="190" cy="38" rx="35" ry="9" fill="#ffffff" opacity="0.8" />
            <ellipse cx="650" cy="55" rx="65" ry="14" fill="#ffffff" />
            <ellipse cx="685" cy="52" rx="42" ry="10" fill="#ffffff" opacity="0.8" />
            <ellipse cx="420" cy="28" rx="40" ry="10" fill="#ffffff" opacity="0.5" />
            <ellipse cx="850" cy="35" rx="45" ry="11" fill="#ffffff" opacity="0.4" />
          </g>

          {/* Birds */}
          <g stroke="#4b5563" strokeWidth="1" fill="none" opacity="0.3">
            <path d="M 280 50 Q 284 46, 288 50 Q 292 46, 296 50" />
            <path d="M 600 38 Q 603 35, 606 38 Q 609 35, 612 38" />
          </g>

          {/* ─── DISTANT HILLS (horizon at y≈130) ─── */}
          <path
            d="M 0 140 Q 150 115, 300 130 Q 420 145, 500 120 Q 620 100, 750 128 Q 870 148, 960 130 L 960 165 L 0 165 Z"
            fill="url(#hillFar)"
            opacity="0.65"
          />
          <path
            d="M 0 150 Q 200 130, 350 148 Q 480 162, 580 140 Q 700 120, 840 145 Q 920 158, 960 148 L 960 175 L 0 175 Z"
            fill="url(#hillMid)"
            opacity="0.8"
          />

          {/* Distant tiny trees */}
          <g opacity="0.5">
            {[60, 120, 180, 260, 700, 760, 820, 900].map((x, i) => (
              <polygon
                key={`dt-${i}`}
                points={`${x},${138 + Math.sin(x * 0.03) * 6} ${x - 3},${148 + Math.sin(x * 0.03) * 6} ${x + 3},${148 + Math.sin(x * 0.03) * 6}`}
                fill="#3a6e48"
              />
            ))}
          </g>

          {/* ─── GREEN GROUND PLANE (perspective floor) ─── */}
          <rect x="0" y="160" width="960" height="180" fill="url(#groundGrad)" />

          {/* Ground texture lines */}
          <g opacity="0.15" stroke="#2a6b3a" strokeWidth="0.5">
            {Array.from({ length: 20 }, (_, i) => {
              const y = 170 + i * 8;
              return <line key={`gl-${i}`} x1="0" y1={y} x2="960" y2={y} />;
            })}
          </g>

          {/* ─── WINDING TRAIL (perspective correct: wide at bottom, narrow at horizon) ─── */}
          {/* Shadow */}
          <path
            d="M 380 340 L 560 340 Q 580 300, 570 270 Q 555 235, 520 215 Q 490 200, 500 185 Q 510 172, 500 165 Q 490 160, 492 155 L 488 155 Q 470 160, 475 165 Q 485 172, 475 185 Q 465 200, 440 215 Q 400 235, 395 270 Q 388 300, 400 340 Z"
            fill="#1a4a2e"
            opacity="0.3"
          />
          {/* Edges */}
          <path
            d="M 375 340 L 565 340 Q 585 295, 575 265 Q 558 228, 525 210 Q 495 195, 505 182 Q 515 168, 503 160 Q 495 155, 495 150 L 485 150 Q 465 155, 470 162 Q 480 170, 470 184 Q 458 198, 430 212 Q 392 230, 385 268 Q 378 300, 395 340 Z"
            fill="url(#trailEdge)"
          />
          {/* Body */}
          <path
            d="M 390 340 L 550 340 Q 572 298, 565 268 Q 550 233, 520 216 Q 495 202, 502 186 Q 510 174, 500 164 Q 494 158, 493 153 L 487 153 Q 468 158, 474 166 Q 483 175, 474 188 Q 462 203, 438 218 Q 402 238, 395 270 Q 388 302, 400 340 Z"
            fill="url(#trailGrad)"
          />

          {/* 🌟 Dynamic Worn Center Line — dashes rush backward during travel */}
          <path
            d="M 470 340 Q 478 300, 480 270 Q 482 240, 490 218 Q 496 202, 492 188 Q 488 175, 490 165 Q 491 158, 490 153"
            fill="none"
            stroke="#dcc8a8"
            strokeWidth="1.8"
            strokeDasharray="8 10"
            strokeDashoffset={isTraveling ? -travelProgress * 96 : 0}
            opacity={isTraveling ? 0.6 : 0.3}
          />

          {/* 🌟 Speed wind streaks rushing past student during travel */}
          {isTraveling && (
            <g opacity={Math.sin(travelProgress * Math.PI) * 0.6}>
              <line
                x1={380 - travelProgress * 30}
                y1={290 + travelProgress * 40}
                x2={360 - travelProgress * 30}
                y2={320 + travelProgress * 40}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1={570 + travelProgress * 30}
                y1={285 + travelProgress * 40}
                x2={595 + travelProgress * 30}
                y2={315 + travelProgress * 40}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* ─── TREES FLANKING PATH (optically drift outward and down during travel) ─── */}
          {/* Left Trees Group */}
          <g
            style={{
              transform: isTraveling
                ? `translate(${-travelProgress * 30}px, ${travelProgress * 18}px)`
                : 'none',
              transformOrigin: '220px 200px',
            }}
          >
            {/* L1: Big near tree */}
            <rect x="175" y="182" width="10" height="55" fill="#5c3a1e" rx="2" />
            <ellipse cx="180" cy="182" rx="35" ry="46" fill="#266e3a" />
            <ellipse cx="180" cy="173" rx="28" ry="35" fill="#358a4a" />
            <ellipse cx="180" cy="166" rx="18" ry="22" fill="#45a05a" opacity="0.6" />
            {/* L2: Mid tree */}
            <rect x="268" y="176" width="7" height="38" fill="#5c3a1e" rx="1.5" />
            <ellipse cx="272" cy="176" rx="24" ry="32" fill="#2a7040" />
            <ellipse cx="272" cy="169" rx="18" ry="24" fill="#3a8550" />
            {/* L3: Small tree */}
            <rect x="338" y="168" width="5" height="24" fill="#5c3a1e" rx="1" />
            <ellipse cx="341" cy="168" rx="15" ry="20" fill="#2a7040" />
          </g>

          {/* Right Trees Group */}
          <g
            style={{
              transform: isTraveling
                ? `translate(${travelProgress * 30}px, ${travelProgress * 18}px)`
                : 'none',
              transformOrigin: '720px 200px',
            }}
          >
            {/* R1: Big near tree */}
            <rect x="748" y="185" width="10" height="60" fill="#5c3a1e" rx="2" />
            <ellipse cx="753" cy="185" rx="38" ry="50" fill="#2d7a42" />
            <ellipse cx="753" cy="175" rx="30" ry="38" fill="#3a8c50" />
            <ellipse cx="753" cy="168" rx="20" ry="25" fill="#4a9c60" opacity="0.6" />
            {/* R2: Mid tree */}
            <rect x="668" y="178" width="7" height="40" fill="#5c3a1e" rx="1.5" />
            <ellipse cx="672" cy="178" rx="26" ry="35" fill="#2a7040" />
            <ellipse cx="672" cy="170" rx="20" ry="26" fill="#3a8550" />
            {/* R3: Small tree */}
            <rect x="598" y="170" width="5" height="26" fill="#5c3a1e" rx="1" />
            <ellipse cx="601" cy="170" rx="16" ry="22" fill="#2d7a42" />
          </g>

          {/* Far static trees */}
          <g opacity="0.6">
            <ellipse cx="560" cy="162" rx="10" ry="14" fill="#3a7d4c" />
            <ellipse cx="410" cy="160" rx="9" ry="12" fill="#3a7d4c" />
            <ellipse cx="630" cy="161" rx="8" ry="11" fill="#3a7d4c" />
            <ellipse cx="350" cy="162" rx="7" ry="10" fill="#3a7d4c" />
          </g>

          {/* ══════════════════════════════════════════════════════════════
              🚩 THE MILESTONE FLAGS (SMOOTH KINEMATIC TRANSITION)
             ══════════════════════════════════════════════════════════════ */}

          {isTraveling ? (
            <>
              {/* 1. DEPARTING FLAG (Station fromIdx):
                     Slides down and past the student to the right, scaling up and fading out */}
              <g
                style={{
                  transform: `translate(${travelProgress * 80}px, ${travelProgress * 115}px) scale(${1 + travelProgress * 0.35})`,
                  opacity: Math.max(0, 1 - travelProgress * 1.3),
                  transformOrigin: '540px 270px',
                }}
              >
                <line x1="540" y1="270" x2="540" y2="216" stroke="#b89a6a" strokeWidth="3" strokeLinecap="round" />
                <circle cx="540" cy="214" r="3.5" fill={getPalette(JOURNEY_TOPICS[travelFrom]?.levelColor || '#00e676').primary} />
                <path
                  d="M 540 218 L 564 226 L 562 232 L 540 238 Z"
                  fill={getPalette(JOURNEY_TOPICS[travelFrom]?.levelColor || '#00e676').flag}
                  stroke={getPalette(JOURNEY_TOPICS[travelFrom]?.levelColor || '#00e676').primary}
                  strokeWidth="0.8"
                />
                <text x="552" y="231" fill="#ffffff" fontFamily="sans-serif" fontSize="7" fontWeight="900" textAnchor="middle">
                  {travelFrom + 1}
                </text>
              </g>

              {/* 2. ARRIVING FLAG (Station toIdx):
                     Travels down the path from (495, 172) to (540, 216), growing from 0.65x to 1.0x and lighting up */}
              {(() => {
                const destPal = getPalette(destinationTopic.levelColor);
                const curX = 495 + (540 - 495) * travelProgress;
                const curYBottom = 198 + (270 - 198) * travelProgress;
                const curYTop = 172 + (216 - 172) * travelProgress;
                const flagW = 15 + (24 - 15) * travelProgress;
                const flagH = 10 + (20 - 10) * travelProgress;
                const curOpacity = 0.6 + 0.4 * travelProgress;

                return (
                  <g filter="url(#flagGlow)" opacity={curOpacity}>
                    <line x1={curX} y1={curYBottom} x2={curX} y2={curYTop} stroke="#b89a6a" strokeWidth="3" strokeLinecap="round" />
                    <circle cx={curX} cy={curYTop - 2} r="3.5" fill={destPal.primary} />
                    <path
                      d={`M ${curX} ${curYTop} L ${curX + flagW} ${curYTop + flagH * 0.4} L ${curX + flagW - 2} ${curYTop + flagH * 0.7} L ${curX} ${curYTop + flagH} Z`}
                      fill={destPal.flag}
                      stroke={destPal.primary}
                      strokeWidth="0.8"
                    />
                    <text
                      x={curX + flagW * 0.5}
                      y={curYTop + flagH * 0.65}
                      fill="#ffffff"
                      fontFamily="sans-serif"
                      fontSize="7"
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      {travelTo + 1}
                    </text>
                  </g>
                );
              })()}

              {/* 3. UPCOMING HORIZON FLAG (Station toIdx + 1):
                     Gradually emerges at the horizon bend (495, 172) to show the path continues */}
              {upcomingTopic && (
                <g opacity={travelProgress * 0.55}>
                  <line x1="495" y1="198" x2="495" y2="172" stroke="#8b6f47" strokeWidth="2" strokeLinecap="round" />
                  <path d="M 495 172 L 510 177 L 495 182 Z" fill={getPalette(upcomingTopic.levelColor).flag} opacity="0.8" />
                  <text x="495" y="168" fill="#374151" fontFamily="sans-serif" fontSize="7" fontWeight="bold" textAnchor="middle">
                    {travelTo + 2}
                  </text>
                </g>
              )}
            </>
          ) : (
            <>
              {/* ─── NEXT FLAG (Distant Milestone) ─── */}
              {nextTopic && (
                <g opacity="0.55">
                  <line x1="495" y1="198" x2="495" y2="172" stroke="#8b6f47" strokeWidth="2" strokeLinecap="round" />
                  <path d="M 495 172 L 510 177 L 495 182 Z" fill={getPalette(nextTopic.levelColor).flag} opacity="0.8" />
                  <circle cx="503" cy="177" r="4" fill={getPalette(nextTopic.levelColor).primary} opacity="0.12" />
                  <text x="495" y="168" fill="#374151" fontFamily="sans-serif" fontSize="7" fontWeight="bold" textAnchor="middle" opacity="0.6">
                    {currentIndex + 2}
                  </text>
                </g>
              )}

              {/* ─── CURRENT FLAG (Active Milestone Beside Student) ─── */}
              <g filter="url(#flagGlow)">
                <line x1="541" y1="270" x2="541" y2="218" stroke="#0a2010" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
                <line x1="540" y1="270" x2="540" y2="216" stroke="#b89a6a" strokeWidth="3" strokeLinecap="round" />
                <circle cx="540" cy="214" r="3.5" fill={palette.primary} />
                <path
                  d="M 540 218 L 564 226 L 562 232 L 540 238 Z"
                  fill={palette.flag}
                  stroke={palette.primary}
                  strokeWidth="0.8"
                />
                <path
                  d="M 544 223 L 559 228 L 558 232 L 544 232 Z"
                  fill={palette.glow}
                  opacity="0.3"
                />
                <circle cx="552" cy="228" r="12" fill={palette.primary} opacity="0.08" />
              </g>
              <text x="552" y="231" fill="#ffffff" fontFamily="sans-serif" fontSize="7" fontWeight="900" textAnchor="middle">
                {currentIndex + 1}
              </text>

              {/* ─── PAST FLAG (Behind student, subtle) ─── */}
              {currentIndex > 0 && (
                <g opacity="0.3">
                  <line x1="445" y1="310" x2="445" y2="286" stroke="#8b6f47" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M 445 286 L 456 290 L 445 294 Z" fill="#9ca3af" />
                </g>
              )}
            </>
          )}

          {/* Wildflowers near path */}
          <g opacity="0.45">
            <circle cx="560" cy="260" r="2" fill="#fbbf24" />
            <circle cx="565" cy="263" r="1.5" fill="#fb923c" />
            <circle cx="395" cy="285" r="2" fill="#f472b6" />
            <circle cx="600" cy="245" r="1.5" fill="#e879f9" />
            <circle cx="370" cy="250" r="1.8" fill="#60a5fa" />
          </g>

          {/* Fireflies / particles */}
          <g>
            <circle cx="550" cy="230" r="1.5" fill="#fef9c3" opacity="0.4">
              <animate attributeName="opacity" values="0.15;0.5;0.15" dur="3s" repeatCount="indefinite" />
              <animate attributeName="cy" values="230;225;230" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="400" cy="220" r="1" fill="#fef9c3" opacity="0.3">
              <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="cy" values="220;215;220" dur="3.5s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* ══════════════════════════════════════════════════════════════
              🚶 THE STUDENT (LOCKED IN PLACE — LEGS & ARMS ANIMATE TO WALK)
             ══════════════════════════════════════════════════════════════ */}
          <g>
            {/* Shadow beneath student (pulses subtly while walking) */}
            <ellipse
              cx="475"
              cy="330"
              rx={isTraveling && (legPhase === 1 || legPhase === 3) ? 19 : 17}
              ry="5"
              fill="#1a4a2e"
              opacity="0.35"
            />

            {/* Dynamic Walk-cycle variables */}
            {(() => {
              // 4-phase leg swing:
              // Phase 1: Left forward, Right back
              // Phase 2: Crossing center
              // Phase 3: Right forward, Left back
              // Phase 4: Crossing center
              const isWalking = isTraveling && legPhase > 0;
              const leftFootX = isWalking
                ? legPhase === 1 ? 458 : legPhase === 2 ? 463 : legPhase === 3 ? 468 : 463
                : 463;
              const rightFootX = isWalking
                ? legPhase === 1 ? 491 : legPhase === 2 ? 487 : legPhase === 3 ? 482 : 487
                : 487;
              const leftLegEndX = isWalking
                ? legPhase === 1 ? 459 : legPhase === 2 ? 464 : legPhase === 3 ? 467 : 464
                : 464;
              const rightLegEndX = isWalking
                ? legPhase === 1 ? 490 : legPhase === 2 ? 486 : legPhase === 3 ? 483 : 486
                : 486;

              // Vertical body bobbing on steps
              const bodyBobY = isWalking && (legPhase === 1 || legPhase === 3) ? -2.5 : 0;

              // Arm swinging opposite to legs
              const leftArmTip = isWalking
                ? legPhase === 1 ? '448 304' : legPhase === 3 ? '456 312' : '452 308'
                : '452 308';
              const rightArmTip = isWalking
                ? legPhase === 1 ? '502 312' : legPhase === 3 ? '494 304' : '498 308'
                : '498 308';

              return (
                <g style={{ transform: `translateY(${bodyBobY}px)`, transition: 'transform 0.12s ease' }}>
                  {/* Left Leg */}
                  <line
                    x1="467"
                    y1="312"
                    x2={leftLegEndX}
                    y2="330"
                    stroke="#2c4a6e"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  {/* Right Leg */}
                  <line
                    x1="483"
                    y1="312"
                    x2={rightLegEndX}
                    y2="330"
                    stroke="#2c4a6e"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  {/* Left Shoe */}
                  <ellipse cx={leftFootX} cy="332" rx="6" ry="3" fill="#6b3a1e" />
                  {/* Right Shoe */}
                  <ellipse cx={rightFootX} cy="332" rx="6" ry="3" fill="#6b3a1e" />

                  {/* Body / Jacket */}
                  <path
                    d="M 463 278 Q 460 290, 458 305 L 460 312 L 490 312 L 492 305 Q 490 290, 487 278 Z"
                    fill="#475569"
                    stroke="#334155"
                    strokeWidth="0.8"
                  />

                  {/* Backpack */}
                  <rect x="467" y="274" width="16" height="24" rx="4" fill="#64748b" stroke="#475569" strokeWidth="0.8" />
                  <rect x="469.5" y="278" width="11" height="5" rx="1.5" fill="#94a3b8" opacity="0.3" />
                  {/* Straps */}
                  <path d="M 469 274 Q 466 282, 464 288" fill="none" stroke="#475569" strokeWidth="1.5" />
                  <path d="M 481 274 Q 484 282, 486 288" fill="none" stroke="#475569" strokeWidth="1.5" />

                  {/* Arms */}
                  <path
                    d={`M 463 282 Q 455 296, ${leftArmTip}`}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M 487 282 Q 495 296, ${rightArmTip}`}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />

                  {/* Neck */}
                  <rect x="471" y="270" width="8" height="6" fill="#b07848" rx="2" />

                  {/* Head */}
                  <circle cx="475" cy="261" r="12" fill="#b07848" />
                  {/* Hair */}
                  <ellipse cx="475" cy="257" rx="12.5" ry="9" fill="#3b1a08" />
                  <path d="M 463 262 Q 468 254, 475 252 Q 482 254, 487 262" fill="#3b1a08" />

                  {/* Ears */}
                  <ellipse cx="462.5" cy="262" rx="2.5" ry="3.5" fill="#a06840" />
                  <ellipse cx="487.5" cy="262" rx="2.5" ry="3.5" fill="#a06840" />
                </g>
              );
            })()}
          </g>
        </svg>

        {/* ─── FLOATING STATION BADGE ─── */}
        <div className="absolute top-3 left-0 right-0 z-10 pointer-events-none flex flex-col items-center px-4">
          <div
            className="px-4 sm:px-6 py-2 rounded-2xl border backdrop-blur-md transition-all duration-500 text-center max-w-[92%] sm:max-w-lg shadow-2xl pointer-events-auto"
            style={{
              backgroundColor: 'rgba(10, 20, 14, 0.85)',
              borderColor: isTraveling
                ? `${getPalette(destinationTopic.levelColor).primary}66`
                : `${palette.primary}44`,
              boxShadow: `0 0 30px ${
                isTraveling
                  ? getPalette(destinationTopic.levelColor).primary
                  : palette.primary
              }15, 0 4px 20px rgba(0,0,0,0.3)`,
              transform: isTraveling ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <div
              className="text-[10px] sm:text-xs font-bold tracking-widest font-mono uppercase mb-0.5 transition-colors duration-500"
              style={{
                color: isTraveling
                  ? getPalette(destinationTopic.levelColor).primary
                  : palette.primary,
              }}
            >
              {isTraveling
                ? `AVANZANDO A CLASE ${destinationTopic.classNum} • NIVEL ${destinationTopic.level}...`
                : `NIVEL ${currentTopic.level} • ${currentTopic.module} — CLASE ${currentTopic.classNum}`}
            </div>
            <div className="text-sm sm:text-base md:text-lg font-outfit font-black text-white tracking-wide leading-tight transition-opacity duration-300">
              {isTraveling ? destinationTopic.title.toUpperCase() : currentTopic.title.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 3 PEDAGOGICAL PILLARS ==================== */}
      <div className="px-4 sm:px-6 py-3 bg-[#0a1510]/90 border-t border-white/[0.05]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
              📘 Gramática
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {currentTopic.grammar}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-0.5">
              💬 Vocabulario
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {currentTopic.vocab}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block mb-0.5">
              🎙️ Fonética
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {currentTopic.phonetics}
            </p>
          </div>
        </div>
      </div>

      {/* ==================== MINIMAP RADAR GPS ==================== */}
      <div className="px-4 sm:px-6 pt-3 pb-2 bg-[#0a1510]/95 border-t border-white/[0.05]">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: palette.primary }}
            />
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Sendero — Estación {currentIndex + 1} de 64
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/35">
            {Math.round(((currentIndex + 1) / 64) * 100)}% del recorrido
          </span>
        </div>

        <div className="w-full overflow-hidden py-1">
          <svg
            width="100%"
            height="68"
            viewBox="0 0 560 68"
            preserveAspectRatio="xMidYMid meet"
            className="block overflow-visible"
          >
            <defs>
              <filter id="miniGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Baseline */}
            <line
              x1="28"
              y1="36"
              x2="532"
              y2="36"
              stroke="#1e3a2a"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.4"
            />

            {/* 4 CEFR Level Segments */}
            <path d="M 28 44 Q 92 18, 154 36" fill="none" stroke="#34d399" strokeWidth="5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 28 44 Q 92 18, 154 36" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />

            <path d="M 154 36 Q 218 54, 280 34" fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 154 36 Q 218 54, 280 34" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />

            <path d="M 280 34 Q 344 16, 406 36" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 280 34 Q 344 16, 406 36" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />

            <path d="M 406 36 Q 470 56, 532 30" fill="none" stroke="#c084fc" strokeWidth="5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 406 36 Q 470 56, 532 30" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />

            {/* Level labels */}
            <text x="92" y="14" fill="#34d399" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.9">A1</text>
            <text x="218" y="65" fill="#fbbf24" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.9">A2</text>
            <text x="344" y="14" fill="#38bdf8" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.9">B1</text>
            <text x="470" y="65" fill="#c084fc" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.9">B2</text>

            {/* Milestone dots */}
            {JOURNEY_TOPICS.map((t, idx) => {
              if (idx === currentIndex) return null;
              const pt = getMinimapPoint(idx);
              const isPast = idx < currentIndex;
              const dotColor =
                t.levelColor === '#00e676'
                  ? '#34d399'
                  : t.levelColor === '#ffd600'
                  ? '#fbbf24'
                  : t.levelColor === '#00b0ff'
                  ? '#38bdf8'
                  : '#c084fc';
              return (
                <circle
                  key={t.id}
                  cx={pt.x}
                  cy={pt.y}
                  r={isPast ? 2.2 : 1.4}
                  fill={dotColor}
                  opacity={isPast ? 0.75 : 0.25}
                />
              );
            })}

            {/* 📍 Active beacon — smoothly glides during travel! */}
            <g id="activeRadarBeacon">
              <circle
                cx={beaconPoint.x}
                cy={beaconPoint.y}
                r="14"
                fill={palette.primary}
                fillOpacity="0.2"
                stroke={palette.primary}
                strokeWidth="1.5"
                className="animate-ping"
              />
              <circle
                cx={beaconPoint.x}
                cy={beaconPoint.y}
                r="4.5"
                fill="#ffffff"
                stroke={palette.primary}
                strokeWidth="2.5"
              />
              {/* Flagpole */}
              <line
                x1={beaconPoint.x}
                y1={beaconPoint.y}
                x2={beaconPoint.x}
                y2={beaconPoint.y - 18}
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              {/* Flag */}
              <polygon
                points={`${beaconPoint.x},${beaconPoint.y - 18} ${beaconPoint.x + 10},${beaconPoint.y - 13.5} ${beaconPoint.x},${beaconPoint.y - 9}`}
                fill={palette.flag}
                stroke="#ffffff"
                strokeWidth="0.8"
              />
              <text
                x={beaconPoint.x}
                y={beaconPoint.y - 21}
                fill="#ffffff"
                fontFamily="sans-serif"
                fontSize="9"
                fontWeight="900"
                textAnchor="middle"
              >
                TEMA {currentIndex + 1}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* ==================== CTA FOOTER ==================== */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#0a1510]/95 border-t border-white/[0.05] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-11 h-11 flex items-center justify-center overflow-hidden flex-shrink-0">
            <TutorAvatar size="sm" emotion="happy" />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">
              {currentTopic.level} — Clase {currentTopic.classNum}
            </div>
            <div className="text-[10px] text-white/40">
              {activeCheckpoint ? 'Progreso guardado listo' : '5 minutos • interactivo'}
            </div>
          </div>
        </div>

        <button
          onClick={onLaunchClass}
          className="px-5 sm:px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2 active:scale-95 cursor-pointer flex-shrink-0 border border-emerald-400/20"
        >
          <Play size={16} className="fill-current" />
          <span>
            {activeCheckpoint ? 'CONTINUAR CLASE' : `INICIAR CLASE ${classIndex}`}
          </span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
