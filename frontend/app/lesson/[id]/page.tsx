'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api, playTTS, stopTutorVoice, playEnglishAudio } from '@/lib/api';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';
import MicButton from '@/app/components/TutorPanel/MicButton';
import ScoreDisplay from '@/app/components/TutorPanel/ScoreDisplay';
import GrammarStructureCard from '@/app/components/GrammarStructureCard';
import DynamicSubtitles from '@/app/components/DynamicSubtitles';
import MicroPhoneticCard from '@/app/components/MicroPhoneticCard';
import PhoneticBoard from '@/app/components/PhoneticBoard';
import LiveStoryboardController, { StoryboardStep } from '@/app/components/LiveStoryboardController';
import {
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  HelpCircle,
  RotateCcw,
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

export function getPhaseDiagramSvg(phase: any, topic: string): string | null {
  if (phase?.diagram_svg && typeof phase.diagram_svg === 'string' && phase.diagram_svg.includes('<svg')) {
    return phase.diagram_svg;
  }
  const phaseNum = phase?.phase_number || phase?.phase_index || 1;
  if (phaseNum > 4) return null;

  const combined = `${topic || ''} ${phase?.phase_name || ''} ${typeof phase?.board_content === 'string' ? phase.board_content : ''}`.toLowerCase();

  // 1. Past Continuous & Interrupted Actions (Check FIRST)
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
  return null;
}

// ─── HELPER: Generate or Normalize Phase Storyboard Steps ───────────────────
function getPhaseStoryboardSteps(phase: any, topic: string): StoryboardStep[] {
  const diagSvg = getPhaseDiagramSvg(phase, topic);

  if (phase?.storyboard_steps && Array.isArray(phase.storyboard_steps) && phase.storyboard_steps.length > 0) {
    const hasDiagStep = phase.storyboard_steps.some((s: any) => s.element_type === 'diagram');
    if (!diagSvg || hasDiagStep) {
      const hasExercise = Boolean(phase.phase_number !== 1 && (phase.student_task || phase.expected_answer || phase.exercises));
      const hasExerciseStep = phase.storyboard_steps.some((s: any) => s.element_type === 'exercise');
      if (!hasExercise || hasExerciseStep) {
        return phase.storyboard_steps;
      }
    }
  }
  const steps: StoryboardStep[] = [];
  let idx = 1;
  steps.push({
    step_id: 'step-title',
    step_index: idx++,
    element_type: 'title',
    label: '1. Introducción y Título',
    tutor_speech_snippet: typeof phase?.phase_name === 'string' ? phase.phase_name : 'Introducción',
    trigger_ratio: 0.00,
    animation: 'chalk_write',
    highlight_target: 'title',
    chalk_color: 'yellow',
  });
  steps.push({
    step_id: 'step-illustration',
    step_index: idx++,
    element_type: 'illustration',
    label: '2. Ilustración Didáctica',
    tutor_speech_snippet: 'Observa la ilustración visual para comprender el contexto.',
    trigger_ratio: 0.15,
    animation: 'zoom_pop',
    highlight_target: 'illustration',
    chalk_color: 'cyan',
  });
  steps.push({
    step_id: 'step-concepts',
    step_index: idx++,
    element_type: 'concepts',
    label: '3. Reglas en Pizarra',
    tutor_speech_snippet: 'Revisa las reglas y conceptos clave anotados en la pizarra.',
    trigger_ratio: 0.35,
    animation: 'typewriter',
    highlight_target: 'concepts',
    chalk_color: 'green',
  });
  if (diagSvg) {
    steps.push({
      step_id: 'step-diagram',
      step_index: idx++,
      element_type: 'diagram',
      label: `${idx - 1}. Gráfico Didáctico`,
      tutor_speech_snippet: 'Observa la línea temporal y el esquema conceptual.',
      trigger_ratio: 0.45,
      animation: 'zoom_pop',
      highlight_target: 'diagram',
      chalk_color: 'cyan',
    });
  }
  const isPhoneticPhase = Boolean(
    phase?.phonetic_focus ||
    (phase?.phase_name?.toLowerCase().includes('fonét') && phase?.phase_number === 4)
  );

  if (isPhoneticPhase) {
    steps.push({
      step_id: 'step-phonetics',
      step_index: idx++,
      element_type: 'phonetics',
      label: '4. Micro-Fonética',
      tutor_speech_snippet: 'Fíjate en la postura de la boca y el contraste fonético.',
      trigger_ratio: 0.55,
      animation: 'bounce_in',
      highlight_target: 'phonetics',
      chalk_color: 'purple',
    });
  } else if (phase?.grammar_structure || phase?.key_structure || phase?.phase_number === 3 || phase?.phase_number === 4) {
    steps.push({
      step_id: 'step-grammar',
      step_index: idx++,
      element_type: 'grammar',
      label: '4. Estructura y Reglas',
      tutor_speech_snippet: 'Fíjate en el patrón y la estructura sintáctica.',
      trigger_ratio: 0.55,
      animation: 'bounce_in',
      highlight_target: 'grammar',
      chalk_color: 'purple',
    });
  }
  if (phase?.target_audio_items && phase.target_audio_items.length > 0) {
    steps.push({
      step_id: 'step-audio-practice',
      step_index: idx++,
      element_type: 'audio_practice',
      label: '5. Práctica de Pronunciación',
      tutor_speech_snippet: 'Escucha y practica las frases clave con el micrófono.',
      trigger_ratio: 0.72,
      animation: 'fly_from_bottom',
      highlight_target: 'audio_practice',
      chalk_color: 'pink',
    });
  }
  // Exercises are strictly calibrated at the end of the slide, and never in Phase 1
  if (phase?.phase_number !== 1 && (phase?.student_task || phase?.expected_answer || phase?.exercises)) {
    steps.push({
      step_id: 'step-exercise',
      step_index: idx++,
      element_type: 'exercise',
      label: `${idx - 1}. Desafío Interactivo`,
      tutor_speech_snippet: 'Demuestra lo aprendido resolviendo el ejercicio interactivo.',
      trigger_ratio: 0.88,
      animation: 'spotlight_glow',
      highlight_target: 'exercise',
      chalk_color: 'gold',
    });
  }
  return steps;
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

  // 🎨 Consolidated View Modes: 'board' (Pizarra Interactiva), 'timeline' (Flujo Didáctico), 'reading' (Práctica de Lectura), or 'games' (Game Arena)
  const [viewMode, setViewMode] = useState<'board' | 'timeline' | 'reading' | 'games'>('board');
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [minimaxImageMap, setMinimaxImageMap] = useState<Record<string, string>>({});

  // 🎬 Cinema mode & audio tracking
  const [cinemaModeActive, setCinemaModeActive] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); // 0–100
  // 📖 Board karaoke: reveal lines one-by-one as tutor speaks
  const [revealedLineCount, setRevealedLineCount] = useState<number>(999);

  // 🎬 Progressive Live Classroom & Storyboard Stepper
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [revealedStepCount, setRevealedStepCount] = useState<number>(99);
  const [isFullBoardRevealed, setIsFullBoardRevealed] = useState<boolean>(true);

  const phase = lesson?.phases?.[currentPhaseIdx] || {};
  const isALevel = (sublevelParam || '').startsWith('A1') || (sublevelParam || '').startsWith('A2');

  const phaseStoryboardSteps = useMemo(() => {
    return getPhaseStoryboardSteps(phase, topicParam);
  }, [phase, topicParam]);

  const currentDiagramSvg = useMemo(() => {
    return getPhaseDiagramSvg(phase, topicParam);
  }, [phase, topicParam]);

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
          data = {
            id: lessonId || `fallback-${Date.now()}`,
            title: topicParam || 'English Practice',
            sublevel: sublevelParam || 'A1.1',
            phases: [
              {
                phase_number: 1,
                phase_name: '1. Activación y Warm-up',
                tutor_says: `¡Hola! Bienvenido a tu clase de inglés sobre ${topicParam}. Hoy aprenderemos las estructuras y expresiones fundamentales para comunicarte con total seguridad.`,
                board_content: `📌 Tema: ${topicParam}\n\n• Objetivo: Dominar el vocabulario y las estructuras clave.\n• Escucha atentamente las frases y repite conmigo.`,
                image_style: 'comic_scene',
                image_prompt: `Clean flat 2D vector educational illustration of a friendly teacher introducing ${topicParam} in a modern classroom, no text, no words.`,
                target_audio_items: [
                  { english: `Hello, let's learn about ${topicParam}`, translation: `Hola, aprendamos sobre ${topicParam}`, label: 'Saludo y Objetivo' }
                ],
                student_task: null,
                expected_answer: null,
                interaction_type: 'explanation',
              },
              {
                phase_number: 2,
                phase_name: '2. Repaso y Fundamentos',
                tutor_says: `Antes de profundizar, repasemos las bases que conectan con este tema. Recuerda que la pronunciación clara es la clave de la fluidez.`,
                board_content: `💡 Fundamento Gramatical:\n\n• Sujeto + Verbo + Complemento\n• Conexión sonora fluida entre palabras.`,
                image_style: 'flat_art',
                image_prompt: `Clean 2D vector illustration of connecting puzzle pieces representing language concepts, no text, no words.`,
                target_audio_items: [
                  { english: 'I practice English every single day.', translation: 'Practico inglés todos los días.', label: 'Frase de Repaso' }
                ],
                student_task: 'Repite la oración en voz alta con buena pronunciación.',
                expected_answer: 'I practice English every single day.',
                interaction_type: 'pronunciation',
              },
              {
                phase_number: 3,
                phase_name: '3. Estructura Gramatical Central',
                tutor_says: `Aquí tenemos la fórmula nuclear de ${topicParam}. Observa cómo se ordenan los elementos paso a paso.`,
                board_content: `📐 Fórmula Central:\n\n[ Sujeto ] + [ Verbo / Auxiliar ] + [ Complemento ]\n\n• Ejemplo: "This is my notebook." (Este es mi cuaderno).`,
                image_style: 'flat_art',
                image_prompt: `Clean flat 2D vector diagram showing sentence building blocks on a chalkboard, no text, no words.`,
                grammar_structure: {
                  title: `Estructura: ${topicParam}`,
                  formula: '[ Sujeto ] + [ Verbo ] + [ Complemento ]',
                  formula_tokens: [
                    { role: 'Sujeto', pattern: 'I / You / He / She / It', color: 'blue' },
                    { role: 'Verbo', pattern: 'Action / Be', color: 'purple' },
                    { role: 'Complemento', pattern: 'Object / Place', color: 'emerald' }
                  ],
                  explanation: `Esta estructura te permite construir oraciones claras y correctas sobre ${topicParam}.`,
                  example_breakdowns: [
                    {
                      english: 'This is my favorite book.',
                      spanish: 'Este es mi libro favorito.',
                      parts: [
                        { role: 'Sujeto', text: 'This', color: 'blue' },
                        { role: 'Verbo', text: 'is', color: 'purple' },
                        { role: 'Complemento', text: 'my favorite book', color: 'emerald' }
                      ]
                    }
                  ]
                },
                target_audio_items: [
                  { english: 'This is my favorite book.', translation: 'Este es mi libro favorito.', label: 'Ejemplo Modelo' }
                ],
                student_task: null,
                expected_answer: null,
                interaction_type: 'explanation',
              },
              {
                phase_number: 4,
                phase_name: '4. Análisis y Ejemplos Prácticos',
                tutor_says: `Ahora escuchemos oraciones modelo en contexto. Pon mucha atención a la entonación y al ritmo natural del inglés.`,
                board_content: `🎯 Ejemplos en Contexto:\n\n1. "I have my keys in my bag." (Tengo mis llaves en mi bolso).\n2. "She has her new phone." (Ella tiene su teléfono nuevo).`,
                image_style: 'comic_scene',
                image_prompt: `Clean 2D vector educational illustration of everyday objects and people talking, no text, no words.`,
                target_audio_items: [
                  { english: 'I have my keys in my bag.', translation: 'Tengo mis llaves en mi bolso.', label: 'Oración 1' },
                  { english: 'She has her new phone.', translation: 'Ella tiene su teléfono nuevo.', label: 'Oración 2' }
                ],
                student_task: 'Pronuncia la frase modelo en voz alta.',
                expected_answer: 'I have my keys in my bag.',
                interaction_type: 'pronunciation',
              },
              {
                phase_number: 5,
                phase_name: '5. Práctica Guiada Interactiva',
                tutor_says: `¡Es tu turno de practicar! Completa la siguiente oración eligiendo la palabra correcta.`,
                board_content: `📝 Ejercicio Interactivo:\n\nCompleta: "She has ______ keys." [ her / his ]`,
                image_style: 'flat_art',
                image_prompt: `Clean 2D vector graphic of a student filling an exercise with a glowing checkmark, no text, no words.`,
                student_task: 'Completa: "She has ______ keys." [ her / his ]',
                expected_answer: 'her',
                interaction_type: 'quiz',
              },
              {
                phase_number: 6,
                phase_name: '6. Producción y Desafío Final',
                tutor_says: `¡Excelente trabajo hasta aquí! Como desafío final, pronuncia una oración completa aplicando todo lo que aprendiste hoy.`,
                board_content: `🏆 Desafío de Producción:\n\nDi en voz alta: "I am ready to speak English fluently."`,
                image_style: 'comic_scene',
                image_prompt: `Vibrant 2D vector illustration of a student celebrating success with a trophy and confetti, no text, no words.`,
                target_audio_items: [
                  { english: 'I am ready to speak English fluently.', translation: 'Estoy listo/a para hablar inglés con fluidez.', label: 'Frase de Cierre' }
                ],
                student_task: 'Di la frase final: "I am ready to speak English fluently."',
                expected_answer: 'I am ready to speak English fluently.',
                interaction_type: 'pronunciation',
              }
            ],
          };
        }
        }

        // 🎨 INSTANT CLASSROOM REVEAL: Load calibrated vector illustration immediately without blocking
        const phase0 = data.phases[0];
        const rawPrompt0 = typeof phase0?.image_prompt === 'string' && phase0.image_prompt.trim().length > 8
          ? phase0.image_prompt.trim()
          : `Educational 2D vector illustration of ${topicParam} for English lesson (${phase0?.phase_name || 'Introducción'}), clean minimal graphic style`;
        const sanitizedPrompt0 = sanitizeImagePrompt(rawPrompt0, topicParam, 0);
        const slide0Url = getFallbackImageUrl(sanitizedPrompt0, topicParam, 0);

        const initialImageMap: Record<string, string> = {
          [`0-${topicParam}`]: slide0Url,
        };
        setMinimaxImageMap(initialImageMap);
        setLesson(data);
        setImageLoading(false);
        setLoadingLesson(false);

        // 🚀 NON-BLOCKING BACKGROUND WORKER: Fetch high-res AI images in background without freezing UI
        (async () => {
          for (let i = 0; i < data.phases.length; i++) {
            const p = data.phases[i];
            const promptKey = `${i}-${topicParam}`;
            const pPrompt = typeof p.image_prompt === 'string' && p.image_prompt.trim().length > 8
              ? p.image_prompt.trim()
              : `Educational 2D vector illustration of ${topicParam} for English lesson (${p.phase_name || 'Clase'}), clean minimal graphic style`;
            const sanitizedPPrompt = sanitizeImagePrompt(pPrompt, topicParam, i);

            try {
              const genRes = await api.generateImage(sanitizedPPrompt).catch(() => null);
              if (genRes && genRes.success && genRes.url) {
                setMinimaxImageMap(prev => ({ ...prev, [promptKey]: genRes.url }));
              }
            } catch (err) {
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
  }, [lessonId, topicParam, sublevelParam]);

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
    setRevealedStepCount(1);
    setIsFullBoardRevealed(false);
    const newPhase = lesson?.phases?.[currentPhaseIdx];
    if (newPhase) {
      setCurrentSpeakingText(typeof newPhase.tutor_says === 'string' ? newPhase.tutor_says : newPhase.tutor_says?.text || '');
    }
  }, [currentPhaseIdx, lesson]);

  // 2. Auto Speak Tutor's Line ONCE per Phase Change
  useEffect(() => {
    if (viewMode === 'games' || viewMode === 'reading') return;
    if (
      lesson &&
      lesson.phases &&
      lesson.phases[currentPhaseIdx] &&
      !evaluation &&
      lastSpokenPhaseRef.current !== currentPhaseIdx
    ) {
      lastSpokenPhaseRef.current = currentPhaseIdx;
      const phase = lesson.phases[currentPhaseIdx];
      const textToSpeak =
        typeof phase.tutor_says === 'string'
          ? phase.tutor_says
          : phase.tutor_says?.text || 'Escucha la explicación';
      if (textToSpeak) {
        speakText(textToSpeak);
      }
    }
  }, [lesson, currentPhaseIdx, evaluation, viewMode]);

  const updateStoryboardProgress = (progressPercent: number, stepsList: StoryboardStep[]) => {
    if (!stepsList || stepsList.length === 0) return;
    const progressRatio = progressPercent / 100;

    let currentActive = 0;
    let revealed = 1;
    for (let i = 0; i < stepsList.length; i++) {
      const step = stepsList[i];
      if (progressRatio >= step.trigger_ratio) {
        currentActive = i;
        revealed = Math.max(revealed, i + 1);
      }
    }
    setActiveStepIdx(currentActive);
    setRevealedStepCount(prev => Math.max(prev, revealed));
  };

  const speakText = async (text: string) => {
    if (!text || !text.trim()) return;

    setCurrentSpeakingText(text);
    stopCurrentAudio();
    const thisSessionId = audioSessionIdRef.current;

    const currentPhaseObj = lesson?.phases?.[currentPhaseIdx];
    const stepsList = getPhaseStoryboardSteps(currentPhaseObj, topicParam);

    const boardContent = currentPhaseObj?.board_content;
    const boardLines: string[] = typeof boardContent === 'string'
      ? boardContent.split('\n').filter((l: string) => l.trim().length > 0)
      : [];

    if (boardLines.length > 0) {
      setRevealedLineCount(0);
      const wordsInSpeech = text.split(/\s+/).filter(Boolean).length;
      const estimatedDurationMs = Math.max(wordsInSpeech * 175, 1800);
      const lineInterval = estimatedDurationMs / Math.max(boardLines.length, 1);
      let revealed = 0;
      if (lineRevealTimerRef.current) clearInterval(lineRevealTimerRef.current);
      lineRevealTimerRef.current = setInterval(() => {
        revealed++;
        setRevealedLineCount(revealed);
        if (revealed >= boardLines.length) {
          if (lineRevealTimerRef.current) clearInterval(lineRevealTimerRef.current);
          lineRevealTimerRef.current = null;
        }
      }, lineInterval);
    } else {
      setRevealedLineCount(999);
    }

    setTutorState('thinking');
    try {
      const audio = await playTTS(text);

      if (audioSessionIdRef.current !== thisSessionId) {
        audio.pause();
        return;
      }

      currentAudioRef.current = audio;
      setTutorState('speaking');

      // Smooth ~20Hz progress interval to keep subtitles & storyboard in sync without DOM thrashing
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
          const clamped = Math.min(Math.max(prog, 0), 100);
          setAudioProgress(clamped);
          updateStoryboardProgress(clamped, stepsList);
        }
      }, 50);

      audio.ontimeupdate = () => {
        if (audio.duration && audio.duration > 0 && !isNaN(audio.duration)) {
          const prog = (audio.currentTime / audio.duration) * 100;
          const clamped = Math.min(Math.max(prog, 0), 100);
          setAudioProgress(clamped);
          updateStoryboardProgress(clamped, stepsList);
        }
      };

      audio.onended = () => {
        if (audioTimerRef.current) {
          clearInterval(audioTimerRef.current);
          audioTimerRef.current = null;
        }
        if (audioSessionIdRef.current === thisSessionId) {
          setTutorState('idle');
          setAudioProgress(100);
          setRevealedLineCount(999);
          setActiveStepIdx(stepsList.length - 1);
          setRevealedStepCount(stepsList.length);
          setIsFullBoardRevealed(true);
          audioFinishedNaturallyRef.current = true;
        }
      };
      audio.onerror = () => {
        if (audioTimerRef.current) {
          clearInterval(audioTimerRef.current);
          audioTimerRef.current = null;
        }
        if (audioSessionIdRef.current === thisSessionId) {
          setTutorState('idle');
          setRevealedLineCount(999);
          setIsFullBoardRevealed(true);
        }
      };
    } catch (err) {
      console.warn('TTS Error:', err);
      if (audioSessionIdRef.current === thisSessionId) {
        setTutorState('idle');
        setRevealedLineCount(999);
        setIsFullBoardRevealed(true);
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
    stopCurrentAudio();
    if (currentPhaseIdx > 0) {
      setCurrentPhaseIdx((prev) => prev - 1);
    }
  };

  const handleNextSlide = async () => {
    stopCurrentAudio();
    stopTutorVoice();
    if (lesson && currentPhaseIdx < lesson.phases.length - 1) {
      setCurrentPhaseIdx((prev) => prev + 1);
    } else {
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
    if (isFullBoardRevealed) return true;
    const stepIdx = phaseStoryboardSteps.findIndex(
      (s) => s.element_type === type || s.highlight_target === type
    );
    if (stepIdx === -1) return true;
    return stepIdx < revealedStepCount;
  };

  const isStepActive = (type: string) => {
    if (tutorState !== 'speaking' || isFullBoardRevealed) return false;
    const currentStep = phaseStoryboardSteps[activeStepIdx];
    return Boolean(currentStep && (currentStep.element_type === type || currentStep.highlight_target === type));
  };

  const handleStepClick = (stepIndex: number) => {
    const step = phaseStoryboardSteps[stepIndex];
    if (!step) return;
    setActiveStepIdx(stepIndex);
    setRevealedStepCount(prev => Math.max(prev, stepIndex + 1));

    if (currentAudioRef.current && currentAudioRef.current.duration && !currentAudioRef.current.paused) {
      currentAudioRef.current.currentTime = step.trigger_ratio * currentAudioRef.current.duration;
    } else if (step.tutor_speech_snippet) {
      speakText(step.tutor_speech_snippet);
    }
  };

  const handleTogglePlay = () => {
    if (tutorState === 'speaking') {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        setTutorState('idle');
      }
    } else {
      const textToSpeak = typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text || '';
      if (textToSpeak) {
        speakText(textToSpeak);
      }
    }
  };

  const handleReplayCurrentStep = () => {
    const step = phaseStoryboardSteps[activeStepIdx];
    if (step && step.tutor_speech_snippet) {
      speakText(step.tutor_speech_snippet);
    } else {
      const textToSpeak = typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text || '';
      speakText(textToSpeak);
    }
  };

  const handleRevealAll = () => {
    setIsFullBoardRevealed(true);
    setRevealedStepCount(phaseStoryboardSteps.length);
    setRevealedLineCount(999);
  };

  const handleResetReveal = () => {
    setIsFullBoardRevealed(false);
    setActiveStepIdx(0);
    setRevealedStepCount(1);
    const textToSpeak = typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text || '';
    if (textToSpeak) {
      speakText(textToSpeak);
    }
  };

  // Structured target audio items defined by AI Tutor Agent or deterministic phase extractor
  const targetAudioItems = extractTargetAudioItems(phase);

  // ─── Image Generation ──────────────────────────────────────────────────────
  const rawImagePrompt = typeof phase.image_prompt === 'string' && phase.image_prompt.trim().length > 10
    ? phase.image_prompt.trim()
    : `flat 2D vector illustration of ${topicParam} for English lesson (${phase.phase_name}), clean minimal graphic design, bright clear colors, white background`;

  const styleType = (phase.image_style as string) || 'flat_art';
  const cleanImagePrompt = sanitizeImagePrompt(rawImagePrompt, topicParam, currentPhaseIdx);

  const minimaxGeneratedUrl = minimaxImageMap[`${currentPhaseIdx}-${topicParam}`];
  const imageUrl = minimaxGeneratedUrl || getFallbackImageUrl(cleanImagePrompt, topicParam, currentPhaseIdx);

  // Dedicated Sentence Image URL for timeline items
  const getSentenceImageUrl = (englishSentence: string, index: number): string => {
    if (!englishSentence || typeof englishSentence !== 'string') {
      return imageUrl;
    }
    const cleanSentence = englishSentence.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const prompt = `flat 2D vector illustration representing the concept of "${cleanSentence}" in an educational lesson, vibrant colors, clean minimal graphic style, white background, no text, no words, no letters`;
    const seed = (cleanSentence + index).split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0x7fffffff, 99);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=450&model=flux&nologo=true&enhance=true&seed=${seed}`;
  };

  // ─── Reusable Component for Interactive Pronunciation & Speech Card ────────
  const renderPronunciationCard = (
    item: { english: string; translation?: string; label?: string },
    key: string,
    idx: number,
    theme: 'studio' | 'chalk' = 'studio'
  ) => {
    const isThisRecording = itemRecordingKey === key;
    const isThisProcessing = itemProcessingKey === key;
    const itemResult = itemEvals[key];

    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: idx * 0.06 }}
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
          itemResult
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

            {/* 🎙️ Mic Practice Button */}
            {!itemResult ? (
              <button
                type="button"
                onClick={() => {
                  if (isThisRecording) {
                    setItemRecordingKey(null);
                  } else {
                    startItemRecognition(key, item.english);
                  }
                }}
                disabled={isThisProcessing || (itemRecordingKey !== null && !isThisRecording)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isThisProcessing
                    ? 'bg-brand-surface border-brand-accent text-brand-cyan animate-pulse'
                    : isThisRecording
                    ? 'bg-brand-error border-brand-error text-white shadow-[0_0_18px_rgba(255,82,82,0.6)] scale-105 animate-pulse'
                    : 'bg-brand-accent hover:bg-brand-accent/90 text-white border-brand-accent hover:scale-105'
                }`}
                title="Grabar tu voz para practicar esta frase"
              >
                {isThisProcessing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : isThisRecording ? (
                  <Square size={13} className="fill-white" />
                ) : (
                  <Mic size={13} />
                )}
                <span>{isThisProcessing ? 'Evaluando...' : isThisRecording ? 'Detener' : 'Practicar 🎤'}</span>
              </button>
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
          {/* Segmented View Switcher: Pizarra Interactiva vs Flujo Didáctico */}
          <div className="flex items-center p-1 rounded-2xl bg-brand-surface/90 border border-brand-border text-xs gap-1 shadow-inner">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all font-semibold ${
                viewMode === 'board'
                  ? 'bg-gradient-to-r from-brand-accent to-indigo-600 text-white shadow-md shadow-brand-accent/25'
                  : 'text-brand-text-muted hover:text-white'
              }`}
              title="Pizarra Interactiva"
            >
              <BookOpen size={13} className={viewMode === 'board' ? 'text-brand-cyan animate-pulse' : ''} />
              <span>Pizarra Interactiva</span>
            </button>

            <button
              onClick={() => {
                stopCurrentAudio();
                setViewMode('timeline');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all font-semibold ${
                viewMode === 'timeline'
                  ? 'bg-gradient-to-r from-brand-cyan to-blue-600 text-white shadow-md shadow-brand-cyan/25'
                  : 'text-brand-text-muted hover:text-white'
              }`}
              title="Flujo Didáctico"
            >
              <Sparkles size={13} className={viewMode === 'timeline' ? 'text-yellow-300 animate-pulse' : ''} />
              <span>Flujo Didáctico</span>
            </button>

            <button
              onClick={() => {
                stopCurrentAudio();
                setViewMode('reading');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all font-semibold ${
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all font-semibold ${
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
            <TutorAvatar state={tutorState} />
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
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
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
                 🎨 MODE 1: PIZARRA INTERACTIVA (STUDIO BOARD)
                 ═══════════════════════════════════════════════════════════════════════ */
              <div className={`${getBoardThemeClass(phase.board_theme)} p-5 sm:p-7 space-y-5 relative`}>
                
                {/* Board Header Bar */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/10 z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 text-brand-cyan">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-cyan block">Pizarra de Estudio</span>
                      <h2 className="text-base sm:text-lg font-bold font-chalk text-white">
                        {renderTextContent(phase.phase_name)}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => speakText(typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text || '')}
                      className="text-xs px-3 py-1.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-brand-cyan hover:text-white flex items-center gap-1.5 transition-all font-semibold"
                      title="Escuchar la explicación del tutor en voz alta"
                    >
                      <Volume2 size={13} className="text-brand-cyan" />
                      <span>Escuchar Todo</span>
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

                    <button
                      type="button"
                      onClick={() => setShowPhoneticModal(true)}
                      className="text-xs px-2.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 hover:text-white flex items-center gap-1.5 transition-all font-semibold"
                      title="Consultar los 44 fonemas con audio"
                    >
                      <Mic size={12} className="text-emerald-400" />
                      <span>Fonemas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTranscript(!showTranscript)}
                      className="text-xs px-2.5 py-1.5 rounded-xl glass hover:bg-brand-surface border border-brand-border text-brand-text-muted hover:text-brand-cyan transition-all flex items-center gap-1.5"
                      title={showTranscript ? 'Ocultar transcripción' : 'Ver transcripción en texto'}
                    >
                      {showTranscript ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>Transcripción</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Transcript */}
                {showTranscript && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-xs text-brand-text-secondary bg-black/40 p-3.5 rounded-2xl border border-white/10 font-mono leading-relaxed z-10"
                  >
                    <strong className="text-brand-cyan block mb-1">Transcripción del Tutor:</strong>
                    &quot;{renderTextContent(phase.tutor_says)}&quot;
                  </motion.div>
                )}

                {/* Set of target audio phrases to prevent duplicate audio buttons on the whiteboard */}
                {(() => {
                  const targetAudioPhrases = new Set(targetAudioItems.map((it: any) => it.english.toLowerCase().trim()));
                  const { cleanBoardLines, exercises, instructionHeader } = parseExercisesAndBoardLines(
                    phase.board_content,
                    phase.student_task,
                    phase.phase_number || currentPhaseIdx + 1,
                    phase.interaction_type
                  );

                  return (
                    <div className="flex flex-col gap-5 z-10 w-full">
                      {/* 🎬 Live Storyboard Progressive Controller */}
                      <LiveStoryboardController
                        steps={phaseStoryboardSteps}
                        activeStepIdx={activeStepIdx}
                        revealedCount={revealedStepCount}
                        audioProgress={audioProgress}
                        isPlaying={tutorState === 'speaking'}
                        isFullBoardRevealed={isFullBoardRevealed}
                        onStepClick={handleStepClick}
                        onTogglePlay={handleTogglePlay}
                        onReplayStep={handleReplayCurrentStep}
                        onRevealAll={handleRevealAll}
                        onResetReveal={handleResetReveal}
                      />

                      {/* 🌟 ROW 1: Visual Illustration (5 cols) + Whiteboard Concepts & Rules (7 cols) */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        
                        {/* Visual Illustration Card */}
                        <AnimatePresence>
                          {(isFullBoardRevealed || isStepRevealed('illustration')) && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.92, y: 15 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.92 }}
                              transition={{ duration: 0.45, ease: 'easeOut' }}
                              className={`lg:col-span-5 flex flex-col rounded-2xl transition-all duration-300 ${
                                isStepActive('illustration')
                                  ? 'ring-2 ring-brand-cyan ring-offset-2 ring-offset-black/70 shadow-[0_0_30px_rgba(0,212,255,0.35)]'
                                  : ''
                              }`}
                            >
                              <div className="rounded-2xl border border-white/10 overflow-hidden relative shadow-lg bg-black/35 flex flex-col items-center justify-center p-2.5 group transition-all h-full">
                                {imageLoading && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-brand-text-muted">
                                    <Loader2 className="w-8 h-8 text-brand-accent animate-spin mb-2" />
                                    <span className="text-xs font-medium font-chalk">Cargando pizarra...</span>
                                  </div>
                                )}

                                <div
                                  onClick={() => setIsImageZoomed(true)}
                                  className="relative w-full flex-1 overflow-hidden rounded-xl cursor-pointer group/img flex items-center justify-center bg-black/20 border border-white/5 min-h-[180px] sm:min-h-[220px]"
                                >
                                  <img
                                    src={imageUrl}
                                    alt="Ilustración didáctica principal"
                                    onLoad={() => setImageLoading(false)}
                                    onError={() => setImageLoading(false)}
                                    className="w-full max-h-56 sm:max-h-64 object-contain rounded-xl group-hover/img:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                    <span className="px-3.5 py-1.5 rounded-xl bg-brand-accent text-white text-xs font-bold flex items-center gap-1.5 shadow-xl">
                                      <ZoomIn size={14} /> Ampliar Imagen
                                    </span>
                                  </div>
                                </div>

                                <div className="w-full pt-2 px-1.5 flex items-center justify-end text-[11px] font-semibold text-white/50">
                                  <button
                                    type="button"
                                    onClick={() => setIsImageZoomed(true)}
                                    className="hover:text-white transition-colors flex items-center gap-1.5"
                                  >
                                    <Maximize2 size={12} />
                                    <span>Ampliar Imagen</span>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Whiteboard Rules & Karaoke (7 cols) */}
                        <AnimatePresence>
                          {(isFullBoardRevealed || isStepRevealed('concepts')) && (
                            <motion.div
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.4, ease: 'easeOut' }}
                              className={`lg:col-span-7 flex flex-col rounded-2xl transition-all duration-300 ${
                                isStepActive('concepts')
                                  ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black/70 shadow-[0_0_30px_rgba(52,211,153,0.35)]'
                                  : ''
                              }`}
                            >
                              <div className="bg-black/30 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-2.5 backdrop-blur-sm shadow-inner flex-1 flex flex-col justify-center">
                                <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan/80 block pb-1 border-b border-white/5 flex items-center justify-between">
                                  <span>✏️ Conceptos y Reglas de la Fase:</span>
                                  {isStepActive('concepts') && (
                                    <span className="text-[10px] text-emerald-300 font-mono flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                      Enfoque activo
                                    </span>
                                  )}
                                </span>
                                {(() => {
                                  const lines = cleanBoardLines.length > 0
                                    ? cleanBoardLines
                                    : [`📌 ${topicParam}`, typeof phase.tutor_says === 'string' ? phase.tutor_says : 'Revisa los conceptos clave de la lección.'];
                                  return lines.map((line: string, idx: number) => {
                                    const isHeader = line.startsWith('📌') || line.startsWith('🎯') || line.startsWith('#') || line.startsWith('⚡');
                                    const totalLines = lines.length;
                                    const isRevealed = (tutorState !== 'speaking' && audioProgress === 0)
                                      ? true
                                      : (isFullBoardRevealed || tutorState !== 'speaking' || audioProgress >= (5 + (idx / Math.max(totalLines, 1)) * 60) || idx < revealedLineCount);

                                    return (
                                      <motion.div
                                        key={`bl-${idx}`}
                                        animate={{ opacity: isRevealed ? 1 : 0.25 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex items-center justify-between gap-2 py-0.5"
                                      >
                                        <span className={`flex-1 leading-relaxed ${isHeader ? 'font-bold text-white text-base' : 'text-sm sm:text-base text-white/90 font-chalk'}`}>
                                          {line}
                                        </span>
                                      </motion.div>
                                    );
                                  });
                                })()}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* 📊 ROW 1.5: Conditional Visual Pedagogical Diagram (SVG Timeline / Diagram) */}
                      <AnimatePresence>
                        {currentDiagramSvg && (isFullBoardRevealed || isStepRevealed('diagram')) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            className={`w-full rounded-2xl transition-all duration-300 ${
                              isStepActive('diagram')
                                ? 'ring-2 ring-brand-cyan ring-offset-2 ring-offset-black/70 shadow-[0_0_30px_rgba(0,212,255,0.35)]'
                                : ''
                            }`}
                          >
                            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5 backdrop-blur-sm shadow-xl space-y-3">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-1.5">
                                  <Sparkles size={14} className="text-brand-cyan" />
                                  <span>Gráfico Didáctico & Línea Conceptual</span>
                                </span>
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/25 text-brand-cyan font-mono font-semibold">
                                  Esquema Vectorial Didáctico
                                </span>
                              </div>
                              <div
                                className="w-full flex items-center justify-center overflow-hidden rounded-xl [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[380px]"
                                dangerouslySetInnerHTML={{ __html: currentDiagramSvg }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ⚡ ROW 2: Structured Visual Grammar Formula Card */}
                      <AnimatePresence>
                        {(phase.grammar_structure || phase.key_structure) && (isFullBoardRevealed || isStepRevealed('grammar')) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            className={`w-full rounded-2xl transition-all duration-300 ${
                              isStepActive('grammar')
                                ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-black/70 shadow-[0_0_30px_rgba(192,132,252,0.35)]'
                                : ''
                            }`}
                          >
                            <GrammarStructureCard
                              structure={phase.grammar_structure || phase.key_structure}
                              onPlayAudio={handlePlayIndividualAudio}
                              theme={phase.board_theme?.includes('chalkboard') ? 'chalk' : 'studio'}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* 🗣️ ROW 2.5: Micro-Phonetics Contrast Card (Phonetic Focus) */}
                      {Boolean(
                        phase.phonetic_focus ||
                        (phase.phase_name?.toLowerCase().includes('fonét') && phase.phase_number === 4) ||
                        (lesson?.topic?.toLowerCase().includes('fonét') && phase.phase_number === 4)
                      ) && (
                        <AnimatePresence>
                          {(isFullBoardRevealed || isStepRevealed('phonetics')) && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.45, ease: 'easeOut' }}
                              className={`w-full rounded-2xl transition-all duration-300 ${
                                isStepActive('phonetics')
                                  ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-black/70 shadow-[0_0_30px_rgba(192,132,252,0.35)]'
                                  : ''
                              }`}
                            >
                              <MicroPhoneticCard
                                phoneticData={phase.phonetic_focus || lesson?.phonetic_focus || {}}
                                onCompletePractice={(sym, ok) => {
                                  api.recordPhoneme(sym, ok, 90).catch(() => {});
                                }}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}

                      {/* 🎯 ROW 3: Interactive Exercises or Challenge Task */}
                      <AnimatePresence>
                        {(isFullBoardRevealed || isStepRevealed('exercise')) && (
                          <motion.div
                            initial={{ opacity: 0, y: 25 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            className={`w-full rounded-2xl transition-all duration-300 ${
                              isStepActive('exercise')
                                ? 'ring-2 ring-brand-gold ring-offset-2 ring-offset-black/70 shadow-[0_0_30px_rgba(251,191,36,0.35)]'
                                : ''
                            }`}
                          >
                            {exercises.length > 0 ? (
                              <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 shadow-lg space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
                                  <div className="flex items-center gap-2">
                                    <HelpCircle size={16} className="text-brand-gold" />
                                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-gold">
                                      {instructionHeader || `Desafío Interactivo (${exercises.length} ${exercises.length === 1 ? 'ejercicio' : 'ejercicios'})`}
                                    </h3>
                                  </div>
                                  {phase.student_task && (
                                    <button
                                      type="button"
                                      onClick={() => handlePlayIndividualAudio(typeof phase.student_task === 'string' ? phase.student_task : '')}
                                      className="px-2.5 py-1 rounded-xl bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30 border border-brand-cyan/30 text-xs flex items-center gap-1.5 transition-all font-semibold"
                                    >
                                      <Volume2 size={13} className="text-brand-cyan animate-pulse" />
                                      <span>Escuchar Instrucción</span>
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                  {exercises.map((ex) => {
                                    const exKey = `exercise-item-${ex.id}`;
                                    const isThisRecording = itemRecordingKey === exKey;
                                    const isThisProcessing = itemProcessingKey === exKey;
                                    const exResult = itemEvals[exKey];
                                    const currentVal = exerciseInputs[ex.id] || '';
                                    const parts = ex.cleanSentence.split(/(_{2,})/);

                                    return (
                                      <motion.div
                                        key={exKey}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden space-y-3 flex flex-col justify-between ${
                                          exResult
                                            ? exResult.is_correct
                                              ? 'bg-brand-success/10 border-brand-success/40 shadow-[0_0_20px_rgba(0,230,118,0.12)]'
                                              : 'bg-brand-error/10 border-brand-error/40 shadow-[0_0_20px_rgba(255,82,82,0.12)]'
                                            : isThisRecording
                                            ? 'bg-brand-error/15 border-brand-error shadow-[0_0_25px_rgba(255,82,82,0.35)] scale-[1.01]'
                                            : 'bg-black/50 border-white/10 hover:border-brand-accent/40 shadow-md'
                                        }`}
                                      >
                                        <div className="space-y-2.5">
                                          {/* Header row with individual audio playback */}
                                          <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                                                Ejercicio #{ex.index}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handlePlayIndividualAudio(ex.cleanSentence)}
                                                className="px-2 py-0.5 rounded-lg bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan text-[11px] font-semibold flex items-center gap-1 border border-brand-cyan/30 transition-all hover:scale-105"
                                                title="Escuchar pronunciación de este ejercicio"
                                              >
                                                <Volume2 size={11} className="text-brand-cyan" />
                                                <span>Escuchar</span>
                                              </button>
                                            </div>
                                            {exResult && (
                                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                                                exResult.is_correct ? 'text-brand-success bg-brand-success/20 border border-brand-success/30' : 'text-brand-error bg-brand-error/20 border border-brand-error/30'
                                              }`}>
                                                {exResult.is_correct ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                {exResult.is_correct ? '¡Correcto!' : 'Reintentar'} ({exResult.overall_score}%)
                                              </span>
                                            )}
                                          </div>

                                          {/* Question Sentence with Stylized Blank */}
                                          <div className="text-sm sm:text-base font-bold text-white leading-snug flex flex-wrap items-center gap-1.5 font-outfit">
                                            {parts.map((p, pIdx) => {
                                              if (/^_{2,}$/.test(p)) {
                                                return (
                                                  <span
                                                    key={pIdx}
                                                    className="inline-flex items-center justify-center min-w-[80px] px-2.5 py-0.5 rounded-lg bg-brand-accent/20 border border-brand-accent/50 text-brand-cyan font-mono text-xs shadow-inner"
                                                  >
                                                    {currentVal || '________'}
                                                  </span>
                                                );
                                              }
                                              return <span key={pIdx}>{p}</span>;
                                            })}
                                          </div>

                                          {/* Clickable Option Buttons with Audio Preview */}
                                          {ex.options && ex.options.length > 0 && !exResult && (
                                            <div className="flex items-center gap-2 flex-wrap pt-1">
                                              <span className="text-[10px] font-semibold text-white/50">Opciones:</span>
                                              {ex.options.map((opt, optIdx) => (
                                                <div key={optIdx} className="inline-flex items-center rounded-xl bg-white/10 border border-white/20 overflow-hidden hover:border-brand-accent transition-all shadow-sm">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setExerciseInputs(prev => ({ ...prev, [ex.id]: opt }));
                                                      handleExerciseSubmit(exKey, ex.cleanSentence, opt, ex.options);
                                                    }}
                                                    disabled={isThisProcessing || isThisRecording}
                                                    className="px-3 py-1 text-xs font-bold text-brand-cyan hover:bg-brand-accent hover:text-white transition-all disabled:opacity-50"
                                                    title={`Seleccionar "${opt}" como respuesta`}
                                                  >
                                                    {opt}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handlePlayIndividualAudio(opt);
                                                    }}
                                                    className="px-2 py-1 text-white/60 hover:text-brand-cyan hover:bg-white/10 border-l border-white/10 transition-colors"
                                                    title={`Escuchar pronunciación de "${opt}"`}
                                                  >
                                                    <Volume2 size={11} />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        {/* Bottom Actions: Mic + Direct Input or Feedback */}
                                        {!exResult ? (
                                          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (isThisRecording) {
                                                  setItemRecordingKey(null);
                                                } else {
                                                  startExerciseRecognition(exKey, ex.cleanSentence, ex.options);
                                                }
                                              }}
                                              disabled={isThisProcessing || (itemRecordingKey !== null && !isThisRecording)}
                                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-md flex-shrink-0 ${
                                                isThisProcessing
                                                  ? 'bg-brand-surface border-brand-accent text-brand-cyan animate-pulse'
                                                  : isThisRecording
                                                  ? 'bg-brand-error border-brand-error text-white shadow-[0_0_18px_rgba(255,82,82,0.6)] animate-pulse'
                                                  : 'bg-brand-accent hover:bg-brand-accent/90 text-white border-brand-accent hover:scale-105'
                                              }`}
                                              title="Pronunciar tu respuesta con el micrófono"
                                            >
                                              {isThisProcessing ? (
                                                <Loader2 size={12} className="animate-spin" />
                                              ) : isThisRecording ? (
                                                <Square size={12} className="fill-white" />
                                              ) : (
                                                <Mic size={12} />
                                              )}
                                              <span>{isThisProcessing ? 'Evaluando...' : isThisRecording ? 'Detener' : 'Hablar 🎤'}</span>
                                            </button>

                                            <input
                                              type="text"
                                              value={currentVal}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setExerciseInputs(prev => ({ ...prev, [ex.id]: val }));
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && currentVal.trim()) {
                                                  handleExerciseSubmit(exKey, ex.cleanSentence, currentVal, ex.options);
                                                }
                                              }}
                                              placeholder="Escribe tu respuesta..."
                                              disabled={isThisProcessing}
                                              className="flex-1 bg-black/60 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-brand-accent transition-colors disabled:opacity-50 min-w-0"
                                            />

                                            <button
                                              type="button"
                                              onClick={() => handleExerciseSubmit(exKey, ex.cleanSentence, currentVal, ex.options)}
                                              disabled={!currentVal.trim() || isThisProcessing}
                                              className="px-3 py-1.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 shadow-md flex-shrink-0"
                                            >
                                              <Send size={11} />
                                              <span>Enviar</span>
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                                            <div className="text-xs text-white/90 leading-relaxed flex-1 min-w-0">
                                              <span className="text-yellow-300 font-bold block mb-0.5">💡 Feedback del Tutor:</span>
                                              <p className="text-[11px]">{exResult.feedback}</p>
                                              {exResult.corrected_answer && (
                                                <p className="mt-1 font-mono text-emerald-300 text-[11px]">
                                                  Respuesta: {exResult.corrected_answer}
                                                </p>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setItemEvals(prev => {
                                                  const n = { ...prev };
                                                  delete n[exKey];
                                                  return n;
                                                });
                                                setExerciseInputs(prev => ({ ...prev, [ex.id]: '' }));
                                              }}
                                              className="px-2.5 py-1.5 rounded-xl bg-brand-surface hover:bg-brand-border border border-brand-border text-brand-text-muted hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0"
                                              title="Reintentar este ejercicio"
                                            >
                                              <RotateCcw size={11} />
                                              <span>Reintentar</span>
                                            </button>
                                          </div>
                                        )}

                                        {/* Live audio transcript when recording */}
                                        {isThisRecording && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="pt-2 border-t border-brand-error/30 flex items-center gap-2 text-xs text-white bg-black/30 p-2 rounded-xl"
                                          >
                                            <div className="w-2 h-2 rounded-full bg-brand-error animate-ping flex-shrink-0" />
                                            <span className="text-brand-error font-bold text-[11px]">Escuchando:</span>
                                            <span className="font-mono text-[11px] truncate">{itemLiveTranscript || 'Habla ahora en inglés...'}</span>
                                          </motion.div>
                                        )}
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : phase.student_task && (targetAudioItems.length === 0 || ['roleplay', 'qa', 'error_correction', 'writing'].includes(phase.interaction_type || '')) ? (
                              <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 shadow-lg space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-gold flex items-center gap-2">
                                    <HelpCircle size={16} className="text-brand-gold" />
                                    <span>Desafío de la Lección ({phase.interaction_type || 'Ejercicio Interactivo'})</span>
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() => handlePlayIndividualAudio(typeof phase.student_task === 'string' ? phase.student_task : '')}
                                    className="px-2.5 py-1 rounded-xl bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30 border border-brand-cyan/30 text-xs flex items-center gap-1.5 transition-all font-semibold"
                                  >
                                    <Volume2 size={13} className="text-brand-cyan animate-pulse" />
                                    <span>Escuchar Instrucción</span>
                                  </button>
                                </div>

                                <div className="text-sm sm:text-base text-white/95 leading-relaxed font-chalk bg-black/30 p-3.5 rounded-xl border border-white/10">
                                  {renderTextContent(phase.student_task, handlePlayIndividualAudio)}
                                </div>

                                {phase.expected_answer && evaluation && (
                                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/20 text-xs">
                                    <div>
                                      <span className="font-bold text-brand-gold block">Respuesta Esperada:</span>
                                      <div className="text-white font-mono">{renderTextContent(phase.expected_answer, handlePlayIndividualAudio)}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handlePlayIndividualAudio(typeof phase.expected_answer === 'string' ? phase.expected_answer : '')}
                                      className="px-2.5 py-1 rounded-lg bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/40 border border-brand-gold/30 text-xs flex items-center gap-1 flex-shrink-0"
                                    >
                                      <Volume2 size={12} /> Escuchar
                                    </button>
                                  </div>
                                )}

                                {/* Interactive Mic / Input controls */}
                                {!evaluation ? (
                                  <div className="flex items-center gap-2 pt-1">
                                    <MicButton
                                      isRecording={isRecording}
                                      isProcessing={isProcessing}
                                      onStart={() => setIsRecording(true)}
                                      onStop={() => setIsRecording(false)}
                                      onTranscriptReady={(transcript) => setTextInput(transcript)}
                                    />

                                    <div className="flex-1 flex gap-2">
                                      <input
                                        type="text"
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                                        placeholder={
                                          isALevel
                                            ? 'Escribe o di tu respuesta en inglés...'
                                            : 'Type or speak your answer in English...'
                                        }
                                        disabled={isProcessing}
                                        className="flex-1 bg-black/50 border border-white/20 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-accent transition-colors disabled:opacity-50"
                                        autoComplete="off"
                                      />
                                      <button
                                        onClick={handleTextSubmit}
                                        disabled={!textInput.trim() || isProcessing}
                                        className="px-4 bg-brand-accent hover:bg-brand-accent/90 rounded-xl text-white disabled:opacity-40 transition-colors flex items-center justify-center shadow-md font-semibold text-xs gap-1.5"
                                      >
                                        <Send size={13} />
                                        <span className="hidden sm:inline">Enviar</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3.5 rounded-xl border border-white/10 bg-black/50 text-xs space-y-2"
                                  >
                                    <div className="flex justify-between font-bold">
                                      <span>Resultado de Evaluación</span>
                                      <span
                                        className={`px-2.5 py-0.5 rounded-full text-xs ${
                                          evaluation.is_correct
                                            ? 'bg-brand-success/20 text-brand-success border border-brand-success/30'
                                            : 'bg-brand-error/20 text-brand-error border border-brand-error/30'
                                        }`}
                                      >
                                        {evaluation.is_correct ? 'Correcto ✅' : 'Reintentar ❌'}
                                      </span>
                                    </div>
                                    <ScoreDisplay scores={evaluation.scores} feedback={evaluation.feedback} />
                                  </motion.div>
                                )}
                              </div>
                            ) : null}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* 🎙️ ROW 4: Interactive Pronunciation Practice (Expansive 2-Column Grid) */}
                      <AnimatePresence>
                        {targetAudioItems && targetAudioItems.length > 0 && exercises.length === 0 && (isFullBoardRevealed || isStepRevealed('audio_practice')) && (
                          <motion.div
                            initial={{ opacity: 0, y: 25 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            className={`space-y-3 pt-2 rounded-2xl transition-all duration-300 ${
                              isStepActive('audio_practice')
                                ? 'ring-2 ring-pink-400 ring-offset-2 ring-offset-black/70 shadow-[0_0_30px_rgba(244,114,182,0.35)] p-2'
                                : ''
                            }`}
                          >
                            <div className="flex items-center justify-between border-t border-white/10 pt-3">
                              <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-brand-cyan animate-pulse" />
                                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-cyan">
                                  Práctica de Pronunciación Interactiva ({targetAudioItems.length} {targetAudioItems.length === 1 ? 'frase' : 'frases'})
                                </h3>
                              </div>
                              <span className="text-[11px] text-brand-text-muted hidden sm:inline">
                                Haz clic en <strong>Practicar 🎤</strong> para grabar y evaluar tu voz
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                              {targetAudioItems.map((item, idx) => {
                                const itemKey = `board-item-${idx}-${item.english}`;
                                return renderPronunciationCard(
                                  item,
                                  itemKey,
                                  idx,
                                  phase.board_theme?.includes('chalkboard') ? 'chalk' : 'studio'
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}
              </div>
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
                      onClick={() => speakText(typeof phase.tutor_says === 'string' ? phase.tutor_says : phase.tutor_says?.text || '')}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-cyan border border-brand-accent/40 text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:scale-105"
                    >
                      <Volume2 size={14} className="animate-pulse text-brand-cyan" />
                      <span>Escuchar Explicación Completa</span>
                    </button>
                  </div>

                  {/* Concept Grid: Image + Rules */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    <div
                      onClick={() => setIsImageZoomed(true)}
                      className="md:col-span-5 relative group rounded-2xl overflow-hidden cursor-pointer bg-black/30 border border-white/10"
                    >
                      <img
                        src={imageUrl}
                        alt="Ilustración didáctica principal"
                        className="w-full h-48 sm:h-56 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <span className="px-3.5 py-1.5 rounded-xl bg-brand-accent text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
                          <ZoomIn size={14} /> Ampliar Imagen
                        </span>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-3">
                      <div className="text-sm sm:text-base text-white leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/10 font-mono text-emerald-200 shadow-inner whitespace-pre-line">
                        {renderTextContent(phase.board_content) || `📌 ${topicParam}`}
                      </div>
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

            {/* Center slide dots + audio progress bar */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                {lesson?.phases?.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhaseIdx(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      idx === currentPhaseIdx
                        ? 'bg-brand-cyan w-6 shadow-[0_0_8px_rgba(0,212,255,0.6)]'
                        : idx < currentPhaseIdx
                        ? 'bg-brand-accent/60 w-2.5'
                        : 'bg-brand-border w-2.5'
                    }`}
                    title={`Ir a la Fase ${idx + 1}`}
                  />
                ))}
              </div>
              {/* Audio progress bar while tutor speaks */}
              <AnimatePresence>
                {(tutorState === 'speaking' || (audioProgress > 0 && audioProgress < 100)) && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0.8 }}
                    className="w-28 sm:w-40 h-1 bg-brand-border/40 rounded-full overflow-hidden"
                  >
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-accent"
                      animate={{ width: `${audioProgress}%` }}
                      transition={{ duration: 0.3, ease: 'linear' }}
                      style={{ width: `${audioProgress}%` }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
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

              <button
                onClick={handleNextSlide}
                className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white text-xs sm:text-sm font-bold rounded-xl transition-all glow-accent btn-lift flex items-center justify-center gap-1.5"
              >
                <span>
                  {currentPhaseIdx < (lesson?.phases?.length || 1) - 1
                    ? 'Siguiente →'
                    : '📖 Práctica de Lectura'}
                </span>
                <ChevronRight size={16} />
              </button>
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
                src={imageUrl}
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
