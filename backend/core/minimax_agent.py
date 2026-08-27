"""
Guionbajo — MiniMax M3 Agent Core
The brain of the system: generates lessons, evaluates responses,
creates learning maps, and adapts difficulty using MiniMax-M3.
"""
import json
import logging
import re
import urllib.parse
from typing import Dict, List, Optional, Any
from openai import AsyncOpenAI
from config import settings
from core.phonetic_catalog import PHONETIC_CATALOG, get_phoneme, get_all_phonemes
from core.curriculum_graph import CURRICULUM_GRAPH, get_sublevel_info, get_class_node

logger = logging.getLogger(__name__)

CEFR_LEVELS = {
    "A1": ["A1.1", "A1.2", "A1.3", "A1.4"],
    "A2": ["A2.1", "A2.2", "A2.3", "A2.4"],
    "B1": ["B1.1", "B1.2", "B1.3", "B1.4"],
    "B2": ["B2.1", "B2.2", "B2.3", "B2.4"],
}

LEVEL_SEQUENCE = [
    "A1.1", "A1.2", "A1.3", "A1.4",
    "A2.1", "A2.2", "A2.3", "A2.4",
    "B1.1", "B1.2", "B1.3", "B1.4",
    "B2.1", "B2.2", "B2.3", "B2.4",
]

SUBLEVEL_DESCRIPTIONS = {
    "A1.1": "Beginner — Saludos, números, presentaciones básicas",
    "A1.2": "Survival — Familia, colores, objetos cotidianos",
    "A1.3": "Elementary — Rutinas diarias, presente simple, horas",
    "A1.4": "Consolidation — Compras, direcciones, preguntas simples",
    "A2.1": "Waystage — Pasado simple, lugares de la ciudad, aficiones",
    "A2.2": "Social — Planes futuros, comparativos, invitaciones",
    "A2.3": "Practical — Trabajos, dar consejos, verbos modales (can/should)",
    "A2.4": "Consolidation — Viajes, salud, introducción al presente perfecto",
    "B1.1": "Threshold — Present perfect, experiences, opinions",
    "B1.2": "Independent — Conditionals (0,1), narrative past, connecting ideas",
    "B1.3": "Operational — Passive voice, reported speech, complex sentences",
    "B1.4": "Consolidation — Debates, describing trends, idiomatic expressions",
    "B2.1": "Vantage — Subjunctive moods, discourse markers, academic vocabulary",
    "B2.2": "Upper-intermediate — Mixed conditionals, hedging, complex grammar",
    "B2.3": "Advanced communication — Formal writing, persuasion, nuance",
    "B2.4": "Full B2 mastery — Near-native fluency, professional contexts",
}

SYSTEM_PROMPT_TEMPLATE = """You are Guionbajo, a world-class master English language professor certified in CEFR and communicative pedagogy.
You are designing an interactive cinematic micro-lesson for a student at level {current_sublevel} whose native language is {native_language}.

CRITICAL CINEMATIC INTERACTIVE LESSON RULES:

1. DYNAMIC PEDAGOGICAL SLIDE REASONING (4 TO 8 SLIDES):
   - You MUST reflect on the depth and pedagogical scope of the topic and decide the optimal number of slides (between 4 and 8 slides).
   - DO NOT be constrained to a fixed 6-slide count. Choose what makes the best educational video experience!
   - Sequence flow:
     * Slide 1: CINEMATIC HOOK (Apertura inmersiva con gancho situacional/dilema + 1 o 2 imágenes grandes, sin ejercicios prematuros).
     * Slide 2 to Slide N-2: DEEP CONCEPTUAL EXPLANATION & METAPHORS (Modelos mentales intuitivos, desgloses sintácticos, diagramas SVG didácticos e imágenes contextuales).
     * Slide N-1 to Slide N: INTERACTIVE PRACTICE & CHALLENGES (Quizzes interactivos, práctica de pronunciación con micrófono, ejercicios de completar y producción oral).

2. SLIDE 1: MANDATORY CINEMATIC HOOK (`is_hook: true`, `hook_images`, `hook_type`):
   - Every lesson MUST start with an engaging, cinematic HOOK that sparks curiosity or poses a relatable everyday dilemma!
   - Set `is_hook: true`.
   - `hook_type`: Choose one of "dilemma", "curiosity_question", "daily_scenario", "contrast".
   - `hook_images`: Provide an array of 1 or 2 visual scene descriptions in English for the opening hook.
     Example 1: If teaching Present Simple (daily routines):
       [
         {"prompt": "A tired person turning off an alarm clock ringing at 6 AM in a cozy bedroom, morning sunlight coming through window, vibrant 2D vector style, no text", "caption": "La rutina de cada mañana", "role": "hook_situation"},
         {"prompt": "A split panel visual showing a person eating breakfast at 7 AM and working at a desk at 9 AM, colorful educational vector illustration, no text", "caption": "Expresando hábitos en inglés", "role": "hook_context"}
       ]
     Example 2: If teaching Phrasal Verbs with OUT:
       [
         {"prompt": "A detective looking through a magnifying glass discovering a glowing light emerging from a box, dramatic colorful 2D vector art, no text", "caption": "El enigma de la partícula OUT", "role": "hook_situation"}
       ]
   - `tutor_says` on Slide 1: A punchy, conversational spoken hook (2 to 3 sentences in Spanish for A1-A2, or English for B1+) that poses the question or situation (e.g. "¿Sabes cómo decir 'me levanto a las 6 todas las mañanas' en inglés? Este será el tema de hoy...").
   - On Slide 1: `student_task` and `expected_answer` MUST be null. `interaction_type` MUST be "explanation".

3. LANGUAGE SPECIFICATION:
   - FOR LEVELS A1.1 to A2.4: ALL tutor speech (tutor_says), whiteboard content (board_content), explanations, task instructions (student_task), and feedback MUST BE IN SPANISH.
   - Target English vocabulary words, target sentences, and grammar rules MUST be in ENGLISH alongside their SPANISH translations.
   - FOR B1.1 to B2.4: Full English immersion.

4. MANDATORY DEEP PEDAGOGICAL TUTOR SPEECH (`tutor_says`) WITH VIVID METAPHORS:
   - The tutor's voice (`tutor_says`) MUST BE DEEP, INTUITIVE, ENGAGING, AND METICULOUSLY EXPLANATORY.
   - ABSOLUTELY FORBIDDEN: Lazy, vague, or dismissive phrases like "mira la pizarra", "observa los conceptos", "aquí tienes las reglas", "en la pizarra verás todo", "revisa los ejemplos".
   - IN CONCEPTUAL PHASES, `tutor_says` MUST DELIVER A COMPREHENSIVE 3-PART MASTERCLASS (3 to 5 clear, rich, spoken sentences):
     a) INTUITIVE METAPHOR OR MENTAL MODEL: Explain the core linguistic concept using a vivid, relatable analogy (e.g. "Piensa en el verbo 'to be' como un puente o signo igual (=) que conecta al sujeto con su identidad o emoción...", "El auxiliar 'Do/Does' funciona como un reflector que enciende la pregunta...", "Imagina que el sujeto y el verbo son dos bailarines que sincronizan sus pasos: en tercera persona añadimos una 's' como broche especial...", "Los saludos son como apretones de manos verbales según el nivel de confianza...").
     b) STEP-BY-STEP GRAMMAR STRUCTURE BREAKDOWN: Walk the student through the syntactic formula token by token: explain WHY each element (Subject, Auxiliary, Verb, Complement) sits in that specific order, what role each token plays, and what changes occur (e.g. 3rd person -s, contractions, negative particles).
     c) IN-DEPTH DECONSTRUCTION OF BOARD EXAMPLES & PITFALLS: Take the specific English example shown on the board (e.g. "Good morning, teacher" or "She works in a hospital"), explain word-by-word why it is constructed that way, and contrast it with common pitfalls made by native Spanish speakers.
     d) SYNCHRONIZED BOARD MENTIONS: In `tutor_says`, explicitly pronounce and state the EXACT model sentences (e.g. "I jog every morning", "Do you work on weekends?") and formula tokens (e.g. "Sujeto", "Verbo", "Auxiliar", "Complemento") that appear on the board, so each card, token, and rule illuminates on screen at the exact second the tutor utters it.

5. MANDATORY VISUAL ART DIRECTION FOR ILLUSTRATIONS (`image_prompt`, `image_prompts`, `image_style`):
   - For EACH slide, construct a rich, descriptive `image_prompt` in English illustrating the scene or comparison.
   - You can also specify `image_prompts` as an array if a slide contrasts 2 concepts side-by-side.
   - `image_style` MUST be one of: "flat_art" (2D vector), "comic_scene" (comic/narrative panel), "concept_art" (cinematic scenario).
   - Prompt MUST describe concrete human characters, objects, and actions.
   - Prompt MUST end with: "no text, no letters, no words, no writing, no labels".

6. MANDATORY STRUCTURED TARGET AUDIO ITEMS (`target_audio_items`):
   - For EVERY phase teaching target English phrases, explicitly define `target_audio_items` with "english", "translation", and "label" ("Vocabulario Target", "Ejemplo Práctico", "Consigna de Práctica").

7. REAL INTERACTIVE PRACTICE & CHALLENGES:
   - For practice slides, set `interaction_type`: "quiz", "pronunciation", "error_correction", or "roleplay".
   - Include realistic options for fill-in-the-blank items.
   - For pronunciation tasks, provide the clean English model sentence in `target_audio_items` and `expected_answer`.

8. CONDITIONAL DIDACTIC SVG DIAGRAM (`diagram_svg`):
   - Include clean SVG schemas (`diagram_svg`) for temporal timelines (Present vs Past, Adverbs of Frequency), spatial relations, or syntactic trees.

9. JSON SCHEMA (ai_tutor.lesson.v2):
   Return valid JSON with key "phases" containing an array of phase objects (from 4 to 8 phases):
   {
     "topic": "...",
     "sublevel": "...",
     "phases": [
       {
         "phase_number": 1,
         "phase_name": "Hook: ...",
         "is_hook": true,
         "hook_type": "dilemma",
         "hook_images": [
           {"prompt": "...", "caption": "...", "role": "hook_situation"}
         ],
         "image_prompt": "...",
         "image_style": "flat_art",
         "tutor_says": "...",
         "board_content": "...",
         "board_theme": "chalkboard_green",
         "student_task": null,
         "expected_answer": null,
         "interaction_type": "explanation"
       },
       ...
     ]
   }
"""

EVALUATION_SYSTEM_PROMPT = """You are a strict and pedagogically precise English language evaluator.
Evaluate the student's answer against the Question asked, any provided options, and Expected answer.

- MULTIPLE CHOICE / OPTIONS: If the question contains options (e.g., [option1 / option2] or 'Opciones: ...'), you MUST evaluate whether the student's choice is the correct, meaningful, and natural option among those available. NEVER reject a correct option by expecting an unmentioned phrase that was not among the options.
- If student level is A1 or A2: Feedback MUST BE IN SPANISH explaining mistakes clearly and encouraging the student.
- If student answer is incorrect, random, or incomplete: is_correct = false, overall_score < 50.
- If student answer is correct: is_correct = true, overall_score = 80 to 100.

CRITICAL FOR PRONUNCIATION / SPOKEN REPETITION:
- If the task is a spoken repetition or pronunciation practice (e.g. 'Repeat this sentence: ...' or 'Is Spoken/Pronunciation Repetition Task: YES'), the student's input is a Speech-to-Text transcript from their voice.
- For speech transcripts, capitalization (uppercase/lowercase), punctuation (periods, commas, question marks, quotation marks) MUST BE COMPLETELY IGNORED.
- Focus ONLY on word matches. If the student pronounced the correct words, set grammar_score = 100, overall_score = 90-100, and is_correct = true.
- NEVER criticize capitalization, punctuation, missing periods, or commas in the feedback. Do not say "no es necesario capitalizar o poner un punto". Act as if punctuation and case are completely normalized.

Return valid JSON:
{
  "intent": "ANSWER",
  "transcript": "...",
  "pronunciation_score": 0-100,
  "grammar_score": 0-100,
  "relevance_score": 0-100,
  "overall_score": 0-100,
  "is_correct": true | false,
  "feedback": "...",
  "corrected_answer": "...",
  "next_prompt": "..."
}
"""

