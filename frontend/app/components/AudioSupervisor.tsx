'use client';

import { useEffect } from 'react';
import { stopTutorVoice } from '@/lib/api';

/**
 * AudioSupervisor — Global lifecycle audio manager.
 * Ensures that whenever a page is refreshed, closed, or navigated:
 * 1. Web Speech API (speechSynthesis) is cancelled immediately so Chrome/Edge doesn't keep talking.
 * 2. Active HTMLAudioElement playback and audio analyzers are detached and stopped immediately.
 * 3. Any lingering speech buffer from before a refresh is silenced immediately on mount.
 */
export function AudioSupervisor() {
  useEffect(() => {
    // 1. Immediately silence any speech synthesis buffer lingering from before a page refresh
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    stopTutorVoice();

    const handleTerminateSpeech = () => {
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (_) {}
      try {
        stopTutorVoice();
      } catch (_) {}
    };

    // 2. Listen to unload & pagehide events to cut speech the millisecond refresh is initiated
    window.addEventListener('beforeunload', handleTerminateSpeech, { capture: true });
    window.addEventListener('pagehide', handleTerminateSpeech, { capture: true });

    return () => {
      window.removeEventListener('beforeunload', handleTerminateSpeech, { capture: true });
      window.removeEventListener('pagehide', handleTerminateSpeech, { capture: true });
    };
  }, []);

  return null;
}
