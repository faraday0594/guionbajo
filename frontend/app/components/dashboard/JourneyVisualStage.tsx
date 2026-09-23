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

  // Curva continua del camino restante desde la estación actual hasta la meta final (x: 532, y: 30)
  const getRemainingPathD = (currIdx: number, pt: { x: number; y: number }) => {
    if (currIdx >= 63) return '';
    const bx = Math.round(pt.x * 10) / 10;
    const by = Math.round(pt.y * 10) / 10;
    if (currIdx < 16) {
      const cpA1 = Math.round(((bx + 154) / 2) * 10) / 10;
      return `M ${bx} ${by} Q ${cpA1} 18, 154 36 Q 218 54, 280 34 Q 344 16, 406 36 Q 470 56, 532 30`;
    } else if (currIdx < 32) {
      const cpA2 = Math.round(((bx + 280) / 2) * 10) / 10;
      return `M ${bx} ${by} Q ${cpA2} 54, 280 34 Q 344 16, 406 36 Q 470 56, 532 30`;
    } else if (currIdx < 48) {
      const cpB1 = Math.round(((bx + 406) / 2) * 10) / 10;
      return `M ${bx} ${by} Q ${cpB1} 16, 406 36 Q 470 56, 532 30`;
    } else {
      const cpB2 = Math.round(((bx + 532) / 2) * 10) / 10;
      return `M ${bx} ${by} Q ${cpB2} 56, 532 30`;
    }
  };
  const remainingPathD = getRemainingPathD(currentIndex, beaconPoint);

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

            {/* 🌅 Sky & Atmospheric Horizon Gradients */}
            <linearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="22%" stopColor="#7dd3fc" />
              <stop offset="50%" stopColor="#bae6fd" />
              <stop offset="72%" stopColor="#e0f2fe" />
              <stop offset="86%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fef9c3" stopOpacity="0.75" />
            </linearGradient>

            {/* Warm horizon sunburst glow */}
            <radialGradient id="sunGlow" cx="0.5" cy="0.43" r="0.42">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="20%" stopColor="#fef08a" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#fed7aa" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
            </radialGradient>

            {/* Radiant Sunbeams / God Rays */}
            <linearGradient id="sunBeamGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.2" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Horizon atmospheric mist / depth blur */}
            <linearGradient id="horizonMist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0" />
              <stop offset="40%" stopColor="#e0f2fe" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#fef3c7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#226b36" stopOpacity="0" />
            </linearGradient>

            {/* Volumetric Cloud Gradients */}
            <linearGradient id="cloudBodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="68%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
            <linearGradient id="cloudUnderbelly" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.3" />
            </linearGradient>

            {/* Layered Mountains & Rolling Hills */}
            <linearGradient id="distantMountainGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#529b68" />
              <stop offset="60%" stopColor="#418754" />
              <stop offset="100%" stopColor="#2e7141" />
            </linearGradient>
            <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#458f5b" />
              <stop offset="100%" stopColor="#276b3b" />
            </linearGradient>

            {/* Lush Ground & Grass */}
            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#307c47" />
              <stop offset="25%" stopColor="#246a39" />
              <stop offset="60%" stopColor="#1b562c" />
              <stop offset="100%" stopColor="#12401f" />
            </linearGradient>

            {/* Tree Canopies (Volumetric shading) */}
            <linearGradient id="canopySunlit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5db86e" />
              <stop offset="50%" stopColor="#3ea153" />
              <stop offset="100%" stopColor="#287c3c" />
            </linearGradient>
            <linearGradient id="canopyMidTone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#328847" />
              <stop offset="100%" stopColor="#1d5c2c" />
            </linearGradient>
            <linearGradient id="canopyShadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#206332" />
              <stop offset="100%" stopColor="#113e1c" />
            </linearGradient>

            {/* Tree Bark */}
            <linearGradient id="treeBarkGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#452712" />
              <stop offset="40%" stopColor="#6e4222" />
              <stop offset="85%" stopColor="#543017" />
              <stop offset="100%" stopColor="#3b1e0c" />
            </linearGradient>

            {/* Trail / Natural Dirt & Gravel Path */}
            <linearGradient id="trailGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b69566" />
              <stop offset="25%" stopColor="#c5a576" />
              <stop offset="70%" stopColor="#d2b487" />
              <stop offset="100%" stopColor="#dec297" />
            </linearGradient>
            <linearGradient id="trailEdge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7a5f3f" />
              <stop offset="100%" stopColor="#927652" />
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
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <radialGradient id="robotChassis3D" cx="45%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0a0f1d" />
            </radialGradient>

            <linearGradient id="robotTorso3D" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="22%" stopColor="#475569" />
              <stop offset="55%" stopColor="#334155" />
              <stop offset="85%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="robotSideFlank" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="35%" stopColor="#1e293b" />
              <stop offset="75%" stopColor="#141c2b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>

            <linearGradient id="topRoofHighlight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#64748b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="nozzleBellGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="45%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
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


          {/* ═══ SKY LAYER (Fixed atmospheric horizon) ═══ */}
          <rect width="960" height="340" fill="url(#skyWarm)" />

          {/* Radiant morning sun on horizon */}
          <ellipse cx="480" cy="130" rx="38" ry="24" fill="#ffffff" opacity="0.9" filter="url(#flagGlow)" />
          <rect x="0" y="40" width="960" height="150" fill="url(#sunGlow)" />

          {/* ☀️ Radiant Sunbeams (God Rays) */}
          <g opacity="0.35">
            <polygon points="480,126 180,0 250,0" fill="url(#sunBeamGrad)" />
            <polygon points="480,126 360,0 430,0" fill="url(#sunBeamGrad)" />
            <polygon points="480,126 530,0 600,0" fill="url(#sunBeamGrad)" />
            <polygon points="480,126 710,0 780,0" fill="url(#sunBeamGrad)" />
            <polygon points="480,126 840,40 900,40" fill="url(#sunBeamGrad)" />
          </g>

          {/* ☁️ Volumetric Puffy Cumulus Clouds with Gentle Ambient Drift */}
          <g>
            {/* Cloud Group 1 (Left Major Formation) */}
            <g opacity="0.88">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 12,-1; 0,0"
                dur="20s"
                repeatCount="indefinite"
              />
              <ellipse cx="170" cy="50" rx="80" ry="16" fill="url(#cloudUnderbelly)" />
              <path
                d="M 100 52 Q 100 38, 120 36 Q 132 20, 155 20 Q 175 12, 195 24 Q 215 16, 235 28 Q 250 36, 250 52 Z"
                fill="url(#cloudBodyGrad)"
              />
              <circle cx="150" cy="30" r="18" fill="#ffffff" />
              <circle cx="185" cy="24" r="22" fill="#ffffff" />
              <circle cx="218" cy="32" r="16" fill="#ffffff" />
              <circle cx="122" cy="40" r="14" fill="#ffffff" />
            </g>

            {/* Cloud Group 2 (Right Major Formation) */}
            <g opacity="0.82">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -14,1; 0,0"
                dur="26s"
                repeatCount="indefinite"
              />
              <ellipse cx="730" cy="54" rx="90" ry="17" fill="url(#cloudUnderbelly)" />
              <path
                d="M 650 56 Q 650 42, 670 38 Q 685 24, 712 24 Q 735 14, 760 26 Q 785 18, 805 32 Q 820 42, 820 56 Z"
                fill="url(#cloudBodyGrad)"
              />
              <circle cx="705" cy="32" r="20" fill="#ffffff" />
              <circle cx="745" cy="25" r="24" fill="#ffffff" />
              <circle cx="785" cy="34" r="18" fill="#ffffff" />
              <circle cx="672" cy="42" r="15" fill="#ffffff" />
            </g>

            {/* Subtle high wisps (Altocumulus) */}
            <g opacity="0.45">
              <ellipse cx="430" cy="26" rx="48" ry="7" fill="#ffffff" />
              <ellipse cx="890" cy="42" rx="42" ry="6" fill="#ffffff" />
              <ellipse cx="70" cy="36" rx="36" ry="5" fill="#ffffff" />
            </g>
          </g>

          {/* Majestic Soaring Birds in flight */}
          <g stroke="#334155" strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round">
            <path d="M 285 46 Q 289 41, 294 46 Q 299 41, 303 46" />
            <path d="M 270 54 Q 273 50, 277 54 Q 281 50, 284 54" />
            <path d="M 620 36 Q 624 32, 628 36 Q 632 32, 636 36" />
          </g>

          {/* ─── LAYER 1: DISTANT BLUE PEAKS (Atmospheric Aerial Perspective) ─── */}
          <path
            d="M 0 138 L 80 118 L 190 132 L 290 114 L 380 128 L 470 110 L 560 126 L 680 108 L 790 125 L 890 112 L 960 126 L 960 155 L 0 155 Z"
            fill="url(#distantMountainGrad)"
          />
          <path
            d="M 80 118 L 130 132 M 290 114 L 335 128 M 470 110 L 515 126 M 680 108 L 735 125 M 890 112 L 925 126"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
            fill="none"
          />

          {/* ─── LAYER 2: MID-GROUND EMERALD HILLS (horizon at y≈130) ─── */}
          <path
            d="M 0 138 Q 140 116, 290 128 Q 420 140, 510 118 Q 630 102, 750 124 Q 870 142, 960 128 L 960 166 L 0 166 Z"
            fill="url(#hillFar)"
            opacity="0.85"
          />

          {/* Silhouettes of distant pine groves on the ridge */}
          <g opacity="0.65">
            {[45, 85, 125, 165, 230, 270, 715, 755, 805, 855, 915].map((x, i) => {
              const baseY = 132 + Math.sin(x * 0.02) * 8;
              const h = 8 + (i % 3) * 3;
              return (
                <g key={`pinetree-${i}`}>
                  <line x1={x} y1={baseY} x2={x} y2={baseY - h} stroke="#214e30" strokeWidth="1.2" />
                  <polygon
                    points={`${x},${baseY - h} ${x - 3.5},${baseY - h * 0.4} ${x + 3.5},${baseY - h * 0.4}`}
                    fill="#1e472a"
                  />
                  <polygon
                    points={`${x},${baseY - h * 0.65} ${x - 4.5},${baseY - 1} ${x + 4.5},${baseY - 1}`}
                    fill="#1e472a"
                  />
                </g>
              );
            })}
          </g>

          {/* ─── LAYER 3: NEAR ROLLING HILL WITH LUSH CREST ─── */}
          <path
            d="M 0 148 Q 190 128, 350 144 Q 480 156, 580 136 Q 710 118, 840 140 Q 920 152, 960 144 L 960 178 L 0 178 Z"
            fill="url(#hillMid)"
          />
          <path
            d="M 0 148 Q 190 128, 350 144 Q 480 156, 580 136 Q 710 118, 840 140 Q 920 152, 960 144"
            fill="none"
            stroke="rgba(254, 240, 138, 0.45)"
            strokeWidth="1.5"
          />

          {/* ─── HORIZON ATMOSPHERIC MIST BAND (Blends mountains & ground) ─── */}
          <rect x="0" y="130" width="960" height="28" fill="url(#horizonMist)" />

          {/* ─── GREEN GROUND PLANE (perspective meadow) ─── */}
          <rect x="0" y="156" width="960" height="184" fill="url(#groundGrad)" />

          {/* Far static background trees (Rendered in the far background behind trail & main trees) */}
          <g opacity="0.75">
            <circle cx="562" cy="160" r="12" fill="url(#canopyMidTone)" />
            <circle cx="562" cy="154" r="8" fill="url(#canopySunlit)" />

            <circle cx="412" cy="158" r="11" fill="url(#canopyMidTone)" />
            <circle cx="412" cy="152" r="7" fill="url(#canopySunlit)" />

            <circle cx="632" cy="159" r="10" fill="url(#canopyMidTone)" />
            <circle cx="348" cy="160" r="9" fill="url(#canopyMidTone)" />
          </g>

          {/* Organic Meadow Grass Texture in True Depth Perspective */}
          {/* Distant tiny grass tufts (y = 160-195) */}
          <g stroke="#3a8b4f" strokeWidth="1" fill="none" opacity="0.55">
            {[75, 140, 215, 310, 620, 690, 770, 845, 915].map((gx, i) => (
              <path key={`gt-far-${i}`} d={`M ${gx} 172 L ${gx - 2} 167 M ${gx} 172 L ${gx + 2} 166`} />
            ))}
            {[110, 185, 260, 360, 580, 660, 735, 810, 885].map((gx, i) => (
              <path key={`gt-midfar-${i}`} d={`M ${gx} 190 L ${gx - 2.5} 183 M ${gx} 190 L ${gx} 182 M ${gx} 190 L ${gx + 2.5} 184`} />
            ))}
          </g>

          {/* Mid-distance meadow tufts (y = 205-255) */}
          <g stroke="#459e5a" strokeWidth="1.3" fill="none" opacity="0.65">
            {[60, 130, 220, 315, 625, 710, 800, 890].map((gx, i) => (
              <path key={`gt-mid-${i}`} d={`M ${gx} 224 L ${gx - 3.5} 214 M ${gx} 224 L ${gx} 212 M ${gx} 224 L ${gx + 3.5} 215`} />
            ))}
            {[90, 175, 340, 590, 670, 755, 840, 925].map((gx, i) => (
              <path key={`gt-mid2-${i}`} d={`M ${gx} 248 L ${gx - 4} 236 M ${gx} 248 L ${gx + 1} 233 M ${gx} 248 L ${gx + 4.5} 237`} />
            ))}
          </g>

          {/* Foreground lush grass clumps (y = 270-335) */}
          <g stroke="#56b36c" strokeWidth="1.6" fill="none" opacity="0.75" strokeLinecap="round">
            {[40, 120, 210, 310, 620, 730, 830, 920].map((gx, i) => (
              <path key={`gt-near-${i}`} d={`M ${gx} 285 Q ${gx - 5} 270, ${gx - 7} 265 M ${gx} 285 Q ${gx} 268, ${gx + 1} 263 M ${gx} 285 Q ${gx + 6} 272, ${gx + 8} 268`} />
            ))}
            {[80, 160, 250, 670, 780, 880].map((gx, i) => (
              <path key={`gt-fore-${i}`} d={`M ${gx} 320 Q ${gx - 7} 302, ${gx - 9} 296 M ${gx} 320 Q ${gx + 2} 298, ${gx + 3} 292 M ${gx} 320 Q ${gx + 8} 304, ${gx + 11} 300`} />
            ))}
          </g>

          {/* ─── WINDING TRAIL ─── */}
          {/* Natural soft shadow under trail edge */}
          <path
            d="M 380 340 L 560 340 Q 580 300, 570 270 Q 555 235, 520 215 Q 490 200, 500 185 Q 510 172, 500 165 Q 490 160, 492 155 L 488 155 Q 470 160, 475 165 Q 485 172, 475 185 Q 465 200, 440 215 Q 400 235, 395 270 Q 388 300, 400 340 Z"
            fill="#0f2b17"
            opacity="0.35"
          />
          {/* Trampled earthen border with natural bevel */}
          <path
            d="M 375 340 L 565 340 Q 585 295, 575 265 Q 558 228, 525 210 Q 495 195, 505 182 Q 515 168, 503 160 Q 495 155, 495 150 L 485 150 Q 465 155, 470 162 Q 480 170, 470 184 Q 458 198, 430 212 Q 392 230, 385 268 Q 378 300, 395 340 Z"
            fill="url(#trailEdge)"
          />
          {/* Main dirt & golden gravel trail bed */}
          <path
            d="M 390 340 L 550 340 Q 572 298, 565 268 Q 550 233, 520 216 Q 495 202, 502 186 Q 510 174, 500 164 Q 494 158, 493 153 L 487 153 Q 468 158, 474 166 Q 483 175, 474 188 Q 462 203, 438 218 Q 402 238, 395 270 Q 388 302, 400 340 Z"
            fill="url(#trailGrad)"
          />

          {/* Small natural trail pebbles & stones */}
          <g fill="#8a6f4e" opacity="0.6">
            <ellipse cx="440" cy="275" rx="3" ry="1.8" />
            <ellipse cx="510" cy="255" rx="2.5" ry="1.5" />
            <ellipse cx="470" cy="295" rx="2" ry="1.2" />
            <ellipse cx="492" cy="235" rx="1.8" ry="1" />
            <ellipse cx="462" cy="205" rx="1.5" ry="0.9" />
            <ellipse cx="482" cy="178" rx="1.2" ry="0.7" />
          </g>

          {/* 🌟 Dynamic Worn Center Line — dashes rush backward during travel */}
          <path
            d="M 470 340 Q 478 300, 480 270 Q 482 240, 490 218 Q 496 202, 492 188 Q 488 175, 490 165 Q 491 158, 490 153"
            fill="none"
            stroke="#fef3c7"
            strokeWidth="1.8"
            strokeDasharray="8 10"
            strokeDashoffset={
              isTraveling
                ? travelDirection === 'backward'
                  ? travelProgress * 96
                  : -travelProgress * 96
                : 0
            }
            opacity={isTraveling ? 0.75 : 0.45}
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

          {/* ══════════════════════════════════════════════════════════════
              🌲 CONTINUOUS PERSPECTIVE TREE CAROUSEL (SEAMLESS PARALLAX)
              • When traveling forward:
                - Near tree (Slot 1) passes viewer into foreground and fades out.
                - Mid tree (Slot 2) scales up and glides to Slot 1.
                - Far tree (Slot 3) scales up and glides to Slot 2.
                - Distant tree (Slot 4) emerges from horizon and glides to Slot 3.
              • When traveling backward:
                - Foreground tree (Slot 0) emerges and glides to Slot 1.
                - Tree 1 moves back to Slot 2.
                - Tree 2 moves back to Slot 3.
                - Tree 3 moves back to Slot 4 and fades into horizon.
              • At the end of travel (p = 1), tree coordinates match the resting slots
                with sub-pixel precision — ZERO snapback, maintaining final position!
             ══════════════════════════════════════════════════════════════ */}
          {(() => {
            const p = travelProgress;
            const isFwd = travelDirection === 'forward';

            // Left side dynamic transforms
            const l1Transform = isTraveling
              ? isFwd
                ? `translate(${-103 * p}px, ${32 * p}px) scale(${1 + 0.35 * p})`
                : `translate(${84 * p}px, ${-22 * p}px) scale(${1 - 0.28 * p})`
              : 'none';
            const l1Opacity = isTraveling && isFwd ? Math.max(0, 1 - p * 1.25) : 1;

            const l2Transform = isTraveling
              ? isFwd
                ? `translate(${-84 * p}px, ${22 * p}px) scale(${1 + 0.38 * p})`
                : `translate(${64 * p}px, ${-22 * p}px) scale(${1 - 0.3 * p})`
              : 'none';

            const l3Transform = isTraveling
              ? isFwd
                ? `translate(${-64 * p}px, ${22 * p}px) scale(${1 + 0.42 * p})`
                : `translate(${66 * p}px, ${-20 * p}px) scale(${1 - 0.35 * p})`
              : 'none';
            const l3Opacity = isTraveling && !isFwd ? Math.max(0, 1 - p * 1.25) : 1;

            const l4Transform = isTraveling && isFwd
              ? `translate(${-66 * p}px, ${20 * p}px) scale(${1 + 0.45 * p})`
              : 'none';
            const l4Opacity = isTraveling && isFwd ? Math.min(1, p * 1.35) : 0;

            const l0Transform = isTraveling && !isFwd
              ? `translate(${103 * p}px, ${-32 * p}px) scale(${1.35 - 0.35 * p})`
              : 'none';
            const l0Opacity = isTraveling && !isFwd ? Math.min(1, p * 1.35) : 0;

            // Right side dynamic transforms
            const r1Transform = isTraveling
              ? isFwd
                ? `translate(${104 * p}px, ${33 * p}px) scale(${1 + 0.35 * p})`
                : `translate(${-86 * p}px, ${-26 * p}px) scale(${1 - 0.28 * p})`
              : 'none';
            const r1Opacity = isTraveling && isFwd ? Math.max(0, 1 - p * 1.25) : 1;

            const r2Transform = isTraveling
              ? isFwd
                ? `translate(${86 * p}px, ${26 * p}px) scale(${1 + 0.38 * p})`
                : `translate(${-74 * p}px, ${-22 * p}px) scale(${1 - 0.3 * p})`
              : 'none';

            const r3Transform = isTraveling
              ? isFwd
                ? `translate(${74 * p}px, ${22 * p}px) scale(${1 + 0.42 * p})`
                : `translate(${-54 * p}px, ${-22 * p}px) scale(${1 - 0.35 * p})`
              : 'none';
            const r3Opacity = isTraveling && !isFwd ? Math.max(0, 1 - p * 1.25) : 1;

            const r4Transform = isTraveling && isFwd
              ? `translate(${54 * p}px, ${22 * p}px) scale(${1 + 0.45 * p})`
              : 'none';
            const r4Opacity = isTraveling && isFwd ? Math.min(1, p * 1.35) : 0;

            const r0Transform = isTraveling && !isFwd
              ? `translate(${-104 * p}px, ${-33 * p}px) scale(${1.35 - 0.35 * p})`
              : 'none';
            const r0Opacity = isTraveling && !isFwd ? Math.min(1, p * 1.35) : 0;

            return (
              <g>
                {/* ─── LEFT FOREST GROUP ─── */}
                <g>
                  {/* L0: Foreground entering tree (Backward travel only) */}
                  {isTraveling && !isFwd && (
                    <g style={{ transform: l0Transform, transformOrigin: '95px 268px' }} opacity={l0Opacity}>
                      <ellipse cx="95" cy="268" rx="58" ry="15" fill="#0c2e17" opacity="0.45" filter="url(#flagGlow)" />
                      <path d="M 64 268 Q 68 232, 72 205 L 82 205 Q 80 232, 86 268 Z" fill="url(#treeBarkGrad)" />
                      <path d="M 76 220 Q 86 212, 92 205 L 89 203 Q 83 209, 75 215 Z" fill="#4a2c16" />
                      <ellipse cx="78" cy="206" rx="48" ry="42" fill="url(#canopyShadow)" />
                      <circle cx="56" cy="190" r="36" fill="url(#canopyMidTone)" />
                      <circle cx="98" cy="192" r="34" fill="url(#canopyMidTone)" />
                      <circle cx="76" cy="170" r="32" fill="url(#canopySunlit)" />
                      <circle cx="68" cy="160" r="18" fill="#6ee7b7" opacity="0.35" />
                    </g>
                  )}

                  {/* L1: Big near tree */}
                  <g style={{ transform: l1Transform, transformOrigin: '198px 236px' }} opacity={l1Opacity}>
                    <ellipse cx="198" cy="236" rx="44" ry="12" fill="#0c2e17" opacity="0.45" filter="url(#flagGlow)" />
                    <path
                      d="M 174 235 Q 177 205, 180 182 L 188 182 Q 186 205, 191 235 Z"
                      fill="url(#treeBarkGrad)"
                    />
                    <path d="M 183 195 Q 192 188, 196 182 L 194 180 Q 188 186, 182 191 Z" fill="#4a2c16" />
                    <ellipse cx="184" cy="184" rx="38" ry="34" fill="url(#canopyShadow)" />
                    <circle cx="166" cy="170" r="28" fill="url(#canopyMidTone)" />
                    <circle cx="200" cy="172" r="26" fill="url(#canopyMidTone)" />
                    <circle cx="182" cy="155" r="25" fill="url(#canopySunlit)" />
                    <circle cx="176" cy="148" r="14" fill="#6ee7b7" opacity="0.35" />
                  </g>

                  {/* L2: Mid tree */}
                  <g style={{ transform: l2Transform, transformOrigin: '282px 214px' }}>
                    <ellipse cx="282" cy="214" rx="28" ry="8" fill="#0c2e17" opacity="0.38" filter="url(#flagGlow)" />
                    <path d="M 269 214 Q 272 195, 274 176 L 279 176 Q 278 195, 282 214 Z" fill="url(#treeBarkGrad)" />
                    <ellipse cx="276" cy="176" rx="26" ry="24" fill="url(#canopyShadow)" />
                    <circle cx="264" cy="168" r="19" fill="url(#canopyMidTone)" />
                    <circle cx="288" cy="169" r="18" fill="url(#canopyMidTone)" />
                    <circle cx="276" cy="156" r="17" fill="url(#canopySunlit)" />
                  </g>

                  {/* L3: Small tree */}
                  <g style={{ transform: l3Transform, transformOrigin: '346px 192px' }} opacity={l3Opacity}>
                    <ellipse cx="346" cy="192" rx="18" ry="5" fill="#0c2e17" opacity="0.3" filter="url(#flagGlow)" />
                    <rect x="339" y="168" width="5" height="24" rx="1.5" fill="url(#treeBarkGrad)" />
                    <ellipse cx="342" cy="168" rx="17" ry="16" fill="url(#canopyMidTone)" />
                    <circle cx="342" cy="158" r="12" fill="url(#canopySunlit)" />
                  </g>

                  {/* L4: Horizon entrant tree (Forward travel only) */}
                  {isTraveling && isFwd && (
                    <g style={{ transform: l4Transform, transformOrigin: '412px 172px' }} opacity={l4Opacity}>
                      <ellipse cx="412" cy="172" rx="12" ry="3.5" fill="#0c2e17" opacity="0.2" filter="url(#flagGlow)" />
                      <rect x="409" y="156" width="3.5" height="17" rx="1" fill="url(#treeBarkGrad)" />
                      <ellipse cx="411" cy="156" rx="12" ry="11" fill="url(#canopyMidTone)" />
                      <circle cx="411" cy="150" r="8" fill="url(#canopySunlit)" />
                    </g>
                  )}
                </g>

                {/* ─── RIGHT FOREST GROUP ─── */}
                <g>
                  {/* R0: Foreground entering tree (Backward travel only) */}
                  {isTraveling && !isFwd && (
                    <g style={{ transform: r0Transform, transformOrigin: '870px 275px' }} opacity={r0Opacity}>
                      <ellipse cx="870" cy="275" rx="60" ry="16" fill="#0c2e17" opacity="0.45" filter="url(#flagGlow)" />
                      <path d="M 846 275 Q 850 238, 854 210 L 865 210 Q 863 238, 868 275 Z" fill="url(#treeBarkGrad)" />
                      <path d="M 858 226 Q 848 217, 843 210 L 845 208 Q 852 214, 860 221 Z" fill="#4a2c16" />
                      <ellipse cx="858" cy="212" rx="52" ry="44" fill="url(#canopyShadow)" />
                      <circle cx="834" cy="196" r="36" fill="url(#canopyMidTone)" />
                      <circle cx="882" cy="198" r="35" fill="url(#canopyMidTone)" />
                      <circle cx="858" cy="174" r="34" fill="url(#canopySunlit)" />
                      <circle cx="850" cy="164" r="19" fill="#6ee7b7" opacity="0.35" />
                    </g>
                  )}

                  {/* R1: Big near tree */}
                  <g style={{ transform: r1Transform, transformOrigin: '766px 242px' }} opacity={r1Opacity}>
                    <ellipse cx="766" cy="242" rx="46" ry="13" fill="#0c2e17" opacity="0.45" filter="url(#flagGlow)" />
                    <path
                      d="M 746 242 Q 750 208, 752 185 L 761 185 Q 759 208, 764 242 Z"
                      fill="url(#treeBarkGrad)"
                    />
                    <path d="M 755 200 Q 746 192, 742 185 L 744 183 Q 750 189, 756 195 Z" fill="#4a2c16" />
                    <ellipse cx="756" cy="186" rx="42" ry="36" fill="url(#canopyShadow)" />
                    <circle cx="736" cy="174" r="29" fill="url(#canopyMidTone)" />
                    <circle cx="774" cy="176" r="28" fill="url(#canopyMidTone)" />
                    <circle cx="755" cy="156" r="27" fill="url(#canopySunlit)" />
                    <circle cx="748" cy="148" r="15" fill="#6ee7b7" opacity="0.35" />
                  </g>

                  {/* R2: Mid tree */}
                  <g style={{ transform: r2Transform, transformOrigin: '680px 216px' }}>
                    <ellipse cx="680" cy="216" rx="30" ry="8" fill="#0c2e17" opacity="0.38" filter="url(#flagGlow)" />
                    <path d="M 669 216 Q 672 196, 674 178 L 679 178 Q 678 196, 682 216 Z" fill="url(#treeBarkGrad)" />
                    <ellipse cx="675" cy="178" rx="28" ry="25" fill="url(#canopyShadow)" />
                    <circle cx="663" cy="170" r="20" fill="url(#canopyMidTone)" />
                    <circle cx="688" cy="171" r="19" fill="url(#canopyMidTone)" />
                    <circle cx="675" cy="158" r="18" fill="url(#canopySunlit)" />
                  </g>

                  {/* R3: Small tree */}
                  <g style={{ transform: r3Transform, transformOrigin: '606px 194px' }} opacity={r3Opacity}>
                    <ellipse cx="606" cy="194" rx="18" ry="5" fill="#0c2e17" opacity="0.3" filter="url(#flagGlow)" />
                    <rect x="599" y="170" width="5" height="25" rx="1.5" fill="url(#treeBarkGrad)" />
                    <ellipse cx="602" cy="170" rx="18" ry="17" fill="url(#canopyMidTone)" />
                    <circle cx="602" cy="160" r="13" fill="url(#canopySunlit)" />
                  </g>

                  {/* R4: Horizon entrant tree (Forward travel only) */}
                  {isTraveling && isFwd && (
                    <g style={{ transform: r4Transform, transformOrigin: '552px 172px' }} opacity={r4Opacity}>
                      <ellipse cx="554" cy="173" rx="12" ry="3.5" fill="#0c2e17" opacity="0.2" filter="url(#flagGlow)" />
                      <rect x="550" y="157" width="3.5" height="17" rx="1" fill="url(#treeBarkGrad)" />
                      <ellipse cx="552" cy="157" rx="13" ry="12" fill="url(#canopyMidTone)" />
                      <circle cx="552" cy="151" r="9" fill="url(#canopySunlit)" />
                    </g>
                  )}
                </g>
              </g>
            );
          })()}


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

          {/* 🌸 Studio Ghibli Wildflowers & Meadow Flora */}
          <g>
            {/* Left Bank - Near & Mid Foreground Clustered Wildflowers */}
            <g>
              {/* White Daisy with golden core */}
              <path d="M 378 300 Q 374 292, 372 284" stroke="#2d7a42" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <path d="M 375 292 Q 370 290, 368 288" stroke="#358a4a" strokeWidth="1" fill="none" />
              <circle cx="372" cy="283" r="2.5" fill="#ffffff" />
              <circle cx="372" cy="283" r="1" fill="#fbbf24" />

              {/* Red Poppy */}
              <path d="M 388 312 Q 386 302, 384 294" stroke="#2d7a42" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <circle cx="384" cy="293" r="3" fill="#f43f5e" />
              <circle cx="384" cy="293" r="1.2" fill="#881337" />

              {/* Blue forget-me-nots */}
              <path d="M 362 318 Q 360 310, 357 304" stroke="#2d7a42" strokeWidth="1.2" fill="none" />
              <circle cx="357" cy="303" r="2.2" fill="#38bdf8" />
              <circle cx="357" cy="303" r="0.8" fill="#ffffff" />

              {/* Buttercup / Yellow Marigold */}
              <path d="M 396 295 Q 394 286, 395 278" stroke="#2d7a42" strokeWidth="1.2" fill="none" />
              <circle cx="395" cy="277" r="2.6" fill="#facc15" />
              <circle cx="395" cy="277" r="1" fill="#ea580c" />
            </g>

            {/* Mid left flower cluster */}
            <g opacity="0.85">
              <path d="M 425 252 Q 423 245, 421 239" stroke="#276b3b" strokeWidth="0.9" fill="none" />
              <circle cx="421" cy="238" r="1.8" fill="#e879f9" />
              <circle cx="421" cy="238" r="0.7" fill="#ffffff" />

              <path d="M 432 242 Q 431 236, 432 231" stroke="#276b3b" strokeWidth="0.9" fill="none" />
              <circle cx="432" cy="230" r="1.6" fill="#38bdf8" />

              <path d="M 370 258 Q 368 252, 366 246" stroke="#276b3b" strokeWidth="0.9" fill="none" />
              <circle cx="366" cy="245" r="1.8" fill="#fbbf24" />
            </g>

            {/* Right Bank - Near & Mid Foreground Clustered Wildflowers */}
            <g>
              {/* Lavender / Wild Lupine */}
              <path d="M 572 305 Q 574 294, 575 285" stroke="#2d7a42" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <ellipse cx="575" cy="285" rx="1.8" ry="3.5" fill="#a855f7" />
              <ellipse cx="575" cy="281" rx="1.4" ry="2.5" fill="#c084fc" />

              {/* Crimson poppy */}
              <path d="M 584 316 Q 587 306, 588 298" stroke="#2d7a42" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <circle cx="588" cy="297" r="3" fill="#ef4444" />
              <circle cx="588" cy="297" r="1.2" fill="#7f1d1d" />

              {/* White Daisy */}
              <path d="M 598 292 Q 602 284, 604 278" stroke="#2d7a42" strokeWidth="1.2" fill="none" />
              <circle cx="604" cy="277" r="2.5" fill="#ffffff" />
              <circle cx="604" cy="277" r="1" fill="#f59e0b" />

              {/* Sunny Buttercup */}
              <path d="M 560 274 Q 563 266, 562 258" stroke="#2d7a42" strokeWidth="1" fill="none" />
              <circle cx="562" cy="257" r="2.2" fill="#facc15" />
              <circle cx="562" cy="257" r="0.9" fill="#d97706" />
            </g>

            {/* Mid right flower cluster */}
            <g opacity="0.85">
              <path d="M 524 235 Q 525 228, 524 222" stroke="#276b3b" strokeWidth="0.8" fill="none" />
              <circle cx="524" cy="221" r="1.5" fill="#38bdf8" />

              <path d="M 536 244 Q 537 238, 539 232" stroke="#276b3b" strokeWidth="0.8" fill="none" />
              <circle cx="539" cy="231" r="1.7" fill="#fbbf24" />

              <path d="M 592 252 Q 595 245, 597 239" stroke="#276b3b" strokeWidth="0.8" fill="none" />
              <circle cx="597" cy="238" r="1.6" fill="#ec4899" />
            </g>
          </g>

          {/* ✨ Floating Golden Spores & Fireflies */}
          <g>
            {/* Spore 1 - warm gold drifting above left meadow */}
            <g>
              <circle cx="340" cy="225" r="3" fill="#fef08a" opacity="0.25" filter="url(#flagGlow)">
                <animate attributeName="opacity" values="0.1;0.45;0.1" dur="4.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="340" cy="225" r="1.4" fill="#ffffff" opacity="0.85">
                <animate attributeName="cy" values="225;217;225" dur="4.2s" repeatCount="indefinite" />
                <animate attributeName="cx" values="340;345;340" dur="4.2s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Spore 2 - luminous emerald light mote near center trail */}
            <g>
              <circle cx="510" cy="195" r="2.8" fill="#6ee7b7" opacity="0.25" filter="url(#flagGlow)">
                <animate attributeName="opacity" values="0.15;0.5;0.15" dur="3.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="510" cy="195" r="1.2" fill="#ecfdf5" opacity="0.9">
                <animate attributeName="cy" values="195;188;195" dur="3.6s" repeatCount="indefinite" />
                <animate attributeName="cx" values="510;506;510" dur="3.6s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Spore 3 - golden mote floating near milestone flag */}
            <g>
              <circle cx="575" cy="235" r="3.2" fill="#fde047" opacity="0.28" filter="url(#flagGlow)">
                <animate attributeName="opacity" values="0.1;0.55;0.1" dur="4.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="575" cy="235" r="1.3" fill="#ffffff" opacity="0.9">
                <animate attributeName="cy" values="235;226;235" dur="4.8s" repeatCount="indefinite" />
                <animate attributeName="cx" values="575;580;575" dur="4.8s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Spore 4 - gentle high-flying mote near canopies */}
            <g>
              <circle cx="230" cy="175" r="2.5" fill="#fef08a" opacity="0.2" filter="url(#flagGlow)">
                <animate attributeName="opacity" values="0.05;0.35;0.05" dur="5.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="230" cy="175" r="1" fill="#ffffff" opacity="0.75">
                <animate attributeName="cy" values="175;168;175" dur="5.5s" repeatCount="indefinite" />
                <animate attributeName="cx" values="230;234;230" dur="5.5s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Spore 5 - near right woods mote */}
            <g>
              <circle cx="710" cy="205" r="3" fill="#a7f3d0" opacity="0.22" filter="url(#flagGlow)">
                <animate attributeName="opacity" values="0.1;0.4;0.1" dur="5.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="710" cy="205" r="1.2" fill="#ffffff" opacity="0.8">
                <animate attributeName="cy" values="205;198;205" dur="5.1s" repeatCount="indefinite" />
                <animate attributeName="cx" values="710;716;710" dur="5.1s" repeatCount="indefinite" />
              </circle>
            </g>
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

            // ── 3D Kinematics Rotation Calculation ─────────────────────────
            // θ (theta) is the Y-axis rotation angle in radians:
            // 0 = facing forward along the path (back view)
            // π = facing backward toward the student (front view)
            let theta = 0;
            if (isFlying && travelDirection === 'backward') {
              if (p < 0.22) {
                // Spin 1: Smooth 0 -> π turn
                const t = p / 0.22;
                const easedT = t * t * (3 - 2 * t);
                theta = easedT * Math.PI;
              } else if (p <= 0.78) {
                // Mid-flight: Facing camera (π)
                theta = Math.PI;
              } else {
                // Spin 2: Smooth π -> 0 turn back
                const t = (p - 0.78) / 0.22;
                const easedT = t * t * (3 - 2 * t);
                theta = Math.PI * (1 - easedT);
              }
            }

            const cosTheta = Math.cos(theta);
            const sinTheta = Math.sin(theta);
            const absCos = Math.abs(cosTheta);
            const showFront = cosTheta < 0;

            // Physical 3D dimensions
            const W_head = 60;
            const H_head = 48;
            const D_head = 24; // 3D lateral thickness of head

            const W_torso = 48;
            const H_torso = 32;
            const D_torso = 20; // 3D lateral depth of torso

            // Projected face & side flank dimensions:
            const faceW_head = Math.max(0.01, W_head * absCos);
            const sideW_head = D_head * sinTheta;
            const totalW_head = faceW_head + sideW_head;

            const faceW_torso = Math.max(0.01, W_torso * absCos);
            const sideW_torso = D_torso * sinTheta;
            const totalW_torso = faceW_torso + sideW_torso;

            // Centers and offsets:
            const faceCenterX_head = cosTheta >= 0
              ? 475 - sideW_head / 2
              : 475 + sideW_head / 2;
            const sideX_head = cosTheta >= 0
              ? faceCenterX_head + faceW_head / 2
              : 475 - totalW_head / 2;

            const faceCenterX_torso = cosTheta >= 0
              ? 475 - sideW_torso / 2
              : 475 + sideW_torso / 2;
            const sideX_torso = cosTheta >= 0
              ? faceCenterX_torso + faceW_torso / 2
              : 475 - totalW_torso / 2;

            // ── 3D Accessory Coordinates: Shoulders, Arms, Jetpack, Swords ──
            // Shoulders:
            const shoulderLeftX = 475 - 24 * cosTheta - 5 * sinTheta;
            const shoulderLeftZ = 24 * sinTheta - 5 * cosTheta;
            const shoulderRightX = 475 + 24 * cosTheta + 5 * sinTheta;
            const shoulderRightZ = -24 * sinTheta + 5 * cosTheta;

            // Jetpack Canisters (Stage 2):
            const canisterLeftX = 475 - 18 * cosTheta - 10 * sinTheta;
            const canisterLeftZ = 18 * sinTheta - 10 * cosTheta;
            const canisterRightX = 475 + 18 * cosTheta + 10 * sinTheta;
            const canisterRightZ = -18 * sinTheta - 10 * cosTheta;

            // Swords Mount (Stage 6):
            const swordsMountX = 475 - 10 * sinTheta;
            const swordsMountZ = -10 * cosTheta;

            // 3D Ear dials positions:
            const earLeftX = 475 - (W_head / 2) * cosTheta - (D_head / 2) * sinTheta;
            const earLeftZ = (W_head / 2) * sinTheta - (D_head / 2) * cosTheta;
            const earRightX = 475 + (W_head / 2) * cosTheta + (D_head / 2) * sinTheta;
            const earRightZ = -(W_head / 2) * sinTheta + (D_head / 2) * cosTheta;

            // ── Flame intensity (sinusoidal peak at mid-flight) ──────────
            const flameIntensity = isFlying ? Math.sin(p * Math.PI) : 0.15;
            const isMegaFlame = avatarUpgradeStage >= 2;
            const flameLen = (12 + flameIntensity * 44) * (isMegaFlame ? 1.45 : 1.0);
            const flameW = (8 + flameIntensity * 7) * (isMegaFlame ? 1.4 : 1.0);
            const flameCoreLen = flameLen * 0.6;
            const flameOpacity = 0.5 + flameIntensity * 0.5;
            const shimmer = Math.sin(p * Math.PI * 13) * 2;

            // ── Tilt angle ───────────────────────────────────────────────
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

            // ── Helper: 3D Ear Dial ──
            const renderEarDial = (x: number) => (
              <g transform={`translate(${x - 3.5}, 241)`}>
                <rect
                  x="0"
                  y="0"
                  width="7"
                  height="18"
                  rx="2"
                  fill="url(#earDialGrad)"
                  stroke="#475569"
                  strokeWidth="0.8"
                />
                <line x1="1" y1="3" x2="6" y2="3" stroke="#94a3b8" strokeWidth="0.8" opacity="0.6" />
                <line x1="1" y1="15" x2="6" y2="15" stroke="#1e293b" strokeWidth="0.8" opacity="0.8" />
                <rect
                  x="1.8"
                  y="8"
                  width="3.5"
                  height="2"
                  rx="1"
                  fill="#00D4FF"
                  filter="url(#cyanGlow)"
                />
              </g>
            );

            // ── Helper: 3D Articulated Arm (Stage 1) ──
            const renderArm = (
              shoulderX: number,
              shoulderZ: number,
              isLeft: boolean
            ) => {
              const sign = isLeft ? -1 : 1;
              const elbowX = shoulderX + sign * (12 * absCos + 4 * sinTheta);
              const elbowY = isFlying ? 300 - flameIntensity * 8 : 304;
              const clampX = elbowX + sign * (4 * absCos - 2 * sinTheta);
              const clampY = isFlying ? 310 - flameIntensity * 8 : 316;

              return (
                <g key={`arm-${isLeft ? 'left' : 'right'}`} opacity={shoulderZ < 0 && absCos < 0.25 ? 0.75 : 1}>
                  {/* Upper arm */}
                  <path
                    d={`M ${shoulderX} 282 Q ${(shoulderX + elbowX) / 2} ${288 - (isFlying ? flameIntensity * 6 : 0)}, ${elbowX} ${elbowY}`}
                    fill="none"
                    stroke={avatarUpgradeStage >= 1 ? '#94a3b8' : '#475569'}
                    strokeWidth={avatarUpgradeStage >= 1 ? 7 : 5}
                    strokeLinecap="round"
                  />
                  {/* Elbow ball joint */}
                  <circle
                    cx={elbowX}
                    cy={elbowY}
                    r={avatarUpgradeStage >= 1 ? 4.5 : 3.5}
                    fill="#334155"
                    stroke={avatarUpgradeStage >= 1 ? '#00D4FF' : '#64748b'}
                    strokeWidth={avatarUpgradeStage >= 1 ? 1.5 : 1}
                  />
                  {/* Forearm */}
                  <path
                    d={`M ${elbowX} ${elbowY} L ${clampX} ${clampY}`}
                    fill="none"
                    stroke={avatarUpgradeStage >= 1 ? '#cbd5e1' : '#334155'}
                    strokeWidth={avatarUpgradeStage >= 1 ? 5.5 : 4}
                    strokeLinecap="round"
                  />
                  {/* Pincer clamp */}
                  <circle
                    cx={clampX}
                    cy={clampY}
                    r={avatarUpgradeStage >= 1 ? 3.5 : 2.8}
                    fill={avatarUpgradeStage >= 1 ? '#00D4FF' : '#64748b'}
                    filter={avatarUpgradeStage >= 1 ? 'url(#cyanGlow)' : undefined}
                  />
                </g>
              );
            };

            // ── Helper: 3D Jetpack Canister (Stage 2) ──
            const renderJetpackCanister = (
              cx: number,
              cz: number,
              isLeft: boolean
            ) => {
              const w = Math.max(4, 11 * absCos + 7 * sinTheta);
              const flameRx = Math.max(2, (3.5 + flameIntensity * 2) * (0.6 + 0.4 * absCos));
              const flameRy = 6 + flameIntensity * 14;

              return (
                <g key={`canister-${isLeft ? 'left' : 'right'}`}>
                  <rect
                    x={cx - w / 2}
                    y="274"
                    width={w}
                    height="28"
                    rx="3"
                    fill="url(#antennaStemGrad)"
                    stroke="#64748b"
                    strokeWidth="1.2"
                  />
                  <line
                    x1={cx - w / 2}
                    y1="282"
                    x2={cx + w / 2}
                    y2="282"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                  />
                  <rect
                    x={cx - w * 0.38}
                    y="302"
                    width={w * 0.76}
                    height="4"
                    rx="1"
                    fill="#334155"
                    stroke="#64748b"
                    strokeWidth="0.8"
                  />
                  <ellipse
                    cx={cx}
                    cy={310 + flameIntensity * 12}
                    rx={flameRx}
                    ry={flameRy}
                    fill="url(#plasmaFlameOuter)"
                    opacity={flameOpacity}
                    filter="url(#cyanGlow)"
                  />
                </g>
              );
            };

            // ── Helper: 3D Dual Cyber Swords (Stage 6) ──
            const renderSwords = (isBehind: boolean) => (
              <g
                transform={`translate(${swordsMountX}, 292) scale(${Math.max(0.05, absCos)}, 1) translate(-475, -292)`}
                opacity={isBehind ? 0.9 : 1}
              >
                {/* Tahalí de sujeción en la espalda */}
                <line x1="454" y1="288" x2="496" y2="298" stroke="#334155" strokeWidth="2.5" strokeDasharray="3 1" />
                <rect x="471" y="290" width="8" height="6" rx="1.5" fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />

                {/* Espada izquierda (-48°) cruzada */}
                <g transform="rotate(-48 460 295)">
                  <rect x="458" y="254" width="4.5" height="38" rx="2" fill="url(#mapSwordGrad)" stroke="#e9d5ff" strokeWidth="0.8" filter="url(#cyanGlow)" />
                  <rect x="453" y="292" width="14" height="3.5" rx="1" fill="#475569" stroke="#cbd5e1" strokeWidth="0.8" />
                  <rect x="458.5" y="295.5" width="3" height="11" rx="1" fill="#1e293b" />
                  <circle cx="460" cy="307" r="2.2" fill="#a855f7" />
                </g>
                {/* Espada derecha (+48°) cruzada */}
                <g transform="rotate(48 490 295)">
                  <rect x="487.5" y="254" width="4.5" height="38" rx="2" fill="url(#mapSwordGrad)" stroke="#e9d5ff" strokeWidth="0.8" filter="url(#cyanGlow)" />
                  <rect x="483" y="292" width="14" height="3.5" rx="1" fill="#475569" stroke="#cbd5e1" strokeWidth="0.8" />
                  <rect x="488.5" y="295.5" width="3" height="11" rx="1" fill="#1e293b" />
                  <circle cx="490" cy="307" r="2.2" fill="#a855f7" />
                </g>
              </g>
            );

            return (
              <g
                style={{
                  transform: `translateY(${hoverY}px) rotate(${tiltAngle}deg)`,
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

                {/* ── ACCESSORIES BEHIND BODY (When facing front: Swords & Jetpack are behind) ── */}
                {avatarUpgradeStage >= 6 && cosTheta < 0 && renderSwords(true)}
                {avatarUpgradeStage >= 2 && cosTheta < 0 && (
                  <>
                    {renderJetpackCanister(canisterLeftX, canisterLeftZ, true)}
                    {renderJetpackCanister(canisterRightX, canisterRightZ, false)}
                  </>
                )}

                {/* ── BACKGROUND ARMS (Arm whose shoulder is on the far side) ── */}
                {shoulderLeftZ < 0 && renderArm(shoulderLeftX, shoulderLeftZ, true)}
                {shoulderRightZ < 0 && renderArm(shoulderRightX, shoulderRightZ, false)}

                {/* ── 3D MAGNETIC HOVER THRUSTER (Base del cuerpo) ─────────── */}
                <path
                  d={`M ${475 - flameW} 315
                      Q ${475 - flameW * 0.4 + shimmer} ${315 + flameLen * 0.55}
                        475 ${315 + flameLen}
                      Q ${475 + flameW * 0.4 + shimmer} ${315 + flameLen * 0.55}
                        ${475 + flameW} 315 Z`}
                  fill="url(#plasmaFlameOuter)"
                  opacity={flameOpacity}
                  filter="url(#cyanGlow)"
                />
                <path
                  d={`M ${475 - flameW * 0.55} 315
                      Q 475 ${315 + flameCoreLen * 0.55}
                        475 ${315 + flameCoreLen}
                      Q 475 ${315 + flameCoreLen * 0.55}
                        ${475 + flameW * 0.55} 315 Z`}
                  fill="url(#plasmaFlameCore)"
                  opacity={0.95}
                />

                {/* 3D Tobera metálica de propulsión (campana troncocónica) */}
                <polygon
                  points={`464,308 486,308 ${475 + Math.max(9, totalW_torso * 0.28)},315 ${475 - Math.max(9, totalW_torso * 0.28)},315`}
                  fill="url(#nozzleBellGrad)"
                  stroke="#475569"
                  strokeWidth="0.9"
                />
                {/* 3D Boca elíptica con plasma resplandeciente */}
                <ellipse
                  cx="475"
                  cy="315"
                  rx={Math.max(9, totalW_torso * 0.26)}
                  ry="3.2"
                  fill="#090d16"
                  stroke="#00D4FF"
                  strokeWidth="1.4"
                  filter="url(#cyanGlow)"
                />
                <ellipse
                  cx="475"
                  cy="315"
                  rx={Math.max(6, totalW_torso * 0.18)}
                  ry="2"
                  fill="#ffffff"
                  opacity={0.85 + flameIntensity * 0.15}
                />

                {/* ── 3D ROBOT TORSO / BODY ─────────────────────────────────── */}
                {/* 3D Side flank of torso (visible when rotating in 3D) */}
                {sideW_torso > 0.5 && (
                  <g>
                    <rect
                      x={sideX_torso}
                      y="278"
                      width={sideW_torso}
                      height="32"
                      rx={Math.min(6, sideW_torso / 2)}
                      fill="url(#robotSideFlank)"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    {sideW_torso > 6 && (
                      <line
                        x1={cosTheta >= 0 ? sideX_torso : sideX_torso + sideW_torso}
                        y1="282"
                        x2={cosTheta >= 0 ? sideX_torso : sideX_torso + sideW_torso}
                        y2="306"
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth="1"
                      />
                    )}
                  </g>
                )}

                {/* Torso Front/Back Face with cylindrical 3D shading */}
                <g
                  transform={`translate(${faceCenterX_torso}, 294) scale(${Math.max(0.02, absCos)}, 1) translate(-475, -294)`}
                >
                  <rect
                    x="451"
                    y="278"
                    width="48"
                    height="32"
                    rx="10"
                    fill="url(#robotTorso3D)"
                    stroke={avatarUpgradeStage >= 4 ? 'url(#mapGoldChassis)' : '#4b5563'}
                    strokeWidth={avatarUpgradeStage >= 4 ? 2.5 : 1.8}
                  />
                  {/* 3D Top curved reflection on torso */}
                  <path
                    d="M 456 281 Q 475 280, 494 281"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />

                  {showFront ? (
                    /* TORSO FRONT: CRT MONITOR & SCANLINES */
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
                      <line x1="459" y1="286" x2="491" y2="286" stroke="rgba(0,212,255,0.25)" strokeWidth="0.8" />
                      <line x1="459" y1="290" x2="491" y2="290" stroke="rgba(0,212,255,0.25)" strokeWidth="0.8" />
                      <line x1="459" y1="294" x2="491" y2="294" stroke="rgba(0,212,255,0.25)" strokeWidth="0.8" />
                      <line x1="459" y1="298" x2="491" y2="298" stroke="rgba(0,212,255,0.25)" strokeWidth="0.8" />
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
                    /* TORSO BACK: REAR CHASSIS & POWER COUPLING */
                    <>
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
                      <rect
                        x="472"
                        y="295"
                        width="6"
                        height="2"
                        rx="1"
                        fill="#00D4FF"
                        filter="url(#cyanGlow)"
                      />
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
                </g>

                {/* ── ACCESSORIES ON BACK (When facing back: Swords & Jetpack are in foreground) ── */}
                {avatarUpgradeStage >= 6 && cosTheta >= 0 && renderSwords(false)}
                {avatarUpgradeStage >= 2 && cosTheta >= 0 && (
                  <>
                    {renderJetpackCanister(canisterLeftX, canisterLeftZ, true)}
                    {renderJetpackCanister(canisterRightX, canisterRightZ, false)}
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
                <line x1="471" y1="275" x2="479" y2="275" stroke="#64748b" strokeWidth="0.9" />

                {/* ── 3D HEAD CAST SHADOW ONTO TORSO ────────────────────── */}
                <ellipse
                  cx="475"
                  cy="275"
                  rx={Math.max(12, totalW_head * 0.42)}
                  ry="3.5"
                  fill="#090d16"
                  opacity="0.55"
                  filter="url(#softGlow)"
                />

                {/* ── BACKGROUND EAR DIALS (Orbiting behind head) ──────── */}
                {earLeftZ < 0 && renderEarDial(earLeftX)}
                {earRightZ < 0 && renderEarDial(earRightX)}

                {/* ── 3D ROBOT HEAD CHASSIS & SIDE FLANK ────────────────── */}
                {/* 3D Side depth flank of head */}
                {sideW_head > 0.5 && (
                  <g>
                    <rect
                      x={sideX_head}
                      y="226"
                      width={sideW_head}
                      height="48"
                      rx={Math.min(6, sideW_head / 2)}
                      fill="url(#robotSideFlank)"
                      stroke={avatarUpgradeStage >= 4 ? 'url(#mapGoldChassis)' : '#334155'}
                      strokeWidth="1"
                    />
                    {sideW_head > 6 && (
                      <>
                        <line
                          x1={cosTheta >= 0 ? sideX_head : sideX_head + sideW_head}
                          y1="230"
                          x2={cosTheta >= 0 ? sideX_head : sideX_head + sideW_head}
                          y2="270"
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth="1"
                        />
                        <circle
                          cx={sideX_head + sideW_head / 2}
                          cy="250"
                          r="1.5"
                          fill="#64748b"
                          stroke="#1e293b"
                          strokeWidth="0.5"
                        />
                      </>
                    )}
                  </g>
                )}

                {/* 3D Head Front/Back Face */}
                <g
                  transform={`translate(${faceCenterX_head}, 250) scale(${Math.max(0.02, absCos)}, 1) translate(-475, -250)`}
                >
                  <rect
                    x="445"
                    y="226"
                    width="60"
                    height="48"
                    rx="12"
                    fill="url(#robotChassis3D)"
                    stroke={avatarUpgradeStage >= 4 ? 'url(#mapGoldChassis)' : '#4b5563'}
                    strokeWidth={avatarUpgradeStage >= 4 ? 2.5 : 2}
                  />
                  {/* 3D Top curved reflection bevel */}
                  <path
                    d="M 453 230 Q 475 228, 497 230"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />

                  {/* STAGE 4: Placa de oro en la frente (solo cara frontal) */}
                  {avatarUpgradeStage >= 4 && showFront && (
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
                    /* HEAD FRONT */
                    <>
                      <circle cx="463" cy="245" r="8.5" fill="#090d14" stroke="#334155" strokeWidth="1.5" />
                      <circle cx="463" cy="245" r="4.5" fill={avatarUpgradeStage >= 3 ? '#ef4444' : '#00D4FF'} filter="url(#cyanGlow)" />
                      <circle cx="461.5" cy="243.5" r="1.2" fill="#ffffff" />
                      <line x1="455" y1="239" x2="471" y2="239" stroke="#475569" strokeWidth="1.2" />

                      <circle cx="487" cy="245" r="8.5" fill="#090d14" stroke="#334155" strokeWidth="1.5" />
                      <circle cx="487" cy="245" r="4.5" fill={avatarUpgradeStage >= 3 ? '#ef4444' : '#00D4FF'} filter="url(#cyanGlow)" />
                      <circle cx="485.5" cy="243.5" r="1.2" fill="#ffffff" />
                      <line x1="479" y1="239" x2="495" y2="239" stroke="#475569" strokeWidth="1.2" />

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

                      <rect x="457" y="260" width="36" height="8" rx="3" fill="#090d14" stroke="#334155" strokeWidth="1.2" />
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
                    /* HEAD BACK */
                    <>
                      <rect x="454" y="235" width="42" height="30" rx="6" fill="#141c2b" stroke="#334155" strokeWidth="1.2" />
                      <line x1="459" y1="243" x2="491" y2="243" stroke="#26354a" strokeWidth="2" strokeLinecap="round" />
                      <line x1="459" y1="250" x2="491" y2="250" stroke="#26354a" strokeWidth="2" strokeLinecap="round" />
                      <line x1="459" y1="257" x2="491" y2="257" stroke="#26354a" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="475" cy="250" r="2.5" fill="#00D4FF" filter="url(#cyanGlow)" />

                      {avatarUpgradeStage >= 3 && (
                        <g>
                          <rect x="444" y="242" width="62" height="6" rx="2" fill="#0b1329" stroke="#00f0ff" strokeWidth="1.4" opacity="0.95" filter="url(#cyanGlow)" />
                          <line x1="448" y1="245" x2="502" y2="245" stroke="#00f0ff" strokeWidth="1.4" strokeDasharray="4 2" />
                        </g>
                      )}
                    </>
                  )}
                </g>

                {/* 3D Curved Roof Cap */}
                <ellipse
                  cx={475}
                  cy={227}
                  rx={Math.max(12, totalW_head * 0.46)}
                  ry="3"
                  fill="url(#topRoofHighlight)"
                  opacity={0.65}
                />

                {/* ── FOREGROUND EAR DIALS (Orbiting in front of head) ── */}
                {earLeftZ >= 0 && renderEarDial(earLeftX)}
                {earRightZ >= 0 && renderEarDial(earRightX)}

                {/* ── FOREGROUND ARMS (Arm whose shoulder is on the near side) ── */}
                {shoulderLeftZ >= 0 && renderArm(shoulderLeftX, shoulderLeftZ, true)}
                {shoulderRightZ >= 0 && renderArm(shoulderRightX, shoulderRightZ, false)}

                {/* ── STAGE 4: HOMBRERAS DE ORO BLINDADAS (Ancladas en 3D a los hombros) ── */}
                {avatarUpgradeStage >= 4 && (
                  <g>
                    {/* Hombrera Izquierda */}
                    <path
                      d={`M ${shoulderLeftX - 6 * absCos} 282 L ${shoulderLeftX + 2 * absCos} 276 L ${shoulderLeftX + 2 * absCos} 290 Z`}
                      fill="url(#mapGoldChassis)"
                      stroke="#fef08a"
                      strokeWidth="1"
                    />
                    {/* Hombrera Derecha */}
                    <path
                      d={`M ${shoulderRightX + 6 * absCos} 282 L ${shoulderRightX - 2 * absCos} 276 L ${shoulderRightX - 2 * absCos} 290 Z`}
                      fill="url(#mapGoldChassis)"
                      stroke="#fef08a"
                      strokeWidth="1"
                    />
                    {/* Placa pectoral frontal de oro (solo cara frontal) */}
                    {showFront && (
                      <rect
                        x={faceCenterX_torso - 17 * absCos}
                        y="278"
                        width={34 * absCos}
                        height="4"
                        rx="2"
                        fill="url(#mapGoldChassis)"
                        stroke="#fef08a"
                        strokeWidth="0.8"
                      />
                    )}
                  </g>
                )}

                {/* ── STAGE 5: BOBINA DE TESLA (O ANTENA EN STAGE < 5) ──── */}
                {avatarUpgradeStage >= 5 ? (
                  <g transform={`translate(${faceCenterX_head - 475}, 0)`}>
                    <rect x="473.5" y="210" width="3" height="16" rx="1.5" fill="url(#antennaStemGrad)" />
                    <ellipse cx="475" cy="208" rx={10 * (0.6 + 0.4 * absCos)} ry={3 * (0.6 + 0.4 * sinTheta)} fill="none" stroke="#00D4FF" strokeWidth="1.8" filter="url(#cyanGlow)" />
                    <ellipse cx="475" cy="202" rx={7.5 * (0.6 + 0.4 * absCos)} ry={2.3 * (0.6 + 0.4 * sinTheta)} fill="none" stroke="#00D4FF" strokeWidth="1.8" filter="url(#cyanGlow)" />
                    <ellipse cx="475" cy="196" rx={5 * (0.6 + 0.4 * absCos)} ry={1.6 * (0.6 + 0.4 * sinTheta)} fill="none" stroke="#00D4FF" strokeWidth="1.8" filter="url(#cyanGlow)" />
                    <circle cx="475" cy="190" r="3.2" fill="#ffffff" stroke="#00D4FF" strokeWidth="1.2" filter="url(#cyanGlow)" />
                    <path d="M 464 205 L 460 199 L 466 196 L 463 190" stroke="#fef08a" strokeWidth="1.6" fill="none" strokeLinecap="round">
                      <animate attributeName="opacity" values="0.2;1;0.3;1;0.2" dur="0.25s" repeatCount="indefinite" />
                    </path>
                    <path d="M 486 205 L 490 199 L 484 196 L 487 190" stroke="#fef08a" strokeWidth="1.6" fill="none" strokeLinecap="round">
                      <animate attributeName="opacity" values="1;0.2;1;0.4;1" dur="0.3s" repeatCount="indefinite" />
                    </path>
                  </g>
                ) : (
                  <g transform={`translate(${faceCenterX_head - 475}, 0)`}>
                    <rect
                      x="473.5"
                      y="210"
                      width="3"
                      height="16"
                      rx="1.5"
                      fill="url(#antennaStemGrad)"
                    />
                    <circle
                      cx="475"
                      cy="203"
                      r="7.5"
                      fill="url(#vacuumBulbGrad)"
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth="1.2"
                    />
                    <circle
                      cx="475"
                      cy="203"
                      r="11"
                      fill="#00D4FF"
                      opacity={0.35 + flameIntensity * 0.25}
                      filter="url(#cyanGlow)"
                    />
                    <path
                      d="M 473 205 C 473 200, 477 200, 477 205"
                      fill="none"
                      stroke="#00D4FF"
                      strokeWidth="1.2"
                    />
                  </g>
                )}

                {/* ── STAGE 7: MINI-DRON ORBITAL "GUIONCITO" ── */}
                {avatarUpgradeStage >= 7 && (
                  <g>
                    <ellipse cx={475 + 46 * (cosTheta >= 0 ? 1 : -1)} cy="265" rx="7.5" ry="4.5" fill="#1e293b" stroke="#00D4FF" strokeWidth="1.2" filter="url(#cyanGlow)">
                      <animate attributeName="cx" values={`${475 + 46 * (cosTheta >= 0 ? 1 : -1)};${475 + 52 * (cosTheta >= 0 ? 1 : -1)};${475 + 46 * (cosTheta >= 0 ? 1 : -1)}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="cy" values="263;267;263" dur="1.6s" repeatCount="indefinite" />
                    </ellipse>
                    <ellipse cx={475 + 46 * (cosTheta >= 0 ? 1 : -1)} cy="266.5" rx="5" ry="2" fill="none" stroke="#00D4FF" strokeWidth="0.8">
                      <animate attributeName="cx" values={`${475 + 46 * (cosTheta >= 0 ? 1 : -1)};${475 + 52 * (cosTheta >= 0 ? 1 : -1)};${475 + 46 * (cosTheta >= 0 ? 1 : -1)}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="cy" values="264.5;268.5;264.5" dur="1.6s" repeatCount="indefinite" />
                    </ellipse>
                    <circle cx={475 + 46 * (cosTheta >= 0 ? 1 : -1)} cy="261" r="2.2" fill="#ef4444" filter="url(#cyanGlow)">
                      <animate attributeName="cx" values={`${475 + 46 * (cosTheta >= 0 ? 1 : -1)};${475 + 52 * (cosTheta >= 0 ? 1 : -1)};${475 + 46 * (cosTheta >= 0 ? 1 : -1)}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="cy" values="259;263;259" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.1;1" dur="0.75s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}

                {/* ── STAGE 8: CORONA IMPERIAL DE MAESTRO ───────────────── */}
                {avatarUpgradeStage >= 8 && (
                  <g
                    transform={`translate(${faceCenterX_head}, 187) scale(${0.35 + 0.65 * absCos}, 1) translate(-475, -187)`}
                  >
                    <path
                      d="M 461 187 L 464 175 L 470 182 L 475 171 L 480 182 L 486 175 L 489 187 Z"
                      fill="url(#mapGoldChassis)"
                      stroke="#fef08a"
                      strokeWidth="1.2"
                    />
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

        {/* ─── FLOATING STATION BADGE (Interactive Class Launcher) ─── */}
        <div className="absolute top-3 left-0 right-0 z-10 pointer-events-none flex flex-col items-center px-4">
          <button
            type="button"
            onClick={() => !isTraveling && onLaunchClass(currentTopic.module, currentTopic.classNum)}
            disabled={isTraveling}
            title={isTraveling ? 'Viajando...' : currentIndex < targetIndex ? 'Haz clic para repetir esta clase' : 'Haz clic para iniciar la clase'}
            className={`group relative px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl border backdrop-blur-md transition-all duration-300 text-center max-w-[92%] sm:max-w-lg shadow-2xl pointer-events-auto overflow-hidden ${
              isTraveling
                ? 'opacity-85 cursor-wait'
                : 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]'
            } ${
              currentIndex < targetIndex
                ? 'bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-brand-cyan/90 hover:from-emerald-500 hover:to-cyan-400 border-emerald-300/40 shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_25px_rgba(0,212,255,0.45)]'
                : 'bg-gradient-to-r from-brand-accent via-[#6366f1] to-brand-cyan hover:from-brand-accent/90 hover:to-cyan-400 border-white/25 shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_25px_rgba(0,212,255,0.5)]'
            }`}
          >
            {/* Subtle Shimmer light sweep on hover */}
            <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 ease-out pointer-events-none" />

            <div className="relative z-10">
              <div className="text-[10px] sm:text-xs font-bold tracking-widest font-mono uppercase mb-0.5 text-cyan-100/90 group-hover:text-white transition-colors duration-300 drop-shadow-sm">
                {isTraveling
                  ? `${travelDirection === 'backward' ? 'RETROCEDIENDO' : 'AVANZANDO'} A CLASE ${destinationTopic.classNum} • NIVEL ${destinationTopic.level}...`
                  : currentIndex < targetIndex
                  ? `NIVEL ${currentTopic.level} • ${currentTopic.module} — CLASE ${currentTopic.classNum} (COMPLETADA)`
                  : `NIVEL ${currentTopic.level} • ${currentTopic.module} — CLASE ${currentTopic.classNum}`}
              </div>
              <div className="text-sm sm:text-base md:text-lg font-outfit font-black text-white tracking-wide leading-tight drop-shadow-md flex items-center justify-center gap-2">
                <span>{isTraveling ? destinationTopic.title.toUpperCase() : currentTopic.title.toUpperCase()}</span>
              </div>
              {!isTraveling && (
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 mt-1 rounded-full bg-black/25 group-hover:bg-black/35 border border-white/20 text-white text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-all shadow-inner">
                  {currentIndex < targetIndex ? (
                    <>
                      <RotateCcw size={11} className="text-white group-hover:-rotate-45 transition-transform flex-shrink-0" />
                      <span>Clase Aprobada • Clic para repetir</span>
                    </>
                  ) : activeCheckpoint ? (
                    <>
                      <Play size={10} className="fill-current text-white flex-shrink-0" />
                      <span>Progreso listo • Clic para continuar</span>
                    </>
                  ) : (
                    <>
                      <Play size={10} className="fill-current text-white group-hover:scale-110 transition-transform flex-shrink-0" />
                      <span>Clic para iniciar clase</span>
                    </>
                  )}
                  <ChevronRight size={12} className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              )}
            </div>
          </button>
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

            {/* 🌊 ONDA DE ENERGÍA QUE SIGUE LA RUTA DEL CAMINO RESTANTE */}
            {remainingPathD && (
              <g id="remainingPathWaveGroup">
                {/* Estela pulsante sobre la curva del camino restante */}
                <path
                  d={remainingPathD}
                  fill="none"
                  stroke={currentIndex < targetIndex ? '#94a3b8' : palette.primary}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="20 48"
                  opacity="0.9"
                  filter="url(#miniGlow)"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="68;0"
                    dur="1.7s"
                    repeatCount="indefinite"
                  />
                </path>
                {/* Onda / pulso de luz viajero que recorre la trayectoria curva */}
                <circle r="3.5" fill="#ffffff" filter="url(#miniGlow)" opacity="0.95">
                  <animateMotion
                    path={remainingPathD}
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )}

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
              {/* Onda de radar concéntrica en su posición exacta (sin desplazamientos lineales erróneos) */}
              <circle
                cx={beaconPoint.x}
                cy={beaconPoint.y}
                r="6"
                fill={currentIndex < targetIndex ? '#94a3b8' : palette.primary}
                fillOpacity="0.25"
                stroke={currentIndex < targetIndex ? '#94a3b8' : palette.primary}
                strokeWidth="1.5"
              >
                <animate attributeName="r" values="6;22;6" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.85;0;0.85" dur="2s" repeatCount="indefinite" />
              </circle>
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
