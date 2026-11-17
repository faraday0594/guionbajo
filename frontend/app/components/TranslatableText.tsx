'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

const CLIENT_QUICK_DICT: Record<string, string> = {
  the: 'el / la',
  a: 'un / una',
  an: 'un / una',
  and: 'y',
  or: 'o',
  but: 'pero',
  is: 'es / está',
  are: 'son / están',
  am: 'soy / estoy',
  was: 'fue / estaba',
  were: 'fueron / estaban',
  be: 'ser / estar',
  by: 'por',
  of: 'de',
  in: 'en',
  on: 'en / sobre',
  at: 'en / a las',
  to: 'a / para',
  for: 'para / por',
  with: 'con',
  from: 'de / desde',
  i: 'yo',
  you: 'tú / usted',
  he: 'él',
  she: 'ella',
  it: 'eso',
  we: 'nosotros',
  they: 'ellos',
  my: 'mi',
  your: 'tu',
  his: 'su (de él)',
  her: 'su (de ella)',
  our: 'nuestro',
  their: 'su (de ellos)',
  this: 'esto / este',
  that: 'eso / que',
  not: 'no',
  if: 'si',
  no: 'no',
  yes: 'sí',
};

const translationCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();

async function getWordTranslation(word: string, sentence: string): Promise<string> {
  const clean = word.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '');
  if (!clean) return '';
  const lower = clean.toLowerCase();
  const key = `${lower}||${sentence.slice(0, 120).toLowerCase()}`;

  if (translationCache.has(key)) {
    return translationCache.get(key)!;
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const reqPromise = (async () => {
    try {
      const res = await api.translateWord(clean, sentence);
      const tr = (res?.translation || '').trim() || CLIENT_QUICK_DICT[lower] || '';
      if (tr) {
        translationCache.set(key, tr);
      }
      return tr;
    } catch {
      return CLIENT_QUICK_DICT[lower] || '';
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, reqPromise);
  return reqPromise;
}

interface TranslatableTextProps {
  text: string;
  className?: string;
}

export default function TranslatableText({ text, className = '' }: TranslatableTextProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [translation, setTranslation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (activeIdx === null) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveIdx(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [activeIdx]);

  if (!text) return null;

  // Split into word tokens and non-word separators (spaces/punctuation)
  const parts = text.split(/([A-Za-z]+(?:'[A-Za-z]+)?)/g);

  const activateWord = async (idx: number, rawWord: string) => {
    setActiveIdx(idx);
    const lower = rawWord.toLowerCase();
    const key = `${lower}||${text.slice(0, 120).toLowerCase()}`;

    if (translationCache.has(key)) {
      setTranslation(translationCache.get(key)!);
      setLoading(false);
      return;
    }

    if (CLIENT_QUICK_DICT[lower]) {
      setTranslation(CLIENT_QUICK_DICT[lower]);
    } else {
      setTranslation('');
    }
    setLoading(true);
    const tr = await getWordTranslation(rawWord, text);
    setTranslation(tr || '...');
    setLoading(false);
  };

  return (
    <span ref={containerRef} className={`inline ${className}`}>
      {parts.map((part, idx) => {
        if (!part) return null;
        const isWord = /^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(part);
        if (!isWord) {
          return <React.Fragment key={idx}>{part}</React.Fragment>;
        }

        const isActive = activeIdx === idx;

        return (
          <span
            key={idx}
            className="relative inline-block"
            onMouseEnter={() => activateWord(idx, part)}
            onMouseLeave={() => {
              if (activeIdx === idx) setActiveIdx(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (isActive) {
                setActiveIdx(null);
              } else {
                activateWord(idx, part);
              }
            }}
          >
            <span
              className={`border-b border-dotted transition-colors cursor-help rounded-sm px-[1px] ${
                isActive
                  ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/15'
                  : 'border-white/30 hover:border-brand-cyan hover:text-brand-cyan'
              }`}
            >
              {part}
            </span>

            {isActive && (
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
                  whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-950/95 border border-brand-cyan/50
                  text-[11px] font-sans font-semibold text-cyan-200 shadow-xl backdrop-blur-md"
              >
                {loading && !translation ? 'Traduciendo...' : translation}
                <span className="block text-[9px] font-normal text-slate-400 text-center">
                  {part}
                </span>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