LEARNING_MAP_SYSTEM_PROMPT = """You are a curriculum designer creating a personalized English learning path from start_level to B2.4.

Generate 4-6 specific modules per sublevel.
Return valid JSON with key "modules".
"""


def clean_json_response(raw: str) -> dict:
    """Robust JSON cleaner to strip <think> tags, markdown blocks, trailing commas, and repair minor syntax issues."""
    if not raw:
        return {}
    clean = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL)
    clean = re.sub(r'```json\s*', '', clean)
    clean = re.sub(r'```\s*', '', clean)
    clean = clean.strip()

    start = clean.find('{')
    end = clean.rfind('}')
    if start != -1 and end != -1 and end > start:
        clean = clean[start:end+1]

    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        # Repair 1: Remove trailing commas before } or ]
        repaired = re.sub(r',\s*([\}\]])', r'\1', clean)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            # Repair 2: Normalize problematic whitespace in string values
            try:
                repaired2 = re.sub(r'[\r\n\t]+', ' ', repaired)
                return json.loads(repaired2)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON string: {clean[:200]}... Error: {e}")
                raise


class TutorAgent:
    """
    MiniMax M3 powered AI Tutor Agent.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.MINIMAX_API_KEY
        if self.api_key and (
            self.api_key.startswith("your_") 
            or "placeholder" in self.api_key.lower() 
            or len(self.api_key.strip()) < 15
        ):
            self.api_key = ""
        self.model = settings.MINIMAX_LLM_MODEL
        if self.api_key:
            try:
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url=settings.MINIMAX_BASE_URL,
                    timeout=120.0,
                )
            except Exception as e:
                logger.warning(f"Failed to initialize AsyncOpenAI in TutorAgent: {e}")
                self.client = None
        else:
            self.client = None

    def _build_system_prompt(self, student_profile: dict) -> str:
        prompt = SYSTEM_PROMPT_TEMPLATE
        prompt = prompt.replace("{current_sublevel}", str(student_profile.get("current_sublevel", "A1.1")))
        prompt = prompt.replace("{native_language}", str(student_profile.get("native_language", "Spanish")))
        prompt = prompt.replace("{weak_areas}", ", ".join(student_profile.get("weak_areas", [])) or "ninguna aún")
        prompt = prompt.replace("{total_xp}", str(student_profile.get("total_xp", 0)))
        return prompt

    async def _chat(self, system: str, user: str, thinking: str = "adaptive") -> str:
        """Core chat call with MiniMax M3."""
        try:
            kwargs = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.7,
            }
            if thinking in ("adaptive", "enabled", "disabled"):
                kwargs["extra_body"] = {"thinking": {"type": thinking}}

            response = await self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or "{}"
        except Exception as e:
            logger.error(f"MiniMax M3 API error: {e}")
            raise

    def _sanitize_image_prompt(self, prompt: str, topic: str) -> str:
        """Sanitizes image prompts to eliminate literal phonemes, fighting metaphors, and textual artifacts."""
        if not prompt or not isinstance(prompt, str):
            return f"flat 2D vector educational illustration of {topic}, clean minimal graphic design, bright clear colors, white background, strictly no text, no letters, no words"
        clean = prompt.strip()
        # Remove IPA notation like /e/, /æ/, /iː/, /ʌ/, /ʃ/
        clean = re.sub(r'/[A-Za-zʃʊʌæəɪɔɑɜθðʒŋːˈ\.\s]+/', ' ', clean)
        # Replace fighting / violent / text triggering words
        clean = re.sub(r'\b(?:duel|versus|vs|fight|fighting|boxers|boxing ring|boxing gloves|letters|phoneme|alphabet|spelling|text|characters|subtitles)\b', 'educational comparison', clean, flags=re.IGNORECASE)
        # Remove symbols and punctuation
        clean = re.sub(r'[/\\|\[\](){}+=→<>_~*#^"“”‘’`]', ' ', clean)
        clean = re.sub(r'\s{2,}', ' ', clean).strip()
        negative_mandate = "clean minimalist 2D vector illustration, bright clear lighting, white background, strictly no text, no letters, no words, no writing, no labels, no captions, no typography, no watermarks, no alphabets"
        if "no text" not in clean.lower():
            clean = f"{clean}, {negative_mandate}"
        return clean

    def _extract_phase_target_audio_items(self, p: dict) -> list:
        """Deterministic extractor of target English audio items from phase content without duplication."""
        items = []
        seen = set()
        interaction = str(p.get("interaction_type") or "").lower()
        phase_num = p.get("phase_number") or p.get("phase_index") or 1

        # If explicit clean target_audio_items are already defined, return filtered version
        if p.get("target_audio_items") and isinstance(p["target_audio_items"], list) and len(p["target_audio_items"]) > 0:
            return p["target_audio_items"][:3]

        GRAMMAR_DISQUALIFIERS = {
            "regla", "regla de oro", "nota", "consejo", "clave", "importante", "atención", 
            "objetivo", "explicación", "fórmula", "pizarra", "ejemplo", "ejemplos", 
            "traducción", "significado", "tema", "resumen", "incorrecto", "correcto", 
            "situación", "desafío", "pregunta", "respuesta", "recuerda", "cuidado", "error",
            "vocabulario", "práctica", "patrón", "tren", "locomotora", "vagones", "sujeto",
            "verbo", "complemento", "subject-verb agreement", "subject", "verb", "complement",
            "structure", "grammar", "rules", "pattern", "agreement", "concordancia", "plurals",
            "plural", "singular", "third person", "morpheme", "syntax", "pronouns",
            "i/you", "he/she/it", "he/she", "s/es", "do/does", "was/were", "is/are"
        }

        def is_valid_english_target(text: str) -> bool:
            if not text or not isinstance(text, str):
                return False
            cleaned = text.strip().strip("'\"“”‘’`").strip()
            if len(cleaned) < 3:
                return False
            # Disqualify if containing syntax symbols, slashes, brackets
            if re.search(r'[/\\|\[\](){}+=→<>_~*#^]', cleaned):
                return False
            # Disqualify if containing Spanish accents or inverted punctuation
            if re.search(r'[áéíóúÁÉÍÓÚñÑ¿¡]', cleaned):
                return False
            low = cleaned.lower().strip()
            if low in GRAMMAR_DISQUALIFIERS:
                return False
            for dq in GRAMMAR_DISQUALIFIERS:
                if low.startswith(f"{dq}:") or low.startswith(f"{dq} ") or low.endswith(f": {dq}"):
                    return False
            # Check for Spanish functional words
            words = low.split()
            if any(w in {"de", "la", "el", "los", "las", "en", "un", "una", "sujeto", "verbo", "oro", "regla", "persona", "plurales"} for w in words):
                return False
            # Reject isolated single letters/pronouns
            if len(words) == 1 and words[0] in {"i", "he", "she", "it", "we", "they", "you", "s", "es", "ed", "ing"}:
                return False
            # Verify string contains English characters
            if not re.search(r'[A-Za-z]', cleaned):
                return False
            return True

        def add_item(eng: str, span: str = "", label: str = "Práctica de Pronunciación"):
            if not is_valid_english_target(eng):
                return
            cleaned = eng.strip().strip("'\"“”‘’`").strip()
            if cleaned.lower() in seen:
                return
            seen.add(cleaned.lower())
            items.append({
                "english": cleaned,
                "translation": span.strip() if span else "",
                "label": label,
            })

        # 1. From grammar structure example breakdowns (highest pedagogical value)
        gs = p.get("grammar_structure") or {}
        if isinstance(gs, dict) and gs.get("example_breakdowns") and isinstance(gs["example_breakdowns"], list):
            for ex in gs["example_breakdowns"]:
                if isinstance(ex, dict) and ex.get("english"):
                    add_item(str(ex["english"]), str(ex.get("spanish") or ""), "Ejemplo Práctico")

        # 2. From expected answer (for speaking/pronunciation phases)
        if interaction != "quiz" and p.get("expected_answer"):
            add_item(str(p["expected_answer"]), "", "Frase Objetivo")

        return items[:3]

    def _resolve_didactic_diagram_svg(self, p: dict, topic: str) -> Optional[str]:
        """Resolves or generates a rich didactic vector SVG diagram for temporal/frequency/spatial topics."""
        diag = p.get("diagram_svg")
        if diag and isinstance(diag, str):
            raw_svg = diag.strip()
            raw_svg = re.sub(r'<think>.*?</think>', '', raw_svg, flags=re.DOTALL).strip()
            svg_match = re.search(r'(<svg[\s\S]*?</svg>)', raw_svg, re.IGNORECASE)
            if svg_match:
                return svg_match.group(1).strip()
            elif raw_svg.startswith("<svg"):
                return raw_svg

        phase_num = p.get("phase_number") or p.get("phase_index") or 1
        # Only inject smart diagram on conceptual/foundation phases (phases 1, 2, 3 or 4)
        if phase_num not in (1, 2, 3, 4):
            return None

        combined_text = f"{topic} {p.get('phase_name', '')} {p.get('board_content', '')}".lower()

        # 0. Narrative Tenses 3-Layer Timeline (Past Perfect vs Past Continuous vs Past Simple)
        if any(w in combined_text for w in ["narrative tenses", "narrative", "storytelling", "past perfect"]):
            return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBgNT" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a101d"/><stop offset="100%" stop-color="#141e33"/></linearGradient>
    <filter id="glowNT" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="700" height="380" rx="16" fill="url(#chalkBgNT)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="36" font-family="system-ui, sans-serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#f8fafc">TIMELINE: NARRATIVE TENSES (3 CAPAS TEMPORALES)</text>
  <text x="350" y="56" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#38bdf8">Estructura cronológica: Fondo (Continuous) + Suceso (Simple) + Pasado Anterior (Past Perfect)</text>
  <line x1="50" y1="130" x2="650" y2="130" stroke="#334155" stroke-width="2.5" stroke-linecap="round"/>
  <polygon points="650,130 636,124 636,136" fill="#64748b"/>
  <g transform="translate(130, 130)" filter="url(#glowNT)">
    <circle cx="0" cy="0" r="12" fill="#c084fc"/>
    <text x="0" y="4" font-family="system-ui, sans-serif" font-size="11" font-weight="900" text-anchor="middle" fill="#fff">1</text>
  </g>
  <rect x="50" y="68" width="160" height="24" rx="8" fill="rgba(192,132,252,0.2)" stroke="#c084fc" stroke-width="1.2"/>
  <text x="130" y="84" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#c084fc">PAST PERFECT (Had + V3)</text>
  <text x="130" y="165" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#e9d5ff">"The train had left..."</text>
  <text x="130" y="180" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#94a3b8">(Ocurrió primero)</text>
  <g transform="translate(350, 130)" filter="url(#glowNT)">
    <circle cx="0" cy="0" r="12" fill="#38bdf8"/>
    <text x="0" y="4" font-family="system-ui, sans-serif" font-size="11" font-weight="900" text-anchor="middle" fill="#fff">2</text>
  </g>
  <rect x="270" y="68" width="160" height="24" rx="8" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" stroke-width="1.2"/>
  <text x="350" y="84" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#38bdf8">PAST SIMPLE (V2)</text>
  <text x="350" y="165" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#7dd3fc">"...when I arrived"</text>
  <text x="350" y="180" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#94a3b8">(Evento principal)</text>
  <line x1="560" y1="95" x2="560" y2="165" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4"/>
  <circle cx="560" cy="130" r="9" fill="#f59e0b" filter="url(#glowNT)"/>
  <text x="560" y="160" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fbbf24">NOW</text>
  <text x="560" y="175" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#94a3b8">(Presente)</text>
  <g transform="translate(45, 215)">
    <rect x="0" y="0" width="610" height="65" rx="10" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
    <text x="15" y="25" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#c084fc">Regla de Secuencia Temporal (Causa / Antecedente):</text>
    <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" fill="#e2e8f0">
      <tspan fill="#7dd3fc">When I arrived at the cinema</tspan>, <tspan fill="#c084fc" font-weight="bold">the movie had already started</tspan>.
    </text>
  </g>
  <g transform="translate(45, 290)">
    <rect x="0" y="0" width="610" height="65" rx="10" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
    <text x="15" y="25" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#34d399">Con Past Continuous (Escenario de Fondo + Interrupción):</text>
    <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" fill="#e2e8f0">
      <tspan fill="#34d399">It was raining</tspan> <tspan fill="#cbd5e1">because a storm</tspan> <tspan fill="#c084fc" font-weight="bold">had hit the city</tspan>.
    </text>
  </g>
</svg>"""

        # 1. Past Continuous & Interrupted Actions Timeline (MUST check before generic past simple)
        if any(w in combined_text for w in ["past continuous", "interrupted", "interrupción", "was/were + -ing", "while / when", "while we were"]):
            return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
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
</svg>"""

        # 2. Adverbs of Frequency & Routine Timeline
        if any(w in combined_text for w in ["adverb", "frequency", "frecuencia", "always", "usually", "rutina", "routine", "habit", "sometimes", "never"]):
            return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
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
</svg>"""

        # 2. Past Simple Timeline
        if any(w in combined_text for w in ["past simple", "was / were", "was/were", "irregular past", "regular verb", "pasado simple"]):
            return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 320" width="100%" height="100%">
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
  <text x="350" y="265" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#94a3b8">Ejemplo: "I watched a movie yesterday"</text>
