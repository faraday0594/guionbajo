'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Volume2,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  Check,
} from 'lucide-react';

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────────

export type SectionType =
  | 'concept'       // 🔑, 💡, 📸, 📌 Key concept / metaphor / hook
  | 'formula'       // 📐, FÓRMULA MÁGICA, syntax pattern
  | 'examples_pos'  // ✅ AFIRMATIVA, affirmative examples
  | 'examples_neg'  // ❌ NEGATIVA, negative examples
  | 'examples_gen'  // 👉, • General examples
  | 'duel'          // ⚔️ DUELO DE CONCEPTOS, Correct vs Incorrect
  | 'phonetic'      // 🗣️ RETO FONÉTICO, pronunciation & IPA
  | 'important'     // ⚠️ IMPORTANTE, Regla de oro
  | 'summary'       // 🎉 RESUMEN, checklist
  | 'roleplay'      // 🎭 JUEGO DE ROL
  | 'generic';      // General text / fallback

export interface FormulaToken {
  text: string;
  role?: 'subject' | 'modal' | 'verb' | 'complement' | 'negative' | 'operator' | 'general';
  isOperator?: boolean;
}

export interface ExampleItem {
  id: string;
  rawText: string;
  english: string;
  spanish?: string;
  tokens?: FormulaToken[];
  isTransformation?: boolean;
  fromText?: string;
  toText?: string;
  timing?: { startRatio: number; endRatio: number };
}

export interface DuelItem {
  id: string;
  incorrect: string;
  correct: string;
  explanation?: string;
  timing?: { startRatio: number; endRatio: number };
}

export interface BoardSection {
  id: string;
  type: SectionType;
  title?: string;
  icon?: string;
  rawHeader?: string;
  items: string[];
  formulaTokens?: FormulaToken[];
  formulaRaw?: string;
  examples?: ExampleItem[];
  duelPairs?: DuelItem[];
  dialogueSpeaker?: string;
  dialogueResponse?: string;
  timing: { startRatio: number; endRatio: number };
  searchText: string;
}

export interface SpeechWordTiming {
  word: string;
  startRatio: number;
  endRatio: number;
}

export interface PhaseSpeechTimeline {
  cleanSpeech: string;
  words: string[];
  wordTimings: SpeechWordTiming[];
}

interface ExplanationBoardProps {
  boardContent: string | null | undefined;
  tutorSays?: string | null;
  phaseTimeline?: PhaseSpeechTimeline;
  audioProgress: number; // 0 to 100
  isPlaying: boolean;
  tutorState: string; // 'idle' | 'speaking' | 'listening' | 'thinking'
  isFullBoardRevealed: boolean;
  onPlayAudio?: (text: string) => void;
  theme?: 'chalk' | 'studio' | 'neon';
  className?: string;
  hasGrammarCard?: boolean;
}

// ─── HELPER: SEARCH PHRASE TIMING ─────────────────────────────────────────────

