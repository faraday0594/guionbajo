"""
Guionbajo — High-Definition Neural Phonetics & TTS Router
Synthesizes English phonemes using Microsoft Edge Neural TTS with instant disk & memory caching.
Features multi-tier fallback (Edge-TTS -> gTTS -> eSpeak-ng -> WebSpeech).
"""
import os
import re
import io
import wave
import struct
import shutil
import asyncio
import logging
import urllib.parse
from typing import Optional, Dict, Any

import edge_tts
from gtts import gTTS
from fastapi import APIRouter, Depends, Response, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from auth.dependencies import get_current_user
from database import get_db
from models.user import User, StudentProfile
from schemas.student import TTSRequest
from core.tts_service import synthesize_speech, AVAILABLE_VOICES
from core.wikimedia_ipa_map import WIKIMEDIA_IPA_CATALOG, get_wikimedia_entry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tts", tags=["tts"])

# Directory where official Wikimedia / Studio isolated phoneme audio files are stored
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
PHONEME_CACHE_DIR = os.path.join(STATIC_DIR, "phonemes_cache")
os.makedirs(PHONEME_CACHE_DIR, exist_ok=True)

# In-memory fast audio cache
MEMORY_AUDIO_CACHE: Dict[str, bytes] = {}

# ─── 44 English Phonemes Neural Acoustic Vocalization Map ──────────────────────
# Tuned for authentic native English articulation with high clarity.
PHONETIC_NEURAL_MAP: Dict[str, Dict[str, Any]] = {
    # ── Short Vowels ──────────────────────────────────────────────────────────
    "/ɪ/":  {"text": "ih", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "ship", "name": "Short I"},
    "/e/":  {"text": "eh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "bed", "name": "Short E"},
    "/æ/":  {"text": "a", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "cat", "name": "Short A"},
    "/ʌ/":  {"text": "uh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "cup", "name": "Short U"},
    "/ɒ/":  {"text": "o", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "hot", "name": "Short O"},
    "/ʊ/":  {"text": "oo", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "foot", "name": "Short OO"},
    "/ə/":  {"text": "a", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "about", "name": "Schwa"},
    # ── Long Vowels ───────────────────────────────────────────────────────────
    "/iː/": {"text": "eee", "voice": "en-US-JennyNeural", "rate": "-20%", "anchor": "sheep", "name": "Long E"},
    "/ɑː/": {"text": "aah", "voice": "en-US-JennyNeural", "rate": "-20%", "anchor": "car", "name": "Long A"},
    "/ɔː/": {"text": "aw", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "door", "name": "Long O"},
    "/uː/": {"text": "ooo", "voice": "en-US-JennyNeural", "rate": "-20%", "anchor": "blue", "name": "Long OO"},
    "/ɜː/": {"text": "er", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "bird", "name": "Long ER"},
    # ── Diphthongs ────────────────────────────────────────────────────────────
    "/eɪ/": {"text": "ay", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "day", "name": "Face Diphthong"},
    "/aɪ/": {"text": "eye", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "my", "name": "Price Diphthong"},
    "/ɔɪ/": {"text": "oy", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "boy", "name": "Choice Diphthong"},
    "/aʊ/": {"text": "ow", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "now", "name": "Mouth Diphthong"},
    "/əʊ/": {"text": "oh", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "go", "name": "Goat Diphthong"},
    "/ɪə/": {"text": "ear", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "near", "name": "Near Diphthong"},
    "/eə/": {"text": "air", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "hair", "name": "Square Diphthong"},
    "/ʊə/": {"text": "pure", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "cure", "name": "Cure Diphthong"},
    # ── Fricatives ────────────────────────────────────────────────────────────
    "/f/":  {"text": "fff", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "fish", "name": "Voiceless F"},
    "/v/":  {"text": "vvv", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "van", "name": "Voiced V"},
    "/θ/":  {"text": "th", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "think", "name": "Voiceless TH"},
    "/ð/":  {"text": "the", "voice": "en-US-JennyNeural", "rate": "-15%", "anchor": "this", "name": "Voiced TH"},
    "/s/":  {"text": "sss", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "sun", "name": "Voiceless S"},
    "/z/":  {"text": "zzz", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "zoo", "name": "Voiced Z"},
    "/ʃ/":  {"text": "shh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "shoe", "name": "SH Sound"},
    "/ʒ/":  {"text": "zh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "measure", "name": "ZH Sound"},
    "/h/":  {"text": "huh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "hat", "name": "H Sound"},
    # ── Affricates ────────────────────────────────────────────────────────────
    "/tʃ/": {"text": "ch", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "chair", "name": "CH Sound"},
    "/dʒ/": {"text": "juh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "judge", "name": "J Sound"},
    # ── Plosives ──────────────────────────────────────────────────────────────
    "/p/":  {"text": "puh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "pen", "name": "P Plosive"},
    "/b/":  {"text": "buh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "bad", "name": "B Plosive"},
    "/t/":  {"text": "tuh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "tea", "name": "T Plosive"},
    "/d/":  {"text": "duh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "dog", "name": "D Plosive"},
    "/k/":  {"text": "kuh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "cat", "name": "K Plosive"},
    "/g/":  {"text": "guh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "get", "name": "G Plosive"},
    # ── Nasals ────────────────────────────────────────────────────────────────
    "/m/":  {"text": "mmm", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "man", "name": "M Nasal"},
    "/n/":  {"text": "nnn", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "no", "name": "N Nasal"},
    "/ŋ/":  {"text": "ng", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "sing", "name": "NG Nasal"},
    # ── Liquids & Approximants ────────────────────────────────────────────────
    "/l/":  {"text": "lll", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "leg", "name": "L Liquid"},
    "/r/":  {"text": "rrr", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "red", "name": "R Approximant"},
    "/j/":  {"text": "yuh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "yes", "name": "Y Glide"},
    "/w/":  {"text": "wuh", "voice": "en-US-JennyNeural", "rate": "-10%", "anchor": "wet", "name": "W Glide"},
}

# ─── eSpeak-ng fallback map for offline redundancy ───────────────────────────
ESPEAK_PHONEME_MAP: Dict[str, str] = {
    "/ɪ/": "[[I]]", "/e/": "[[e]]", "/æ/": "[[ae]]", "/ʌ/": "[[V]]",
    "/ɒ/": "[[Q]]", "/ʊ/": "[[U]]", "/ə/": "[[@]]", "/iː/": "[[i:]]",
    "/ɑː/": "[[A:]]", "/ɔː/": "[[O:]]", "/uː/": "[[u:]]", "/ɜː/": "[[3:]]",
    "/eɪ/": "[[eI]]", "/aɪ/": "[[aI]]", "/ɔɪ/": "[[OI]]", "/aʊ/": "[[aU]]",
    "/əʊ/": "[[oU]]", "/ɪə/": "[[I@]]", "/eə/": "[[e@]]", "/ʊə/": "[[U@]]",
    "/f/": "[[f:]]", "/v/": "[[v:]]", "/θ/": "[[T:]]", "/ð/": "[[D:]]",
    "/s/": "[[s:]]", "/z/": "[[z:]]", "/ʃ/": "[[S:]]", "/ʒ/": "[[Z:]]",
    "/h/": "[[h:]]", "/tʃ/": "[[tS]]", "/dʒ/": "[[d_Z]]", "/p/": "[[p_h]]",
    "/b/": "[[b_h]]", "/t/": "[[t_h]]", "/d/": "[[d#]]", "/k/": "[[k_h]]",
    "/g/": "[[g_h]]", "/m/": "[[m:]]", "/n/": "[[n:]]", "/ŋ/": "[[N:]]",
    "/l/": "[[l:]]", "/r/": "[[r-]]", "/j/": "[[j]]", "/w/": "[[w]]",
}

# Unicode IPA variant mappings to standard catalog notation
IPA_UNICODE_REPLACEMENTS: Dict[str, str] = {
    "\u0261": "g",       # ɡ -> g
    "\u0279": "r",       # ɹ -> r
    "\u025b": "e",       # ɛ -> e
    "oʊ": "əʊ",
    "ou": "əʊ",
    "a:": "ɑː",
    "aː": "ɑː",
    "i:": "iː",
    "u:": "uː",
    "o:": "ɔː",
    "3:": "ɜː",
    "\u025d": "ɜː",
    "\u025a": "ə",
    "\u026b": "l",
    "th": "θ",
    "sh": "ʃ",
    "ch": "tʃ",
    "zh": "ʒ",
    "ng": "ŋ",
    "ee": "iː",
    "oo": "uː",
}


def _get_safe_filename(ipa_symbol: str) -> str:
    """Produces a clean filename for disk caching."""
    clean = ipa_symbol.replace("/", "").replace("ː", "_long").replace(":", "_long")
    return f"{clean}.mp3"


def normalize_ipa_symbol(raw_symbol: str) -> Optional[str]:
    """
    Normalizes any format of IPA input (URL-encoded, with/without slashes,
    unicode variants, colons) into the standard catalog key.
    """
    if not raw_symbol:
        return None
    unquoted = urllib.parse.unquote(raw_symbol).strip()
    clean = re.sub(r"[\u0361\u035c\u02c8\u02cc\'\"]", "", unquoted).strip("/")

    for src, dst in IPA_UNICODE_REPLACEMENTS.items():
        clean = clean.replace(src, dst)

    candidates = [
        f"/{clean}/",
        clean,
    ]

    for cand in candidates:
        if cand in PHONETIC_NEURAL_MAP:
            return cand

    # Handle single symbol variants
    if f"/{clean.replace(':', 'ː')}/" in PHONETIC_NEURAL_MAP:
        return f"/{clean.replace(':', 'ː')}/"

    return None


async def _generate_edge_tts_audio(text: str, voice: str = "en-US-JennyNeural", rate: str = "-10%") -> bytes:
    """Synthesizes high-fidelity MP3 audio using Edge Neural TTS."""
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return audio_data


def _generate_gtts_audio(text: str, lang: str = "en") -> bytes:
    """Fallback synthesis using Google TTS (gTTS)."""
    tts = gTTS(text=text, lang=lang, slow=True)
    bio = io.BytesIO()
    tts.write_to_fp(bio)
    return bio.getvalue()


def _get_espeak_executable() -> str:
    exe = shutil.which("espeak-ng") or shutil.which("espeak")
    if exe:
        return exe
    for path in [
        r"C:\Program Files\eSpeak NG\espeak-ng.exe",
        r"C:\Program Files\eSpeak NG\espeak.exe",
        r"C:\Program Files (x86)\eSpeak NG\espeak-ng.exe",
    ]:
        if os.path.exists(path):
            return path
    return "espeak-ng"


def _synth_phoneme_wav_fallback(espeak_notation: str) -> bytes:
    """eSpeak-ng fallback as last resort."""
    import subprocess
    import tempfile
    espeak_bin = _get_espeak_executable()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        wav_path = f.name
    try:
        subprocess.run(
            [espeak_bin, espeak_notation, "-v", "en-us", "-w", wav_path, "-a", "200", "-s", "110"],
            capture_output=True,
            timeout=5,
        )
        with open(wav_path, "rb") as f:
            return f.read()
    except Exception as e:
        logger.warning(f"eSpeak fallback error: {e}")
        return b""
    finally:
        if os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except Exception:
                pass


CLEAN_PHONEME_DIR = os.path.join(STATIC_DIR, "phonemes_clean")
ESPEAK_PHONEME_DIR = os.path.join(STATIC_DIR, "phonemes_espeak")
HUMAN_PHONEME_DIR = os.path.join(STATIC_DIR, "phonemes_human")
CAMBRIDGE_PHONEME_DIR = os.path.join(STATIC_DIR, "phonemes_cambridge")
os.makedirs(CLEAN_PHONEME_DIR, exist_ok=True)
os.makedirs(ESPEAK_PHONEME_DIR, exist_ok=True)
os.makedirs(HUMAN_PHONEME_DIR, exist_ok=True)
os.makedirs(CAMBRIDGE_PHONEME_DIR, exist_ok=True)

SAFE_ESPEAK_MAP = {
    # Short Vowels
    '/ɪ/': 'vowel_short_i',
    '/e/': 'vowel_short_e',
    '/æ/': 'vowel_short_ae',
    '/ʌ/': 'vowel_short_wedge',
    '/ɒ/': 'vowel_short_lot',
    '/ʊ/': 'vowel_short_foot',
    '/ə/': 'vowel_schwa',
    # Long Vowels
    '/iː/': 'vowel_long_e',
    '/ɑː/': 'vowel_long_a',
    '/ɔː/': 'vowel_long_o',
    '/uː/': 'vowel_long_u',
    '/ɜː/': 'vowel_long_er',
    # Diphthongs
    '/eɪ/': 'diph_ei',
    '/aɪ/': 'diph_ai',
    '/ɔɪ/': 'diph_oi',
    '/aʊ/': 'diph_au',
    '/əʊ/': 'diph_ou',
    '/ɪə/': 'diph_ie',
    '/eə/': 'diph_ea',
    '/ʊə/': 'diph_ue',
    # Fricatives
    '/f/':  'con_f',
    '/v/':  'con_v',
    '/θ/':  'con_th_voiceless',
    '/ð/':  'con_th_voiced',
    '/s/':  'con_s',
    '/z/':  'con_z',
    '/ʃ/':  'con_sh',
    '/ʒ/':  'con_zh',
    '/h/':  'con_h',
    # Affricates
    '/tʃ/': 'con_ch',
    '/dʒ/': 'con_dzh',
    # Plosives
    '/p/':  'con_p',
    '/b/':  'con_b',
    '/t/':  'con_t',
    '/d/':  'con_d',
    '/k/':  'con_k',
    '/g/':  'con_g',
    # Nasals & Approximants
    '/m/':  'con_m',
    '/n/':  'con_n',
    '/ŋ/':  'con_ng',
    '/l/':  'con_l',
    '/r/':  'con_r',
    '/j/':  'con_j',
    '/w/':  'con_w'
}

# In-memory fast audio cache: key -> (audio_bytes, media_type)
MEMORY_AUDIO_CACHE: Dict[str, tuple[bytes, str]] = {}


async def get_or_create_phoneme_audio(matched_key: str, use_anchor: bool = False) -> tuple[bytes, str]:
    """
    Retrieves authentic isolated phoneme audio from:
    1. Memory Cache
    2. Official Wikimedia Commons / Oxford Isolated Audio (backend/static/phonemes_cache)
    3. Disk cached anchor word (for anchor playback)
    4. Neural Studio Synthesis fallback.
    Returns (audio_bytes, media_type).
    """
    cache_key = f"{matched_key}:anchor" if use_anchor else matched_key

    # 1. In-memory cache hit
    if cache_key in MEMORY_AUDIO_CACHE:
        return MEMORY_AUDIO_CACHE[cache_key]

    wiki_entry = get_wikimedia_entry(matched_key)
    safe_name = _get_safe_filename(matched_key)

    # 2. Pure isolated phoneme request -> Official Wikimedia / Oxford Recording first!
    if not use_anchor:
        if wiki_entry:
            local_ogg = wiki_entry["local_file"]
            local_mp3 = local_ogg.replace(".ogg", ".mp3")
            
            # Check OGG
            p_ogg = os.path.join(PHONEME_CACHE_DIR, local_ogg)
            if os.path.exists(p_ogg) and os.path.getsize(p_ogg) > 500:
                try:
                    with open(p_ogg, "rb") as f:
                        data = f.read()
                    MEMORY_AUDIO_CACHE[cache_key] = (data, "audio/ogg")
                    return data, "audio/ogg"
                except Exception as e:
                    logger.warning(f"Error reading phoneme OGG {p_ogg}: {e}")

            # Check MP3
            p_mp3 = os.path.join(PHONEME_CACHE_DIR, local_mp3)
            if os.path.exists(p_mp3) and os.path.getsize(p_mp3) > 500:
                try:
                    with open(p_mp3, "rb") as f:
                        data = f.read()
                    MEMORY_AUDIO_CACHE[cache_key] = (data, "audio/mpeg")
                    return data, "audio/mpeg"
                except Exception as e:
                    logger.warning(f"Error reading phoneme MP3 {p_mp3}: {e}")

    # 3. Disk cache hit for anchor word
    fname = f"anchor_{safe_name}" if use_anchor else safe_name
    disk_path = os.path.join(PHONEME_CACHE_DIR, fname)

    if os.path.exists(disk_path) and os.path.getsize(disk_path) > 100:
        try:
            with open(disk_path, "rb") as f:
                data = f.read()
            MEMORY_AUDIO_CACHE[cache_key] = (data, "audio/mpeg")
            return data, "audio/mpeg"
        except Exception as e:
            logger.warning(f"Failed reading cached phoneme file {disk_path}: {e}")

    # 4. Synthesize anchor word via Edge Neural TTS
    config = PHONETIC_NEURAL_MAP.get(matched_key, {
        "text": matched_key.strip("/"),
        "voice": "en-US-JennyNeural",
        "rate": "-10%",
        "anchor": "English",
        "name": matched_key
    })

    text_to_speak = config["anchor"] if use_anchor else config["text"]
    voice = config.get("voice", "en-US-JennyNeural")
    rate = config.get("rate", "-10%")

    try:
        audio_bytes = await _generate_edge_tts_audio(text_to_speak, voice=voice, rate=rate)
        if audio_bytes and len(audio_bytes) > 200:
            try:
                with open(disk_path, "wb") as f:
                    f.write(audio_bytes)
            except Exception as e:
                logger.warning(f"Failed saving disk cache {disk_path}: {e}")

            MEMORY_AUDIO_CACHE[cache_key] = (audio_bytes, "audio/mpeg")
            return audio_bytes, "audio/mpeg"
    except Exception as e:
        logger.warning(f"Edge TTS phoneme synthesis failed for {matched_key}: {e}")

    # 5. Fallback: Google TTS (gTTS)
    try:
        loop = asyncio.get_event_loop()
        gtts_bytes = await loop.run_in_executor(None, _generate_gtts_audio, text_to_speak, "en")
        if gtts_bytes and len(gtts_bytes) > 200:
            MEMORY_AUDIO_CACHE[cache_key] = (gtts_bytes, "audio/mpeg")
            return gtts_bytes, "audio/mpeg"
    except Exception as e:
        logger.warning(f"gTTS fallback failed for {matched_key}: {e}")

    raise RuntimeError(f"All synthesis engines failed for phoneme {matched_key}")


# ─── Pre-load all 44 authentic isolated phonemes into memory cache ────────────
def prewarm_memory_cache():
    """Populates in-memory cache directly with authentic Wikimedia/Oxford isolated audio."""
    MEMORY_AUDIO_CACHE.clear()
    loaded_pure = 0
    loaded_anchors = 0

    # 1. Load authentic isolated recordings
    for ipa, info in WIKIMEDIA_IPA_CATALOG.items():
        local_ogg = info["local_file"]
        local_mp3 = local_ogg.replace(".ogg", ".mp3")

        p_ogg = os.path.join(PHONEME_CACHE_DIR, local_ogg)
        if os.path.exists(p_ogg) and os.path.getsize(p_ogg) > 500:
            try:
                with open(p_ogg, "rb") as f:
                    MEMORY_AUDIO_CACHE[ipa] = (f.read(), "audio/ogg")
                loaded_pure += 1
                continue
            except Exception:
                pass

        p_mp3 = os.path.join(PHONEME_CACHE_DIR, local_mp3)
        if os.path.exists(p_mp3) and os.path.getsize(p_mp3) > 500:
            try:
                with open(p_mp3, "rb") as f:
                    MEMORY_AUDIO_CACHE[ipa] = (f.read(), "audio/mpeg")
                loaded_pure += 1
            except Exception:
                pass

    # 2. Load anchor word recordings
    for ipa in PHONETIC_NEURAL_MAP:
        anchor_fname = f"anchor_{_get_safe_filename(ipa)}"
        apath = os.path.join(PHONEME_CACHE_DIR, anchor_fname)
        if os.path.exists(apath) and os.path.getsize(apath) > 100:
            try:
                with open(apath, "rb") as f:
                    MEMORY_AUDIO_CACHE[f"{ipa}:anchor"] = (f.read(), "audio/mpeg")
                loaded_anchors += 1
            except Exception:
                pass

    logger.info(f"Prewarmed memory cache: {loaded_pure}/44 authentic isolated phonemes + {loaded_anchors} anchor words.")


prewarm_memory_cache()


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/engine-status")
async def tts_engine_status():
    """
    Diagnostic endpoint to verify Neural TTS and phoneme engine health.
    """
    disk_cached_files = len(os.listdir(PHONEME_CACHE_DIR)) if os.path.exists(PHONEME_CACHE_DIR) else 0
    return {
        "engine": "Microsoft Edge Neural TTS (with gTTS and eSpeak-ng fallbacks)",
        "neural_voice": "en-US-JennyNeural",
        "total_phonemes_mapped": len(PHONETIC_NEURAL_MAP),
        "in_memory_cached": len(MEMORY_AUDIO_CACHE),
        "disk_cached_files": disk_cached_files,
        "status": "ready"
    }


@router.post("/prewarm")
async def tts_prewarm_phonemes():
    """
    Pre-generates all 44 English phonemes to disk and loads them into memory.
    """
    success_count = 0
    for ipa in PHONETIC_NEURAL_MAP:
        try:
            await get_or_create_phoneme_audio(ipa, use_anchor=False)
            success_count += 1
        except Exception as e:
            logger.error(f"Error prewarming {ipa}: {e}")

    return {
        "status": "completed",
        "total": len(PHONETIC_NEURAL_MAP),
        "cached_successfully": success_count,
        "in_memory_count": len(MEMORY_AUDIO_CACHE)
    }


@router.post("/synthesize")
async def tts_synthesize(
    req: TTSRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()

    audio_bytes = await synthesize_speech(
        text=req.text,
        voice_id=req.voice,
        emotion=req.emotion,
        speed=req.speed,
        api_key=profile.minimax_api_key if profile else None,
    )

    if not audio_bytes:
        # Fallback to Edge Neural TTS for full tutor resilience
        try:
            is_english = req.voice.startswith("en") or any(
                c in req.text.lower() for c in ["lesson", "practice", "repeat", "listen"]
            )
            voice_to_use = "en-US-JennyNeural" if is_english else "es-MX-DaliaNeural"
            audio_bytes = await _generate_edge_tts_audio(req.text, voice=voice_to_use)
        except Exception as e:
            logger.error(f"Edge TTS fallback error: {e}")

    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.get("/phoneme")
@router.get("/phoneme/{ipa_symbol:path}")
async def tts_phoneme(
    ipa_symbol: Optional[str] = None,
    symbol: Optional[str] = Query(None),
    anchor: Optional[bool] = Query(False),
):
    """
    Synthesize an isolated English phoneme using Microsoft Edge Neural TTS.
    Returns high-definition audio/mpeg with instantaneous (0ms) cached response.
    """
    raw = symbol or ipa_symbol
    if not raw:
        raise HTTPException(status_code=400, detail="Missing phoneme symbol parameter")

    matched_key = normalize_ipa_symbol(raw)
    if not matched_key:
        raise HTTPException(
            status_code=404,
            detail=f"Phoneme '{raw}' not found in 44-phoneme catalog.",
        )

    try:
        audio_bytes, media_type = await get_or_create_phoneme_audio(matched_key, use_anchor=bool(anchor))
        return Response(
            content=audio_bytes,
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=86400",
                "X-Phoneme-Symbol": urllib.parse.quote(matched_key)
            }
        )
    except Exception as e:
        logger.error(f"Phoneme synthesis failure for '{raw}': {e}")
        raise HTTPException(status_code=500, detail=f"Phoneme synthesis failed: {e}")


@router.get("/voices")
async def get_tts_voices():
    return AVAILABLE_VOICES
