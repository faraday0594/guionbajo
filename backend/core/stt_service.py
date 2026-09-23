"""
Guionbajo — Unified Speech-to-Text (STT) Service
Primary Engine: MiniMax ASR (asr-1.0)
Fallback Engine: Groq Whisper (whisper-large-v3-turbo)
"""
import time
import re
import logging
import httpx
import subprocess
import shutil
from typing import Dict, Any, Optional
from config import settings
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# Common hallucination artifacts on silence / background static
HALLUCINATION_PATTERNS = [
    r'[\u4e00-\u9fff]', # Chinese characters
    r'thank you for watching',
    r'thanks for watching',
    r'subtitles by',
    r'amara\.org',
    r'watch more videos',
    r'subscribe to our channel',
    r'please subscribe',
]


def normalize_audio_for_stt(audio_bytes: bytes, filename: str, mime_type: str) -> tuple[bytes, str, str]:
    """
    Ensures the audio stream has an explicit duration in its container header.
    Browser MediaRecorder WebM streams lack container duration headers, causing
    MiniMax ASR to reject them with 'duration is N/A (2013)'.
    Transcoding to 16kHz mono WAV creates a valid 44-byte WAV header with exact duration.
    """
    if audio_bytes.startswith(b"RIFF") and b"WAVE" in audio_bytes[:16]:
        return audio_bytes, filename if filename.endswith(".wav") else "audio.wav", "audio/wav"

    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    try:
        cmd = [
            ffmpeg_bin,
            "-y",
            "-i", "pipe:0",
            "-vn",
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            "-f", "wav",
            "pipe:1",
        ]
        p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out, err = p.communicate(input=audio_bytes, timeout=12.0)
        if p.returncode == 0 and out and len(out) > 44:
            return out, "audio.wav", "audio/wav"
        else:
            logger.warning(f"ffmpeg conversion returned code {p.returncode}: {err[:200] if err else ''}")
    except Exception as e:
        logger.warning(f"ffmpeg audio conversion failed ({e}), continuing with raw bytes")

    return audio_bytes, filename, mime_type


async def transcribe_audio_stt(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    mime_type: str = "audio/webm",
    language: str = "en",
    minimax_api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Transcribes audio using MiniMax Speech to Text API (asr-1.0) as the primary engine.
    If MiniMax STT is unavailable or fails, seamlessly falls back to Groq Whisper.
    """
    start_time = time.time()
    api_key = minimax_api_key or settings.MINIMAX_API_KEY
    g_key = groq_api_key or settings.GROQ_API_KEY

    if not audio_bytes or len(audio_bytes) < 80:
        return {
            "text": "",
            "duration": 0.0,
            "words": [],
            "engine": "none",
            "latency_ms": 0,
        }

    # Normalize audio container to 16kHz mono WAV to guarantee duration header
    audio_bytes, filename, mime_type = normalize_audio_for_stt(audio_bytes, filename, mime_type)

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Primary Engine: MiniMax Speech to Text (asr-1.0)
    # ──────────────────────────────────────────────────────────────────────────
    if api_key and api_key.strip():
        stt_url = f"{settings.MINIMAX_BASE_URL}/speech_to_text"
        headers = {"Authorization": f"Bearer {api_key.strip()}"}
        files = {
            "file": (filename, audio_bytes, mime_type),
            "model": (None, "asr-1.0"),
            "language": (None, language),
            "response_format": (None, "verbose_json"),
            "timestamp_level": (None, "word"),
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(stt_url, headers=headers, files=files)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = (data.get("text") or "").strip()

                    # Filter hallucinated ASR text on silent or very quiet audio
                    is_hallucination = any(
                        re.search(pat, raw_text, re.IGNORECASE) for pat in HALLUCINATION_PATTERNS
                    )
                    if is_hallucination:
                        logger.warning(f"Discarded hallucinated MiniMax ASR output: '{raw_text}'")
                        raw_text = ""

                    duration = float(data.get("duration") or 0.0)
                    words = []
                    for seg in data.get("segments", []):
                        w_text = (seg.get("text") or "").strip()
                        if w_text:
                            words.append({
                                "word": w_text,
                                "start": seg.get("start"),
                                "end": seg.get("end")
                            })

                    latency_ms = int((time.time() - start_time) * 1000)
                    logger.info(f"MiniMax STT (asr-1.0) transcribed '{raw_text}' in {latency_ms}ms")
                    return {
                        "text": raw_text,
                        "duration": duration,
                        "words": words,
                        "engine": "minimax-asr-1.0",
                        "latency_ms": latency_ms,
                    }
                else:
                    logger.warning(f"MiniMax STT returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"MiniMax STT error: {e}. Falling back to Groq Whisper...")

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Fallback Engine: Groq Whisper
    # ──────────────────────────────────────────────────────────────────────────
    if g_key and g_key.strip():
        try:
            groq_client = AsyncOpenAI(
                api_key=g_key.strip(),
                base_url=settings.GROQ_BASE_URL,
                timeout=12.0,
            )
            whisper_res = await groq_client.audio.transcriptions.create(
                model=settings.GROQ_WHISPER_MODEL,
                file=(filename, audio_bytes, mime_type),
                language=language,
                response_format="verbose_json",
            )
            raw_text = (getattr(whisper_res, "text", "") or "").strip()
            latency_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Groq Whisper fallback transcribed '{raw_text}' in {latency_ms}ms")
            return {
                "text": raw_text,
                "duration": float(getattr(whisper_res, "duration", 0.0) or 0.0),
                "words": [],
                "engine": "groq-whisper",
                "latency_ms": latency_ms,
            }
        except Exception as e:
            logger.error(f"Groq Whisper fallback also failed: {e}")

    latency_ms = int((time.time() - start_time) * 1000)
    return {
        "text": "",
        "duration": 0.0,
        "words": [],
        "engine": "none",
        "latency_ms": latency_ms,
    }
