"""
Guionbajo — Educational Game Router
Handles generation, retrieval and score tracking for Mystery Word and Twin Cards.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from auth.dependencies import get_current_user
from database import get_db
from models.user import User, StudentProfile
from models.lesson import LessonHistory
from core.game_generator import GameGenerator

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/games", tags=["games"])


class GameGenerateRequest(BaseModel):
    topic: Optional[str] = "Greetings and Introductions"
    sublevel: Optional[str] = "A1.1"
    lesson_id: Optional[str] = None
    game_type: Optional[str] = "all"  # 'mystery_word', 'twin_cards', 'all'
    pair_count: Optional[int] = 6


class GameScoreSubmitRequest(BaseModel):
    game_type: str  # 'mystery_word' | 'twin_cards'
    score: int
    mistakes: Optional[int] = 0
    max_streak: Optional[int] = 0
    duration_seconds: Optional[int] = 0
    lesson_id: Optional[str] = None


@router.post("/generate")
async def generate_games(
    req: GameGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate educational games (Mystery Word and/or Twin Cards) tailored to topic and level.
    """
    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_res.scalars().first()

    sublevel = req.sublevel or (profile.current_sublevel if profile else "A1.1")
    topic = req.topic or "English Essentials"

    # If lesson_id is supplied, look for lesson data to enrich game generation
    lesson_data = None
    if req.lesson_id:
        les_res = await db.execute(
            select(LessonHistory).where(
                LessonHistory.id == req.lesson_id,
                LessonHistory.user_id == current_user.id
            )
        )
        lesson = les_res.scalars().first()
        if lesson:
            topic = lesson.topic or topic
            sublevel = lesson.sublevel or sublevel
            lesson_data = lesson.lesson_data

    generator = GameGenerator(api_key=profile.minimax_api_key if profile else None)

    mystery_word = None
    twin_cards = None

    if req.game_type in ("all", "mystery_word"):
        mystery_word = await generator.generate_mystery_word(topic, sublevel, lesson_data)

    if req.game_type in ("all", "twin_cards"):
        pair_count = req.pair_count or 6
        twin_cards = await generator.generate_twin_cards(topic, sublevel, pair_count, lesson_data)

    return {
        "success": True,
        "topic": topic,
        "sublevel": sublevel,
        "lesson_id": req.lesson_id,
        "mystery_word": mystery_word,
        "twin_cards": twin_cards,
    }


@router.get("/lesson/{lesson_id}")
async def get_games_for_lesson(
    lesson_id: str,
    topic: Optional[str] = None,
    sublevel: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch or generate games tied to a completed or in-progress lesson.
    """
    lesson = None
    try:
        les_res = await db.execute(
            select(LessonHistory).where(
                LessonHistory.id == lesson_id,
                LessonHistory.user_id == current_user.id
            )
        )
        lesson = les_res.scalars().first()
    except Exception as e:
        logger.warning(f"Error finding lesson {lesson_id}: {e}")

    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_res.scalars().first()

    generator = GameGenerator(api_key=profile.minimax_api_key if profile else None)
    resolved_topic = (lesson.topic if lesson else None) or topic or "English Practice"
    resolved_sublevel = (lesson.sublevel if lesson else None) or sublevel or (profile.current_sublevel if profile else "A1.1")
    lesson_data = lesson.lesson_data if lesson else None

    mystery_word = await generator.generate_mystery_word(resolved_topic, resolved_sublevel, lesson_data)
    twin_cards = await generator.generate_twin_cards(resolved_topic, resolved_sublevel, 6, lesson_data)

    return {
        "success": True,
        "lesson_id": lesson_id,
        "topic": resolved_topic,
        "sublevel": resolved_sublevel,
        "mystery_word": mystery_word,
        "twin_cards": twin_cards,
    }


@router.post("/submit")
async def submit_game_score(
    req: GameScoreSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Records game score, streak bonus, and grants XP to student profile.
    """
    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_res.scalars().first()

    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    # XP Calculation: base + score/2 + streak bonus
    base_xp = 20
    score_xp = max(5, req.score // 3)
    streak_bonus = (req.max_streak or 0) * 5
    total_earned_xp = base_xp + score_xp + streak_bonus

    profile.total_xp = (profile.total_xp or 0) + total_earned_xp

    # If linked to a lesson, update overall score if higher
    if req.lesson_id:
        les_res = await db.execute(
            select(LessonHistory).where(
                LessonHistory.id == req.lesson_id,
                LessonHistory.user_id == current_user.id
            )
        )
        lesson = les_res.scalars().first()
        if lesson:
            if req.score > (lesson.overall_score or 0):
                lesson.overall_score = min(100, max(lesson.overall_score or 0, req.score))

    await db.commit()

    return {
        "status": "success",
        "xp_earned": total_earned_xp,
        "total_xp": profile.total_xp,
        "message": f"¡Excelente partida! Ganaste +{total_earned_xp} XP."
    }
