'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Loader2, Volume2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface MicButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
  onTranscriptReady?: (transcript: string) => void;
}

export default function MicButton({
  isRecording,
  isProcessing,
  onStart,
  onStop,
  onTranscriptReady,
}: MicButtonProps) {
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US'; // Listen for English speech

      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setLiveTranscript(currentTranscript);
        if (onTranscriptReady && currentTranscript.trim()) {
          onTranscriptReady(currentTranscript);
        }
      };

      rec.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e);
      };

      recognitionRef.current = rec;
    }
  }, [onTranscriptReady]);

  const handleStartRecording = () => {
    setLiveTranscript('');
    onStart();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('SpeechRecognition start error:', err);
      }
    }
  };

  const handleStopRecording = () => {
    onStop();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('SpeechRecognition stop error:', err);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Live Transcript Display Box */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass px-4 py-2 rounded-2xl border border-brand-cyan/40 text-xs text-brand-cyan flex items-center gap-2 shadow-lg max-w-sm text-center"
        >
          <Volume2 className="w-4 h-4 text-brand-cyan animate-pulse flex-shrink-0" />
          <span className="truncate">
            {liveTranscript ? `"${liveTranscript}"` : 'Escuchando tu voz en inglés...'}
          </span>
        </motion.div>
      )}

      {/* Mic Button Circle */}
      <div className="relative flex justify-center items-center">
        {isRecording && (
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute w-24 h-24 bg-brand-error rounded-full opacity-20"
          />
        )}

        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isProcessing}
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-brand-error shadow-[0_0_30px_rgba(255,82,82,0.6)] scale-110'
              : isProcessing
              ? 'bg-brand-surface border-2 border-brand-accent'
              : 'bg-brand-accent hover:bg-brand-accent/90 hover:scale-105 glow-accent'
          }`}
          title={isRecording ? 'Haz clic para detener y enviar' : 'Haz clic para hablar'}
        >
          {isProcessing ? (
            <Loader2 className="w-7 h-7 text-brand-cyan animate-spin" />
          ) : isRecording ? (
            <Square className="w-7 h-7 text-white fill-white" />
          ) : (
            <Mic className="w-7 h-7 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
