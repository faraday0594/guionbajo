"""
Guionbajo — Real-Time Live Voice Chat Router
Powers live, natural English & Spanish conversation with Guionbajo AI.
Features:
- MiniMax asr-1.0 Speech-to-Text with mixed-language support
- MiniMax-M3 LLM with thinking disabled for ultra-low latency (<250ms TTFT)
- Server-Sent Events (SSE) streaming with clause-level audio pipelining
- Pedagogical grammar & phrasing corrections without conversational interruption
"""
import os
import re
import json
import time
import asyncio
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from openai import AsyncOpenAI
import httpx

from config import settings
from auth.dependencies import get_current_user_optional
from models.user import User
from core.tts_service import synthesize_speech

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/live", tags=["live_chat"])

# In-memory LRU audio chunk cache for rapid re-play
LIVE_AUDIO_CACHE: Dict[str, bytes] = {}

# Valid MPEG Layer-3 silent frame (prevents 500 crashes on punctuation-only or empty speech chunks)
SILENT_MP3_FRAME = (
    b'\xff\xfb\x90d\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
)

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str

class LiveChatRequest(BaseModel):
    messages: List[ChatMessage]
    student_name: Optional[str] = "Estudiante"
    student_level: Optional[str] = "A1.2"
    voice_id: Optional[str] = "es-US-AlonsoNeural"
    bilingual_mode: Optional[bool] = True

class ChunkAudioRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "es-US-AlonsoNeural"
    speed: Optional[float] = 1.0


