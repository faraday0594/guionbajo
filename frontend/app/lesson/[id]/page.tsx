'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api, playTTS, stopTutorVoice, playEnglishAudio, setSavedPreferredVoice } from '@/lib/api';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';
import MicButton from '@/app/components/TutorPanel/MicButton';
import ScoreDisplay from '@/app/components/TutorPanel/ScoreDisplay';
import GrammarStructureCard from '@/app/components/GrammarStructureCard';
import ExplanationBoard from '@/app/components/ExplanationBoard';
import DynamicSubtitles from '@/app/components/DynamicSubtitles';
import MicroPhoneticCard from '@/app/components/MicroPhoneticCard';
import PhoneticBoard from '@/app/components/PhoneticBoard';
import LiveStoryboardController, { StoryboardStep } from '@/app/components/LiveStoryboardController';
import TimelineVisualRenderer, { TimelineStep } from '@/app/components/TimelineVisualRenderer';
import InteractiveExerciseStage from '@/app/components/InteractiveExerciseStage';
import {
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  HelpCircle,
  RotateCcw,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Lightbulb,
  Volume2,
  Eye,
  EyeOff,
  Maximize2,
  ZoomIn,
  X,
  Mic,
  Square,
  Film,
  CheckCircle2,
  AlertCircle,
  Award,
  Subtitles,
  Gamepad2,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { sfx } from '@/lib/soundEffects';
import GameArena from '@/app/components/games/GameArena';
import ReadingPracticeArena from '@/app/components/reading/ReadingPracticeArena';

// ─── HELPER: Strict English Phrase & Pronunciation Target Validator ──────────
const GRAMMAR_AND_SPANISH_DISQUALIFIERS: string[] = [
  'regla', 'regla de oro', 'nota', 'consejo', 'clave', 'importante', 'atención',
  'objetivo', 'explicación', 'fórmula', 'pizarra', 'ejemplo', 'ejemplos',
  'traducción', 'significado', 'tema', 'resumen', 'incorrecto', 'correcto',
  'situación', 'desafío', 'pregunta', 'respuesta', 'recuerda', 'cuidado',
  'error', 'vocabulario', 'práctica', 'patrón', 'tren', 'locomotora', 'vagones',
  'subject-verb agreement', 'subject', 'verb', 'complement', 'structure',
  'grammar', 'rules', 'pattern', 'agreement', 'concordancia', 'plurals',
  'plural', 'singular', 'third person', 'morpheme', 'syntax', 'pronouns',
  'i/you', 'he/she/it', 'he/she', 's/es', 'do/does', 'was/were', 'is/are',
  'sujetos', 'sujeto', 'verbo', 'tercera persona', 'primera persona'
];

export function isValidEnglishTargetPhrase(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const cleaned = text.trim().replace(/^['"“‘`]+|['"”’`]+$/g, '').trim();
  if (cleaned.length < 3) return false;

  // Disqualify if it contains syntax/math/bracket symbols
  if (/[/\\|\[\](){}+=→<>_~*#^]/.test(cleaned)) return false;

  // Disqualify if contains Spanish accents or Spanish inverted punctuation
  if (/[áéíóúÁÉÍÓÚñÑ¿¡]/.test(cleaned)) return false;

  const lower = cleaned.toLowerCase().trim();
  if (GRAMMAR_AND_SPANISH_DISQUALIFIERS.includes(lower)) return false;

  for (let i = 0; i < GRAMMAR_AND_SPANISH_DISQUALIFIERS.length; i++) {
    const dq = GRAMMAR_AND_SPANISH_DISQUALIFIERS[i];
    if (lower.startsWith(`${dq}:` ) || lower.startsWith(`${dq} `) || lower.endsWith(`: ${dq}`)) {
      return false;
    }
  }

  // Must contain standard English letters
  if (!/[A-Za-z]/.test(cleaned)) return false;

  // Disqualify if contains Spanish functional/grammatical words
  const words = lower.split(/\s+/);
  if (words.some(w => ['de', 'la', 'el', 'los', 'las', 'en', 'un', 'una', 'sujeto', 'verbo', 'oro', 'regla', 'persona', 'plurales', 'oración'].includes(w))) {
    return false;
  }

  // If only 1 single letter/pronoun, reject
  if (words.length === 1 && ['i', 'he', 'she', 'it', 'we', 'they', 'you', 's', 'es', 'ed', 'ing'].includes(words[0])) {
    return false;
  }

  return true;
}

function extractEnglishPhrase(line: string): string | null {
  if (!line || typeof line !== 'string') return null;
  const cleaned = line.trim();
  if (cleaned.length < 3) return null;

  // Ignore lines with flag emojis, header emojis, or Spanish titles/notes
  if (
    cleaned.includes('🇪🇸') ||
    cleaned.includes('🇬🇧') ||
    cleaned.includes('🎯') ||
    cleaned.includes('💡') ||
    cleaned.includes('📌') ||
    cleaned.includes('🗣️') ||
    cleaned.includes('❌') ||
    cleaned.includes('✅') ||
    cleaned.includes('🎭') ||
    cleaned.includes('🎉')
  ) {
    return null;
  }

  // 1. Matches quoted full sentences: "I study English every day", "You should see a doctor"
  let m = cleaned.match(/["'“‘]([A-Za-z0-9\s',!\?\-\.]{3,})["'”’]/);
  if (m && m[1].trim().length > 2) {
    const candidate = m[1].trim();
    if (isValidEnglishTargetPhrase(candidate)) {
      return candidate;
    }
  }

  // 2. Matches bullet item with clean English sentence before translation
  m = cleaned.match(/(?:^[•\-*]|\d+[\.\)]\s*)\s*([A-Za-z\s',!\?\-\.]{3,})\s*(?:—|–|-|→|=|\(|\/)\s*[\u00C0-\u024F\w\s',!\?\-\.\(\)]+/);
  if (m && m[1] && m[1].trim().length > 2) {
    const candidate = m[1].trim();
    if (isValidEnglishTargetPhrase(candidate)) {
      return candidate;
    }
  }

  return null;
}

// ─── HELPER: High-Yield Target Audio Item Extractor ───────────────────────────
function extractTargetAudioItems(phase: any): Array<{ english: string; translation?: string; label?: string }> {
  if (!phase) return [];

  // 1. If explicit clean target_audio_items are provided by AI Tutor Agent, use them directly
  if (phase.target_audio_items && Array.isArray(phase.target_audio_items) && phase.target_audio_items.length > 0) {
    const cleanList = phase.target_audio_items.filter((it: any) => isValidEnglishTargetPhrase(it.english));
    if (cleanList.length > 0) {
      return cleanList.slice(0, 3);
    }
  }

  // 2. Extract high-confidence real English sentences from example breakdowns & expected answers
  const items: Array<{ english: string; translation?: string; label?: string }> = [];
  const seen = new Set<string>();

  const addItem = (eng: any, translation = '', label = 'Práctica de Pronunciación') => {
    if (!eng || typeof eng !== 'string') return;
    const cleaned = eng.trim().replace(/^['"“‘`]+|['"”’`]+$/g, '').trim();
    if (!isValidEnglishTargetPhrase(cleaned)) return;
    if (seen.has(cleaned.toLowerCase())) return;
    seen.add(cleaned.toLowerCase());
    items.push({ english: cleaned, translation, label });
  };

  // From grammar structure example breakdowns (highest quality source)
  if (phase.grammar_structure?.example_breakdowns && Array.isArray(phase.grammar_structure.example_breakdowns)) {
    phase.grammar_structure.example_breakdowns.forEach((ex: any) => {
      if (ex.english && isValidEnglishTargetPhrase(ex.english)) {
        addItem(ex.english, ex.spanish || '', 'Ejemplo Práctico');
      }
    });
  }

  // From expected answer (for interactive speaking tasks)
  if (phase.expected_answer && isValidEnglishTargetPhrase(phase.expected_answer)) {
    addItem(phase.expected_answer, '', 'Frase Objetivo');
  }

  // Limit to at most 2-3 high-value practice cards per phase
  return items.slice(0, 3);
}

// ─── HELPER: Render text content with individual audio buttons ───────────────
function renderTextContent(content: any, onPlayAudio?: (text: string) => void): React.ReactNode {
  if (content === null || content === undefined) return null;

  if (typeof content === 'string') {
    const lines = content.split('\n');
    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          if (!line || !line.trim()) return <div key={idx} className="h-1" />;
          const englishPhrase = extractEnglishPhrase(line);
          return (
            <div key={idx} className="flex items-center justify-between gap-2 flex-wrap group/line py-0.5">
              <span className="flex-1 leading-relaxed">{line}</span>
              {englishPhrase && onPlayAudio && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayAudio(englishPhrase);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/30 transition-all text-xs font-semibold shadow-sm hover:scale-105 flex-shrink-0"
                  title={`Escuchar pronunciación: "${englishPhrase}"`}
                >
                  <Volume2 size={13} className="text-brand-cyan animate-pulse" />
                  <span>Escuchar</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (typeof content === 'number' || typeof content === 'boolean') {
    return String(content);
  }

  if (typeof content === 'object') {
    if (Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((item, idx) => (
            <div key={idx} className="pl-2 border-l-2 border-brand-cyan/30">
              {renderTextContent(item, onPlayAudio)}
            </div>
          ))}
        </div>
      );
    }

    const { title, items, text, description, rules, examples } = content;
    return (
      <div className="space-y-3">
        {title && <div className="font-bold text-white text-base mb-1">{renderTextContent(title, onPlayAudio)}</div>}
        {text && <div>{renderTextContent(text, onPlayAudio)}</div>}
        {description && <div className="text-brand-text-secondary text-xs mb-2">{renderTextContent(description, onPlayAudio)}</div>}
        {items && Array.isArray(items) && (
          <div className="space-y-2">
            {items.map((it: any, idx: number) => (
              <div key={idx}>{renderTextContent(it, onPlayAudio)}</div>
            ))}
          </div>
        )}
        {rules && Array.isArray(rules) && (
          <div className="space-y-2 mt-2">
            {rules.map((r: any, idx: number) => (
              <div key={idx} className="text-xs font-semibold text-brand-gold bg-brand-gold/10 p-2.5 rounded-xl border border-brand-gold/20">
                📌 {renderTextContent(r, onPlayAudio)}
              </div>
            ))}
          </div>
        )}
        {examples && Array.isArray(examples) && (
          <div className="space-y-2 mt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-cyan mb-1">Ejemplos Prácticos:</div>
            {examples.map((ex: any, idx: number) => (
              <div key={idx} className="bg-brand-surface/60 p-2.5 rounded-xl border border-brand-cyan/20">
                {renderTextContent(ex, onPlayAudio)}
              </div>
            ))}
          </div>
        )}
        {!title && !items && !text && !rules && !examples && (
          <div className="space-y-2">
            {Object.entries(content).map(([k, v], idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <strong className="text-brand-gold text-xs uppercase">{k}:</strong>
                <div>{renderTextContent(v, onPlayAudio)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return String(content);
}

// ─── HELPER: Typography Classes ──────────────────────────────────────────────
function getFontClass(fontKey?: string): string {
  switch (fontKey) {
    case 'chalk': return 'font-chalk';
    case 'mono': return 'font-mono-custom';
    case 'serif': return 'font-serif-custom';
    case 'rounded': return 'font-rounded';
    case 'bold_display': return 'font-outfit font-extrabold';
    case 'handwriting': return 'font-handwriting';
    default: return 'font-outfit';
  }
}

// ─── HELPER: Extract Lines from board_content ────────────────────────────────
function extractBoardLines(content: any): string[] {
  if (!content) return [];
  if (typeof content === 'string') {
    return content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }
  if (Array.isArray(content)) {
    return content.flatMap(item => extractBoardLines(item));
  }
  if (typeof content === 'object') {
    const lines: string[] = [];
    if (content.title) lines.push(`📌 ${content.title}`);
    if (content.text) lines.push(String(content.text));
    if (content.description) lines.push(String(content.description));
    if (content.items && Array.isArray(content.items)) {
      content.items.forEach((it: any) => lines.push(`• ${typeof it === 'string' ? it : JSON.stringify(it)}`));
    }
    if (content.rules && Array.isArray(content.rules)) {
      content.rules.forEach((r: any) => lines.push(`⚡ Regla: ${typeof r === 'string' ? r : JSON.stringify(r)}`));
    }
    if (content.examples && Array.isArray(content.examples)) {
      content.examples.forEach((ex: any) => lines.push(`👉 Ejemplo: ${typeof ex === 'string' ? ex : JSON.stringify(ex)}`));
    }
    if (lines.length === 0) {
      Object.entries(content).forEach(([k, v]) => {
        lines.push(`• ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
      });
    }
    return lines;
  }
  return [String(content)];
}

// ─── HELPER: Board Theme Classes ─────────────────────────────────────────────
function getBoardThemeClass(theme?: string): string {
  // Always enforce the authentic green chalkboard as the universal primary container
  return 'board-chalkboard-green chalk-stage rounded-3xl p-5 sm:p-7 shadow-2xl flex-1 flex flex-col transition-all';
}

// ─── HELPER: Number Word Normalization for Speech Recognition ─────────────────
const DIGIT_TO_WORD_MAP: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
  '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
  '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
  '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty',
  '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy',
  '80': 'eighty', '90': 'ninety', '100': 'one hundred',
};

function normalizeNumberWords(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\b(\d+)\b/g, (match, digit) => DIGIT_TO_WORD_MAP[digit] || match);
}

// ─── HELPER: Fallback & Preloading Utilities for Images ───────────────────────
function sanitizeImagePrompt(prompt: string, topic: string, phaseIdx = 0): string {
  let clean = prompt || '';

  // 1. Remove IPA phonetic notations like /e/, /æ/, /iː/, /ʌ/, /ʃ/
  clean = clean.replace(/\/[A-Za-zʃʊʌæəɪɔɑɜθðʒŋːˈ\.\s]+\//g, ' ');

  // 2. Remove words that trigger fighting cartoon or textual artifacts
  clean = clean.replace(/\b(?:duel|versus|vs|fight|fighting|boxers|boxing ring|boxing gloves|letters|phoneme|alphabet|spelling|text|characters|subtitles)\b/gi, 'educational scene');

  // 3. Remove quotes, symbols, brackets
  clean = clean.replace(/[/\\|\[\](){}+=→<>_~*#^"“”‘’`]/g, ' ');
  clean = clean.replace(/\s{2,}/g, ' ').trim();

  // If the prompt is too empty or short, build a rich didactic human scene
  if (clean.length < 12) {
    const cleanTopic = topic.replace(/\/[^\/]+\//g, '').replace(/Laboratorio Fonético/i, 'English conversation practice').trim();
    clean = `vibrant 2D digital vector educational illustration of a student learning ${cleanTopic || 'English language'} in a cozy modern study room with books and laptop, warm atmospheric lighting, colorful aesthetic`;
  }

  const negativeSuffix = 'vibrant 2D educational digital illustration, modern relatable setting, warm ambient lighting, expressive characters, rich colors, clean composition, strictly no text, no letters, no words, no writing, no labels, no captions, no typography, no watermarks, no alphabets';

  return clean.toLowerCase().includes('no text') ? clean : `${clean}, ${negativeSuffix}`;
}

function getFallbackImageUrl(prompt: string, topic: string, phaseIdx = 0): string {
  const cleanPrompt = sanitizeImagePrompt(prompt, topic, phaseIdx);
  const seed = (cleanPrompt + topic + phaseIdx).split('').reduce((acc: number, c: string) => (acc * 31 + c.charCodeAt(0)) & 0x7fffffff, 17);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=576&model=flux&nologo=true&enhance=false&seed=${seed}`;
}

function preloadImage(url: string, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || typeof window === 'undefined') { resolve(false); return; }
    const img = new Image();
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; resolve(false); }
    }, timeoutMs);
    img.onload = () => {
      if (!done) { done = true; clearTimeout(timer); resolve(true); }
    };
    img.onerror = () => {
      if (!done) { done = true; clearTimeout(timer); resolve(false); }
    };
    img.src = url;
  });
}

// ─── HELPER: Parse Interactive Exercises from Board Content & Task ─────────────
export interface ParsedExercise {
  id: string;
  index: number;
  question: string;
  options: string[];
  cleanSentence: string;
}

function parseExercisesAndBoardLines(
  boardContent: any,
  studentTask: any,
  phaseNumber = 1,
  interactionType = ''
): {
  cleanBoardLines: string[];
  exercises: ParsedExercise[];
  instructionHeader?: string;
} {
  const allLines = extractBoardLines(boardContent);
  const cleanBoardLines: string[] = [];
  const exercises: ParsedExercise[] = [];
  let instructionHeader = '';

  // Phase 1 (Warmup/Greeting) and pure explanation phases MUST NEVER display interactive exercises
  if (phaseNumber === 1 || interactionType === 'explanation') {
    return { cleanBoardLines: allLines, exercises: [], instructionHeader: '' };
  }

  let i = 0;
  while (i < allLines.length) {
    const line = allLines[i].trim();

    // Check if line is an exercise title / instruction header
    const isQuizHeader = /^(?:✏️|🎯|📝|📌)?\s*(?:COMPLETE|COMPLETA|FILL IN|ELIGE|CHOOSE|SELECCIONA|MATCH|RESPONDE|EXERCISE|EJERCICIO)\b/i.test(line);

    // Check if line is a numbered or bulleted exercise with real fill-in-the-blank or multiple choice options
    const isNumberedItem = /^(?:\d+[\.\)\-:]|\•|\-)\s+/i.test(line);
    const hasBlankOrOptions = line.includes('___') || line.includes('_____') || /\b(?:Opciones|Options)\s*:/i.test(line) || /\[\s*[A-Za-z0-9\s'-]+\s*(?:\/|\|)\s*[A-Za-z0-9\s'-]+\s*\]/.test(line);

    if (isQuizHeader && (hasBlankOrOptions || i + 1 < allLines.length)) {
      instructionHeader = line.replace(/^(?:✏️|🎯|📝|📌)\s*/, '').trim();
      i++;
      continue;
    }

    if (isNumberedItem && (hasBlankOrOptions || (i + 1 < allLines.length && /\b(?:Opciones|Options)\s*:/i.test(allLines[i + 1])))) {
      const rawQuestion = line.replace(/^(?:\d+[\.\)\-:]|\•|\-)\s*/, '').trim();
      let options: string[] = [];

      // Extract inline options like [a / b / c] or (a / b / c)
      const inlineOptMatch = rawQuestion.match(/\[([^\]]+)\]|\(([^\)]+)\)/);
      let cleanQuestion = rawQuestion;
      if (inlineOptMatch) {
        const optStr = inlineOptMatch[1] || inlineOptMatch[2];
        if (optStr && (optStr.includes('/') || optStr.includes('|') || optStr.includes(','))) {
          options = optStr.split(/[\/\|,]/).map(o => o.trim().replace(/^['"“‘]+|['"”’]+$/g, '')).filter(Boolean);
          cleanQuestion = rawQuestion.replace(inlineOptMatch[0], '').trim();
        }
      }

      // Check if next line contains "Opciones: ..." or "Options: ..."
      if (i + 1 < allLines.length && /\b(?:Opciones|Options)\s*:/i.test(allLines[i + 1])) {
        const optLine = allLines[i + 1].replace(/\b(?:Opciones|Options)\s*:\s*/i, '').trim();
        options = optLine.split(/[\/\|,]/).map(o => o.trim().replace(/^['"“‘]+|['"”’]+$/g, '')).filter(Boolean);
        i++; // skip options line
      }

      exercises.push({
        id: `ex-${exercises.length}`,
        index: exercises.length + 1,
        question: cleanQuestion || rawQuestion,
        options,
        cleanSentence: cleanQuestion || rawQuestion,
      });

      i++;
      continue;
    }

    // Otherwise it's a regular concept / pedagogical rule line
    cleanBoardLines.push(line);
    i++;
  }

  // If no exercises were found in board_content, check student_task (only for non-explanation phases)
  if (exercises.length === 0 && typeof studentTask === 'string') {
    const taskLines = studentTask.split('\n').map(l => l.trim()).filter(Boolean);
    taskLines.forEach((tLine) => {
      const isNumbered = /^(?:\d+[\.\)\-:]|\•|\-)\s+/i.test(tLine);
      const hasBlank = tLine.includes('___') || /\[\s*[A-Za-z0-9\s'-]+\s*(?:\/|\|)\s*[A-Za-z0-9\s'-]+\s*\]/.test(tLine);
      if (isNumbered && hasBlank) {
        const rawQ = tLine.replace(/^(?:\d+[\.\)\-:]|\•|\-)\s*/, '').trim();
        let opts: string[] = [];
        const optMatch = rawQ.match(/\[([^\]]+)\]|\(([^\)]+)\)/);
        let cleanQ = rawQ;
        if (optMatch) {
          const optStr = optMatch[1] || optMatch[2];
          if (optStr && (optStr.includes('/') || optStr.includes('|') || optStr.includes(','))) {
            opts = optStr.split(/[\/\|,]/).map(o => o.trim().replace(/^['"“‘]+|['"”’]+$/g, '')).filter(Boolean);
            cleanQ = rawQ.replace(optMatch[0], '').trim();
          }
        }
        exercises.push({
          id: `ex-${exercises.length}`,
          index: exercises.length + 1,
          question: cleanQ || rawQ,
          options: opts,
          cleanSentence: cleanQ || rawQ,
        });
      }
    });
  }

  return { cleanBoardLines, exercises, instructionHeader };
}

const FREQUENCY_TIMELINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a101d"/>
      <stop offset="100%" stop-color="#141e33"/>
    </linearGradient>
    <linearGradient id="timeLineGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="700" height="380" rx="16" fill="url(#chalkBg)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#f8fafc">TIMELINE: HABITS &amp; FREQUENCY ADVERBS</text>
  <text x="350" y="60" font-family="system-ui, -apple-system, sans-serif" font-size="12" text-anchor="middle" fill="#38bdf8">Visualización de repetición en el tiempo hacia el presente</text>
  <line x1="60" y1="140" x2="640" y2="140" stroke="url(#timeLineGrad)" stroke-width="3" stroke-linecap="round"/>
  <polygon points="640,140 626,134 626,146" fill="#c084fc"/>
  <circle cx="120" cy="140" r="7" fill="#0ea5e9" filter="url(#glow)"/>
  <text x="120" y="170" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#7dd3fc">PAST</text>
  <text x="120" y="185" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#94a3b8">(Pasado)</text>
  <line x1="350" y1="95" x2="350" y2="185" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4"/>
  <circle cx="350" cy="140" r="11" fill="#f59e0b" filter="url(#glow)"/>
  <rect x="305" y="90" width="90" height="24" rx="12" fill="#f59e0b" />
  <text x="350" y="106" font-family="system-ui, sans-serif" font-size="12" font-weight="900" text-anchor="middle" fill="#000">NOW (Hoy)</text>
  <text x="350" y="202" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fbbf24">PRESENTE</text>
  <circle cx="580" cy="140" r="7" fill="#10b981" filter="url(#glow)"/>
  <text x="580" y="170" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#6ee7b7">FUTURE</text>
  <text x="580" y="185" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#94a3b8">(Futuro)</text>
  <g filter="url(#glow)">
    <circle cx="170" cy="140" r="5" fill="#38bdf8"/>
    <circle cx="215" cy="140" r="5" fill="#38bdf8"/>
    <circle cx="260" cy="140" r="5" fill="#38bdf8"/>
    <circle cx="305" cy="140" r="5" fill="#38bdf8"/>
  </g>
  <path d="M 170 125 Q 260 100 340 125" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="255" y="112" font-family="system-ui, sans-serif" font-size="11" font-weight="600" text-anchor="middle" fill="#38bdf8">Acciones Repetidas / Rutina</text>
  <rect x="40" y="225" width="620" height="135" rx="12" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
  <g transform="translate(65, 245)">
    <rect x="0" y="0" width="115" height="42" rx="8" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.4)"/>
    <text x="12" y="18" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#34d399">ALWAYS</text>
    <text x="95" y="18" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#10b981">100%</text>
    <text x="12" y="32" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Siempre</text>
  </g>
  <g transform="translate(195, 245)">
    <rect x="0" y="0" width="115" height="42" rx="8" fill="rgba(6,182,212,0.12)" stroke="rgba(6,182,212,0.4)"/>
    <text x="12" y="18" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#38bdf8">USUALLY</text>
    <text x="95" y="18" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#06b6d4">80%</text>
    <text x="12" y="32" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Usualmente</text>
  </g>
  <g transform="translate(325, 245)">
    <rect x="0" y="0" width="115" height="42" rx="8" fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.4)"/>
    <text x="10" y="18" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#fbbf24">SOMETIMES</text>
    <text x="95" y="18" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#f59e0b">50%</text>
    <text x="10" y="32" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">A veces</text>
  </g>
  <g transform="translate(455, 245)">
    <rect x="0" y="0" width="115" height="42" rx="8" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.4)"/>
    <text x="12" y="18" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#f87171">NEVER</text>
    <text x="95" y="18" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#ef4444">0%</text>
    <text x="12" y="32" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8">Nunca</text>
  </g>
  <g transform="translate(65, 305)">
    <rect x="0" y="0" width="570" height="40" rx="8" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
    <text x="285" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#e0e7ff">
      FÓRMULA: <tspan fill="#38bdf8">[ Sujeto ]</tspan> + <tspan fill="#34d399">[ Adverbio ]</tspan> + <tspan fill="#fbbf24">[ Verbo ]</tspan> + <tspan fill="#cbd5e1">[ Complemento ]</tspan>  ➔  "I always drink coffee"
    </text>
  </g>
</svg>`;

const PAST_CONTINUOUS_TIMELINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBgPC" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a101d"/><stop offset="100%" stop-color="#141e33"/></linearGradient>
    <filter id="glowPC" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="700" height="380" rx="16" fill="url(#chalkBgPC)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="36" font-family="system-ui, sans-serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#f8fafc">TIMELINE: PAST CONTINUOUS &amp; INTERRUPTED ACTIONS</text>
  <text x="350" y="56" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#38bdf8">Acción en progreso continuo (fondo) interrumpida por un evento súbito</text>
  <line x1="50" y1="130" x2="650" y2="130" stroke="#334155" stroke-width="2.5" stroke-linecap="round"/>
  <polygon points="650,130 636,124 636,136" fill="#64748b"/>
  <text x="70" y="160" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#64748b">PAST</text>
  <rect x="130" y="112" width="280" height="36" rx="18" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" stroke-width="2" filter="url(#glowPC)"/>
  <path d="M 145 130 Q 165 120 185 130 T 225 130 T 265 130 T 305 130 T 345 130 T 385 130" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="3,3"/>
  <text x="270" y="100" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#38bdf8">ACCIÓN EN PROGRESO (Past Continuous)</text>
  <text x="270" y="165" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#7dd3fc">"I was cooking dinner..." (was/were + -ing)</text>
  <g transform="translate(290, 85)" filter="url(#glowPC)">
    <line x1="0" y1="0" x2="0" y2="65" stroke="#ef4444" stroke-width="3"/>
    <polygon points="0,68 -6,55 6,55" fill="#ef4444"/>
    <circle cx="0" cy="45" r="13" fill="#ef4444"/>
    <text x="0" y="50" font-family="system-ui, sans-serif" font-size="13" font-weight="900" text-anchor="middle" fill="#fff">⚡</text>
  </g>
  <rect x="235" y="60" width="160" height="22" rx="6" fill="#ef4444"/>
  <text x="315" y="75" font-family="system-ui, sans-serif" font-size="11" font-weight="900" text-anchor="middle" fill="#fff">INTERRUPCIÓN (Past Simple)</text>
  <text x="315" y="185" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#f87171">"...when the phone rang!"</text>
  <line x1="530" y1="95" x2="530" y2="165" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4"/>
  <circle cx="530" cy="130" r="9" fill="#f59e0b" filter="url(#glowPC)"/>
  <text x="530" y="160" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fbbf24">NOW</text>
  <text x="530" y="175" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#94a3b8">(Presente)</text>
  <g transform="translate(45, 215)">
    <rect x="0" y="0" width="610" height="65" rx="10" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
    <text x="15" y="25" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#38bdf8">1. Con WHEN (Acción en progreso + WHEN + Interrupción puntual):</text>
    <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" fill="#e2e8f0">
      <tspan fill="#7dd3fc">I was studying</tspan> + <tspan fill="#ef4444" font-weight="bold">WHEN</tspan> + <tspan fill="#fca5a5">the lights went out</tspan>.
    </text>
  </g>
  <g transform="translate(45, 290)">
    <rect x="0" y="0" width="610" height="65" rx="10" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
    <text x="15" y="25" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#34d399">2. Con WHILE (WHILE + Acción en progreso , Interrupción puntual):</text>
    <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" fill="#e2e8f0">
      <tspan fill="#34d399" font-weight="bold">WHILE</tspan> <tspan fill="#7dd3fc">she was driving</tspan>, <tspan fill="#fca5a5">it started to rain</tspan>.
    </text>
  </g>
</svg>`;

const THERE_IS_THERE_ARE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBgThere" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a101d"/><stop offset="100%" stop-color="#141e33"/></linearGradient>
    <filter id="glowThere" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="700" height="380" rx="16" fill="url(#chalkBgThere)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="34" font-family="system-ui, sans-serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#f8fafc">MAPA CONCEPTUAL: THERE IS vs THERE ARE &amp; PREPOSITIONS</text>
  <text x="350" y="54" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#38bdf8">Concordancia gramatical de existencia y ubicación en el espacio</text>

  <!-- Left Card: THERE IS (Singular) -->
  <g transform="translate(45, 75)">
    <rect x="0" y="0" width="295" height="150" rx="12" fill="rgba(192,132,252,0.12)" stroke="#c084fc" stroke-width="1.5"/>
    <rect x="15" y="15" width="265" height="28" rx="6" fill="#7e22ce"/>
    <text x="147" y="34" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#fff">THERE IS + SINGULAR / 1 OBJETO</text>
    <text x="20" y="70" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#c084fc">✓ Con &apos;a / an&apos; o incontables:</text>
    <text x="30" y="90" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">&quot;There is <tspan fill="#38bdf8" font-weight="bold">a bank</tspan> near the park&quot;</text>
    <text x="30" y="110" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">&quot;There is <tspan fill="#38bdf8" font-weight="bold">some water</tspan> on the table&quot;</text>
    <text x="20" y="132" font-family="system-ui, sans-serif" font-size="10" fill="#a855f7">Pronunciación: /ðeər ɪz/ (&quot;ther-iz&quot;)</text>
  </g>

  <!-- Right Card: THERE ARE (Plural) -->
  <g transform="translate(360, 75)">
    <rect x="0" y="0" width="295" height="150" rx="12" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" stroke-width="1.5"/>
    <rect x="15" y="15" width="265" height="28" rx="6" fill="#0284c7"/>
    <text x="147" y="34" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#fff">THERE ARE + PLURAL / 2+ OBJETOS</text>
    <text x="20" y="70" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#38bdf8">✓ Con números (two, three...) o &apos;many/some&apos;:</text>
    <text x="30" y="90" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">&quot;There are <tspan fill="#34d399" font-weight="bold">two banks</tspan> on this street&quot;</text>
    <text x="30" y="110" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">&quot;There are <tspan fill="#34d399" font-weight="bold">many parks</tspan> in this city&quot;</text>
    <text x="20" y="132" font-family="system-ui, sans-serif" font-size="10" fill="#38bdf8">Pronunciación: /ðeər ɑːr/ (&quot;ther-ar&quot;)</text>
  </g>

  <!-- Bottom Spatial Prepositions Box -->
  <g transform="translate(45, 240)">
    <rect x="0" y="0" width="610" height="120" rx="12" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
    <text x="20" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#fbbf24">📍 PREPOSICIONES DE UBICACIÓN (SPATIAL RELATIONS):</text>
    
    <rect x="20" y="35" width="135" height="70" rx="8" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.3)"/>
    <text x="87" y="55" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#34d399">NEXT TO</text>
    <text x="87" y="72" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#94a3b8">Al lado de</text>
    <text x="87" y="90" font-family="system-ui, sans-serif" font-size="9" text-anchor="middle" fill="#cbd5e1">[ A ] [ B ]</text>

    <rect x="165" y="35" width="135" height="70" rx="8" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.3)"/>
    <text x="232" y="55" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#38bdf8">IN FRONT OF</text>
    <text x="232" y="72" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#94a3b8">Delante de</text>
    <text x="232" y="90" font-family="system-ui, sans-serif" font-size="9" text-anchor="middle" fill="#cbd5e1">[ A ] ➔ [ B ]</text>

    <rect x="310" y="35" width="135" height="70" rx="8" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)"/>
    <text x="377" y="55" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#fbbf24">BETWEEN</text>
    <text x="377" y="72" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#94a3b8">Entre dos cosas</text>
    <text x="377" y="90" font-family="system-ui, sans-serif" font-size="9" text-anchor="middle" fill="#cbd5e1">[A] [YOU] [B]</text>

    <rect x="455" y="35" width="135" height="70" rx="8" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.3)"/>
    <text x="522" y="55" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#f87171">OPPOSITE</text>
    <text x="522" y="72" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#94a3b8">Enfrente (cruzando)</text>
    <text x="522" y="90" font-family="system-ui, sans-serif" font-size="9" text-anchor="middle" fill="#cbd5e1">[A] 🛣️ [B]</text>
  </g>
</svg>`;

const PAST_SIMPLE_TIMELINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 320" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a101d"/><stop offset="100%" stop-color="#141e33"/></linearGradient>
    <filter id="glow2"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="700" height="320" rx="16" fill="url(#chalkBg2)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="38" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#f8fafc">TIMELINE: PAST SIMPLE (ACCIONES FINALIZADAS)</text>
  <line x1="60" y1="130" x2="640" y2="130" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
  <polygon points="640,130 626,124 626,136" fill="#64748b"/>
  <circle cx="180" cy="130" r="14" fill="#ec4899" filter="url(#glow2)"/>
  <text x="180" y="135" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#fff">✓</text>
  <rect x="110" y="70" width="140" height="30" rx="8" fill="rgba(236,72,153,0.2)" stroke="#ec4899" stroke-width="1"/>
  <text x="180" y="90" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#f472b6">ACCIÓN TERMINADA</text>
  <text x="180" y="165" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#f472b6">PAST (Ayer / Last week)</text>
  <line x1="480" y1="85" x2="480" y2="175" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4"/>
  <circle cx="480" cy="130" r="10" fill="#f59e0b" filter="url(#glow2)"/>
  <text x="480" y="165" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fbbf24">NOW (Presente)</text>
  <rect x="50" y="210" width="600" height="75" rx="12" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
  <text x="350" y="240" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#e2e8f0">
    <tspan fill="#38bdf8">[ Sujeto ]</tspan> + <tspan fill="#ec4899">[ Verbo Pasado (-ed / V2) ]</tspan> + <tspan fill="#f59e0b">[ Tiempo Pasado ]</tspan>
  </text>
  <text x="350" y="265" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#94a3b8">Ejemplo: &quot;I watched a movie yesterday&quot;</text>
</svg>`;

const FUTURE_GOING_TO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 320" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a101d"/><stop offset="100%" stop-color="#141e33"/></linearGradient>
    <filter id="glow3"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="700" height="320" rx="16" fill="url(#chalkBg3)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="38" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#f8fafc">TIMELINE: FUTURE PLANS (BE GOING TO)</text>
  <line x1="60" y1="130" x2="640" y2="130" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
  <polygon points="640,130 626,124 626,136" fill="#10b981"/>
  <circle cx="220" cy="130" r="10" fill="#f59e0b" filter="url(#glow3)"/>
  <text x="220" y="165" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fbbf24">NOW (Decisión previa)</text>
  <path d="M 230 120 Q 370 70 510 120" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="4,4"/>
  <circle cx="520" cy="130" r="14" fill="#10b981" filter="url(#glow3)"/>
  <text x="520" y="165" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#6ee7b7">FUTURE (Mañana / Next week)</text>
  <rect x="50" y="210" width="600" height="75" rx="12" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
  <text x="350" y="240" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#e2e8f0">
    <tspan fill="#38bdf8">[ Sujeto ]</tspan> + <tspan fill="#fbbf24">[ am/is/are ]</tspan> + <tspan fill="#10b981">[ going to ]</tspan> + <tspan fill="#c084fc">[ Verbo Base ]</tspan>
  </text>
  <text x="350" y="265" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#94a3b8">Ejemplo: &quot;I am going to travel tomorrow&quot;</text>
</svg>`;

export function getPhaseDiagramSvg(phase: any, topic: string): string | null {
  if (phase?.diagram_svg && typeof phase.diagram_svg === 'string' && phase.diagram_svg.includes('<svg')) {
    return phase.diagram_svg;
  }
  const phaseNum = phase?.phase_number || phase?.phase_index || 1;
  if (phaseNum > 4) return null;

  const combined = `${topic || ''} ${phase?.phase_name || ''} ${typeof phase?.board_content === 'string' ? phase.board_content : ''}`.toLowerCase();

  // 0. Places & There is / There are / Prepositions of Place (Check first for spatial & existential topics)
  if (
    combined.includes('there is') ||
    combined.includes('there are') ||
    combined.includes('places & there is') ||
    combined.includes('preposition') ||
    combined.includes('preposicion') ||
    combined.includes('next to') ||
    combined.includes('in front of') ||
    combined.includes('between') ||
    combined.includes('opposite') ||
    combined.includes('existencia')
  ) {
    return THERE_IS_THERE_ARE_SVG;
  }

  // 1. Past Continuous & Interrupted Actions
  if (
    combined.includes('past continuous') ||
    combined.includes('interrupted') ||
    combined.includes('interrupción') ||
    combined.includes('while / when') ||
    combined.includes('was/were + -ing')
  ) {
    return PAST_CONTINUOUS_TIMELINE_SVG;
  }

  // 2. Frequency & Routines
  if (
    combined.includes('adverb') ||
    combined.includes('frequency') ||
    combined.includes('frecuencia') ||
    combined.includes('always') ||
    combined.includes('usually') ||
    combined.includes('rutina') ||
    combined.includes('routine') ||
    combined.includes('habit') ||
    combined.includes('sometimes') ||
    combined.includes('never')
  ) {
    return FREQUENCY_TIMELINE_SVG;
  }

  // 3. Past Simple (Actions finished in the past)
  if (
    combined.includes('past simple') ||
    combined.includes('irregular past') ||
    combined.includes('regular verb') ||
    combined.includes('pasado simple')
  ) {
    return PAST_SIMPLE_TIMELINE_SVG;
  }

  // 4. Future Plans (be going to)
  if (
    combined.includes('going to') ||
    combined.includes('future') ||
    combined.includes('futuro') ||
    combined.includes('planes')
  ) {
    return FUTURE_GOING_TO_SVG;
  }

  return null;
}

// ─── ACOUSTIC SPEECH TIMELINE & SEMANTIC PHRASE MATCHER ─────────────────────
export interface SpeechWordTiming {
  word: string;
  startRatio: number; // 0.0 to 1.0
  endRatio: number;   // 0.0 to 1.0
}

export interface PhaseSpeechTimeline {
  cleanSpeech: string;
  words: string[];
  wordTimings: SpeechWordTiming[];
}

export function buildPhaseSpeechTimeline(tutorSpeech: string): PhaseSpeechTimeline {
  if (!tutorSpeech || typeof tutorSpeech !== 'string') {
    return { cleanSpeech: '', words: [], wordTimings: [] };
  }

  const clean = tutorSpeech.replace(/[*_#~`]/g, '').replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { cleanSpeech: clean, words: [], wordTimings: [] };
  }

  const weights: number[] = [];
  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i];
    const cleanWord = rawWord.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]/g, '');
    const vowelCount = (cleanWord.match(/[aeiouyáéíóúü]/gi) || []).length;
    let weight = Math.max(cleanWord.length * 0.4 + Math.max(vowelCount, 1) * 1.2, 1.8);
    if (/[.!?:]$/.test(rawWord)) {
      weight += 1.6;
    } else if (/[,;\-—]$/.test(rawWord)) {
      weight += 0.9;
    } else if (/\.\.\.$/.test(rawWord)) {
      weight += 2.0;
    }
    weights.push(weight);
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  let accum = 0;
  const wordTimings: SpeechWordTiming[] = weights.map((w, i) => {
    const startRatio = accum / totalWeight;
    accum += w;
    const endRatio = accum / totalWeight;
    return {
      word: words[i],
      startRatio,
      endRatio,
    };
  });

  return { cleanSpeech: clean, words, wordTimings };
}

export function findPhraseTimingInTimeline(
  phrase: string,
  timeline: PhaseSpeechTimeline,
  fallbackStartRatio = 0.0
): { startRatio: number; endRatio: number; found: boolean } {
  if (!phrase || !timeline || timeline.words.length === 0) {
    return { startRatio: fallbackStartRatio, endRatio: Math.min(fallbackStartRatio + 0.15, 1.0), found: false };
  }

  const cleanPhrase = phrase.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, ' ').trim();
  const phraseTokens = cleanPhrase.split(/\s+/).filter(Boolean);
  if (phraseTokens.length === 0) {
    return { startRatio: fallbackStartRatio, endRatio: Math.min(fallbackStartRatio + 0.15, 1.0), found: false };
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

  // 2. Multi-token partial match
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

  return { startRatio: fallbackStartRatio, endRatio: Math.min(fallbackStartRatio + 0.15, 1.0), found: false };
}

// ─── TYPES: Voice Chunks for Progressive Playback ───────────────────────────
export interface VoiceChunk {
  chunk_id: string;
  chunk_index: number;
  title: string;
  tutor_says: string;
  reveal_target: 'image' | 'grammar' | 'board_concepts' | 'examples' | 'diagram' | 'exercise' | 'all';
  highlight_target?: string;
}

// ─── HELPER: Extract or Synthesize Discrete Voice Chunks ─────────────────────
export function getPhaseVoiceChunks(phase: any, topic: string): VoiceChunk[] {
  if (phase?.voice_chunks && Array.isArray(phase.voice_chunks) && phase.voice_chunks.length >= 2) {
    return phase.voice_chunks.map((c: any, idx: number) => ({
      chunk_id: c.chunk_id || `chunk-${idx + 1}`,
      chunk_index: idx + 1,
      title: c.title || (idx === 0 ? '1. Introducción y Situación' : `${idx + 1}. Explicación`),
      tutor_says: typeof c.tutor_says === 'string' ? c.tutor_says.trim() : String(c.tutor_says || '').trim(),
      reveal_target: c.reveal_target || (idx === 0 ? 'image' : 'board_concepts'),
      highlight_target: c.highlight_target || (idx === 0 ? 'illustration' : 'concepts'),
    }));
  }

  // Client-side fallback decomposition for legacy lessons
  let tutorSpeech = typeof phase?.tutor_says === 'string'
    ? phase.tutor_says
    : phase?.tutor_says?.text || '';

  if (!tutorSpeech.trim()) {
    tutorSpeech = `En esta fase exploraremos ${topic || 'este concepto'} en detalle.`;
  }

  const rawSentences = tutorSpeech.split(/(?<=[.?!])\s+/).map((s: string) => s.trim()).filter(Boolean);
  const isHook = phase?.phase_number === 1 || Boolean(phase?.is_hook);
  const hasExercises = Boolean(
    phase?.phase_number !== 1 && (phase?.student_task || phase?.expected_answer || phase?.exercises)
  );
  const hasGrammar = Boolean(phase?.grammar_structure || phase?.key_structure);
  const hasDiagram = Boolean(phase?.diagram_svg);
  const hasPhonetics = Boolean(phase?.phonetic_focus || phase?.is_phonetic_bonus);

  const chunks: VoiceChunk[] = [];

  // Chunk 1: Hero Image Intro (ONLY Image Centered)
  let introSpeech = rawSentences[0] || tutorSpeech;
  let remaining = rawSentences.slice(1);
  if (rawSentences.length >= 3 && rawSentences[0].split(/\s+/).length < 10) {
    introSpeech = `${rawSentences[0]} ${rawSentences[1]}`;
    remaining = rawSentences.slice(2);
  }

  chunks.push({
    chunk_id: 'chunk-1',
    chunk_index: 1,
    title: '1. Introducción y Situación',
    tutor_says: introSpeech,
    reveal_target: 'image',
    highlight_target: 'illustration',
  });

  if (isHook) {
    return [
      {
        chunk_id: 'chunk-1',
        chunk_index: 1,
        title: '1. Situación y Dilema',
        tutor_says: tutorSpeech,
        reveal_target: 'image',
        highlight_target: 'illustration',
      }
    ];
  }

  // Chunk 2: Grammar / Diagram / Concept Formula
  if (hasGrammar || hasDiagram || hasPhonetics || remaining.length >= 2) {
    const revealType = hasGrammar ? 'grammar' : (hasDiagram ? 'diagram' : 'board_concepts');
    const titleText = hasGrammar ? '2. Fórmula Gramatical' : (hasDiagram ? '2. Esquema Didáctico' : (hasPhonetics ? '2. Contraste Fonético' : '2. Concepto Clave'));
    const chunk2Speech = remaining[0] || 'Observa con atención la fórmula y estructura gramatical en la pizarra.';
    remaining = remaining.slice(1);

    chunks.push({
      chunk_id: 'chunk-2',
      chunk_index: 2,
      title: titleText,
      tutor_says: chunk2Speech,
      reveal_target: revealType,
      highlight_target: revealType === 'grammar' ? 'grammar' : (revealType === 'diagram' ? 'diagram' : 'concepts'),
    });
  }

  // Chunk 3: Board Concepts / Examples
  if (remaining.length > 0 && (!hasExercises || remaining.length >= 2)) {
    const chunk3Speech = hasExercises && remaining.length >= 2 ? remaining[0] : remaining.join(' ');
    remaining = hasExercises && remaining.length >= 2 ? remaining.slice(1) : [];

    chunks.push({
      chunk_id: `chunk-${chunks.length + 1}`,
      chunk_index: chunks.length + 1,
      title: `${chunks.length + 1}. Pizarra y Ejemplos`,
      tutor_says: chunk3Speech,
      reveal_target: 'board_concepts',
      highlight_target: 'concepts',
    });
  }

  // Chunk 4: Practice Challenge
  if (hasExercises) {
    const taskSpeech = remaining.length > 0 ? remaining.join(' ') : 'A continuación, resuelve los ejercicios en la pizarra para poner en práctica lo aprendido.';
    chunks.push({
      chunk_id: `chunk-${chunks.length + 1}`,
      chunk_index: chunks.length + 1,
      title: `${chunks.length + 1}. Desafío Interactivo`,
      tutor_says: taskSpeech,
      reveal_target: 'exercise',
      highlight_target: 'exercise',
    });
  } else if (remaining.length > 0) {
    chunks.push({
      chunk_id: `chunk-${chunks.length + 1}`,
      chunk_index: chunks.length + 1,
      title: `${chunks.length + 1}. Resumen Clave`,
      tutor_says: remaining.join(' '),
      reveal_target: 'board_concepts',
      highlight_target: 'concepts',
    });
  }

  return chunks;
}

// ─── HELPER: Generate or Normalize Phase Storyboard Steps from Chunks ────────
function getPhaseStoryboardSteps(phase: any, topic: string): StoryboardStep[] {
  const chunks = getPhaseVoiceChunks(phase, topic);
  const totalChunks = Math.max(chunks.length, 1);

  return chunks.map((c, idx) => {
    const elemType = c.reveal_target === 'image' ? 'illustration' : (c.reveal_target === 'grammar' ? 'grammar' : (c.reveal_target === 'diagram' ? 'diagram' : (c.reveal_target === 'exercise' ? 'exercise' : 'concepts')));
    const color = c.reveal_target === 'image' ? 'cyan' : (c.reveal_target === 'grammar' ? 'purple' : (c.reveal_target === 'exercise' ? 'gold' : 'green'));

    return {
      step_id: c.chunk_id || `step-${idx + 1}`,
      step_index: idx + 1,
      element_type: elemType,
      label: c.title || `${idx + 1}. Paso`,
      tutor_speech_snippet: c.tutor_says,
      trigger_ratio: Math.round((idx / totalChunks) * 100) / 100,
      animation: c.reveal_target === 'exercise' ? 'spotlight_glow' : (c.reveal_target === 'grammar' ? 'bounce_in' : 'typewriter'),
      highlight_target: c.highlight_target || elemType,
      chalk_color: color,
    };
  });
}

const COMMON_ENGLISH_SPANISH: Record<string, string> = {
  'wake up': 'despertarse / despertar',
  'have breakfast': 'desayunar',
  'eat breakfast': 'desayunar',
  'go to work': 'ir al trabajo / ir a trabajar',
  'exercise': 'hacer ejercicio',
  'exercises': 'hace ejercicio (sonido /ɪz/)',
  'sleep': 'dormir',
  'sleeps': 'duerme (sonido /s/)',
  'go': 'ir',
  'goes': 'va (sonido /z/)',
  'work': 'trabajar',
  'works': 'trabaja',
  'study': 'estudiar',
  'studies': 'estudia',
  'sue': 'demandar (/suː/)',
  'zoo': 'zoológico (/zuː/)',
  'peace': 'paz (/piːs/)',
  'peas': 'arvejas / guisantes (/piːz/)',
  'price': 'precio (/praɪs/)',
  'prize': 'premio (/praɪz/)',
  'always': 'siempre (100%)',
  'usually': 'normalmente / usualmente (80%)',
  'often': 'a menudo / frecuentemente (70%)',
  'sometimes': 'a veces (50%)',
  'hardly ever': 'casi nunca (20%)',
  'rarely': 'raramente (10%)',
  'never': 'nunca (0%)',
  'i always wake up early': 'Yo siempre me despierto temprano',
  'she never eats at night': 'Ella nunca come de noche',
  'they usually study at night': 'Ellos normalmente estudian de noche',
  'i usually drink coffee at 8 am in the morning': 'Normalmente tomo café a las 8 AM por la mañana',
  'i usually drink coffee': 'Normalmente tomo café (orden correcto)',
  'i drink usually coffee': 'Orden incorrecto del adverbio',
};

// ─── HELPER: Extract Spoken English Quotes & Transformations from Tutor Speech
function extractSpokenEnglishQuotes(speechText: string) {
  if (!speechText) return { primary: null, primary_translation: null, items: [], additional: [], transformations: [], contrasts: [], phonetic_pairs: [], frequency_scale: [], drill_sentences: [] };

  const transMatches = Array.from(
    speechText.matchAll(/['"‘“]([^'"‘“’”\n\r]+)['"’”][^'"‘“’”\n\r]{0,50}?(?:se convierte en|se transforma en|pasa a ser|cambia a|becomes|transforms into)\s*['"‘“]([^'"‘“’”\n\r]+)['"’”]/gi)
  );
  const transformations = transMatches
    .map(m => ({ from: m[1].trim(), to: m[2].trim() }))
    .filter(t => t.from.length >= 2 && t.to.length >= 2 && !/[áéíóúñÁÉÍÓÚÑ]/.test(t.from) && !/[áéíóúñÁÉÍÓÚÑ]/.test(t.to));

  const contMatches = Array.from(
    speechText.matchAll(/['"‘“]([^'"‘“’”\n\r]+)['"’”][^'"‘“’”\n\r]{0,35}?(?:y no|y nunca|no|en lugar de|instead of|mientras que)\s*['"‘“]([^'"‘“’”\n\r]+)['"’”]/gi)
  );
  const contrasts = contMatches
    .map(m => ({ correct: m[1].trim(), incorrect: m[2].trim(), why: 'Contraste fonético / gramatical' }))
    .filter(c => c.correct.length >= 2 && c.incorrect.length >= 2 && !/[áéíóúñÁÉÍÓÚÑ]/.test(c.correct) && !/[áéíóúñÁÉÍÓÚÑ]/.test(c.incorrect));

  // Detect Common Errors introduced like: "Un error típico ... diciendo 'I drink usually coffee'"
  const errMatch = speechText.match(/(?:error\s+típico[^\n\r]*?diciendo|diciendo|es\s+incorrecto\s+decir|en\s+lugar\s+de\s+decir|no\s+digas)\s*['"‘“]([^'"‘“’”\n\r]+)['"’”]/i);
  if (errMatch) {
    const incorrectQuote = errMatch[1].trim();
    if (!contrasts.some(c => c.incorrect.toLowerCase() === incorrectQuote.toLowerCase())) {
      let correctCand = 'I usually drink coffee';
      const modelCand = speechText.match(/(?:ejemplo|orden\s+correcto[^\n\r]*?['"‘“]|modelo\s+es[^\n\r]*?['"‘“])\s*['"‘“]?([^'"‘“’”\n\r]+)['"’”]/i);
      if (modelCand) {
        const cand = modelCand[1].trim();
        if (cand.length >= 3 && !/[áéíóúñÁÉÍÓÚÑ]/.test(cand)) {
          correctCand = cand.split(/\s+/).slice(0, 4).join(' ');
        }
      }
      contrasts.push({
        correct: correctCand,
        incorrect: incorrectQuote,
        why: 'El adverbio va SIEMPRE ANTES del verbo principal',
      });
    }
  }

  // 3. Frequency Scale / Table Items from speech (e.g. 'Always' 100%, 'Usually' 80%, 'Sometimes' 50%, 'Never' 0%)
  const freqPattern = /['"‘“](Always|Usually|Often|Sometimes|Hardly ever|Rarely|Never)['"’”]\s*(?:\(([^)]+)\))?[^'"‘“’”]{0,50}?(\d{1,3})%/gi;
  const frequencyScale: Array<{ adverb: string; spanish: string; percentage: string }> = [];
  for (const fm of Array.from(speechText.matchAll(freqPattern))) {
    const adv = fm[1].trim();
    const spa = fm[2]?.trim() || '';
    const pct = `${fm[3].trim()}%`;
    frequencyScale.push({
      adverb: adv.charAt(0).toUpperCase() + adv.slice(1).toLowerCase(),
      spanish: spa || (COMMON_ENGLISH_SPANISH[adv.toLowerCase()] || '').split('(')[0].trim(),
      percentage: pct,
    });
  }

  // Phonetic minimal pairs (e.g. peace /piːs/ con /s/, peas /piːz/ con /z/)
  const phoneticPattern = /([a-zA-Z]{2,15})\s+(\/[^\/]+\/)\s+(?:con\s+\/[a-z\/]+\/[,\s]+)?([a-zA-Z]{2,15})\s+(\/[^\/]+\/)/gi;
  const phoneticPairs: Array<{ word1: string; ipa1: string; trans1?: string; word2: string; ipa2: string; trans2?: string }> = [];
  for (const pm of Array.from(speechText.matchAll(phoneticPattern))) {
    const w1 = pm[1].trim();
    const ipa1 = pm[2].trim();
    const w2 = pm[3].trim();
    const ipa2 = pm[4].trim();
    if (!['con', 'que', 'para', 'esta'].includes(w1.toLowerCase()) && !['con', 'que', 'para', 'esta'].includes(w2.toLowerCase())) {
      phoneticPairs.push({
        word1: w1,
        ipa1,
        trans1: COMMON_ENGLISH_SPANISH[w1.toLowerCase()] || '',
        word2: w2,
        ipa2,
        trans2: COMMON_ENGLISH_SPANISH[w2.toLowerCase()] || '',
      });
    }
  }

  // Detect Syntactic Parts (so "drink coffee" or "At 8 AM" are not treated as vocab cards)
  const syntacticPartQuotes = new Set<string>();
  for (const pm of Array.from(speechText.matchAll(/['"‘“]([^'"‘“’”\n\r]+)['"’”]\s+(?:es\s+el\s+(?:Sujeto|Verbo|Adverbio|Complemento)|son\s+(?:Time\s+Expressions|expresiones\s+de\s+tiempo))/gi))) {
    syntacticPartQuotes.add(pm[1].trim().toLowerCase());
  }
  for (const c of contrasts) {
    syntacticPartQuotes.add(c.incorrect.toLowerCase());
  }

  // Extract Real Spoken Drill Sentences (e.g. "Repite conmigo mentalmente: I always wake up early. She never eats at night.")
  const drillSentences: Array<{ english: string; translation: string }> = [];
  const drillMatch = speechText.match(/(?:repite\s+conmigo(?:\s+mentalmente)?:\s*|practica\s+con:\s*)([^.\n\r]+(?:\.[^.\n\r]+)*)/i);
  if (drillMatch) {
    const drillRaw = drillMatch[1];
    for (const s of drillRaw.split(/[.;]/)) {
      const sClean = s.replace(/^(?:mentalmente|conmigo|y)\s*[:,\s]*/i, '').trim();
      if (sClean.split(/\s+/).length >= 3 && !/[áéíóúñÁÉÍÓÚÑ]/.test(sClean)) {
        drillSentences.push({
          english: sClean,
          translation: COMMON_ENGLISH_SPANISH[sClean.toLowerCase()] || 'Práctica oral',
        });
      }
    }
  }

  const SPANISH_DISQUALIFIERS = new Set([
    'me', 'te', 'se', 'nos', 'os', 'mi', 'tu', 'su', 'mis', 'tus', 'sus', 'nuestro', 'nuestra',
    'despierto', 'despiertas', 'despierta', 'despertamos', 'despiertan', 'despertarse', 'despertar',
    'desayuno', 'desayunas', 'desayuna', 'desayunamos', 'desayunan', 'desayunar',
    'trabajo', 'trabajas', 'trabaja', 'trabajamos', 'trabajan', 'trabajar',
    'estudio', 'estudias', 'estudia', 'estudiamos', 'estudian', 'estudiar',
    'duermo', 'duermes', 'duerme', 'dormimos', 'duermen', 'dormir',
    'como', 'comes', 'come', 'comemos', 'comen', 'comer',
    'hago', 'haces', 'hace', 'hacemos', 'hacen', 'hacer',
    'ejercicio', 'ejercicios', 'significa', 'es', 'decir', 'o', 'sea', 'muestra', 'como',
    'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'para', 'por', 'con',
    'que', 'al', 'a', 'son', 'va', 'van', 'colocado', 'antes', 'despues', 'palabra', 'oracion',
    'frase', 'regla', 'sujeto', 'verbo', 'complemento', 'tiempo', 'lugar', 'manana', 'tarde', 'noche',
    'siempre', 'normalmente', 'usualmente', 'a veces', 'nunca', 'frecuencia', 'rutina', 'habito',
    'yo', 'tu', 'el', 'ella', 'nosotros', 'ustedes', 'ellos', 'ellas'
  ]);

  const isSpanishPhrase = (text: string): boolean => {
    if (!text || typeof text !== 'string') return false;
    if (/[áéíóúñÁÉÍÓÚÑ]/.test(text)) return true;
    const tokens = text.split(/\s+/).map(w => w.toLowerCase().replace(/[,.:;!?"'()[\]{}]/g, ''));
    if (tokens.length === 0) return false;
    return tokens.some(w => SPANISH_DISQUALIFIERS.has(w));
  };

  const metaDisqualifiers = new Set([
    's', 'es', 'ed', 'ing', 'd', 've', 're', 'll', 'm', 't', 'i', 'he', 'she', 'it', 'we', 'they', 'you',
    'ch', 'sh', 'x', 'z', 'regla', 'fórmula', 'sujeto', 'verbo', 'complemento', 'pizarra', 'ejemplo', 'eat', 'have', 'uniforme', 'corbata'
  ]);

  const items: Array<{ english: string; translation: string }> = [];
  const seen = new Set<string>(syntacticPartQuotes);

  // Include drill sentences first
  for (const d of drillSentences) {
    if (!isSpanishPhrase(d.english) && !seen.has(d.english.toLowerCase())) {
      seen.add(d.english.toLowerCase());
      items.push(d);
    }
  }

  const rawQuotes = Array.from(speechText.matchAll(/['"‘“]([^'"‘“’”\n\r]+)['"’”]/g));
  for (const m of rawQuotes) {
    const eng = m[1].trim();
    const low = eng.toLowerCase();
    if (eng.length >= 2 && !metaDisqualifiers.has(low) && !seen.has(low) && !isSpanishPhrase(eng)) {
      seen.add(low);
      let trans = COMMON_ENGLISH_SPANISH[low] || '';
      if (m.index !== undefined) {
        const endPos = m.index + m[0].length;
        const trailer = speechText.slice(endPos, endPos + 50);

        // Check if following quote is the translation: significa 'te despiertas'
        const transQuoteMatch = trailer.match(/^(?:\s*(?:significa|es decir|es|o sea|se traduce como|traducido como))\s*['"‘“]([^'"‘“’”\n\r]+)['"’”]/i);
        if (transQuoteMatch) {
          const explicitSpa = transQuoteMatch[1].trim();
          trans = explicitSpa;
          seen.add(explicitSpa.toLowerCase());
        } else if (!trans) {
          const defMatch = trailer.match(/^(?:\s*(?:significa|es decir|es|o sea|se traduce como)\s+)?([a-zA-ZáéíóúñÁÉÍÓÚÑ\s]{3,25})/i);
          if (defMatch && /significa|es|es decir|o sea/i.test(trailer.slice(0, 15))) {
            const rawT = defMatch[1].trim().replace(/[.,;:]+$/, '');
            const cleanT = rawT.replace(/^(?:decir|cuando|y|que|un|una|muestra|cómo|la)\s+/i, '').trim();
            if (cleanT.length >= 3 && isSpanishPhrase(cleanT)) {
              trans = cleanT;
            }
          }
        }
      }
      items.push({ english: eng, translation: trans });
    }
  }

  // Also include minimal pair words in items if not already added
  for (const pair of phoneticPairs) {
    for (const [w, tr] of [[pair.word1, pair.trans1], [pair.word2, pair.trans2]] as const) {
      if (w && !seen.has(w.toLowerCase())) {
        seen.add(w.toLowerCase());
        items.push({ english: w, translation: tr || '' });
      }
    }
  }

  // Model sentence selection
  let primaryEng = 'I wake up at 7 AM';
  let primarySpa = 'Me despierto a las 7 AM';
  const modelMatch = speechText.match(/(?:ejemplo|oración\s+modelo)\s*['"‘“]([^'"‘“’”\n\r]+)['"’”]/i);
  if (modelMatch) {
    primaryEng = modelMatch[1].trim();
    primarySpa = COMMON_ENGLISH_SPANISH[primaryEng.toLowerCase()] || 'Oración modelo en contexto';
  } else if (items.length > 0) {
    primaryEng = items[0].english;
    primarySpa = items[0].translation;
  }

  const additional = items.filter(it => it.english.toLowerCase() !== primaryEng.toLowerCase());

  return {
    primary: primaryEng,
    primary_translation: primarySpa,
    items,
    additional,
    transformations,
    contrasts,
    phonetic_pairs: phoneticPairs,
    frequency_scale: frequencyScale,
    drill_sentences: drillSentences,
  };
}

// ─── HELPER: Generate or Normalize Chronological Timeline Steps for Slide ────
function getPhaseStoryboardTimeline(phase: any, topic: string): TimelineStep[] {
  if (phase?.storyboard_timeline && Array.isArray(phase.storyboard_timeline) && phase.storyboard_timeline.length > 0) {
    return phase.storyboard_timeline;
  }

  const fullSpeech = typeof phase?.tutor_says === 'string' ? phase.tutor_says : (phase?.tutor_says?.text || '');
  const spokenOverall = extractSpokenEnglishQuotes(fullSpeech);

  // Synthesize from voice chunks / grammar / target audio items
  const chunks = getPhaseVoiceChunks(phase, topic);
  const grammar = phase?.grammar_structure || phase?.key_structure;
  const targetAudio = phase?.target_audio_items || [];
  const diagram = getPhaseDiagramSvg(phase, topic) || phase?.diagram_svg || null;
  const exercises = phase?.exercises || [];
  const task = phase?.student_task;

  return chunks.map((c, idx) => {
    let action: TimelineStep['visual_action'] = 'show_hero_image';
    let payload: any = {};

    const stepSpeech = c.tutor_says || '';
    const stepSpoken = extractSpokenEnglishQuotes(stepSpeech);

    if (idx === 0 || c.reveal_target === 'image') {
      action = 'show_hero_image';
      payload = {
        title: phase?.phase_name || 'Situación Visual',
        topic,
        frequency_scale: spokenOverall.frequency_scale,
      };
    } else if (c.reveal_target === 'grammar' && grammar) {
      action = 'show_grammar_formula';
      payload = {
        title: grammar.title || 'Fórmula Gramatical',
        formula: grammar.formula,
        formula_tokens: grammar.formula_tokens,
        explanation: grammar.explanation,
        frequency_scale: spokenOverall.frequency_scale,
      };
    } else if (c.reveal_target === 'diagram' && diagram) {
      action = 'show_diagram';
      payload = { svg: diagram };
    } else if (c.reveal_target === 'exercise') {
      action = 'show_challenge';
      payload = { student_task: task, expected_answer: phase?.expected_answer, exercises };
    } else {
      const firstTarget = targetAudio[0] || {};
      const chosenPrimary = stepSpoken.primary || spokenOverall.primary || firstTarget.english || 'wake up';
      const chosenSpa = stepSpoken.primary_translation || spokenOverall.primary_translation || firstTarget.translation || firstTarget.spanish || 'Oración modelo en contexto.';
      const chosenTrans = stepSpoken.transformations.length > 0 ? stepSpoken.transformations : (spokenOverall.transformations.length > 0 ? spokenOverall.transformations : []);
      const chosenContrast = stepSpoken.contrasts.length > 0 ? stepSpoken.contrasts : (spokenOverall.contrasts.length > 0 ? spokenOverall.contrasts : []);
      const chosenPhonetic = stepSpoken.phonetic_pairs.length > 0 ? stepSpoken.phonetic_pairs : (spokenOverall.phonetic_pairs.length > 0 ? spokenOverall.phonetic_pairs : []);
      const chosenFreq = stepSpoken.frequency_scale.length > 0 ? stepSpoken.frequency_scale : (spokenOverall.frequency_scale.length > 0 ? spokenOverall.frequency_scale : []);
      
      const extraItems = stepSpoken.additional.length > 0 ? stepSpoken.additional : (spokenOverall.additional.length > 0 ? spokenOverall.additional : targetAudio.slice(1, 5));

      action = 'show_example_sentence';
      payload = {
        english: chosenPrimary,
        spanish: chosenSpa,
        transformation: chosenTrans[0] || null,
        transformations: chosenTrans,
        contrast: chosenContrast[0] || null,
        contrasts: chosenContrast,
        phonetic_pairs: chosenPhonetic,
        frequency_scale: chosenFreq,
        additional_examples: extraItems,
      };
    }

    return {
      step_index: idx + 1,
      step_title: c.title,
      tutor_audio: c.tutor_says,
      visual_action: action,
      payload,
    };
  });
}

function buildFrontendOfflineLesson(topic: string, sublevel: string, lessonId: string) {
  const low = (topic || '').toLowerCase();
  let exercises: any[] = [];
  let modelSentence1 = '';
  let modelSentenceTrans1 = '';
  let modelSentence2 = '';
  let modelSentenceTrans2 = '';
  let ruleTitle = '';
  let formulaText = '';
  let errorWrong = '';
  let errorCorrect = '';
  let errorTip = '';

  if (low.includes('routine') || low.includes('rutina') || low.includes('daily') || low.includes('present simple')) {
    modelSentence1 = 'Mateo wakes up at six in the morning and drinks hot coffee.';
    modelSentenceTrans1 = 'Mateo se despierta a las seis de la mañana y toma café caliente.';
    modelSentence2 = 'She always studies English before going to work.';
    modelSentenceTrans2 = 'Ella siempre estudia inglés antes de ir a trabajar.';
    ruleTitle = 'Present Simple & 3rd Person (-s/-es)';
    formulaText = '[ Sujeto ] + [ Verbo (+s/es) ] + [ Complemento de Tiempo ]';
    errorWrong = 'He wake up early and study every day.';
    errorCorrect = 'He wakes up early and studies every day.';
    errorTip = 'En tercera persona singular (He / She / It), añade -s o -es al verbo.';
    exercises = [
      {
        id: 'ex-1',
        sentence: 'Every weekday, Mateo _____ [wakes up / wake up / waking up] at six in the morning.',
        options: ['wakes up', 'wake up', 'waking up'],
        expected_answer: 'wakes up',
        spanish_translation: 'Cada día entre semana, Mateo se despierta a las seis de la mañana.',
        image_prompt: 'A person happily turning off an alarm clock with morning sunlight in bedroom, 2D flat vector art, no text',
        hint: 'Para He/She/It en Present Simple agregamos -s: wakes up.'
      },
      {
        id: 'ex-2',
        sentence: 'She always _____ [has / have / haves] a healthy breakfast before going to the gym.',
        options: ['has', 'have', 'haves'],
        expected_answer: 'has',
        spanish_translation: 'Ella siempre desayuna saludable antes de ir al gimnasio.',
        image_prompt: 'A woman enjoying orange juice and toast at a bright breakfast table, 2D vector art, no text',
        hint: 'Con She, la tercera persona de have es has.'
      },
      {
        id: 'ex-3',
        sentence: 'We usually _____ [drink / drinks / drinking] hot coffee together at the office.',
        options: ['drink', 'drinks', 'drinking'],
        expected_answer: 'drink',
        spanish_translation: 'Nosotros usualmente tomamos café caliente juntos en la oficina.',
        image_prompt: 'Coworkers holding ceramic mugs in a modern office breakroom, 2D vector art, no text',
        hint: 'Con We el verbo se mantiene en forma base.'
      },
      {
        id: 'ex-4',
        sentence: 'Lucas _____ [goes / go / gos] to the university by subway every morning.',
        options: ['goes', 'go', 'gos'],
        expected_answer: 'goes',
        spanish_translation: 'Lucas va a la universidad en metro todas las mañanas.',
        image_prompt: 'A student with backpack waiting on a clean subway platform, 2D vector art, no text',
        hint: 'Los verbos terminados en -o añaden -es en tercera persona: goes.'
      },
      {
        id: 'ex-5',
        sentence: 'Do you _____ [work / works / working] on weekends or only on weekdays?',
        options: ['work', 'works', 'working'],
        expected_answer: 'work',
        spanish_translation: '¿Trabajas los fines de semana o solo entre semana?',
        image_prompt: 'A friendly interviewer asking questions in an office, 2D vector art, no text',
        hint: 'Con el auxiliar Do el verbo va en forma base: work.'
      },
      {
        id: 'ex-6',
        sentence: 'He _____ [watches / watch / watchs] the evening news after finishing his dinner.',
        options: ['watches', 'watch', 'watchs'],
        expected_answer: 'watches',
        spanish_translation: 'Él mira las noticias nocturnas después de terminar su cena.',
        image_prompt: 'A man relaxing on a sofa in front of a modern television, 2D vector art, no text',
        hint: 'Los verbos terminados en -ch añaden -es: watches.'
      },
      {
        id: 'ex-7',
        sentence: 'My brother _____ [studies / studys / study] English grammar every afternoon.',
        options: ['studies', 'studys', 'study'],
        expected_answer: 'studies',
        spanish_translation: 'Mi hermano estudia gramática inglesa todas las tardes.',
        image_prompt: 'A young man writing in a notebook at a study desk, 2D vector art, no text',
        hint: 'Consonante + y cambia a -ies: studies.'
      },
      {
        id: 'ex-8',
        sentence: "They _____ [don't wake up / doesn't wake up / not wake up] early on Sundays.",
        options: ["don't wake up", "doesn't wake up", "not wake up"],
        expected_answer: "don't wake up",
        spanish_translation: 'Ellos no se despiertan temprano los domingos.',
        image_prompt: 'A cozy bedroom with sleeping person under blankets on a peaceful morning, 2D vector art, no text',
        hint: "Para They usamos el auxiliar negativo don't."
      }
    ];
  } else if (low.includes('past continuous') || low.includes('interrupted') || low.includes('was/were')) {
    modelSentence1 = 'I was cooking dinner in the kitchen when the lights suddenly went out.';
    modelSentenceTrans1 = 'Estaba cocinando la cena en la cocina cuando de repente se fue la luz.';
    modelSentence2 = 'While they were walking in the park, it began to rain heavily.';
    modelSentenceTrans2 = 'Mientras ellos caminaban por el parque, empezó a llover fuerte.';
    ruleTitle = 'Past Continuous & Interrupted Actions (When / While)';
    formulaText = '[ Sujeto ] + [ was/were ] + [ Verbo(-ing) ] + [ when + Past Simple ]';
    errorWrong = 'I was cook dinner when she was call me.';
    errorCorrect = 'I was cooking dinner when she called me.';
    errorTip = 'La acción continua lleva was/were + -ing; la que interrumpe va en Past Simple.';
    exercises = [
      {
        id: 'ex-1',
        sentence: 'I was _____ [cooking / cooked / cook] dinner in the kitchen when the lights suddenly went out.',
        options: ['cooking', 'cooked', 'cook'],
        expected_answer: 'cooking',
        spanish_translation: 'Estaba cocinando la cena en la cocina cuando de repente se fue la luz.',
        image_prompt: 'A person holding a wooden spoon in a cozy kitchen looking surprised as the lights go off, 2D flat vector art, no text',
        hint: 'Para la acción continua en el pasado usamos was + verbo con -ing.'
      },
      {
        id: 'ex-2',
        sentence: 'While we were _____ [walking / walked / walk] through the city park, it began to rain heavily.',
        options: ['walking', 'walked', 'walk'],
        expected_answer: 'walking',
        spanish_translation: 'Mientras estábamos caminando por el parque de la ciudad, empezó a llover fuerte.',
        image_prompt: 'Two friends walking on a tree-lined park path looking up as rain droplets start falling, 2D vector art, no text',
        hint: 'Con While we were... la acción de fondo va en gerundio (-ing).'
      },
      {
        id: 'ex-3',
        sentence: 'David was _____ [driving / drove / drive] home from work when his phone rang.',
        options: ['driving', 'drove', 'drive'],
        expected_answer: 'driving',
        spanish_translation: 'David estaba conduciendo a casa del trabajo cuando sonó su teléfono.',
        image_prompt: 'A driver focused on a sunset city highway road while a phone on the dashboard lights up, 2D vector art, no text',
        hint: 'Sujeto singular David + was + verbo con -ing.'
      },
      {
        id: 'ex-4',
        sentence: "What were you _____ [doing / did / do] at eight o'clock yesterday evening?",
        options: ['doing', 'did', 'do'],
        expected_answer: 'doing',
        spanish_translation: '¿Qué estabas haciendo a las ocho en punto ayer por la noche?',
        image_prompt: 'A young detective asking questions in a bright living room, 2D vector art, no text',
        hint: 'En preguntas en pasado continuo: What were you + doing?'
      },
      {
        id: 'ex-5',
        sentence: 'They were _____ [playing / played / play] soccer in the stadium when the coach arrived.',
        options: ['playing', 'played', 'play'],
        expected_answer: 'playing',
        spanish_translation: 'Ellos estaban jugando fútbol en el estadio cuando llegó el entrenador.',
        image_prompt: 'Teenagers kicking a soccer ball on a green stadium grass field, 2D vector art, no text',
        hint: 'Sujeto plural They + were + verbo con -ing.'
      },
      {
        id: 'ex-6',
        sentence: 'Elena was _____ [studying / studied / study] for her exam while her brother was sleeping.',
        options: ['studying', 'studied', 'study'],
        expected_answer: 'studying',
        spanish_translation: 'Elena estaba estudiando para su examen mientras su hermano dormía.',
        image_prompt: 'A student studying with books and a desk lamp in a cozy room, 2D vector art, no text',
        hint: 'Dos acciones continuas paralelas usan was/were + -ing.'
      },
      {
        id: 'ex-7',
        sentence: 'I _____ [dropped / was dropping / drop] my keys while I was running for the bus.',
        options: ['dropped', 'was dropping', 'drop'],
        expected_answer: 'dropped',
        spanish_translation: 'Se me cayeron las llaves mientras estaba corriendo tras el autobús.',
        image_prompt: 'A commuter rushing toward a city bus as keys slip onto the sidewalk, 2D vector art, no text',
        hint: 'La acción puntual que interrumpe va en Past Simple: dropped.'
      },
      {
        id: 'ex-8',
        sentence: 'She was _____ [reading / read / reads] a novel when the doorbell rang loudly.',
        options: ['reading', 'read', 'reads'],
        expected_answer: 'reading',
        spanish_translation: 'Ella estaba leyendo una novela cuando el timbre sonó fuerte.',
        image_prompt: 'A woman in an armchair holding a book looking toward the front door, 2D vector art, no text',
        hint: 'Acción en progreso was reading interrumpida por rang.'
      }
    ];
  } else if (low.includes('past') || low.includes('irregular') || low.includes('did')) {
    modelSentence1 = 'Yesterday Liam went to the central library and bought a new book.';
    modelSentenceTrans1 = 'Ayer Liam fue a la biblioteca central y compró un libro nuevo.';
    modelSentence2 = 'Did you see the beautiful sunset at the beach last night?';
    modelSentenceTrans2 = '¿Viste el hermoso atardecer en la playa anoche?';
    ruleTitle = 'Past Simple & Irregular Verbs';
    formulaText = '[ Sujeto ] + [ Verbo Irregular V2 ] + [ Complemento ]';
    errorWrong = 'Did you went to the party yesterday?';
    errorCorrect = 'Did you go to the party yesterday?';
    errorTip = "Tras el auxiliar Did o didn't, el verbo principal regresa a su forma base pura.";
    exercises = [
      {
        id: 'ex-1',
        sentence: 'Yesterday morning, Liam _____ [went / go / goes] to the central library to study.',
        options: ['went', 'go', 'goes'],
        expected_answer: 'went',
        spanish_translation: 'Ayer por la mañana, Liam fue a la biblioteca central a estudiar.',
        image_prompt: 'A young student walking into a modern library carrying a backpack, 2D vector art, no text',
        hint: 'En pasado afirmativo de go usamos went.'
      },
      {
        id: 'ex-2',
        sentence: 'Did you _____ [see / saw / seen] the beautiful sunset at the beach last night?',
        options: ['see', 'saw', 'seen'],
        expected_answer: 'see',
        spanish_translation: '¿Viste el hermoso atardecer en la playa anoche?',
        image_prompt: 'Two friends watching a golden sunset over ocean waves, 2D vector art, no text',
        hint: 'Tras el auxiliar Did el verbo va en forma base: see.'
      },
      {
        id: 'ex-3',
        sentence: "We _____ [didn't buy / didn't bought / not buy] the tickets because we had no cash.",
        options: ["didn't buy", "didn't bought", 'not buy'],
        expected_answer: "didn't buy",
        spanish_translation: 'No compramos los boletos porque no teníamos efectivo.',
        image_prompt: 'A couple checking wallets in front of a ticket counter, 2D vector art, no text',
        hint: "Con didn't el verbo va en forma base: buy."
      },
      {
        id: 'ex-4',
        sentence: 'Lucas _____ [ate / eat / eats] delicious tacos with his family last weekend.',
        options: ['ate', 'eat', 'eats'],
        expected_answer: 'ate',
        spanish_translation: 'Lucas comió deliciosos tacos con su familia el fin de semana pasado.',
        image_prompt: 'A smiling family gathered around a dining table enjoying tacos, 2D vector art, no text',
        hint: 'El pasado simple de eat es ate.'
      },
      {
        id: 'ex-5',
        sentence: 'Where did you _____ [travel / traveled / travels] during your summer vacation?',
        options: ['travel', 'traveled', 'travels'],
        expected_answer: 'travel',
        spanish_translation: '¿A dónde viajaste durante tus vacaciones de verano?',
        image_prompt: 'A traveler looking at departure flight boards in a modern airport, 2D vector art, no text',
        hint: 'En preguntas con Where did you... el verbo va en forma base.'
      },
      {
        id: 'ex-6',
        sentence: 'She _____ [wrote / write / writes] a warm letter to her grandmother in Spain.',
        options: ['wrote', 'write', 'writes'],
        expected_answer: 'wrote',
        spanish_translation: 'Ella le escribió una carta a su abuela en España.',
        image_prompt: 'A person writing with a pen at a wooden desk with flowers, 2D vector art, no text',
        hint: 'El pasado simple de write es wrote.'
      },
      {
        id: 'ex-7',
        sentence: "They _____ [bought / buy / buyed] a new bicycle for their daughter's birthday.",
        options: ['bought', 'buy', 'buyed'],
        expected_answer: 'bought',
        spanish_translation: 'Compraron una nueva bicicleta para el cumpleaños de su hija.',
        image_prompt: 'Parents surprising a happy girl with a shiny red bicycle, 2D vector art, no text',
        hint: 'El pasado irregular de buy es bought.'
      },
      {
        id: 'ex-8',
        sentence: 'I _____ [lost / lose / loses] my office badge yesterday, but I found it today.',
        options: ['lost', 'lose', 'loses'],
        expected_answer: 'lost',
        spanish_translation: 'Perdí mi credencial de la oficina ayer, pero la encontré hoy.',
        image_prompt: 'An office worker looking with relief at an ID badge on a desk, 2D vector art, no text',
        hint: 'El pasado simple de lose es lost.'
      }
    ];
  } else if (low.includes('conditional') || low.includes('condicional') || low.includes('if')) {
    modelSentence1 = 'If you practice speaking every day, your fluency will improve rapidly.';
    modelSentenceTrans1 = 'Si practicas hablar todos los días, tu fluidez mejorará rápidamente.';
    modelSentence2 = 'If it rains tomorrow morning, we will stay at home and study.';
    modelSentenceTrans2 = 'Si llueve mañana por la mañana, nos quedaremos en casa a estudiar.';
    ruleTitle = 'Conditionals: Real Cause & Effect';
    formulaText = '[ If + Present Simple ], [ Sujeto + will + Verbo Base ]';
    errorWrong = 'If you will study hard, you pass the exam.';
    errorCorrect = 'If you study hard, you will pass the exam.';
    errorTip = 'En la cláusula con If usamos Present Simple; el will va en el resultado.';
    exercises = [
      {
        id: 'ex-1',
        sentence: 'If you _____ [study / will study / studied] every day, your English will improve rapidly.',
        options: ['study', 'will study', 'studied'],
        expected_answer: 'study',
        spanish_translation: 'Si estudias todos los días, tu inglés mejorará rápidamente.',
        image_prompt: 'A dedicated student studying at a bright desk with books, 2D vector art, no text',
        hint: 'Tras If usamos Present Simple: study.'
      },
      {
        id: 'ex-2',
        sentence: 'If it rains tomorrow, we _____ [will stay / stay / stayed] at home.',
        options: ['will stay', 'stay', 'stayed'],
        expected_answer: 'will stay',
        spanish_translation: 'Si llueve mañana, nos quedaremos en casa.',
        image_prompt: 'Raindrops on a cozy window looking at a warm living room, 2D vector art, no text',
        hint: 'La consecuencia futura lleva will + verbo base.'
      },
      {
        id: 'ex-3',
        sentence: 'She will pass the exam if she _____ [works / will work / worked] hard.',
        options: ['works', 'will work', 'worked'],
        expected_answer: 'works',
        spanish_translation: 'Ella aprobará el examen si trabaja duro.',
        image_prompt: 'A happy student holding an exam with top marks, 2D vector art, no text',
        hint: 'En la cláusula If con She agregamos -s: works.'
      },
      {
        id: 'ex-4',
        sentence: "If you don't leave now, you _____ [will miss / miss / missed] the morning train.",
        options: ['will miss', 'miss', 'missed'],
        expected_answer: 'will miss',
        spanish_translation: 'Si no sales ahora, perderás el tren de la mañana.',
        image_prompt: 'A person checking their watch rushing toward a train platform, 2D vector art, no text',
        hint: 'Consecuencia futura: will miss.'
      },
      {
        id: 'ex-5',
        sentence: 'What _____ [will you do / do you / you will do] if it is sunny this Saturday?',
        options: ['will you do', 'do you', 'you will do'],
        expected_answer: 'will you do',
        spanish_translation: '¿Qué harás si está soleado este sábado?',
        image_prompt: 'Friends planning an outdoor picnic under bright blue skies, 2D vector art, no text',
        hint: 'Pregunta en First Conditional: What will you do if...?'
      },
      {
        id: 'ex-6',
        sentence: 'If they offer you the job, _____ [will you accept / do you accept / you accept] it?',
        options: ['will you accept', 'do you accept', 'you accept'],
        expected_answer: 'will you accept',
        spanish_translation: 'Si te ofrecen el trabajo, ¿lo aceptarás?',
        image_prompt: 'A professional shaking hands in a business interview, 2D vector art, no text',
        hint: 'Pregunta condicional: will you accept.'
      },
      {
        id: 'ex-7',
        sentence: 'I _____ [will call / call / called] you as soon as I arrive at the airport.',
        options: ['will call', 'call', 'called'],
        expected_answer: 'will call',
        spanish_translation: 'Te llamaré tan pronto como llegue al aeropuerto.',
        image_prompt: 'A traveler holding a smartphone inside an airport terminal, 2D vector art, no text',
        hint: 'Acción principal futura: will call.'
      },
      {
        id: 'ex-8',
        sentence: "If we don't hurry, the store _____ [will close / closes / closed] before we arrive.",
        options: ['will close', 'closes', 'closed'],
        expected_answer: 'will close',
        spanish_translation: 'Si no nos apresuramos, la tienda cerrará antes de que lleguemos.',
        image_prompt: 'A couple walking fast down a city shopping street at dusk, 2D vector art, no text',
        hint: 'Consecuencia futura: will close.'
      }
    ];
  } else {
    modelSentence1 = `We apply ${topic} in daily conversations with precision and confidence.`;
    modelSentenceTrans1 = `Aplicamos ${topic} en conversaciones diarias con precisión y confianza.`;
    modelSentence2 = `She practices speaking and applies ${topic} in real situations.`;
    modelSentenceTrans2 = `Ella practica hablar y aplica ${topic} en situaciones reales.`;
    ruleTitle = `Estructura Nuclear: ${topic}`;
    formulaText = `[ Sujeto ] + [ ${topic} Structure ] + [ Complemento ]`;
    errorWrong = `He use ${topic} without following the correct syntax.`;
    errorCorrect = `He uses ${topic} following the correct syntax.`;
    errorTip = `Mantén siempre el orden sintáctico natural y la concordancia de ${topic}.`;
    exercises = [
      {
        id: 'ex-1',
        sentence: `When speaking about ${topic}, you should always _____ [practice / practicing / practiced] with confidence.`,
        options: ['practice', 'practicing', 'practiced'],
        expected_answer: 'practice',
        spanish_translation: `Al hablar sobre ${topic}, siempre debes practicar con confianza.`,
        image_prompt: `A student practicing speaking English in a modern study lounge, 2D vector art, no text`,
        hint: `Tras should usamos el verbo en forma base: practice.`
      },
      {
        id: 'ex-2',
        sentence: `She _____ [speaks / speak / speaking] clearly when applying ${topic} in her conversations.`,
        options: ['speaks', 'speak', 'speaking'],
        expected_answer: 'speaks',
        spanish_translation: `Ella habla claramente cuando aplica ${topic} en sus conversaciones.`,
        image_prompt: `A woman speaking in a friendly discussion with colleagues, 2D vector art, no text`,
        hint: `Tercera persona singular: speaks.`
      },
      {
        id: 'ex-3',
        sentence: `They _____ [understand / understands / understanding] the core concepts of this topic very well.`,
        options: ['understand', 'understands', 'understanding'],
        expected_answer: 'understand',
        spanish_translation: `Ellos entienden muy bien los conceptos clave de este tema.`,
        image_prompt: `A team of students smiling while reviewing study cards, 2D vector art, no text`,
        hint: `Con They usamos la forma base: understand.`
      },
      {
        id: 'ex-4',
        sentence: `I _____ [learned / learn / learning] how to use ${topic} correctly in my English class.`,
        options: ['learned', 'learn', 'learning'],
        expected_answer: 'learned',
        spanish_translation: `Aprendí cómo usar ${topic} correctamente en mi clase de inglés.`,
        image_prompt: `A learner taking structured notes in a colorful notebook, 2D vector art, no text`,
        hint: `Acción completada en pasado: learned.`
      },
      {
        id: 'ex-5',
        sentence: `Can you _____ [explain / explains / explaining] this structure in your own words?`,
        options: ['explain', 'explains', 'explaining'],
        expected_answer: 'explain',
        spanish_translation: `¿Puedes explicar esta estructura con tus propias palabras?`,
        image_prompt: `A teacher gesturing encouragingly to a student, 2D vector art, no text`,
        hint: `Tras el modal Can usamos forma base: explain.`
      },
      {
        id: 'ex-6',
        sentence: `We always _____ [review / reviews / reviewing] the key grammar rules before the quiz.`,
        options: ['review', 'reviews', 'reviewing'],
        expected_answer: 'review',
        spanish_translation: `Nosotros siempre repasamos las reglas gramaticales clave antes del quiz.`,
        image_prompt: `Students reviewing a colorful whiteboard with formula cards, 2D vector art, no text`,
        hint: `Con We usamos review.`
      },
      {
        id: 'ex-7',
        sentence: `David _____ [writes / write / writing] down all the model examples in his notebook.`,
        options: ['writes', 'write', 'writing'],
        expected_answer: 'writes',
        spanish_translation: `David anota todos los ejemplos modelo en su cuaderno.`,
        image_prompt: `A student writing neatly with a pen on paper, 2D vector art, no text`,
        hint: `Tercera persona singular David: writes.`
      },
      {
        id: 'ex-8',
        sentence: `It is essential to _____ [communicate / communicates / communicating] your ideas clearly.`,
        options: ['communicate', 'communicates', 'communicating'],
        expected_answer: 'communicate',
        spanish_translation: `Es fundamental comunicar tus ideas con claridad.`,
        image_prompt: `People conversing in an international conference room, 2D vector art, no text`,
        hint: `Tras to usamos infinitivo base: communicate.`
      }
    ];
  }

  return {
    id: lessonId || `lesson-${Date.now()}`,
    title: topic,
    sublevel: sublevel,
    phases: [
      {
        phase_number: 1,
        phase_name: `1. Situación y Gancho Didáctico: ${topic}`,
        is_hook: true,
        hook_type: 'dilemma',
        tutor_says: `¡Hola! Bienvenido a tu clase sobre ${topic}. Hoy aprenderemos las fórmulas y expresiones auténticas para que puedas comunicarte con total seguridad y naturalidad. Fíjate en la situación de apertura.`,
        board_content: `📌 TEMA CENTRAL: ${topic.toUpperCase()}\n\n• Nivel CEFR: ${sublevel}\n• Enfoque: Dominio comunicativo y gramática activa.\n\n👉 Oración Modelo Principal:\n"${modelSentence1}"\n(Traducción: ${modelSentenceTrans1})`,
        image_style: 'comic_scene',
        image_prompt: `Clean flat 2D vector educational illustration of a relatable human scene about ${topic}, vibrant colors, warm lighting, strictly no text, no words`,
        target_audio_items: [
          { english: modelSentence1, translation: modelSentenceTrans1, label: 'Oración Principal' },
          { english: modelSentence2, translation: modelSentenceTrans2, label: 'Ejemplo Modelo' }
        ],
        student_task: null,
        expected_answer: null,
        interaction_type: 'explanation'
      },
      {
        phase_number: 2,
        phase_name: `2. Modelo Mental y Fundamentos`,
        is_hook: false,
        tutor_says: `Comprender la estructura detrás de ${topic} es muy sencillo si piensas en las conexiones entre las palabras. Observa la fórmula y cómo cada término cumple un rol indispensable en la frase.`,
        board_content: `⚡ ${ruleTitle.toUpperCase()}:\n\n• Fórmula: ${formulaText}\n\n👉 Ejemplo Modelo 1:\n"${modelSentence1}"\n\n👉 Ejemplo Modelo 2:\n"${modelSentence2}"\n\n📌 Regla de oro: ${errorTip}`,
        image_style: 'flat_art',
        image_prompt: `Clean 2D vector educational graphic of grammar structure flow with colorful cards and connectors, strictly no text, no words`,
        target_audio_items: [
          { english: modelSentence1, translation: modelSentenceTrans1, label: 'Estructura Clave' },
          { english: modelSentence2, translation: modelSentenceTrans2, label: 'Ejemplo 2' }
        ],
        grammar_structure: {
          title: ruleTitle,
          formula: formulaText,
          formula_tokens: [
            { role: 'Sujeto', pattern: 'I / You / He / She / We / They', color: 'blue' },
            { role: 'Estructura', pattern: topic, color: 'purple' },
            { role: 'Complemento', pattern: 'Context / Time / Object', color: 'emerald' }
          ],
          explanation: `Aplica la regla de ${topic} respetando siempre la posición sintáctica de cada término.`,
          example_breakdowns: [
            {
              english: modelSentence1,
              spanish: modelSentenceTrans1,
              parts: [
                { role: 'Sujeto', text: modelSentence1.split(' ')[0] || 'I', color: 'blue' },
                { role: 'Estructura', text: topic.slice(0, 20), color: 'purple' }
              ]
            }
          ],
          tips: errorTip
        },
        student_task: null,
        expected_answer: null,
        interaction_type: 'explanation'
      },
      {
        phase_number: 3,
        phase_name: `3. Reto de Pronunciación y Ritmo de Frase`,
        is_hook: false,
        tutor_says: `Es momento de entrenar tu pronunciación y fluidez oral. Escucha atentamente la oración modelo y graba tu voz con el micrófono conectando las palabras con ritmo natural.`,
        board_content: `🗣️ RETO FONÉTICO:\n\n• "${modelSentence1}"\n(Traducción: ${modelSentenceTrans1})\n\nClave de articulación:\n• Conecta las palabras con ritmo continuo\n• Mantén el acento en las palabras de contenido`,
        image_style: 'comic_scene',
        image_prompt: `Clean 2D vector illustration of a student speaking into a studio microphone with headphones on, soundwaves on screen, strictly no text, no words`,
        target_audio_items: [
          { english: modelSentence1, translation: modelSentenceTrans1, label: 'Práctica Oral' }
        ],
        student_task: `Pronuncia en voz alta: "${modelSentence1}"`,
        expected_answer: modelSentence1,
        interaction_type: 'pronunciation'
      },
      {
        phase_number: 4,
        phase_name: `4. Detección y Corrección de Errores Típicos`,
        is_hook: false,
        tutor_says: `Analicemos el error más común que cometen los hispanohablantes al usar ${topic}. Decimos "${errorCorrect}" y nunca "${errorWrong}". Observa el duelo de oraciones en la pizarra y resuelve el desafío.`,
        board_content: `⚔️ DUELO DE CONCEPTOS: EVITA ESTE ERROR\n\n❌ Incorrecto: "${errorWrong}"\n✅ Correcto: "${errorCorrect}"\n\n📌 Explicación: ${errorTip}`,
        image_style: 'concept_art',
        image_prompt: `Clean 2D educational graphic of a chalkboard with green checkmarks and red cross highlights, strictly no text, no words`,
        target_audio_items: [
          { english: errorCorrect, translation: 'Oración corregida', label: 'Frase Correcta' }
        ],
        student_task: `Corrige la oración: "${errorWrong}"`,
        expected_answer: errorCorrect,
        interaction_type: 'error_correction'
      },
      {
        phase_number: 5,
        phase_name: `5. Desafío Práctico: Aplica ${topic}`,
        is_hook: false,
        is_practice_slide: true,
        interaction_type: 'quiz',
        exercises: exercises,
        tutor_says: `¡Excelente progreso! Ahora pondremos a prueba tu dominio con oraciones completas contextualizadas. Observa la imagen de cada situación, completa el espacio con la opción correcta y practica diciendo la frase completa con tu micrófono.`,
        board_content: exercises.map((ex, i) => `${i + 1}. ${ex.sentence}\n   Opciones: ${(ex.options || []).join(', ')}\n   💡 ${ex.spanish_translation}\n`).join('\n'),
        image_style: 'flat_art',
        image_prompt: `Flat 2D vector educational illustration of an engaging study session with flashcards, vibrant colors, strictly no text`,
        target_audio_items: exercises.slice(0, 3).map((ex, i) => ({
          english: ex.sentence.replace('_____', ex.expected_answer),
          translation: ex.spanish_translation,
          label: `Ejercicio ${i + 1}`
        })),
        student_task: `Resuelve los desafíos de oraciones completas y evalúa tu pronunciación con el micrófono.`,
        expected_answer: exercises[0]?.expected_answer || 'Complete the sentence'
      },
      {
        phase_number: 6,
        phase_name: `6. Resumen y Dominio: ${topic}`,
        is_hook: false,
        tutor_says: `¡Felicitaciones! Has completado tu clase sobre ${topic}. Hoy dominaste las estructuras fundamentales, evitaste los errores comunes y practicaste oraciones reales. ¡Continúa con la práctica de lectura y los juegos!`,
        board_content: `🎉 LOGRO ALCANZADO: ${topic.toUpperCase()}\n\n✔ Estructura dominada con precisión\n✔ Pronunciación fluida entrenada\n✔ Ejercicios interactivos completados con éxito`,
        image_style: 'comic_scene',
        image_prompt: `Clean 2D vector illustration of celebration and progress in English learning with golden stars and trophy, strictly no text, no words`,
        target_audio_items: [
          { english: `I can use ${topic} confidently in real English conversations.`, translation: `Puedo usar ${topic} con seguridad en conversaciones reales en inglés.`, label: 'Frase de Cierre' }
        ],
        student_task: `Di la frase final: "I can use ${topic} confidently in real English conversations."`,
        expected_answer: `I can use ${topic} confidently in real English conversations.`,
        interaction_type: 'pronunciation'
      }
    ]
  };
}

export default function LessonPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const lessonId = params.id as string;
  const topicParam = searchParams.get('topic') || 'Greetings and Introductions';
  const sublevelParam = searchParams.get('sublevel') || 'A1.1';
  const classIndexParam = parseInt(searchParams.get('class_index') || '1', 10);

  const [loadingLesson, setLoadingLesson] = useState(true);
  const [loadingStage, setLoadingStage] = useState<string>('Diseñando guion didáctico y plan pedagógico...');
  const [lesson, setLesson] = useState<any>(null);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [tutorState, setTutorState] = useState<'idle' | 'speaking' | 'listening' | 'thinking'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showDynamicSubtitles, setShowDynamicSubtitles] = useState(true);
  const [showPhoneticModal, setShowPhoneticModal] = useState(false);
  const [currentSpeakingText, setCurrentSpeakingText] = useState<string>('');
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, string>>({});
  const [currentChunkIdx, setCurrentChunkIdx] = useState<number>(0);
  const [revealedTargets, setRevealedTargets] = useState<Set<string>>(new Set(['image']));
  const [selectedExerciseIdx, setSelectedExerciseIdx] = useState<number>(0);
  const [selectedChallengeOption, setSelectedChallengeOption] = useState<string | null>(null);

  // 🎨 Consolidated View Modes: 'board' (Pizarra Interactiva), 'timeline' (Flujo Didáctico), 'reading' (Práctica de Lectura), or 'games' (Game Arena)
  const [viewMode, setViewMode] = useState<'board' | 'timeline' | 'reading' | 'games'>('board');
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string>('');
  const [minimaxImageMap, setMinimaxImageMap] = useState<Record<string, string>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const inFlightImagePromisesRef = useRef<{ [key: string]: Promise<string> | undefined }>({});

  const fetchPhaseImage = useCallback(async (phaseIdx: number, topic: string, phaseObj?: any, imageIdx = 0, customPrompt?: string): Promise<string> => {
    const promptKey = `${phaseIdx}-${topic}${imageIdx > 0 ? `-img${imageIdx}` : ''}`;
    if (minimaxImageMap[promptKey]) {
      return minimaxImageMap[promptKey];
    }
    const existing = inFlightImagePromisesRef.current[promptKey];
    if (existing) {
      return existing;
    }

    const p = phaseObj || lesson?.phases?.[phaseIdx];
    let promptToUse = customPrompt;
    if (!promptToUse) {
      if (p?.hook_images && Array.isArray(p.hook_images) && p.hook_images[imageIdx]) {
        const hi = p.hook_images[imageIdx];
        promptToUse = typeof hi === 'string' ? hi : (hi.prompt || hi.image_prompt);
      } else if (imageIdx === 0) {
        promptToUse = p?.image_prompt;
      }
    }

    const pPrompt = typeof promptToUse === 'string' && promptToUse.trim().length > 8
      ? promptToUse.trim()
      : `Educational 2D vector illustration of ${topic} for English lesson (${p?.phase_name || 'Clase'}), clean minimal graphic style`;
    const sanitizedPrompt = sanitizeImagePrompt(pPrompt, topic, phaseIdx);

    setGeneratingImages(prev => ({ ...prev, [promptKey]: true }));

    const promise = (async () => {
      let finalUrl = '';
      try {
        const res: any = await api.generateImage(sanitizedPrompt, '16:9');
        if (res && res.success && (res.url || res.image_url)) {
          finalUrl = res.url || res.image_url;
          console.log(`🎨 MiniMax image-01 generated for slide ${phaseIdx} img ${imageIdx}:`, finalUrl);
        } else {
          console.warn(`MiniMax image-01 returned no URL for slide ${phaseIdx} img ${imageIdx}:`, res);
        }
      } catch (err) {
        console.warn(`MiniMax image generation for slide ${phaseIdx} img ${imageIdx} failed:`, err);
      }

      if (!finalUrl) {
        // Fallback only if MiniMax generation explicitly failed
        finalUrl = getFallbackImageUrl(sanitizedPrompt, topic, phaseIdx + imageIdx * 17);
      }

      await preloadImage(finalUrl, 4000).catch(() => {});
      setMinimaxImageMap(prev => ({ ...prev, [promptKey]: finalUrl }));
      setGeneratingImages(prev => ({ ...prev, [promptKey]: false }));
      delete inFlightImagePromisesRef.current[promptKey];
      return finalUrl;
    })();

    inFlightImagePromisesRef.current[promptKey] = promise;
    return promise;
  }, [lesson, minimaxImageMap]);

  const fetchExerciseImage = useCallback(async (prompt: string, promptKey: string): Promise<string> => {
    if (minimaxImageMap[promptKey]) {
      return minimaxImageMap[promptKey];
    }
    const existing = inFlightImagePromisesRef.current[promptKey];
    if (existing) {
      return existing;
    }

    const sanitizedPrompt = sanitizeImagePrompt(prompt, topicParam, currentPhaseIdx);
    setGeneratingImages(prev => ({ ...prev, [promptKey]: true }));

    const promise = (async () => {
      let finalUrl = '';
      try {
        const res: any = await api.generateImage(sanitizedPrompt, '16:9');
        if (res && res.success && (res.url || res.image_url)) {
          finalUrl = res.url || res.image_url;
        }
      } catch (err) {
        console.warn(`MiniMax image generation for exercise ${promptKey} failed:`, err);
      }

      if (!finalUrl) {
        finalUrl = getFallbackImageUrl(sanitizedPrompt, topicParam, currentPhaseIdx + 29);
      }

      await preloadImage(finalUrl, 4000).catch(() => {});
      setMinimaxImageMap(prev => ({ ...prev, [promptKey]: finalUrl }));
      setGeneratingImages(prev => ({ ...prev, [promptKey]: false }));
      delete inFlightImagePromisesRef.current[promptKey];
      return finalUrl;
    })();

    inFlightImagePromisesRef.current[promptKey] = promise;
    return promise;
  }, [minimaxImageMap, topicParam, currentPhaseIdx]);

  // Preload images for current and adjacent slides
  useEffect(() => {
    if (!lesson?.phases) return;
    const currentP = lesson.phases[currentPhaseIdx];
    if (currentP) {
      fetchPhaseImage(currentPhaseIdx, topicParam, currentP, 0);
      if (currentP.hook_images && Array.isArray(currentP.hook_images) && currentP.hook_images.length > 1) {
        fetchPhaseImage(currentPhaseIdx, topicParam, currentP, 1);
      }
    }
    if (currentPhaseIdx + 1 < lesson.phases.length) {
      const nextP = lesson.phases[currentPhaseIdx + 1];
      fetchPhaseImage(currentPhaseIdx + 1, topicParam, nextP, 0);
      if (nextP.hook_images && Array.isArray(nextP.hook_images) && nextP.hook_images.length > 1) {
        fetchPhaseImage(currentPhaseIdx + 1, topicParam, nextP, 1);
      }
    }
  }, [lesson, currentPhaseIdx, topicParam, fetchPhaseImage]);

  // 🎬 Cinema mode & audio tracking
  const [cinemaModeActive, setCinemaModeActive] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); // 0–100
  // 📖 Board karaoke: reveal lines one-by-one as tutor speaks
  const [revealedLineCount, setRevealedLineCount] = useState<number>(999);

  // 🎬 Progressive Live Classroom & Storyboard Stepper
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [revealedStepCount, setRevealedStepCount] = useState<number>(1);
  const [isFullBoardRevealed, setIsFullBoardRevealed] = useState<boolean>(false);

  const phase = lesson?.phases?.[currentPhaseIdx] || {};
  const isALevel = (sublevelParam || '').startsWith('A1') || (sublevelParam || '').startsWith('A2');

  const phaseStoryboardSteps = useMemo(() => {
    return getPhaseStoryboardSteps(phase, topicParam);
  }, [phase, topicParam]);

  const phaseStoryboardTimeline = useMemo(() => {
    return getPhaseStoryboardTimeline(phase, topicParam);
  }, [phase, topicParam]);

  const currentDiagramSvg = useMemo(() => {
    return getPhaseDiagramSvg(phase, topicParam);
  }, [phase, topicParam]);

  const phaseTimeline = useMemo(() => {
    const speech = typeof phase?.tutor_says === 'string' ? phase.tutor_says : phase?.tutor_says?.text || '';
    return buildPhaseSpeechTimeline(speech);
  }, [phase]);

  const targetAudioItems = useMemo(() => {
    return extractTargetAudioItems(phase);
  }, [phase]);

  const parsedExercisesData = useMemo(() => {
    return parseExercisesAndBoardLines(
      phase?.board_content,
      phase?.student_task,
      phase?.phase_number || (currentPhaseIdx + 1),
      phase?.interaction_type
    );
  }, [phase, currentPhaseIdx]);

  const cleanBoardLines = parsedExercisesData.cleanBoardLines;
  const exercises = parsedExercisesData.exercises;
  const instructionHeader = parsedExercisesData.instructionHeader;

  // Exact acoustic timings for board lines
  const boardLinesTiming = useMemo(() => {
    return cleanBoardLines.map((line, idx) => {
      const quoteMatch = line.match(/"([^"]+)"|'([^']+)'|«([^»]+)»/);
      const textToSearch = quoteMatch
        ? (quoteMatch[1] || quoteMatch[2] || quoteMatch[3])
        : line.replace(/^[•📌🎯⚡👉✔❌✅\d\.\-\s:]+/, '').trim();
      const fallbackRatio = (idx / Math.max(cleanBoardLines.length, 1)) * 0.60;
      return findPhraseTimingInTimeline(textToSearch, phaseTimeline, fallbackRatio);
    });
  }, [cleanBoardLines, phaseTimeline]);

  // Exact acoustic timings for target audio examples
  const targetAudioItemsTiming = useMemo(() => {
    return targetAudioItems.map((item, idx) => {
      const fallbackRatio = 0.35 + (idx / Math.max(targetAudioItems.length, 1)) * 0.50;
      return findPhraseTimingInTimeline(item.english, phaseTimeline, fallbackRatio);
    });
  }, [targetAudioItems, phaseTimeline]);

  // Normalized Grammar Structure Object
  const normalizedGrammarStructure = useMemo<any>(() => {
    const raw = phase?.grammar_structure || phase?.key_structure;
    if (!raw) return null;
    if (typeof raw === 'object' && raw.formula_tokens && Array.isArray(raw.formula_tokens) && raw.formula_tokens.length > 0) {
      return raw;
    }
    if (typeof raw === 'string') {
      const tokens = raw
        .split(/\s*\+\s*|\s*→\s*|\s*\|\s*/)
        .filter(Boolean)
        .map((tok: string, idx: number) => {
          const colors = ['blue', 'purple', 'emerald', 'amber', 'rose', 'cyan'];
          const cleanTok = tok.replace(/[\[\]]/g, '').trim();
          return {
            role: cleanTok,
            pattern: cleanTok,
            color: colors[idx % colors.length],
          };
        });
      return {
        title: typeof phase.key_structure === 'string' ? phase.key_structure : 'Estructura Gramatical Clave',
        formula: raw,
        formula_tokens: tokens,
      };
    }
    if (typeof raw === 'object') {
      return raw;
    }
    return null;
  }, [phase]);

  // Exact acoustic timings for formula tokens with token trigger expansion
  const grammarTokensTiming = useMemo(() => {
    if (!normalizedGrammarStructure?.formula_tokens || !Array.isArray(normalizedGrammarStructure.formula_tokens) || normalizedGrammarStructure.formula_tokens.length === 0) {
      return [];
    }
    const tokens = normalizedGrammarStructure.formula_tokens;

    // Estimate grammar explanation window in speech
    const grammarGeneralTiming = findPhraseTimingInTimeline(
      'fórmula estructura patrón orden regla sintaxis',
      phaseTimeline,
      0.30
    );

    const gStart = grammarGeneralTiming.found ? grammarGeneralTiming.startRatio : 0.25;
    const gEnd = Math.min(Math.max(grammarGeneralTiming.endRatio, gStart + 0.35), 0.85);
    const tokenSpan = (gEnd - gStart) / Math.max(tokens.length, 1);

    return tokens.map((token: any, idx: number) => {
      const role = (token.role || token.label || '').toLowerCase();
      const pattern = (token.pattern || token.token || '').toLowerCase();
      const triggers: string[] = [];

      if (role) {
        triggers.push(role);
        if (role.includes('sujeto') || role.includes('subject') || role.includes('pronombre')) {
          triggers.push('sujeto', 'sujetos', 'subject', 'pronombre', 'pronombres', 'persona', 'i', 'you', 'he', 'she', 'we', 'they');
        } else if (role.includes('verbo') || role.includes('verb') || role.includes('acción')) {
          triggers.push('verbo', 'verbos', 'verb', 'acción', 'acciones', 'base');
        } else if (role.includes('auxiliar') || role.includes('aux')) {
          triggers.push('auxiliar', 'auxiliares', 'do', 'does', 'don\'t', 'doesn\'t', 'did', 'didn\'t');
        } else if (role.includes('frecuencia') || role.includes('frequency') || role.includes('adverb')) {
          triggers.push('frecuencia', 'adverbio', 'adverbios', 'always', 'usually', 'sometimes', 'never');
        } else if (role.includes('complemento') || role.includes('complement') || role.includes('objeto')) {
          triggers.push('complemento', 'complementos', 'objeto', 'predicado', 'resto');
        }
      }

      if (pattern) {
        triggers.push(pattern);
        const patternWords = pattern.split(/[\s\/\+\,\.\(\)]+/).filter((w: string) => w.length >= 2);
        triggers.push(...patternWords);
      }

      let bestMatch = {
        startRatio: gStart + idx * tokenSpan,
        endRatio: gStart + (idx + 1) * tokenSpan,
        found: false,
      };

      for (const trigger of triggers) {
        const match = findPhraseTimingInTimeline(trigger, phaseTimeline, bestMatch.startRatio);
        if (match.found) {
          bestMatch = match;
          break;
        }
      }

      return {
        tokenIndex: idx,
        role: token.role || '',
        pattern: token.pattern || '',
        startRatio: bestMatch.startRatio,
        endRatio: Math.max(bestMatch.endRatio, bestMatch.startRatio + 0.08),
        found: bestMatch.found,
      };
    });
  }, [normalizedGrammarStructure, phaseTimeline]);

  // Active grammar token detection with high-accuracy matching
  const activeGrammarToken = useMemo(() => {
    if (tutorState !== 'speaking' || isFullBoardRevealed || grammarTokensTiming.length === 0) return null;
    const currentRatio = audioProgress / 100;

    for (const t of grammarTokensTiming) {
      if (currentRatio >= t.startRatio && currentRatio <= t.endRatio) {
        return {
          tokenIndex: t.tokenIndex,
          role: t.role,
          pattern: t.pattern,
        };
      }
    }
    return null;
  }, [tutorState, isFullBoardRevealed, audioProgress, grammarTokensTiming]);

  // 🎙️ Universal Per-Item Pronunciation Practice States (Works in ALL views)
  const [itemRecordingKey, setItemRecordingKey] = useState<string | null>(null);
  const [itemProcessingKey, setItemProcessingKey] = useState<string | null>(null);
  const [itemLiveTranscript, setItemLiveTranscript] = useState<string>('');
  const [itemEvals, setItemEvals] = useState<Record<string, {
    is_correct: boolean;
    overall_score: number;
    feedback: string;
    corrected_answer?: string;
  }>>({});

  // Audio Cancellation and Session Refs
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioSessionIdRef = useRef<number>(0);
  const lastSpokenPhaseRef = useRef<number | null>(null);
  const cinemaModeRef = useRef(false);
  const lineRevealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cinemaNextSlideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioFinishedNaturallyRef = useRef(false);
  const itemRecognitionRef = useRef<any>(null);
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCurrentAudio = () => {
    audioSessionIdRef.current += 1;
    stopTutorVoice();
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {}
      currentAudioRef.current = null;
    }
    setTutorState('idle');
    setAudioProgress(0);
    audioFinishedNaturallyRef.current = false;
    if (lineRevealTimerRef.current) {
      clearInterval(lineRevealTimerRef.current);
      lineRevealTimerRef.current = null;
    }
    if (cinemaNextSlideRef.current) {
      clearTimeout(cinemaNextSlideRef.current);
      cinemaNextSlideRef.current = null;
    }
  };

  const hasFetchedRef = useRef(false);

  // 1. Fetch or Generate Lesson Script + Pre-generate Slide 0 completely before revealing UI
  useEffect(() => {
    async function loadOrCreateLesson() {
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;

      setLoadingLesson(true);
      setLoadingStage('Diseñando guion didáctico y plan pedagógico...');

      api.getSettings().then((settings) => {
        if (settings?.preferred_voice) {
          setSavedPreferredVoice(settings.preferred_voice);
        }
      }).catch(() => {});

      try {
        let data: any = null;

        if (lessonId && lessonId !== 'new' && !lessonId.startsWith('a1') && !lessonId.startsWith('a2') && !lessonId.startsWith('b1') && !lessonId.startsWith('b2')) {
          try {
            const existing = await api.getLesson(lessonId);
            if (existing && existing.script && existing.script.phases) {
              data = {
                id: existing.id || lessonId,
                title: existing.topic || topicParam,
                sublevel: existing.sublevel || sublevelParam,
                phases: existing.script.phases || [],
              };
            }
          } catch (e) {
            console.warn('Lesson ID not found in DB, generating new lesson script...');
          }
        }

        if (!data) {
          try {
            const genRes = await api.generateAdaptiveLesson(sublevelParam, classIndexParam, topicParam);
            data = {
              id: genRes.lesson_id || lessonId,
              title: topicParam,
              sublevel: sublevelParam,
              phases: genRes.script?.phases || [],
              phonetic_focus: genRes.adaptive_plan?.phonetic_focus || genRes.script?.phonetic_focus,
              archetype: genRes.adaptive_plan?.archetype || genRes.script?.archetype,
            };

            if (genRes.lesson_id && typeof window !== 'undefined' && window.history.replaceState) {
              const newUrl = `/lesson/${genRes.lesson_id}?topic=${encodeURIComponent(topicParam)}&sublevel=${encodeURIComponent(sublevelParam)}&class_index=${classIndexParam}`;
              window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
            }
          } catch (genErr) {
            console.warn('generateAdaptiveLesson failed, activating rich offline lesson fallback:', genErr);
          }
        }

        if (!data || !data.phases || data.phases.length === 0) {
          data = buildFrontendOfflineLesson(topicParam || 'English Practice', sublevelParam || 'A1.1', lessonId || `fallback-${Date.now()}`);
        }

        // 🛡️ Ensure any lesson loaded from Cloud/Supabase ALWAYS has clean explanation phases and practice slide strictly at the end
        if (data?.phases && Array.isArray(data.phases) && data.phases.length > 1) {
          const allPhases = [...data.phases];
          const cleanExplanationPhases: any[] = [];
          const collectedExercises: any[] = [];
          let existingBonusPhase: any = null;

          allPhases.forEach((p: any, pIdx: number) => {
            // Check for phonetic bonus phase
            const isPh = Boolean(
              p.is_phonetic_bonus ||
              p.phonetic_focus ||
              p.phase_name?.toLowerCase().includes('fonét') ||
              p.phase_name?.toLowerCase().includes('bonus de pronunciación')
            );
            if (isPh) {
              existingBonusPhase = p;
              return;
            }

            // Helper to check if an item is a valid English practice sentence (not a Spanish prompt)
            const isValidEnglishExercise = (ex: any) => {
              if (!ex) return false;
              const sent = (ex.sentence || ex.question || '').trim();
              if (!sent || sent.length < 6) return false;
              if (/[áéíóúÁÉÍÓÚñÑ¿¡]/.test(sent)) return false;
              const s = sent.toLowerCase();
              if (s.includes('selecciona') || s.includes('pronuncia') || s.includes('completa') || s.includes('crea una') || s.includes('di la frase') || s.includes('oración')) {
                return false;
              }
              return Boolean(sent.includes('___') || (ex.options && ex.options.length >= 2) || (ex.expected_answer && ex.expected_answer.length > 1));
            };

            // Extract ONLY structured English exercises from phases
            if (p.exercises && Array.isArray(p.exercises)) {
              p.exercises.forEach((ex: any) => {
                if (isValidEnglishExercise(ex)) {
                  collectedExercises.push(ex);
                }
              });
            }

            // If it was already a dedicated practice slide, don't duplicate it in explanation phases
            if (p.is_practice_slide || (p.interaction_type === 'quiz' && pIdx >= allPhases.length - 2)) {
              return;
            }

            // Clean conceptual explanation phase
            p.is_practice_slide = false;
            p.exercises = [];
            cleanExplanationPhases.push(p);
          });

          // Topic-specific authentic 8-exercise bank
          const isPastTopic = topicParam.toLowerCase().includes('past') || topicParam.toLowerCase().includes('was');
          const isPresentTopic = topicParam.toLowerCase().includes('present') || topicParam.toLowerCase().includes('routine') || topicParam.toLowerCase().includes('habit');
          const isFutureTopic = topicParam.toLowerCase().includes('future') || topicParam.toLowerCase().includes('going to') || topicParam.toLowerCase().includes('will');

          const defaultExercises = isPastTopic ? [
            {
              id: 'ex-1',
              sentence: 'I was _____ [cooking / cooked / cook] dinner in the kitchen when the lights suddenly went out.',
              options: ['cooking', 'cooked', 'cook'],
              expected_answer: 'cooking',
              spanish_translation: 'Estaba cocinando la cena en la cocina cuando de repente se fue la luz.',
              image_prompt: 'A person holding a wooden spoon in a cozy kitchen looking surprised as lights go off, 2D vector art, no text',
              hint: 'Para la acción continua en el pasado usamos was + verbo con -ing.'
            },
            {
              id: 'ex-2',
              sentence: 'While we were _____ [walking / walked / walk] through the city park, it began to rain heavily.',
              options: ['walking', 'walked', 'walk'],
              expected_answer: 'walking',
              spanish_translation: 'Mientras estábamos caminando por el parque de la ciudad, empezó a llover fuerte.',
              image_prompt: 'Two friends walking on a tree-lined park path looking up as rain starts, 2D vector art, no text',
              hint: 'Con While we were... usamos verbo con -ing.'
            },
            {
              id: 'ex-3',
              sentence: 'David was _____ [driving / drove / drive] home from work when his phone rang.',
              options: ['driving', 'drove', 'drive'],
              expected_answer: 'driving',
              spanish_translation: 'David estaba conduciendo a casa del trabajo cuando sonó su teléfono.',
              image_prompt: 'A driver focused on a sunset highway while a phone lights up, 2D vector art, no text',
              hint: 'Sujeto singular David + was + driving.'
            },
            {
              id: 'ex-4',
              sentence: 'What were you _____ [doing / did / do] at eight o\'clock yesterday evening?',
              options: ['doing', 'did', 'do'],
              expected_answer: 'doing',
              spanish_translation: '¿Qué estabas haciendo a las ocho en punto ayer por la noche?',
              image_prompt: 'A young detective asking questions in a bright living room, 2D vector art, no text',
              hint: 'En preguntas: What were you + doing?'
            },
            {
              id: 'ex-5',
              sentence: 'They were _____ [playing / played / play] soccer in the stadium when the coach arrived.',
              options: ['playing', 'played', 'play'],
              expected_answer: 'playing',
              spanish_translation: 'Ellos estaban jugando fútbol en el estadio cuando llegó el entrenador.',
              image_prompt: 'Teenagers playing soccer on a green stadium grass field, 2D vector art, no text',
              hint: 'Sujeto plural They + were + playing.'
            },
            {
              id: 'ex-6',
              sentence: 'Elena was _____ [studying / studied / study] for her final exam while her brother was sleeping.',
              options: ['studying', 'studied', 'study'],
              expected_answer: 'studying',
              spanish_translation: 'Elena estaba estudiando para su examen final mientras su hermano dormía.',
              image_prompt: 'A student studying with books and a desk lamp at night, 2D vector art, no text',
              hint: 'Dos acciones continuas paralelas usan was/were + -ing.'
            },
            {
              id: 'ex-7',
              sentence: 'I _____ [dropped / was dropping / drop] my silver keys while I was running for the morning bus.',
              options: ['dropped', 'was dropping', 'drop'],
              expected_answer: 'dropped',
              spanish_translation: 'Se me cayeron las llaves plateadas mientras estaba corriendo tras el autobús matutino.',
              image_prompt: 'A commuter rushing toward a city bus as keys slip onto the sidewalk, 2D vector art, no text',
              hint: 'La acción puntual que interrumpe va en Past Simple (dropped).'
            },
            {
              id: 'ex-8',
              sentence: 'She was _____ [reading / read / reads] a fascinating mystery novel when the doorbell rang loudly.',
              options: ['reading', 'read', 'reads'],
              expected_answer: 'reading',
              spanish_translation: 'Ella estaba leyendo una fascinante novela de misterio cuando el timbre sonó fuerte.',
              image_prompt: 'A woman sitting in an armchair holding a book looking toward the front door, 2D vector art, no text',
              hint: 'Acción en progreso was reading interrumpida por el timbre.'
            }
          ] : isPresentTopic ? [
            {
              id: 'ex-1',
              sentence: 'Every weekday, Mateo _____ [wakes up / wake up / waking up] at six in the morning.',
              options: ['wakes up', 'wake up', 'waking up'],
              expected_answer: 'wakes up',
              spanish_translation: 'Cada día entre semana, Mateo se despierta a las seis de la mañana.',
              image_prompt: 'A person waking up cheerfully with morning sunrise light, 2D vector art, no text',
              hint: 'Tercera persona singular en Present Simple agrega -s.'
            },
            {
              id: 'ex-2',
              sentence: 'She always _____ [has / have / haves] a healthy breakfast before going to the gym.',
              options: ['has', 'have', 'haves'],
              expected_answer: 'has',
              spanish_translation: 'Ella siempre desayuna saludable antes de ir al gimnasio.',
              image_prompt: 'A person enjoying a healthy fruit breakfast, 2D vector art, no text',
              hint: 'Forma irregular de tercera persona para have es has.'
            },
            {
              id: 'ex-3',
              sentence: 'We usually _____ [drink / drinks / drinking] hot coffee together at the office.',
              options: ['drink', 'drinks', 'drinking'],
              expected_answer: 'drink',
              spanish_translation: 'Nosotros normalmente tomamos café caliente juntos en la oficina.',
              image_prompt: 'Coworkers smiling with coffee mugs in an office, 2D vector art, no text',
              hint: 'Con We usamos la forma base drink.'
            },
            {
              id: 'ex-4',
              sentence: 'Carlos _____ [goes / go / gos] to work by subway every morning.',
              options: ['goes', 'go', 'gos'],
              expected_answer: 'goes',
              spanish_translation: 'Carlos va a trabajar en metro todas las mañanas.',
              image_prompt: 'A person waiting on a modern subway platform, 2D vector art, no text',
              hint: 'Verbos terminados en -o agregan -es.'
            },
            {
              id: 'ex-5',
              sentence: 'Elena _____ [watches / watch / watchs] educational documentaries on Friday evenings.',
              options: ['watches', 'watch', 'watchs'],
              expected_answer: 'watches',
              spanish_translation: 'Elena mira documentales educativos los viernes por la noche.',
              image_prompt: 'A person watching documentary on TV, 2D vector art, no text',
              hint: 'Verbos terminados en -ch agregan -es.'
            },
            {
              id: 'ex-6',
              sentence: 'They _____ [don\'t work / doesn\'t work / not work] on Sunday mornings.',
              options: ['don\'t work', 'doesn\'t work', 'not work'],
              expected_answer: 'don\'t work',
              spanish_translation: 'Ellos no trabajan los domingos por la mañana.',
              image_prompt: 'People walking relaxing in a sunny garden, 2D vector art, no text',
              hint: 'Presente negativo para They usa don\'t + verbo base.'
            },
            {
              id: 'ex-7',
              sentence: 'Does your brother _____ [exercise / exercises / exercising] at the sports club?',
              options: ['exercise', 'exercises', 'exercising'],
              expected_answer: 'exercise',
              spanish_translation: '¿Tu hermano hace ejercicio en el club deportivo?',
              image_prompt: 'A person exercising with weights in a gym, 2D vector art, no text',
              hint: 'Tras Does el verbo principal va en forma base.'
            },
            {
              id: 'ex-8',
              sentence: 'I sometimes _____ [sleep / sleeps / sleeping] eight full hours on weekends.',
              options: ['sleep', 'sleeps', 'sleeping'],
              expected_answer: 'sleep',
              spanish_translation: 'A veces duermo ocho horas completas los fines de semana.',
              image_prompt: 'A person sleeping in a comfortable bed, 2D vector art, no text',
              hint: 'Con el sujeto I el verbo no lleva -s.'
            }
          ] : [
            {
              id: 'ex-1',
              sentence: `When practicing daily, you should _____ [apply / applying / applied] the structure of ${topicParam} clearly.`,
              options: ['apply', 'applying', 'applied'],
              expected_answer: 'apply',
              spanish_translation: `Al practicar a diario, debes aplicar la estructura de ${topicParam} con claridad.`,
              image_prompt: `A smiling student studying with headphones and a tablet in a bright room, 2D vector art, no text`,
              hint: 'Usa el verbo base después de modales: should apply.'
            },
            {
              id: 'ex-2',
              sentence: `Every morning, Sophia _____ [practices / practice / practiced] English conversation before work.`,
              options: ['practices', 'practice', 'practiced'],
              expected_answer: 'practices',
              spanish_translation: `Cada mañana, Sophia practica conversación en inglés antes del trabajo.`,
              image_prompt: `A young professional woman practicing speaking with headphones, 2D vector art, no text`,
              hint: 'Tercera persona singular en presente afirmativo lleva -s.'
            },
            {
              id: 'ex-3',
              sentence: `Can you _____ [express / expresses / expressing] this idea using the correct grammar form?`,
              options: ['express', 'expresses', 'expressing'],
              expected_answer: 'express',
              spanish_translation: `¿Puedes expresar esta idea usando la forma gramatical correcta?`,
              image_prompt: `Two friends chatting enthusiastically in a cozy coffee shop, 2D vector art, no text`,
              hint: 'Tras el verbo modal Can, usamos la forma base express.'
            },
            {
              id: 'ex-4',
              sentence: `We _____ [learned / learn / learns] important communication patterns in today's lesson.`,
              options: ['learned', 'learn', 'learns'],
              expected_answer: 'learned',
              spanish_translation: `Aprendimos patrones de comunicación importantes en la lección de hoy.`,
              image_prompt: `A diverse group of students celebrating in a modern classroom, 2D vector art, no text`,
              hint: 'Forma correcta del verbo para describir lo aprendido.'
            },
            {
              id: 'ex-5',
              sentence: `She always _____ [speaks / speak / speaking] with confidence during presentations.`,
              options: ['speaks', 'speak', 'speaking'],
              expected_answer: 'speaks',
              spanish_translation: `Ella siempre habla con seguridad durante las presentaciones.`,
              image_prompt: `A confident speaker giving a presentation in front of an audience, 2D vector art, no text`,
              hint: 'Sujeto She + adverbio de frecuencia + verbo con -s.'
            },
            {
              id: 'ex-6',
              sentence: `They are _____ [improving / improve / improved] their English fluency step by step.`,
              options: ['improving', 'improve', 'improved'],
              expected_answer: 'improving',
              spanish_translation: `Ellos están mejorando su fluidez en inglés paso a paso.`,
              image_prompt: `Two students looking at an upward progress chart smiling, 2D vector art, no text`,
              hint: 'Con They are usamos el verbo con -ing.'
            },
            {
              id: 'ex-7',
              sentence: `If you practice regularly, you _____ [will achieve / achieve will / achieving] your language goals.`,
              options: ['will achieve', 'achieve will', 'achieving'],
              expected_answer: 'will achieve',
              spanish_translation: `Si practicas regularmente, alcanzarás tus metas lingüísticas.`,
              image_prompt: `A student standing at the summit of a mountain looking at sunrise, 2D vector art, no text`,
              hint: 'Resultado futuro en condicional: will + verbo base.'
            },
            {
              id: 'ex-8',
              sentence: `It is essential to _____ [review / reviews / reviewed] key vocabulary every week.`,
              options: ['review', 'reviews', 'reviewed'],
              expected_answer: 'review',
              spanish_translation: `Es esencial repasar el vocabulario clave cada semana.`,
              image_prompt: `A student organizing colorful flashcards on a study table, 2D vector art, no text`,
              hint: 'Infinitivo con to + verbo base: to review.'
            }
          ];

          // Filter strictly valid exercises
          const filteredCollected: any[] = [];
          collectedExercises.forEach(ex => {
            if (ex && ex.sentence && !filteredCollected.some(f => f.sentence === ex.sentence)) {
              filteredCollected.push(ex);
            }
          });

          // Supplement up to 8 exercises from topic default bank
          for (const defEx of defaultExercises) {
            if (filteredCollected.length >= 8) break;
            if (!filteredCollected.some(f => f.sentence === defEx.sentence)) {
              filteredCollected.push({
                ...defEx,
                id: `ex-${filteredCollected.length + 1}`
              });
            }
          }

          // Build dedicated practice slide strictly AFTER all explanation phases
          const practiceSlideObj = {
            phase_number: cleanExplanationPhases.length + 1,
            phase_name: `Desafío Práctico: ${topicParam}`,
            is_practice_slide: true,
            is_hook: false,
            interaction_type: 'quiz',
            tutor_says: `¡Momento de poner en práctica lo aprendido! Completa los siguientes 8 ejercicios interactivos para consolidar ${topicParam}.`,
            exercises: filteredCollected,
            student_task: filteredCollected[0]?.sentence || `Completa los ejercicios de ${topicParam}.`,
            expected_answer: filteredCollected[0]?.expected_answer || '',
          };
          cleanExplanationPhases.push(practiceSlideObj);

          // If phonetic bonus exists, append at the very end
          if (existingBonusPhase) {
            existingBonusPhase.phase_number = cleanExplanationPhases.length + 1;
            cleanExplanationPhases.push(existingBonusPhase);
          }

          data.phases = cleanExplanationPhases;
        }

        setLesson(data);

        // 🎨 Pre-generate & preload Phase 0's image with MiniMax image-01 so the lesson NEVER starts without it
        setLoadingStage('Generando ilustración didáctica con MiniMax IA (image-01)...');
        const initialImageUrl = await fetchPhaseImage(0, topicParam, data.phases[0]);
        console.log('🎨 Phase 0 MiniMax image ready:', initialImageUrl);

        // Preload image in browser before revealing UI so it appears immediately with 0 delay
        setLoadingStage('Precargando pizarra interactiva...');
        await preloadImage(initialImageUrl, 5000).catch(() => {});

        setImageLoading(false);
        setLoadingLesson(false);

        // 🚀 NON-BLOCKING BACKGROUND WORKER: Sequentially pre-generate remaining slide images with MiniMax
        (async () => {
          for (let i = 1; i < data.phases.length; i++) {
            try {
              await new Promise(r => setTimeout(r, 1200));
              await fetchPhaseImage(i, topicParam, data.phases[i]);
            } catch (err: any) {
              console.warn(`Background image generation for slide ${i} failed:`, err);
            }
          }
        })();

      } catch (err: any) {
        console.error('Failed to load lesson:', err);
        toast.error('Error al conectar con el servidor.');
        setLoadingLesson(false);
      }
    }

    loadOrCreateLesson();
  }, [lessonId, topicParam, sublevelParam, fetchPhaseImage]);

  // Reset states on phase change
  useEffect(() => {
    stopCurrentAudio();
    const promptKey = `${currentPhaseIdx}-${topicParam}`;
    setImageLoading(!minimaxImageMap[promptKey]);
    setEvaluation(null);
    setShowTranscript(false);
    setItemRecordingKey(null);
    setItemProcessingKey(null);
    setItemLiveTranscript('');
    setItemEvals({});
    setExerciseInputs({});
    setRevealedLineCount(0);
    setAudioProgress(0);
    setActiveStepIdx(0);
    setCurrentChunkIdx(0);
    setRevealedStepCount(1);
    setRevealedTargets(new Set(['image']));
    setIsFullBoardRevealed(false);
    const newPhase = lesson?.phases?.[currentPhaseIdx];
    if (newPhase) {
      const chunks = getPhaseVoiceChunks(newPhase, topicParam);
      setCurrentSpeakingText(chunks[0]?.tutor_says || (typeof newPhase.tutor_says === 'string' ? newPhase.tutor_says : ''));
    }
  }, [currentPhaseIdx]);

  // Helper to check if a specific target element is revealed
  const isTargetRevealed = useCallback((target: string) => {
    if (isFullBoardRevealed || audioFinishedNaturallyRef.current) return true;
    return revealedTargets.has(target);
  }, [isFullBoardRevealed, revealedTargets]);

  // Is the slide currently in Hero Mode (Chunk 1 active: ONLY centered large image)?
  const isHeroImageMode = useMemo(() => {
    if (isFullBoardRevealed || audioFinishedNaturallyRef.current) return false;
    const currentPhaseObj = lesson?.phases?.[currentPhaseIdx];
    if (!currentPhaseObj) return false;
    const chunks = getPhaseVoiceChunks(currentPhaseObj, topicParam);
    return currentChunkIdx === 0 && chunks.length > 1;
  }, [isFullBoardRevealed, lesson, currentPhaseIdx, topicParam, currentChunkIdx]);

  // 2. Play Voice Chunk with Sequential Auto-Advance & Progressive Element Reveal
  const playVoiceChunk = useCallback(async (chunkIndex: number, autoAdvance = true) => {
    const currentPhaseObj = lesson?.phases?.[currentPhaseIdx];
    if (!currentPhaseObj) return;

    const chunks = getPhaseVoiceChunks(currentPhaseObj, topicParam);
    if (chunkIndex < 0 || chunkIndex >= chunks.length) return;

    const chunk = chunks[chunkIndex];
    if (!chunk || !chunk.tutor_says) return;

    setCurrentChunkIdx(chunkIndex);
    setActiveStepIdx(chunkIndex);
    setRevealedStepCount(prev => Math.max(prev, chunkIndex + 1));
    setRevealedTargets(prev => {
      const next = new Set(prev);
      next.add(chunk.reveal_target);
      if (chunk.reveal_target === 'grammar') next.add('board_concepts');
      if (chunkIndex > 0) next.add('board_concepts');
      return next;
    });

    setCurrentSpeakingText(chunk.tutor_says);
    stopCurrentAudio();
    const thisSessionId = audioSessionIdRef.current;
    setAudioProgress(0);

    setTutorState('thinking');
    try {
      const audio = await playTTS(chunk.tutor_says);
      if (audioSessionIdRef.current !== thisSessionId) {
        audio.pause();
        return;
      }

      currentAudioRef.current = audio;
      setTutorState('speaking');

      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      audioTimerRef.current = setInterval(() => {
        const aud = currentAudioRef.current;
        if (!aud || audioSessionIdRef.current !== thisSessionId || aud.paused || aud.ended) {
          if (audioTimerRef.current) {
            clearInterval(audioTimerRef.current);
            audioTimerRef.current = null;
          }
          return;
        }

        if (aud.duration && aud.duration > 0 && !isNaN(aud.duration)) {
          const prog = (aud.currentTime / aud.duration) * 100;
          setAudioProgress(Math.min(Math.max(prog, 0), 100));
        }
      }, 50);

      audio.ontimeupdate = () => {
        if (audio.duration && audio.duration > 0 && !isNaN(audio.duration)) {
          const prog = (audio.currentTime / audio.duration) * 100;
          setAudioProgress(Math.min(Math.max(prog, 0), 100));
        }
      };

      audio.onended = () => {
        if (audioTimerRef.current) {
          clearInterval(audioTimerRef.current);
          audioTimerRef.current = null;
        }
        if (audioSessionIdRef.current === thisSessionId) {
          setAudioProgress(100);

          if (autoAdvance && chunkIndex + 1 < chunks.length) {
            // Natural pause between chunks (450ms) before transitioning and playing next chunk
            setTimeout(() => {
              if (audioSessionIdRef.current === thisSessionId) {
                playVoiceChunk(chunkIndex + 1, true);
              }
            }, 450);
          } else {
            setTutorState('idle');
            setIsFullBoardRevealed(true);
            setActiveStepIdx(chunks.length - 1);
            setRevealedStepCount(chunks.length);
            setRevealedTargets(new Set(['image', 'grammar', 'board_concepts', 'examples', 'diagram', 'exercise']));
            audioFinishedNaturallyRef.current = true;
          }
        }
      };

      audio.onerror = () => {
        if (audioTimerRef.current) {
          clearInterval(audioTimerRef.current);
          audioTimerRef.current = null;
        }
        if (audioSessionIdRef.current === thisSessionId) {
          setTutorState('idle');
          if (autoAdvance && chunkIndex + 1 < chunks.length) {
            setTimeout(() => {
              if (audioSessionIdRef.current === thisSessionId) {
                playVoiceChunk(chunkIndex + 1, true);
              }
            }, 450);
          } else {
            setIsFullBoardRevealed(true);
          }
        }
      };
    } catch (err) {
      console.warn('TTS Chunk error:', err);
      if (audioSessionIdRef.current === thisSessionId) {
        setTutorState('idle');
      }
    }
  }, [lesson, currentPhaseIdx, topicParam]);

  // 3. Auto Play Chunk 1 on Phase Change
  useEffect(() => {
    if (loadingLesson) return;
    if (viewMode === 'games' || viewMode === 'reading') return;
    if (
      lesson &&
      lesson.phases &&
      lesson.phases[currentPhaseIdx] &&
      !evaluation &&
      lastSpokenPhaseRef.current !== currentPhaseIdx
    ) {
      lastSpokenPhaseRef.current = currentPhaseIdx;
      audioFinishedNaturallyRef.current = false;
      playVoiceChunk(0, true);
    }
  }, [lesson, currentPhaseIdx, evaluation, viewMode, loadingLesson, playVoiceChunk]);

  const speakText = async (text: string, isMainLecture = false) => {
    if (!text || !text.trim()) return;
    if (isMainLecture) {
      playVoiceChunk(0, true);
      return;
    }

    // Auxiliary speech for task instruction or evaluation feedback
    setCurrentSpeakingText(text);
    stopCurrentAudio();
    const thisSessionId = audioSessionIdRef.current;
    setTutorState('thinking');

    try {
      const audio = await playTTS(text);
      if (audioSessionIdRef.current !== thisSessionId) {
        audio.pause();
        return;
      }
      currentAudioRef.current = audio;
      setTutorState('speaking');
      audio.onended = () => {
        if (audioSessionIdRef.current === thisSessionId) {
          setTutorState('idle');
        }
      };
      audio.onerror = () => {
        if (audioSessionIdRef.current === thisSessionId) {
          setTutorState('idle');
        }
      };
    } catch (err) {
      console.warn('TTS Auxiliary error:', err);
      if (audioSessionIdRef.current === thisSessionId) {
        setTutorState('idle');
      }
    }
  };

  // Play individual English word/sentence audio with Jenny Neural HD
  const handlePlayIndividualAudio = (text: string) => {
    if (!text || !text.trim()) return;
    playEnglishAudio(text);
  };

  // 3. Submit Main Task Answer
  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');
    submitAnswer(text);
  };

  const submitAnswer = async (textAnswer: string) => {
    if (!lesson || !lesson.phases[currentPhaseIdx]) return;
    setIsProcessing(true);
    setTutorState('thinking');

    const currentPhase = lesson.phases[currentPhaseIdx];

    try {
      const formData = new FormData();
      formData.append('phase', String(currentPhase.phase_number || currentPhaseIdx + 1));
      formData.append('answer', textAnswer);

      const qText = typeof currentPhase.student_task === 'string' ? currentPhase.student_task : (currentPhase.tutor_says || '');
      const eText = typeof currentPhase.expected_answer === 'string' ? currentPhase.expected_answer : '';

      formData.append('question', qText);
      formData.append('expected_answer', eText);

      const res = await api.evaluateLesson(lesson.id || lessonId, formData);

      const formattedEval = {
        scores: {
          pronunciation: res.pronunciation_score ?? 75,
          grammar: res.grammar_score ?? 75,
          relevance: res.relevance_score ?? 80,
          overall: res.overall_score ?? res.score ?? 75,
        },
        feedback: res.feedback || 'Respuesta evaluada con éxito.',
        is_correct: Boolean(res.is_correct),
        corrected_answer: res.corrected_answer,
      };

      setEvaluation(formattedEval);
      setTutorState('idle');

      if (formattedEval.feedback) {
        speakText(formattedEval.feedback);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al evaluar respuesta');
      setTutorState('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3b. Main Task Voice Recording (Challenge / Exercise Microphone)
  const mainRecognitionRef = useRef<any>(null);

  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta reconocimiento de voz.');
      setIsRecording(false);
      return;
    }

    if (mainRecognitionRef.current) {
      try { mainRecognitionRef.current.stop(); } catch (_) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    mainRecognitionRef.current = rec;

    setIsRecording(true);
    let finalTranscript = '';

    rec.onresult = (event: any) => {
      let t = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        t += event.results[i][0].transcript;
      }
      const normalized = normalizeNumberWords(t);
      finalTranscript = normalized;
      setTextInput(normalized);
    };

    rec.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        const clean = normalizeNumberWords(finalTranscript.trim());
        submitAnswer(clean);
      }
    };

    rec.onerror = (e: any) => {
      console.warn('Main voice recording error:', e);
      setIsRecording(false);
    };

    rec.start();
  };

  const stopVoiceRecording = () => {
    if (mainRecognitionRef.current) {
      try { mainRecognitionRef.current.stop(); } catch (_) {}
    }
    setIsRecording(false);
  };

  // 4. Universal Per-Item Pronunciation Recording (Used across Studio Board & Timeline)
  const startItemRecognition = (key: string, targetSentence: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta reconocimiento de voz.');
      setItemRecordingKey(null);
      return;
    }

    if (itemRecognitionRef.current) {
      try { itemRecognitionRef.current.stop(); } catch (_) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    itemRecognitionRef.current = rec;

    setItemRecordingKey(key);
    setItemLiveTranscript('');

    let finalTranscript = '';

    rec.onresult = (event: any) => {
      let t = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        t += event.results[i][0].transcript;
      }
      const normalized = normalizeNumberWords(t);
      finalTranscript = normalized;
      setItemLiveTranscript(normalized);
    };

    rec.onend = () => {
      if (finalTranscript.trim()) {
        const clean = normalizeNumberWords(finalTranscript.trim());
        handlePronunciationItemSubmit(key, targetSentence, clean);
      } else {
        setItemRecordingKey(null);
        setItemLiveTranscript('');
      }
    };

    rec.onerror = (e: any) => {
      console.warn('Item recognition error:', e);
      setItemRecordingKey(null);
      setItemLiveTranscript('');
    };

    rec.start();
  };

  const handlePronunciationItemSubmit = async (key: string, targetSentence: string, transcript: string) => {
    const cleanTranscript = normalizeNumberWords(transcript);
    setItemProcessingKey(key);
    try {
      const formData = new FormData();
      formData.append('phase', String((lesson?.phases?.[currentPhaseIdx]?.phase_number) || currentPhaseIdx + 1));
      formData.append('answer', cleanTranscript);
      formData.append('question', `Repeat this sentence: "${targetSentence}"`);
      formData.append('expected_answer', targetSentence);

      const result = await api.evaluateLesson(lesson?.id || lessonId, formData);

      setItemEvals(prev => ({
        ...prev,
        [key]: {
          is_correct: result.is_correct,
          overall_score: result.overall_score ?? (result.is_correct ? 95 : 60),
          feedback: result.feedback || (result.is_correct ? '¡Excelente pronunciación!' : 'Buen intento, practica nuevamente.'),
          corrected_answer: result.corrected_answer || targetSentence,
        },
      }));

      if (result.feedback) {
        speakText(result.feedback);
      }
    } catch (err: any) {
      toast.error('Error al evaluar pronunciación.');
    } finally {
      setItemProcessingKey(null);
      setItemRecordingKey(null);
      setItemLiveTranscript('');
    }
  };

  // 4b. Dedicated Handler for Interactive Per-Item Exercises
  const handleExerciseSubmit = async (
    exerciseKey: string,
    questionText: string,
    answerText: string,
    options?: string[]
  ) => {
    if (!answerText || !answerText.trim()) return;
    setItemProcessingKey(exerciseKey);
    try {
      const qContext = options && options.length > 0
        ? `${questionText} [Opciones: ${options.join(' / ')}]`
        : questionText;

      const formData = new FormData();
      formData.append('phase', String((lesson?.phases?.[currentPhaseIdx]?.phase_number) || currentPhaseIdx + 1));
      formData.append('answer', answerText.trim());
      formData.append('question', qContext);
      formData.append('expected_answer', '');
      formData.append('is_sub_exercise', 'true');

      const result = await api.evaluateLesson(lesson?.id || lessonId, formData);

      setItemEvals(prev => ({
        ...prev,
        [exerciseKey]: {
          is_correct: Boolean(result.is_correct),
          overall_score: result.overall_score ?? result.score ?? (result.is_correct ? 95 : 60),
          feedback: result.feedback || (result.is_correct ? '¡Excelente! Respuesta correcta.' : 'Buen intento. Revisa la opción correcta.'),
          corrected_answer: result.corrected_answer,
        },
      }));

      if (result.feedback) {
        speakText(result.feedback);
      }
    } catch (err: any) {
      toast.error('Error al evaluar el ejercicio.');
    } finally {
      setItemProcessingKey(null);
      setItemRecordingKey(null);
      setItemLiveTranscript('');
    }
  };

  const startExerciseRecognition = (exerciseKey: string, questionText: string, options?: string[]) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta reconocimiento de voz.');
      return;
    }

    if (itemRecognitionRef.current) {
      try { itemRecognitionRef.current.stop(); } catch (_) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    itemRecognitionRef.current = rec;

    setItemRecordingKey(exerciseKey);
    setItemLiveTranscript('');

    let finalTranscript = '';

    rec.onresult = (event: any) => {
      let t = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        t += event.results[i][0].transcript;
      }
      const normalized = normalizeNumberWords(t);
      finalTranscript = normalized;
      setItemLiveTranscript(normalized);
    };

    rec.onend = () => {
      if (finalTranscript.trim()) {
        const cleanVal = normalizeNumberWords(finalTranscript.trim());
        setExerciseInputs(prev => ({ ...prev, [exerciseKey.replace('exercise-item-', '')]: cleanVal }));
        handleExerciseSubmit(exerciseKey, questionText, cleanVal, options);
      } else {
        setItemRecordingKey(null);
        setItemLiveTranscript('');
      }
    };

    rec.onerror = (e: any) => {
      console.warn('Exercise recognition error:', e);
      setItemRecordingKey(null);
      setItemLiveTranscript('');
    };

    rec.start();
  };

  const handlePrevSlide = () => {
    sfx.playPop();
    stopCurrentAudio();
    if (currentPhaseIdx > 0) {
      setCurrentPhaseIdx((prev) => prev - 1);
    }
  };

  const handleNextSlide = async () => {
    sfx.playPop();
    stopCurrentAudio();
    stopTutorVoice();
    if (lesson && currentPhaseIdx < lesson.phases.length - 1) {
      setCurrentPhaseIdx((prev) => prev + 1);
    } else {
      sfx.playStreakFanfare();
      try {
        await api.completeLesson(lesson?.id || lessonId);
      } catch (err) {
        console.warn('Complete lesson error:', err);
      }
      toast.success('¡Fases de clase completadas! Pasando a la Práctica de Lectura. 📖');
      setViewMode('reading');
    }
  };

  // 🎬 Cinema mode: auto-advance
  useEffect(() => {
    if (!cinemaModeActive || tutorState !== 'idle' || !lesson) return;
    if (!audioFinishedNaturallyRef.current) return;
    audioFinishedNaturallyRef.current = false;
    cinemaNextSlideRef.current = setTimeout(() => {
      if (cinemaModeRef.current) handleNextSlide();
    }, 2200);
    return () => {
      if (cinemaNextSlideRef.current) {
        clearTimeout(cinemaNextSlideRef.current);
        cinemaNextSlideRef.current = null;
      }
    };
  }, [tutorState, cinemaModeActive, lesson]);

  // 🎬 Stable Viewport Focus: Keeps student focused on words being revealed & spoken
  useEffect(() => {
    if (viewMode !== 'board') return;

    // When starting a new phase, smoothly ensure the top teaching board is visible
    if (activeStepIdx === 0) {
      const topEl = document.getElementById('storyboard-target-title') || document.getElementById('storyboard-target-concepts');
      if (topEl) {
        const rect = topEl.getBoundingClientRect();
        if (rect.top < -80 || rect.top > 250) {
          topEl.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
          });
        }
      }
      return;
    }

    const currentStep = phaseStoryboardSteps[activeStepIdx];
    if (!currentStep) return;

    // NEVER yank the screen down while the tutor is explaining concepts/grammar/vocabulary!
    // Only scroll to the final exercise if the audio has transitioned to the practice phase (>= 85%)
    const isBottomExercise = currentStep.element_type === 'exercise' || currentStep.element_type === 'audio_practice';
    if (!isBottomExercise || audioProgress < 85) {
      return;
    }

    const candidateIds = [
      currentStep.element_type ? `storyboard-target-${currentStep.element_type}` : '',
      currentStep.highlight_target ? `storyboard-target-${currentStep.highlight_target}` : '',
    ].filter(Boolean);

    for (const id of candidateIds) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isInViewport = rect.top >= 60 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
        if (!isInViewport) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          });
        }
        break;
      }
    }
  }, [activeStepIdx, audioProgress, viewMode, phaseStoryboardSteps]);

  // 👁️ Gently keep the active spoken line in view if the whiteboard is long
  const activeLineIdx = useMemo(() => {
    if (tutorState !== 'speaking' || isFullBoardRevealed || boardLinesTiming.length === 0) return -1;
    const currentRatio = audioProgress / 100;
    return boardLinesTiming.findIndex(
      t => currentRatio >= t.startRatio && currentRatio <= t.endRatio
    );
  }, [tutorState, isFullBoardRevealed, audioProgress, boardLinesTiming]);

  useEffect(() => {
    if (activeLineIdx < 0 || viewMode !== 'board') return;
    const lineEl = document.getElementById(`board-line-${activeLineIdx}`);
    if (lineEl) {
      const rect = lineEl.getBoundingClientRect();
      const isVisible = rect.top >= 80 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - 80;
      if (!isVisible) {
        lineEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }
  }, [activeLineIdx, viewMode]);

  if (loadingLesson) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(108,99,255,0.15),_transparent_70%)]" />
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center animate-ping absolute inset-0" />
          <div className="w-20 h-20 rounded-full bg-brand-surface border-2 border-brand-cyan flex items-center justify-center relative z-10 shadow-xl shadow-brand-cyan/20">
            <Sparkles className="w-9 h-9 text-brand-cyan animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2 tracking-tight">Preparando clase interactiva...</h2>
        <p className="text-brand-cyan font-medium text-sm mb-3 animate-pulse text-center">
          {loadingStage}
        </p>
        <p className="text-brand-text-secondary text-xs max-w-sm text-center leading-relaxed mb-6">
          Lección adaptativa para <strong className="text-white">{topicParam}</strong> ({sublevelParam}).
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 transition-all shadow-lg hover:scale-105"
        >
          <ArrowLeft size={16} />
          <span>Volver al Dashboard</span>
        </Link>
      </div>
    );
  }

  const isStepRevealed = (type: string) => {
    if (isFullBoardRevealed || audioFinishedNaturallyRef.current) return true;
    if (type === 'illustration' || type === 'concepts') return true;
    const step = phaseStoryboardSteps.find(
      (s) => s.element_type === type || s.highlight_target === type
    );
    if (!step) return true;
    const currentRatio = audioProgress / 100;
    return currentRatio >= step.trigger_ratio || (revealedStepCount >= step.step_index);
  };

  const isStepActive = (type: string) => {
    if (tutorState !== 'speaking' || isFullBoardRevealed) return false;
    const currentStep = phaseStoryboardSteps[activeStepIdx];
    return Boolean(currentStep && (currentStep.element_type === type || currentStep.highlight_target === type));
  };

  const handleStepClick = (stepIndex: number) => {
    playVoiceChunk(stepIndex, false);
    const step = phaseStoryboardSteps[stepIndex];
    if (!step) return;

    const candidateIds = [
      step.element_type ? `storyboard-target-${step.element_type}` : '',
      step.highlight_target ? `storyboard-target-${step.highlight_target}` : '',
    ].filter(Boolean);

    for (const id of candidateIds) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        break;
      }
    }
  };

  const handleTogglePlay = () => {
    if (tutorState === 'speaking') {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        setTutorState('idle');
      }
    } else {
      const chunks = getPhaseVoiceChunks(phase, topicParam);
      const targetIdx = (currentChunkIdx >= chunks.length || audioFinishedNaturallyRef.current) ? 0 : currentChunkIdx;
      playVoiceChunk(targetIdx, true);
    }
  };

  const handleReplayCurrentStep = () => {
    stopCurrentAudio();
    playVoiceChunk(0, true);
  };

  const handleRevealAll = () => {
    stopCurrentAudio();
    setIsFullBoardRevealed(true);
    const chunks = getPhaseVoiceChunks(phase, topicParam);
    setActiveStepIdx(chunks.length - 1);
    setRevealedStepCount(chunks.length);
    setRevealedTargets(new Set(['image', 'grammar', 'board_concepts', 'examples', 'diagram', 'exercise']));
    setRevealedLineCount(999);
    setTutorState('idle');
  };

  const handleResetReveal = () => {
    stopCurrentAudio();
    setIsFullBoardRevealed(false);
    setActiveStepIdx(0);
    setCurrentChunkIdx(0);
    setRevealedStepCount(1);
    setRevealedTargets(new Set(['image']));
    playVoiceChunk(0, true);
  };

  // 🎬 Hook & Multi-Image Resolution
  const isHook = currentPhaseIdx === 0 || Boolean(phase.is_hook);

  // 🗣️ Dedicated Phonetic Bonus Slide Resolution (strictly at the end of the lesson)
  const isPhoneticBonus = Boolean(
    phase.is_phonetic_bonus ||
    phase.interaction_type === 'phonetic_bonus' ||
    (phase.phonetic_focus && currentPhaseIdx === (lesson?.phases?.length ? lesson.phases.length - 1 : currentPhaseIdx)) ||
    (phase.phase_name?.toLowerCase().includes('bonus de pronunciación')) ||
    (phase.phase_name?.toLowerCase().includes('fonét') && currentPhaseIdx === (lesson?.phases?.length ? lesson.phases.length - 1 : currentPhaseIdx))
  );

  // 🎯 Dedicated Practice Slide Resolution (strictly after all explanation slides)
  const isPracticeSlide = !isHook && !isPhoneticBonus && Boolean(
    phase.is_practice_slide === true ||
    (phase.interaction_type === 'quiz' && currentPhaseIdx >= (lesson?.phases?.length ? lesson.phases.length - 2 : 1) && phase.exercises && phase.exercises.length > 0)
  );

  // ─── Image Generation & Hook Visuals ───────────────────────────────────────
  const rawImagePrompt = typeof phase.image_prompt === 'string' && phase.image_prompt.trim().length > 10
    ? phase.image_prompt.trim()
    : `flat 2D vector illustration of ${topicParam} for English lesson (${phase.phase_name}), clean minimal graphic design, bright clear colors, white background`;

  const hookImagesData: Array<{ prompt: string; caption?: string; role?: string }> = (
    phase?.hook_images && Array.isArray(phase.hook_images) && phase.hook_images.length > 0
      ? phase.hook_images.map((hi: any, i: number) => ({
          prompt: typeof hi === 'string' ? hi : (hi.prompt || hi.image_prompt || rawImagePrompt),
          caption: typeof hi === 'object' ? hi.caption : undefined,
          role: typeof hi === 'object' ? (hi.role || (i === 0 ? 'hook_situation' : 'hook_context')) : 'hook_situation',
        }))
      : [
          {
            prompt: rawImagePrompt,
            caption: `Descubriendo: ${topicParam}`,
            role: 'hook_situation',
          }
        ]
  );

  const styleType = (phase.image_style as string) || 'flat_art';
  const cleanImagePrompt = sanitizeImagePrompt(rawImagePrompt, topicParam, currentPhaseIdx);

  const promptKey = `${currentPhaseIdx}-${topicParam}`;
  const minimaxGeneratedUrl = minimaxImageMap[promptKey];
  const isImageGenerating = generatingImages[promptKey] || !minimaxGeneratedUrl;
  const imageUrl = minimaxGeneratedUrl || '';

  // Dedicated Sentence Image URL for timeline items
  const getSentenceImageUrl = (englishSentence: string, index: number): string => {
    return imageUrl;
  };

  // ─── Reusable Component for Interactive Pronunciation & Speech Card ────────
  const renderPronunciationCard = (
    item: { english: string; translation?: string; label?: string },
    key: string,
    idx: number,
    theme: 'studio' | 'chalk' = 'studio',
    isRevealed = true,
    isActiveSpoken = false
  ) => {
    const isThisRecording = itemRecordingKey === key;
    const isThisProcessing = itemProcessingKey === key;
    const itemResult = itemEvals[key];

    return (
      <motion.div
        key={key}
        initial={isRevealed ? false : { opacity: 0, scale: 0.92, y: 15 }}
        animate={{
          opacity: isRevealed ? (isActiveSpoken ? 1 : 0.85) : 0.20,
          scale: isActiveSpoken ? 1.025 : 1,
          y: isRevealed ? 0 : 8,
        }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
          isActiveSpoken
            ? 'bg-brand-cyan/20 border-brand-cyan ring-2 ring-brand-cyan shadow-[0_0_35px_rgba(0,212,255,0.45)]'
            : itemResult
            ? itemResult.is_correct
              ? 'bg-brand-success/10 border-brand-success/40 shadow-[0_0_20px_rgba(0,230,118,0.12)]'
              : 'bg-brand-error/10 border-brand-error/40 shadow-[0_0_20px_rgba(255,82,82,0.12)]'
            : isThisRecording
            ? 'bg-brand-error/15 border-brand-error shadow-[0_0_25px_rgba(255,82,82,0.35)] scale-[1.01]'
            : theme === 'chalk'
            ? 'bg-black/40 border-white/15 hover:border-brand-cyan/50 shadow-md'
            : 'glass hover:bg-brand-surface/70 border-brand-border/80 hover:border-brand-cyan/40 shadow-md'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Text Information */}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                theme === 'chalk'
                  ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                  : 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
              }`}>
                {item.label || `Frase #${idx + 1}`}
              </span>
              {isActiveSpoken && (
                <span className="text-[10px] bg-brand-cyan text-black px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                  <Volume2 size={11} className="animate-bounce" />
                  Nombrada por el tutor
                </span>
              )}
              {itemResult && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                  itemResult.is_correct ? 'text-brand-success bg-brand-success/20' : 'text-brand-error bg-brand-error/20'
                }`}>
                  {itemResult.is_correct ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {itemResult.overall_score}% Pronunciación
                </span>
              )}
            </div>

            <p className={`text-sm sm:text-base font-bold tracking-wide leading-snug break-words ${
              theme === 'chalk' ? 'font-chalk text-white sm:text-lg' : 'font-mono text-white'
            }`}>
              &quot;{item.english}&quot;
            </p>

            {item.translation && (
              <span className={`text-xs italic leading-tight ${theme === 'chalk' ? 'font-chalk text-white/80' : 'text-brand-text-secondary'}`}>
                Traducción: {item.translation}
              </span>
            )}
          </div>

          {/* Interactive Voice Controls: Listen + Microphone */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-1 sm:pt-0">
            {/* 🔊 Listen Button */}
            <button
              type="button"
              onClick={() => handlePlayIndividualAudio(item.english)}
              disabled={isThisRecording || isThisProcessing}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm hover:scale-105 disabled:opacity-40 ${
                theme === 'chalk'
                  ? 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border-yellow-400/40 font-chalk text-sm'
                  : 'bg-brand-cyan/15 hover:bg-brand-cyan/30 text-brand-cyan border-brand-cyan/35'
              }`}
              title={`Escuchar pronunciación: "${item.english}"`}
            >
              <Volume2 size={13} className="text-brand-cyan" />
              <span>Escuchar</span>
            </button>

            {/* 🎙️ Mic Practice Button — Hero Circle */}
            {!itemResult ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                whileHover={!isThisProcessing && !isThisRecording ? { scale: 1.1 } : {}}
                onClick={() => {
                  if (isThisRecording) {
                    setItemRecordingKey(null);
                  } else {
                    startItemRecognition(key, item.english);
                  }
                }}
                disabled={isThisProcessing || (itemRecordingKey !== null && !isThisRecording)}
                className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-40 flex-shrink-0 ${
                  isThisProcessing
                    ? 'bg-brand-surface border-2 border-brand-accent text-brand-cyan animate-pulse'
                    : isThisRecording
                    ? 'bg-brand-error text-white border-2 border-red-300 shadow-[0_0_30px_rgba(255,82,82,0.7)]'
                    : 'bg-brand-accent text-white border-2 border-brand-accent/60 hover:shadow-[0_0_25px_rgba(108,99,255,0.6)]'
                }`}
                title="Grabar tu voz para practicar esta frase"
              >
                {isThisRecording && (
                  <span className="absolute inset-0 rounded-full border-2 border-brand-error animate-ping opacity-60" />
                )}
                {isThisProcessing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isThisRecording ? (
                  <Square size={16} className="fill-white" />
                ) : (
                  <Mic size={18} />
                )}
              </motion.button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setItemEvals(prev => {
                    const n = { ...prev };
                    delete n[key];
                    return n;
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-brand-border border border-brand-border text-brand-text-muted hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Reintentar práctica de pronunciación"
              >
                <RotateCcw size={12} />
                <span>Reintentar</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Audio Transcript Box when Recording */}
        {isThisRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-2 border-t border-brand-error/30 flex items-center gap-2 text-xs text-white bg-black/30 p-2.5 rounded-xl"
          >
            <div className="w-2 h-2 rounded-full bg-brand-error animate-ping flex-shrink-0" />
            <span className="text-brand-error font-bold">Escuchando:</span>
            <span className="font-mono truncate">{itemLiveTranscript || 'Habla ahora en inglés...'}</span>
          </motion.div>
        )}

        {/* Inline AI Feedback result */}
        {itemResult && itemResult.feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`mt-2.5 pt-2 border-t text-xs leading-relaxed ${
              itemResult.is_correct ? 'border-brand-success/30 text-emerald-200' : 'border-brand-error/30 text-rose-200'
            }`}
          >
            <p>💡 {itemResult.feedback}</p>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col h-screen overflow-hidden text-white relative">
      {/* 🌊 Dynamic ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: 'radial-gradient(ellipse 90% 40% at 50% 0%, rgba(108,99,255,0.18) 0%, transparent 60%)',
            opacity: tutorState === 'speaking' ? 1 : 0,
          }}
        />
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(0,212,255,0.12) 0%, transparent 65%)',
            opacity: tutorState === 'thinking' ? 1 : 0,
          }}
        />
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: 'radial-gradient(ellipse 90% 40% at 50% 100%, rgba(0,230,118,0.12) 0%, transparent 60%)',
            opacity: tutorState === 'listening' ? 1 : 0,
          }}
        />
      </div>

      {/* 🌟 Top Header Bar with Consolidated 2-View Switcher */}
      <header className="px-4 sm:px-6 py-3 border-b border-brand-border/60 flex items-center justify-between glass z-20 gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-brand-text-secondary hover:text-white transition-colors text-xs sm:text-sm font-semibold flex-shrink-0 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Volver al Mapa</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 truncate">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-cyan flex-shrink-0">
            {sublevelParam}
          </span>
          <h1 className="font-outfit font-bold text-sm sm:text-base text-white truncate max-w-[140px] sm:max-w-xs md:max-w-md">
            {topicParam}
          </h1>
        </div>

        {/* Header Controls: Clean 2-Mode Segmented Selector + Tutor Avatar */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Segmented View Switcher: Pizarra Interactiva vs Ejercicios vs Flujo vs Lectura vs Juegos */}
          <div className="flex items-center p-1 rounded-2xl bg-brand-surface/90 border border-brand-border text-xs gap-1 shadow-inner overflow-x-auto max-w-full">
            <button
              onClick={() => {
                stopCurrentAudio();
                setViewMode('board');
                // If currently on practice slide and user clicks Pizarra, go to slide 1
                if (isPracticeSlide) {
                  setCurrentPhaseIdx(0);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-semibold ${
                viewMode === 'board' && !isPracticeSlide
                  ? 'bg-gradient-to-r from-brand-accent to-indigo-600 text-white shadow-md shadow-brand-accent/25'
                  : 'text-brand-text-muted hover:text-white'
              }`}
              title="Pizarra Interactiva"
            >
              <BookOpen size={13} className={viewMode === 'board' && !isPracticeSlide ? 'text-brand-cyan animate-pulse' : ''} />
              <span>Pizarra</span>
            </button>

            <button
              onClick={() => {
                stopCurrentAudio();
                setViewMode('board');
                const practiceIdx = lesson?.phases?.findIndex((p: any) => p.is_practice_slide || p.interaction_type === 'quiz' || (p.exercises && p.exercises.length > 0));
                if (practiceIdx !== -1 && practiceIdx !== undefined) {
                  setCurrentPhaseIdx(practiceIdx);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-semibold ${
                viewMode === 'board' && isPracticeSlide
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold shadow-md shadow-amber-500/25'
                  : 'text-brand-text-muted hover:text-amber-400'
              }`}
              title="Sección de Ejercicios y Desafío Práctico"
            >
              <Sparkles size={13} className={viewMode === 'board' && isPracticeSlide ? 'text-black animate-spin' : 'text-amber-400'} />
              <span>Ejercicios 🎯</span>
            </button>

            <button
              onClick={() => {
                stopCurrentAudio();
                setViewMode('timeline');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-semibold ${
                viewMode === 'timeline'
                  ? 'bg-gradient-to-r from-brand-cyan to-blue-600 text-white shadow-md shadow-brand-cyan/25'
                  : 'text-brand-text-muted hover:text-white'
              }`}
              title="Flujo Didáctico"
            >
              <Sparkles size={13} className={viewMode === 'timeline' ? 'text-yellow-300 animate-pulse' : ''} />
              <span>Flujo</span>
            </button>

            <button
              onClick={() => {
                stopCurrentAudio();
                setViewMode('reading');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-semibold ${
                viewMode === 'reading'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                  : 'text-brand-text-muted hover:text-white'
              }`}
              title="Práctica de Lectura con Fonética IPA"
            >
              <BookOpen size={13} className={viewMode === 'reading' ? 'text-yellow-300 animate-pulse' : ''} />
              <span>Lectura 📖</span>
            </button>

            <button
              onClick={() => {
                stopCurrentAudio();
                setViewMode('games');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-semibold ${
                viewMode === 'games'
                  ? 'bg-gradient-to-r from-brand-accent to-brand-cyan text-white shadow-md shadow-brand-accent/25'
                  : 'text-brand-text-muted hover:text-white'
              }`}
              title="Zona de Juegos"
            >
              <Gamepad2 size={13} className={viewMode === 'games' ? 'text-brand-gold animate-bounce' : ''} />
              <span>Juegos 🎮</span>
            </button>
          </div>

          {/* Subtitles ON/OFF Toggle Button */}
          <button
            onClick={() => setShowDynamicSubtitles(!showDynamicSubtitles)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              showDynamicSubtitles
                ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40 shadow-[0_0_12px_rgba(253,224,71,0.2)]'
                : 'glass text-brand-text-muted hover:text-white border-brand-border'
            }`}
            title={showDynamicSubtitles ? 'Desactivar subtítulos dinámicos' : 'Activar subtítulos dinámicos'}
          >
            <Subtitles size={13} className={showDynamicSubtitles && tutorState === 'speaking' ? 'animate-pulse text-yellow-300' : ''} />
            <span className="hidden sm:inline">{showDynamicSubtitles ? 'Subtítulos ON' : 'Subtítulos OFF'}</span>
          </button>

          {/* Phonetic Board Modal Toggle Button */}
          <button
            onClick={() => setShowPhoneticModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-semibold transition-all shadow-sm"
            title="Abrir Tablero de Fonemas (44 sonidos con audio)"
          >
            <Mic size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">44 Fonemas</span>
          </button>

          {/* Live Waveform & Tutor State */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-surface/80 border border-brand-border text-xs">
            <AnimatePresence>
              {tutorState === 'speaking' && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-end gap-[2px] overflow-hidden"
                  style={{ height: '16px' }}
                >
                  {[4, 11, 6, 15, 8, 13, 5, 12, 7, 10].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-[2px] rounded-full bg-brand-cyan"
                      animate={{ scaleY: [0.2, 1, 0.2] }}
                      transition={{
                        duration: 0.55 + (i % 3) * 0.12,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.055,
                      }}
                      style={{ height: `${h}px`, originY: '100%' }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <TutorAvatar
              state={tutorState}
              text={currentSpeakingText || (typeof phase?.tutor_says === 'string' ? phase?.tutor_says : phase?.tutor_says?.text || '')}
              audioProgress={audioProgress}
              size="sm"
              audioElement={currentAudioRef.current}
            />
            <span className="text-brand-text-secondary font-medium">
              {tutorState === 'speaking'
                ? 'Explicando...'
                : tutorState === 'thinking'
                ? 'Pensando...'
                : tutorState === 'listening'
                ? 'Escuchando...'
                : 'Listo'}
            </span>
          </div>

          {/* Phase Badge */}
          <span className="text-xs font-bold text-brand-cyan bg-brand-cyan/10 px-2.5 py-1 rounded-xl border border-brand-cyan/30">
            {currentPhaseIdx + 1} / {lesson?.phases?.length || 1}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-5 md:p-6 max-w-7xl mx-auto w-full gap-5 relative z-10 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentPhaseIdx}-${viewMode}`}
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full flex-1"
          >
            {viewMode === 'games' ? (
              /* ═══════════════════════════════════════════════════════════════════════
                 🎮 MODE 3: GAME ARENA (JUEGOS EDUCATIVOS: MYSTERY WORD & TWIN CARDS)
                 ═══════════════════════════════════════════════════════════════════════ */
              <GameArena
                topic={topicParam}
                sublevel={sublevelParam}
                lessonId={lesson?.id || lessonId}
                onBackToLesson={() => setViewMode('board')}
              />
            ) : viewMode === 'reading' ? (
              /* ═══════════════════════════════════════════════════════════════════════
                 📖 MODE 4: PRÁCTICA DE LECTURA (STORY MODE WITH WORD-LEVEL IPA)
                 ═══════════════════════════════════════════════════════════════════════ */
              <ReadingPracticeArena
                topic={topicParam}
                sublevel={sublevelParam}
                lessonId={lesson?.id || lessonId}
                onContinueToGames={() => {
                  stopCurrentAudio();
                  setViewMode('games');
                }}
                onBackToLesson={() => {
                  stopCurrentAudio();
                  setViewMode('board');
                }}
              />
            ) : viewMode === 'board' ? (
              /* ═══════════════════════════════════════════════════════════════════════
                 🎨 MODE 1: PIZARRA INTERACTIVA / HOOK CINEMATOGRÁFICO
                 ═══════════════════════════════════════════════════════════════════════ */
              isHook ? (
                <motion.div
                  key={`hook-hero-stage-${currentPhaseIdx}`}
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full flex-1 flex flex-col justify-between p-4 sm:p-7 md:p-8 rounded-3xl bg-gradient-to-b from-[#0a0f1d]/95 via-[#070a14]/98 to-[#04060b]/99 border border-brand-cyan/25 shadow-2xl relative overflow-hidden min-h-[560px]"
                >
                  {/* Cinematic Background Ambient Glows */}
                  <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-brand-cyan/15 rounded-full blur-[120px] pointer-events-none" />
                  <div className="absolute -bottom-32 right-1/4 w-[400px] h-[300px] bg-brand-accent/15 rounded-full blur-[100px] pointer-events-none" />

                  {/* Top Minimalist Hook Header Bar */}
                  <div className="w-full flex items-center justify-between gap-3 relative z-10 pb-3 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="px-3.5 py-1.5 rounded-full bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm">
                        <Sparkles size={14} className="text-brand-cyan animate-pulse" />
                        <span>Hook de Apertura</span>
                      </span>
                      <h2 className="text-sm sm:text-base font-bold text-white/90 hidden sm:inline truncate max-w-md">
                        {renderTextContent(phase.phase_name)}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => speakText(typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text || '', true)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/30 border border-brand-cyan/35 text-brand-cyan hover:text-white flex items-center gap-1.5 transition-all font-semibold shadow-sm"
                        title="Escuchar la locución del hook"
                      >
                        <Volume2 size={13} className="text-brand-cyan" />
                        <span>Escuchar Hook</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDynamicSubtitles(!showDynamicSubtitles)}
                        className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                          showDynamicSubtitles
                            ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40 shadow-sm'
                            : 'glass border-brand-border text-brand-text-muted hover:text-white'
                        }`}
                        title={showDynamicSubtitles ? 'Ocultar subtítulos' : 'Mostrar subtítulos dinámicos'}
                      >
                        <Subtitles size={12} className={showDynamicSubtitles && tutorState === 'speaking' ? 'text-brand-cyan animate-pulse' : ''} />
                        <span>{showDynamicSubtitles ? 'Subtítulos ON' : 'Subtítulos'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Dual Hero Image Cards (Diptych / Split View) */}
                  <div className={`w-full grid ${hookImagesData.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-5 my-auto py-5 relative z-10 max-w-5xl mx-auto`}>
                    {hookImagesData.map((hi, hIdx) => {
                      const hKey = `${currentPhaseIdx}-${topicParam}${hIdx > 0 ? `-img${hIdx}` : ''}`;
                      const hUrl = minimaxImageMap[hKey] || (hIdx === 0 ? imageUrl : getFallbackImageUrl(hi.prompt, topicParam, currentPhaseIdx + 17));
                      const isHGenerating = generatingImages[hKey] || !hUrl;

                      return (
                        <motion.div
                          key={hIdx}
                          initial={{ opacity: 0, scale: 0.92, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.55, delay: hIdx * 0.15, ease: [0.22, 1, 0.36, 1] }}
                          whileHover={{ scale: 1.015 }}
                          onClick={() => {
                            if (hUrl) {
                              setZoomedImageUrl(hUrl);
                              setIsImageZoomed(true);
                            }
                          }}
                          className="group relative rounded-3xl border border-white/20 overflow-hidden bg-black/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)] cursor-pointer flex flex-col justify-end min-h-[280px] sm:min-h-[350px] transition-all hover:border-brand-cyan/50 hover:shadow-[0_0_40px_rgba(0,212,255,0.25)]"
                        >
                          {hUrl ? (
                            <>
                              <img
                                src={hUrl}
                                alt={hi.caption || 'Ilustración del Hook'}
                                className="w-full h-full max-h-[360px] sm:max-h-[420px] object-cover rounded-3xl transition-transform duration-700 group-hover:scale-105"
                              />
                              {/* Soft Vignette Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                              {/* Bottom Caption Pill */}
                              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
                                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-xs text-white font-medium shadow-lg">
                                  <Sparkles size={12} className="text-yellow-300 flex-shrink-0" />
                                  <span className="truncate">{hi.caption || (hIdx === 0 ? 'Situación / Dilema' : 'Contexto de Aprendizaje')}</span>
                                </div>

                                <span className="p-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white/80 group-hover:text-white transition-colors">
                                  <Maximize2 size={13} />
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-black/50 min-h-[280px]">
                              <Loader2 size={24} className="text-brand-cyan animate-spin mb-3" />
                              <p className="text-xs text-white/70 font-mono">Generando imagen neuronal de apertura...</p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Bottom Action Footer with Cinematic CTA */}
                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 relative z-10 flex-shrink-0">
                    <div className="text-xs text-white/70 font-chalk text-center sm:text-left">
                      💡 <strong className="text-brand-cyan font-sans">El Hook:</strong> Escucha la introducción inmersiva y avanza a los conceptos.
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleNextSlide}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-brand-accent via-indigo-500 to-brand-cyan text-white font-bold text-sm shadow-[0_0_30px_rgba(108,99,255,0.5)] hover:shadow-[0_0_40px_rgba(0,212,255,0.7)] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                    >
                      <span>Comenzar Explicación de la Clase</span>
                      <ChevronRight size={18} />
                    </motion.button>
                  </div>
                </motion.div>
              ) : isPracticeSlide ? (
                /* ═══════════════════════════════════════════════════════════════════════
                   🎯 MODE 1.4: SLIDE DEDICADA DE DESAFÍO INTERACTIVO Y EJERCICIOS CON IMÁGENES
                   ═══════════════════════════════════════════════════════════════════════ */
                <motion.div
                  key={`practice-hero-stage-${currentPhaseIdx}`}
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full flex-1 flex flex-col justify-between"
                >
                  <InteractiveExerciseStage
                    exercises={
                      phase.exercises && phase.exercises.length > 0
                        ? phase.exercises
                        : parsedExercisesData.exercises.map(e => ({
                            id: e.id,
                            sentence: e.cleanSentence || e.question,
                            options: e.options,
                            expected_answer: e.options?.[0] || '',
                            spanish_translation: `Completa la oración en el contexto de ${topicParam}.`,
                            image_prompt: `2D flat vector educational illustration depicting ${topicParam}, clean design, no text`
                          }))
                    }
                    phaseName={typeof phase.phase_name === 'string' ? phase.phase_name : `Desafío Práctico: ${topicParam}`}
                    tutorSays={typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text || ''}
                    phaseIdx={currentPhaseIdx}
                    topicParam={topicParam}
                    lessonId={lesson?.id || lessonId}
                    minimaxImageMap={minimaxImageMap}
                    generatingImages={generatingImages}
                    onFetchExerciseImage={fetchExerciseImage}
                    onNextSlide={handleNextSlide}
                    nextSlideLabel={
                      currentPhaseIdx < (lesson?.phases?.length ? lesson.phases.length - 1 : 0) &&
                      (lesson?.phases?.[currentPhaseIdx + 1]?.is_phonetic_bonus || lesson?.phases?.[currentPhaseIdx + 1]?.phonetic_focus)
                        ? "Bonus de Pronunciación 🌟"
                        : "Pasar a la Práctica de Lectura 📖"
                    }
                  />
                </motion.div>
              ) : isPhoneticBonus ? (
                /* ═══════════════════════════════════════════════════════════════════════
                   🌟 MODE 1.5: SLIDE DEDICADA DE BONUS DE PRONUNCIACIÓN (AL FINAL DE CLASE)
                   ═══════════════════════════════════════════════════════════════════════ */
                <motion.div
                  key={`phonetic-bonus-hero-stage-${currentPhaseIdx}`}
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full flex-1 flex flex-col justify-between space-y-4"
                >
                  <MicroPhoneticCard
                    phoneticData={phase.phonetic_focus || lesson?.phonetic_focus || lesson?.phonetic_data || {}}
                    isStandaloneSlide={true}
                    onCompletePractice={(sym, ok) => {
                      api.recordPhoneme(sym, ok, 90).catch(() => {});
                    }}
                  />

                  {/* Bottom Action Footer with Direct Transition to Reading */}
                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md relative z-10 flex-shrink-0">
                    <div className="text-xs text-white/70">
                      🌟 <strong className="text-emerald-400">Bonus de Pronunciación:</strong> Practica los fonemas y avanza a la lectura y juego interactivo.
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleNextSlide}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-brand-cyan text-black font-extrabold text-sm shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(0,212,255,0.7)] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                    >
                      <span>Pasar a la Práctica de Lectura 📖</span>
                      <ChevronRight size={18} />
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <div className={`${getBoardThemeClass(phase.board_theme)} p-5 sm:p-7 space-y-5 relative`}>
                
                {/* Board Header Bar - Ultra-compact & clean */}
                <div id="storyboard-target-title" className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-white/10 z-10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-brand-accent/20 border border-brand-accent/40 text-brand-cyan flex-shrink-0">
                      <BookOpen size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan block">Pizarra de Estudio</span>
                      <h2 className="text-sm sm:text-base md:text-lg font-bold font-chalk text-white truncate">
                        {renderTextContent(phase.phase_name)}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Botón Principal: Escuchar / Pausar */}
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                        tutorState === 'speaking'
                          ? 'bg-brand-accent text-white border-brand-accent shadow-[0_0_15px_rgba(108,99,255,0.4)]'
                          : 'glass hover:bg-brand-surface border-brand-border text-brand-cyan hover:text-white'
                      }`}
                      title={tutorState === 'speaking' ? 'Pausar locución' : 'Escuchar explicación'}
                    >
                      {tutorState === 'speaking' ? (
                        <>
                          <Pause size={13} />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play size={13} className="fill-current" />
                          <span>Escuchar</span>
                        </>
                      )}
                    </button>

                    {/* Botón: Repetir Explicación */}
                    <button
                      type="button"
                      onClick={handleReplayCurrentStep}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-brand-text-muted hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Repetir explicación"
                    >
                      <RotateCcw size={13} />
                      <span className="hidden sm:inline">Repetir</span>
                    </button>
                  </div>
                </div>

                {/* 🎬 Chronological Video-Like Timeline Visual Stage */}
                <div className="flex flex-col gap-4 z-10 w-full">
                  {/* 🎬 Sequential Video-Like Timeline Stage: Reveals ONLY what tutor explains step-by-step */}
                  <TimelineVisualRenderer
                    timeline={phaseStoryboardTimeline}
                    activeStepIdx={activeStepIdx}
                    revealedStepCount={revealedStepCount}
                    isFullBoardRevealed={isFullBoardRevealed}
                    audioProgress={audioProgress}
                    isPlaying={tutorState === 'speaking'}
                    tutorState={tutorState}
                    theme={phase.board_theme?.includes('chalkboard') ? 'chalk' : 'studio'}
                    onPlayAudio={handlePlayIndividualAudio}
                    imageUrl={minimaxGeneratedUrl || null}
                    imagePrompt={cleanImagePrompt}
                    imageLoading={isImageGenerating}
                    onRegenerateImage={() => fetchPhaseImage(currentPhaseIdx, topicParam, phase, 0, rawImagePrompt)}
                    onOpenImageModal={() => setIsImageZoomed(true)}
                    diagramSvg={currentDiagramSvg || phase.diagram_svg || null}
                    pedagogicalTip={phase.tips || phase.grammar_structure?.tips || (phase.grammar_structure?.explanation ? `💡 ${phase.grammar_structure.explanation}` : undefined) || 'Presta atención a cómo la pronunciación y la estructura transforman el significado natural en inglés.'}
                    onStartItemRecording={startItemRecognition}
                    onStopItemRecording={() => setItemRecordingKey(null)}
                    itemRecordingKey={itemRecordingKey}
                    itemProcessingKey={itemProcessingKey}
                    itemLiveTranscript={itemLiveTranscript}
                    itemEvaluations={itemEvals}
                    exercises={exercises}
                    currentExerciseIdx={selectedExerciseIdx}
                    onSelectExercise={(idx) => setSelectedExerciseIdx(idx)}
                    onSelectOption={(opt) => {
                      setSelectedChallengeOption(opt);
                      setTextInput(opt);
                    }}
                    selectedOption={selectedChallengeOption}
                    textInput={textInput}
                    onTextInputChange={(val) => setTextInput(val)}
                    onSubmitAnswer={handleTextSubmit}
                    onStartVoiceRecording={startVoiceRecording}
                    onStopVoiceRecording={stopVoiceRecording}
                    isRecording={isRecording}
                    isProcessing={isProcessing}
                    evaluation={evaluation}
                    onResetEvaluation={() => {
                      setEvaluation(null);
                      setTextInput('');
                      setSelectedChallengeOption(null);
                    }}
                  />
                </div>
              </div>
              )
            ) : (
              /* ═══════════════════════════════════════════════════════════════════════
                 ✨ MODE 2: FLUJO DIDÁCTICO (SMART TIMELINE FEED)
                 ═══════════════════════════════════════════════════════════════════════ */
              <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full py-2">
                {/* 1. Hero Concept Card (Green Chalkboard Container) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="board-chalkboard-green chalk-stage p-5 sm:p-7 rounded-3xl shadow-2xl space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 text-brand-cyan">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan block">
                          Pizarra de Estudio • Fase {currentPhaseIdx + 1}
                        </span>
                        <h2 className="text-base sm:text-lg font-chalk font-bold text-white">
                          {renderTextContent(phase.phase_name)}
                        </h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => speakText(typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text || '', true)}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-cyan border border-brand-accent/40 text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:scale-105"
                    >
                      <Volume2 size={14} className="animate-pulse text-brand-cyan" />
                      <span>Escuchar Explicación Completa</span>
                    </button>
                  </div>

                    {/* Concept Grid: Image + Rules */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                      <div className="md:col-span-5 relative group rounded-2xl overflow-hidden bg-black/30 border border-white/10">
                        {minimaxGeneratedUrl ? (
                          <div
                            onClick={() => setIsImageZoomed(true)}
                            className="cursor-pointer relative"
                          >
                            <img
                              src={minimaxGeneratedUrl}
                              alt="Ilustración didáctica principal"
                              className="w-full h-48 sm:h-56 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <span className="px-3.5 py-1.5 rounded-xl bg-brand-accent text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
                                <ZoomIn size={14} /> Ampliar Imagen
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-48 sm:h-56 flex flex-col items-center justify-center p-4 text-center bg-brand-dark/60 border border-brand-cyan/20 rounded-2xl">
                            <Sparkles className="w-6 h-6 text-brand-cyan animate-pulse mb-2" />
                            <span className="text-xs font-semibold text-white font-chalk">Generando ilustración MiniMax...</span>
                            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-brand-cyan font-mono">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>image-01</span>
                            </div>
                          </div>
                        )}
                      </div>

                    <div className="md:col-span-7 space-y-3">
                      <ExplanationBoard
                        boardContent={phase.board_content}
                        tutorSays={typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text}
                        phaseTimeline={phaseTimeline}
                        audioProgress={100}
                        isPlaying={false}
                        tutorState="idle"
                        isFullBoardRevealed={true}
                        onPlayAudio={handlePlayIndividualAudio}
                        theme="chalk"
                      />
                      {/* ⚡ Visual Structured Grammar Formula Card */}
                      {(phase.grammar_structure || phase.key_structure) && (
                        <GrammarStructureCard
                          structure={phase.grammar_structure || phase.key_structure}
                          onPlayAudio={handlePlayIndividualAudio}
                          theme="chalk"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* 2. Timeline Feed Header */}
                {targetAudioItems && targetAudioItems.length > 0 && (
                  <div className="flex items-center justify-between px-2 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-2">
                      <Sparkles size={16} className="text-brand-cyan animate-pulse" />
                      <span>Frases de Práctica ({targetAudioItems.length})</span>
                    </h3>
                    <span className="text-[11px] text-brand-text-muted hidden sm:inline">
                      Práctica guiada paso a paso con audio y micrófono
                    </span>
                  </div>
                )}

                {/* 3. Stream of Dedicated Visuals + Pronunciation Cards */}
                <div className="relative pl-4 sm:pl-8 space-y-6 border-l-2 border-brand-cyan/40 ml-2 sm:ml-4">
                  {targetAudioItems.map((item, idx) => {
                    const sentenceImage = getSentenceImageUrl(item.english, idx);
                    const itemKey = `timeline-item-${idx}-${item.english}`;
                    const isThisRecording = itemRecordingKey === itemKey;
                    const isThisProcessing = itemProcessingKey === itemKey;
                    const itemResult = itemEvals[itemKey];

                    return (
                      <motion.div
                        key={itemKey}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.1 }}
                        className="relative"
                      >
                        {/* Timeline Node Marker */}
                        <div className="absolute -left-[25px] sm:-left-[41px] top-6 w-8 h-8 rounded-full bg-brand-dark border-2 border-brand-cyan flex items-center justify-center text-brand-cyan font-bold text-xs shadow-[0_0_12px_rgba(0,212,255,0.6)] z-10">
                          {idx + 1}
                        </div>

                        {/* Card Container */}
                        <div className={`glass p-5 sm:p-6 rounded-3xl border transition-all shadow-xl space-y-4 ${
                          itemResult
                            ? itemResult.is_correct
                              ? 'border-brand-success/50 bg-brand-success/5 shadow-brand-success/10'
                              : 'border-brand-error/50 bg-brand-error/5'
                            : 'border-brand-border/70 hover:border-brand-cyan/50 bg-brand-surface/40'
                        }`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                              {item.label || `Ejemplo #${idx + 1}`}
                            </span>
                            {item.translation && (
                              <span className="text-xs text-brand-text-secondary italic font-medium">
                                Traducción: {item.translation}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                            {/* Sentence Image */}
                            <div
                              onClick={() => setIsImageZoomed(true)}
                              className="md:col-span-5 relative group/simg rounded-2xl overflow-hidden cursor-pointer bg-black/30 border border-brand-cyan/30 shadow-md"
                            >
                              <img
                                src={sentenceImage}
                                alt={`Ilustración para: ${item.english}`}
                                className="w-full h-44 sm:h-48 object-cover rounded-2xl group-hover/simg:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover/simg:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <span className="px-3 py-1.5 rounded-xl bg-brand-accent text-white text-xs font-bold flex items-center gap-1 shadow-lg">
                                  <ZoomIn size={13} /> Ampliar
                                </span>
                              </div>
                              <div className="absolute bottom-2 left-2 right-2 bg-brand-dark/85 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] text-brand-cyan font-semibold truncate border border-brand-cyan/20">
                                🎨 Visual: &quot;{item.english}&quot;
                              </div>
                            </div>

                            {/* Sentence Content & Controls */}
                            <div className="md:col-span-7 space-y-3">
                              <div className="bg-brand-surface/80 p-4 rounded-2xl border border-brand-cyan/30 space-y-1">
                                <span className="text-xs text-brand-cyan font-bold uppercase tracking-wider block">Oración Target:</span>
                                <p className="text-base sm:text-lg font-outfit font-bold text-white tracking-wide leading-snug">
                                  &quot;{item.english}&quot;
                                </p>
                              </div>

                              {/* Controls */}
                              <div className="flex items-center gap-2 flex-wrap pt-1">
                                <button
                                  type="button"
                                  onClick={() => handlePlayIndividualAudio(item.english)}
                                  disabled={isThisRecording || isThisProcessing}
                                  className="px-3.5 py-2 rounded-xl bg-brand-cyan/20 hover:bg-brand-cyan/40 text-brand-cyan border border-brand-cyan/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:scale-105 disabled:opacity-40"
                                >
                                  <Volume2 size={14} className="text-brand-cyan animate-pulse" />
                                  <span>Escuchar</span>
                                </button>

                                {!itemResult ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isThisRecording) {
                                        setItemRecordingKey(null);
                                      } else {
                                        startItemRecognition(itemKey, item.english);
                                      }
                                    }}
                                    disabled={isThisProcessing || (itemRecordingKey !== null && !isThisRecording)}
                                    className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                                      isThisProcessing
                                        ? 'bg-brand-surface border-brand-accent text-brand-cyan animate-pulse'
                                        : isThisRecording
                                        ? 'bg-brand-error border-brand-error text-white shadow-[0_0_20px_rgba(255,82,82,0.5)] scale-105 animate-pulse'
                                        : 'bg-brand-accent hover:bg-brand-accent/90 text-white border-brand-accent shadow-md hover:scale-105'
                                    }`}
                                  >
                                    {isThisProcessing ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : isThisRecording ? (
                                      <Square size={14} className="fill-white" />
                                    ) : (
                                      <Mic size={14} />
                                    )}
                                    <span>{isThisProcessing ? 'Evaluando...' : isThisRecording ? 'Detener' : 'Practicar 🎤'}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setItemEvals(prev => {
                                        const n = { ...prev };
                                        delete n[itemKey];
                                        return n;
                                      });
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-brand-surface hover:bg-brand-border border border-brand-border text-brand-text-muted hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                                  >
                                    <RotateCcw size={13} />
                                    <span>Reintentar</span>
                                  </button>
                                )}
                              </div>

                              {/* Live Speech Recognition Box */}
                              {isThisRecording && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="p-3 rounded-2xl bg-black/40 border border-brand-error/40 flex items-center gap-2 text-xs"
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-brand-error animate-ping" />
                                  <span className="font-bold text-brand-error">Escuchando:</span>
                                  <span className="font-mono text-white truncate">{itemLiveTranscript || 'Habla ahora...'}</span>
                                </motion.div>
                              )}

                              {/* Item Result */}
                              {itemResult && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                                    itemResult.is_correct
                                      ? 'bg-brand-success/15 border-brand-success/40'
                                      : 'bg-brand-error/15 border-brand-error/40'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-white">
                                      {itemResult.is_correct ? '✅ ¡Excelente pronunciación!' : '❌ Inténtalo de nuevo'}
                                    </span>
                                    <span className="font-bold text-brand-gold">
                                      Puntaje: {itemResult.overall_score}/100
                                    </span>
                                  </div>
                                  {itemResult.feedback && (
                                    <p className="text-brand-text-secondary leading-relaxed">{itemResult.feedback}</p>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 🌟 Bottom Slide Navigation Footer */}
        {viewMode !== 'games' && viewMode !== 'reading' && (
          <footer className="flex items-center justify-between gap-4 pt-3 border-t border-brand-border/60">
            <button
              onClick={handlePrevSlide}
              disabled={currentPhaseIdx === 0}
              className="px-4 py-2.5 glass hover:bg-brand-surface border border-brand-border text-white text-xs sm:text-sm font-semibold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ChevronLeft size={16} />
              <span>Anterior</span>
            </button>

            {/* Center: Instagram Stories-style Phase Progress Rail */}
            <div className="flex flex-col items-center gap-2 flex-1">
              {/* Phase Pill Rail */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {lesson?.phases?.map((_: any, idx: number) => {
                  const isActive = idx === currentPhaseIdx;
                  const isPast = idx < currentPhaseIdx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhaseIdx(idx)}
                      title={`Fase ${idx + 1}`}
                      className="relative overflow-hidden rounded-full transition-all duration-500 focus:outline-none group"
                      style={{
                        width: isActive ? '40px' : '10px',
                        height: '10px',
                      }}
                    >
                      {/* Background track */}
                      <span className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                        isActive ? 'bg-brand-border/40' :
                        isPast ? 'bg-brand-accent/50' : 'bg-brand-border/30'
                      }`} />
                      {/* Fill: audio progress for active, full fill for past */}
                      <motion.span
                        className={`absolute inset-y-0 left-0 rounded-full ${
                          isActive
                            ? 'bg-gradient-to-r from-brand-cyan to-brand-accent shadow-[0_0_10px_rgba(0,212,255,0.7)]'
                            : 'bg-brand-accent/70'
                        }`}
                        animate={{
                          width: isActive
                            ? `${Math.max(8, audioProgress)}%`
                            : isPast ? '100%' : '0%'
                        }}
                        transition={isActive ? { duration: 0.3, ease: 'linear' } : { duration: 0.4 }}
                      />
                    </button>
                  );
                })}
              </div>
              {/* Phase label */}
              <span className="text-[10px] text-brand-text-muted font-mono">
                Fase {currentPhaseIdx + 1} de {lesson?.phases?.length || 1}
              </span>
            </div>

            {/* Right: Modo Cine + Fonemas + Siguiente */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPhoneticModal(true)}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-emerald-500/30 bg-emerald-950/25 text-emerald-300 hover:bg-emerald-900/35 hover:text-white"
                title="Consultar y escuchar los 44 fonemas en cualquier momento"
              >
                <Mic size={13} className="text-emerald-400" />
                <span>Tablero Fonético</span>
              </button>

              <button
                onClick={() => {
                  const next = !cinemaModeActive;
                  cinemaModeRef.current = next;
                  setCinemaModeActive(next);
                }}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  cinemaModeActive
                    ? 'bg-brand-accent text-white border-brand-accent shadow-[0_0_18px_rgba(108,99,255,0.5)]'
                    : 'glass border-brand-border text-brand-text-muted hover:text-white hover:border-brand-accent/50'
                }`}
                title={cinemaModeActive
                  ? 'Desactivar Modo Cine (auto-avance)'
                  : 'Activar Modo Cine — avanza automáticamente al terminar cada slide'}
              >
                <Film size={13} className={cinemaModeActive ? 'animate-pulse' : ''} />
                <span>{cinemaModeActive ? '▶ Cine ON' : 'Modo Cine'}</span>
              </button>

              <motion.button
                onClick={handleNextSlide}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-6 py-2.5 bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-accent/90 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(108,99,255,0.4)] hover:shadow-[0_0_30px_rgba(108,99,255,0.6)] flex items-center justify-center gap-1.5"
              >
                <span>
                  {currentPhaseIdx < (lesson?.phases?.length || 1) - 1
                    ? 'Siguiente →'
                    : '📖 Práctica de Lectura'}
                </span>
                <ChevronRight size={16} />
              </motion.button>
            </div>
          </footer>
        )}
      </div>

      {/* 🎬 After Effects Style Kinetic Dynamic Subtitles (Tutor Speech Synchronized) */}
      {showDynamicSubtitles && (
        <DynamicSubtitles
          text={currentSpeakingText || (typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text || '')}
          audioProgress={audioProgress}
          isPlaying={tutorState === 'speaking'}
          isHookMode={isHook}
          onClose={() => setShowDynamicSubtitles(false)}
        />
      )}

      {/* Image Lightbox Modal Zoom */}
      <AnimatePresence>
        {isImageZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsImageZoomed(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center justify-center">
              <button
                onClick={() => setIsImageZoomed(false)}
                className="absolute top-2 right-2 p-2.5 rounded-full bg-brand-surface/80 text-white hover:bg-brand-accent transition-colors z-20 border border-white/20"
                title="Cerrar vista amplia"
              >
                <X size={20} />
              </button>

              <img
                src={zoomedImageUrl || imageUrl}
                alt="Vista ampliada de la ilustración"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-brand-cyan/30"
              />

              <div className="mt-4 bg-brand-dark/90 px-4 py-2 rounded-2xl border border-white/10 text-xs text-brand-text-secondary flex items-center gap-2">
                <ImageIcon size={14} className="text-brand-cyan" />
                <span>Ilustración de la Lección</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🗣️ Floating Phonetic Board Popup Modal (Interactive 44-Sound Overlay) */}
      <AnimatePresence>
        {showPhoneticModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6"
            onClick={() => setShowPhoneticModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl max-h-[92vh] bg-zinc-950 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-4 sm:p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm sm:text-base">
                  <Mic className="w-5 h-5 text-emerald-400" />
                  <span>Tablero Fonético de 44 Sonidos</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPhoneticModal(false)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/60 transition-colors"
                  title="Cerrar y continuar con la lección"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 pr-1">
                <PhoneticBoard inLessonMode={true} onClose={() => setShowPhoneticModal(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
