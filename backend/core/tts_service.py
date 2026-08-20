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
    {"id": "edge-jenny", "name": "Jenny (Neural Studio English - HD)", "gender": "female", "lang": "en-US"},
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

async def _fallback_edge_tts(text: str, voice_id: str = "edge-jenny", speed: float = 1.0) -> bytes:
    """High-quality Microsoft Neural Voice fallback."""
    try:
        vid = (voice_id or "").lower()
        if "jenny" in vid:
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

async def synthesize_speech(
    text: str,
    voice_id: str = "female-shaonv",
    emotion: str = "calm",
    speed: float = 1.0,
    api_key: str = None
) -> bytes:
    key = api_key or settings.MINIMAX_API_KEY
    
    vid = (voice_id or "").lower()
    is_english = (
        "jenny" in vid
        or "ava" in vid
        or "emma" in vid
        or vid.startswith("en")
        or "edge-jenny" in vid
    )

    # 1. If an Edge Neural voice or English voice is requested, route directly to Edge TTS for instant zero-lag HD audio
    if is_english or vid.startswith("edge-"):
        speech_text = preprocess_text_for_tts(text, is_spanish_tutor=not is_english)
        if not speech_text:
            return b""
        neural_audio = await _fallback_edge_tts(speech_text, voice_id=voice_id, speed=speed)
        if neural_audio:
            return neural_audio

    # Preprocess text for tutor delivery
    speech_text = preprocess_text_for_tts(text, is_spanish_tutor=True)
    if not speech_text:
        return b""

    # 1. If MiniMax key is present, attempt MiniMax synthesis
    if key and key.strip() and key != "YOUR_MINIMAX_API_KEY":
        payload = {
            "model": settings.MINIMAX_TTS_MODEL,
            "text": speech_text,
            "voice_setting": {
                "voice_id": voice_id,
                "speed": speed,
                "emotion": emotion
            },
            "audio_setting": {
                "format": "mp3",
                "sample_rate": 24000
            }
        }

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    settings.MINIMAX_TTS_ENDPOINT,
                    json=payload,
                    headers=headers
                )
                if response.status_code == 200:
                    data = response.json()
                    if "data" in data and "audio" in data["data"]:
                        import base64
                        audio_hex = data["data"]["audio"]
                        if isinstance(audio_hex, str):
                            try:
                                return bytes.fromhex(audio_hex)
                            except ValueError:
                                return base64.b64decode(audio_hex)
        except Exception as e:
            logger.warning(f"MiniMax TTS error, initiating Neural Edge-TTS fallback: {e}")

    # 2. Resilient Neural Fallback via Edge-TTS
    neural_audio = await _fallback_edge_tts(speech_text, voice_id=voice_id, speed=speed)
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
