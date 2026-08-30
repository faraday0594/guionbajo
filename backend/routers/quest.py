"""
Guionbajo — Interactive POV Conversational Quest Router (Visual Novel Mode)
Provides endpoints for generating interactive story quests, managing user sessions,
evaluating student voice responses in real time, and recording XP progress.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
import logging

from auth.dependencies import get_current_user, get_current_user_optional
from database import get_db
from models.user import User, StudentProfile
from models.lesson import LessonHistory
from models.quest import StoryQuest, StorySession
from core.quest_engine import QuestGenerator, QuestEvaluator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quests", tags=["quests"])


class QuestGenerateRequest(BaseModel):
    topic: Optional[str] = "Future simple with 'will'"
    sublevel: Optional[str] = "A1.1"
    lesson_id: Optional[str] = None


class QuestSessionStartRequest(BaseModel):
    quest_id: Optional[str] = None
    topic: Optional[str] = "Future simple with 'will'"
    sublevel: Optional[str] = "A1.1"
    quest_data: Optional[Dict[str, Any]] = None


class QuestEvaluateRequest(BaseModel):
    quest_id: Optional[str] = None
    session_id: Optional[str] = None
    node_index: int = 0
    transcript: str
    topic: Optional[str] = "English Grammar Practice"
    node_data: Optional[Dict[str, Any]] = None
    all_nodes: Optional[List[Dict[str, Any]]] = None


class QuestScoreSubmitRequest(BaseModel):
    quest_id: Optional[str] = None
    session_id: Optional[str] = None
    score: int = 100
    attempt_count: Optional[int] = 0
    nodes_completed: Optional[int] = 3
    total_nodes: Optional[int] = 3
    duration_seconds: Optional[int] = 0
    lesson_id: Optional[str] = None


@router.post("/generate")
async def generate_quest(
    req: QuestGenerateRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a turn-based POV conversational quest for the specified topic and level.
    """
    user_api_key = None
    resolved_sublevel = req.sublevel or "A1.1"
    resolved_topic = req.topic or "Future simple with 'will'"

    if current_user:
        try:
            prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
            profile = prof_res.scalars().first()
            if profile:
                user_api_key = profile.minimax_api_key
                resolved_sublevel = req.sublevel or profile.current_sublevel or "A1.1"
        except Exception as e:
            logger.warning(f"Error fetching profile in generate_quest: {e}")

    # If linked to a lesson, fetch lesson context
    if req.lesson_id and current_user:
        try:
            les_res = await db.execute(
                select(LessonHistory).where(
                    LessonHistory.id == req.lesson_id,
                    LessonHistory.user_id == current_user.id
                )
            )
            lesson = les_res.scalars().first()
            if lesson:
                resolved_topic = lesson.topic or resolved_topic
                resolved_sublevel = lesson.sublevel or resolved_sublevel
        except Exception as e:
            logger.warning(f"Error finding lesson for quest: {e}")

    generator = QuestGenerator(api_key=user_api_key)
    quest_data = await generator.generate_quest(resolved_topic, resolved_sublevel)

    # Save generated quest to database if not already present
    quest_record_id = None
    try:
        new_quest = StoryQuest(
            id=str(uuid.uuid4()),
            title=quest_data.get("title", resolved_topic),
            grammar_topic=quest_data.get("grammar_topic", resolved_topic),
            difficulty_level=quest_data.get("difficulty_level", "A1"),
            nodes=quest_data.get("nodes", []),
        )
        db.add(new_quest)
        await db.commit()
        quest_record_id = new_quest.id
        quest_data["db_quest_id"] = new_quest.id
    except Exception as e:
        logger.warning(f"Notice saving quest to DB: {e}")

    return {
        "success": True,
        "topic": resolved_topic,
        "sublevel": resolved_sublevel,
        "quest_id": quest_record_id or quest_data.get("story_id"),
        "quest": quest_data
    }


