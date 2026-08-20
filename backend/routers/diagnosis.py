from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from auth.dependencies import get_current_user
from database import get_db
from models.user import User, StudentProfile
from models.lesson import DiagnosisResult
from schemas.diagnosis import (
    DiagnosisStartResponse, DiagnosisCompleteRequest,
    DiagnosisSkipRequest, DiagnosisResultResponse
)
from core.minimax_agent import TutorAgent
from core.diagnosis_engine import DiagnosisEngine
from core.learning_map import generate_learning_map
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/diagnosis", tags=["diagnosis"])


def _get_agent(profile: Optional[StudentProfile]) -> TutorAgent:
    return TutorAgent(api_key=profile.minimax_api_key if profile and profile.minimax_api_key else None)


@router.post("/start", response_model=DiagnosisStartResponse)
async def start_diagnosis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()

    agent = _get_agent(profile)
    engine = DiagnosisEngine(agent)

    questions = await engine.generate_exam()
    logger.info(f"Diagnosis started for user {current_user.id}: {len(questions)} questions")
    return {"questions": questions}


@router.post("/complete", response_model=DiagnosisResultResponse)
async def complete_diagnosis(
    req: DiagnosisCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()

    agent = _get_agent(profile)
    engine = DiagnosisEngine(agent)

    # Evaluate exam — pass both questions and answers
    answers_dicts = [a.dict() for a in req.answers]
    questions_list = req.questions or []
    eval_result = await engine.evaluate_exam(questions_list, answers_dicts)

    # Persist diagnosis record
    diag_record = DiagnosisResult(
        user_id=current_user.id,
        assigned_level=eval_result["assigned_level"],
        score_by_level=eval_result["score_by_level"],
        agent_reasoning=eval_result["agent_reasoning"],
    )
    db.add(diag_record)

    # Update student profile
    if profile:
        profile.current_level = eval_result["assigned_level"].split(".")[0]
        profile.current_sublevel = eval_result["assigned_level"]
        if eval_result.get("weak_areas"):
            profile.weak_areas = eval_result["weak_areas"]

        # Generate personalized learning map
        prof_dict = {
            "current_sublevel": profile.current_sublevel,
            "native_language": getattr(current_user, "native_language", "es"),
            "weak_areas": profile.weak_areas or [],
            "total_xp": profile.total_xp or 0,
        }
        lmap = await generate_learning_map(agent, prof_dict, profile.current_sublevel)
        profile.learning_map = lmap

    await db.commit()
    logger.info(f"Diagnosis complete for user {current_user.id}: level={eval_result['assigned_level']}")
    return eval_result


@router.post("/skip")
async def skip_diagnosis(
    req: DiagnosisSkipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    profile.current_level = req.chosen_level.split(".")[0]
    profile.current_sublevel = req.chosen_level

    agent = _get_agent(profile)
    prof_dict = {
        "current_sublevel": profile.current_sublevel,
        "native_language": getattr(current_user, "native_language", "es"),
        "weak_areas": profile.weak_areas or [],
        "total_xp": profile.total_xp or 0,
    }
    lmap = await generate_learning_map(agent, prof_dict, profile.current_sublevel)
    profile.learning_map = lmap

    await db.commit()
    logger.info(f"User {current_user.id} skipped diagnosis → level {req.chosen_level}")
    return {
        "status": "success",
        "level": req.chosen_level,
        "modules_generated": len(lmap.get("modules", [])) if lmap else 0,
    }
