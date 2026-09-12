'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Volume2, VolumeX, Play, Sparkles, ChevronRight } from 'lucide-react';
import { JOURNEY_TOPICS, getTopicIndex, JourneyTopic } from '@/lib/journeyTopics';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';

interface JourneyVisualStageProps {
  sublevel: string;
  classIndex: number;
  activeCheckpoint?: any;
  onLaunchClass: () => void;
}

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
  const [portalTransform, setPortalTransform] = useState({ scale: 1, translateY: 0, opacity: 1 });
  const [distantTransform, setDistantTransform] = useState({ scale: 1, translateY: 0, opacity: 0.65 });

  const currentTopic: JourneyTopic = JOURNEY_TOPICS[currentIndex] || JOURNEY_TOPICS[0];
  const nextTopic: JourneyTopic | null = JOURNEY_TOPICS[currentIndex + 1] || null;

  // Precomputed planks for perspective boardwalk (scaled for viewBox 960x400)
  const planks = useMemo(() => {
    const list: Array<{ x1: number; y1: number; x2: number; y2: number; strokeWidth: number }> = [];
    let y = 395;
    let spacing = 18;
    while (y > 170) {
      const t = (y - 170) / (400 - 170);
      const xLeft = 380 - (380 - 60) * t;
      const xRight = 580 + (900 - 580) * t;
      list.push({
        x1: parseFloat(xLeft.toFixed(1)),
        y1: parseFloat(y.toFixed(1)),
        x2: parseFloat(xRight.toFixed(1)),
        y2: parseFloat(y.toFixed(1)),
        strokeWidth: parseFloat(Math.max(0.5, 1.8 * t).toFixed(1)),
      });
      spacing = Math.max(1.5, spacing * 0.935);
      y -= spacing;
    }
    return list;
  }, []);

  // Web Audio warp sound
  const playWarpSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.8);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.linearRampToValueAtTime(1900, now + 0.35);
      filter.frequency.linearRampToValueAtTime(300, now + 0.8);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.8);
    } catch (_) {}
  };

  // Warp animation
  const triggerWarpToTarget = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setIsTraveling(true);
    playWarpSound();
    setPortalTransform({ scale: 2.6, translateY: 60, opacity: 0 });
    setDistantTransform({ scale: 2.2, translateY: 35, opacity: 1 });
    setTimeout(() => {
      setCurrentIndex(toIndex);
      setPortalTransform({ scale: 0.85, translateY: -20, opacity: 0 });
      setTimeout(() => {
        setPortalTransform({ scale: 1, translateY: 0, opacity: 1 });
        setDistantTransform({ scale: 1, translateY: 0, opacity: 0.65 });
        setIsTraveling(false);
      }, 60);
    }, 650);
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

  // Minimap GPS point calculation (x: 28 to 532, y: sinusoidal around y=36)
  const getMinimapPoint = (index: number) => {
    const total = 63;
    const t = Math.max(0, Math.min(1, index / total));
    const x = 28 + t * (532 - 28);
    const angle = t * Math.PI * 4;
    const y = 36 - Math.sin(angle) * 13;
    return { x, y };
  };

  const currentPoint = getMinimapPoint(currentIndex);

  return (
    <div className="w-full rounded-3xl overflow-hidden glass border border-brand-accent/30 shadow-2xl relative bg-[#04060d] mb-8">
      {/* ==================== STAGE HEADER HUD ==================== */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-b from-black/90 via-black/60 to-black/30 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-colors duration-700 shadow-md flex-shrink-0"
            style={{
              borderColor: `${currentTopic.levelColor}66`,
              backgroundColor: `${currentTopic.levelColor}22`,
              color: currentTopic.levelColor,
            }}
          >
            <Sparkles size={16} className="animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-outfit font-extrabold text-xs sm:text-sm tracking-wider text-white uppercase">
                Ruta de Aprendizaje
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-700 font-mono"
                style={{
                  borderColor: `${currentTopic.levelColor}66`,
                  backgroundColor: `${currentTopic.levelColor}22`,
                  color: currentTopic.levelColor,
                }}
              >
                NIVEL {currentTopic.level}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              64 Clases Oficiales CEFR — Estación {currentIndex + 1}
            </p>
          </div>
        </div>

        {/* Progress + Sound Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Ubicación</span>
            <span className="text-xs font-bold font-mono" style={{ color: currentTopic.levelColor }}>
              Clase {currentIndex + 1} de 64
            </span>
          </div>
          <div className="w-14 sm:w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full transition-all duration-700 rounded-full"
              style={{
                width: `${((currentIndex + 1) / 64) * 100}%`,
                backgroundColor: currentTopic.levelColor,
              }}
            />
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg glass hover:bg-slate-800/80 text-slate-400 hover:text-white transition border border-white/10"
            title={soundEnabled ? 'Silenciar' : 'Activar audio'}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* ==================== 3D PERSPECTIVE VISUAL STAGE (CLEAR & UNOBSTRUCTED) ==================== */}
      <div className={`relative w-full h-[250px] sm:h-[300px] md:h-[360px] overflow-hidden ${isTraveling ? 'traveling' : ''}`}>
        <svg
          viewBox="0 0 960 400"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full block"
        >
          <defs>
            <filter id="neon-glow-dynamic" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#05070f" />
              <stop offset="45%" stopColor="#0d1422" />
              <stop offset="70%" stopColor="#192333" />
              <stop offset="85%" stopColor="#2d3b4b" />
              <stop offset="100%" stopColor="#44434a" />
            </linearGradient>

            <radialGradient id="horizonGlow" cx="0.5" cy="0.48" r="0.45">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#d97706" stopOpacity="0.22" />
              <stop offset="70%" stopColor="#1e293b" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="boardwalkGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#121720" />
              <stop offset="40%" stopColor="#18202a" />
              <stop offset="75%" stopColor="#222c3b" />
              <stop offset="100%" stopColor="#323f50" />
            </linearGradient>

            <linearGradient id="portalStrutGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <radialGradient id="portalFieldGrad" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor={currentTopic.levelColor} stopOpacity="0.35" />
              <stop offset="65%" stopColor="#00b0ff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Sky & Mountains */}
          <rect width="960" height="400" fill="url(#skyGrad)" />
          <path d="M 0 60 Q 240 40, 480 65 T 960 55 L 960 170 L 0 170 Z" fill="#0d141e" opacity="0.6" />
          <path d="M 0 95 Q 320 75, 640 100 T 960 85 L 960 185 L 0 185 Z" fill="#15202d" opacity="0.4" />
          <rect x="0" y="130" width="960" height="100" fill="url(#horizonGlow)" />

          {/* Distant horizon station lights */}
          <g opacity="0.8">
            <circle cx="440" cy="178" r="2.5" fill="#fef08a" />
            <circle cx="460" cy="176" r="3" fill="#ffedd5" />
            <circle cx="480" cy="179" r="2" fill="#fed7aa" />
            <circle cx="500" cy="175" r="3.5" fill="#ffedd5" />
            <circle cx="520" cy="177" r="2.5" fill="#fde68a" />
          </g>

          {/* Lateral landscape */}
          <path d="M 0 185 Q 150 175, 390 190 L 390 250 L 0 270 Z" fill="#070a0f" />
          <path d="M 570 190 Q 800 180, 960 195 L 960 270 L 570 250 Z" fill="#070a0f" />

          {/* 3D Boardwalk with geometric planks */}
          <g id="boardwalkGroup">
            <path d="M 60 400 L 380 175 L 580 175 L 900 400 Z" fill="url(#boardwalkGrad)" />

            <g stroke="#141922" opacity="0.75">
              {planks.map((p, i) => (
                <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} strokeWidth={p.strokeWidth} />
              ))}
            </g>

            {/* Metal guardrails */}
            <line x1="60" y1="400" x2="380" y2="175" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
            <line x1="900" y1="400" x2="580" y2="175" stroke="#334155" strokeWidth="5" strokeLinecap="round" />

            {/* Neon Rails */}
            <line x1="60" y1="398" x2="380" y2="175" stroke={currentTopic.levelColor} strokeWidth="3" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="60" y1="398" x2="380" y2="175" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />
            <line x1="900" y1="398" x2="580" y2="175" stroke={currentTopic.levelColor} strokeWidth="3" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="900" y1="398" x2="580" y2="175" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />

            {/* Center neon guidance rail */}
            <line x1="480" y1="400" x2="480" y2="175" stroke="#00b0ff" strokeWidth="2.5" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="480" y1="400" x2="480" y2="175" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />

            {/* Speed streaks during warp */}
            {isTraveling && (
              <g className="animate-pulse">
                <line x1="275" y1="330" x2="340" y2="270" stroke={currentTopic.levelColor} strokeWidth="2.5" strokeDasharray="10 20" />
                <line x1="480" y1="345" x2="480" y2="280" stroke="#00b0ff" strokeWidth="2.5" strokeDasharray="12 22" />
                <line x1="685" y1="330" x2="620" y2="270" stroke={currentTopic.levelColor} strokeWidth="2.5" strokeDasharray="10 20" />
              </g>
            )}
          </g>

          {/* Distant Next Station */}
          {nextTopic && (
            <g
              id="distantPortalGroup"
              style={{
                transform: `scale(${distantTransform.scale}) translateY(${distantTransform.translateY}px)`,
                opacity: distantTransform.opacity,
                transformOrigin: '480px 175px',
                transition: 'transform 1.1s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.8s ease',
              }}
            >
              <path d="M 458 175 L 468 155 L 492 155 L 502 175" fill="none" stroke="#1e293b" strokeWidth="1.5" />
              <path d="M 459 175 L 469 156 L 491 156 L 501 175" fill="none" stroke={nextTopic.levelColor} strokeWidth="1" />
              <circle cx="480" cy="165" r="7" fill={nextTopic.levelColor} fillOpacity="0.25" />
              <text x="480" y="148" fill="#ffffff" fontFamily="sans-serif" fontSize="8" fontWeight="bold" textAnchor="middle">
                TEMA {currentIndex + 2}
              </text>
            </g>
          )}

          {/* Main Active Station Portal */}
          <g
            id="portalGroup"
            style={{
              transform: `scale(${portalTransform.scale}) translateY(${portalTransform.translateY}px)`,
              opacity: portalTransform.opacity,
              transformOrigin: '480px 175px',
              transition: isTraveling ? 'none' : 'transform 1.1s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.8s ease',
            }}
          >
            {/* Vortex core */}
            <ellipse cx="480" cy="170" rx="125" ry="68" fill="url(#portalFieldGrad)" />
            <ellipse cx="480" cy="170" rx="104" ry="54" fill="none" stroke={currentTopic.levelColor} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.5" />

            {/* Left Column */}
            <polygon points="365,250 390,120 402,120 383,250" fill="url(#portalStrutGrad)" stroke="#475569" strokeWidth="0.8" />
            <line x1="388" y1="120" x2="368" y2="250" stroke={currentTopic.levelColor} strokeWidth="3" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="388" y1="120" x2="368" y2="250" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />

            {/* Right Column */}
            <polygon points="595,250 570,120 558,120 578,250" fill="url(#portalStrutGrad)" stroke="#475569" strokeWidth="0.8" />
            <line x1="573" y1="120" x2="593" y2="250" stroke={currentTopic.levelColor} strokeWidth="3" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="573" y1="120" x2="593" y2="250" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />

            {/* Crown Arch */}
            <path d="M 385 120 Q 480 100, 575 120 L 565 110 Q 480 92, 395 110 Z" fill="url(#portalStrutGrad)" stroke="#475569" strokeWidth="0.8" />
            <path d="M 390 118 Q 480 100, 570 118" fill="none" stroke={currentTopic.levelColor} strokeWidth="3" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <path d="M 390 118 Q 480 100, 570 118" fill="none" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </svg>

        {/* ==================== CLEAN FLOATING STATION BADGE (ON THE PORTAL ARCH) ==================== */}
        <div className="absolute top-4 left-0 right-0 z-10 pointer-events-none flex flex-col items-center px-4">
          <div
            className="px-4 sm:px-6 py-2 rounded-2xl border backdrop-blur-md transition-colors duration-700 text-center max-w-[92%] sm:max-w-lg shadow-2xl pointer-events-auto"
            style={{
              backgroundColor: 'rgba(6, 10, 18, 0.88)',
              borderColor: `${currentTopic.levelColor}66`,
              boxShadow: `0 0 25px ${currentTopic.levelColor}25`,
            }}
          >
            <div
              className="text-[10px] sm:text-xs font-bold tracking-widest font-mono uppercase mb-0.5"
              style={{ color: currentTopic.levelColor }}
            >
              NIVEL {currentTopic.level} • {currentTopic.module} — CLASE {currentTopic.classNum}
            </div>
            <div className="text-sm sm:text-base md:text-lg font-outfit font-black text-white tracking-wide leading-tight">
              {currentTopic.title.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 3 PEDAGOGICAL PILLARS (READABLE DEDICATED CARDS BELOW STAGE) ==================== */}
      <div className="px-4 sm:px-6 py-3 bg-slate-950/80 border-t border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Pilar 1: Gramática */}
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
              📘 Gramática
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {currentTopic.grammar}
            </p>
          </div>

          {/* Pilar 2: Vocabulario */}
          <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block mb-0.5">
              💬 Vocabulario
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {currentTopic.vocab}
            </p>
          </div>

          {/* Pilar 3: Fonética */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block mb-0.5">
              🎙️ Fonética
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {currentTopic.phonetics}
            </p>
          </div>
        </div>
      </div>

      {/* ==================== MINIMAPA RADAR GPS (CLEAN & CRYSTAL-CLEAR ON MOBILE) ==================== */}
      <div className="px-4 sm:px-6 pt-3 pb-2 bg-slate-950/95 border-t border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTopic.levelColor }} />
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Radar GPS — Estación {currentIndex + 1} de 64
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {Math.round(((currentIndex + 1) / 64) * 100)}% de avance global
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

            {/* Radar Grid line */}
            <line x1="28" y1="36" x2="532" y2="36" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

            {/* 4 CEFR Level Segments (A1: Green, A2: Gold, B1: Cyan, B2: Magenta) */}
            <path d="M 28 44 Q 92 18, 154 36" fill="none" stroke="#00e676" strokeWidth="5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 28 44 Q 92 18, 154 36" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

            <path d="M 154 36 Q 218 54, 280 34" fill="none" stroke="#ffd600" strokeWidth="5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 154 36 Q 218 54, 280 34" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

            <path d="M 280 34 Q 344 16, 406 36" fill="none" stroke="#00b0ff" strokeWidth="5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 280 34 Q 344 16, 406 36" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

            <path d="M 406 36 Q 470 56, 532 30" fill="none" stroke="#d500f9" strokeWidth="5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 406 36 Q 470 56, 532 30" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

            {/* Level Sector Badges */}
            <text x="92" y="14" fill="#00e676" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.9">A1</text>
            <text x="218" y="65" fill="#ffd600" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.9">A2</text>
            <text x="344" y="14" fill="#00b0ff" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.9">B1</text>
            <text x="470" y="65" fill="#d500f9" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.9">B2</text>

            {/* Milestone Route Dots */}
            {JOURNEY_TOPICS.map((t, idx) => {
              if (idx === currentIndex) return null;
              const pt = getMinimapPoint(idx);
              const isPast = idx < currentIndex;
              return (
                <circle
                  key={t.id}
                  cx={pt.x}
                  cy={pt.y}
                  r={isPast ? 2.2 : 1.4}
                  fill={t.levelColor}
                  opacity={isPast ? 0.75 : 0.25}
                />
              );
            })}

            {/* 📍 THE SOLE PROMINENT RADAR BEACON: CURRENT ACTIVE STATION */}
            <g id="activeRadarBeacon">
              {/* Pulsing Radar Ring */}
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="14"
                fill={currentTopic.levelColor}
                fillOpacity="0.25"
                stroke={currentTopic.levelColor}
                strokeWidth="1.5"
                className="animate-ping"
              />
              {/* Solid Center Dot */}
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="4.5"
                fill="#ffffff"
                stroke={currentTopic.levelColor}
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
              {/* Flag Banner */}
              <polygon
                points={`${currentPoint.x},${currentPoint.y - 18} ${currentPoint.x + 10},${currentPoint.y - 13.5} ${currentPoint.x},${currentPoint.y - 9}`}
                fill={currentTopic.levelColor}
                stroke="#ffffff"
                strokeWidth="0.8"
              />
              {/* Active station text tag */}
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

      {/* ==================== CTA FOOTER WITH AVATAR & LAUNCH BUTTON ==================== */}
      <div className="px-4 sm:px-6 py-3.5 bg-slate-950/95 border-t border-slate-800/80 flex items-center justify-between gap-3">
        {/* Guion Bajo Mascot */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-11 h-11 flex items-center justify-center overflow-hidden flex-shrink-0">
            <TutorAvatar size="sm" emotion="happy" />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">
              {currentTopic.level} — Clase {currentTopic.classNum}
            </div>
            <div className="text-[10px] text-slate-400">
              {activeCheckpoint ? 'Progreso guardado listo' : '5 minutos • interactivo'}
            </div>
          </div>
        </div>

        {/* Prominent Launch Action Button */}
        <button
          onClick={onLaunchClass}
          className="px-5 sm:px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer flex-shrink-0"
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
