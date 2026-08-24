/**
 * ══ audioAnalyzer.ts — Real-time Web Audio API Speech & Lip-Sync Engine ══
 * Extracts instantaneous vocal energy, RMS amplitude, and 7-band formant spectrum
 * directly from active HTMLAudioElement instances with ZERO latency.
 */

export interface SpeechMetrics {
  aperture: number; // 0.0 (closed) to 1.0 (fully open)
  isSpeaking: boolean;
  energy: number; // 0.0 to 1.0
  bandEnergies: number[]; // 7 normalized frequency bands for robot teeth grille
  hasActiveAudio: boolean;
}

let audioCtx: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let activeAudio: HTMLAudioElement | null = null;
const sourceNodeMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

let cachedFreqData: Uint8Array<ArrayBuffer> | null = null;
let cachedTimeData: Uint8Array<ArrayBuffer> | null = null;
let lastAperture = 0;

/**
 * Retrieves or initializes the shared Web Audio Context.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Connects an HTMLAudioElement to the Web Audio Analyser and Destination.
 */
export function attachAudioElementToAnalyzer(audio: HTMLAudioElement | any): void {
  if (!audio || typeof window === 'undefined') return;

  // Strict check: parameter MUST be an actual HTMLMediaElement (not a JS adapter object)
  const isRealMediaElement =
    (typeof HTMLMediaElement !== 'undefined' && audio instanceof HTMLMediaElement) ||
    (typeof HTMLAudioElement !== 'undefined' && audio instanceof HTMLAudioElement);

  if (!isRealMediaElement) {
    // If it's a browser speech adapter or mock object, do not attempt Web Audio API hook
    return;
  }

  activeAudio = audio as HTMLAudioElement;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (!analyserNode) {
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.12; // Ultra-crisp response, zero delay
      analyserNode.connect(ctx.destination);
    }

    if (!sourceNodeMap.has(audio)) {
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserNode);
      sourceNodeMap.set(audio, source);
    }

    const onPlayHandler = () => {
      activeAudio = audio;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };

    const onEndHandler = () => {
      if (activeAudio === audio) {
        activeAudio = null;
        lastAperture = 0;
      }
    };

    audio.addEventListener('play', onPlayHandler, { once: false });
    audio.addEventListener('ended', onEndHandler, { once: false });
    audio.addEventListener('pause', onEndHandler, { once: false });
  } catch (err) {
    // Media element may have already been connected or CORS restricted
    console.debug('Web Audio Analyser attach:', err);
  }
}

/**
 * Marks an audio element as no longer active.
 */
export function detachAudioElement(audio?: HTMLAudioElement | null): void {
  if (!audio || activeAudio === audio) {
    activeAudio = null;
    lastAperture = 0;
  }
}

/**
 * Returns the currently active HTMLAudioElement if playing.
 */
export function getActiveAudioElement(): HTMLAudioElement | null {
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
    return activeAudio;
  }
  return null;
}

const DEFAULT_METRICS: SpeechMetrics = {
  aperture: 0,
  isSpeaking: false,
  energy: 0,
  bandEnergies: [0, 0, 0, 0, 0, 0, 0],
  hasActiveAudio: false,
};

/**
 * Real-time 60 FPS analysis of active speech audio.
 * Computes vocal energy in speech frequencies (~120 Hz - 3600 Hz) and 7 formant bands.
 */
export function getAudioSpeechMetrics(): SpeechMetrics {
  const currentAudio = getActiveAudioElement();
  if (!currentAudio || !analyserNode || !audioCtx) {
    lastAperture = Math.max(0, lastAperture * 0.7 - 0.05);
    return {
      ...DEFAULT_METRICS,
      aperture: lastAperture > 0.02 ? lastAperture : 0,
    };
  }

  const binCount = analyserNode.frequencyBinCount;
  if (!cachedFreqData || cachedFreqData.length !== binCount) {
    cachedFreqData = new Uint8Array(binCount);
    cachedTimeData = new Uint8Array(binCount);
  }

  analyserNode.getByteFrequencyData(cachedFreqData);
  analyserNode.getByteTimeDomainData(cachedTimeData!);

  // 1. Calculate RMS volume from Time Domain Data
  let sumSquares = 0;
  for (let i = 0; i < binCount; i++) {
    const norm = (cachedTimeData![i] - 128) / 128;
    sumSquares += norm * norm;
  }
  const rms = Math.sqrt(sumSquares / binCount);

  // 2. Calculate Vocal Formant Energy (Bins 2 through 32 ≈ 150 Hz to 4000 Hz)
  let vocalSum = 0;
  const startBin = 2;
  const endBin = Math.min(32, binCount);
  const binSpan = endBin - startBin;

  for (let i = startBin; i < endBin; i++) {
    vocalSum += cachedFreqData[i];
  }
  const avgVocalFreq = binSpan > 0 ? vocalSum / binSpan : 0; // 0 to 255

  // Noise floor gating
  const NOISE_FLOOR = 12;
  const effectiveFreq = Math.max(0, avgVocalFreq - NOISE_FLOOR);
  const freqEnergy = Math.min(1, effectiveFreq / 85);
  const rmsEnergy = Math.min(1, rms * 4.2);

  // Blended acoustic energy (80% frequency formant + 20% RMS volume)
  const combinedEnergy = freqEnergy * 0.8 + rmsEnergy * 0.2;

  // Dynamic aperture with instantaneous attack and smooth biological decay
  let targetAperture = 0;
  if (combinedEnergy > 0.04) {
    targetAperture = Math.min(1, Math.pow(combinedEnergy, 0.85) * 1.25);
  }

  if (targetAperture > lastAperture) {
    // Instant attack (0ms delay)
    lastAperture = targetAperture;
  } else {
    // Natural fast decay (~25ms)
    lastAperture = lastAperture * 0.78 + targetAperture * 0.22;
  }

  if (lastAperture < 0.01) lastAperture = 0;

  // 3. Calculate 7 Discrete Frequency Bands for the Bender Teeth Grille
  const bandEnergies: number[] = [0, 0, 0, 0, 0, 0, 0];
  const binsPerBand = Math.max(1, Math.floor(binSpan / 7));

  for (let b = 0; b < 7; b++) {
    let bandSum = 0;
    const bStart = startBin + b * binsPerBand;
    const bEnd = Math.min(bStart + binsPerBand, endBin);
    const count = Math.max(1, bEnd - bStart);

    for (let i = bStart; i < bEnd; i++) {
      bandSum += cachedFreqData[i];
    }
    const bandAvg = bandSum / count;
    bandEnergies[b] = Math.min(1, Math.max(0, (bandAvg - NOISE_FLOOR) / 95));
  }

  return {
    aperture: Math.min(1, Math.max(0, lastAperture)),
    isSpeaking: lastAperture > 0.05,
    energy: combinedEnergy,
    bandEnergies,
    hasActiveAudio: true,
  };
}
