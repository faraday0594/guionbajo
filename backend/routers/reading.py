"""
Guionbajo — Reading Practice Router
Provides API endpoints for generating chunked reading stories with IPA phonetics
and evaluating student speech attempts word-by-word.
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
from core.reading_generator import ReadingGenerator

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reading", tags=["reading"])


class ReadingGenerateRequest(BaseModel):
    topic: Optional[str] = "Greetings and Introductions"
    sublevel: Optional[str] = "A1.1"
    lesson_id: Optional[str] = None


class ReadingEvaluateChunkRequest(BaseModel):
    chunk_words: List[Dict[str, Any]]
    transcript: str
    lesson_id: Optional[str] = None
    chunk_id: Optional[str] = None


@router.post("/generate")
async def generate_reading_story(
    req: ReadingGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates or retrieves a chunked reading story with word-level IPA transcriptions.
    """
    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_res.scalars().first()

    sublevel = req.sublevel or (profile.current_sublevel if profile else "A1.1")
    topic = req.topic or "English Conversation"

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

    generator = ReadingGenerator(api_key=profile.minimax_api_key if profile else None)
    story = await generator.generate_reading_practice(topic, sublevel, lesson_data)

    return {
        "success": True,
        "topic": topic,
        "sublevel": sublevel,
        "lesson_id": req.lesson_id,
        "story": story
    }


@router.get("/lesson/{lesson_id}")
async def get_reading_for_lesson(
    lesson_id: str,
    topic: Optional[str] = None,
    sublevel: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves or generates reading practice for an existing or in-progress lesson.
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
        logger.warning(f"Error querying lesson {lesson_id} for reading: {e}")

    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_res.scalars().first()

    resolved_topic = (lesson.topic if lesson else None) or topic or "English Practice"
    resolved_sublevel = (lesson.sublevel if lesson else None) or sublevel or (profile.current_sublevel if profile else "A1.1")
    lesson_data = lesson.lesson_data if lesson else None

    generator = ReadingGenerator(api_key=profile.minimax_api_key if profile else None)
    story = await generator.generate_reading_practice(resolved_topic, resolved_sublevel, lesson_data)

    return {
        "success": True,
        "lesson_id": lesson_id,
        "topic": resolved_topic,
        "sublevel": resolved_sublevel,
        "story": story
    }


@router.post("/evaluate-chunk")
async def evaluate_reading_chunk(
    req: ReadingEvaluateChunkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates student's spoken transcript for a specific reading chunk word-by-word.
    """
    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_res.scalars().first()

    generator = ReadingGenerator(api_key=profile.minimax_api_key if profile else None)
    eval_result = generator.evaluate_reading_attempt(req.chunk_words, req.transcript)

    # Award XP if accuracy is high
    if eval_result.get("is_correct") and profile:
        xp_earned = max(5, eval_result.get("accuracy_percent", 0) // 10)
        profile.total_xp = (profile.total_xp or 0) + xp_earned
        await db.commit()
        eval_result["xp_earned"] = xp_earned

    return eval_result
