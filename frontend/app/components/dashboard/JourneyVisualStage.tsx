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

  const [currentIndex, setCurrentIndex] = useState<number>(targetIndex);
  const [isTraveling, setIsTraveling] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [walkOffset, setWalkOffset] = useState(0);

  const currentTopic: JourneyTopic = JOURNEY_TOPICS[currentIndex] || JOURNEY_TOPICS[0];
  const nextTopic: JourneyTopic | null = JOURNEY_TOPICS[currentIndex + 1] || null;
  const palette = getPalette(currentTopic.levelColor);

  // Gentle footstep sound
  const playStepSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      // Soft crunch footstep
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
      noise.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.Q.setValueAtTime(1.2, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.stop(now + 0.3);
      // second softer step
      setTimeout(() => {
        try {
          const ctx2 = new AudioCtx();
          const now2 = ctx2.currentTime;
          const n2 = ctx2.createBufferSource();
          const b2 = ctx2.createBuffer(1, ctx2.sampleRate * 0.25, ctx2.sampleRate);
          const d2 = b2.getChannelData(0);
          for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * 0.1;
          n2.buffer = b2;
          const f2 = ctx2.createBiquadFilter();
          f2.type = 'bandpass';
          f2.frequency.setValueAtTime(600, now2);
          const g2 = ctx2.createGain();
          g2.gain.setValueAtTime(0, now2);
          g2.gain.linearRampToValueAtTime(0.08, now2 + 0.03);
          g2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.2);
          n2.connect(f2); f2.connect(g2); g2.connect(ctx2.destination);
          n2.start(); n2.stop(now2 + 0.25);
        } catch (_) {}
      }, 200);
    } catch (_) {}
  };

  // Walk animation
  const triggerWarpToTarget = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setIsTraveling(true);
    playStepSound();
    setWalkOffset(-30);
    setTimeout(() => {
      setCurrentIndex(toIndex);
      setWalkOffset(30);
      setTimeout(() => {
        setWalkOffset(0);
        setIsTraveling(false);
      }, 400);
    }, 600);
  };

  // Auto-advance on mount
  const hasCheckedAutoAdvance = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasCheckedAutoAdvance.current) {
      hasCheckedAutoAdvance.current = true;
      const lastSeenStr = localStorage.getItem('guionbajo_last_seen_topic_index');
      if (lastSeenStr !== null) {
        const lastSeen = parseInt(lastSeenStr, 10);
        if (!isNaN(lastSeen) && lastSeen < targetIndex) {
          setCurrentIndex(lastSeen);
          const timer = setTimeout(() => {
            triggerWarpToTarget(lastSeen, targetIndex);
            localStorage.setItem('guionbajo_last_seen_topic_index', targetIndex.toString());
          }, 400);
          return () => clearTimeout(timer);
        }
      }
      setCurrentIndex(targetIndex);
      localStorage.setItem('guionbajo_last_seen_topic_index', targetIndex.toString());
    } else if (targetIndex !== currentIndex && !isTraveling) {
      triggerWarpToTarget(currentIndex, targetIndex);
      localStorage.setItem('guionbajo_last_seen_topic_index', targetIndex.toString());
    }
  }, [targetIndex]);

  // Minimap GPS point calculation
  const getMinimapPoint = (index: number) => {
    const total = 63;
    const t = Math.max(0, Math.min(1, index / total));
    const x = 28 + t * (532 - 28);
    const angle = t * Math.PI * 4;
    const y = 36 - Math.sin(angle) * 13;
    return { x, y };
  };

  const currentPoint = getMinimapPoint(currentIndex);

  /* ─── Path waypoints for the winding trail (viewBox 960x420) ─── */
  const trailPath = "M 480 395 C 480 370, 430 340, 380 320 C 310 290, 280 270, 340 240 C 400 210, 520 200, 560 180 C 610 155, 580 130, 520 115 C 460 100, 420 80, 480 55";

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

        <div className="flex items-center gap-2.5 sm:gap-3">
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
      <div className={`relative w-full h-[260px] sm:h-[310px] md:h-[380px] overflow-hidden`}>
        <svg
          viewBox="0 0 960 420"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full block"
        >
          <defs>
            {/* Soft glow filter */}
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

            {/* Sky gradient — golden hour warmth */}
            <linearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1145" />
              <stop offset="25%" stopColor="#2d1b69" />
              <stop offset="45%" stopColor="#7c3aed" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="75%" stopColor="#fb923c" stopOpacity="0.5" />
              <stop offset="88%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.35" />
            </linearGradient>

            {/* Sun glow */}
            <radialGradient id="sunGlow" cx="0.5" cy="0.52" r="0.35">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>

            {/* Hill gradients (far to near) */}
            <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a2a" />
              <stop offset="100%" stopColor="#162e20" />
            </linearGradient>
            <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a4a2e" />
              <stop offset="100%" stopColor="#143822" />
            </linearGradient>
            <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c5c34" />
              <stop offset="100%" stopColor="#0f3d1e" />
            </linearGradient>
            <linearGradient id="hillClosest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16492a" />
              <stop offset="100%" stopColor="#0a2e16" />
            </linearGradient>

            {/* Trail/path gradient */}
            <linearGradient id="trailGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#d4a574" />
              <stop offset="30%" stopColor="#c09660" />
              <stop offset="60%" stopColor="#a8845a" />
              <stop offset="100%" stopColor="#8a7050" />
            </linearGradient>

            {/* Grass texture pattern */}
            <pattern id="grassTex" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="transparent" />
              <line x1="1" y1="6" x2="2" y2="3" stroke="#2a7040" strokeWidth="0.5" opacity="0.3" />
              <line x1="4" y1="6" x2="4.5" y2="4" stroke="#1f5530" strokeWidth="0.4" opacity="0.2" />
            </pattern>
          </defs>

          {/* ─── SKY ─── */}
          <rect width="960" height="420" fill="url(#skyWarm)" />

          {/* Stars (subtle, upper sky) */}
          <g opacity="0.6">
            <circle cx="120" cy="30" r="1" fill="#e2e8f0" />
            <circle cx="250" cy="55" r="0.8" fill="#e2e8f0" />
            <circle cx="380" cy="20" r="1.2" fill="#e2e8f0" />
            <circle cx="600" cy="40" r="0.8" fill="#e2e8f0" />
            <circle cx="720" cy="25" r="1" fill="#e2e8f0" />
            <circle cx="850" cy="50" r="0.7" fill="#e2e8f0" />
            <circle cx="180" cy="65" r="0.6" fill="#e2e8f0" />
            <circle cx="500" cy="15" r="0.9" fill="#e2e8f0" />
            <circle cx="790" cy="60" r="0.8" fill="#e2e8f0" />
          </g>

          {/* Sun/horizon glow */}
          <rect x="0" y="100" width="960" height="220" fill="url(#sunGlow)" />

          {/* Clouds */}
          <g opacity="0.25">
            <ellipse cx="200" cy="80" rx="60" ry="14" fill="#fde68a" />
            <ellipse cx="230" cy="78" rx="40" ry="10" fill="#fef3c7" />
            <ellipse cx="700" cy="95" rx="70" ry="16" fill="#fed7aa" />
            <ellipse cx="735" cy="92" rx="45" ry="11" fill="#fef3c7" />
            <ellipse cx="450" cy="65" rx="50" ry="12" fill="#fde68a" />
          </g>

          {/* Birds (V shapes) */}
          <g stroke="#1e1b4b" strokeWidth="1.2" fill="none" opacity="0.35">
            <path d="M 300 70 Q 305 65, 310 70 Q 315 65, 320 70" />
            <path d="M 620 55 Q 624 51, 628 55 Q 632 51, 636 55" />
            <path d="M 500 85 Q 503 82, 506 85 Q 509 82, 512 85" />
          </g>

          {/* ─── HILL LAYERS (far → near, creating depth) ─── */}

          {/* Farthest hills (horizon line) */}
          <path
            d="M 0 200 Q 120 160, 240 185 Q 360 210, 480 170 Q 600 130, 720 175 Q 840 210, 960 180 L 960 250 L 0 250 Z"
            fill="url(#hillFar)"
            opacity="0.7"
          />

          {/* Mid hills */}
          <path
            d="M 0 230 Q 100 195, 200 220 Q 330 250, 440 205 Q 550 165, 680 215 Q 800 255, 960 210 L 960 290 L 0 290 Z"
            fill="url(#hillMid)"
            opacity="0.85"
          />

          {/* Trees on mid hills (simple triangles) */}
          <g opacity="0.55">
            {[80, 140, 200, 290, 750, 810, 870, 920].map((x, i) => {
              const treeY = 225 + Math.sin(x * 0.02) * 15;
              const h = 18 + (i % 3) * 6;
              return (
                <g key={`tree-far-${i}`}>
                  <polygon
                    points={`${x},${treeY} ${x - 5},${treeY + h} ${x + 5},${treeY + h}`}
                    fill="#0f3d1e"
                  />
                  <polygon
                    points={`${x},${treeY - 6} ${x - 4},${treeY + h * 0.55} ${x + 4},${treeY + h * 0.55}`}
                    fill="#16492a"
                  />
                </g>
              );
            })}
          </g>

          {/* Nearer hills */}
          <path
            d="M 0 270 Q 160 240, 300 265 Q 420 285, 500 250 Q 600 220, 720 260 Q 850 295, 960 255 L 960 340 L 0 340 Z"
            fill="url(#hillNear)"
          />

          {/* Closer trees */}
          <g opacity="0.7">
            {[50, 130, 245, 350, 610, 690, 780, 880, 940].map((x, i) => {
              const treeY = 258 + Math.sin(x * 0.03) * 12;
              const h = 22 + (i % 4) * 5;
              return (
                <g key={`tree-near-${i}`}>
                  <rect x={x - 1.5} y={treeY + h - 4} width="3" height="6" fill="#2d1f0e" rx="0.5" />
                  <polygon
                    points={`${x},${treeY} ${x - 7},${treeY + h} ${x + 7},${treeY + h}`}
                    fill="#134a25"
                  />
                  <polygon
                    points={`${x},${treeY - 8} ${x - 5.5},${treeY + h * 0.5} ${x + 5.5},${treeY + h * 0.5}`}
                    fill="#1a5c32"
                  />
                </g>
              );
            })}
          </g>

          {/* Closest foreground hill */}
          <path
            d="M 0 310 Q 200 290, 380 310 Q 480 320, 580 305 Q 750 285, 960 310 L 960 420 L 0 420 Z"
            fill="url(#hillClosest)"
          />

          {/* Grass overlay texture */}
          <path
            d="M 0 310 Q 200 290, 380 310 Q 480 320, 580 305 Q 750 285, 960 310 L 960 420 L 0 420 Z"
            fill="url(#grassTex)"
            opacity="0.4"
          />

          {/* ─── WINDING TRAIL (the path the student walks) ─── */}

          {/* Trail shadow */}
          <path
            d={trailPath}
            fill="none"
            stroke="#0a2010"
            strokeWidth="42"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />

          {/* Trail body */}
          <path
            d={trailPath}
            fill="none"
            stroke="url(#trailGrad)"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Trail edge detail (darker border) */}
          <path
            d={trailPath}
            fill="none"
            stroke="#8b6f47"
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />
          <path
            d={trailPath}
            fill="none"
            stroke="url(#trailGrad)"
            strokeWidth="33"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Trail subtle center line (worn path) */}
          <path
            d={trailPath}
            fill="none"
            stroke="#dcc8a8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
            opacity="0.25"
          />

          {/* ─── NEXT FLAG (further along the path) ─── */}
          {nextTopic && (
            <g opacity="0.6">
              {/* Flag pole */}
              <line x1="520" y1="115" x2="520" y2="78" stroke="#8b6f47" strokeWidth="2.5" strokeLinecap="round" />
              {/* Flag */}
              <path d="M 520 78 L 540 84 L 520 90 Z" fill={getPalette(nextTopic.levelColor).flag} opacity="0.8" />
              {/* Flag glow */}
              <circle cx="520" cy="84" r="5" fill={getPalette(nextTopic.levelColor).primary} opacity="0.15" />
              <text x="520" y="72" fill="#ffffff" fontFamily="sans-serif" fontSize="8" fontWeight="bold" textAnchor="middle" opacity="0.5">
                {currentIndex + 2}
              </text>
            </g>
          )}

          {/* ─── CURRENT FLAG (at the bend, the student's position) ─── */}
          <g filter="url(#flagGlow)">
            {/* Flag pole shadow */}
            <line x1="381" y1="320" x2="381" y2="262" stroke="#0a2010" strokeWidth="4" strokeLinecap="round" opacity="0.25" />
            {/* Flag pole */}
            <line x1="380" y1="320" x2="380" y2="260" stroke="#d4a574" strokeWidth="3" strokeLinecap="round" />
            {/* Pole top ornament */}
            <circle cx="380" cy="258" r="3" fill={palette.primary} />
            {/* Flag banner */}
            <path
              d="M 380 262 L 406 270 L 404 276 L 380 280 Z"
              fill={palette.flag}
              stroke={palette.primary}
              strokeWidth="0.8"
            >
              {/* Subtle wave animation via CSS */}
            </path>
            {/* Flag inner detail */}
            <path
              d="M 384 268 L 400 273 L 399 276 L 384 276 Z"
              fill={palette.glow}
              opacity="0.35"
            />
            {/* Flag glow circle */}
            <circle cx="393" cy="271" r="14" fill={palette.primary} opacity="0.08" />
          </g>

          {/* Current class number on flag */}
          <text x="393" y="275" fill="#ffffff" fontFamily="sans-serif" fontSize="7" fontWeight="900" textAnchor="middle">
            {currentIndex + 1}
          </text>

          {/* ─── PAST FLAGS (small markers behind the walker) ─── */}
          {currentIndex > 0 && (
            <g opacity="0.35">
              <line x1="460" y1="365" x2="460" y2="340" stroke="#8b6f47" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 460 340 L 472 344 L 460 348 Z" fill="#6b7280" />
            </g>
          )}
          {currentIndex > 1 && (
            <g opacity="0.2">
              <line x1="490" y1="388" x2="490" y2="368" stroke="#8b6f47" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M 490 368 L 499 371 L 490 374 Z" fill="#6b7280" />
            </g>
          )}

          {/* ─── WALKER / STUDENT (silhouette from behind, center-bottom) ─── */}
          <g
            style={{
              transform: `translateY(${walkOffset}px)`,
              transition: isTraveling ? 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'transform 0.8s ease-out',
            }}
          >
            {/* Walker shadow on ground */}
            <ellipse cx="430" cy="345" rx="14" ry="4" fill="#0a2010" opacity="0.35" />

            {/* Body (jacket / torso) */}
            <path
              d="M 422 315 Q 420 325, 418 338 L 420 344 L 440 344 L 442 338 Q 440 325, 438 315 Z"
              fill="#374151"
              stroke="#1f2937"
              strokeWidth="0.5"
            />

            {/* Backpack */}
            <rect x="424" y="312" width="12" height="18" rx="3" fill="#4b5563" stroke="#374151" strokeWidth="0.5" />
            <rect x="426" y="315" width="8" height="4" rx="1" fill="#6b7280" opacity="0.4" />
            {/* Backpack straps */}
            <line x1="426" y1="312" x2="424" y2="320" stroke="#374151" strokeWidth="1" />
            <line x1="434" y1="312" x2="436" y2="320" stroke="#374151" strokeWidth="1" />

            {/* Head */}
            <circle cx="430" cy="305" r="9" fill="#92400e" />
            {/* Hair */}
            <ellipse cx="430" cy="302" rx="9.5" ry="7" fill="#451a03" />
            <path d="M 421 304 Q 425 298, 430 296 Q 435 298, 439 304" fill="#451a03" />

            {/* Neck */}
            <rect x="427" y="312" width="6" height="4" fill="#92400e" rx="1" />

            {/* Arms */}
            <path d="M 422 318 Q 416 328, 414 336" fill="none" stroke="#374151" strokeWidth="4" strokeLinecap="round" />
            <path d="M 438 318 Q 444 328, 446 336" fill="none" stroke="#374151" strokeWidth="4" strokeLinecap="round" />

            {/* Legs */}
            <line x1="425" y1="344" x2="423" y2="357" stroke="#1e3a5f" strokeWidth="4" strokeLinecap="round" />
            <line x1="435" y1="344" x2="437" y2="357" stroke="#1e3a5f" strokeWidth="4" strokeLinecap="round" />

            {/* Shoes */}
            <ellipse cx="422" cy="358" rx="4" ry="2.5" fill="#78350f" />
            <ellipse cx="438" cy="358" rx="4" ry="2.5" fill="#78350f" />
          </g>

          {/* ─── FOREGROUND GRASS BLADES ─── */}
          <g opacity="0.6">
            {[20, 60, 100, 160, 740, 800, 860, 920].map((x, i) => (
              <g key={`grass-${i}`}>
                <line
                  x1={x}
                  y1="420"
                  x2={x + (i % 2 === 0 ? 3 : -3)}
                  y2={400 - (i % 3) * 4}
                  stroke="#1a5c32"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1={x + 6}
                  y1="420"
                  x2={x + 8}
                  y2={406 - (i % 2) * 5}
                  stroke="#16492a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </g>

          {/* Wildflowers near the path */}
          <g opacity="0.5">
            <circle cx="350" cy="330" r="2" fill="#fbbf24" />
            <circle cx="355" cy="333" r="1.5" fill="#fb923c" />
            <circle cx="500" cy="310" r="2" fill="#f472b6" />
            <circle cx="505" cy="313" r="1.5" fill="#e879f9" />
            <circle cx="310" cy="315" r="1.8" fill="#fbbf24" />
            <circle cx="555" cy="300" r="1.5" fill="#60a5fa" />
          </g>

          {/* ─── Floating particles / fireflies ─── */}
          <g>
            <circle cx="400" cy="280" r="1.5" fill="#fef3c7" opacity="0.5">
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
              <animate attributeName="cy" values="280;275;280" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="500" cy="250" r="1" fill="#fef3c7" opacity="0.4">
              <animate attributeName="opacity" values="0.15;0.5;0.15" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="cy" values="250;244;250" dur="3.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="340" cy="260" r="1.2" fill={palette.glow} opacity="0.3">
              <animate attributeName="opacity" values="0.1;0.45;0.1" dur="3.8s" repeatCount="indefinite" />
              <animate attributeName="cx" values="340;345;340" dur="5s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>

        {/* ─── FLOATING STATION BADGE ─── */}
        <div className="absolute top-4 left-0 right-0 z-10 pointer-events-none flex flex-col items-center px-4">
          <div
            className="px-4 sm:px-6 py-2 rounded-2xl border backdrop-blur-md transition-colors duration-700 text-center max-w-[92%] sm:max-w-lg shadow-2xl pointer-events-auto"
            style={{
              backgroundColor: 'rgba(10, 20, 14, 0.88)',
              borderColor: `${palette.primary}44`,
              boxShadow: `0 0 30px ${palette.primary}15, 0 4px 20px rgba(0,0,0,0.4)`,
            }}
          >
            <div
              className="text-[10px] sm:text-xs font-bold tracking-widest font-mono uppercase mb-0.5"
              style={{ color: palette.primary }}
            >
              NIVEL {currentTopic.level} • {currentTopic.module} — CLASE {currentTopic.classNum}
            </div>
            <div className="text-sm sm:text-base md:text-lg font-outfit font-black text-white tracking-wide leading-tight">
              {currentTopic.title.toUpperCase()}
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
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: palette.primary }} />
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Sendero — Estación {currentIndex + 1} de 64
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/35">
            {Math.round(((currentIndex + 1) / 64) * 100)}% del recorrido
          </span>
        </div>

        <div className="w-full overflow-hidden py-1">
          <svg width="100%" height="68" viewBox="0 0 560 68" preserveAspectRatio="xMidYMid meet" className="block overflow-visible">
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
            <line x1="28" y1="36" x2="532" y2="36" stroke="#1e3a2a" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

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
              const dotColor = t.levelColor === '#00e676' ? '#34d399' :
                               t.levelColor === '#ffd600' ? '#fbbf24' :
                               t.levelColor === '#00b0ff' ? '#38bdf8' : '#c084fc';
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

            {/* 📍 Active beacon */}
            <g id="activeRadarBeacon">
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="14"
                fill={palette.primary}
                fillOpacity="0.2"
                stroke={palette.primary}
                strokeWidth="1.5"
                className="animate-ping"
              />
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="4.5"
                fill="#ffffff"
                stroke={palette.primary}
                strokeWidth="2.5"
              />
              {/* Flagpole */}
              <line
                x1={currentPoint.x}
                y1={currentPoint.y}
                x2={currentPoint.x}
                y2={currentPoint.y - 18}
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              {/* Flag */}
              <polygon
                points={`${currentPoint.x},${currentPoint.y - 18} ${currentPoint.x + 10},${currentPoint.y - 13.5} ${currentPoint.x},${currentPoint.y - 9}`}
                fill={palette.flag}
                stroke="#ffffff"
                strokeWidth="0.8"
              />
              <text
                x={currentPoint.x}
                y={currentPoint.y - 21}
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
