import httpx
import re
import logging
import asyncio
import io
from typing import Optional, Dict, Any, List
import edge_tts
from gtts import gTTS
from config import settings
from core.tts_normalizer import normalize_tts_text, ENGLISH_TTS_PHONETIC_MAP

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# CATÁLOGO DE VOCES EN ESPAÑOL E INGLÉS (MiniMax, Google TTS, Edge Studio)
# ══════════════════════════════════════════════════════════════════════════════
AVAILABLE_VOICES: List[Dict[str, Any]] = [
    # ─── 1. MINIMAX NEURAL HD (speech-02-hd / t2a_v2) ─────────────────────────
    {
        "id": "female-yujie",
        "name": "Yujie (MiniMax - Madura / Elegante)",
        "provider": "minimax",
        "gender": "female",
        "lang": "es",
        "badge": "Recomendada",
        "description": "Voz femenina madura, calmada y con dicción pedagógica excelente para tutoría",
        "preview_text": "¡Hola! Soy tu tutora de inglés. Hoy vamos a dominar la pronunciación y gramática juntos."
    },
    {
        "id": "female-chengshu",
        "name": "Chengshu (MiniMax - Profesional)",
        "provider": "minimax",
        "gender": "female",
        "lang": "es",
        "badge": "Formal",
        "description": "Voz femenina clara, ejecutiva, articulada y con tono seguro",
        "preview_text": "¡Hola! Revisemos la estructura gramatical con mucha atención en este ejemplo."
    },
    {
        "id": "female-tianmei",
        "name": "Tianmei (MiniMax - Dulce)",
        "provider": "minimax",
        "gender": "female",
        "lang": "es",
        "badge": "Motivadora",
        "description": "Voz femenina dulce, amigable y motivadora para guiarte en el aprendizaje",
        "preview_text": "¡Excelente trabajo! Vamos a practicar una nueva frase para mejorar tu fluidez."
    },
    {
        "id": "female-shaonv",
        "name": "Shaonv (MiniMax - Juvenil)",
        "provider": "minimax",
        "gender": "female",
        "lang": "es",
        "badge": "Juvenil",
        "description": "Voz femenina juvenil, cálida y enérgica",
        "preview_text": "¡Hola! Estoy lista para ayudarte con todos tus ejercicios de inglés hoy."
    },
    {
        "id": "audiobook_female_1",
        "name": "Narradora Audiobook (MiniMax)",
        "provider": "minimax",
        "gender": "female",
        "lang": "es",
        "badge": "Narración",
        "description": "Voz femenina envolvente, pausada y didáctica para explicaciones",
        "preview_text": "Observa con atención cómo cambia el significado de la oración al usar este conector."
    },
    {
        "id": "presenter_female",
        "name": "Locutora HD (MiniMax)",
        "provider": "minimax",
        "gender": "female",
        "lang": "es",
        "badge": "Studio HD",
        "description": "Voz femenina con tono de locutora profesional y claridad de estudio",
        "preview_text": "Bienvenidos a la sesión de hoy. Analicemos los puntos clave de esta lección."
    },
    {
        "id": "male-qn-qingse",
        "name": "Qingse (MiniMax - Joven)",
        "provider": "minimax",
        "gender": "male",
        "lang": "es",
        "badge": "Dinámico",
        "description": "Voz masculina joven, dinámica y conversacional",
        "preview_text": "¡Qué tal! Vamos a darle ritmo a esta práctica de conversación en inglés."
    },
    {
        "id": "male-qn-jingying",
        "name": "Jingying (MiniMax - Ejecutivo)",
        "provider": "minimax",
        "gender": "male",
        "lang": "es",
        "badge": "Ejecutivo",
        "description": "Voz masculina formal con dicción nítida, firme y precisa",
        "preview_text": "Correcto. Fíjate en la posición de la lengua y los labios al pronunciar este fonema."
    },
    {
        "id": "male-qn-daxuesheng",
        "name": "College Male (MiniMax - Universitario)",
        "provider": "minimax",
        "gender": "male",
        "lang": "es",
        "badge": "Moderno",
        "description": "Voz masculina fresca, moderna y conversacional",
        "preview_text": "¡Hola! Practiquemos este diálogo paso a paso para ganar total confianza."
    },
    {
        "id": "presenter_male",
        "name": "Locutor HD (MiniMax)",
        "provider": "minimax",
        "gender": "male",
        "lang": "es",
        "badge": "Studio HD",
        "description": "Voz masculina con tono de presentador de noticias",
        "preview_text": "Iniciamos la sección práctica. Presta atención al siguiente ejemplo fonético."
    },
    {
        "id": "audiobook_male_1",
        "name": "Narrador Audiobook (MiniMax)",
        "provider": "minimax",
        "gender": "male",
        "lang": "es",
        "badge": "Narrador",
        "description": "Voz masculina profunda, reflexiva y calmada",
        "preview_text": "Cada palabra que practicamos hoy te acerca más a tu meta de dominar el inglés."
    },

    # ─── 2. GOOGLE TTS (gTTS) ────────────────────────────────────────────────
    {
        "id": "google-es",
        "name": "Google Español (Latinoamérica)",
        "provider": "google",
        "gender": "female",
        "lang": "es-419",
        "badge": "Google Oficial",
        "description": "Voz clásica y natural de Google en español latinoamericano, limpia y nítida",
        "preview_text": "Hola, soy la voz de Google. Estoy lista para guiarte en tu aprendizaje de inglés."
    },
    {
        "id": "google-es-mx",
        "name": "Google Español (México)",
        "provider": "google",
        "gender": "female",
        "lang": "es-MX",
        "badge": "México",
        "description": "Voz oficial de Google con entonación de México",
        "preview_text": "Hola, esta es la voz de Google México. Practiquemos juntos tus frases de inglés."
    },
    {
        "id": "google-es-es",
        "name": "Google Español (España)",
        "provider": "google",
        "gender": "female",
        "lang": "es-ES",
        "badge": "España",
        "description": "Voz clásica de Google con acento castellano de España",
        "preview_text": "Hola, soy la voz de Google en español de España. Practiquemos juntos esta lección."
    },
    {
        "id": "google-en-us",
        "name": "Google English (Estados Unidos)",
        "provider": "google",
        "gender": "female",
        "lang": "en-US",
        "badge": "Google US",
        "description": "Voz estándar de Google en inglés americano para entrenamiento",
        "preview_text": "Hello! I am the Google English voice. Let's practice your pronunciation together."
    },
    {
        "id": "google-en-uk",
        "name": "Google English (Reino Unido / British)",
        "provider": "google",
        "gender": "female",
        "lang": "en-GB",
        "badge": "Google UK",
        "description": "Voz estándar de Google en inglés británico",
        "preview_text": "Hello! I am the Google British English voice. Let's practice your pronunciation."
    },

    # ─── 3. MICROSOFT EDGE NEURAL STUDIO (Español e Inglés HD) ───────────────
    {
        "id": "es-MX-DaliaNeural",
        "name": "Dalia (Edge Neural - México Femenina)",
        "provider": "edge",
        "gender": "female",
        "lang": "es-MX",
        "badge": "Ultra Natural",
        "description": "Voz neuronal de alta fidelidad, extremadamente fluida, natural y agradable",
        "preview_text": "Hola, soy Dalia. Te acompañaré durante toda tu lección de inglés con explicaciones claras."
    },
    {
        "id": "es-MX-JorgeNeural",
        "name": "Jorge (Edge Neural - México Masculino)",
        "provider": "edge",
        "gender": "male",
        "lang": "es-MX",
        "badge": "Cálida",
        "description": "Voz neuronal cálida, amable y con excelente dicción para tutoría",
        "preview_text": "Hola, soy Jorge. Vamos a revisar paso a paso cada detalle para que hables con total confianza."
    },
    {
        "id": "es-ES-ElviraNeural",
        "name": "Elvira (Edge Neural - España Femenina)",
        "provider": "edge",
        "gender": "female",
        "lang": "es-ES",
        "badge": "España HD",
        "description": "Voz neuronal de España, nítida, formal y pedagógica",
        "preview_text": "Hola, soy Elvira. Analicemos juntos las reglas y patrones de esta lección."
    },
    {
        "id": "es-ES-AlvaroNeural",
        "name": "Álvaro (Edge Neural - España Masculino)",
        "provider": "edge",
        "gender": "male",
        "lang": "es-ES",
        "badge": "España HD",
        "description": "Voz neuronal serena, profesional y clara",
        "preview_text": "Hola, soy Álvaro. Con dedicación y práctica constante lograrás dominar el idioma."
    },
    {
        "id": "es-US-PalomaNeural",
        "name": "Paloma (Edge Neural - US Spanish Bilingüe)",
        "provider": "edge",
        "gender": "female",
        "lang": "es-US",
        "badge": "Bilingüe HD",
        "description": "Voz femenina bilingüe con entonación natural de español estadounidense",
        "preview_text": "Hola, soy Paloma. Practicaremos la transición fonética entre español e inglés."
    },
    {
        "id": "es-US-AlonsoNeural",
        "name": "Alonso (Edge Neural - US Spanish Bilingüe)",
        "provider": "edge",
        "gender": "male",
        "lang": "es-US",
        "badge": "Bilingüe HD",
        "description": "Voz masculina bilingüe con excelente articulación de ambos idiomas",
        "preview_text": "Hola, soy Alonso. Esta lección te ayudará a pronunciar como un hablante nativo."
    },
    {
        "id": "en-US-RogerNeural",
        "name": "Roger (Edge Neural - Inglés Estudio HD)",
        "provider": "edge",
        "gender": "male",
        "lang": "en-US",
        "badge": "English Coach",
        "description": "Voz nativa de estudio en inglés americano, perfecta para entrenamiento fonético",
        "preview_text": "Hello there! I am Roger, your native English pronunciation coach. Let's get started!"
    },
    {
        "id": "en-US-JennyNeural",
        "name": "Jenny (Edge Neural - Inglés Estudio HD)",
        "provider": "edge",
        "gender": "female",
        "lang": "en-US",
        "badge": "English Coach",
        "description": "Voz nativa de estudio en inglés americano con claridad y tono natural impecable",
        "preview_text": "Hi everyone! I am Jenny. We will practice natural phrases and pronunciation rhythm."
    },
]

