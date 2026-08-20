"""
Guionbajo — Phonetics & Knowledge Graph Router
Provides endpoints for the interactive phonetics board, mouth position guides,
contrast pair drills, and curriculum progress mapping.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import logging

from auth.dependencies import get_current_user
from database import get_db
from models.user import User, StudentProfile
from models.lesson import LessonHistory
from core.phonetic_catalog import (
    PHONETIC_CATALOG,
    get_all_phonemes,
    get_phoneme,
    get_phonemes_by_category
)
from core.curriculum_graph import CURRICULUM_GRAPH, get_sublevel_info
from core.adaptive_engine import AdaptiveEngine
from core.minimax_agent import TutorAgent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/phonetics", tags=["phonetics"])


class PhoneticLessonGenerateRequest(BaseModel):
    phoneme_symbol: str
    contrast_symbol: Optional[str] = None
    sublevel: Optional[str] = None


class PhonemeRecordRequest(BaseModel):
    phoneme_symbol: str
    is_correct: bool
    score: Optional[float] = None
    transcription: Optional[str] = None


@router.get("/board")
async def get_phonetic_board(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all 44 phonemes organized by category, enriched with the student's mastery %.
    """
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    user_mastery = (profile.phonetics_mastery or {}) if profile else {}

    categories = get_phonemes_by_category()
    
    # Enrich each phoneme with the user's mastery
    enriched_categories = {}
    for cat_name, phonemes in categories.items():
        enriched_list = []
        for item in phonemes:
            sym = item["ipa"]
            score_data = user_mastery.get(sym, {})
            enriched_item = dict(item)
            enriched_item["mastery"] = score_data.get("mastery", 0.0)
            enriched_item["times_practiced"] = score_data.get("times_practiced", 0)
            enriched_item["last_seen_date"] = score_data.get("last_seen_date", None)
            enriched_list.append(enriched_item)
        enriched_categories[cat_name] = enriched_list

    return {
        "categories": enriched_categories,
        "total_phonemes": len(PHONETIC_CATALOG),
        "overall_phonetic_mastery": round(
            sum(user_mastery.get(k, {}).get("mastery", 0.0) for k in PHONETIC_CATALOG) / max(1, len(PHONETIC_CATALOG)),
            1
        )
    }


@router.get("/card/{symbol}")
async def get_phoneme_card(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full anatomical guide, sound playback metadata, and contrast pairs for a phoneme.
    """
    clean_sym = symbol if symbol.startswith("/") else f"/{symbol}/"
    phoneme_info = get_phoneme(clean_sym)
    if not phoneme_info:
        raise HTTPException(status_code=404, detail=f"Fonema {clean_sym} no encontrado.")

    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    user_mastery = (profile.phonetics_mastery or {}) if profile else {}
    score_data = user_mastery.get(clean_sym, {})

    card = dict(phoneme_info)
    card["user_stats"] = {
        "mastery": score_data.get("mastery", 0.0),
        "times_practiced": score_data.get("times_practiced", 0),
        "success_rate": score_data.get("success_rate", 0.0)
    }
    return card


@router.post("/record")
async def record_phoneme_practice(
    req: PhonemeRecordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the student's mastery record for a specific phoneme.
    """
    clean_sym = req.phoneme_symbol if req.phoneme_symbol.startswith("/") else f"/{req.phoneme_symbol}/"
    if clean_sym not in PHONETIC_CATALOG:
        raise HTTPException(status_code=400, detail=f"Fonema inválido {clean_sym}")

    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    current_dict = dict(profile.phonetics_mastery or {})
    current_stat = current_dict.get(clean_sym, {})
    
    updated_stat = AdaptiveEngine.update_knowledge_node(
        current_data=current_stat,
        is_correct=req.is_correct,
        is_productive_speaking=True,
        difficulty="medium"
    )
    current_dict[clean_sym] = updated_stat
    profile.phonetics_mastery = current_dict
    
    await db.commit()
    return {
        "status": "success",
        "phoneme": clean_sym,
        "updated_mastery": updated_stat["mastery"]
    }


@router.get("/curriculum-map")
async def get_curriculum_map(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the complete 16-sublevel roadmap with macro-objectives and student progress.
    """
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    curr_sub = profile.current_sublevel if profile else "A1.1"

    roadmap = []
    for sublevel_key, data in CURRICULUM_GRAPH.items():
        is_completed = sublevel_key < curr_sub
        is_current = sublevel_key == curr_sub
        status = "COMPLETED" if is_completed else ("CURRENT" if is_current else "LOCKED")

        roadmap.append({
            "sublevel": sublevel_key,
            "title": data["title"],
            "badge": data["badge"],
            "macro_objective": data["macro_objective"],
            "description": data["description"],
            "status": status,
            "classes": data["classes"]
        })

    return {
        "current_sublevel": curr_sub,
        "roadmap": roadmap
    }


@router.post("/generate-lesson")
async def generate_phonetic_lesson(
    req: PhoneticLessonGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates an interactive 6-phase phonetics lesson dedicated to a specific sound from the phonetic board.
    """
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()

    sublevel = req.sublevel or (profile.current_sublevel if profile else "A1.1")
    agent = TutorAgent(api_key=profile.minimax_api_key if profile else None)
    prof_dict = {
        "current_sublevel": sublevel,
        "native_language": getattr(current_user, "native_language", "es"),
        "weak_areas": profile.weak_areas if profile and profile.weak_areas else [],
        "total_xp": profile.total_xp if profile else 0,
    }

    try:
        script = await agent.generate_phonetic_lesson_script(
            phoneme_symbol=req.phoneme_symbol,
            contrast_symbol=req.contrast_symbol,
            level=sublevel,
            student_profile=prof_dict
        )
    except Exception as e:
        logger.error(f"Error generating phonetic lesson: {e}")
        clean_sym = req.phoneme_symbol if req.phoneme_symbol.startswith("/") else f"/{req.phoneme_symbol}/"
        ph_data = get_phoneme(clean_sym) or PHONETIC_CATALOG.get(clean_sym, {})
        script = agent._build_fallback_phonetic_lesson(clean_sym, ph_data, level=sublevel)

    try:
        topic_name = f"Laboratorio Fonético {req.phoneme_symbol}"
        new_lesson = LessonHistory(
            user_id=current_user.id,
            topic=topic_name,
            level=sublevel.split(".")[0],
            sublevel=sublevel,
            archetype=script.get("archetype", "sound_discovery_lab"),
            phonetic_data={"symbol": req.phoneme_symbol, "contrast": req.contrast_symbol},
            lesson_data=script,
        )
        db.add(new_lesson)
        await db.commit()
        await db.refresh(new_lesson)
        lesson_id = new_lesson.id
    except Exception as e:
        logger.error(f"Error saving phonetic lesson: {e}")
        lesson_id = f"ph-{abs(hash(req.phoneme_symbol)) % 100000}"

    return {
        "lesson_id": lesson_id,
        "script": script,
        "phoneme": req.phoneme_symbol
    }

