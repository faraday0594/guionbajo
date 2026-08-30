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

    api_key = settings.MINIMAX_API_KEY
    if not api_key and current_user:
        result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
        profile = result.scalars().first()
        if profile and profile.minimax_api_key:
            api_key = profile.minimax_api_key

    if not api_key:
        logger.warning("No MiniMax API key configured for image generation")
        return {
            "success": False,
            "url": None,
            "error": "MiniMax API key not configured",
            "provider": "minimax"
        }

    import re
    raw = req.prompt.strip()
    
    # Detect if prompt is for conversational POV / Visual Novel or companion scene
    is_pov = any(k in raw.lower() for k in ("first-person", "pov", "classmate", "companion", "barista", "officer", "interviewer", "talking to", "sitting across", "visual novel", "emma", "lucas"))
    
    if is_pov:
        # Determine companion gender for solo character tag
        is_female = any(f in raw.lower() for f in ("female", "girl", "woman", "emma", "carter", "sarah", "anna", "she", "her"))
        char_tag = "solo, 1girl, single female character only" if is_female else "solo, 1boy, single male character only"
        
        # Remove mentions of player's hands that confuse the diffusion model into generating couples holding hands
        sanitized = re.sub(r"player's (own )?hands (and arms )?(visible in (the )?bottom foreground )?(holding|resting|reaching|gesturing)?", "wooden table edge in foreground", raw, flags=re.IGNORECASE)
        sanitized = re.sub(r'realistic photography|photorealistic|photorealism|realistic photo|photo|realism|hyperrealistic', '2D anime game CG art', sanitized, flags=re.IGNORECASE)
        
        # Construct strong Anime Visual Novel prompt with upfront style tokens and strict negative guidance
        clean_prompt = (
            f"Masterpiece 2D Japanese anime visual novel game CG, Makoto Shinkai vibrant aesthetic, Kyoto Animation style, "
            f"{char_tag}, facing camera directly with friendly eye contact, centered waist-up portrait, "
            f"{sanitized}, bright cheerful daylight, colorful anime digital illustration, "
            f"strictly 2D anime drawing, flat vibrant coloring, clean anime line art, "
            f"single person only, no second person, no couple, no romance, no holding hands, no kissing, no photorealism, not a photo, no 3D render, no live action, no text, no words"
        )
    else:
        # Standard educational concept prompt
        clean_prompt = f"Clean flat 2D vector educational illustration, vibrant colors, {raw}, no text, no letters, no words, no writing, no labels"

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

    payload = {
        "model": "image-01",
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
                    logger.info(f"Successfully generated MiniMax image-01: {image_url[:60]}...")
                    return {
                        "success": True,
                        "url": image_url,
                        "image_url": image_url,
                        "prompt": clean_prompt,
                        "model": "image-01",
                        "provider": "minimax"
                    }
            
            logger.warning(f"MiniMax image-01 API returned status {response.status_code}: {response_json}")
    except Exception as e:
        logger.error(f"MiniMax image generation exception: {e}")

    # Fallback response
    return {
        "success": False,
        "url": None,
        "error": "MiniMax image generation unavailable",
        "provider": "minimax"
    }

