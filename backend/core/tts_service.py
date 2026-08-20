import httpx
import re
import logging
import asyncio
import io
import edge_tts
from gtts import gTTS
from config import settings
from core.tts_normalizer import normalize_tts_text, ENGLISH_TTS_PHONETIC_MAP

logger = logging.getLogger(__name__)

AVAILABLE_VOICES = [
    {"id": "edge-roger", "name": "Roger (Neural Studio English - HD Male)", "gender": "male", "lang": "en-US"},
    {"id": "edge-jenny", "name": "Jenny (Neural Studio English - HD Female)", "gender": "female", "lang": "en-US"},
    {"id": "edge-ava", "name": "Ava (Neural Multilingual - HD)", "gender": "female", "lang": "en-US"},
    {"id": "edge-emma", "name": "Emma (Neural Multilingual - HD)", "gender": "female", "lang": "en-US"},
    {"id": "edge-dalia", "name": "Dalia (Neural Spanish/English)", "gender": "female", "lang": "es-MX"},
    {"id": "edge-jorge", "name": "Jorge (Neural Spanish/English Male)", "gender": "male", "lang": "es-MX"},
    {"id": "female-shaonv", "name": "Shaonv (MiniMax Warm)", "gender": "female", "lang": "zh/es"},
    {"id": "male-qn-college", "name": "College Male (MiniMax)", "gender": "male", "lang": "es"},
    {"id": "female-yicheng", "name": "Yicheng (Female - Professional)", "gender": "female", "lang": "zh/es"},
    {"id": "audiobook_male_1", "name": "Audiobook Male", "gender": "male", "lang": "zh/es"},
]

def preprocess_text_for_tts(text: str, is_spanish_tutor: bool = True) -> str:
    """Preprocess text with phonetic and interjection normalizer."""
    return normalize_tts_text(text, is_spanish_tutor=is_spanish_tutor)

async def _fallback_edge_tts(text: str, voice_id: str = "edge-roger", speed: float = 1.0) -> bytes:
    """High-quality Microsoft Neural Voice fallback."""
    try:
        vid = (voice_id or "").lower()
        if "roger" in vid:
            voice = "en-US-RogerNeural"
        elif "jenny" in vid:
            voice = "en-US-JennyNeural"
        elif "ava" in vid:
            voice = "en-US-AvaMultilingualNeural"
        elif "emma" in vid:
            voice = "en-US-EmmaMultilingualNeural"
        elif "jorge" in vid or "male" in vid or "college" in vid:
            voice = "es-MX-JorgeNeural"
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
    """Detects if text is purely/predominantly English sentence/words without Spanish introductory markers."""
    if not text or not isinstance(text, str):
        return False
    # If text contains Spanish inverted punctuation or common Spanish accents, it's Spanish
    if re.search(r'[áéíóúÁÉÍÓÚñÑ¿¡]', text):
        return False
    # Check common Spanish stop words
    spanish_words = {
        "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "para", "por", 
        "con", "sin", "sobre", "entre", "este", "esta", "estos", "estas", "hola", "bienvenido", 
        "bienvenida", "clase", "lección", "hoy", "vamos", "aprender", "fórmula", "regla", "sujeto",
        "verbo", "complemento", "pizarra", "ejemplo", "observa", "revisa", "practica", "fíjate", "como",
        "recuerda", "atención", "nota", "traducción", "aquí", "tienes"
    }
    tokens = [w.lower().strip(",.:;!?\"'()[]{}") for w in text.split()]
    spanish_count = sum(1 for w in tokens if w in spanish_words)
    if spanish_count >= 2:
        return False
    return True

async def synthesize_speech(
    text: str,
    voice_id: str = "female-shaonv",
    emotion: str = "calm",
    speed: float = 1.0,
    api_key: str = None
) -> bytes:
    key = api_key or settings.MINIMAX_API_KEY
    
    vid = (voice_id or "").lower()
    is_eng_voice = (
        "jenny" in vid
        or "ava" in vid
        or "emma" in vid
        or vid.startswith("en")
        or "edge-jenny" in vid
    )
    is_eng_content = is_predominantly_english(text)
    is_english = is_eng_voice or is_eng_content

    # 1. If text is English or an English voice is requested, route directly to Native US English Edge-TTS (RogerNeural)
    if is_english:
        speech_text = preprocess_text_for_tts(text, is_spanish_tutor=False)
        if not speech_text:
            return b""
        eng_voice = "en-US-RogerNeural" if (not vid.startswith("en-") or vid in ("female-shaonv", "edge-jenny")) else voice_id
        neural_audio = await _fallback_edge_tts(speech_text, voice_id=eng_voice, speed=speed)
        if neural_audio:
            return neural_audio

    # 2. Preprocess text for Spanish tutor delivery & use Studio Neural Dalia (es-MX-DaliaNeural)
    speech_text = preprocess_text_for_tts(text, is_spanish_tutor=True)
    if not speech_text:
        return b""

    spanish_voice = "es-MX-DaliaNeural" if vid in ("female-shaonv", "default", "", "edge-dalia") else voice_id
    neural_audio = await _fallback_edge_tts(speech_text, voice_id=spanish_voice, speed=speed)
    if neural_audio:
        return neural_audio

    # 3. Last fallback via gTTS
    try:
        loop = asyncio.get_event_loop()
        def _gtts_run():
            tts = gTTS(text=speech_text, lang="es", slow=False)
            bio = io.BytesIO()
            tts.write_to_fp(bio)
            return bio.getvalue()
        return await loop.run_in_executor(None, _gtts_run)
    except Exception as e:
        logger.error(f"All TTS synthesis engines failed: {e}")
        return b""