def preprocess_text_for_tts(text: str, is_spanish_tutor: bool = True) -> str:
    """Preprocess text with phonetic and interjection normalizer."""
    return normalize_tts_text(text, is_spanish_tutor=is_spanish_tutor)

async def _synthesize_google_tts(text: str, lang: str = "es", tld: str = "com") -> bytes:
    """Synthesize speech using Google TTS (gTTS) with timeout protection."""
    try:
        loop = asyncio.get_event_loop()
        def _generate():
            tts = gTTS(text=text, lang=lang, tld=tld, slow=False)
            bio = io.BytesIO()
            tts.write_to_fp(bio)
            return bio.getvalue()
        return await asyncio.wait_for(loop.run_in_executor(None, _generate), timeout=12.0)
    except Exception as e:
        logger.warning(f"Google TTS synthesis error (lang={lang}, tld={tld}): {e}")
        return b""

async def _fallback_edge_tts(text: str, voice_id: str = "es-MX-DaliaNeural", speed: float = 1.0) -> bytes:
    """High-quality Microsoft Edge Neural Voice synthesis."""
    try:
        vid = (voice_id or "").lower()
        if "jenny" in vid:
            voice = "en-US-JennyNeural"
        elif "aria" in vid:
            voice = "en-US-AriaNeural"
        elif "sonia" in vid or "uk" in vid or "british" in vid:
            voice = "en-GB-SoniaNeural"
        elif "roger" in vid:
            voice = "en-US-RogerNeural"
        elif "guy" in vid:
            voice = "en-US-GuyNeural"
        elif "paloma" in vid:
            voice = "es-US-PalomaNeural"
        elif "alonso" in vid:
            voice = "es-US-AlonsoNeural"
        elif "alvaro" in vid:
            voice = "es-ES-AlvaroNeural"
        elif "elvira" in vid:
            voice = "es-ES-ElviraNeural"
        elif "jorge" in vid or "male" in vid or "college" in vid or "qingse" in vid or "jingying" in vid or "daxuesheng" in vid:
            voice = "es-MX-JorgeNeural"
        elif "dalia" in vid or "female" in vid or "yujie" in vid or "chengshu" in vid or "tianmei" in vid or "shaonv" in vid or "presenter_female" in vid or "audiobook_female" in vid:
            voice = "es-MX-DaliaNeural"
        elif voice_id.startswith("en-"):
            voice = voice_id
        elif voice_id.startswith("es-"):
            voice = voice_id
        else:
            voice = "es-MX-DaliaNeural"

        rate_str = f"{int((speed - 1.0) * 100):+d}%" if speed != 1.0 else "+0%"
        communicate = edge_tts.Communicate(text, voice, rate=rate_str)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        return audio_data
    except Exception as e:
        logger.warning(f"Edge TTS synthesis error ({voice_id}): {e}")
        return b""