function findPhraseTiming(
  phrase: string,
  timeline?: PhaseSpeechTimeline,
  fallbackStartRatio = 0.0
): { startRatio: number; endRatio: number; found: boolean } {
  if (!phrase || !timeline || !timeline.words || timeline.words.length === 0) {
    return { startRatio: fallbackStartRatio, endRatio: Math.min(fallbackStartRatio + 0.18, 1.0), found: false };
  }

  const cleanPhrase = phrase.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, ' ').trim();
  const phraseTokens = cleanPhrase.split(/\s+/).filter(Boolean);
  if (phraseTokens.length === 0) {
    return { startRatio: fallbackStartRatio, endRatio: Math.min(fallbackStartRatio + 0.18, 1.0), found: false };
  }

  const speechTokens = timeline.words.map(w => w.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, ''));

  // 1. Exact contiguous token sequence
  for (let i = 0; i <= speechTokens.length - phraseTokens.length; i++) {
    let match = true;
    for (let j = 0; j < phraseTokens.length; j++) {
      if (speechTokens[i + j] !== phraseTokens[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      const startIdx = Math.max(0, i);
      const endIdx = Math.min(i + phraseTokens.length - 1, timeline.wordTimings.length - 1);
      const startRatio = timeline.wordTimings[startIdx]?.startRatio ?? fallbackStartRatio;
      const endRatio = timeline.wordTimings[endIdx]?.endRatio ?? (startRatio + 0.15);
      return { startRatio, endRatio, found: true };
    }
  }

  // 2. Multi-token partial boundary match
  if (phraseTokens.length >= 2) {
    const firstWord = phraseTokens[0];
    const lastWord = phraseTokens[phraseTokens.length - 1];
    for (let i = 0; i < speechTokens.length; i++) {
      if (speechTokens[i] === firstWord) {
        for (let j = i + 1; j < Math.min(i + phraseTokens.length + 3, speechTokens.length); j++) {
          if (speechTokens[j] === lastWord) {
            const startRatio = timeline.wordTimings[i]?.startRatio ?? fallbackStartRatio;
            const endRatio = timeline.wordTimings[j]?.endRatio ?? (startRatio + 0.20);
            return { startRatio, endRatio, found: true };
          }
        }
      }
    }
  }

  // 3. Significant single keyword match (length >= 4)
  for (const token of phraseTokens) {
    if (token.length >= 4) {
      const idx = speechTokens.indexOf(token);
      if (idx !== -1) {
        const startRatio = timeline.wordTimings[idx]?.startRatio ?? fallbackStartRatio;
        const endRatio = Math.min(startRatio + 0.20, 1.0);
        return { startRatio, endRatio, found: true };
      }
    }
  }

  return { startRatio: fallbackStartRatio, endRatio: Math.min(fallbackStartRatio + 0.18, 1.0), found: false };
}

// ─── HELPER: CLASSIFY TOKEN ROLES & COLORS ───────────────────────────────────

function classifyTokenRole(token: string): FormulaToken['role'] {
  const lower = token.toLowerCase().replace(/[[\]]/g, '').trim();

  // Subject / Pronouns
  if (/^(sujeto|subject|i|you|he|she|it|we|they|poseedor|wh-|persona|quien)$/i.test(lower)) {
    return 'subject';
  }
  // Modal / Aux / Linking
  if (/^(can|can't|cannot|did|didn't|do|does|doesn't|was|were|am|is|are|be|auxiliar|modal|going to)$/i.test(lower)) {
    return 'modal';
  }
  // Negative particles
  if (/^(not|n't|didn't|doesn't|don't|can't|never)$/i.test(lower)) {
    return 'negative';
  }
  // Verb / Action
  if (/^(verbo|verb|verbo base|v1|v2|acción|action|swim|cook|speak|play|drive|go|see|eat|buy|work|watch)$/i.test(lower)) {
    return 'verb';
  }
  // Complement / Object
  if (/^(complemento|complement|objeto|object|english|guitar|car|movie|yesterday|tomorrow|lugar|tiempo)$/i.test(lower)) {
    return 'complement';
  }
  return 'general';
}

function getTokenStyle(role: FormulaToken['role'] | undefined, isChalk = false) {
  switch (role) {
    case 'subject':
      return isChalk
        ? 'bg-sky-500/20 text-sky-200 border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
        : 'bg-sky-500/15 text-sky-300 border-sky-400/50 shadow-sm';
    case 'modal':
      return isChalk
        ? 'bg-purple-500/20 text-purple-200 border-purple-400/40 shadow-[0_0_12px_rgba(192,132,252,0.25)]'
        : 'bg-purple-500/15 text-purple-300 border-purple-400/50 shadow-sm';
    case 'negative':
      return isChalk
        ? 'bg-rose-500/20 text-rose-200 border-rose-400/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
        : 'bg-rose-500/15 text-rose-300 border-rose-400/50 shadow-sm';
    case 'verb':
      return isChalk
        ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
        : 'bg-amber-500/15 text-amber-300 border-amber-400/50 shadow-sm';
    case 'complement':
      return isChalk
        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
        : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/50 shadow-sm';
    default:
      return isChalk
        ? 'bg-white/10 text-white/90 border-white/20'
        : 'bg-white/5 text-white/80 border-white/10';
  }
}

// ─── HELPER: PARSE FORMULA TOKENS ─────────────────────────────────────────────

function parseFormulaString(formulaStr: string): FormulaToken[] {
  if (!formulaStr) return [];
  const clean = formulaStr.replace(/^\|\s*|\s*\|$/g, '').trim();
  
  // Split by '+' or '→' while keeping tokens
  const parts = clean.split(/(\s*\+\s*|\s*→\s*|\s*\|\s*)/).filter(Boolean);
  const result: FormulaToken[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === '+' || trimmed === '→' || trimmed === '|') {
      result.push({ text: trimmed, isOperator: true, role: 'operator' });
    } else if (trimmed) {
      const cleanToken = trimmed.replace(/^[[\](]+|[\])]+$/g, '').trim();
      result.push({
        text: cleanToken,
        role: classifyTokenRole(cleanToken),
        isOperator: false,
      });
    }
  }

  return result;
}

// ─── HELPER: PARSE EXAMPLE SENTENCE ──────────────────────────────────────────

function parseExampleSentence(rawLine: string, index: number): ExampleItem {
  const cleanLine = rawLine.replace(/^[•\-*👉\s]+/, '').trim();
  let spanish: string | undefined = undefined;
  let english = cleanLine;

  // Check if there is Spanish in parentheses: "I can swim (Sé nadar)"
  const parenMatch = cleanLine.match(/\(([^)]+)\)$/);
  if (parenMatch) {
    spanish = parenMatch[1].trim();
    english = cleanLine.replace(/\s*\([^)]+\)$/, '').trim();
  }

  // Check if there is quotation marks: '"Yesterday I went..." (Traducción: ...)'
  const quoteMatch = cleanLine.match(/^["“']([^"”']+)["”']\s*(?:\((?:Traducción:\s*)?([^)]+)\))?/i);
  if (quoteMatch) {
    english = quoteMatch[1].trim();
    if (quoteMatch[2]) spanish = quoteMatch[2].trim();
  }

  // Check transformation: "go (ir) → went (fui / fue)"
  if (cleanLine.includes('→')) {
    const [fromPart, toPart] = cleanLine.split('→').map(s => s.trim());
    return {
      id: `ex-trans-${index}`,
      rawText: rawLine,
      english: toPart,
      fromText: fromPart,
      toText: toPart,
      isTransformation: true,
      spanish,
    };
  }

  // Check tokenized pattern: "I + can + swim"
  if (english.includes('+')) {
    const tokens = parseFormulaString(english);
    return {
      id: `ex-tok-${index}`,
      rawText: rawLine,
      english: english.replace(/\s*\+\s*/g, ' '),
      tokens,
      spanish,
    };
  }

  return {
    id: `ex-std-${index}`,
    rawText: rawLine,
    english,
    spanish,
  };
}

