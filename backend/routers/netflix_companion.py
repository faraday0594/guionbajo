"""
Guionbajo — Netflix AI Companion Router
Powers real-time pedagogical explanations of Netflix scenes, subtitle analysis,
masterclass generation (10-15 idioms/phrasal verbs + verb tense deep-dives),
and voice synthesis for authenticated Guionbajo students.
"""
import os
import json
import base64
import re
import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import io
import zipfile
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from config import settings
from database import get_db
from auth.dependencies import get_current_user
from models.user import User
from models.lesson import LessonHistory
from core.tts_service import synthesize_speech

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/netflix", tags=["netflix_companion"])

# In-memory scene cache to avoid duplicate LLM calls on repeated pauses
SCENE_CACHE: Dict[str, Dict[str, Any]] = {}

def get_ai_client() -> AsyncOpenAI:
    """Returns an AsyncOpenAI client configured for MiniMax or compatible LLM."""
    api_key = settings.MINIMAX_API_KEY
    base_url = settings.MINIMAX_BASE_URL or "https://api.minimax.io/v1"
    
    if not api_key or len(api_key) < 10:
        api_key = "dummy-key"
    
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


# ══════════════════════════════════════════════════════════════════════════════
# REQUEST & RESPONSE SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class AskSceneRequest(BaseModel):
    current_subtitle: str = Field(..., description="The subtitle line currently shown on screen in English")
    context_before: Optional[List[str]] = Field(default=[], description="Previous 2-3 subtitle lines for context")
    student_question: Optional[str] = Field(default=None, description="Optional custom question from student")
    student_level: Optional[str] = Field(default="B1", description="CEFR level (A1, A2, B1, B2, C1)")
    show_title: Optional[str] = Field(default="Netflix Series", description="Name of the movie or show")
    voice_id: Optional[str] = Field(default="es-US-AlonsoNeural", description="Voice ID for spoken explanation")


class MasterClassRequest(BaseModel):
    show_title: str = Field(default="Netflix Series")
    episode_title: Optional[str] = Field(default="Episodio")
    subtitles_sample: str = Field(..., description="Sample of dialog lines or transcript from the episode")
    student_level: Optional[str] = Field(default="B1")
    voice_id: Optional[str] = Field(default="es-US-AlonsoNeural")


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/status")
async def netflix_companion_status():
    """Health check endpoint for the Chrome Extension to test connection."""
    has_key = bool(settings.MINIMAX_API_KEY and len(settings.MINIMAX_API_KEY) > 10)
    return {
        "status": "connected",
        "service": "Guionbajo Netflix AI Companion",
        "llm_engine": settings.MINIMAX_LLM_MODEL,
        "llm_ready": has_key,
        "auth_required": True,
        "version": "2.0.0"
    }


