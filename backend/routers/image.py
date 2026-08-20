"""
Guionbajo — MiniMax image-01 Router
Generates educational concept illustrations using MiniMax image-01 model.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import logging
from config import settings

router = APIRouter(prefix="/image", tags=["Image Generation"])
logger = logging.getLogger(__name__)

class ImageGenRequest(BaseModel):
    prompt: str
    aspect_ratio: Optional[str] = "16:9"

@router.post("/generate")
async def generate_image(req: ImageGenRequest):
    """
    Generate an educational illustration using MiniMax image-01 API.
    """
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    url = "https://api.minimax.io/v1/image_generation"
    headers = {
        "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
        "Content-Type": "application/json"
    }

    # Clean prompt for MiniMax image-01 API
    raw = req.prompt.strip()
    if not raw.lower().endswith("no text"):
        clean_prompt = f"{raw}, no text, no letters, no words, no writing, no labels"
    else:
        clean_prompt = raw

    payload = {
        "model": "image-01",
        "prompt": clean_prompt[:500],
        "aspect_ratio": req.aspect_ratio or "16:9"
    }

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response_json = response.json()

            if response.status_code == 200 and "data" in response_json:
                data = response_json["data"]
                if isinstance(data, dict) and "image_urls" in data and len(data["image_urls"]) > 0:
                    image_url = data["image_urls"][0]
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