// ─── MAIN PARSER: PARSE RAW BOARD_CONTENT INTO SECTIONS ──────────────────────

interface MutableSection {
  type: SectionType;
  title?: string;
  icon?: string;
  rawHeader?: string;
  items: string[];
  formulaTokens?: FormulaToken[];
  formulaRaw?: string;
  examples?: ExampleItem[];
  duelPairs?: DuelItem[];
  dialogueSpeaker?: string;
  dialogueResponse?: string;
}

export function parseBoardContentToSections(
  rawContent: string,
  timeline?: PhaseSpeechTimeline
): BoardSection[] {
  if (!rawContent || typeof rawContent !== 'string') return [];

  const rawLines = rawContent
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const sections: BoardSection[] = [];
  let currentSection: MutableSection | null = null;

  const pushCurrentSection = () => {
    if (currentSection && currentSection.items.length > 0) {
      const type = currentSection.type || 'generic';
      const searchText = [
        currentSection.title || '',
        currentSection.formulaRaw || '',
        ...currentSection.items,
      ].join(' ');

      const fallbackRatio = sections.length * 0.15;
      const timing = timeline
        ? findPhraseTiming(searchText, timeline, fallbackRatio)
        : { startRatio: fallbackRatio, endRatio: fallbackRatio + 0.18, found: false };

      sections.push({
        id: `sec-${sections.length}`,
        type,
        title: currentSection.title,
        icon: currentSection.icon,
        rawHeader: currentSection.rawHeader,
        items: currentSection.items,
        formulaTokens: currentSection.formulaTokens,
        formulaRaw: currentSection.formulaRaw,
        examples: currentSection.examples,
        duelPairs: currentSection.duelPairs,
        dialogueSpeaker: currentSection.dialogueSpeaker,
        dialogueResponse: currentSection.dialogueResponse,
        timing,
        searchText,
      });
    }
    currentSection = null;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // 1. Detect Concept Header: 🔑, 💡, 📸, ⭐, 📌
    if (/^[🔑💡📸⭐]/.test(line)) {
      pushCurrentSection();
      const iconMatch = line.match(/^([🔑💡📸⭐])\s*(.*)/);
      currentSection = {
        type: 'concept',
        icon: iconMatch ? iconMatch[1] : '🔑',
        title: iconMatch ? iconMatch[2] : line,
        rawHeader: line,
        items: [],
      };
      continue;
    }

    // 2. Detect Formula Header / Formula Box: 📐 or FÓRMULA
    if (/^📐|^(FÓRMULA|FORMULA|Fórmula)/i.test(line)) {
      pushCurrentSection();
      const cleanHeader = line.replace(/^[📐\s:]+/, '').trim() || 'Fórmula Mágica';
      currentSection = {
        type: 'formula',
        icon: '📐',
        title: cleanHeader,
        rawHeader: line,
        items: [],
      };
      continue;
    }

    // 2.1 Direct Formula in brackets / pipe: | SUJETO + CAN + ... | or [ Sujeto ] + ...
    if (/^[|[]\s*[A-Za-z]+/.test(line) && line.includes('+')) {
      if (!currentSection || currentSection.type !== 'formula') {
        pushCurrentSection();
        currentSection = {
          type: 'formula',
          icon: '📐',
          title: 'Estructura Sintáctica',
          rawHeader: line,
          items: [line],
          formulaRaw: line,
          formulaTokens: parseFormulaString(line),
        };
        pushCurrentSection();
        continue;
      } else {
        currentSection.formulaRaw = line;
        currentSection.formulaTokens = parseFormulaString(line);
        currentSection.items.push(line);
        continue;
      }
    }

    // 3. Detect Affirmative / Positive Examples Header: ✅, AFIRMATIVA
    if (/^✅|^(AFIRMATIVA|Oración Afirmativa|Ejemplos Afirmativos)/i.test(line)) {
      pushCurrentSection();
      const cleanHeader = line.replace(/^[✅\s:]+/, '').trim() || 'Afirmativa';
      currentSection = {
        type: 'examples_pos',
        icon: '✅',
        title: cleanHeader,
        rawHeader: line,
        items: [],
        examples: [],
      };
      continue;
    }

    // 4. Detect Negative Examples Header: ❌, NEGATIVA
    if (/^❌\s*(NEGATIVA|Oración Negativa|Ejemplos Negativos)/i.test(line) || /^NEGATIVA/i.test(line)) {
      pushCurrentSection();
      const cleanHeader = line.replace(/^[❌\s:]+/, '').trim() || 'Negativa';
      currentSection = {
        type: 'examples_neg',
        icon: '❌',
        title: cleanHeader,
        rawHeader: line,
        items: [],
        examples: [],
      };
      continue;
    }

    // 5. Detect Concept Duel / Error Detection: ⚔️
    if (/^⚔️|^(DUELO DE CONCEPTOS|DETECCIÓN DE ERRORES|ANÁLISIS DE ERROR)/i.test(line)) {
      pushCurrentSection();
      currentSection = {
        type: 'duel',
        icon: '⚔️',
        title: line.replace(/^[⚔️\s:]+/, '').trim() || 'Duelo de Conceptos',
        rawHeader: line,
        items: [],
        duelPairs: [],
      };
      continue;
    }

    // 6. Detect Phonetics / Pronunciation: 🗣️
    if (/^🗣️|^(RETO FONÉTICO|CONTRASTE FONÉTICO|PRONUNCIACIÓN)/i.test(line)) {
      pushCurrentSection();
      currentSection = {
        type: 'phonetic',
        icon: '🗣️',
        title: line.replace(/^[🗣️\s:]+/, '').trim() || 'Reto Fonético',
        rawHeader: line,
        items: [],
      };
      continue;
    }

    // 7. Detect Important Note / Golden Rule: ⚠️, 📌 Regla
    if (/^⚠️|^(📌\s*Regla|IMPORTANTE|ATENCIÓN|Clave de articulación)/i.test(line)) {
      pushCurrentSection();
      currentSection = {
        type: 'important',
        icon: '⚠️',
        title: line.replace(/^[⚠️📌\s:]+/, '').trim() || 'Importante',
        rawHeader: line,
        items: [],
      };
      continue;
    }

    // 8. Detect Summary: 🎉, RESUMEN
    if (/^🎉|^(RESUMEN|Resumen de Dominio)/i.test(line)) {
      pushCurrentSection();
      currentSection = {
        type: 'summary',
        icon: '🎉',
        title: line.replace(/^[🎉\s:]+/, '').trim() || 'Resumen de Dominio',
        rawHeader: line,
        items: [],
      };
      continue;
    }

    // 9. Detect Roleplay: 🎭
    if (/^🎭|^(JUEGO DE ROL)/i.test(line)) {
      pushCurrentSection();
      currentSection = {
        type: 'roleplay',
        icon: '🎭',
        title: line.replace(/^[🎭\s:]+/, '').trim() || 'Juego de Rol',
        rawHeader: line,
        items: [],
      };
      continue;
    }

    // 10. Process Body Lines Inside Active Section
    if (!currentSection) {
      currentSection = {
        type: line.startsWith('•') ? 'examples_gen' : 'concept',
        icon: line.startsWith('•') ? '👉' : '💡',
        title: line.startsWith('•') ? 'Puntos Clave' : line,
        items: [],
        examples: [],
      };
    }

    // Handle formula content inside formula section
    if (currentSection.type === 'formula') {
      if (!currentSection.formulaTokens && line.includes('+')) {
        currentSection.formulaRaw = line;
        currentSection.formulaTokens = parseFormulaString(line);
      }
      currentSection.items.push(line);
      continue;
    }

    // Handle duel incorrect/correct lines inside duel section
    if (currentSection.type === 'duel') {
      currentSection.items.push(line);
      if (line.includes('❌') || line.toLowerCase().includes('incorrecto')) {
        const nextLine = rawLines[i + 1] || '';
        if (nextLine.includes('✅') || nextLine.toLowerCase().includes('correcto')) {
          currentSection.duelPairs = currentSection.duelPairs || [];
          currentSection.duelPairs.push({
            id: `duel-${currentSection.duelPairs.length}`,
            incorrect: line.replace(/^[❌\s]*Incorrecto:\s*/i, '').trim(),
            correct: nextLine.replace(/^[✅\s]*Correcto:\s*/i, '').trim(),
          });
          i++; // Skip next line as we consumed it in pair
          currentSection.items.push(nextLine);
          continue;
        }
      }
      continue;
    }

    // Handle examples in positive, negative or general example sections
    if (
      currentSection.type === 'examples_pos' ||
      currentSection.type === 'examples_neg' ||
      currentSection.type === 'examples_gen' ||
      currentSection.type === 'concept'
    ) {
      currentSection.items.push(line);
      currentSection.examples = currentSection.examples || [];
      const parsedEx = parseExampleSentence(line, currentSection.examples.length);
      currentSection.examples.push(parsedEx);
      continue;
    }

    currentSection.items.push(line);
  }

  pushCurrentSection();
  return sections;
}

// ─── COMPONENT: EXPLANATION BOARD ────────────────────────────────────────────

export default function ExplanationBoard({
  boardContent,
  phaseTimeline,
  audioProgress,
  tutorState,
  isFullBoardRevealed,
  onPlayAudio,
  theme = 'chalk',
  className = '',
  hasGrammarCard = false,
}: ExplanationBoardProps) {
  const isChalk = theme === 'chalk';

  // Parse sections
  const sections = useMemo(() => {
    const raw = parseBoardContentToSections(boardContent || '', phaseTimeline);
    if (hasGrammarCard) {
      return raw.filter(s => s.type !== 'formula');
    }
    return raw;
  }, [boardContent, phaseTimeline, hasGrammarCard]);

  if (!boardContent || sections.length === 0) {
    return (
      <div className="bg-black/30 p-5 rounded-2xl border border-white/10 text-center text-white/60 font-chalk text-sm">
        Revisa los conceptos clave de la fase con atención.
      </div>
    );
  }

  const currentRatio = audioProgress / 100;

  return (
    <div className={`space-y-4 w-full transition-all ${className}`}>
      {/* Board Top Accent Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Sparkles size={14} className="animate-pulse" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono">
            Conceptos y Dinámicas de la Pizarra
          </span>
        </div>

        {tutorState === 'speaking' && !isFullBoardRevealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] text-emerald-300 font-mono font-semibold"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Explicando en vivo</span>
          </motion.div>
        )}
      </div>

      {/* Dynamic Sections Feed */}
      <div className="space-y-3.5">
        {sections.map((section, sIdx) => {
          const isActive =
            tutorState === 'speaking' &&
            !isFullBoardRevealed &&
            currentRatio >= section.timing.startRatio &&
            currentRatio <= section.timing.endRatio;

          return (
            <motion.div
              key={section.id || sIdx}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isActive ? 1.015 : 1,
              }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                delay: sIdx * 0.06,
              }}
              className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black/90 shadow-[0_0_35px_rgba(52,211,153,0.35)]'
                  : 'shadow-md'
              } ${
                section.type === 'concept'
                  ? 'bg-gradient-to-r from-sky-950/40 via-black/50 to-blue-950/30 border-sky-400/30'
                  : section.type === 'formula'
                  ? 'bg-black/60 border-amber-400/40 shadow-inner'
                  : section.type === 'examples_pos'
                  ? 'bg-emerald-950/25 border-emerald-400/30'
                  : section.type === 'examples_neg'
                  ? 'bg-rose-950/25 border-rose-400/30'
                  : section.type === 'duel'
                  ? 'bg-purple-950/30 border-purple-400/35'
                  : section.type === 'phonetic'
                  ? 'bg-indigo-950/30 border-indigo-400/35'
                  : section.type === 'important'
                  ? 'bg-amber-950/30 border-amber-400/40'
                  : section.type === 'summary'
                  ? 'bg-teal-950/30 border-teal-400/35'
                  : 'bg-black/40 border-white/10'
              }`}
            >
              {/* Active Highlighting Glow Band */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 via-brand-cyan to-amber-300 animate-pulse" />
              )}

              {/* Section Header */}
              <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/8 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg">{section.icon || '📌'}</span>
                  <h4
                    className={`font-bold tracking-wide ${
                      isChalk ? 'font-chalk text-base sm:text-lg' : 'font-outfit text-sm sm:text-base'
                    } ${
                      section.type === 'concept'
                        ? 'text-sky-300'
                        : section.type === 'formula'
                        ? 'text-amber-300'
                        : section.type === 'examples_pos'
                        ? 'text-emerald-300'
                        : section.type === 'examples_neg'
                        ? 'text-rose-300'
                        : section.type === 'duel'
                        ? 'text-purple-300'
                        : section.type === 'important'
                        ? 'text-amber-300'
                        : 'text-white'
                    }`}
                  >
                    {section.title || section.rawHeader}
                  </h4>
                </div>

                {isActive && (
                  <span className="text-[10px] text-emerald-300 font-mono flex items-center gap-1 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Explicando
                  </span>
                )}
              </div>

              {/* SECTION BODY BY TYPE */}

              {/* 1. FORMULA BLOCK WITH INTERACTIVE PILLS */}
              {section.type === 'formula' && (
                <div className="space-y-3">
                  {section.formulaTokens && section.formulaTokens.length > 0 ? (
                    <div className="flex items-center justify-center flex-wrap gap-2 p-3 sm:p-4 rounded-xl bg-black/50 border border-amber-400/25 shadow-inner">
                      {section.formulaTokens.map((token, tIdx) => {
                        if (token.isOperator) {
                          return (
                            <span
                              key={tIdx}
                              className="text-lg sm:text-xl font-bold font-mono text-amber-400/80 px-1"
                            >
                              {token.text}
                            </span>
                          );
                        }

                        return (
                          <motion.span
                            key={tIdx}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: tIdx * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                            className={`px-3 py-1.5 rounded-xl border font-bold text-xs sm:text-sm tracking-wide transition-all ${getTokenStyle(
                              token.role,
                              isChalk
                            )}`}
                          >
                            {token.text}
                          </motion.span>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Additional notes in formula */}
                  {section.items
                    .filter(item => !item.includes('+') && !item.startsWith('📐'))
                    .map((item, itIdx) => (
                      <p
                        key={itIdx}
                        className={`text-xs sm:text-sm text-white/80 leading-relaxed ${
                          isChalk ? 'font-chalk' : ''
                        }`}
                      >
                        {item}
                      </p>
                    ))}
                </div>
              )}

              {/* 2. EXAMPLES (AFFIRMATIVE / NEGATIVE / GENERAL) */}
              {(section.type === 'examples_pos' ||
                section.type === 'examples_neg' ||
                section.type === 'examples_gen' ||
                section.type === 'concept') &&
                section.examples &&
                section.examples.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {section.examples.map((ex, exIdx) => {
                      return (
                        <motion.div
                          key={ex.id || exIdx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: exIdx * 0.06 }}
                          className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                            section.type === 'examples_pos'
                              ? 'bg-emerald-950/20 border-emerald-400/20 hover:border-emerald-400/40'
                              : section.type === 'examples_neg'
                              ? 'bg-rose-950/20 border-rose-400/20 hover:border-rose-400/40'
                              : 'bg-black/30 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex-1 space-y-1">
                            {/* Tokenized Chips if line had '+' */}
                            {ex.tokens && ex.tokens.length > 0 ? (
                              <div className="flex items-center flex-wrap gap-1">
                                {ex.tokens.map((tok, tIdx) => {
                                  if (tok.isOperator) {
                                    return (
                                      <span key={tIdx} className="text-xs font-mono text-white/40 font-bold px-0.5">
                                        {tok.text}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span
                                      key={tIdx}
                                      className={`text-xs px-2 py-0.5 rounded-lg border font-semibold ${getTokenStyle(
                                        tok.role,
                                        isChalk
                                      )}`}
                                    >
                                      {tok.text}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : ex.isTransformation ? (
                              /* Transformation Pair: go (ir) → went (fui / fue) */
                              <div className="flex items-center gap-2 text-xs sm:text-sm">
                                <span className="text-white/70 font-mono">{ex.fromText}</span>
                                <ArrowRight size={13} className="text-brand-cyan" />
                                <span className="font-bold text-brand-cyan font-mono">{ex.toText}</span>
                              </div>
                            ) : (
                              /* Standard English Phrase */
                              <p className={`font-bold text-white text-xs sm:text-sm tracking-wide ${isChalk ? 'font-chalk text-sm sm:text-base' : ''}`}>
                                {ex.english}
                              </p>
                            )}

                            {/* Spanish Translation */}
                            {ex.spanish && (
                              <p className="text-[11px] text-white/60 italic leading-tight">
                                {ex.spanish}
                              </p>
                            )}
                          </div>

                          {/* Individual Audio Button */}
                          {onPlayAudio && ex.english && (
                            <button
                              type="button"
                              onClick={() => onPlayAudio(ex.english)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-brand-cyan border border-white/10 transition-all hover:scale-110 flex-shrink-0"
                              title={`Escuchar pronunciación: "${ex.english}"`}
                            >
                              <Volume2 size={12} />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}

              {/* 3. DUEL OF CONCEPTS (CORRECT VS INCORRECT) */}
              {section.type === 'duel' && section.duelPairs && section.duelPairs.length > 0 && (
                <div className="space-y-2.5">
                  {section.duelPairs.map((duel, dIdx) => (
                    <div
                      key={duel.id || dIdx}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-purple-400/20"
                    >
                      {/* Incorrect Card */}
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-rose-950/20 border border-rose-500/30">
                        <XCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-rose-300 block">Incorrecto</span>
                          <span className="text-xs sm:text-sm text-white/80 line-through decoration-rose-400/80 font-mono">
                            {duel.incorrect}
                          </span>
                        </div>
                      </div>

                      {/* Correct Card */}
                      <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Correcto</span>
                            <span className="text-xs sm:text-sm text-emerald-200 font-bold font-mono">
                              {duel.correct}
                            </span>
                          </div>
                        </div>

                        {onPlayAudio && (
                          <button
                            type="button"
                            onClick={() => onPlayAudio(duel.correct)}
                            className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/30 transition-all flex-shrink-0"
                            title="Escuchar forma correcta"
                          >
                            <Volume2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. IMPORTANT NOTE / GOLDEN RULE BANNER */}
              {section.type === 'important' && (
                <div className="space-y-2">
                  {section.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="flex items-start gap-2 text-xs sm:text-sm text-amber-100 leading-relaxed font-chalk text-base"
                    >
                      <Zap size={14} className="text-amber-400 flex-shrink-0 mt-1" />
                      <span>{item.replace(/^[•\-*⚠️\s]+/, '')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 5. SUMMARY CHECKLIST */}
              {section.type === 'summary' && (
                <div className="space-y-1.5">
                  {section.items.map((item, sIdx2) => (
                    <div
                      key={sIdx2}
                      className="flex items-center gap-2 text-xs sm:text-sm text-teal-100 font-chalk text-base"
                    >
                      <Check size={14} className="text-teal-400 flex-shrink-0" />
                      <span>{item.replace(/^[✔•\-*\s]+/, '')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 6. GENERIC OR PHONETICS FALLBACK LINES */}
              {(section.type === 'generic' || section.type === 'phonetic' || section.type === 'roleplay') && (
                <div className="space-y-1.5">
                  {section.items.map((item, gIdx) => (
                    <p
                      key={gIdx}
                      className={`text-xs sm:text-sm text-white/85 leading-relaxed ${
                        isChalk ? 'font-chalk text-sm sm:text-base' : ''
                      }`}
                    >
                      {item}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
