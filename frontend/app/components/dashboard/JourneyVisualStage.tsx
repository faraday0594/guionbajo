'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  Lock,
  MapPin,
} from 'lucide-react';
import { JOURNEY_TOPICS, getTopicIndex, JourneyTopic } from '@/lib/journeyTopics';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';
import { getCurrentUpgradeStage } from '@/lib/guionbajoUpgrades';

interface JourneyVisualStageProps {
  sublevel: string;
  classIndex: number;
  activeCheckpoint?: any;
  onLaunchClass: (targetSublevel?: string, targetClassIndex?: number) => void;
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

  // Nivel de evolución visual de Guionbajo (calculado desde localStorage o nivel activo)
  const [avatarUpgradeStage, setAvatarUpgradeStage] = useState(() => getCurrentUpgradeStage(sublevel));

  useEffect(() => {
    setAvatarUpgradeStage(getCurrentUpgradeStage(sublevel));
  }, [sublevel]);

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
  const [travelDirection, setTravelDirection] = useState<'forward' | 'backward'>('forward');
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Thruster audio: continuous sound during flight
  const thrusterCtxRef   = useRef<AudioContext | null>(null);
  const thrusterGainRef  = useRef<GainNode | null>(null);
  const thrusterOsc1Ref  = useRef<OscillatorNode | null>(null);
  const thrusterOsc2Ref  = useRef<OscillatorNode | null>(null);
  const thrusterNoiseRef = useRef<AudioBufferSourceNode | null>(null);

  const handleNavigatePrev = () => {
    if (isTraveling || currentIndex <= 0) return;
    triggerAdvance(currentIndex, currentIndex - 1);
  };

  const handleNavigateNext = () => {
    if (isTraveling || currentIndex >= 63) return;
    triggerAdvance(currentIndex, currentIndex + 1);
  };

  const isTravelingRef  = useRef(false);
  const animFrameRef    = useRef<number | null>(null);


  const currentTopic: JourneyTopic = JOURNEY_TOPICS[currentIndex] || JOURNEY_TOPICS[0];
  const nextTopic: JourneyTopic | null = JOURNEY_TOPICS[currentIndex + 1] || null;

  // Destination topic during transition
  const destinationTopic: JourneyTopic = JOURNEY_TOPICS[travelTo] || currentTopic;
  const upcomingTopic: JourneyTopic | null = JOURNEY_TOPICS[travelTo + 1] || null;

  const palette = getPalette(currentTopic.levelColor);

  // ─── 🚀 THRUSTER SOUND (continuous during flight) ───────────────────────
  const startThrusterSound = (direction: 'forward' | 'backward') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    stopThrusterSound();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      thrusterCtxRef.current = ctx;
      const now = ctx.currentTime;

      // Master gain — ramps up on ignition
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(0.22, now + 0.25);
      master.connect(ctx.destination);
      thrusterGainRef.current = master;

      // Low rumble oscillator (pitch slightly higher forward)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(direction === 'forward' ? 78 : 58, now);
      const g1 = ctx.createGain(); g1.gain.value = 0.45;
      osc1.connect(g1); g1.connect(master);
      osc1.start(); thrusterOsc1Ref.current = osc1;

      // Mid harmonic
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(direction === 'forward' ? 155 : 115, now);
      const g2 = ctx.createGain(); g2.gain.value = 0.22;
      osc2.connect(g2); g2.connect(master);
      osc2.start(); thrusterOsc2Ref.current = osc2;

