'use client';

import React, { memo } from 'react';

interface ChalkboardBackgroundWritingProps {
  topic?: string;
  className?: string;
}

/**
 * ChalkboardBackgroundWriting
 * 
 * Hyper-realistic, minimal chalk writing on the green chalkboard stage.
 * Represents raw handwriting by a teacher:
 * - "Welcome to a new class"
 * - "today we are learning [topic]"
 * 
 * Free of containers or boxes, naturally tilted and spaced with large authentic chalk letters.
 */
function ChalkboardBackgroundWritingComponent({
  topic = '',
  className = '',
}: ChalkboardBackgroundWritingProps) {
  // Clean topic for natural conversational handwriting: "present simple", etc.
  const cleanTopic = topic
    ? topic
        .replace(/^[0-9]+[\.\)\-:]\s*/, '')
        .replace(/\s*\(.*?\)/g, '')
        .trim()
        .toLowerCase()
    : 'present simple';

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none z-0 overflow-hidden chalk-dust-haze chalk-eraser-swipes flex flex-col justify-start px-5 sm:px-10 md:px-14 pt-8 sm:pt-12 md:pt-16 ${className}`}
    >
      {/* ─── Organic Chalk Dust Smudge Halo Behind the Teacher's Writing ─── */}
      <div
        className="absolute top-6 left-4 sm:left-10 w-[90%] max-w-4xl h-56 sm:h-72 opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 75% 45% at 35% 40%, rgba(255, 255, 255, 0.08) 0%, rgba(254, 240, 138, 0.03) 40%, transparent 75%)',
          filter: 'blur(10px)',
          transform: 'rotate(-1.5deg)',
        }}
      />

      {/* ─── Raw Hand-Written Teacher Chalk Text (No boxes, organic tilt) ─── */}
      <div className="relative z-0 transform -rotate-2 sm:-rotate-2.5 origin-top-left space-y-3 sm:space-y-5 max-w-5xl">
        
        {/* LINE 1: Title in Large Authentic Chalk */}
        <div className="relative inline-block">
          <h1
            className="real-chalk-title text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal leading-[1.05] tracking-wide"
            style={{
              fontFamily: "'Fredericka the Great', 'Cabin Sketch', cursive",
              color: 'rgba(255, 255, 255, 0.86)',
            }}
          >
            Welcome to a new class!
          </h1>

          {/* Wobbly Hand-Drawn Chalk Underline */}
          <svg
            className="w-full h-4 sm:h-6 -mt-1 sm:-mt-2 opacity-70 overflow-visible"
            viewBox="0 0 600 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 4 14 Q 160 8, 320 15 T 590 12"
              stroke="rgba(255, 255, 255, 0.75)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="14 3 8 2 20 4"
              style={{
                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))',
              }}
            />
          </svg>
        </div>

        {/* LINE 2: Subtitle naturally indented and slightly irregular */}
        <div className="pl-4 sm:pl-10 md:pl-16">
          <p
            className="real-chalk-subtitle text-2xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight font-normal"
            style={{
              fontFamily: "'Gochi Hand', 'Fredericka the Great', 'Rock Salt', cursive",
              color: '#fef08a',
            }}
          >
            today we are learning{' '}
            <span
              className="text-white/95 inline-block ml-1 underline decoration-wavy decoration-yellow-300/60 underline-offset-8"
              style={{
                fontFamily: "'Fredericka the Great', 'Rock Salt', cursive",
              }}
            >
              {cleanTopic}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export const ChalkboardBackgroundWriting = memo(ChalkboardBackgroundWritingComponent);
export default ChalkboardBackgroundWriting;