def is_predominantly_english(text: str) -> bool:
    """
    Detects if text is strictly and exclusively an English sentence/drill without Spanish tutor instructions.
    Returns True ONLY when there is clear evidence of English structure words and NO Spanish content.
    """
    if not text or not isinstance(text, str):
        return False

    # Any Spanish accent or punctuation instantly marks it as Spanish/Bilingual tutor speech
    if re.search(r'[áéíóúÁÉÍÓÚñÑ¿¡üÜ]', text):
        return False

    spanish_words = {
        "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "para", "por", 
        "con", "sin", "sobre", "entre", "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
        "hola", "bienvenido", "bienvenida", "clase", "lección", "hoy", "vamos", "aprender", "fórmula",
        "regla", "sujeto", "verbo", "complemento", "pizarra", "ejemplo", "observa", "revisa", "practica",
        "fíjate", "como", "recuerda", "atención", "nota", "traducción", "aquí", "tienes", "muy", "bien",
        "excelente", "correcto", "perfecto", "ahora", "turno", "frase", "oración", "fonema", "escucha",
        "repite", "significa", "usa", "usamos", "cuando", "donde", "porque", "pero", "también", "tu", "tus",
        "nuestro", "nuestra", "respuesta", "continuemos", "intenta", "pronunciar", "sonido", "palabra",
        "palabras", "letra", "letras", "tiempo", "pasado", "presente", "futuro", "negación", "pregunta"
    }

    english_markers = {
        "the", "is", "are", "was", "were", "they", "them", "their", "we", "us", "our",
        "you", "your", "he", "him", "his", "she", "her", "hers", "it", "its", "i", "me", "my",
        "have", "has", "had", "do", "does", "did", "will", "would", "shall", "should", "can",
        "could", "might", "must", "with", "from", "about", "into", "through", "during", "before",
        "after", "because", "since", "until", "while", "where", "which", "whose", "what", "that", "this"
    }

    tokens = [w.lower().strip(",.:;!?\"'()[]{}/*_#") for w in text.split()]
    tokens = [t for t in tokens if t]

    if not tokens:
        return False

    spanish_count = sum(1 for w in tokens if w in spanish_words)
    english_count = sum(1 for w in tokens if w in english_markers)

    if spanish_count > 0:
        return False

    # Only consider predominantly English if it has clear English function words and no Spanish markers
    return english_count >= 2 and spanish_count == 0