GUIONBAJO_LIVE_SYSTEM_PROMPT = """Eres Guionbajo, el tutor personal de inglés con inteligencia artificial más carismático, empático y dinámico del mundo.
Estás hablando EN VIVO por voz con {student_name} (nivel CEFR actual: {student_level}).

REGLA ABSOLUTA DE IDIOMAS (ESTRICTO - CERO TOLERANCIA):
1. ÚNICAMENTE TIENES PERMITIDO HABLAR EN ESPAÑOL Y EN INGLÉS.
2. ESTÁ TOTAL Y ABSOLUTAMENTE PROHIBIDO RESPONDER O GENERAR CARACTERES EN CHINO (汉字), NI NINGÚN OTRO IDIOMA QUE NO SEA ESPAÑOL O INGLÉS.
3. BAJO NINGUNA CIRCUNSTANCIA generes palabras o caracteres en chino, ni en tus respuestas habladas, ni en correcciones, ni en pensamientos. Toda tu comunicación DEBE ser 100% en español y/o inglés.
4. Si por alguna razón técnica o ambigüedad dudas de qué responder, responde en español simple o inglés básico. NUNCA en chino.

DIRECTRICES DE CONVERSACIÓN EN VIVO (ÁGIL Y CONCISA):
1. RITMO DE VOZ Y RESPUESTAS MEDIO CORTAS (CRUCIAL PARA BAJA LATENCIA):
   - En una conversación por voz real, las respuestas largas aburren y rompen el dinamismo.
   - Responde SIEMPRE de forma BREVE: MÁXIMO 1 o 2 oraciones cortas (entre 10 y 20 palabras en total por turno).
   - Comienza SIEMPRE con una primera frase muy corta de 2 a 4 palabras (ej: "¡Hola!", "Awesome!", "That sounds great!", "I hear you!", "Tell me more!", "¡Qué interesante!", "¡Excelente!"). Esta primera frase corta se convertirá en audio de inmediato para que el estudiante empiece a escucharte en menos de 1 segundo.
   - Mientras dices esa primera parte corta, la segunda parte se sintetiza en paralelo.
   - NUNCA des monólogos ni listas extensas. Haz preguntas cortas para que el estudiante hable la mayor parte del tiempo.

2. TONO: Amigable, motivador, espontáneo, cálido y con sentido del humor. No suenes como un libro de texto ni como un asistente corporativo.

3. MEMORIA CONVERSACIONAL TEMPORAL:
   - Recuerda lo que {student_name} te ha dicho a lo largo de esta sesión (su día, gustos, temas, anécdotas y correcciones previas).
   - Haz referencias naturales a lo que hablaron hace unos momentos como en una conversación real continua entre amigos.

4. IDIOMA Y FLUJO BILINGÜE:
   - Tu objetivo principal es hacer que el estudiante hable y practique inglés sin miedo.
   - Si el estudiante te saluda o habla en español (ej. "Hola Guionbajo"), salúdalo con entusiasmo en español y transiciona con total fluidez hacia el inglés haciéndole una pregunta cotidiana y fácil de responder para su nivel ({student_level}).
   - Si el estudiante habla en inglés, responde en inglés natural, claro y accesible para su nivel. Puedes intercalar un breve apoyo en español si el tema lo requiere.
   - Si el estudiante solo saluda o no sabe qué decir, ¡toma tú la iniciativa! Pregúntale qué tal su día, qué música le gusta, qué comió o qué planes tiene. Sé libre de proponer temas interesantes.

5. CORRECCIÓN PEDAGÓGICA SUTIL (NO INTERRUMPAS LA CONVERSACIÓN):
   - Si el estudiante comete un error gramatical, léxico o sintáctico en inglés (por ejemplo: "I have 25 years", "she don't like", "yesterday I go"):
     a) En tu respuesta hablada, NO lo regañes ni frenes la conversación. Modela la forma correcta de manera natural (recast) o menciona un tip breve y cariñoso, y continúa la charla.
     b) OBLIGATORIO: Si detectas un error claro, incluye al final de tu mensaje un bloque especial oculto en formato JSON con la corrección:
        [CORRECTION: {{"original": "frase con error", "corrected": "frase correcta", "explanation": "Breve explicación en español en 1 línea"}}]
   - Si el estudiante habló correctamente, NO agregues la etiqueta [CORRECTION].

6. MINI-CLASES EN VIVO Y PIZARRA HOLOGRÁFICA BAJO DEMANDA:
   - CUÁNDO ACTIVARLA:
     a) Cuando {student_name} mencione o pida una explicación, clase o duda sobre cualquier tema gramatical, tiempo verbal o vocabulario (ej: "explícame el presente progresivo", "quiero que me expliques...", "cómo se usa would like", "present continuous", "adverbios de frecuencia", "phrasal verbs", "pasado simple", etc.).
     b) O cuando {student_name} acepte una sugerencia tuya de aprender un tema (ej: "sí, explícame", "quiero aprenderlo").
     c) O cuando cometa un error conceptual importante y le propongas una mini-clase express.
   - REGLA DE ORO DE LA VOZ HABLADA (CRÍTICO):
     ESTÁ TOTALMENTE PROHIBIDO dar explicaciones gramaticales, listas o detalles de reglas ("primero...", "segundo...", excepciones) con tu voz hablada.
     Tu voz hablada DEBE SER ÚNICAMENTE 1 O 2 FRASES CORTAS (máximo 12 a 18 palabras en total) anunciando con entusiasmo que abres la pizarra holográfica para él/ella.
     Ejemplo hablado obligatorio: "¡Por supuesto! Abro tu pizarra holográfica con las reglas clave del tema. ¡Mírala en pantalla y prueba tu respuesta!"
     NUNCA uses formato markdown (como negritas ** ni guiones de lista) en tu voz hablada.
     TODO el contenido explicativo (fórmulas, reglas gramaticales, excepciones como -ing, tips y ejemplos) DEBE IR OBLIGATORIA Y EXCLUSIVAMENTE DENTRO DEL BLOQUE OCULTO [MINI_CLASS: {...}].
   - FORMATO OBLIGATORIO DEL BLOQUE OCULTO [MINI_CLASS]:
     Inmediatamente después de tu breve saludo hablado (después de cualquier [CORRECTION]), incluye OBLIGATORIAMENTE el bloque JSON estructurado completo:
     [MINI_CLASS: {{"topic": "Nombre del Tema", "summary": "Resumen en 1 línea", "cards": [{{"id": "c1", "step": 1, "badge": "Regla 1", "title": "Título de la regla", "formula": "Sujeto + Verbo Auxiliar + Verbo Principal", "example": "Oración de ejemplo en inglés", "highlight": "palabra o frase resaltada", "explanation": "Regla mnemotécnica clara y directa en español"}}, {{"id": "c2", "step": 2, "badge": "Regla 2", "title": "Título regla 2", "formula": "Sujeto + To Be + Verbo-ing", "example": "Ejemplo ilustrativo", "highlight": "palabra resaltada", "explanation": "Explicación clara en español"}}], "quiz": {{"question": "¿Pregunta concisa para evaluar el tema?", "options": ["Opción A", "Opción B", "Opción C"], "correct_index": 0, "explanation": "Por qué es correcta"}}}} ]
   - CIERRE AUTOMÁTICO DE LA PIZARRA:
     Cuando {student_name} confirme que entendió la explicación (ej: "ya entendí", "todo claro", "gracias", "perfecto") o cuando responda al quiz, felicítalo brevemente en 1 oración hablada (ej: "¡Exacto, lo dominas a la perfección! Cerramos la pizarra y seguimos conversando.") y agrega al final de tu mensaje la etiqueta oculta:
     [CLOSE_MINI_CLASS]
   - Si la conversación es charla cotidiana sin solicitud de explicación ni dudas gramaticales, NO incluyas [MINI_CLASS].
"""