      // Hot exhaust hiss (2-second looping noise filtered to bandpass)
      const bufLen = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
      const ns = ctx.createBufferSource();
      ns.buffer = noiseBuf; ns.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = direction === 'forward' ? 2600 : 1900;
      nf.Q.value = 0.9;
      const ng = ctx.createGain(); ng.gain.value = 0.14;
      ns.connect(nf); nf.connect(ng); ng.connect(master);
      ns.start(); thrusterNoiseRef.current = ns;
    } catch (_) {}
  };

  const stopThrusterSound = () => {
    try {
      if (thrusterGainRef.current && thrusterCtxRef.current) {
        const now = thrusterCtxRef.current.currentTime;
        thrusterGainRef.current.gain.linearRampToValueAtTime(0, now + 0.35);
        setTimeout(() => {
          try { thrusterOsc1Ref.current?.stop(); } catch (_) {}
          try { thrusterOsc2Ref.current?.stop(); } catch (_) {}
          try { thrusterNoiseRef.current?.stop(); } catch (_) {}
          try { thrusterCtxRef.current?.close(); } catch (_) {}
          thrusterOsc1Ref.current  = null;
          thrusterOsc2Ref.current  = null;
          thrusterNoiseRef.current = null;
          thrusterGainRef.current  = null;
          thrusterCtxRef.current   = null;
        }, 400);
      }
    } catch (_) {}
  };


  // Pleasant victory chime upon arriving at the new flag (ascending when forward, descending when backward)
  const playArrivalChime = (direction: 'forward' | 'backward' = 'forward') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const chord = direction === 'forward'
        ? [523.25, 659.25, 783.99] // C5 -> E5 -> G5 (Ascendente / Victoria)
        : [783.99, 659.25, 523.25]; // G5 -> E5 -> C5 (Descendente / Regreso)

      chord.forEach((freq, idx) => {
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

  // 🚀 The smooth advance / retreat animation:
  const triggerAdvance = (fromIdx: number, toIdx: number) => {
    if (isTravelingRef.current || fromIdx === toIdx) return;
    const direction = toIdx < fromIdx ? 'backward' : 'forward';
    setTravelDirection(direction);
    isTravelingRef.current = true;
    setIsTraveling(true);
    setTravelFrom(fromIdx);
    setTravelTo(toIdx);
    setCurrentIndex(fromIdx);

    // 🔊 Ignite thruster!
    startThrusterSound(direction);

    const startTime = performance.now();
    const duration = 1450; // 1.45 s flight

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
        // Landed — cut thruster, play arrival chime
        stopThrusterSound();
        playArrivalChime(direction);
        setTravelProgress(0);
        setCurrentIndex(toIdx);
        setIsTraveling(false);
        isTravelingRef.current = false;
        localStorage.setItem('guionbajo_last_seen_topic_index', toIdx.toString());
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopThrusterSound();
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
          {/* Quick jump back to active checkpoint if viewing another class */}
          {currentIndex !== targetIndex && (
            <button
              onClick={() => triggerAdvance(currentIndex, targetIndex)}
              disabled={isTraveling}
              className="px-2.5 py-1 rounded-xl bg-brand-accent/20 hover:bg-brand-accent/35 text-brand-cyan hover:text-white transition border border-brand-accent/40 flex items-center gap-1.5 text-[11px] font-bold cursor-pointer shadow-sm"
              title={`Volver a mi último checkpoint: Clase ${targetIndex + 1}`}
            >
              <CheckCircle2 size={13} className="text-brand-cyan" />
              <span className="hidden sm:inline">Ir a Checkpoint (Clase {targetIndex + 1})</span>
              <span className="sm:hidden">Checkpoint</span>
            </button>
          )}

          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-white/35 font-mono block">
              {currentIndex < targetIndex ? 'Repaso' : 'Ubicación'}
            </span>
            <span
              className="text-xs font-bold font-mono"
              style={{ color: currentIndex < targetIndex ? '#94a3b8' : palette.primary }}
            >
              Clase {currentIndex + 1} de 64 {currentIndex < targetIndex && '(Completada)'}
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
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (!next) {
                stopThrusterSound();
              }
            }}
            className={`p-1.5 rounded-lg transition border flex items-center justify-center cursor-pointer ${
              soundEnabled
                ? 'bg-brand-accent/20 border-brand-cyan/40 text-brand-cyan hover:bg-brand-accent/35 shadow-[0_0_12px_rgba(0,212,255,0.2)]'
                : 'bg-white/[0.04] border-white/[0.08] text-white/35 hover:text-white/70'
            }`}
            title={soundEnabled ? 'Silenciar propulsor y efectos' : 'Activar sonido del propulsor'}
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

            {/* 🤖 Guionbajo Robot Gradients & Shaders */}
            <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="robotChassis" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="60%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            <linearGradient id="antennaStemGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <radialGradient id="vacuumBulbGrad" cx="0.35" cy="0.35" r="0.65">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#00d4ff" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#090d14" stopOpacity="0.9" />
            </radialGradient>

            <linearGradient id="earDialGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* 🔥 Magnetic Plasma Hover Thruster Gradients */}
            <linearGradient id="plasmaFlameCore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="20%" stopColor="#00d4ff" stopOpacity="0.95" />
              <stop offset="65%" stopColor="#6366f1" stopOpacity="0.85" />
              <stop offset="90%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="plasmaFlameOuter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="15%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="38%" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#00d4ff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>

            <radialGradient id="groundPlasmaGlow" cx="0.5" cy="0.1" r="0.7">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.5" />
              <stop offset="45%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#f97316" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* 👑 Golden Chassis & Armor Gradient */}
            <linearGradient id="mapGoldChassis" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* ⚔️ Dual Cyber Sword Plasma Gradient */}
            <linearGradient id="mapSwordGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#c084fc" />
              <stop offset="70%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#00f0ff" />
            </linearGradient>

            {/* 👑 Divine God Aura */}
            <radialGradient id="mapGodAura" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>
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
            strokeDashoffset={
              isTraveling
                ? travelDirection === 'backward'
                  ? travelProgress * 96
                  : -travelProgress * 96
                : 0
            }
            opacity={isTraveling ? 0.6 : 0.3}
          />

          {/* 🌟 Speed wind streaks rushing past student (reverse stream when backward) */}
          {isTraveling && (
            <g opacity={Math.sin(travelProgress * Math.PI) * 0.6}>
              <line
                x1={travelDirection === 'backward' ? 360 + travelProgress * 20 : 380 - travelProgress * 30}
                y1={travelDirection === 'backward' ? 325 - travelProgress * 55 : 290 + travelProgress * 40}
                x2={travelDirection === 'backward' ? 375 + travelProgress * 20 : 360 - travelProgress * 30}
                y2={travelDirection === 'backward' ? 295 - travelProgress * 55 : 320 + travelProgress * 40}
                stroke={travelDirection === 'backward' ? '#93c5fd' : '#ffffff'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1={travelDirection === 'backward' ? 595 - travelProgress * 20 : 570 + travelProgress * 30}
                y1={travelDirection === 'backward' ? 320 - travelProgress * 55 : 285 + travelProgress * 40}
                x2={travelDirection === 'backward' ? 580 - travelProgress * 20 : 595 + travelProgress * 30}
                y2={travelDirection === 'backward' ? 290 - travelProgress * 55 : 315 + travelProgress * 40}
                stroke={travelDirection === 'backward' ? '#93c5fd' : '#ffffff'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* ─── TREES FLANKING PATH (optically drift in perspective based on travel direction) ─── */}
          {/* Left Trees Group */}
          <g
            style={{
              transform: isTraveling
                ? travelDirection === 'backward'
                  ? `translate(${travelProgress * 20}px, ${-travelProgress * 12}px)`
                  : `translate(${-travelProgress * 30}px, ${travelProgress * 18}px)`
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
                ? travelDirection === 'backward'
                  ? `translate(${-travelProgress * 20}px, ${-travelProgress * 12}px)`
                  : `translate(${travelProgress * 30}px, ${travelProgress * 18}px)`
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
            travelDirection === 'backward' ? (
              <>
                {/* ⏪ BACKWARD TRANSITION:
                     1. DEPARTING FLAG (fromIdx): We are walking backward AWAY from it.
                        So it recedes into the distance forward towards the horizon (540,216 -> 495,172)
                        shrinking in perspective from 1.0x to 0.6x and fading into the distance! */}
                {(() => {
                  const fromPal = getPalette(JOURNEY_TOPICS[travelFrom]?.levelColor || '#00e676');
                  const curX = 540 + (495 - 540) * travelProgress;
                  const curYBottom = 270 + (198 - 270) * travelProgress;
                  const curYTop = 216 + (172 - 216) * travelProgress;
                  const flagW = 24 + (15 - 24) * travelProgress;
                  const flagH = 20 + (10 - 20) * travelProgress;
                  const curOpacity = Math.max(0.2, 1 - travelProgress * 0.7);

                  return (
                    <g opacity={curOpacity}>
                      <line
                        x1={curX}
                        y1={curYBottom}
                        x2={curX}
                        y2={curYTop}
                        stroke="#8b6f47"
                        strokeWidth={3 - travelProgress * 1}
                        strokeLinecap="round"
                      />
                      <circle cx={curX} cy={curYTop - 2} r={3.5 - travelProgress * 1} fill={fromPal.primary} />
                      <path
                        d={`M ${curX} ${curYTop} L ${curX + flagW} ${curYTop + flagH * 0.4} L ${curX + flagW - 2} ${curYTop + flagH * 0.7} L ${curX} ${curYTop + flagH} Z`}
                        fill={fromPal.flag}
                        stroke={fromPal.primary}
                        strokeWidth="0.8"
                      />
                      <text
                        x={curX + flagW * 0.5}
                        y={curYTop + flagH * 0.65}
                        fill="#ffffff"
                        fontFamily="sans-serif"
                        fontSize={Math.max(5, 7 - travelProgress * 1.5)}
                        fontWeight="900"
                        textAnchor="middle"
                      >
                        {travelFrom + 1}
                      </text>
                    </g>
                  );
                })()}

                {/* 2. ARRIVING FLAG (toIdx): This station was behind us.
                     As we step backward, it rises from behind/foreground into its pedestal position beside the student! */}
                {(() => {
                  const destPal = getPalette(destinationTopic.levelColor);
                  const isCompleted = travelTo < targetIndex;
                  const curX = 565 + (540 - 565) * travelProgress;
                  const curYBottom = 335 + (270 - 335) * travelProgress;
                  const curYTop = 275 + (216 - 275) * travelProgress;
                  const flagW = 28 + (24 - 28) * travelProgress;
                  const flagH = 22 + (20 - 22) * travelProgress;
                  const curOpacity = Math.min(1, 0.2 + travelProgress * 1.2);

                  return (
                    <g filter={travelProgress > 0.6 ? 'url(#flagGlow)' : undefined} opacity={curOpacity}>
                      <line
                        x1={curX}
                        y1={curYBottom}
                        x2={curX}
                        y2={curYTop}
                        stroke="#b89a6a"
                        strokeWidth={3.5 - travelProgress * 0.5}
                        strokeLinecap="round"
                      />
                      <circle
                        cx={curX}
                        cy={curYTop - 2}
                        r="3.5"
                        fill={isCompleted ? '#94a3b8' : destPal.primary}
                      />
                      <path
                        d={`M ${curX} ${curYTop} L ${curX + flagW} ${curYTop + flagH * 0.4} L ${curX + flagW - 2} ${curYTop + flagH * 0.7} L ${curX} ${curYTop + flagH} Z`}
                        fill={isCompleted ? '#64748b' : destPal.flag}
                        stroke={isCompleted ? '#94a3b8' : destPal.primary}
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

                {/* 3. PREVIOUS EARLIER FLAG (travelTo - 1): emerges in the foreground behind */}
                {travelTo > 0 && (
                  <g opacity={travelProgress * 0.35}>
                    <line x1="445" y1="310" x2="445" y2="286" stroke="#8b6f47" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M 445 286 L 456 290 L 445 294 Z" fill="#9ca3af" />
                  </g>
                )}
              </>
            ) : (
              <>
                {/* ⏩ FORWARD TRANSITION:
                     1. DEPARTING FLAG (Station fromIdx): Slides down and past the student to the right */}
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

                {/* 2. ARRIVING FLAG (Station toIdx): Travels down the path from horizon to student */}
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

                {/* 3. UPCOMING HORIZON FLAG (Station toIdx + 1): Gradually emerges at horizon */}
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
            )
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
              🤖 GUIONBAJO — RETRO-FUTURISTIC AI ROBOT TUTOR
              • Canonical design from TutorAvatar:
                - Rounded rectangular robot head with 4 corner rivets
                - Vacuum bulb antenna on top with glowing neon filament
                - Side potentiometer ear dials with glowing cyan notches
                - Articulated mechanical arms (upper, joint, forearm, clamp)
                - Retro metal chassis torso with rounded base
                - Magnetic hover thruster with energetic plasma flame
              • Forward flight: tilts forward, plasma thruster blasts intensely
              • Backward travel:
                1) Gives a 180° media vuelta to face us (scaleX: 1 -> 0 -> -1)
                2) Front view is revealed: glowing cyan eyes, terminal mouth '_', CRT screen!
                3) Thrusters blast pushing him backward down the trail!
                4) Gives a second 180° media vuelta back to settle facing the path!
             ══════════════════════════════════════════════════════════════ */}
          {(() => {
            const p = travelProgress; // 0..1 eased
            const isFlying = isTraveling;

            // ── 180° Media Vuelta (Turn) Kinematics ────────────────────────
            // When moving backward, Guionbajo spins 180° to face us, flies in reverse,
            // then spins 180° back to land facing forward.
            let flipScaleX = 1;
            let showFront = false;

            if (isFlying && travelDirection === 'backward') {
              // Spin 1: p from 0 to 0.18
              // Mid-flight: p from 0.18 to 0.82 (fully facing camera)
              // Spin 2: p from 0.82 to 1.0
              if (p < 0.18) {
                const spin1 = p / 0.18; // 0 to 1
                const rotCos = Math.cos(spin1 * Math.PI);
                flipScaleX = Math.abs(rotCos);
                showFront = rotCos < 0;
              } else if (p <= 0.82) {
                flipScaleX = 1;
                showFront = true;
              } else {
                const spin2 = (p - 0.82) / 0.18; // 0 to 1
                const rotCos = Math.cos(spin2 * Math.PI);
                flipScaleX = Math.abs(rotCos);
                showFront = rotCos > 0;
              }
            }

            // ── Flame intensity (sinusoidal peak at mid-flight) ──────────
            const flameIntensity = isFlying ? Math.sin(p * Math.PI) : 0.15;
            const isMegaFlame = avatarUpgradeStage >= 2;
            const flameLen = (12 + flameIntensity * 44) * (isMegaFlame ? 1.45 : 1.0);    // Mega flames for Stage >= 2
            const flameW = (8 + flameIntensity * 7) * (isMegaFlame ? 1.4 : 1.0);        // Mega flames for Stage >= 2
            const flameCoreLen = flameLen * 0.6;
            const flameOpacity = 0.5 + flameIntensity * 0.5;
            const shimmer = Math.sin(p * Math.PI * 13) * 2;

            // ── Tilt angle ───────────────────────────────────────────────
            // Tilts forward when advancing, tilts slightly into flight direction when reversing
            const tiltAngle = isFlying
              ? travelDirection === 'forward'
                ? Math.sin(p * Math.PI) * -11
                : Math.sin(p * Math.PI) * 7
              : 0;

            // ── Hover Bob ────────────────────────────────────────────────
            const hoverY = isFlying
              ? Math.sin(p * Math.PI * 5) * 2
              : 0;

            // Ground glow dimensions
            const groundGlowR = (16 + flameIntensity * 26) * (isMegaFlame ? 1.35 : 1.0);

            return (
              <g
                style={{
                  transform: `translateY(${hoverY}px) rotate(${tiltAngle}deg) scaleX(${Math.max(0.05, flipScaleX)})`,
                  transformOrigin: '475px 285px',
                  transition: 'none',
                }}
              >
                {/* ── STAGE 8: AURA DIVINA DE MAESTRO ───────────────────── */}
                {avatarUpgradeStage >= 8 && (
                  <ellipse
                    cx="475"
                    cy="265"
                    rx="55"
                    ry="65"
                    fill="url(#mapGodAura)"
                    opacity="0.45"
                    filter="url(#softGlow)"
                  />
                )}

                {/* ── STAGE 6: ESPADAS GEMELAS CYBER EN LA ESPALDA ──────── */}
                {avatarUpgradeStage >= 6 && (
                  <g>
                    {/* Espada izquierda (-30°) */}
                    <g transform="rotate(-30 460 280)">
                      <rect x="458" y="215" width="4.5" height="52" rx="2" fill="url(#mapSwordGrad)" stroke="#e9d5ff" strokeWidth="0.8" filter="url(#cyanGlow)" />
                      <rect x="453" y="267" width="14" height="3.5" rx="1" fill="#475569" stroke="#cbd5e1" strokeWidth="0.8" />
                      <rect x="458.5" y="270.5" width="3" height="11" rx="1" fill="#1e293b" />
                      <circle cx="460" cy="282" r="2.2" fill="#a855f7" />
                    </g>
                    {/* Espada derecha (+30°) */}
                    <g transform="rotate(30 490 280)">
                      <rect x="487.5" y="215" width="4.5" height="52" rx="2" fill="url(#mapSwordGrad)" stroke="#e9d5ff" strokeWidth="0.8" filter="url(#cyanGlow)" />
                      <rect x="483" y="267" width="14" height="3.5" rx="1" fill="#475569" stroke="#cbd5e1" strokeWidth="0.8" />
                      <rect x="488.5" y="270.5" width="3" height="11" rx="1" fill="#1e293b" />
                      <circle cx="490" cy="282" r="2.2" fill="#a855f7" />
                    </g>
                  </g>
                )}

                {/* ── STAGE 2: JETPACK DORSAL DOBLE TOBERA (ESPALDA Y LATERALES) ── */}
                {avatarUpgradeStage >= 2 && (
                  <g>
                    {!showFront ? (
                      /* ESPALDA: Canisters metálicos montados directamente sobre el chasis trasero */
                      <>
                        {/* Canister izquierdo */}
                        <rect x="453" y="274" width="11" height="28" rx="3" fill="url(#antennaStemGrad)" stroke="#64748b" strokeWidth="1.2" />
                        <line x1="453" y1="282" x2="464" y2="282" stroke="#f59e0b" strokeWidth="1.5" />
                        <rect x="454.5" y="302" width="8" height="4" rx="1" fill="#334155" stroke="#64748b" strokeWidth="0.8" />
                        {/* Llama de plasma lateral izquierda */}
                        <ellipse cx="458.5" cy={310 + flameIntensity * 12} rx={3.5 + flameIntensity * 2} ry={6 + flameIntensity * 14} fill="url(#plasmaFlameOuter)" opacity={flameOpacity} filter="url(#cyanGlow)" />

                        {/* Canister derecho */}
                        <rect x="486" y="274" width="11" height="28" rx="3" fill="url(#antennaStemGrad)" stroke="#64748b" strokeWidth="1.2" />
                        <line x1="486" y1="282" x2="497" y2="282" stroke="#f59e0b" strokeWidth="1.5" />
                        <rect x="487.5" y="302" width="8" height="4" rx="1" fill="#334155" stroke="#64748b" strokeWidth="0.8" />
                        {/* Llama de plasma lateral derecha */}
                        <ellipse cx="491.5" cy={310 + flameIntensity * 12} rx={3.5 + flameIntensity * 2} ry={6 + flameIntensity * 14} fill="url(#plasmaFlameOuter)" opacity={flameOpacity} filter="url(#cyanGlow)" />
                      </>
                    ) : (
                      /* FRENTE: Canisters sobresaliendo detrás de los flancos del torso */
                      <>
                        <rect x="443" y="276" width="8" height="24" rx="2.5" fill="url(#antennaStemGrad)" stroke="#64748b" strokeWidth="1" />
                        <line x1="443" y1="284" x2="451" y2="284" stroke="#f59e0b" strokeWidth="1.5" />
                        <ellipse cx="447" cy={308 + flameIntensity * 10} rx="3" ry={5 + flameIntensity * 10} fill="url(#plasmaFlameOuter)" opacity={flameOpacity} filter="url(#cyanGlow)" />

                        <rect x="499" y="276" width="8" height="24" rx="2.5" fill="url(#antennaStemGrad)" stroke="#64748b" strokeWidth="1" />
                        <line x1="499" y1="284" x2="507" y2="284" stroke="#f59e0b" strokeWidth="1.5" />
                        <ellipse cx="503" cy={308 + flameIntensity * 10} rx="3" ry={5 + flameIntensity * 10} fill="url(#plasmaFlameOuter)" opacity={flameOpacity} filter="url(#cyanGlow)" />
                      </>
                    )}
                  </g>
                )}

                {/* ── Ground shadow & plasma light bloom ────────────────── */}
                <ellipse
                  cx="475"
                  cy="330"
                  rx={isFlying ? 15 - flameIntensity * 6 : 18}
                  ry={isFlying ? 3.5 - flameIntensity * 1.5 : 5}
                  fill="#07150a"
                  opacity={isFlying ? 0.25 : 0.4}
                />
                <ellipse
                  cx="475"
                  cy="330"
                  rx={groundGlowR}
                  ry={groundGlowR * 0.28}
                  fill="url(#groundPlasmaGlow)"
                  opacity={flameIntensity * 0.85}
                />

                {/* ── MAGNETIC HOVER THRUSTER (Base del cuerpo) ─────────── */}
                {/* Pluma de llama de plasma inferior */}
                <path
                  d={`M ${475 - flameW} 314
                      Q ${475 - flameW * 0.4 + shimmer} ${314 + flameLen * 0.55}
                        475 ${314 + flameLen}
                      Q ${475 + flameW * 0.4 + shimmer} ${314 + flameLen * 0.55}
                        ${475 + flameW} 314 Z`}
                  fill="url(#plasmaFlameOuter)"
                  opacity={flameOpacity}
                  filter="url(#cyanGlow)"
                />
                <path
                  d={`M ${475 - flameW * 0.55} 314
                      Q 475 ${314 + flameCoreLen * 0.55}
                        475 ${314 + flameCoreLen}
                      Q 475 ${314 + flameCoreLen * 0.55}
                        ${475 + flameW * 0.55} 314 Z`}
                  fill="url(#plasmaFlameCore)"
                  opacity={0.95}
                />

                {/* Tobera metálica de propulsión */}
                <rect
                  x="464"
                  y="310"
                  width="22"
                  height="5"
                  rx="2"
                  fill="url(#antennaStemGrad)"
                  stroke="#334155"
                  strokeWidth="1"
                />
                <rect
                  x="467"
                  y="313"
                  width="16"
                  height="2"
                  rx="1"
                  fill="#0a0e17"
                />
                <rect
                  x="467"
                  y="313"
                  width="16"
                  height="2"
                  rx="1"
                  fill="#00D4FF"
                  opacity={0.7 + flameIntensity * 0.3}
                  filter="url(#cyanGlow)"
                />

                {/* ── STAGE 1: BRAZOS MECÁNICOS ARTICULADOS ────────────── */}
                {/* Left arm */}
                <path
                  d={isFlying
                    ? `M 451 282 Q 440 ${288 - flameIntensity * 6}, 438 ${300 - flameIntensity * 8}`
                    : 'M 451 282 Q 441 292, 439 304'}
                  fill="none"
                  stroke={avatarUpgradeStage >= 1 ? '#94a3b8' : '#475569'}
                  strokeWidth={avatarUpgradeStage >= 1 ? 7 : 5}
                  strokeLinecap="round"
                />
                <circle
                  cx={isFlying ? 438 : 439}
                  cy={isFlying ? 300 - flameIntensity * 8 : 304}
                  r={avatarUpgradeStage >= 1 ? 4.5 : 3.5}
                  fill="#334155"
                  stroke={avatarUpgradeStage >= 1 ? '#00D4FF' : '#64748b'}
                  strokeWidth={avatarUpgradeStage >= 1 ? 1.5 : 1}
                />
                {/* Left forearm & pincer clamp */}
                <path
                  d={isFlying
                    ? `M 438 ${300 - flameIntensity * 8} L 441 ${309 - flameIntensity * 8}`
                    : 'M 439 304 L 443 315'}
                  fill="none"
                  stroke={avatarUpgradeStage >= 1 ? '#cbd5e1' : '#334155'}
                  strokeWidth={avatarUpgradeStage >= 1 ? 5.5 : 4}
                  strokeLinecap="round"
                />
                <circle
                  cx={isFlying ? 441 : 443}
                  cy={isFlying ? 310 - flameIntensity * 8 : 316}
                  r={avatarUpgradeStage >= 1 ? 3.5 : 2.8}
                  fill={avatarUpgradeStage >= 1 ? '#00D4FF' : '#64748b'}
                  filter={avatarUpgradeStage >= 1 ? 'url(#cyanGlow)' : undefined}
                />

                {/* Right arm */}
                <path
                  d={isFlying
                    ? `M 499 282 Q 510 ${288 - flameIntensity * 6}, 512 ${300 - flameIntensity * 8}`
                    : 'M 499 282 Q 509 292, 511 304'}
                  fill="none"
                  stroke={avatarUpgradeStage >= 1 ? '#94a3b8' : '#475569'}
                  strokeWidth={avatarUpgradeStage >= 1 ? 7 : 5}
                  strokeLinecap="round"
                />
                <circle
                  cx={isFlying ? 512 : 511}
                  cy={isFlying ? 300 - flameIntensity * 8 : 304}
                  r={avatarUpgradeStage >= 1 ? 4.5 : 3.5}
                  fill="#334155"
                  stroke={avatarUpgradeStage >= 1 ? '#00D4FF' : '#64748b'}
                  strokeWidth={avatarUpgradeStage >= 1 ? 1.5 : 1}
                />
                {/* Right forearm & pincer clamp */}
                <path
                  d={isFlying
                    ? `M 512 ${300 - flameIntensity * 8} L 509 ${309 - flameIntensity * 8}`
                    : 'M 511 304 L 507 315'}
                  fill="none"
                  stroke={avatarUpgradeStage >= 1 ? '#cbd5e1' : '#334155'}
                  strokeWidth={avatarUpgradeStage >= 1 ? 5.5 : 4}
                  strokeLinecap="round"
                />
                <circle
                  cx={isFlying ? 509 : 507}
                  cy={isFlying ? 310 - flameIntensity * 8 : 316}
                  r={avatarUpgradeStage >= 1 ? 3.5 : 2.8}
                  fill={avatarUpgradeStage >= 1 ? '#00D4FF' : '#64748b'}
                  filter={avatarUpgradeStage >= 1 ? 'url(#cyanGlow)' : undefined}
                />

                {/* ── ROBOT TORSO / BODY ─────────────────────────────────── */}
                <rect
                  x="451"
                  y="278"
                  width="48"
                  height="32"
                  rx="10"
                  fill="url(#robotChassis)"
                  stroke={avatarUpgradeStage >= 4 ? 'url(#mapGoldChassis)' : '#4b5563'}
                  strokeWidth={avatarUpgradeStage >= 4 ? 2.5 : 1.8}
                />

                {/* STAGE 4: Hombreras de Oro Blindadas */}
                {avatarUpgradeStage >= 4 && (
                  <g>
                    <path d="M 444 282 L 452 277 L 452 291 Z" fill="url(#mapGoldChassis)" stroke="#fef08a" strokeWidth="1" />
                    <path d="M 506 282 L 498 277 L 498 291 Z" fill="url(#mapGoldChassis)" stroke="#fef08a" strokeWidth="1" />
                    <rect x="458" y="278" width="34" height="4" rx="2" fill="url(#mapGoldChassis)" stroke="#fef08a" strokeWidth="0.8" />
                  </g>
                )}

                {showFront ? (
                  /* ─── TORSO FRONT: CRT MONITOR & SCANLINES ─── */
                  <>
                    <rect
                      x="457"
                      y="282"
                      width="36"
                      height="22"
                      rx="5"
                      fill="#020617"
                      stroke={avatarUpgradeStage >= 4 ? '#fef08a' : '#334155'}
                      strokeWidth="1.2"
                      filter="url(#softGlow)"
                    />
                    {/* Horizontal CRT scanlines */}
                    <line x1="459" y1="286" x2="491" y2="286" stroke="rgba(0,212,255,0.25)" strokeWidth="0.8" />
                    <line x1="459" y1="290" x2="491" y2="290" stroke="rgba(0,212,255,0.25)" strokeWidth="0.8" />
                    <line x1="459" y1="294" x2="491" y2="294" stroke="rgba(0,212,255,0.25)" strokeWidth="0.8" />
                    <line x1="459" y1="298" x2="491" y2="298" stroke="rgba(0,212,255,0.25)" strokeWidth="0.8" />
                    {/* Glowing CRT Screen Content: Guionbajo Underscore Terminal Symbol */}
                    <text
                      x="475"
                      y="297"
                      textAnchor="middle"
                      fill="#00D4FF"
                      fontFamily="monospace"
                      fontSize="10"
                      fontWeight="900"
                      filter="url(#cyanGlow)"
                    >
                      _
                    </text>
                  </>
                ) : (
                  /* ─── TORSO BACK: REAR CHASSIS & POWER COUPLING ─── */
                  <>
                    {/* Central power conduit spine */}
                    <rect
                      x="469"
                      y="278"
                      width="12"
                      height="28"
                      rx="3"
                      fill="#0f172a"
                      stroke={avatarUpgradeStage >= 4 ? '#f59e0b' : '#334155'}
                      strokeWidth="0.8"
                    />
                    <line x1="471" y1="283" x2="479" y2="283" stroke="#00D4FF" strokeWidth="1" opacity="0.8" />
                    <line x1="471" y1="288" x2="479" y2="288" stroke="#00D4FF" strokeWidth="1" opacity="0.8" />
                    {/* Underscore illuminated insignia on back */}
                    <rect
                      x="472"
                      y="295"
                      width="6"
                      height="2"
                      rx="1"
                      fill="#00D4FF"
                      filter="url(#cyanGlow)"
                    />
                    {/* Lateral ventilation / heat exhaust grilles */}
                    <rect x="456" y="283" width="9" height="17" rx="2" fill="#111827" stroke="#334155" strokeWidth="0.8" />
                    <line x1="458" y1="287" x2="463" y2="287" stroke="#334155" strokeWidth="1" />
                    <line x1="458" y1="291" x2="463" y2="291" stroke="#334155" strokeWidth="1" />
                    <line x1="458" y1="295" x2="463" y2="295" stroke="#334155" strokeWidth="1" />

                    <rect x="485" y="283" width="9" height="17" rx="2" fill="#111827" stroke="#334155" strokeWidth="0.8" />
                    <line x1="487" y1="287" x2="492" y2="287" stroke="#334155" strokeWidth="1" />
                    <line x1="487" y1="291" x2="492" y2="291" stroke="#334155" strokeWidth="1" />
                    <line x1="487" y1="295" x2="492" y2="295" stroke="#334155" strokeWidth="1" />
                  </>
                )}

                {/* ── MECHANICAL NECK ───────────────────────────────────── */}
                <rect
                  x="470"
                  y="272"
                  width="10"
                  height="7"
                  rx="2"
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth="0.8"
                />

                {/* ── LATERAL EAR DIALS (Potenciómetros con notch cyan) ─── */}
                <rect
                  x="438"
                  y="241"
                  width="7"
                  height="18"
                  rx="2"
                  fill="url(#earDialGrad)"
                  stroke="#475569"
                  strokeWidth="0.8"
                />
                <rect
                  x="439"
                  y="249"
                  width="3.5"
                  height="2"
                  rx="1"
                  fill="#00D4FF"
                  filter="url(#cyanGlow)"
                />

                <rect
                  x="505"
                  y="241"
                  width="7"
                  height="18"
                  rx="2"
                  fill="url(#earDialGrad)"
                  stroke="#475569"
                  strokeWidth="0.8"
                />
                <rect
                  x="507.5"
                  y="249"
                  width="3.5"
                  height="2"
                  rx="1"
                  fill="#00D4FF"
                  filter="url(#cyanGlow)"
                />

                {/* ── ROBOT HEAD (Carcasa con remaches) ────────────────── */}
                <rect
                  x="445"
                  y="226"
                  width="60"
                  height="48"
                  rx="12"
                  fill="url(#robotChassis)"
                  stroke={avatarUpgradeStage >= 4 ? 'url(#mapGoldChassis)' : '#4b5563'}
                  strokeWidth={avatarUpgradeStage >= 4 ? 2.5 : 2}
                />

                {/* STAGE 4: Placa de oro en la frente / cejas */}
                {avatarUpgradeStage >= 4 && (
                  <rect
                    x="447"
                    y="227"
                    width="56"
                    height="5"
                    rx="2.5"
                    fill="url(#mapGoldChassis)"
                    stroke="#fef08a"
                    strokeWidth="0.8"
                  />
                )}

                {/* 4 Corner Rivets */}
                <circle cx="451" cy="232" r="1.8" fill={avatarUpgradeStage >= 4 ? '#fef08a' : '#788a9e'} stroke="#334155" strokeWidth="0.6" />
                <circle cx="499" cy="232" r="1.8" fill={avatarUpgradeStage >= 4 ? '#fef08a' : '#788a9e'} stroke="#334155" strokeWidth="0.6" />
                <circle cx="451" cy="268" r="1.8" fill={avatarUpgradeStage >= 4 ? '#fef08a' : '#788a9e'} stroke="#334155" strokeWidth="0.6" />
                <circle cx="499" cy="268" r="1.8" fill={avatarUpgradeStage >= 4 ? '#fef08a' : '#788a9e'} stroke="#334155" strokeWidth="0.6" />

                {showFront ? (
                  /* ─── HEAD FRONT: OJOS & VISOR HUD (STAGE 3) ─── */
                  <>
                    {/* Left Eye Socket */}
                    <circle
                      cx="463"
                      cy="245"
                      r="8.5"
                      fill="#090d14"
                      stroke="#334155"
                      strokeWidth="1.5"
                    />
                    {/* Neon Pupil (Rojo táctico en Stage >= 3, Cian antes) */}
                    <circle
                      cx="463"
                      cy="245"
                      r="4.5"
                      fill={avatarUpgradeStage >= 3 ? '#ef4444' : '#00D4FF'}
                      filter="url(#cyanGlow)"
                    />
                    {/* Eye Glint */}
                    <circle cx="461.5" cy="243.5" r="1.2" fill="#ffffff" />
                    {/* Mechanical eyelid shutter line */}
                    <line x1="455" y1="239" x2="471" y2="239" stroke="#475569" strokeWidth="1.2" />

                    {/* Right Eye Socket */}
                    <circle
                      cx="487"
                      cy="245"
                      r="8.5"
                      fill="#090d14"
                      stroke="#334155"
                      strokeWidth="1.5"
                    />
                    {/* Neon Pupil (Rojo táctico en Stage >= 3, Cian antes) */}
                    <circle
                      cx="487"
                      cy="245"
                      r="4.5"
                      fill={avatarUpgradeStage >= 3 ? '#ef4444' : '#00D4FF'}
                      filter="url(#cyanGlow)"
                    />
                    {/* Eye Glint */}
                    <circle cx="485.5" cy="243.5" r="1.2" fill="#ffffff" />
                    {/* Mechanical eyelid shutter line */}
                    <line x1="479" y1="239" x2="495" y2="239" stroke="#475569" strokeWidth="1.2" />

                    {/* STAGE 3: Visor Holográfico Frontal Neón Cian */}
                    {avatarUpgradeStage >= 3 && (
                      <g>
                        <rect
                          x="452"
                          y="234"
                          width="46"
                          height="22"
                          rx="5"
                          fill="rgba(0, 229, 255, 0.42)"
                          stroke="#00f0ff"
                          strokeWidth="1.6"
                          filter="url(#cyanGlow)"
                        />
                        <line x1="454" y1="245" x2="496" y2="245" stroke="#ffffff" strokeWidth="0.9" opacity="0.75" />
                      </g>
                    )}

                    {/* Mouth Frame with Terminal Cursor '_' */}
                    <rect
                      x="457"
                      y="260"
                      width="36"
                      height="8"
                      rx="3"
                      fill="#090d14"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    <text
                      x="475"
                      y="267"
                      textAnchor="middle"
                      fill="#00D4FF"
                      fontFamily="monospace"
                      fontSize="11"
                      fontWeight="900"
                      filter="url(#cyanGlow)"
                    >
                      _
                    </text>
                  </>
                ) : (
                  /* ─── HEAD BACK: MAINTENANCE HATCH & VISOR CORREA TRASERA (STAGE 3) ─── */
                  <>
                    <rect
                      x="454"
                      y="235"
                      width="42"
                      height="30"
                      rx="6"
                      fill="#141c2b"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    {/* Horizontal cooling fins */}
                    <line x1="459" y1="243" x2="491" y2="243" stroke="#26354a" strokeWidth="2" strokeLinecap="round" />
                    <line x1="459" y1="250" x2="491" y2="250" stroke="#26354a" strokeWidth="2" strokeLinecap="round" />
                    <line x1="459" y1="257" x2="491" y2="257" stroke="#26354a" strokeWidth="2" strokeLinecap="round" />
                    {/* Central cyan power/status diode */}
                    <circle cx="475" cy="250" r="2.5" fill="#00D4FF" filter="url(#cyanGlow)" />

                    {/* STAGE 3: Correa cibernética del visor envolviendo la espalda de la cabeza */}
                    {avatarUpgradeStage >= 3 && (
                      <g>
                        <rect
                          x="444"
                          y="242"
                          width="62"
                          height="6"
                          rx="2"
                          fill="#0b1329"
                          stroke="#00f0ff"
                          strokeWidth="1.4"
                          opacity="0.95"
                          filter="url(#cyanGlow)"
                        />
                        <line x1="448" y1="245" x2="502" y2="245" stroke="#00f0ff" strokeWidth="1.4" strokeDasharray="4 2" />
                      </g>
                    )}
                  </>
                )}

                {/* ── STAGE 5: BOBINA DE TESLA (O ANTENA EN STAGE < 5) ──── */}
                {avatarUpgradeStage >= 5 ? (
                  <g>
                    <rect x="473.5" y="210" width="3" height="16" rx="1.5" fill="url(#antennaStemGrad)" />
                    {/* Anillos de bobina de Tesla cuántica */}
                    <ellipse cx="475" cy="208" rx="10" ry="3" fill="none" stroke="#00D4FF" strokeWidth="1.8" filter="url(#cyanGlow)" />
                    <ellipse cx="475" cy="202" rx="7.5" ry="2.3" fill="none" stroke="#00D4FF" strokeWidth="1.8" filter="url(#cyanGlow)" />
                    <ellipse cx="475" cy="196" rx="5" ry="1.6" fill="none" stroke="#00D4FF" strokeWidth="1.8" filter="url(#cyanGlow)" />
                    <circle cx="475" cy="190" r="3.2" fill="#ffffff" stroke="#00D4FF" strokeWidth="1.2" filter="url(#cyanGlow)" />
                    {/* Rayos eléctricos dinámicos oscilantes */}
                    <path d="M 464 205 L 460 199 L 466 196 L 463 190" stroke="#fef08a" strokeWidth="1.6" fill="none" strokeLinecap="round">
                      <animate attributeName="opacity" values="0.2;1;0.3;1;0.2" dur="0.25s" repeatCount="indefinite" />
                    </path>
                    <path d="M 486 205 L 490 199 L 484 196 L 487 190" stroke="#fef08a" strokeWidth="1.6" fill="none" strokeLinecap="round">
                      <animate attributeName="opacity" values="1;0.2;1;0.4;1" dur="0.3s" repeatCount="indefinite" />
                    </path>
                  </g>
                ) : (
                  <g>
                    <rect
                      x="473.5"
                      y="210"
                      width="3"
                      height="16"
                      rx="1.5"
                      fill="url(#antennaStemGrad)"
                    />
                    {/* Glowing Vacuum Bulb */}
                    <circle
                      cx="475"
                      cy="203"
                      r="7.5"
                      fill="url(#vacuumBulbGrad)"
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth="1.2"
                    />
                    {/* Glowing bulb bloom */}
                    <circle
                      cx="475"
                      cy="203"
                      r="11"
                      fill="#00D4FF"
                      opacity={0.35 + flameIntensity * 0.25}
                      filter="url(#cyanGlow)"
                    />
                    {/* Bulb Filament */}
                    <path
                      d="M 473 205 C 473 200, 477 200, 477 205"
                      fill="none"
                      stroke="#00D4FF"
                      strokeWidth="1.2"
                    />
                  </g>
                )}

                {/* ── STAGE 7: MINI-DRON ORBITAL "GUIONCITO" (EJE X HORIZONTAL CON LUZ ROJA) ── */}
                {avatarUpgradeStage >= 7 && (
                  <g>
                    {/* Chasis elíptico del mini-dron orbitando lateralmente */}
                    <ellipse cx={475 + 46} cy="265" rx="7.5" ry="4.5" fill="#1e293b" stroke="#00D4FF" strokeWidth="1.2" filter="url(#cyanGlow)">
                      <animate attributeName="cx" values="521;527;521" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="cy" values="263;267;263" dur="1.6s" repeatCount="indefinite" />
                    </ellipse>
                    <ellipse cx={475 + 46} cy="266.5" rx="5" ry="2" fill="none" stroke="#00D4FF" strokeWidth="0.8">
                      <animate attributeName="cx" values="521;527;521" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="cy" values="264.5;268.5;264.5" dur="1.6s" repeatCount="indefinite" />
                    </ellipse>
                    {/* Bombillo rojo intermitente (estroboscópico) */}
                    <circle cx={475 + 46} cy="261" r="2.2" fill="#ef4444" filter="url(#cyanGlow)">
                      <animate attributeName="cx" values="521;527;521" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="cy" values="259;263;259" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.1;1" dur="0.75s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}

                {/* ── STAGE 8: CORONA IMPERIAL DE MAESTRO ───────────────── */}
                {avatarUpgradeStage >= 8 && (
                  <g>
                    <path
                      d="M 461 187 L 464 175 L 470 182 L 475 171 L 480 182 L 486 175 L 489 187 Z"
                      fill="url(#mapGoldChassis)"
                      stroke="#fef08a"
                      strokeWidth="1.2"
                    />
                    {/* Gemas preciosas */}
                    <circle cx="464" cy="177" r="1.5" fill="#ef4444" />
                    <circle cx="475" cy="173" r="1.8" fill="#3b82f6" />
                    <circle cx="486" cy="177" r="1.5" fill="#10b981" />
                  </g>
                )}
              </g>
            );
          })()}
        </svg>

        {/* High-Precision Touch / Click Overlays for Left & Right Navigation */}
        <button
          onClick={handleNavigatePrev}
          disabled={currentIndex === 0 || isTraveling}
          aria-label="Retroceder clase"
          className={`absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all duration-200 border shadow-xl group ${
            currentIndex === 0 || isTraveling
              ? 'opacity-20 cursor-not-allowed bg-black/40 border-white/10 text-white/30 pointer-events-none'
              : 'opacity-85 hover:opacity-100 bg-black/65 hover:bg-black/90 border-white/25 hover:border-brand-cyan text-white hover:text-brand-cyan active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(0,0,0,0.6)]'
          }`}
          title={currentIndex > 0 ? `Retroceder a Clase ${currentIndex}` : 'Primera clase'}
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6 transition-transform group-hover:-translate-x-0.5" />
        </button>

        <button
          onClick={handleNavigateNext}
          disabled={currentIndex >= 63 || isTraveling}
          aria-label="Avanzar clase"
          className={`absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all duration-200 border shadow-xl group ${
            currentIndex >= 63 || isTraveling
              ? 'opacity-20 cursor-not-allowed bg-black/40 border-white/10 text-white/30 pointer-events-none'
              : 'opacity-85 hover:opacity-100 bg-black/65 hover:bg-black/90 border-white/25 hover:border-brand-cyan text-white hover:text-brand-cyan active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(0,0,0,0.6)]'
          }`}
          title={currentIndex < 63 ? `Avanzar a Clase ${currentIndex + 2}` : 'Última clase'}
        >
          <ChevronRight size={20} className="sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* ─── FLOATING STATION BADGE ─── */}
        <div className="absolute top-3 left-0 right-0 z-10 pointer-events-none flex flex-col items-center px-4">
          <div
            className="px-4 sm:px-6 py-2 rounded-2xl border backdrop-blur-md transition-all duration-500 text-center max-w-[92%] sm:max-w-lg shadow-2xl pointer-events-auto"
            style={{
              backgroundColor: 'rgba(10, 20, 14, 0.85)',
              borderColor: isTraveling
                ? `${getPalette(destinationTopic.levelColor).primary}66`
                : currentIndex < targetIndex
                ? '#94a3b888'
                : `${palette.primary}44`,
              boxShadow: `0 0 30px ${
                isTraveling
                  ? getPalette(destinationTopic.levelColor).primary
                  : currentIndex < targetIndex
                  ? '#94a3b822'
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
                  : currentIndex < targetIndex
                  ? '#cbd5e1'
                  : palette.primary,
              }}
            >
              {isTraveling
                ? `${travelDirection === 'backward' ? 'RETROCEDIENDO' : 'AVANZANDO'} A CLASE ${destinationTopic.classNum} • NIVEL ${destinationTopic.level}...`
                : currentIndex < targetIndex
                ? `NIVEL ${currentTopic.level} • ${currentTopic.module} — CLASE ${currentTopic.classNum} (COMPLETADA)`
                : `NIVEL ${currentTopic.level} • ${currentTopic.module} — CLASE ${currentTopic.classNum}`}
            </div>
            <div className="text-sm sm:text-base md:text-lg font-outfit font-black text-white tracking-wide leading-tight transition-opacity duration-300">
              {isTraveling ? destinationTopic.title.toUpperCase() : currentTopic.title.toUpperCase()}
            </div>
            {currentIndex < targetIndex && !isTraveling && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full bg-slate-800/80 border border-slate-600/70 text-slate-300 text-[10px] font-bold tracking-wider uppercase">
                <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                <span>Clase Aprobada • Puedes repetirla para mejorar tu nota</span>
              </div>
            )}
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
              const isCompleted = idx < targetIndex;
              // Las clases terminadas correctamente se marcan en gris (#94a3b8)
              const dotColor = isCompleted
                ? '#94a3b8'
                : t.levelColor === '#00e676'
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
                  r={isCompleted ? 2.5 : 1.5}
                  fill={dotColor}
                  stroke={isCompleted ? '#64748b' : 'none'}
                  strokeWidth={isCompleted ? 0.8 : 0}
                  opacity={isCompleted ? 0.95 : 0.25}
                  className="cursor-pointer transition-all hover:scale-150"
                  onClick={() => {
                    if (!isTraveling && idx !== currentIndex) {
                      triggerAdvance(currentIndex, idx);
                    }
                  }}
                >
                  <title>{`Clase ${idx + 1}: ${t.title} (${isCompleted ? 'Completada - Clic para ver y repetir' : 'Nivel ' + t.level})`}</title>
                </circle>
              );
            })}

            {/* 📍 Active beacon — smoothly glides during travel! */}
            <g id="activeRadarBeacon">
              <circle
                cx={beaconPoint.x}
                cy={beaconPoint.y}
                r="14"
                fill={currentIndex < targetIndex ? '#94a3b8' : palette.primary}
                fillOpacity="0.2"
                stroke={currentIndex < targetIndex ? '#94a3b8' : palette.primary}
                strokeWidth="1.5"
                className="animate-ping"
              />
              <circle
                cx={beaconPoint.x}
                cy={beaconPoint.y}
                r="4.5"
                fill="#ffffff"
                stroke={currentIndex < targetIndex ? '#64748b' : palette.primary}
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
                fill={currentIndex < targetIndex ? '#64748b' : palette.flag}
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
                {currentIndex < targetIndex ? `CLASE ${currentIndex + 1} (COMPLETADA)` : `TEMA ${currentIndex + 1}`}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* ==================== CTA FOOTER ==================== */}
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 min-h-[68px] sm:min-h-[76px] bg-gradient-to-r from-brand-surface/95 via-[#0e1224]/95 to-brand-surface/95 border-t border-brand-border/80 flex items-center justify-between gap-2.5 sm:gap-4 relative overflow-visible z-20 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          {/* Avatar container with generous vertical breathing room without clipping */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0 relative overflow-visible">
            <div className="absolute inset-0 bg-brand-cyan/10 rounded-2xl blur-sm -z-10" />
            <TutorAvatar
              size="sm"
              emotion={currentIndex < targetIndex ? 'victory' : activeCheckpoint ? 'victory' : 'happy'}
              upgradeStage={avatarUpgradeStage}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white font-outfit tracking-wide whitespace-nowrap">
                {currentTopic.level} • Clase {currentTopic.classNum}
              </span>
              {currentIndex < targetIndex ? (
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-600 text-slate-300 truncate max-w-[120px] sm:max-w-none">
                  Completada
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-cyan truncate max-w-[120px] sm:max-w-none">
                  {currentTopic.title || 'Misión Actual'}
                </span>
              )}
            </div>
            <div className="text-[11px] sm:text-xs truncate">
              {currentIndex < targetIndex ? (
                <span className="flex items-center gap-1.5 text-slate-300 font-medium truncate">
                  <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                  <span className="truncate">Clase completada • Repite para mejorar nota</span>
                </span>
              ) : activeCheckpoint ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399] flex-shrink-0" />
                  <span className="truncate">Progreso guardado listo</span>
                </span>
              ) : (
                <span className="text-brand-text-muted truncate block">
                  5 min • Lección interactiva con IA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sleek, Compact & Responsive CTA Button */}
        <button
          onClick={() => onLaunchClass(currentTopic.module, currentTopic.classNum)}
          className={`group relative px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl text-white font-bold text-xs sm:text-sm tracking-wide transition-all duration-200 flex items-center gap-1.5 sm:gap-2 active:scale-[0.97] cursor-pointer flex-shrink-0 border overflow-hidden ${
            currentIndex < targetIndex
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-cyan hover:from-emerald-500 hover:to-cyan-400 border-emerald-400/30 shadow-[0_2px_15px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_20px_rgba(0,212,255,0.45)]'
              : 'bg-gradient-to-r from-brand-accent via-[#6366f1] to-brand-cyan hover:from-brand-accent/90 hover:to-cyan-400 border-white/20 shadow-[0_2px_15px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_20px_rgba(0,212,255,0.45)]'
          }`}
        >
          {/* Subtle Shimmer light sweep on hover */}
          <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 ease-out pointer-events-none" />

          {currentIndex < targetIndex ? (
            <>
              <RotateCcw size={13} className="text-white flex-shrink-0 group-hover:-rotate-45 transition-transform" />
              <span className="font-outfit uppercase tracking-wider whitespace-nowrap">
                <span>Repetir</span>
                <span className="hidden sm:inline"> Clase</span>
              </span>
            </>
          ) : activeCheckpoint ? (
            <>
              <Play size={13} className="fill-current text-white flex-shrink-0" />
              <span className="font-outfit uppercase tracking-wider whitespace-nowrap">
                <span>Continuar</span>
                <span className="hidden sm:inline"> Clase</span>
              </span>
            </>
          ) : (
            <>
              <Play size={13} className="fill-current text-white flex-shrink-0" />
              <span className="font-outfit uppercase tracking-wider whitespace-nowrap">
                <span>Iniciar</span>
                <span className="hidden sm:inline"> Clase {classIndex}</span>
              </span>
            </>
          )}
          <ChevronRight size={14} className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
