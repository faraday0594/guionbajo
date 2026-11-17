"""
Guionbajo — MiniMax image-01 Router
Generates educational concept illustrations using MiniMax image-01 model.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
import httpx
import logging
from config import settings
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.user import User, StudentProfile
from auth.dependencies import get_current_user_optional

router = APIRouter(prefix="/image", tags=["Image Generation"])
logger = logging.getLogger(__name__)

# Global memory cache for generated images: prompt_hash -> image_url
_IMAGE_CACHE: Dict[str, str] = {}

class ImageGenRequest(BaseModel):
    prompt: str
    aspect_ratio: Optional[str] = "16:9"

@router.post("/generate")
async def generate_image(
    req: ImageGenRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate an educational illustration using MiniMax image-01 API.
    """
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    import re
    import urllib.parse
    raw = req.prompt.strip()
    # Strip any CJK/Chinese/Japanese/Korean characters from incoming prompts
    raw = re.sub(r'[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+', ' ', raw)

    # 1. Strip any quoted text strings (e.g. 'Hello', "Subject + Verb", etc.)
    sanitized = re.sub(r'["\'“‘`][^"\'”’`]*["\'”’`]', ' ', raw)
    
    # 2. Strip IPA phonetic transcriptions like /e/, /æ/, /iː/, etc.
    sanitized = re.sub(r'/[A-Za-zʃʊʌæəɪɔɑɜθðʒŋːˈ\.\s]+/', ' ', sanitized)

    # 3. Replace text-bearing surfaces, books, menus, screens & text triggers with clean visual equivalents
    sanitized = re.sub(r'\b(?:blackboard|whiteboard|chalkboard|bulletin board|departure flight boards?|flight boards?)\b', 'sunny window', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'\b(?:signboard|billboard|road sign|traffic sign|wooden sign|street sign|sign saying|sign with|signs?)\b', 'green trees', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'\b(?:speech bubble|dialogue bubble|chat bubble|thought bubble|speech balloon|bubbles?)\b', 'warm lighting', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'\b(?:poster|banner|placard|flyer|pamphlet|brochure|menus?|newspapers?|magazines?|exams?|certificates?|diplomas?|badges?|tickets?|blueprints?)\b', 'ceramic cup', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'\b(?:flashcards?|cue cards?|cards?|notebooks?|textbooks?|open books?|books?|notes?|pages?|papers?|sheets?|documents?|lists?)\b', 'potted green plant', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'\b(?:laptops?|computers?|monitors?|screens?|tablets?|smartphones?|phones?)\b', 'wooden table', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'\b(?:grammar formula|grammar rules?|syntactic formula|formula|equation|english class|english lesson|online english|english)\b', 'cozy atmosphere', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'\b(?:displaying|saying|reading|writing|studying|taking notes|showing the words?|labeled with|with the phrase|with the letters?|with text)\b', 'smiling warmly', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'\b(?:duel|versus|vs|fight|fighting|boxers|boxing ring|boxing gloves|letters|phoneme|alphabet|spelling|text|characters|subtitles|typography|speech|dialogue|conversation|talking|speaking|chatting|telling|bubble|bubbles|words|labels|captions|watermarks|script)\b', 'friendly visual scene', sanitized, flags=re.IGNORECASE)

    # 4. Remove leftover quotes and brackets
    sanitized = re.sub(r'[/\\|\[\](){}+=→<>_~*#^"“”‘’`]', ' ', sanitized)
    # Remove existing negative text tags (mentioning "text", "bubbles", "chinese" triggers diffusion models to draw them!)
    sanitized = re.sub(r'\b(?:strictly\s+)?no\s+(?:text|letters|words|writing|labels|captions|typography|watermarks|alphabets|signs|speech\s+bubbles|chinese(?:\s+characters)?|hanzi|kanji|cjk(?:\s+text)?|asian\s+script)\b,?', ' ', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'\s{2,}', ' ', sanitized).strip(' ,')

    # Detect if prompt is for conversational POV / Visual Novel or companion scene
    is_pov = any(k in sanitized.lower() for k in ("first-person", "pov", "classmate", "companion", "barista", "officer", "interviewer", "sitting across", "visual novel", "emma", "lucas"))
    
    if is_pov:
        # Determine companion gender for solo character tag
        is_female = any(f in sanitized.lower() for f in ("female", "girl", "woman", "emma", "carter", "sarah", "anna", "she", "her"))
        char_tag = "solo, 1girl, single female character only" if is_female else "solo, 1boy, single male character only"
        
        # Remove mentions of player's hands that confuse the diffusion model into generating couples holding hands
        sanitized = re.sub(r"player's (own )?hands (and arms )?(visible in (the )?bottom foreground )?(holding|resting|reaching|gesturing)?", "wooden table edge in foreground", sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(r'realistic photography|photorealistic|photorealism|realistic photo|photo|realism|hyperrealistic', '2D anime game CG art', sanitized, flags=re.IGNORECASE)
        
        # Construct clean Anime Visual Novel prompt WITHOUT negative trigger tokens
        clean_prompt = (
            f"Masterpiece 2D Japanese anime visual novel game CG, "
            f"Makoto Shinkai vibrant aesthetic, Kyoto Animation style, {char_tag}, "
            f"facing camera directly with friendly eye contact, centered waist-up portrait, "
            f"{sanitized}, bright cheerful daylight, colorful anime digital illustration, "
            f"clean empty wall background, purely visual silent scene, flat vibrant coloring, clean anime line art"
        )
    else:
        # Standard educational concept prompt - PURE POSITIVE VISUAL DESCRIPTION
        clean_prompt = (
            f"Clean flat 2D vector educational illustration, "
            f"{sanitized}, vibrant colors, clean minimalist art style, "
            f"clean empty background, purely visual silent scene, uncluttered composition"
        )

    api_key = settings.MINIMAX_API_KEY
    if not api_key and current_user:
        result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
        profile = result.scalars().first()
        if profile and profile.minimax_api_key:
            api_key = profile.minimax_api_key

    if not api_key:
        logger.warning("No MiniMax API key configured for image generation. Using high-definition fallback.")
        encoded_prompt = urllib.parse.quote(clean_prompt[:500])
        fallback_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=720&nologo=true"
        return {
            "success": True,
            "url": fallback_url,
            "image_url": fallback_url,
            "prompt": clean_prompt,
            "model": "pollinations-fallback",
            "provider": "pollinations"
        }

    cache_key = f"{clean_prompt[:400]}_{req.aspect_ratio or '16:9'}"
    if cache_key in _IMAGE_CACHE:
        cached_url = _IMAGE_CACHE[cache_key]
        logger.info(f"Returning cached MiniMax image: {cached_url[:60]}...")
        return {
            "success": True,
            "url": cached_url,
            "image_url": cached_url,
            "prompt": clean_prompt,
            "model": "image-01",
            "provider": "minimax",
            "cached": True
        }

    url = "https://api.minimax.io/v1/image_generation"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    candidate_models = []
    for m in (settings.MINIMAX_IMAGE_MODEL, "image-01"):
        if m and m not in candidate_models:
            candidate_models.append(m)

    for model_name in candidate_models:
        payload = {
            "model": model_name,
            "prompt": clean_prompt[:1200],
            "aspect_ratio": req.aspect_ratio or "16:9",
            "response_format": "url",
            "prompt_optimizer": False
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response_json = response.json()

                if response.status_code == 200 and "data" in response_json:
                    data = response_json["data"]
                    raw_image_url = None
                    if isinstance(data, dict):
                        if "image_urls" in data and len(data["image_urls"]) > 0:
                            raw_image_url = data["image_urls"][0]
                        elif "images" in data and len(data["images"]) > 0 and isinstance(data["images"][0], dict):
                            raw_image_url = data["images"][0].get("url")

                    if raw_image_url:
                        # Ensure HTTPS to avoid Mixed Content errors on Vercel
                        image_url = raw_image_url.replace("http://", "https://")
                        _IMAGE_CACHE[cache_key] = image_url
                        logger.info(f"Successfully generated MiniMax {model_name}: {image_url[:60]}...")
                        return {
                            "success": True,
                            "url": image_url,
                            "image_url": image_url,
                            "prompt": clean_prompt,
                            "model": model_name,
                            "provider": "minimax"
                        }

                logger.warning(f"MiniMax {model_name} API returned status {response.status_code}: {response_json}")
        except Exception as e:
            logger.error(f"MiniMax {model_name} image generation exception: {e}")

    # Fallback response - Guaranteed high-definition textless educational image
    import urllib.parse
    encoded_prompt = urllib.parse.quote(clean_prompt[:500])
    fallback_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=720&nologo=true"
    return {
        "success": True,
        "url": fallback_url,
        "image_url": fallback_url,
        "prompt": clean_prompt,
        "model": "pollinations-fallback",
        "provider": "pollinations"
    }