@router.post("/transcribe")
async def transcribe_live_speech(
    audio: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Transcribes audio using MiniMax Speech to Text API (asr-1.0).
    Supports mixed-language recognition (Spanish & English spoken in the same sentence).
    Fallback to Groq Whisper if MiniMax STT is unreachable.
    """
    start_time = time.time()
    try:
        audio_bytes = await audio.read()
    except Exception as e:
        logger.error(f"Failed to read audio bytes: {e}")
        raise HTTPException(status_code=400, detail="Could not read uploaded audio file.")

    if not audio_bytes or len(audio_bytes) < 80:
        return {"text": "", "duration": 0.0, "words": []}

    api_key = settings.MINIMAX_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="MINIMAX_API_KEY is not configured.")

    # 1. Primary Engine: MiniMax Speech to Text (asr-1.0)
    stt_url = f"{settings.MINIMAX_BASE_URL}/speech_to_text"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    filename = audio.filename or "speech.wav"
    mime_type = audio.content_type or "audio/wav"
    if "webm" in mime_type.lower():
        # Note: MiniMax accepts mp3, wav, opus, ogg, aac, flac
        mime_type = "audio/webm"
    
    files = {
        "file": (filename, audio_bytes, mime_type),
        "model": (None, "asr-1.0"),
        "language": (None, "es"),
        "response_format": (None, "verbose_json"),
        "timestamp_level": (None, "word"),
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(stt_url, headers=headers, files=files)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data.get("text", "").strip()

                # Discard Chinese characters or subtitle hallucinations on low/silent audio
                if re.search(r'[\u4e00-\u9fff]', raw_text) or any(h in raw_text.lower() for h in ["thank you for watching", "thanks for watching", "subtitles by", "amara.org"]):
                    logger.warning(f"Discarded hallucinated ASR output: '{raw_text}'")
                    raw_text = ""
                duration = data.get("duration", 0.0)
                segments = data.get("segments", [])
                words = []
                for seg in segments:
                    w_text = seg.get("text", "").strip()
                    if w_text:
                        words.append({
                            "word": w_text,
                            "start": seg.get("start"),
                            "end": seg.get("end")
                        })
                
                logger.info(f"MiniMax STT transcribed '{raw_text}' ({duration:.2f}s) in {time.time() - start_time:.2f}s")
                return {
                    "text": raw_text,
                    "duration": duration,
                    "words": words,
                    "engine": "minimax-asr-1.0"
                }
            else:
                logger.warning(f"MiniMax STT returned HTTP {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.warning(f"MiniMax STT request error: {e}. Attempting fallback...")

    # 2. Fallback Engine: Groq Whisper if configured
    if settings.GROQ_API_KEY:
        try:
            groq_client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.GROQ_BASE_URL,
                timeout=10.0,
            )
            groq_trans = await groq_client.audio.transcriptions.create(
                model=settings.GROQ_WHISPER_MODEL,
                file=(filename, audio_bytes, mime_type),
                response_format="verbose_json",
            )
            raw_text = getattr(groq_trans, "text", "") or ""
            duration = getattr(groq_trans, "duration", 0.0) or 0.0
            logger.info(f"Groq Whisper fallback transcribed: '{raw_text}' in {time.time() - start_time:.2f}s")
            return {
                "text": raw_text.strip(),
                "duration": duration,
                "words": [],
                "engine": "groq-whisper"
            }
        except Exception as ge:
            logger.error(f"Groq Whisper fallback also failed: {ge}")

    return {"text": "", "duration": 0.0, "words": []}


@router.post("/respond-stream")
async def live_respond_stream(
    req: LiveChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Streams Guionbajo's response via Server-Sent Events (SSE).
    Uses MiniMax-M3 with thinking: disabled for instantaneous token streaming (<250ms TTFT).
    Detects natural phrase boundaries (clauses) and emits them in real-time for pipelined audio playback.
    """
    api_key = settings.MINIMAX_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="MINIMAX_API_KEY is not configured.")

    system_prompt = GUIONBAJO_LIVE_SYSTEM_PROMPT.format(
        student_name=req.student_name or "Estudiante",
        student_level=req.student_level or "A1.2"
    )

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages[-30:]:  # Keep up to 30 messages for full session memory
        if m.role in ("user", "assistant"):
            formatted_messages.append({"role": m.role, "content": m.content})

    # Check for mini-class / explanation intent
    last_user_content = ""
    for m in reversed(req.messages):
        if m.role == "user":
            last_user_content = (m.content or "").lower().strip()
            break

    # Broad intent detection for explanations and mini-classes
    CLASS_STEMS = [
        "expliq", "explica", "enseñ", "aprend", "clase", "lecci", "regla", "gramat",
        "como se", "cómo se", "cuando se", "cuándo se", "cuál es", "cual es", "qué es", "que es",
        "que significa", "qué significa", "diferencia", "cómo funciona", "como funciona",
        "pizarra", "entender", "ayuda con"
    ]
    GRAMMAR_TOPICS = [
        "presente", "pasado", "futuro", "progresivo", "continuo", "continuous", "perfect",
        "simple", "verb", "adverb", "adjetiv", "preposici", "pronomb", "modal",
        "would", "could", "should", "phrasal", "gerund", "infinitiv", "condicional", "conditional",
        "passive", "pasiva", "used to", "going to", "will"
    ]

    has_intent_stem = any(s in last_user_content for s in CLASS_STEMS)
    has_grammar_topic = any(t in last_user_content for t in GRAMMAR_TOPICS)
    is_class_requested = has_intent_stem or has_grammar_topic

    # Also detect affirmative responses if previous assistant message offered a class/explanation
    prev_assistant_content = ""
    for m in reversed(req.messages[:-1]):
        if m.role == "assistant":
            prev_assistant_content = (m.content or "").lower()
            break

    AFFIRMATIVE_KEYWORDS = ["sí", "si", "dale", "hazla", "hazlo", "por favor", "me gustaría", "me gustaria", "quiero", "claro", "bueno", "ok"]
    if any(kw in last_user_content for kw in AFFIRMATIVE_KEYWORDS):
        if any(k in prev_assistant_content for k in ["clase", "explicar", "gustaría", "gustaria", "quieres", "tema"]):
            is_class_requested = True

    UNDERSTOOD_KEYWORDS = [
        "ya entendí", "ya entendi", "todo claro", "me quedó claro", "me quedo claro",
        "perfecto", "got it", "understood", "ya me quedó claro", "gracias ya entendí",
        "ya comprendí", "ya comprendi"
    ]
    is_understood = any(kw in last_user_content for kw in UNDERSTOOD_KEYWORDS)

    if is_class_requested:
        logger.info(f"Mini-class requested by user: '{last_user_content[:60]}'. Injecting intent reinforcement.")
        formatted_messages.append({
            "role": "system",
            "content": (
                "[INSTRUCCIÓN CRÍTICA DE SISTEMA: El estudiante está pidiendo una clase o explicación sobre un tema. "
                "TU VOZ HABLADA DEBE TENER MÁXIMO 1 O 2 FRASES CORTAS (10 a 15 palabras en total), por ejemplo: "
                "'¡Por supuesto! Abro tu pizarra holográfica con la estructura y ejemplos clave. ¡Pruébalo con la pregunta!' "
                "ESTÁ TOTALMENTE PROHIBIDO explicar la gramática o enumerar reglas/ejemplos con tu voz hablada. NUNCA uses negritas (**) por voz. "
                "OBLIGATORIO: Genera inmediatamente después de tu breve saludo el bloque oculto [MINI_CLASS: { ... }] completo con cards y quiz. "
                "No lo postergues, genéralo AHORA MISMO en esta respuesta.]"
            )
        })
    elif is_understood:
        logger.info(f"Student confirmed understanding: '{last_user_content[:60]}'. Injecting close instruction.")
        formatted_messages.append({
            "role": "system",
            "content": (
                "[INSTRUCCIÓN DE SISTEMA: El estudiante confirma que ya entendió la explicación o clase. "
                "Felicítalo brevemente en 1 sola frase entusiasta y amigable diciendo que cerramos la pizarra y "
                "continúa la conversación en inglés. OBLIGATORIAMENTE incluye al final de tu respuesta la etiqueta: [CLOSE_MINI_CLASS]]"
            )
        })

    client = AsyncOpenAI(
        api_key=api_key,
        base_url=settings.MINIMAX_BASE_URL,
        timeout=30.0,
    )

    async def sse_generator():
        accumulated_text = ""
        clause_buffer = ""
        clause_index = 0
        miniclass_emitted = False
        correction_emitted = False

        def _strip_hidden_tags(text: str) -> str:
            if not text:
                return ""
            s = text
            for tag in ("[MINI_CLASS:", "[CLOSE_MINI_CLASS]", "[CORRECTION:"):
                pos = s.find(tag)
                if pos != -1:
                    s = s[:pos]
            s = s.replace("**", "")  # Strip markdown bold asterisks from speech
            s = re.sub(r'[\u4e00-\u9fff]', '', s)
            return s.strip()

        # Helper to extract structured JSON payloads from tags with nested braces
        def _extract_tag(tag_name: str, raw_text: str):
            prefix = f"[{tag_name}:"
            idx = raw_text.find(prefix)
            if idx == -1:
                return None
            sub = raw_text[idx + len(prefix):].strip()
            if sub.startswith("{"):
                try:
                    obj, _ = json.JSONDecoder().raw_decode(sub)
                    return obj
                except Exception:
                    return None
            return None

        try:
            # Crucial: thinking disabled guarantees sub-second first-token response
            # 950 tokens when class requested to guarantee complete JSON payload
            stream = await client.chat.completions.create(
                model=settings.MINIMAX_LLM_MODEL or "MiniMax-M3",
                messages=formatted_messages,
                temperature=0.8,
                max_tokens=950 if is_class_requested else 400,
                stream=True,
                extra_body={"thinking": {"type": "disabled"}}
            )

            # Punctuation boundaries that trigger an audio clause (closing punctuation only)
            clause_delimiters = re.compile(r'([.!?\n]+|\,\s+|\;\s+|\:\s+)')

            async for chunk in stream:
                if not chunk.choices or len(chunk.choices) == 0:
                    continue
                delta = chunk.choices[0].delta
                content = getattr(delta, "content", "") or ""
                if not content:
                    continue

                # Strictly filter out any Chinese characters
                if re.search(r'[\u4e00-\u9fff]', content):
                    logger.warning(f"Filtered Chinese character from LLM stream: '{content}'")
                    content = re.sub(r'[\u4e00-\u9fff]', '', content)
                    if not content:
                        continue

                accumulated_text += content
                clause_buffer += content

                # Emit token event to UI
                yield f"event: token\ndata: {json.dumps({'token': content})}\n\n"

                # Real-time extraction of [MINI_CLASS: ...] as soon as tag JSON completes mid-stream
                if not miniclass_emitted and "[MINI_CLASS:" in accumulated_text:
                    miniclass_data = _extract_tag("MINI_CLASS", accumulated_text)
                    if miniclass_data:
                        yield f"event: miniclass\ndata: {json.dumps(miniclass_data)}\n\n"
                        miniclass_emitted = True

                # Real-time extraction of [CORRECTION: ...] mid-stream
                if not correction_emitted and "[CORRECTION:" in accumulated_text:
                    corr_data = _extract_tag("CORRECTION", accumulated_text)
                    if corr_data:
                        yield f"event: correction\ndata: {json.dumps(corr_data)}\n\n"
                        correction_emitted = True

                # Check if clause buffer has reached a natural speaking pause
                # Avoid emitting if we are inside a [CORRECTION: ...], [MINI_CLASS: ...], or [CLOSE_MINI_CLASS] tag
                if "[CORRECTION:" not in clause_buffer and "[MINI_CLASS:" not in clause_buffer and "[CLOSE_MINI_CLASS]" not in clause_buffer:
                    match = clause_delimiters.search(clause_buffer)
                    # For clause 0: 2-3 words or first punctuation for instant start
                    threshold_words = 3 if clause_index == 0 else 6
                    word_count = len(clause_buffer.split())
                    if match or (word_count >= threshold_words and " " in clause_buffer[-2:]):
                        split_pos = match.end() if match else len(clause_buffer)
                        completed_clause = clause_buffer[:split_pos].strip()
                        clause_buffer = clause_buffer[split_pos:].lstrip()

                        if completed_clause and len(completed_clause) > 1:
                            clean_c = _strip_hidden_tags(completed_clause)
                            if clean_c and any(ch.isalnum() for ch in clean_c):
                                yield f"event: clause\ndata: {json.dumps({'clause_index': clause_index, 'text': clean_c})}\n\n"
                                clause_index += 1

            # Check remaining clause buffer at stream end
            if clause_buffer.strip():
                clean_tail = _strip_hidden_tags(clause_buffer)
                if clean_tail and any(ch.isalnum() for ch in clean_tail):
                    yield f"event: clause\ndata: {json.dumps({'clause_index': clause_index, 'text': clean_tail})}\n\n"
                    clause_index += 1

            # End of stream fallback extraction
            if not correction_emitted:
                corr_data = _extract_tag("CORRECTION", accumulated_text)
                if corr_data:
                    yield f"event: correction\ndata: {json.dumps(corr_data)}\n\n"

            if not miniclass_emitted:
                miniclass_data = _extract_tag("MINI_CLASS", accumulated_text)
                if miniclass_data:
                    yield f"event: miniclass\ndata: {json.dumps(miniclass_data)}\n\n"

            # Check if student understood and mini class should close
            if "[CLOSE_MINI_CLASS]" in accumulated_text:
                yield f"event: close_miniclass\ndata: {{}}\n\n"

            # Clean final text shown to user (without hidden tags)
            clean_full = _strip_hidden_tags(accumulated_text)
            yield f"event: done\ndata: {json.dumps({'full_text': clean_full, 'total_clauses': clause_index})}\n\n"

        except Exception as e:
            logger.error(f"Error in live_respond_stream: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


@router.post("/synthesize-chunk")
async def synthesize_clause_chunk(
    req: ChunkAudioRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Ultra-fast clause-level TTS synthesis for real-time live streaming audio.
    Caches identical phrases in-memory for 0ms replay.
    Gracefully handles empty/punctuation phrases by returning a valid silent frame.
    """
    clean_text = req.text.strip()
    if not clean_text or not any(c.isalnum() for c in clean_text):
        return Response(
            content=SILENT_MP3_FRAME,
            media_type="audio/mpeg",
            headers={"X-Silent": "true", "Cache-Control": "public, max-age=86400"}
        )

    cache_key = f"{req.voice_id}:{req.speed}:{clean_text}"
    if cache_key in LIVE_AUDIO_CACHE:
        return Response(
            content=LIVE_AUDIO_CACHE[cache_key],
            media_type="audio/mpeg",
            headers={"X-Cache": "HIT", "Cache-Control": "public, max-age=86400"}
        )

    try:
        audio_bytes = await synthesize_speech(
            text=clean_text,
            voice_id=req.voice_id or "es-US-AlonsoNeural",
            speed=req.speed or 1.0,
        )
        if not audio_bytes:
            logger.warning(f"Voice synthesis returned empty audio for '{clean_text[:40]}'. Returning silent frame.")
            return Response(
                content=SILENT_MP3_FRAME,
                media_type="audio/mpeg",
                headers={"X-Silent": "true", "Cache-Control": "public, max-age=86400"}
            )

        if len(LIVE_AUDIO_CACHE) < 500:
            LIVE_AUDIO_CACHE[cache_key] = audio_bytes

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"X-Cache": "MISS", "Cache-Control": "public, max-age=86400"}
        )
    except Exception as e:
        logger.error(f"Failed to synthesize clause chunk: {e}")
        return Response(
            content=SILENT_MP3_FRAME,
            media_type="audio/mpeg",
            headers={"X-Silent": "true", "X-Error": str(e)[:100]}
        )