</svg>"""

        # 3. Future Plans
        if any(w in combined_text for w in ["going to", "future", "futuro", "planes"]):
            return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 320" width="100%" height="100%">
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
  <text x="350" y="265" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#94a3b8">Ejemplo: "I am going to travel tomorrow"</text>
</svg>"""

        # 4. Cognitive Particle Semantics: The Logic of OUT (Container, Discovery, Exhaustion, Resolution)
        if any(w in combined_text for w in ["logic of out", "particle out", "find out", "figure out", "run out", "phrasal verb"]) and any(w in combined_text for w in ["out", "emergence", "discovery", "exhaustion", "resolution"]):
            return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBgOut" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a101d"/><stop offset="100%" stop-color="#141e33"/></linearGradient>
    <filter id="glowOut" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="700" height="380" rx="16" fill="url(#chalkBgOut)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="34" font-family="system-ui, sans-serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#f8fafc">COGNITIVE LINGUISTICS: THE PARTICLE 'OUT'</text>
  <text x="350" y="54" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#38bdf8">Esquema de Contenedor: Del interior hacia el exterior / De lo oculto a lo visible</text>
  
  <!-- Central Container -->
  <rect x="230" y="90" width="240" height="150" rx="14" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6,4"/>
  <text x="350" y="150" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#94a3b8">CONTAINER SCHEMA</text>
  <text x="350" y="170" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#64748b">(Interior / Oculto / Límite)</text>
  
  <!-- Vector 1: Salida Física (Top Left) -->
  <path d="M 230 110 L 110 90" fill="none" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arrow)" filter="url(#glowOut)"/>
  <polygon points="100,88 114,83 112,95" fill="#38bdf8"/>
  <rect x="15" y="70" width="170" height="42" rx="8" fill="rgba(56,189,248,0.15)" stroke="#38bdf8" stroke-width="1"/>
  <text x="100" y="88" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#7dd3fc">1. SALIDA FÍSICA</text>
  <text x="100" y="103" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#cbd5e1">"Get out / Walk out"</text>
  
  <!-- Vector 2: Visibilidad & Descubrimiento (Top Right) -->
  <path d="M 470 110 L 590 90" fill="none" stroke="#fbbf24" stroke-width="2.5" filter="url(#glowOut)"/>
  <polygon points="600,88 586,83 588,95" fill="#fbbf24"/>
  <rect x="515" y="70" width="170" height="42" rx="8" fill="rgba(245,158,11,0.15)" stroke="#fbbf24" stroke-width="1"/>
  <text x="600" y="88" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#fbbf24">2. REVELACIÓN / LUZ</text>
  <text x="600" y="103" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#cbd5e1">"Find out / Stand out"</text>
  
  <!-- Vector 3: Agotamiento / Límite Exterior (Bottom Left) -->
  <path d="M 230 220 L 110 240" fill="none" stroke="#ef4444" stroke-width="2.5" filter="url(#glowOut)"/>
  <polygon points="100,242 112,235 114,247" fill="#ef4444"/>
  <rect x="15" y="225" width="170" height="42" rx="8" fill="rgba(239,68,68,0.15)" stroke="#ef4444" stroke-width="1"/>
  <text x="100" y="243" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#f87171">3. AGOTAMIENTO TOTAL</text>
  <text x="100" y="258" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#cbd5e1">"Run out of / Burn out"</text>
  
  <!-- Vector 4: Resolución del Caos (Bottom Right) -->
  <path d="M 470 220 L 590 240" fill="none" stroke="#10b981" stroke-width="2.5" filter="url(#glowOut)"/>
  <polygon points="600,242 588,235 586,247" fill="#10b981"/>
  <rect x="515" y="225" width="170" height="42" rx="8" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="1"/>
  <text x="600" y="243" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#34d399">4. RESOLUCIÓN / ORDEN</text>
  <text x="600" y="258" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" fill="#cbd5e1">"Figure out / Work out"</text>
  
  <!-- Bottom Formula Box -->
  <rect x="40" y="295" width="620" height="65" rx="10" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
  <text x="350" y="322" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#f8fafc">
    FÓRMULA: <tspan fill="#c084fc">[ Verbo Base ]</tspan> + <tspan fill="#38bdf8">[ OUT (Vector Hacia Afuera / Límite) ]</tspan> = <tspan fill="#34d399">[ Significado Metafórico ]</tspan>
  </text>
  <text x="350" y="344" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#94a3b8">
    Ejemplo: "I need to <tspan fill="#fbbf24" font-weight="bold">find out</tspan> the truth" (sacar a la luz) | "We <tspan fill="#f87171" font-weight="bold">ran out of</tspan> coffee" (fuera de stock)
  </text>
</svg>"""

        # 5. Cognitive Particle Semantics: UP vs DOWN (Vertical Scale, Telicity, Volume, Reduction)
        if any(w in combined_text for w in ["up vs down", "logic of up", "particle up", "particle down", "turn up", "turn down", "eat up", "clean up", "break down"]):
            return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBgUpDown" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a101d"/><stop offset="100%" stop-color="#141e33"/></linearGradient>
    <filter id="glowUpDown" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="700" height="380" rx="16" fill="url(#chalkBgUpDown)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="34" font-family="system-ui, sans-serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#f8fafc">VERTICAL AXIS: PARTICLES 'UP' vs 'DOWN'</text>
  <text x="350" y="54" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#38bdf8">Metáforas de Escala: Aumento / Completitud (UP) vs Reducción / Fijación (DOWN)</text>
  
  <!-- Vertical Axis Line -->
  <line x1="350" y1="75" x2="350" y2="280" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
  <polygon points="350,68 344,80 356,80" fill="#10b981"/>
  <polygon points="350,287 344,275 356,275" fill="#ef4444"/>
  
  <!-- UP SIDE (Left/Top) -->
  <rect x="40" y="80" width="280" height="90" rx="10" fill="rgba(16,185,129,0.12)" stroke="#10b981" stroke-width="1.2"/>
  <text x="180" y="102" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#34d399">▲ PARTÍCULA 'UP'</text>
  <text x="180" y="122" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#e2e8f0">• <tspan font-weight="bold" fill="#6ee7b7">Completitud / Llenado:</tspan> Eat up, Clean up, Fill up</text>
  <text x="180" y="140" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#e2e8f0">• <tspan font-weight="bold" fill="#6ee7b7">Aumento (More is Up):</tspan> Turn up, Speak up, Speed up</text>
  <text x="180" y="158" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#e2e8f0">• <tspan font-weight="bold" fill="#6ee7b7">Emergencia / Consciencia:</tspan> Show up, Come up with</text>
  
  <!-- DOWN SIDE (Right/Bottom) -->
  <rect x="380" y="175" width="280" height="90" rx="10" fill="rgba(239,68,68,0.12)" stroke="#ef4444" stroke-width="1.2"/>
  <text x="520" y="197" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#f87171">▼ PARTÍCULA 'DOWN'</text>
  <text x="520" y="217" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#e2e8f0">• <tspan font-weight="bold" fill="#fca5a5">Reducción (Less is Down):</tspan> Turn down, Slow down, Calm down</text>
  <text x="520" y="235" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#fca5a5">• <tspan font-weight="bold" fill="#fca5a5">Fijación / Asiento:</tspan> Write down, Settle down</text>
  <text x="520" y="253" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#fca5a5">• <tspan font-weight="bold" fill="#fca5a5">Colapso / Falla:</tspan> Break down, Shut down</text>
  
  <!-- Bottom Contrast Box -->
  <rect x="40" y="295" width="620" height="65" rx="10" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
  <text x="350" y="322" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#f8fafc">
    CONTRASTE DIRECTO: <tspan fill="#34d399">"Turn UP the music"</tspan> (Subir volumen) vs <tspan fill="#f87171">"Turn DOWN the offer"</tspan> (Bajar/Rechazar)
  </text>
  <text x="350" y="344" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#94a3b8">
    Telicidad con UP: "Eat the apple" (acción) vs "Eat UP the apple" (comerla completamente hasta el corazón)
  </text>
</svg>"""

        # 6. Cognitive Particle Semantics: ON vs OFF (Contact, Activation, Continuity vs Separation, Postponement)
        if any(w in combined_text for w in ["particle off", "particle on", "on vs off", "turn off", "turn on", "put off", "call off", "take off", "carry on", "go on"]):
            return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 380" width="100%" height="100%">
  <defs>
    <linearGradient id="chalkBgOnOff" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a101d"/><stop offset="100%" stop-color="#141e33"/></linearGradient>
    <filter id="glowOnOff" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="700" height="380" rx="16" fill="url(#chalkBgOnOff)" stroke="#27354f" stroke-width="1.5"/>
  <text x="350" y="34" font-family="system-ui, sans-serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#f8fafc">CONTACT &amp; SEPARATION: PARTICLES 'ON' vs 'OFF'</text>
  <text x="350" y="54" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#38bdf8">Superficie y Continuidad (ON) vs Desprendimiento y Postergación (OFF)</text>
  
  <!-- Left Side: ON (Contact & Continuity) -->
  <g transform="translate(50, 80)">
    <rect x="0" y="0" width="280" height="195" rx="12" fill="rgba(56,189,248,0.10)" stroke="#38bdf8" stroke-width="1.5"/>
    <rect x="20" y="15" width="240" height="28" rx="6" fill="#0284c7"/>
    <text x="140" y="34" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#fff">PARTÍCULA 'ON' (Contacto / Flujo)</text>
    <text x="20" y="70" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#7dd3fc">1. Contacto Físico / Poner:</text>
    <text x="30" y="88" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">"Put on your jacket" (sobre el cuerpo)</text>
    <text x="20" y="112" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#7dd3fc">2. Activación de Energía:</text>
    <text x="30" y="130" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">"Turn on the lights / Switch on"</text>
    <text x="20" y="154" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#7dd3fc">3. Continuidad Temporal (Aspectual):</text>
    <text x="30" y="172" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">"Go on / Carry on / Keep on walking"</text>
  </g>
  
  <!-- Right Side: OFF (Detachment & Cancellation) -->
  <g transform="translate(370, 80)">
    <rect x="0" y="0" width="280" height="195" rx="12" fill="rgba(244,63,94,0.10)" stroke="#f43f5e" stroke-width="1.5"/>
    <rect x="20" y="15" width="240" height="28" rx="6" fill="#e11d48"/>
    <text x="140" y="34" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#fff">PARTÍCULA 'OFF' (Separación / Corte)</text>
    <text x="20" y="70" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#fda4af">1. Desconexión / Separación:</text>
    <text x="30" y="88" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">"Take off shoes / The plane took off"</text>
    <text x="20" y="112" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#fda4af">2. Interrupción de Energía:</text>
    <text x="30" y="130" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">"Turn off the engine / Cut off supply"</text>
    <text x="20" y="154" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#fda4af">3. Cancelación o Postergación:</text>
    <text x="30" y="172" font-family="system-ui, sans-serif" font-size="11" fill="#e2e8f0">"Call off the meeting / Put off a task"</text>
  </g>
  
  <!-- Bottom Summary -->
  <rect x="40" y="295" width="620" height="65" rx="10" fill="#060a12" stroke="#1e293b" stroke-width="1"/>
  <text x="350" y="322" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#f8fafc">
    METÁFORA CLAVE: <tspan fill="#38bdf8">ON</tspan> mantiene el flujo hacia adelante; <tspan fill="#f43f5e">OFF</tspan> separa o detiene el evento
  </text>
  <text x="350" y="344" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#94a3b8">
    Ejemplo: "Please <tspan fill="#38bdf8" font-weight="bold">carry on</tspan> with your work" vs "They decided to <tspan fill="#f43f5e" font-weight="bold">call off</tspan> the match"
  </text>
</svg>"""

        return None

    def _find_curriculum_node(self, topic: str, sublevel: Optional[str] = None) -> Optional[dict]:
        """Finds the curriculum class node for a given topic and sublevel."""
        if not topic:
            return None
        topic_lower = topic.strip().lower()

        # 1. Search in specified sublevel first
        if sublevel and sublevel in CURRICULUM_GRAPH:
            for c in CURRICULUM_GRAPH[sublevel].get("classes", []):
                if c.get("topic", "").strip().lower() == topic_lower:
                    return c

        # 2. Search across all sublevels
        for sl, sdata in CURRICULUM_GRAPH.items():
            for c in sdata.get("classes", []):
                c_topic = c.get("topic", "").strip().lower()
                if c_topic == topic_lower or (len(topic_lower) > 5 and (topic_lower in c_topic or c_topic in topic_lower)):
                    return c
        return None

    async def generate_adaptive_lesson_script(
        self,
        topic: str,
        sublevel: str,
        student_profile: Optional[dict] = None,
        adaptive_plan: Optional[dict] = None
    ) -> dict:
        """Generate a personalized, interleaved lesson incorporating spaced retrieval and phonetic contrast."""
        adaptive_plan = adaptive_plan or {}
        student_profile = student_profile or {}
        level_desc = SUBLEVEL_DESCRIPTIONS.get(sublevel, sublevel)
        is_a_level = sublevel.startswith("A1") or sublevel.startswith("A2")
        
        if not self.client or not self.api_key:
            fallback = self._build_fallback_lesson(topic, sublevel, is_a_level)
            fallback["archetype"] = adaptive_plan.get("archetype", "practice")
            fallback["phonetic_focus"] = adaptive_plan.get("phonetic_focus", {})
            return fallback

        curr_node = self._find_curriculum_node(topic, sublevel) or {}
        grammar_target = curr_node.get("grammar_core") or ""
        vocab_target = curr_node.get("vocabulary_core") or ""
        can_do_target = curr_node.get("can_do") or ""

        target_guidance = ""
        if grammar_target:
            target_guidance += f"• Gramática Nuclear Obligatoria: {grammar_target}\n"
        if vocab_target:
            target_guidance += f"• Vocabulario Nuclear Obligatorio: {vocab_target}\n"
        if can_do_target:
            target_guidance += f"• Objetivo Can-Do: {can_do_target}\n"

        archetype = adaptive_plan.get("archetype", "practice")
        macro_obj = adaptive_plan.get("macro_objective", "Core Fluency")
        retrieval = adaptive_plan.get("retrieval_topic") or "Conceptos clave previos"
        ph_focus = adaptive_plan.get("phonetic_focus") or {}
        has_ph = bool(ph_focus and ph_focus.get("symbols"))
        if has_ph:
            ph_symbols = " vs ".join(ph_focus.get("symbols", []))
            contrast_pairs = ph_focus.get("contrast_pairs", [])
            pairs_str = ", ".join([f"{p[0]}/{p[1]}" for p in contrast_pairs[:3]]) if contrast_pairs else ""
            phonetics_prompt_line = f"Micro-Foco Fonético Programado: {ph_symbols} (Pares mínimos: {pairs_str})\n"
            extra_rule = (
                f"6. Flujo Ininterrumpido: Las Slides 1 a N-1 enseñan '{topic}' de forma continua y comunicativa sin pausas fonéticas intermedias. "
                f"La pronunciación de los dos fonemas se aborda ÚNICAMENTE al final como última Slide (Slide N: Bonus de Pronunciación: {ph_symbols}), "
                f"explicando en español la anatomía de la boca (exterior: labios y apertura; interior: lengua y tracto vocal)."
            )
        else:
            phonetics_prompt_line = "Tipo de Clase: Clase Regular de Gramática, Vocabulario y Comunicación (SIN módulo de fonética aislado).\n"
            extra_rule = "6. Esta es una clase regular: todas las slides se enfocan en gramática, vocabulario y práctica comunicativa."

        system = self._build_system_prompt(student_profile)
        user = (
            f"Diseña una lección pedagógica y cinematográfica en formato JSON ai_tutor.lesson.v2.\n"
            f"Tema Central: {topic}\n"
            f"Subnivel CEFR: {sublevel} ({level_desc})\n"
            f"Macro-Objetivo: {macro_obj}\n"
            f"Arquetipo de Clase: {archetype.upper()}\n"
            f"Tema de Repaso/Recuperación (Spaced Retrieval): {retrieval}\n"
            f"{target_guidance}"
            f"{phonetics_prompt_line}\n"
            f"ESTRUCTURA CINEMATOGRÁFICA Y DINÁMICA DE SLIDES (DECIDE ENTRE 4 Y 7 SLIDES):\n"
            f"• Slide 1: MANDATORY CINEMATIC HOOK (Apertura inmersiva).\n"
            f"   - Plantea un dilema o pregunta cotidiana sobre '{topic}' para despertar curiosidad.\n"
            f"   - Incluye 'hook_images' con 1 o 2 descripciones de escenas visuales potentes en inglés.\n"
            f"   - 'tutor_says': Locución intrigante y empática (2-3 oraciones) planteando el gancho.\n"
            f"   - 'student_task' y 'expected_answer': null. 'interaction_type': 'explanation'.\n"
            f"• Slides 2 a N-2: PROFUNDIZACIÓN CONCEPTUAL PURA Y MODELOS MENTALES.\n"
            f"   - Explica el concepto lingüístico usando modelos mentales vívidos (puentes, reflectores, etc.).\n"
            f"   - Desglosa la fórmula gramatical sintáctica token por token ({grammar_target or topic}).\n"
            f"   - PROHIBIDO colocar ejercicios interactivos o quizzes en estas pizarras explicativas (deben ser limpias y profundas).\n"
            f"• Slide N-1: SLIDE DEDICADA DE DESAFÍO INTERACTIVO CON ORACIONES COMPLETAS.\n"
            f"   - 'is_practice_slide': true, 'interaction_type': 'quiz'.\n"
            f"   - Contiene un arreglo de 'exercises' (de 2 a 4 ejercicios).\n"
            f"   - CADA EJERCICIO ES UNA ORACIÓN COMPLETA en inglés basada en situaciones reales (no palabras sueltas).\n"
            f"   - CADA EJERCICIO DEBE INCLUIR:\n"
            f"       - 'id': 'ex-1', 'ex-2'...\n"
            f"       - 'sentence': Oración completa en inglés con '___' o reto.\n"
            f"       - 'options': Lista de 2 a 4 opciones claras (ej: ['drinks', 'drink', 'drinking']).\n"
            f"       - 'expected_answer': Respuesta correcta.\n"
            f"       - 'spanish_translation': Traducción/contexto en español.\n"
            f"       - 'image_prompt': Descripción vívida en inglés de la situación/escena exacta de esa oración para generar su ilustración, clean 2D vector art, no text.\n"
            f"       - 'hint': Pista gramatical.\n"
            f"• Slide N (si aplica): BONUS DE PRONUNCIACIÓN (Anatomía bucal exterior/interior en español).\n\n"
            f"REGLAS PEDAGÓGICAS Y ESTRUCTURALES OBLIGATORIAS:\n"
            f"1. EN CADA FASE CONCEPTUAL, `tutor_says` DEBE EXPLICAR A FONDO: Usa una metáfora intuitiva para explicar el concepto de '{topic}', desglosa la fórmula gramatical explicando por qué cada palabra va en ese orden exacto, y analiza los ejemplos de la pizarra palabra por palabra con errores típicos a evitar. PROHIBIDO decir 'mira la pizarra', 'observa los conceptos' o frases vagas.\n"
            f"2. Para cada fase especifica `image_style`: 'flat_art', 'comic_scene' o 'concept_art'.\n"
            f"3. Para cada imagen incluye descripciones en inglés de escenas humanas visuales y educativas. PROHIBIDO fondos blancos vacíos o diagramas abstractos sin personajes. SIN TEXTO NI LETRAS.\n"
            f"4. Incluye `target_audio_items` con la lista explícita de palabras/oraciones en inglés a escuchar.\n"
            f"5. {'Explicaciones (tutor_says), pizarra (board_content) y tareas en español con ejemplos en inglés.' if is_a_level else 'Full English immersion.'}\n"
            f"6. OBLIGATORIO: El contenido debe enseñar ESTRICTAMENTE '{topic}' ({grammar_target}). PROHIBIDO enseñar Present Simple u otro tema ajeno.\n"
            f"{extra_rule}"
        )
        try:
            raw = await self._chat(system, user, thinking="disabled")
            data = clean_json_response(raw)
            if "phases" not in data or not isinstance(data.get("phases"), list) or len(data.get("phases", [])) < 3:
                data = self._build_fallback_lesson(topic, sublevel, is_a_level)
            else:
                for idx, p in enumerate(data["phases"]):
                    # Ensure phase_number and phase_name exist
                    if not p.get("phase_number"):
                        p["phase_number"] = p.get("phase_index") or (idx + 1)
                    if not p.get("phase_name"):
                        p["phase_name"] = p.get("title") or p.get("name") or f"Fase {p['phase_number']}"

                    # Normalize board_content to clean string
                    bc = p.get("board_content")
                    if isinstance(bc, list):
                        p["board_content"] = "\n".join(str(item) for item in bc)
                    elif isinstance(bc, dict):
                        p["board_content"] = "\n".join(f"• {k}: {v}" for k, v in bc.items())

                    # Phase 1 is the Cinematic Hook
                    if idx == 0:
                        p["is_hook"] = True
                        if not p.get("hook_type"):
                            p["hook_type"] = "dilemma"
                        p["student_task"] = None
                        p["expected_answer"] = None
                        p["interaction_type"] = "explanation"

                        # Ensure hook_images is structured with 1-2 rich prompts
                        if not p.get("hook_images") or not isinstance(p["hook_images"], list) or len(p["hook_images"]) == 0:
                            main_p = p.get("image_prompt") or f"A person contemplating and wondering about how to express {topic} in everyday conversation, colorful 2D vector art, no text"
                            p["hook_images"] = [
                                {
                                    "prompt": self._sanitize_image_prompt(main_p, topic),
                                    "caption": f"Descubriendo el uso de {topic}",
                                    "role": "hook_situation"
                                }
                            ]
                        else:
                            cleaned_hook_imgs = []
                            for hi in p["hook_images"][:2]:
                                if isinstance(hi, dict):
                                    pr = hi.get("prompt") or hi.get("image_prompt") or f"2D vector educational illustration of {topic}, no text"
                                    cleaned_hook_imgs.append({
                                        "prompt": self._sanitize_image_prompt(pr, topic),
                                        "caption": hi.get("caption") or f"Situación didáctica: {topic}",
                                        "role": hi.get("role") or "hook_situation"
                                    })
                                elif isinstance(hi, str):
                                    cleaned_hook_imgs.append({
                                        "prompt": self._sanitize_image_prompt(hi, topic),
                                        "caption": f"Situación didáctica: {topic}",
                                        "role": "hook_situation"
                                    })
                            p["hook_images"] = cleaned_hook_imgs
                    else:
                        p["is_hook"] = False

                    if not p.get("image_style"):
                        p["image_style"] = "comic_scene" if idx == 0 else "flat_art"
                    if not p.get("image_prompt"):
                        p["image_prompt"] = f"flat 2D vector illustration of an educational classroom scene about {topic}, vibrant colors, no text"
                    else:
                        p["image_prompt"] = self._sanitize_image_prompt(p["image_prompt"], topic)

                    if not p.get("target_audio_items") or not isinstance(p.get("target_audio_items"), list):
                        p["target_audio_items"] = self._extract_phase_target_audio_items(p)
                    p["board_theme"] = "chalkboard_green"
                    if not p.get("slide_typography"):
                        p["slide_typography"] = {
                            "title_font": "chalk",
                            "body_font": "handwriting",
                            "accent_color": "#FFB627",
                            "highlight_color": "#00E676",
                            "text_color": "#FFFFFF",
                        }
                    # Resolve or validate conditional didactic diagram_svg
                    p["diagram_svg"] = self._resolve_didactic_diagram_svg(p, topic)
                    p["storyboard_steps"] = self._build_phase_storyboard(p)
                    p["grammar_structure"] = self._normalize_grammar_structure(p, topic, sublevel)
            
            data["topic"] = topic
            data["sublevel"] = sublevel
            data["level"] = sublevel.split(".")[0]
            data["subject"] = "English"
            if ph_focus:
                data["phonetic_focus"] = ph_focus
            return self._audit_and_sanitize_lesson_content(data, topic, sublevel, adaptive_plan)
        except Exception as e:
            logger.error(f"Error in generate_adaptive_lesson_script: {e}")
            fallback = self._build_fallback_lesson(topic, sublevel, is_a_level)
            if ph_focus:
                fallback["phonetic_focus"] = ph_focus
            return self._audit_and_sanitize_lesson_content(fallback, topic, sublevel, adaptive_plan)

    def _generate_default_exercises(self, topic: str, sublevel: str, grammar_target: str = "") -> list:
        """Constructs authentic complete-sentence exercises with vivid situational image prompts."""
        t_low = topic.lower()
        if "past" in t_low or "irregular" in t_low or "was" in t_low:
            return [
                {
                    "id": "ex-1",
                    "sentence": "Yesterday morning, Liam _____ [went / go / goes] to the central library to study.",
                    "options": ["went", "go", "goes"],
                    "expected_answer": "went",
                    "spanish_translation": "Ayer por la mañana, Liam fue a la biblioteca central a estudiar.",
                    "image_prompt": "A young male student walking into a warm sunlit modern library carrying a backpack, colorful 2D flat vector art, no text, no letters",
                    "hint": "En pasado afirmativo de 'go', usamos la forma irregular 'went'."
                },
                {
                    "id": "ex-2",
                    "sentence": "Did you _____ [see / saw / seen] the beautiful sunset at the beach last night?",
                    "options": ["see", "saw", "seen"],
                    "expected_answer": "see",
                    "spanish_translation": "¿Viste el hermoso atardecer en la playa anoche?",
                    "image_prompt": "Two friends sitting on sand dunes watching a magnificent golden sunset over ocean waves, vibrant 2D vector illustration, no text",
                    "hint": "Tras el auxiliar 'Did', el verbo principal regresa a su forma base pura (see)."
                },
                {
                    "id": "ex-3",
                    "sentence": "We _____ [didn't buy / didn't bought / not buy] the expensive tickets because we had no cash.",
                    "options": ["didn't buy", "didn't bought", "not buy"],
                    "expected_answer": "didn't buy",
                    "spanish_translation": "No compramos los boletos caros porque no teníamos efectivo.",
                    "image_prompt": "A cheerful young couple checking their wallets in front of a cinema ticket counter, colorful vector illustration, no text",
                    "hint": "Con 'didn't', el verbo se mantiene en forma base (buy) sin duplicar el pasado."
                }
            ]
        elif "future" in t_low or "going to" in t_low or "will" in t_low:
            return [
                {
                    "id": "ex-1",
                    "sentence": "Next summer, Maria is _____ [going to travel / go to travel / will traveling] to Japan.",
                    "options": ["going to travel", "go to travel", "will traveling"],
                    "expected_answer": "going to travel",
                    "spanish_translation": "El próximo verano, María va a viajar a Japón.",
                    "image_prompt": "A happy young woman with a travel suitcase looking at a colorful map of Tokyo Japan, vibrant 2D vector art, no text",
                    "hint": "Para planes futuros usamos 'is going to + verbo base'."
                },
                {
                    "id": "ex-2",
                    "sentence": "Look at those dark clouds! It is _____ [going to rain / rain / rained] in a few minutes.",
                    "options": ["going to rain", "rain", "rained"],
                    "expected_answer": "going to rain",
                    "spanish_translation": "¡Mira esas nubes oscuras! Va a llover en unos minutos.",
                    "image_prompt": "Dark dramatic rain clouds over a cozy city street as people open colorful umbrellas, 2D vector art, no text",
                    "hint": "Usamos 'going to' para predicciones basadas en evidencia visual presente."
                }
            ]
        elif "present continuous" in t_low or "progressive" in t_low:
            return [
                {
                    "id": "ex-1",
                    "sentence": "Right now, Carlos is _____ [cooking / cook / cooked] delicious pasta in the kitchen.",
                    "options": ["cooking", "cook", "cooked"],
                    "expected_answer": "cooking",
                    "spanish_translation": "Ahora mismo, Carlos está cocinando deliciosa pasta en la cocina.",
                    "image_prompt": "A young chef smiling while stirring steaming fresh pasta in a bright modern kitchen, 2D flat vector art, no text",
                    "hint": "Para acciones en este momento usamos 'be + verbo con -ing'."
                },
                {
                    "id": "ex-2",
                    "sentence": "Listen! The birds are _____ [singing / sing / sang] in the garden outside.",
                    "options": ["singing", "sing", "sang"],
                    "expected_answer": "singing",
                    "spanish_translation": "¡Escucha! Los pájaros están cantando en el jardín afuera.",
                    "image_prompt": "Colorful little birds perching on blooming spring tree branches in a sunny garden, 2D vector illustration, no text",
                    "hint": "Sujeto plural 'The birds' + 'are' + verbo con '-ing'."
                }
            ]
        else:
            return [
                {
                    "id": "ex-1",
                    "sentence": f"Every morning, Sophia _____ [practices / practice / practiced] English conversation before work.",
                    "options": ["practices", "practice", "practiced"],
                    "expected_answer": "practices",
                    "spanish_translation": f"Cada mañana, Sophia practica conversación en inglés antes del trabajo.",
                    "image_prompt": f"A smiling young professional woman practicing with headphones and coffee in a sunny morning room, 2D flat vector art, no text",
                    "hint": f"Aplica la estructura principal aprendida de {topic}."
                },
                {
                    "id": "ex-2",
                    "sentence": f"When you speak with friends, you should _____ [express / expressing / expressed] your ideas with confidence.",
                    "options": ["express", "expressing", "expressed"],
                    "expected_answer": "express",
                    "spanish_translation": "Cuando hablas con amigos, debes expresar tus ideas con confianza.",
                    "image_prompt": f"Two friends smiling and chatting over coffee in a bright modern café, 2D flat vector illustration, no text",
                    "hint": f"Usa el verbo en su forma adecuada según las reglas de {topic}."
                }
            ]

    def _build_practice_slide(self, raw_exercises: list, topic: str, sublevel: str, phase_number: int = 5) -> dict:
        """
        Constructs a dedicated interactive practice slide with complete situational English sentences,
        contextual image prompts, options, translations, and oral drill support.
        """
        clean_exercises = []
        target_audios = []

        if not raw_exercises:
            raw_exercises = self._generate_default_exercises(topic, sublevel)

        for idx, ex in enumerate(raw_exercises):
            if not isinstance(ex, dict):
                continue
            ex_id = ex.get("id") or f"ex-{idx+1}"
            raw_sent = str(ex.get("sentence") or ex.get("question") or ex.get("cleanSentence") or "").strip()
            if not raw_sent:
                continue

            opts = ex.get("options") or []
            if isinstance(opts, str):
                opts = [o.strip() for o in opts.split(",") if o.strip()]

            inline_match = re.search(r'\[([^\]]+)\]|\(([^\)]+)\)', raw_sent)
            if inline_match and not opts:
                opt_str = inline_match.group(1) or inline_match.group(2)
                if "/" in opt_str or "|" in opt_str or "," in opt_str:
                    opts = [o.strip() for o in re.split(r'[\/\|,]', opt_str) if o.strip()]

            exp_ans = str(ex.get("expected_answer") or ex.get("answer") or (opts[0] if opts else "")).strip()

            if "___" not in raw_sent and not inline_match:
                if exp_ans and exp_ans.lower() in raw_sent.lower():
                    raw_sent = re.sub(re.escape(exp_ans), "_____", raw_sent, count=1, flags=re.IGNORECASE)
                else:
                    raw_sent = f"{raw_sent} _____"

            raw_prompt = ex.get("image_prompt")
            if not raw_prompt or len(raw_prompt) < 10 or "classroom" in raw_prompt.lower():
                clean_txt = re.sub(r'[_\[\]\(\)\/\|]+', '', raw_sent).strip()
                clean_txt = clean_txt.replace("_____", exp_ans).replace("____", exp_ans).replace("___", exp_ans)
                raw_prompt = f"2D flat vector educational illustration depicting the real-life scene: '{clean_txt}', realistic environment, warm atmospheric lighting, expressive characters, strictly no text, no words, no letters"

            clean_prompt = self._sanitize_image_prompt(raw_prompt, topic)
            spanish_tr = ex.get("spanish_translation") or ex.get("translation") or f"Completa la oración en el contexto de {topic}."
            hint = ex.get("hint") or f"Aplica la regla de {topic}."

            clean_exercises.append({
                "id": ex_id,
                "sentence": raw_sent,
                "options": opts,
                "expected_answer": exp_ans,
                "spanish_translation": spanish_tr,
                "image_prompt": clean_prompt,
                "image_style": "flat_art",
                "hint": hint
            })

            full_spoken = raw_sent.replace("_____", exp_ans).replace("____", exp_ans).replace("___", exp_ans)
            full_spoken = re.sub(r'\[[^\]]+\]|\([^\)]+\)', exp_ans, full_spoken).strip()
            target_audios.append({
                "english": full_spoken or raw_sent,
                "translation": spanish_tr,
                "label": f"Ejercicio {idx+1}"
            })

        board_lines = [f"🎯 DESAFÍO DE ORACIONES COMPLETAS: {topic.upper()}\n"]
        for i, ex in enumerate(clean_exercises):
            board_lines.append(f"{i+1}. {ex['sentence']}")
            if ex['options']:
                board_lines.append(f"   Opciones: {', '.join(ex['options'])}")
            board_lines.append(f"   💡 {ex['spanish_translation']}\n")

        phase = {
            "phase_number": phase_number,
            "phase_name": f"Desafío Práctico: Aplica {topic}",
            "is_hook": False,
            "is_practice_slide": True,
            "is_phonetic_bonus": False,
            "interaction_type": "quiz",
            "exercises": clean_exercises,
            "image_style": "flat_art",
            "image_prompt": f"Flat 2D vector educational illustration of an engaging study session with flashcards, vibrant colors, strictly no text",
            "tutor_says": f"¡Excelente progreso! Ahora pondremos a prueba tu dominio con oraciones completas contextualizadas. Observa la imagen de cada situación, completa el espacio con la opción correcta y practica diciendo la frase completa con tu micrófono.",
            "board_content": "\n".join(board_lines),
            "board_theme": "chalkboard_green",
            "target_audio_items": target_audios,
            "student_task": f"Resuelve los desafíos de oraciones completas y evalúa tu pronunciación con el micrófono.",
            "expected_answer": clean_exercises[0]["expected_answer"] if clean_exercises else "Complete the sentence"
        }
        phase["storyboard_steps"] = self._build_phase_storyboard(phase)
        return phase

    def _build_phonetic_bonus_phase(self, ph_focus: dict, sublevel: str, topic: str, phase_number: int = 6) -> dict:
        """Constructs an authentic dedicated Bonus Pronunciation slide focused strictly on the 2 phonemes."""
        symbols = ph_focus.get("symbols", [])
        primary = ph_focus.get("primary", {})
        secondary = ph_focus.get("secondary", {})
        ph_str = " vs ".join(symbols) if symbols else "/θ/ vs /ð/"

        p_name = primary.get("name", "Sonido Primario")
        s_name = secondary.get("name", "Sonido Secundario") if secondary else ""

        p_mouth = primary.get("mouth_guide_es", primary.get("mouth_guide", {}))
        s_mouth = secondary.get("mouth_guide_es", secondary.get("mouth_guide", {})) if secondary else {}

        contrast_pairs = ph_focus.get("contrast_pairs", primary.get("contrast_pairs", []))
        drill_sentence = ph_focus.get("drill_sentence", primary.get("drill_sentence", ""))

        tutor_says = (
            f"¡Excelente trabajo completando la parte principal de la clase! Como bonus de pronunciación antes de pasar a la lectura y los juegos, "
            f"aprenderemos a dominar el contraste entre los sonidos {ph_str}. "
            f"Para {symbols[0] if symbols else 'el primer sonido'}, en el exterior {p_mouth.get('frontal', 'ajusta la forma de los labios')}, y en el interior {p_mouth.get('lateral', 'posiciona la lengua')}. "
        )
        if secondary and len(symbols) > 1:
            tutor_says += (
                f"En contraste, para {symbols[1]}, en el exterior {s_mouth.get('frontal', 'cambia la postura labial')}, y en el interior {s_mouth.get('lateral', 'ajusta la lengua y tracto vocal')}. "
            )
        tutor_says += "Escucha la diferencia en los pares mínimos y practica la frase de reto con tu micrófono."

        board_content = f"🌟 BONUS DE PRONUNCIACIÓN: {ph_str}\n"
        board_content += f"• {symbols[0] if symbols else ''} ({p_name}): Exterior: {p_mouth.get('frontal', '')} | Interior: {p_mouth.get('lateral', '')}\n"
        if secondary and len(symbols) > 1:
            board_content += f"• {symbols[1]} ({s_name}): Exterior: {s_mouth.get('frontal', '')} | Interior: {s_mouth.get('lateral', '')}\n"
        if contrast_pairs:
            pairs_txt = ", ".join([f"{p[0]} vs {p[1]}" for p in contrast_pairs[:4]])
            board_content += f"• Pares Mínimos: {pairs_txt}\n"
        if drill_sentence:
            board_content += f"• Reto Oral: \"{drill_sentence}\""

        target_audios = []
        for pair in contrast_pairs[:3]:
            if len(pair) >= 2:
                target_audios.append({"english": pair[0], "translation": f"Sonido {symbols[0] if symbols else ''}", "label": "Par Mínimo"})
                target_audios.append({"english": pair[1], "translation": f"Sonido {symbols[1] if len(symbols) > 1 else ''}", "label": "Par Mínimo"})
        if drill_sentence:
            target_audios.append({"english": drill_sentence, "translation": "Reto de pronunciación", "label": "Frase de Práctica"})

        phase = {
            "phase_number": phase_number,
            "phase_name": f"Bonus de Pronunciación: {ph_str}",
            "is_hook": False,
            "is_practice_slide": False,
            "is_phonetic_bonus": True,
            "phonetic_focus": ph_focus,
            "image_style": "flat_art",
            "image_prompt": f"Clean 2D flat vector educational illustration showing speech sounds, mouth articulation and vocal acoustics for {ph_str}, bright vibrant colors, no text, no letters, no words",
            "tutor_says": tutor_says,
            "board_content": board_content,
            "board_theme": "chalkboard_green",
            "interaction_type": "phonetic_bonus",
            "target_audio_items": target_audios,
            "expected_answer": drill_sentence,
            "student_task": f"Escucha la pronunciación de {ph_str} y los pares mínimos. Graba la frase de práctica con tu micrófono."
        }
        phase["storyboard_steps"] = self._build_phase_storyboard(phase)
        return phase

    def _audit_and_sanitize_lesson_content(self, data: dict, topic: str, sublevel: str, adaptive_plan: Optional[dict] = None) -> dict:
        """Pedagogical Quality Engine: Isolates practice exercises into a dedicated slide and places phonetics strictly at the end."""
        if not data or not isinstance(data.get("phases"), list):
            return data

        from core.lesson_fallbacks import build_curated_fallback
        is_a_level = (sublevel or "").startswith("A1") or (sublevel or "").startswith("A2")
        curated_ref = build_curated_fallback(topic, sublevel, is_a_level)
        curated_phases = curated_ref.get("phases", []) if curated_ref else []

        robotic_patterns = [
            re.compile(r'I (study|learn|practice)\s+' + re.escape(topic), re.IGNORECASE),
            re.compile(r'I practice\s+[A-Za-z\s]+in English', re.IGNORECASE),
            re.compile(r'This is an important English concept', re.IGNORECASE),
            re.compile(r'I learn\s+' + re.escape(topic.lower()), re.IGNORECASE),
            re.compile(r'I understand\s+' + re.escape(topic.lower()), re.IGNORECASE),
            re.compile(r'We apply\s+' + re.escape(topic.lower()), re.IGNORECASE),
            re.compile(r'I practice interrupted activities', re.IGNORECASE),
            re.compile(r'I study past continuous', re.IGNORECASE),
        ]

        ph_focus = (adaptive_plan.get("phonetic_focus") if adaptive_plan else None) or data.get("phonetic_focus")
        has_ph = bool(ph_focus and ph_focus.get("symbols"))

        clean_phases = []
        all_collected_exercises = []
        existing_bonus_phase = None

        for idx, p in enumerate(data["phases"]):
            # Check for phonetic bonus phase
            is_p_ph = bool(
                p.get("is_phonetic_bonus") or 
                p.get("phonetic_focus") or 
                "fonét" in str(p.get("phase_name", "")).lower() or 
                "micro-phonetic" in str(p.get("phase_name", "")).lower() or
                ("pronunciación" in str(p.get("phase_name", "")).lower() and ("bonus" in str(p.get("phase_name", "")).lower() or "micro" in str(p.get("phase_name", "")).lower()))
            )
            if is_p_ph:
                existing_bonus_phase = p
                continue  # Exclude from middle phases

            # Check if this phase has exercises to extract
            ex_list = p.get("exercises") or []
            if ex_list and isinstance(ex_list, list):
                all_collected_exercises.extend(ex_list)
                p["exercises"] = []  # Clear from conceptual phase

            # If this is already marked as a dedicated practice slide, extract its exercises and skip adding duplicate
            if p.get("is_practice_slide") or p.get("interaction_type") == "quiz":
                if p.get("student_task") and not all_collected_exercises:
                    all_collected_exercises.append({"sentence": p.get("student_task"), "expected_answer": p.get("expected_answer")})
                continue

            # Check target audio items for robotic phrases
            audio_items = p.get("target_audio_items") or []
            has_robotic_audio = False
            for item in audio_items:
                eng = item.get("english", "")
                if any(pat.search(eng) for pat in robotic_patterns):
                    has_robotic_audio = True
                    break
            
            # Check board content
            bc = p.get("board_content") or ""
            has_robotic_bc = any(pat.search(bc) for pat in robotic_patterns)

            # If robotic content detected, reconcile with curated phase
            if (has_robotic_audio or has_robotic_bc) and idx < len(curated_phases):
                c_phase = curated_phases[idx]
                if c_phase.get("target_audio_items"):
                    p["target_audio_items"] = c_phase["target_audio_items"]
                if c_phase.get("expected_answer"):
                    p["expected_answer"] = c_phase["expected_answer"]
                if c_phase.get("student_task"):
                    p["student_task"] = c_phase["student_task"]
                if c_phase.get("grammar_structure"):
                    p["grammar_structure"] = c_phase["grammar_structure"]
                if c_phase.get("board_content") and has_robotic_bc:
                    p["board_content"] = c_phase["board_content"]
                if c_phase.get("tutor_says") and any(pat.search(p.get("tutor_says", "")) for pat in robotic_patterns):
                    p["tutor_says"] = c_phase["tutor_says"]

            # Keep explanation phases clean from bottom exercise clutter
            p["is_practice_slide"] = False
            p["exercises"] = []
            p["diagram_svg"] = self._resolve_didactic_diagram_svg(p, topic)
            p["storyboard_steps"] = self._build_phase_storyboard(p)
            clean_phases.append(p)

        # Append dedicated Practice Slide before bonus slide
        practice_phase = self._build_practice_slide(
            all_collected_exercises,
            topic,
            sublevel,
            phase_number=len(clean_phases) + 1
        )
        clean_phases.append(practice_phase)

        # If this lesson has a scheduled phonetic focus, place the dedicated bonus slide as the FINAL slide
        if has_ph:
            bonus_phase = self._build_phonetic_bonus_phase(ph_focus, sublevel, topic, phase_number=len(clean_phases) + 1)
            clean_phases.append(bonus_phase)
            data["phonetic_focus"] = ph_focus
        elif existing_bonus_phase:
            clean_phases.append(existing_bonus_phase)

        # Re-number all phases consecutively
        for i, p in enumerate(clean_phases):
            p["phase_number"] = i + 1

        data["phases"] = clean_phases
        return data

    async def generate_lesson_script(self, topic: str, sublevel: str, student_profile: Optional[dict] = None) -> dict:
        """Alias for generate_adaptive_lesson_script."""
        return await self.generate_adaptive_lesson_script(topic, sublevel, student_profile)

    def _normalize_grammar_structure(self, p: dict, topic: str, sublevel: str) -> Optional[dict]:
        """Ensure rich grammar_structure object exists with syntax tokens and breakdowns."""
        gs = p.get("grammar_structure")
        
        # 1. If already provided as a valid dict
        if isinstance(gs, dict) and (gs.get("formula") or gs.get("formula_tokens")):
            if not gs.get("title") or "Syntax Formula" in str(gs.get("title")):
                gs["title"] = f"Estructura: {p.get('phase_name', topic)}"
            if not gs.get("formula_tokens") and gs.get("formula"):
                tokens = []
                parts = re.split(r'\s*\+\s*|\s*→\s*|\s*\|\s*', str(gs["formula"]))
                colors = ["blue", "purple", "emerald", "amber", "rose"]
                for i, part in enumerate(parts):
                    clean_part = part.strip().strip("[]()")
                    if clean_part:
                        tokens.append({
                            "role": f"Elemento {i+1}",
                            "pattern": clean_part,
                            "color": colors[i % len(colors)]
                        })
                gs["formula_tokens"] = tokens
            return gs

        # 2. Derive intelligent grammar structure from topic and curriculum node
        node = self._find_curriculum_node(topic, sublevel) or {}
        grammar_core = node.get("grammar_core") or ""

        target_audios = p.get("target_audio_items") or []
        first_audio = target_audios[0]["english"] if target_audios and isinstance(target_audios[0], dict) else (p.get("expected_answer") or "")

        low_top = topic.lower()
        if "phrasal" in low_top or "particle" in low_top or any(pt in low_top for pt in ["logic of out", "particle semantics", "three-part phrasal"]):
            return {
                "title": "Semántica Cognitiva: Estructura de Phrasal Verbs",
                "formula": "[ Sujeto ] + [ Verbo Base (Acción) ] + [ Partícula (Vector Metafórico) ] + [ Objeto / Complemento ]",
                "formula_tokens": [
                    {"role": "Sujeto", "pattern": "I / You / We / They / She", "color": "blue"},
                    {"role": "Verbo Base", "pattern": "find / figure / run / turn / clean", "color": "purple"},
                    {"role": "Partícula", "pattern": "OUT / UP / DOWN / OFF / ON", "color": "amber"},
                    {"role": "Complemento", "pattern": "the problem / the truth / coffee", "color": "emerald"}
                ],
                "explanation": "La partícula altera metafóricamente el verbo base orientando la acción hacia un vector espacial (salida, completitud, aumento o separación).",
                "example_breakdowns": [
                    {
                        "english": first_audio or "We figured out the solution.",
                        "spanish": "Resolvimos la solución.",
                        "parts": [
                            {"role": "Sujeto", "text": "We", "color": "blue"},
                            {"role": "Verbo", "text": "figured", "color": "purple"},
                            {"role": "Partícula", "text": "out", "color": "amber"},
                            {"role": "Complemento", "text": "the solution", "color": "emerald"}
                        ]
                    }
                ],
                "tips": "Identifica la fuerza espacial de la partícula en lugar de memorizar traducciones aisladas."
            }

        if "irregular past" in low_top or ("irregular" in low_top and "past" in low_top):
            return {
                "title": "Fórmula: Preguntas y Negaciones en Pasado (Did / Didn't)",
                "formula": "[ Did / Wh- + did ] + [ Sujeto ] + [ Verbo Base (V1) ] + [ Complemento ] ?",
                "formula_tokens": [
                    {"role": "Auxiliar", "pattern": "Did / What did", "color": "purple"},
                    {"role": "Sujeto", "pattern": "you / she / they", "color": "blue"},
                    {"role": "Verbo Base", "pattern": "go / see / buy", "color": "amber"},
                    {"role": "Complemento", "pattern": "yesterday / last night", "color": "emerald"}
                ],
                "explanation": "Después del auxiliar 'Did' o 'Didn't', el verbo principal siempre regresa a su forma base pura (V1).",
                "example_breakdowns": [
                    {
                        "english": "Did you see the movie yesterday?",
                        "spanish": "¿Viste la película ayer?",
                        "parts": [
                            {"role": "Auxiliar", "text": "Did", "color": "purple"},
                            {"role": "Sujeto", "text": "you", "color": "blue"},
                            {"role": "Verbo Base", "text": "see", "color": "amber"},
                            {"role": "Complemento", "text": "the movie yesterday", "color": "emerald"}
                        ]
                    }
                ],
                "tips": "NUNCA digas 'Did you went?'; usa siempre 'Did you go?'."
            }

        # Check key_structure if meaningful and not boilerplate
        key_struct = p.get("key_structure")
        if key_struct and isinstance(key_struct, str) and len(key_struct.strip()) > 3:
            raw = key_struct.strip()
            if not any(bad in raw for bad in ["Syntax Formula", "Core Pattern", "Mastery", "Practice", "Summary"]):
                parts = [pt.strip().strip("[]()") for pt in re.split(r'\s*\+\s*|\s*→\s*|\s*vs\s*|\s*\|\s*|\s*\/\s*', raw) if pt.strip()]
                colors = ["blue", "purple", "emerald", "amber", "rose"]
                tokens = [{"role": f"Parte {i+1}", "pattern": part, "color": colors[i % len(colors)]} for i, part in enumerate(parts)]
                return {
                    "title": f"Patrón Sintáctico: {raw}",
                    "formula": " + ".join([f"[ {t['pattern']} ]" for t in tokens]) if tokens else raw,
                    "formula_tokens": tokens if tokens else [{"role": "Estructura", "pattern": raw, "color": "blue"}],
                    "explanation": f"Estructura sintáctica clave para formular oraciones en esta fase.",
                    "example_breakdowns": [
                        {
                            "english": first_audio or "Example sentence",
                            "spanish": "Oración modelo",
                            "parts": [{"role": t["role"], "text": first_audio or "Example", "color": t["color"]} for t in tokens[:1]]
                        }
                    ] if first_audio else [],
                    "tips": "Mantén el orden sintáctico para asegurar coherencia y naturalidad."
                }

        # Fallback to grammar_core if available
        if grammar_core:
            return {
                "title": f"Estructura: {topic}",
                "formula": f"[ Sujeto ] + [ {grammar_core.split(',')[0]} ] + [ Complemento ]",
                "formula_tokens": [
                    {"role": "Sujeto", "pattern": "Sujeto / Pronombre", "color": "blue"},
                    {"role": "Estructura Clave", "pattern": grammar_core.split(',')[0], "color": "purple"},
                    {"role": "Complemento", "pattern": "Objeto / Tiempo / Lugar", "color": "emerald"}
                ],
                "explanation": f"Patrón gramatical fundamental de {topic}.",
                "example_breakdowns": [
                    {
                        "english": first_audio or "I practiced English today.",
                        "spanish": "Oración modelo",
                        "parts": [
                            {"role": "Sujeto", "text": "I", "color": "blue"},
                            {"role": "Acción", "text": "practiced", "color": "purple"},
                            {"role": "Complemento", "text": "English today", "color": "emerald"}
                        ]
                    }
                ] if first_audio else [],
                "tips": "Asegúrate de conjugar el verbo en el tiempo y persona correspondiente."
            }

        return None

    def _build_phase_storyboard(self, p: dict) -> list:
        """
        Deterministic storyboard generator synchronizing tutor speech with visual chalkboard elements.
        Breaks down the phase into a step-by-step progressive reveal sequence with sentence-exact timing.
        """
        tutor_speech = str(p.get("tutor_says") or "")
        has_task = bool(p.get("student_task") or p.get("expected_answer") or p.get("exercises"))

        # Append closing exercise transition prompt if missing
        s_low = tutor_speech.lower()
        if has_task and tutor_speech and not any(k in s_low for k in ["a continuación", "ejercicio", "resuelve", "completa", "desafío"]):
            tutor_speech = f"{tutor_speech.strip()} A continuación, verás unos ejercicios en la pizarra para poner en práctica lo aprendido."
            p["tutor_says"] = tutor_speech

        raw_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', tutor_speech) if s.strip()]
        sentence_words = [len(s.split()) for s in raw_sentences]
        total_words = max(sum(sentence_words), 1)

        board = str(p.get("board_content") or "")
        target_audios = p.get("target_audio_items") or []
        has_grammar = bool(p.get("grammar_structure") or p.get("key_structure"))
        has_phonetics = bool(p.get("phonetic_focus") or p.get("phoneme_symbol") or p.get("is_phonetic_bonus") or "fonét" in str(p.get("phase_name", "")).lower() or "bonus de pronunciación" in str(p.get("phase_name", "")).lower())
        has_middle = bool(p.get("diagram_svg") or has_grammar or has_phonetics)
        has_audio = bool(target_audios and not has_task)
        has_bottom = has_task or has_audio

        steps = []
        step_counter = 1

        # Step 1: Whiteboard & Concepts (Main Teaching Board - Top, always starts at 0.00)
        speech_snippet_1 = raw_sentences[0] if raw_sentences else (str(p.get("phase_name") or "Conceptos en Pizarra"))
        steps.append({
            "step_id": "step-concepts",
            "step_index": step_counter,
            "element_type": "concepts",
            "label": f"{step_counter}. {p.get('phase_name', 'Conceptos en Pizarra')}",
            "tutor_speech_snippet": speech_snippet_1,
            "trigger_ratio": 0.00,
            "animation": "typewriter",
            "highlight_target": "concepts",
            "chalk_color": "green"
        })
        step_counter += 1

        # Step 2: Diagram / Schema or Grammar Structure (Middle Zone - if present)
        if has_middle:
            elem_type = "diagram" if p.get("diagram_svg") else ("phonetics" if has_phonetics else "grammar")
            label_text = "Esquema Conceptual" if p.get("diagram_svg") else ("Foco Fonético" if has_phonetics else "Fórmula Gramatical")
            
            middle_idx = 1
            for idx, s in enumerate(raw_sentences[1:], 1):
                sl = s.lower()
                if any(kw in sl for kw in ["fórmula", "esquema", "diagrama", "estructura", "patrón", "línea", "fonét"]):
                    middle_idx = idx
                    break

            speech_snippet_2 = raw_sentences[middle_idx] if middle_idx < len(raw_sentences) else (raw_sentences[1] if len(raw_sentences) > 1 else "Observa la estructura y el esquema conceptual en la pizarra.")
            words_before_middle = sum(sentence_words[:middle_idx])
            calculated_ratio = words_before_middle / total_words
            trigger_ratio = max(0.35, min(0.65 if has_bottom else 0.80, calculated_ratio))

            steps.append({
                "step_id": f"step-{elem_type}",
                "step_index": step_counter,
                "element_type": elem_type,
                "label": f"{step_counter}. {label_text}",
                "tutor_speech_snippet": speech_snippet_2,
                "trigger_ratio": round(trigger_ratio, 2),
                "animation": "bounce_in",
                "highlight_target": elem_type,
                "chalk_color": "purple"
            })
            step_counter += 1

        # Step 3: Interactive Practice or Challenge (Bottom Zone - towards end of explanation)
        if has_bottom:
            elem_type = "exercise" if has_task else "audio_practice"
            label_text = "Desafío Interactivo" if has_task else "Práctica de Pronunciación"
            
            bottom_idx = len(raw_sentences) - 1
            for idx in range(len(raw_sentences) - 1, 0, -1):
                sl = raw_sentences[idx].lower()
                if any(kw in sl for kw in ["a continuación", "ejercicio", "resuelve", "completa", "práctica", "desafío"]):
                    bottom_idx = idx
                    break

            speech_snippet_3 = raw_sentences[bottom_idx] if bottom_idx < len(raw_sentences) else "A continuación, verás unos ejercicios en la pizarra para poner en práctica lo aprendido."
            words_before_bottom = sum(sentence_words[:bottom_idx])
            calculated_ratio = words_before_bottom / total_words
            trigger_ratio = max(0.60 if has_middle else 0.45, min(0.88, calculated_ratio))

            steps.append({
                "step_id": f"step-{elem_type}",
                "step_index": step_counter,
                "element_type": elem_type,
                "label": f"{step_counter}. {label_text}",
                "tutor_speech_snippet": speech_snippet_3,
                "trigger_ratio": round(trigger_ratio, 2),
                "animation": "spotlight_glow",
                "highlight_target": elem_type,
                "chalk_color": "gold"
            })

        return steps

    def _build_fallback_lesson(self, topic: str, sublevel: str, is_a_level: bool) -> dict:
        """Rich topic-specific lesson generator using curated high-pedagogy catalog."""
        from core.lesson_fallbacks import build_curated_fallback
        data = build_curated_fallback(topic, sublevel, is_a_level)

        for idx, p in enumerate(data.get("phases", [])):
            if idx == 0:
                p["is_hook"] = True
                if not p.get("hook_type"):
                    p["hook_type"] = "dilemma"
                if not p.get("hook_images") or not isinstance(p["hook_images"], list) or len(p["hook_images"]) == 0:
                    p["hook_images"] = [
                        {
                            "prompt": p.get("image_prompt") or f"A person contemplating everyday situations about {topic}, vibrant 2D vector art, no text",
                            "caption": f"Situación didáctica: {topic}",
                            "role": "hook_situation"
                        }
                    ]
            else:
                p["is_hook"] = False

            if not p.get("target_audio_items"):
                p["target_audio_items"] = self._extract_phase_target_audio_items(p)
            p["board_theme"] = "chalkboard_green"
            p["diagram_svg"] = self._resolve_didactic_diagram_svg(p, topic)
            p["storyboard_steps"] = self._build_phase_storyboard(p)
            p["grammar_structure"] = self._normalize_grammar_structure(p, topic, sublevel)
        
        data["topic"] = topic
        data["sublevel"] = sublevel
        data["level"] = sublevel.split(".")[0]
        data["subject"] = "English"
        return data

    def _normalize_spoken_numbers(self, text: str) -> str:
        """Normalizes digit transcriptions like '10', '1', '2' into written English words like 'ten', 'one', 'two'."""
        if not text or not isinstance(text, str):
            return ""
        num_map = {
            r'\b0\b': 'zero', r'\b1\b': 'one', r'\b2\b': 'two', r'\b3\b': 'three', r'\b4\b': 'four',
            r'\b5\b': 'five', r'\b6\b': 'six', r'\b7\b': 'seven', r'\b8\b': 'eight', r'\b9\b': 'nine',
            r'\b10\b': 'ten', r'\b11\b': 'eleven', r'\b12\b': 'twelve', r'\b13\b': 'thirteen',
            r'\b14\b': 'fourteen', r'\b15\b': 'fifteen', r'\b16\b': 'sixteen', r'\b17\b': 'seventeen',
            r'\b18\b': 'eighteen', r'\b19\b': 'nineteen', r'\b20\b': 'twenty', r'\b30\b': 'thirty',
            r'\b40\b': 'forty', r'\b50\b': 'fifty', r'\b60\b': 'sixty', r'\b70\b': 'seventy',
            r'\b80\b': 'eighty', r'\b90\b': 'ninety', r'\b100\b': 'one hundred'
        }
        res = text
        for pat, word in num_map.items():
            res = re.sub(pat, word, res, flags=re.IGNORECASE)
        return res

    async def evaluate_student_response(
        self,
        text: str,
        question: str,
        expected_answer: str,
        history: list,
        student_level: str = "A1.1",
    ) -> dict:
        """Evaluate student's answer strictly using MiniMax M3."""
        raw_text = text.strip()
        text_clean = self._normalize_spoken_numbers(raw_text)
        expected_normalized = self._normalize_spoken_numbers(expected_answer.strip()) if expected_answer else ""
        is_a_level = student_level.startswith("A1") or student_level.startswith("A2")

        text_lower = text_clean.lower()
        if any(m in text_lower for m in ["no entiendo", "repeat", "otra vez", "again", "explain again"]) and len(text_clean.split()) < 8:
            return {
                "intent": "RE_EXPLAIN",
                "transcript": raw_text,
                "pronunciation_score": 70,
                "grammar_score": 70,
                "relevance_score": 50,
                "overall_score": 50,
                "is_correct": False,
                "feedback": "Con gusto te explico de nuevo. Revisa la pizarra digital con los ejemplos.",
                "corrected_answer": expected_answer,
                "next_prompt": "Leamos la explicación de nuevo.",
            }

        question_lower = question.lower()
        is_pronunciation_task = (
            "repeat this" in question_lower or 
            "pronunci" in question_lower or 
            "pronunciation" in question_lower or
            "repetir" in question_lower or
            "repite" in question_lower
        )

        expected_ref = expected_normalized if expected_normalized else "Evaluar según el contexto de la oración y opciones dadas"
        user_prompt = (
            f"Student CEFR Level: {student_level}\n"
            f"Question Asked: {question}\n"
            f"Expected Answer (Reference): {expected_ref}\n"
            f"Student Answer Given (Speech Transcript): '{text_clean}' (Raw input: '{raw_text}')\n"
            f"Is Spoken/Pronunciation Repetition Task: {'YES' if is_pronunciation_task else 'NO'}\n\n"
            f"INSTRUCTIONS:\n"
            f"1. Evaluate if '{text_clean}' is a correct and appropriate answer for the question asked.\n"
            f"2. CRITICAL - SPEECH RECOGNITION DIGIT NORMALIZATION: Browser Speech-to-Text converts spoken numbers into digits (e.g. 'ten' -> '10', 'two' -> '2', 'three' -> '3'). If the target is 'ten' and the transcript was '10' or 'ten', it is 100% CORRECT! NEVER say 'escribiste el número en vez de la palabra'. Give 95-100% score for correct spoken words that transcribed as numbers.\n"
            f"3. CRITICAL - MULTIPLE CHOICE / OPTIONS: If the question contains options (e.g., [option1 / option2] or 'Opciones: ...'), check if the student chose the grammatically and contextually correct option. If the student selected the right choice (e.g. 'shows up' for 'He always ________ late when we have a call. [shows up / hangs up]'), mark is_correct = true and overall_score = 90-100.\n"
            f"4. If the student chose an incorrect option or answered something wrong/incomplete, mark is_correct = false and overall_score < 50, explaining clearly in the feedback why their choice doesn't fit and what option was correct.\n"
            f"5. Provide feedback in {'SPANISH' if is_a_level else 'ENGLISH'} explaining grammar, meaning, and nuances clearly.\n"
            f"6. If 'Is Spoken/Pronunciation Repetition Task' is YES, ignore punctuation and capitalization completely."
        )

        try:
            raw = await self._chat(EVALUATION_SYSTEM_PROMPT, user_prompt, thinking="adaptive")
            result = clean_json_response(raw)

            return {
                "intent": result.get("intent", "ANSWER"),
                "transcript": raw_text,
                "pronunciation_score": result.get("pronunciation_score", 80 if result.get("is_correct") else 40),
                "grammar_score": result.get("grammar_score", 85 if result.get("is_correct") else 35),
                "relevance_score": result.get("relevance_score", 90 if result.get("is_correct") else 30),
                "overall_score": result.get("overall_score", 80 if result.get("is_correct") else 30),
                "is_correct": bool(result.get("is_correct", False)),
                "feedback": result.get("feedback", "Inténtalo de nuevo."),
                "corrected_answer": result.get("corrected_answer", expected_answer),
                "next_prompt": result.get("next_prompt", "Continuemos."),
            }
        except Exception as e:
            logger.error(f"Evaluation error: {e}")
            matches = self._strict_local_match(text_clean, expected_normalized)
            return {
                "intent": "ANSWER",
                "transcript": raw_text,
                "pronunciation_score": 80 if matches else 40,
                "grammar_score": 85 if matches else 30,
                "relevance_score": 90 if matches else 30,
                "overall_score": 80 if matches else 35,
                "is_correct": matches,
                "feedback": "¡Muy bien! Tu respuesta es correcta." if matches else f"La respuesta no es correcta. La respuesta esperada era: '{expected_answer}'.",
                "corrected_answer": expected_answer,
                "next_prompt": "Pasemos a la siguiente parte.",
            }

    def _strict_local_match(self, student: str, expected: str) -> bool:
        """Strict match checker with number normalization."""
        if not student or len(student) < 1:
            return False
        s = self._normalize_spoken_numbers(re.sub(r'[^\w\s]', '', student.lower()).strip())
        e = self._normalize_spoken_numbers(re.sub(r'[^\w\s]', '', expected.lower()).strip())
        if not e:
            return True
        if s == e or e in s or s in e:
            return True
        words_e = [w for w in e.split() if len(w) > 2]
        if words_e and all(w in s for w in words_e):
            return True
        return False

    async def generate_learning_map(self, student_profile: dict, start_level: str) -> dict:
        """Generate a complete personalized learning map from start_level to B2.4."""
        level_desc = SUBLEVEL_DESCRIPTIONS.get(start_level, start_level)
        user = (
            f"Generate a complete learning map for this student:\n"
            f"Starting level: {start_level} ({level_desc})\n"
            f"Goal: B2.4 (Full mastery)\n"
            f"Student weak areas: {student_profile.get('weak_areas', [])}\n"
            f"Native language: {student_profile.get('native_language', 'Spanish')}\n\n"
            f"Include ALL sublevels from {start_level} to B2.4. "
            f"Generate 4-6 modules per sublevel. Personalize module topics based on weak areas."
        )
        try:
            raw = await self._chat(LEARNING_MAP_SYSTEM_PROMPT, user, thinking="enabled")
            return clean_json_response(raw)
        except Exception as e:
            logger.error(f"Learning map generation error: {e}")
            return self._fallback_learning_map(start_level)

    def _fallback_learning_map(self, start_level: str) -> dict:
        """Returns a minimal fallback map if M3 fails."""
        start_idx = LEVEL_SEQUENCE.index(start_level) if start_level in LEVEL_SEQUENCE else 0
        remaining = LEVEL_SEQUENCE[start_idx:]
        modules = []

        sublevel_topics = {
            "A1.1": [
                ("Saludos y Presentaciones", "Greetings and Introductions"),
                ("Objetos Cotidianos y Colores", "Everyday Objects and Colors"),
                ("Números y La Hora", "Numbers and Time"),
                ("La Familia y Personas", "Family and People"),
            ],
            "A1.2": [
                ("Rutinas Diarias - Presente Simple", "Daily Routines - Present Simple"),
                ("Días de la Semana y Meses", "Days of the Week and Months"),
                ("Comidas y Bebidas", "Food and Drinks"),
                ("Preguntas Básicas (Where, What, Who)", "Basic Questions"),
            ],
            "A1.3": [
                ("Lugares en la Ciudad", "Places in the City"),
                ("Verbo CAN y Habilidades", "Verbs and Abilities"),
                ("Ropa y Compras", "Clothes and Shopping"),
                ("Describir el Clima", "Weather Description"),
            ],
        }

        for i, sublevel in enumerate(remaining):
            topics = sublevel_topics.get(sublevel, [
                (f"Gramática {sublevel}", f"Grammar Topic {sublevel}"),
                (f"Vocabulario {sublevel}", f"Vocabulary Topic {sublevel}"),
                (f"Conversación {sublevel}", f"Conversation Topic {sublevel}"),
                (f"Práctica de Lectura {sublevel}", f"Reading Topic {sublevel}"),
            ])
            for j, (title_es, topic_en) in enumerate(topics):
                modules.append({
                    "module_id": f"{sublevel.lower().replace('.', '')}-{j+1:02d}",
                    "sublevel": sublevel,
                    "level_group": sublevel[:2],
                    "title": title_es,
                    "topic": topic_en,
                    "type": "grammar" if j % 2 == 0 else "vocabulary",
                    "estimated_minutes": 20,
                    "status": "current" if (i == 0 and j == 0) else "locked",
                    "prerequisites": [],
                    "description": f"Aprende {title_es} en nivel {sublevel}",
                    "unlock_condition": "Puntaje lección >= 70",
                })
        return {
            "total_modules": len(modules),
            "estimated_total_hours": len(modules) * 20 // 60,
            "modules": modules,
            "milestones": [
                {"at_sublevel": "A1.4", "title": "¡Nivel A1 Completado!", "description": "Puedes desenvolverte en situaciones básicas de inglés"},
                {"at_sublevel": "A2.4", "title": "¡Nivel A2 Logrado!", "description": "Comunicación en situaciones cotidianas y viajes"},
                {"at_sublevel": "B1.4", "title": "¡Nivel B1 Desbloqueado!", "description": "Hablante de inglés independiente"},
                {"at_sublevel": "B2.4", "title": "¡Nivel B2 Dominado!", "description": "Fluidez avanzada en inglés profesional"},
            ],
        }

    async def adapt_difficulty(self, current_performance: dict, student_profile: dict) -> str:
        """Decide the next difficulty sublevel based on performance."""
        current = student_profile.get("current_sublevel", "A1.1")
        score = current_performance.get("overall_score", 75)

        if score >= 85:
            idx = LEVEL_SEQUENCE.index(current) if current in LEVEL_SEQUENCE else 0
            return LEVEL_SEQUENCE[min(idx + 1, len(LEVEL_SEQUENCE) - 1)]
        elif score < 50:
            idx = LEVEL_SEQUENCE.index(current) if current in LEVEL_SEQUENCE else 0
            return LEVEL_SEQUENCE[max(idx - 1, 0)]
        else:
            return current