@router.post("/session/start")
async def start_quest_session(
    req: QuestSessionStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initializes or resumes an active game session for the user.
    """
    session = StorySession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        quest_id=req.quest_id if (req.quest_id and len(req.quest_id) == 36) else None,
        current_node_index=0,
        attempt_count=0,
        transcript_history=[],
        is_completed=False,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "success": True,
        "session_id": session.id,
        "current_node_index": session.current_node_index,
    }


@router.post("/evaluate")
async def evaluate_quest_response(
    req: QuestEvaluateRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates student spoken transcript against the active node's pedagogical goal and grammar target.
    Returns Branch A (error/retry feedback) or Branch B (success/next scene unlock).
    """
    user_api_key = None
    if current_user:
        try:
            prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
            profile = prof_res.scalars().first()
            if profile and profile.minimax_api_key:
                user_api_key = profile.minimax_api_key
        except Exception:
            pass

    evaluator = QuestEvaluator(api_key=user_api_key)
    node_to_eval = req.node_data or {}
    evaluation = await evaluator.evaluate_node_response(
        transcript=req.transcript,
        node=node_to_eval,
        topic=req.topic or "English Grammar Target",
        all_nodes=req.all_nodes,
        current_node_index=req.node_index
    )

    # If a session_id exists, log the attempt into DB
    if req.session_id and current_user:
        try:
            sess_res = await db.execute(
                select(StorySession).where(
                    StorySession.id == req.session_id,
                    StorySession.user_id == current_user.id
                )
            )
            session = sess_res.scalars().first()
            if session:
                session.attempt_count = (session.attempt_count or 0) + 1
                history = list(session.transcript_history or [])
                history.append({
                    "node_index": req.node_index,
                    "transcript": req.transcript,
                    "is_correct": evaluation.get("is_correct", False),
                    "feedback": evaluation.get("feedback", "")
                })
                session.transcript_history = history
                if evaluation.get("is_correct"):
                    session.current_node_index = req.node_index + 1
                await db.commit()
        except Exception as e:
            logger.warning(f"Error updating quest session: {e}")

    return {
        "success": True,
        "is_correct": evaluation.get("is_correct", False),
        "detected_grammar_rule": evaluation.get("detected_grammar_rule"),
        "feedback": evaluation.get("feedback"),
        "correction": evaluation.get("correction"),
        "next_node_id": evaluation.get("next_node_id"),
        "current_node_index": req.node_index,
    }


@router.post("/submit")
async def submit_quest_score(
    req: QuestScoreSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits the final score and grants XP for completing the POV Conversational Quest.
    """
    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_res.scalars().first()

    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de estudiante no encontrado")

    # Base XP calculation for Visual Novel Quest
    base_xp = 40
    completion_bonus = min(30, (req.nodes_completed or 3) * 10)
    attempts_penalty = min(15, max(0, ((req.attempt_count or 3) - (req.total_nodes or 3)) * 3))
    total_earned_xp = max(25, base_xp + completion_bonus - attempts_penalty)

    profile.total_xp = (profile.total_xp or 0) + total_earned_xp

    # Update session status if provided
    if req.session_id:
        try:
            sess_res = await db.execute(
                select(StorySession).where(
                    StorySession.id == req.session_id,
                    StorySession.user_id == current_user.id
                )
            )
            session = sess_res.scalars().first()
            if session:
                session.is_completed = True
                session.score = req.score
        except Exception as e:
            logger.warning(f"Error marking session complete: {e}")

    # If linked to a lesson, update overall score if higher
    if req.lesson_id:
        try:
            les_res = await db.execute(
                select(LessonHistory).where(
                    LessonHistory.id == req.lesson_id,
                    LessonHistory.user_id == current_user.id
                )
            )
            lesson = les_res.scalars().first()
            if lesson and req.score > (lesson.overall_score or 0):
                lesson.overall_score = min(100, max(lesson.overall_score or 0, req.score))
        except Exception:
            pass

    await db.commit()

    return {
        "status": "success",
        "xp_earned": total_earned_xp,
        "total_xp": profile.total_xp,
        "message": f"¡Misión POV completada con éxito! Ganaste +{total_earned_xp} XP."
    }