@router.post("/ask-scene")
async def ask_netflix_scene(
    req: AskSceneRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes a specific scene/dialogue paused by the student on Netflix.
    Requires student authentication.
    Identifies phrasal verbs, idioms, slang, or grammatical nuances,
    explains them concisely in Spanish adapted to the student's level,
    and returns a base64-encoded audio clip of the AI Tutor explaining it.
    """
    current_sub = (req.current_subtitle or "").strip()
    if not current_sub:
        raise HTTPException(status_code=400, detail="current_subtitle cannot be empty")

    user_level = req.student_level or "B1"
    cache_key = f"{current_sub}_{user_level}_{req.student_question or ''}"
    if cache_key in SCENE_CACHE:
        return SCENE_CACHE[cache_key]

    context_str = " | ".join(req.context_before[-3:]) if req.context_before else "Sin contexto previo"
    user_q = req.student_question.strip() if req.student_question else "Explica el modismo o frase clave en esta escena."

    system_prompt = f"""Eres el AI Tutor de Guionbajo, un experto profesor de inglés bilingüe, dinámico y pedagógico.
El estudiante {current_user.name} está viendo '{req.show_title}' en Netflix y acaba de pausar esta escena.
Nivel del estudiante: {user_level}.

Líneas previas de contexto: "{context_str}"
Subtítulo que el personaje acaba de decir: "{current_sub}"
Pregunta o interés del estudiante: "{user_q}"

Tu misión:
1. Detectar si hay un PHRASAL VERB, IDIOM, SLANG o EXPRESIÓN COLOQUIAL en la frase. Si es una frase regular, identifica la estructura gramatical clave o tiempo verbal.
2. Explicar brevemente (máximo 2 oraciones en español claro) qué significa en este momento exacto de la serie.
3. Dar 1 ejemplo práctico y cotidiano en inglés con su traducción al español.
4. Si la frase contiene un tiempo verbal particular (ej: Future with will, Present Perfect, etc.), menciona brevemente por qué el personaje lo usó.
5. Redactar lo que le dirás en voz alta al estudiante (tutor_speech_text): debe sonar natural, empático y pedagógico, durando entre 8 y 15 segundos al hablar.

IMPORTANTE: Responde ÚNICAMENTE un objeto JSON válido con esta estructura exacta (sin markdown adicional):
{{
  "key_term": "expresión o término clave identificado",
  "term_type": "phrasal_verb | idiom | slang | grammar | vocabulary",
  "meaning_es": "Significado conciso en español",
  "scene_context": "Breve explicación de por qué el personaje lo usa en esta escena",
  "practical_example_en": "Ejemplo cotidiano en inglés",
  "practical_example_es": "Traducción al español del ejemplo",
  "tutor_speech_text": "Texto que leerá el tutor en voz alta al estudiante."
}}
"""

    parsed_result = None
    client = get_ai_client()

    try:
        completion = await client.chat.completions.create(
            model=settings.MINIMAX_LLM_MODEL or "MiniMax-M3",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analiza esta línea de Netflix: '{current_sub}'"}
            ],
            temperature=0.3,
            max_tokens=600,
            extra_body={"thinking": {"type": "disabled"}}
        )
        raw_text = completion.choices[0].message.content or "{}"
        
        # Clean thinking blocks and markdown fences
        clean_text = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
        clean_text = re.sub(r"^```json\s*", "", clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r"^```\s*", "", clean_text)
        clean_text = re.sub(r"```$", "", clean_text).strip()
        
        json_match = re.search(r"\{.*\}", clean_text, flags=re.DOTALL)
        if json_match:
            clean_text = json_match.group(0)

        parsed_result = json.loads(clean_text)
    except Exception as e:
        logger.warning(f"Error calling LLM for Netflix scene: {e}")
        parsed_result = {
            "key_term": current_sub,
            "term_type": "vocabulary",
            "meaning_es": "Expresión clave del diálogo",
            "scene_context": f"Frase dicha en la escena: \"{current_sub}\"",
            "practical_example_en": current_sub,
            "practical_example_es": "Frase de la serie",
            "tutor_speech_text": f"Has seleccionado la frase: '{current_sub}'. Analicémosla juntos."
        }

    # Generate Speech Audio (TTS)
    speech_text = parsed_result.get("tutor_speech_text") or parsed_result.get("meaning_es")
    audio_base64 = ""
    try:
        audio_bytes = await synthesize_speech(
            text=speech_text,
            voice_id=req.voice_id or "es-US-AlonsoNeural"
        )
        if audio_bytes and len(audio_bytes) > 200:
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        logger.warning(f"Error synthesizing audio for Netflix scene: {e}")

    response_payload = {
        "status": "success",
        "current_subtitle": current_sub,
        "key_term": parsed_result.get("key_term", current_sub),
        "term_type": parsed_result.get("term_type", "vocabulary"),
        "meaning_es": parsed_result.get("meaning_es", ""),
        "scene_context": parsed_result.get("scene_context", ""),
        "practical_example_en": parsed_result.get("practical_example_en", ""),
        "practical_example_es": parsed_result.get("practical_example_es", ""),
        "tutor_speech_text": speech_text,
        "audio_base64": audio_base64,
        "student_level": user_level,
        "student_name": current_user.name,
    }

    if len(SCENE_CACHE) > 100:
        SCENE_CACHE.clear()
    SCENE_CACHE[cache_key] = response_payload

    return response_payload


@router.post("/generate-full-class")
async def generate_netflix_full_class(
    req: MasterClassRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a full pedagogical Masterclass for the Netflix episode:
    1. Selects 10 to 15 essential Phrasal Verbs, Idioms, and Semi-Advanced Vocabulary.
    2. Deep dives into 3 to 4 real spoken sentences from the episode containing specific Verb Tenses,
       explaining the structure, formula, why that tense was chosen, and an interactive quiz.
    3. Synthesizes an introductory audio lesson.
    4. Saves the generated Masterclass in Guionbajo's database under the student's history.
    """
    sample = (req.subtitles_sample or "").strip()[:35000]
    has_rich_sample = len(sample.splitlines()) >= 6 and len(sample) >= 120

    user_level = req.student_level or "B1"

    system_prompt = f"""Eres el Diseñador Pedagógico Master de Guionbajo.
El estudiante {current_user.name} va a ver o está estudiando con el capítulo de la serie de Netflix: '{req.show_title}' ({req.episode_title}).
Nivel del estudiante: {user_level}.

Tu misión es crear una CLASE MAESTRA PREVIA (Pre-watch Masterclass) de alto valor pedagógico para preparar al estudiante ANTES o DURANTE el visionado de este capítulo.

REGLAS CRÍTICAS DE SELECCIÓN Y CONTENIDO:
1. AUTENTICIDAD TOTAL BASADA EN EL GUION REAL DEL CAPÍTULO:
   - CADA UNA DE LAS 10 A 15 EXPRESIONES, PHRASAL VERBS Y MODISMOS DEBE HABER SIDO DICHA LITERALMENTE POR LOS PERSONAJES EN LOS DIÁLOGOS REALES PROPORCIONADOS DE ESTE EPISODIO.
   - NUNCA inventes frases o expresiones ajenas al guion. El estudiante está viendo este episodio y debe reconocer las expresiones exactamente cuando los actores las digan en pantalla.
   - PROHIBIDO ANCLARTE A MULETILLAS O ADVERBIOS TRIVIALES: NUNCA elijas palabras de relleno básico como "not necessarily", "of course", "yes", "no", "really", "maybe", "I think so", "come on", "hello", "thank you", "well". Extrae verdaderos Phrasal Verbs (ej: 'look out for', 'figure out', 'turn down', 'back off', 'run into', 'screw up', 'freak out'), idioms coloquiales y giros lingüísticos auténticos presentes en el texto.

2. SECCIÓN VOCABULARIO (EXACTAMENTE ENTRE 10 Y 15 ELEMENTOS):
   - Selecciona exactamente entre 10 y 15 expresiones que incluyan:
     * Phrasal Verbs auténticos de nivel B1 a C1 dichos en el episodio.
     * Idioms y modismos coloquiales de alto impacto dichos en el episodio.
     * Vocabulario semi-avanzado, sustantivos clave, adjetivos y adverbios ricos del texto.
   - Para CADA elemento incluye:
     * term: La expresión o phrasal verb en inglés tal como aparece en los diálogos.
     * type: "phrasal_verb" | "idiom" | "noun" | "adjective" | "adverb" | "semi_advanced".
     * meaning_es: Significado preciso en español.
     * scene_context: Cómo y en qué contexto dramático o escena del capítulo se utiliza.
     * tutor_speech_text: Explicacion hablada entusiasta del tutor en espanol (2 a 3 oraciones, entre 35 y 55 palabras), explicando la expresion, su matiz y como usarla en la vida real. REGLA OBLIGATORIA: PROHIBIDO decir el nombre del estudiante o decir saludos (NUNCA digas 'Hola {current_user.name}' ni menciones su nombre). El saludo ya se hizo en la introduccion. Ve directo a explicar la expresion.
     * image_prompt: Prompt en inglés para generar una ilustración 2D ÚNICA Y DISTINTA PARA CADA EXPRESIÓN.
       REGLA OBLIGATORIA DE IMAGEN:
       - Para CADA expresión debes crear un prompt visual totalmente diferente que describa una escena concreta de la acción o situación (ej: para 'turn your back' describe a un personaje alejándose de espaldas de una asamblea en la penumbra; para 'have someone's word' describe a dos personas estrechándose la mano con lealtad; para 'give up' describe a alguien exhausto a punto de abandonar).
       - EXCEPCIÓN CUANDO LA EXPRESIÓN ES DEMASIADO ABSTRACTA O COMPLEJA: Si consideras que la expresión es demasiado abstracta o difícil de representar visualmente en una escena física (por ejemplo conectores, adverbios o modismos metafóricos oscuros), el prompt DEBE describir a un estudiante estudiando inglés con concentración y entusiasmo en su escritorio moderno con audífonos, laptop y libreta ('A focused student happily studying English with headphones, notebook and laptop at a cozy study desk').
       - EN TODOS LOS CASOS: Completamente sin texto, sin letras, sin palabras escritas, sin letreros (completely textless, zero text, clean flat 2D vector educational illustration).
     * simulated_events: EXACTAMENTE 2 eventos/situaciones donde se use la expresión:
       - Evento 1: Cita la frase real exacta y escena concreta del capítulo donde se dijo la expresión.
       - Evento 2: Un ejemplo práctico en la vida cotidiana/trabajo/estudio con su oración en inglés y traducción al español.

3. SECCIÓN GRAMÁTICA Y TIEMPOS VERBALES EN DIÁLOGO (3 A 4 ORACIONES):
   - CITA TEXTUAL EXACTA: Selecciona 3 o 4 oraciones auténticas dichas textualmente por los personajes en estos diálogos que utilicen tiempos verbales específicos (Future Simple para promesas/decisiones, Present Perfect, Past Continuous para acciones interrumpidas, Condicionales, Verbos Modales).
   - Para cada oración explica con rigor pedagógico:
     * dialogue_sentence: La oración en inglés (copiada exactamente de los diálogos).
     * verb_tense: Nombre del tiempo verbal.
     * formula: Estructura gramatical paso a paso.
     * why_this_tense: Por qué el personaje usó este tiempo verbal específico aquí y qué intención comunicativa transmite.
     * contrast_explanation: Qué matiz cambiaría si usara otro tiempo verbal.
     * tutor_speech_text: Explicación hablada amigable en español (2 oraciones) explicando el tiempo verbal.
     * quiz: Mini-quiz interactivo con question, options (3 opciones), correct_index y explanation.

4. INTRODUCCIÓN HABLADA DEL TUTOR:
   - Redacta una introducción enérgica y motivadora de 3 oraciones en español donde el tutor saluda al alumno por su nombre ({current_user.name}), le presenta la Masterclass de '{req.show_title}' y lo anima a dominar estas expresiones antes de seguir viendo el show.

5. REGLA ESTRICTA DE MENCIONES DEL NOMBRE:
   - El nombre '{current_user.name}' SOLO se menciona UNA VEZ en toda la clase: en 'tutor_intro_speech'.
   - En las 10 a 15 slides de vocabulario y en las slides de gramatica, esta TOTALMENTE PROHIBIDO saludar de nuevo o decir el nombre del estudiante. El tutor debe sonar agil, directo y profesional.

Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{{
  "class_title": "Masterclass: {req.show_title} — {req.episode_title}",
  "show_title": "{req.show_title}",
  "episode_title": "{req.episode_title}",
  "student_level": "{user_level}",
  "summary": "Resumen pedagógico de 2 líneas sobre la clase",
  "tutor_intro_speech": "Texto que leerá el tutor en voz alta saludando al estudiante",
  "vocabulary_list": [
    {{
      "term": "expresión o phrasal verb",
      "type": "phrasal_verb | idiom | noun | adjective | adverb | semi_advanced",
      "meaning_es": "Definición en español",
      "scene_context": "Cómo se usa en la serie",
      "tutor_speech_text": "Breve explicación pedagógica hablada en español (2 a 3 oraciones) de esta expresión",
      "image_prompt": "Prompt visual en inglés ÚNICO para esta expresión específica (o de estudiante estudiando si es abstracta), clean flat 2D vector educational illustration, completely textless scene, zero text, no words, no letters",
      "simulated_events": [
        {{
          "event_name": "Evento 1: En la serie (Cita real)",
          "sentence_en": "Oración real dicha en el capítulo",
          "sentence_es": "Traducción al español",
          "situation_note": "Momento de la escena"
        }},
        {{
          "event_name": "Evento 2: En la vida cotidiana / Trabajo",
          "sentence_en": "Segunda oración cotidiana en inglés",
          "sentence_es": "Traducción al español",
          "situation_note": "Situación cotidiana"
        }}
      ]
    }}
  ],
  "grammar_verb_tenses": [
    {{
      "dialogue_sentence": "Oración textual dicha en el capítulo (ej: She said she was trying to help us)",
      "verb_tense": "Past Continuous (was/were + verb-ing)",
      "formula": "Subject + was/were + verb-ing + complement",
      "why_this_tense": "Explicación de por qué el personaje usó este tiempo verbal específico aquí",
      "contrast_explanation": "Qué significaría si hubiera usado past simple",
      "tutor_speech_text": "Breve explicación hablada en español por el tutor de este tiempo verbal",
      "quiz": {{
        "question": "Pregunta de aplicación práctica",
        "options": ["Opción A", "Opción B", "Opción C"],
        "correct_index": 0,
        "explanation": "Por qué es la opción correcta"
      }}
    }}
  ]
}}
"""

    if has_rich_sample:
        user_prompt_content = f"""AQUÍ TIENES EL GUION Y DIÁLOGOS REALES DE ESTE CAPÍTULO DE '{req.show_title}' ({req.episode_title}):
======================================================================
{sample}
======================================================================

INSTRUCCIONES DE EXTRACCIÓN OBLIGATORIAS:
1. Extrae entre 10 y 15 phrasal verbs, idioms y vocabulario auténtico que aparezcan REALMENTE en los diálogos anteriores.
2. Descarta cualquier muletilla o adverbio trivial como 'not necessarily', 'of course', 'really', 'maybe'. Busca términos con verdadero valor pedagógico (phrasal verbs y modismos ricos).
3. En la sección gramatical, las oraciones en 'dialogue_sentence' DEBEN ser citas textuales exactas dichas por los personajes en los diálogos anteriores."""
    else:
        user_prompt_content = f"El estudiante {current_user.name} está preparándose para ver el capítulo de la serie '{req.show_title}' ({req.episode_title}). Genera la Masterclass pre-watch completa con 10 a 15 phrasal verbs, idioms y vocabulario semi-avanzado característico de esta serie y su trama (sin anclarte a frases triviales)."

    client = get_ai_client()
    try:
        completion = await client.chat.completions.create(
            model=settings.MINIMAX_LLM_MODEL or "MiniMax-M3",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt_content}
            ],
            temperature=0.3,
            max_tokens=8192,
            extra_body={"thinking": {"type": "disabled"}}
        )
        raw_text = completion.choices[0].message.content or "{}"
        from core.minimax_agent import clean_json_response
        masterclass_data = clean_json_response(raw_text)
    except Exception as e:
        logger.error(f"Error generating full masterclass for {req.show_title}: {e}")
        # Fallback structured class for Vikings / Drama
        masterclass_data = {
            "class_title": f"Masterclass: {req.show_title}",
            "show_title": req.show_title,
            "episode_title": req.episode_title,
            "student_level": user_level,
            "summary": f"Domina los modismos y tiempos verbales clave de {req.show_title}.",
            "tutor_intro_speech": f"¡Hola {current_user.name}! Hoy vamos a analizar los diálogos de {req.show_title}. Aprenderemos modismos de lealtad y el uso del futuro simple en promesas. ¡Comencemos!",
            "vocabulary_list": [
                {
                    "term": "have someone's word",
                    "type": "idiom",
                    "meaning_es": "tener la palabra o promesa solemne de alguien",
                    "scene_context": "Usado en pactos y alianzas de honor",
                    "tutor_speech_text": "La expresión 'have someone's word' significa contar con la promesa solemne de alguien. En la serie, representa la lealtad absoluta entre líderes vikingos. Úsala en la vida diaria cuando hagas un acuerdo formal de palabra.",
                    "image_prompt": "Two Nordic allies shaking hands firmly inside an ancient stone longhouse by firelight, symbolic gesture of honor and oath, clean flat 2D vector educational illustration, zero text, completely textless scene, no words, no letters",
                    "simulated_events": [
                        {
                            "event_name": "Evento 1: En la serie / Alianza",
                            "sentence_en": "You have my word, we will sail west together.",
                            "sentence_es": "Tienes mi palabra, navegaremos hacia el oeste juntos.",
                            "situation_note": "Pacto solemne entre líderes"
                        },
                        {
                            "event_name": "Evento 2: Vida cotidiana / Trabajo",
                            "sentence_en": "You have my word that the project will be delivered on Friday.",
                            "sentence_es": "Tienes mi palabra de que el proyecto se entregará el viernes.",
                            "situation_note": "Compromiso profesional"
                        }
                    ]
                },
                {
                    "term": "stand by someone",
                    "type": "phrasal_verb",
                    "meaning_es": "apoyar o mantenerse fiel a alguien en momentos difíciles",
                    "scene_context": "Lealtad entre guerreros y aliados",
                    "tutor_speech_text": "El phrasal verb 'stand by someone' describe la lealtad incondicional: estar al lado de un amigo cuando las cosas se ponen difíciles. ¡Una frase esencial para hablar de amistad y apoyo mutuo!",
                    "image_prompt": "Loyal companions standing side by side facing a stormy horizon, comradeship and solidarity, clean flat 2D vector educational illustration, zero text, completely textless scene, no words, no letters",
                    "simulated_events": [
                        {
                            "event_name": "Evento 1: En la serie / Lealtad",
                            "sentence_en": "A true warrior always stands by his chief.",
                            "sentence_es": "Un verdadero guerrero siempre apoya a su jefe.",
                            "situation_note": "Fidelidad en el combate"
                        },
                        {
                            "event_name": "Evento 2: Vida cotidiana / Amistad",
                            "sentence_en": "She stood by her best friend through all the hard times.",
                            "sentence_es": "Ella apoyó a su mejor amiga en todos los momentos difíciles.",
                            "situation_note": "Apoyo incondicional"
                        }
                    ]
                },
                {
                    "term": "give up",
                    "type": "phrasal_verb",
                    "meaning_es": "rendirse o darse por vencido",
                    "scene_context": "Discusiones sobre persistir en la batalla",
                    "tutor_speech_text": "'Give up' es el phrasal verb por excelencia para expresar rendirse o tirar la toalla. En la serie, persistir lo es todo ante el enemigo. Y en tu aprendizaje del inglés: ¡nunca te rindas!",
                    "image_prompt": "A climbing explorer reaching the summit of a mountain under sunlight, determination, clean flat 2D vector educational illustration, zero text, completely textless scene, no words, no letters",
                    "simulated_events": [
                        {
                            "event_name": "Evento 1: En la serie / Batalla",
                            "sentence_en": "We have rowed across the sea; we cannot give up now.",
                            "sentence_es": "Hemos remado a través del mar; no podemos rendirnos ahora.",
                            "situation_note": "Determinación en la travesía"
                        },
                        {
                            "event_name": "Evento 2: Vida cotidiana / Metas",
                            "sentence_en": "English is difficult, but I will never give up.",
                            "sentence_es": "El inglés es difícil, pero nunca me rendiré.",
                            "situation_note": "Superación personal"
                        }
                    ]
                }
            ],
            "grammar_verb_tenses": [
                {
                    "dialogue_sentence": "And I have Ragnar's word that we will all be equal.",
                    "verb_tense": "Future Simple (will + base verb)",
                    "formula": "Subject + will + base verb + complement",
                    "why_this_tense": "El personaje usa 'will' para expresar una promesa solemne y un compromiso inquebrantable sobre el futuro.",
                    "contrast_explanation": "Si usara 'are going to be', sonaría a un plan ordinario, pero 'will' le da el peso de un juramento de honor.",
                    "tutor_speech_text": "Observa con atención: 'we will all be equal'. Se usa el futuro simple con 'will' para sellar una promesa formal y solemne. No es solo un plan a futuro, es un juramento de lealtad.",
                    "quiz": {
                        "question": "¿Por qué se usó 'will' en 'we will all be equal'?",
                        "options": ["Para hacer una promesa solemne y formal", "Para hablar de una rutina del pasado", "Para dar una orden inmediata"],
                        "correct_index": 0,
                        "explanation": "En inglés formal y literario, 'will' expresa promesas firmes y juramentos."
                    }
                }
            ]
        }

    # Generate Intro Audio
    intro_speech = masterclass_data.get("tutor_intro_speech", "")
    audio_base64 = ""
    if intro_speech:
        try:
            audio_bytes = await synthesize_speech(
                text=intro_speech,
                voice_id=req.voice_id or "es-US-AlonsoNeural"
            )
            if audio_bytes and len(audio_bytes) > 200:
                audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        except Exception as e:
            logger.warning(f"Error synthesizing masterclass intro audio: {e}")

    masterclass_data["audio_intro_base64"] = audio_base64

    # REGLA: Cada slide debe tener su propia imagen única y concreta.
    # Si la expresión es abstracta/compleja, se crea la imagen de un estudiante estudiando.
    vocab_items = masterclass_data.get("vocabulary_list", [])
    seen_prompts = set()
    for item in vocab_items:
        term = item.get("term", "").strip()
        img_p = (item.get("image_prompt") or "").strip()
        
        is_generic = (
            not img_p
            or img_p in seen_prompts
            or "visual representation of the concept" in img_p.lower()
            or len(img_p) < 30
        )
        
        if is_generic:
            abstract_terms = {"furthermore", "nevertheless", "to no avail", "by and large", "all in all", "meanwhile", "moreover", "as a matter of fact", "at any rate", "in the long run"}
            is_abstract = any(ab in term.lower() for ab in abstract_terms) or item.get("type") in ("adverb", "conjunction")
            
            if is_abstract:
                item["image_prompt"] = (
                    "A focused and cheerful student happily studying English with headphones, notebook and laptop at a modern study desk, "
                    "clean flat 2D vector educational illustration, zero text, completely textless scene, vibrant colors, strictly no text, no words, no letters"
                )
            else:
                ctx = item.get("scene_context") or item.get("meaning_es") or f"action of {term}"
                item["image_prompt"] = (
                    f"A specific 2D visual scene illustrating '{term}' in action: {ctx}, "
                    f"clean flat 2D vector educational illustration, zero text, completely textless scene, vibrant colors, minimalist art style, strictly no text, no words, no letters"
                )
        seen_prompts.add(item.get("image_prompt"))

    # Pre-synthesize speech for the first vocabulary slide for 0ms initial delay
    if vocab_items and len(vocab_items) > 0:
        first_item = vocab_items[0]
        first_speech = first_item.get("tutor_speech_text") or f"La expresión {first_item.get('term')} significa {first_item.get('meaning_es')}."
        try:
            audio_bytes = await synthesize_speech(
                text=first_speech,
                voice_id=req.voice_id or "es-US-AlonsoNeural"
            )
            if audio_bytes and len(audio_bytes) > 200:
                first_item["audio_base64"] = base64.b64encode(audio_bytes).decode("utf-8")
        except Exception as e:
            logger.warning(f"Error pre-synthesizing first slide audio: {e}")

    # Save to Guionbajo Database (LessonHistory)
    try:
        lesson_record = LessonHistory(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            topic=masterclass_data.get("class_title", f"Netflix: {req.show_title}"),
            level=user_level[:2] if len(user_level) >= 2 else "B1",
            sublevel=user_level,
            archetype="netflix_masterclass",
            overall_score=100,
            phases_completed=len(masterclass_data.get("vocabulary_list", [])),
            duration_seconds=300,
            lesson_data=masterclass_data,
            completed_at=datetime.utcnow()
        )
        db.add(lesson_record)
        await db.commit()
        masterclass_data["saved_lesson_id"] = lesson_record.id
    except Exception as ex:
        logger.warning(f"Could not persist Netflix lesson to DB: {ex}")

    return {
        "status": "success",
        "student_name": current_user.name,
        "masterclass": masterclass_data
    }


class SlideSpeechRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "es-US-AlonsoNeural"


@router.post("/synthesize-speech")
async def synthesize_slide_speech(
    req: SlideSpeechRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Synthesizes tutor voice audio for an individual masterclass slide.
    Requires student authentication.
    """
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        audio_bytes = await synthesize_speech(
            text=text,
            voice_id=req.voice_id or "es-US-AlonsoNeural"
        )
        if not audio_bytes:
            raise HTTPException(status_code=500, detail="Speech synthesis failed")

        return {
            "status": "success",
            "audio_base64": base64.b64encode(audio_bytes).decode("utf-8")
        }
    except Exception as e:
        logger.error(f"Error synthesizing slide speech: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download-extension")
async def download_extension_zip():
    """
    Packs the Chrome extension directory into a .zip file and returns it
    for 1-click direct download from the Guionbajo dashboard.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ext_dir = os.path.join(base_dir, "extension")
    if not os.path.isdir(ext_dir):
        raise HTTPException(status_code=404, detail="Carpeta de extensión no encontrada")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(ext_dir):
            for file in files:
                # Exclude hidden or temp files
                if file.startswith(".") or file.endswith(".tmp") or file.endswith(".pyc"):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, ext_dir)
                zf.write(file_path, arcname)

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=guionbajo-netflix-companion.zip",
            "Access-Control-Allow-Origin": "*",
        }
    )

