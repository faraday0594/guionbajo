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
    # Clean and stylize prompt for MiniMax image-01 API
    raw = req.prompt.strip()
    
    # If prompt is for POV / Visual Novel or conversational scene, enforce bright anime visual novel style and eliminate dark photo artifacts
    if any(k in raw.lower() for k in ("first-person", "pov", "classmate", "companion", "barista", "officer", "interviewer", "talking to", "sitting across")):
        enhanced = re.sub(r'realistic photography|photorealistic|photorealism|realistic photo|photo', 'clean 2D anime visual novel illustration, Makoto Shinkai vibrant aesthetic, bright daylight', raw, flags=re.IGNORECASE)
        if "anime" not in enhanced.lower():
            enhanced = f"Clean vibrant 2D anime visual novel digital art style, Makoto Shinkai aesthetic, high-key bright daylight, {enhanced}"
        if "no dark" not in enhanced.lower():
            enhanced = f"{enhanced}, bright cheerful lighting, colorful, no dark horror lighting, no realistic photo"
    else:
        enhanced = raw

    if not enhanced.lower().endswith("no text"):
        clean_prompt = f"{enhanced}, no text, no letters, no words, no writing, no labels"
    else:
        clean_prompt = enhanced

    cache_key = f"{clean_prompt[:300]}_{req.aspect_ratio or '16:9'}"
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
        "prompt": clean_prompt[:500],
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