async def _synthesize_minimax_tts(
    text: str,
    voice_id: str = "female-yujie",
    emotion: str = "calm",
    speed: float = 1.0,
    api_key: str = None
) -> Optional[bytes]:
    """Calls MiniMax speech-02-hd text-to-audio API (t2a_v2)."""
    key = api_key or settings.MINIMAX_API_KEY
    if not key or key == "your_minimax_api_key_here" or len(key) < 10:
        return None

    # Map generic/edge/google IDs to MiniMax voice IDs
    minimax_voice = voice_id
    if not voice_id or voice_id.startswith("edge-") or voice_id.startswith("en-") or voice_id.startswith("es-") or voice_id.startswith("google") or voice_id in ("default", "tutor"):
        minimax_voice = "female-yujie"

    payload = {
        "model": settings.MINIMAX_TTS_MODEL or "speech-02-hd",
        "text": text,
        "stream": False,
        "voice_setting": {
            "voice_id": minimax_voice,
            "speed": speed,
            "vol": 1.0,
            "pitch": 0,
            "emotion": emotion,
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3",
            "channel": 1,
        },
    }

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    endpoints = [
        settings.MINIMAX_TTS_ENDPOINT or "https://api.minimax.io/v1/t2a_v2",
        "https://api.minimax.chat/v1/t2a_v2",
    ]

    for endpoint in endpoints:
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(endpoint, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    base_resp = data.get("base_resp", {})
                    if base_resp.get("status_code", 0) == 0:
                        audio_raw = data.get("data", {}).get("audio") or data.get("audio")
                        if audio_raw:
                            try:
                                return bytes.fromhex(audio_raw)
                            except ValueError:
                                import base64
                                return base64.b64decode(audio_raw)
                    else:
                        logger.warning(f"MiniMax TTS returned status error on {endpoint}: {base_resp}")
                else:
                    logger.warning(f"MiniMax TTS HTTP {resp.status_code} on {endpoint}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"MiniMax TTS error on {endpoint}: {e}")

    return None

async def synthesize_speech(
    text: str,
    voice_id: str = "female-yujie",
    emotion: str = "calm",
    speed: float = 1.0,
    api_key: str = None
) -> bytes:
    """
    Master speech synthesis router:
    Respects student's chosen voice persona (MiniMax HD, Edge Neural Studio, Google TTS).
    Ensures smart fallback chaining (MiniMax -> Edge Neural Studio -> Google TTS).
    """
    key = api_key or settings.MINIMAX_API_KEY
    vid = (voice_id or "").lower()

    # ── 1. EXPLICIT GOOGLE TTS VOICES ─────────────────────────────────────────
    if vid.startswith("google-") or vid.startswith("gtts-"):
        is_eng = "en" in vid
        speech_text = preprocess_text_for_tts(text, is_spanish_tutor=not is_eng)
        lang = "en" if is_eng else "es"
        if "es-es" in vid:
            tld = "es"
        elif "es-mx" in vid:
            tld = "com.mx"
        elif "en-uk" in vid:
            tld = "co.uk"
        else:
            tld = "com"
        
        google_audio = await _synthesize_google_tts(speech_text, lang=lang, tld=tld)
        if google_audio and len(google_audio) > 100:
            return google_audio
        # Fallback to Edge Neural
        fallback_v = "en-US-JennyNeural" if is_eng else "es-MX-DaliaNeural"
        return await _fallback_edge_tts(speech_text, voice_id=fallback_v, speed=speed)

    # ── 2. EXPLICIT MICROSOFT EDGE NEURAL STUDIO VOICES ───────────────────────
    if vid.startswith("es-") or vid.startswith("en-") or vid.startswith("edge-"):
        is_eng = vid.startswith("en-") or "roger" in vid or "jenny" in vid or "aria" in vid
        speech_text = preprocess_text_for_tts(text, is_spanish_tutor=not is_eng)
        edge_audio = await _fallback_edge_tts(speech_text, voice_id=voice_id, speed=speed)
        if edge_audio and len(edge_audio) > 100:
            return edge_audio
        # Fallback to Google TTS
        lang = "en" if is_eng else "es"
        return await _synthesize_google_tts(speech_text, lang=lang)

    # ── 3. STRICT ENGLISH DRILL / MODEL SENTENCE (ONLY IF 100% PURE ENGLISH) ─
    # If the text is purely an English practice sentence without any Spanish,
    # speak with native English Studio voice
    if is_predominantly_english(text):
        speech_text = preprocess_text_for_tts(text, is_spanish_tutor=False)
        is_explicit_male = any(m in vid for m in ("male", "roger", "guy", "christopher", "alvaro", "jorge", "alonso"))
        chosen_en_voice = "en-US-RogerNeural" if is_explicit_male else "en-US-JennyNeural"
        if vid.startswith("en-"):
            chosen_en_voice = voice_id

        neural_audio = await _fallback_edge_tts(speech_text, voice_id=chosen_en_voice, speed=speed)
        if neural_audio and len(neural_audio) > 100:
            return neural_audio
        return await _synthesize_google_tts(speech_text, lang="en")

    # ── 4. SPANISH TUTOR PERSONA SPEECH (MiniMax HD with Edge Studio Fallback) ─
    speech_text = preprocess_text_for_tts(text, is_spanish_tutor=True)
    if not speech_text:
        return b""

    # A) PRIMARY: MiniMax High-Definition Neural Speech Engine (if valid key)
    if key and key != "your_minimax_api_key_here" and len(key) >= 10:
        minimax_audio = await _synthesize_minimax_tts(
            text=speech_text,
            voice_id=voice_id,
            emotion=emotion,
            speed=speed,
            api_key=key
        )
        if minimax_audio and len(minimax_audio) > 200:
            return minimax_audio

    # B) SECONDARY: Microsoft Edge Neural Studio HD Voice (High-Fidelity Studio Persona)
    is_male = any(m in vid for m in ("male", "jorge", "alvaro", "alonso", "qingse", "jingying", "daxuesheng", "presenter_male"))
    fallback_spanish = "es-MX-JorgeNeural" if is_male else "es-MX-DaliaNeural"
    if "es-es" in vid or "spain" in vid or "elvira" in vid or "alvaro" in vid:
        fallback_spanish = "es-ES-AlvaroNeural" if is_male else "es-ES-ElviraNeural"
    elif "es-us" in vid or "bilingual" in vid or "paloma" in vid or "alonso" in vid:
        fallback_spanish = "es-US-AlonsoNeural" if is_male else "es-US-PalomaNeural"

    neural_audio = await _fallback_edge_tts(speech_text, voice_id=fallback_spanish, speed=speed)
    if neural_audio and len(neural_audio) > 100:
        return neural_audio

    # C) TERTIARY: Google TTS Spanish Fallback
    google_audio = await _synthesize_google_tts(speech_text, lang="es", tld="com.mx")
    if google_audio and len(google_audio) > 100:
        return google_audio

    return await _synthesize_google_tts(speech_text, lang="es", tld="com")

