'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Volume2, VolumeX, Play, Sparkles, CheckCircle2, ChevronRight, Activity, ShieldCheck } from 'lucide-react';
import { JOURNEY_TOPICS, getTopicIndex, JourneyTopic } from '@/lib/journeyTopics';

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
  // Target topic index based on the user's real CEFR progress (0 to 63)
  const targetIndex = useMemo(() => getTopicIndex(sublevel, classIndex), [sublevel, classIndex]);

  // Display index: may start at previous index if the user just advanced
  const [currentIndex, setCurrentIndex] = useState<number>(targetIndex);
  const [isTraveling, setIsTraveling] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [portalTransform, setPortalTransform] = useState({ scale: 1, translateY: 0, opacity: 1 });
  const [distantTransform, setDistantTransform] = useState({ scale: 1, translateY: 0, opacity: 0.65 });

  const currentTopic: JourneyTopic = JOURNEY_TOPICS[currentIndex] || JOURNEY_TOPICS[0];
  const nextTopic: JourneyTopic | null = JOURNEY_TOPICS[currentIndex + 1] || null;

  // Precomputed planks for the perspective boardwalk
  const planks = useMemo(() => {
    const list: Array<{ x1: number; y1: number; x2: number; y2: number; strokeWidth: number }> = [];
    let y = 1070;
    let spacing = 45;
    while (y > 490) {
      const t = (y - 490) / (1080 - 490);
      const xLeft = 760 - (760 - 120) * t;
      const xRight = 1160 + (1800 - 1160) * t;
      list.push({
        x1: parseFloat(xLeft.toFixed(1)),
        y1: parseFloat(y.toFixed(1)),
        x2: parseFloat(xRight.toFixed(1)),
        y2: parseFloat(y.toFixed(1)),
        strokeWidth: parseFloat(Math.max(1, 3.5 * t).toFixed(1)),
      });
      spacing = Math.max(3, spacing * 0.935);
      y -= spacing;
    }
    return list;
  }, []);

  // Web Audio Synthesizer for sci-fi warp travel sound
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

  // Perform smooth warp animation from one index to target index
  const triggerWarpToTarget = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setIsTraveling(true);
    playWarpSound();

    // Zoom portal forward
    setPortalTransform({ scale: 2.6, translateY: 120, opacity: 0 });
    setDistantTransform({ scale: 2.2, translateY: 70, opacity: 1 });

    setTimeout(() => {
      setCurrentIndex(toIndex);
      // Reset position behind the camera
      setPortalTransform({ scale: 0.85, translateY: -35, opacity: 0 });

      setTimeout(() => {
        // Materialize smoothly
        setPortalTransform({ scale: 1, translateY: 0, opacity: 1 });
        setDistantTransform({ scale: 1, translateY: 0, opacity: 0.65 });
        setIsTraveling(false);
      }, 60);
    }, 650);
  };

  // Auto-advance logic: detect if student just graduated/advanced from a previous lesson
  const hasCheckedAutoAdvance = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasCheckedAutoAdvance.current) {
      hasCheckedAutoAdvance.current = true;
      const lastSeenStr = localStorage.getItem('guionbajo_last_seen_topic_index');
      if (lastSeenStr !== null) {
        const lastSeen = parseInt(lastSeenStr, 10);
        if (!isNaN(lastSeen) && lastSeen < targetIndex) {
          // The student progressed! Start at lastSeen and auto-travel forward
          setCurrentIndex(lastSeen);
          const timer = setTimeout(() => {
            triggerWarpToTarget(lastSeen, targetIndex);
            localStorage.setItem('guionbajo_last_seen_topic_index', targetIndex.toString());
          }, 400);
          return () => clearTimeout(timer);
        }
      }
      // Otherwise synchronize directly
      setCurrentIndex(targetIndex);
      localStorage.setItem('guionbajo_last_seen_topic_index', targetIndex.toString());
    } else if (targetIndex !== currentIndex && !isTraveling) {
      // Direct update if props change later
      triggerWarpToTarget(currentIndex, targetIndex);
      localStorage.setItem('guionbajo_last_seen_topic_index', targetIndex.toString());
    }
  }, [targetIndex]);

  // Minimap radar curve point calculation (x: 20 to 440, y: sinusoidal around y=28)
  const getMinimapPoint = (index: number) => {
    const total = 63;
    const t = Math.max(0, Math.min(1, index / total));
    const x = 20 + t * (440 - 20);
    const angle = t * Math.PI * 4;
    const y = 28 - Math.sin(angle) * 10;
    return { x, y };
  };

  // Minimap markers
  const minVisible = Math.max(0, currentIndex - 4);
  const maxVisible = Math.min(JOURNEY_TOPICS.length - 1, currentIndex + 4);

  return (
    <div className="w-full rounded-3xl overflow-hidden glass border border-brand-accent/30 shadow-2xl relative bg-[#04060d] mb-8">
      {/* ==================== STAGE HEADER HUD ==================== */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors duration-700 shadow-lg"
            style={{
              borderColor: `${currentTopic.levelColor}66`,
              backgroundColor: `${currentTopic.levelColor}22`,
              color: currentTopic.levelColor,
            }}
          >
            <Sparkles size={18} className="animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-outfit font-extrabold text-sm sm:text-base tracking-wider text-white uppercase">
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
              Progreso Continuo — 64 Clases Oficiales CEFR
            </p>
          </div>
        </div>

        {/* Progreso y Toggle de Sonido */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="text-right hidden sm:block">
            <div className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Tu Ubicación</div>
            <div className="font-bold text-xs" style={{ color: currentTopic.levelColor }}>
              Clase {currentIndex + 1} de 64
            </div>
          </div>
          <div className="w-16 sm:w-24 h-2 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${((currentIndex + 1) / 64) * 100}%`,
                backgroundColor: currentTopic.levelColor,
              }}
            />
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl glass hover:bg-slate-800/80 text-slate-400 hover:text-white transition border border-white/10"
            title={soundEnabled ? 'Silenciar efectos' : 'Activar efectos de audio'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* ==================== VECTORIAL 3D PERSPECTIVE STAGE ==================== */}
      <div className={`relative w-full aspect-[16/9] min-h-[380px] max-h-[560px] overflow-hidden ${isTraveling ? 'traveling' : ''}`}>
        <svg
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full block"
        >
          <defs>
            {/* Resplandor neón reactivo */}
            <filter id="neon-glow-dynamic" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur1" />
              <feGaussianBlur stdDeviation="15" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Cielo Crepuscular */}
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

            {/* Madera de la Pasarela */}
            <linearGradient id="boardwalkGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#121720" />
              <stop offset="40%" stopColor="#18202a" />
              <stop offset="75%" stopColor="#222c3b" />
              <stop offset="100%" stopColor="#323f50" />
            </linearGradient>

            {/* Pilares de Carbono del Portal */}
            <linearGradient id="portalStrutGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Vórtice de Energía Interior */}
            <radialGradient id="portalFieldGrad" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor={currentTopic.levelColor} stopOpacity="0.32" />
              <stop offset="65%" stopColor="#00b0ff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Atmósfera y Cielo */}
          <rect width="1920" height="1080" fill="url(#skyGrad)" />
          <path d="M 0 160 Q 480 110, 960 170 T 1920 150 L 1920 460 L 0 460 Z" fill="#0d141e" opacity="0.6" />
          <path d="M 0 250 Q 640 200, 1280 260 T 1920 230 L 1920 500 L 0 500 Z" fill="#15202d" opacity="0.4" />
          <rect x="0" y="360" width="1920" height="260" fill="url(#horizonGlow)" />

          {/* Luces distantes en el horizonte */}
          <g opacity="0.8">
            <circle cx="880" cy="485" r="3" fill="#fef08a" />
            <circle cx="920" cy="483" r="4" fill="#ffedd5" />
            <circle cx="960" cy="486" r="2.5" fill="#fed7aa" />
            <circle cx="1000" cy="482" r="4.5" fill="#ffedd5" />
            <circle cx="1040" cy="484" r="3" fill="#fde68a" />
          </g>

          {/* Terrenos laterales */}
          <path d="M 0 500 Q 300 485, 780 510 L 780 660 L 0 720 Z" fill="#070a0f" />
          <path d="M 1140 510 Q 1600 495, 1920 520 L 1920 720 L 1140 660 Z" fill="#070a0f" />

          {/* 2. Pasarela Continua en Perspectiva */}
          <g id="boardwalkGroup">
            <path d="M 120 1080 L 760 490 L 1160 490 L 1800 1080 Z" fill="url(#boardwalkGrad)" />

            {/* Tablones de madera calculados en fuga geométrica */}
            <g stroke="#141922" opacity="0.75">
              {planks.map((p, i) => (
                <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} strokeWidth={p.strokeWidth} />
              ))}
            </g>

            {/* Bordes metálicos */}
            <line x1="120" y1="1080" x2="760" y2="490" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
            <line x1="1800" y1="1080" x2="1160" y2="490" stroke="#334155" strokeWidth="12" strokeLinecap="round" />

            {/* Líneas Neón Dinámicas según el Nivel */}
            <line x1="120" y1="1075" x2="760" y2="490" stroke={currentTopic.levelColor} strokeWidth="5" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="120" y1="1075" x2="760" y2="490" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />

            <line x1="1800" y1="1075" x2="1160" y2="490" stroke={currentTopic.levelColor} strokeWidth="5" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="1800" y1="1075" x2="1160" y2="490" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />

            {/* Línea Central Neón */}
            <line x1="960" y1="1080" x2="960" y2="490" stroke="#00b0ff" strokeWidth="4" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="960" y1="1080" x2="960" y2="490" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

            {/* Rayas de velocidad durante el viaje hacia adelante */}
            {isTraveling && (
              <g className="animate-pulse">
                <line x1="550" y1="880" x2="680" y2="720" stroke={currentTopic.levelColor} strokeWidth="4" strokeDasharray="20 40" />
                <line x1="960" y1="920" x2="960" y2="750" stroke="#00b0ff" strokeWidth="4" strokeDasharray="25 45" />
                <line x1="1370" y1="880" x2="1240" y2="720" stroke={currentTopic.levelColor} strokeWidth="4" strokeDasharray="20 40" />
              </g>
            )}
          </g>

          {/* 3. Próximo Tema en el Horizonte (Perspectiva Lejana) */}
          {nextTopic && (
            <g
              id="distantPortalGroup"
              style={{
                transform: `scale(${distantTransform.scale}) translateY(${distantTransform.translateY}px)`,
                opacity: distantTransform.opacity,
                transformOrigin: '960px 480px',
                transition: 'transform 1.1s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.8s ease',
              }}
            >
              <path d="M 915 490 L 935 430 L 985 430 L 1005 490" fill="none" stroke="#1e293b" strokeWidth="3" />
              <path d="M 917 490 L 936 432 L 984 432 L 1003 490" fill="none" stroke={nextTopic.levelColor} strokeWidth="2" />
              <circle cx="960" cy="460" r="14" fill={nextTopic.levelColor} fillOpacity="0.25" />
              <text x="960" y="420" fill="#ffffff" fontFamily="sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle">
                TEMA {currentIndex + 2}
              </text>
            </g>
          )}

          {/* 4. Portal Principal: Estación del Tema Activo */}
          <g
            id="portalGroup"
            style={{
              transform: `scale(${portalTransform.scale}) translateY(${portalTransform.translateY}px)`,
              opacity: portalTransform.opacity,
              transformOrigin: '960px 480px',
              transition: isTraveling ? 'none' : 'transform 1.1s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.8s ease',
            }}
          >
            {/* Núcleo de Energía del Portal */}
            <ellipse cx="960" cy="470" rx="240" ry="160" fill="url(#portalFieldGrad)" />
            <ellipse cx="960" cy="470" rx="200" ry="130" fill="none" stroke={currentTopic.levelColor} strokeWidth="1.2" strokeDasharray="6 6" opacity="0.45" />

            {/* Columna Izquierda */}
            <polygon points="730,660 780,350 805,350 765,660" fill="url(#portalStrutGrad)" stroke="#475569" strokeWidth="1.5" />
            <line x1="775" y1="350" x2="735" y2="660" stroke={currentTopic.levelColor} strokeWidth="4.5" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="775" y1="350" x2="735" y2="660" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

            {/* Columna Derecha */}
            <polygon points="1190,660 1140,350 1115,350 1155,660" fill="url(#portalStrutGrad)" stroke="#475569" strokeWidth="1.5" />
            <line x1="1145" y1="350" x2="1185" y2="660" stroke={currentTopic.levelColor} strokeWidth="4.5" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <line x1="1145" y1="350" x2="1185" y2="660" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

            {/* Corona Arqueada Superior */}
            <path d="M 770 350 Q 960 310, 1150 350 L 1130 330 Q 960 295, 790 330 Z" fill="url(#portalStrutGrad)" stroke="#475569" strokeWidth="1.5" />
            <path d="M 780 345 Q 960 305, 1140 345" fill="none" stroke={currentTopic.levelColor} strokeWidth="5" strokeLinecap="round" filter="url(#neon-glow-dynamic)" />
            <path d="M 780 345 Q 960 305, 1140 345" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

            {/* ==================== RÓTULO FLOTANTE DEL TEMA ==================== */}
            <g transform="translate(960, 245)">
              <rect x="-260" y="0" width="520" height="52" rx="14" fill="#080e18" fillOpacity="0.92" stroke={currentTopic.levelColor} strokeWidth="2" filter="url(#neon-glow-dynamic)" />
              <text x="0" y="19" fill={currentTopic.levelColor} fontFamily="sans-serif" fontSize="10" fontWeight="bold" letterSpacing="2.5" textAnchor="middle">
                {`NIVEL ${currentTopic.level} • ${currentTopic.module} — CLASE ${currentTopic.classNum} (TEMA ${currentIndex + 1} DE 64)`}
              </text>
              <text x="0" y="39" fill="#ffffff" fontFamily="sans-serif" fontSize="15" fontWeight="900" letterSpacing="1.2" textAnchor="middle">
                {currentTopic.title.toUpperCase()}
              </text>
            </g>

            {/* ==================== TARJETA HOLOGRÁFICA: 3 PILARES PEDAGÓGICOS ==================== */}
            <g transform="translate(960, 470)">
              <rect x="-250" y="-70" width="500" height="140" rx="16" fill="#080e18" fillOpacity="0.8" stroke={currentTopic.levelColor} strokeWidth="1.5" />

              {/* Fila 1: Gramática */}
              <text x="-230" y="-40" fill="#34d399" fontFamily="sans-serif" fontSize="10" fontWeight="bold">
                📘 GRAMÁTICA:
              </text>
              <text x="-230" y="-22" fill="#f1f5f9" fontFamily="sans-serif" fontSize="13" fontWeight="600">
                {currentTopic.grammar}
              </text>

              {/* Fila 2: Vocabulario */}
              <text x="-230" y="6" fill="#38bdf8" fontFamily="sans-serif" fontSize="10" fontWeight="bold">
                💬 VOCABULARIO:
              </text>
              <text x="-230" y="24" fill="#f1f5f9" fontFamily="sans-serif" fontSize="13" fontWeight="600">
                {currentTopic.vocab}
              </text>

              {/* Fila 3: Fonética */}
              <text x="-230" y="52" fill="#c084fc" fontFamily="sans-serif" fontSize="10" fontWeight="bold">
                🎙️ FONÉTICA:
              </text>
              <text x="-230" y="68" fill="#f1f5f9" fontFamily="sans-serif" fontSize="13" fontWeight="600">
                {currentTopic.phonetics}
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* ==================== MINIMAPA RADAR GPS INFERIOR (SIN NAVEGACIÓN MANUAL) ==================== */}
      <div className="p-4 sm:p-5 bg-slate-950/90 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Curva Sinuosa del Minimapa */}
        <div className="flex flex-col items-center w-full md:w-auto">
          <svg width="460" height="54" viewBox="0 0 460 54" className="overflow-visible block max-w-full">
            <defs>
              <filter id="miniGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Cuadrícula sutil */}
            <line x1="20" y1="27" x2="440" y2="27" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

            {/* 4 Tramos Cromáticos (A1, A2, B1, B2) */}
            <path d="M 20 34 Q 72 16, 125 28" fill="none" stroke="#00e676" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 20 34 Q 72 16, 125 28" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />

            <path d="M 125 28 Q 178 40, 230 26" fill="none" stroke="#ffd600" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 125 28 Q 178 40, 230 26" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />

            <path d="M 230 26 Q 282 12, 335 28" fill="none" stroke="#00b0ff" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 230 26 Q 282 12, 335 28" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />

            <path d="M 335 28 Q 388 44, 440 24" fill="none" stroke="#d500f9" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" filter="url(#miniGlow)" />
            <path d="M 335 28 Q 388 44, 440 24" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />

            {/* Etiquetas de Sector */}
            <text x="72" y="12" fill="#00e676" fontFamily="sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle" opacity="0.9">A1</text>
            <text x="178" y="49" fill="#ffd600" fontFamily="sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle" opacity="0.9">A2</text>
            <text x="282" y="10" fill="#00b0ff" fontFamily="sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle" opacity="0.9">B1</text>
            <text x="388" y="52" fill="#d500f9" fontFamily="sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle" opacity="0.9">B2</text>

            {/* Banderitas Dinámicas de Posición Real */}
            <g id="minimapFlagsGroup">
              {JOURNEY_TOPICS.map((t, idx) => {
                const pt = getMinimapPoint(idx);
                const isCurrent = idx === currentIndex;
                const isPast = idx < currentIndex;
                const isPastVisible = idx >= minVisible && isPast;
                const isNextVisible = idx > currentIndex && idx <= maxVisible;

                if (isCurrent) {
                  return (
                    <g key={t.id}>
                      {/* Pulso radar animado */}
                      <circle cx={pt.x} cy={pt.y} r="8" fill={t.levelColor} fillOpacity="0.3" stroke={t.levelColor} strokeWidth="1.5" className="animate-ping" />
                      <circle cx={pt.x} cy={pt.y} r="3.8" fill={t.levelColor} />
                      {/* Asta y banderita activa */}
                      <line x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y - 14} stroke="#ffffff" strokeWidth="1.5" />
                      <polygon points={`${pt.x},${pt.y - 14} ${pt.x + 8},${pt.y - 10.5} ${pt.x},${pt.y - 7}`} fill={t.levelColor} stroke="#ffffff" strokeWidth="0.8" />
                    </g>
                  );
                }
                if (isPastVisible) {
                  return (
                    <g key={t.id} opacity="0.9">
                      <circle cx={pt.x} cy={pt.y} r="2" fill={t.levelColor} />
                      <line x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y - 10} stroke="#94a3b8" strokeWidth="1" />
                      <polygon points={`${pt.x},${pt.y - 10} ${pt.x + 6},${pt.y - 7.5} ${pt.x},${pt.y - 5}`} fill={t.levelColor} />
                    </g>
                  );
                }
                if (isNextVisible) {
                  return (
                    <g key={t.id} opacity="0.5">
                      <circle cx={pt.x} cy={pt.y} r="1.8" fill="none" stroke={t.levelColor} strokeWidth="1" />
                      <line x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y - 10} stroke="#64748b" strokeWidth="1" strokeDasharray="2 1" />
                      <polygon points={`${pt.x},${pt.y - 10} ${pt.x + 6},${pt.y - 7.5} ${pt.x},${pt.y - 5}`} fill="none" stroke={t.levelColor} strokeWidth="1" />
                    </g>
                  );
                }
                return (
                  <circle key={t.id} cx={pt.x} cy={pt.y} r="1.2" fill={t.levelColor} opacity={isPast ? 0.6 : 0.2} />
                );
              })}
            </g>
          </svg>
          <span className="text-[10px] text-slate-400 mt-1">
            Posición GPS: <strong className="text-white">Clase {currentIndex + 1} de 64</strong> — Avanzas automáticamente al completar cada clase
          </span>
        </div>

        {/* Botón de Acción Principal Directo (Continuar o Iniciar) */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={onLaunchClass}
            className="w-full md:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
          >
            <Play size={18} className="fill-current" />
            <span>
              {activeCheckpoint ? 'CONTINUAR CLASE (5 MIN)' : `INICIAR CLASE ${classIndex} (5 MIN)`}
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
