from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from auth.dependencies import get_current_user, get_current_user_optional
from database import get_db
from models.user import User, StudentProfile
from models.lesson import LessonHistory
from schemas.lesson import LessonGenerateRequest
from core.minimax_agent import TutorAgent
from core.adaptive_engine import AdaptiveEngine
from core.curriculum_graph import CURRICULUM_GRAPH, get_sublevel_info, get_class_node
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from core.minimax_agent import TutorAgent, LEVEL_SEQUENCE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/lesson", tags=["lesson"])


class AdaptiveLessonGenerateRequest(BaseModel):
    sublevel: Optional[str] = None
    class_index: Optional[int] = 1
    topic: Optional[str] = None


class LessonCheckpointRequest(BaseModel):
    lesson_id: Optional[str] = None
    topic: str
    sublevel: str
    class_index: Optional[int] = 1
    current_slide: int = 0
    view_mode: str = "board"  # 'board' | 'timeline' | 'reading' | 'games'
    quiz_completed: bool = False
    quiz_score: int = 0
    reading_completed: bool = False
    reading_score: int = 0
    mystery_word_completed: bool = False
    mystery_word_score: int = 0
    twin_cards_completed: bool = False
    twin_cards_score: int = 0
    overall_score: int = 0
    is_completed: bool = False


@router.post("/generate-adaptive")
async def generate_adaptive_lesson(
    req: AdaptiveLessonGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()

    sublevel = req.sublevel or (profile.current_sublevel if profile else "A1.1")
    class_idx = req.class_index or 1

    engine = AdaptiveEngine(student_profile={
        "knowledge_map": (profile.knowledge_map if profile else {}) or {},
        "phonetics_mastery": (profile.phonetics_mastery if profile else {}) or {},
        "weak_areas": (profile.weak_areas if profile else []) or [],
    })
    
    adaptive_plan = engine.compose_adaptive_plan(sublevel=sublevel, class_index=class_idx)
    topic = req.topic or adaptive_plan["core_topic"]

    agent = TutorAgent(api_key=profile.minimax_api_key if profile else None)
    prof_dict = {
        "current_sublevel": sublevel,
        "native_language": getattr(current_user, "native_language", "es"),
        "weak_areas": profile.weak_areas if profile and profile.weak_areas else [],
        "total_xp": profile.total_xp if profile else 0,
    }

    try:
        script = await asyncio.wait_for(
            agent.generate_adaptive_lesson_script(topic, sublevel, prof_dict, adaptive_plan),
            timeout=25.0
        )
    except Exception as e:
        logger.warning(f"Adaptive lesson generation fallback triggered ({e}) for {topic}")
        is_a_level = sublevel.startswith("A1") or sublevel.startswith("A2")
        script = agent._build_fallback_lesson(topic, sublevel, is_a_level, adaptive_plan)
        script["archetype"] = adaptive_plan.get("archetype", "practice")
        script["phonetic_focus"] = adaptive_plan.get("phonetic_focus", {})

    try:
        new_lesson = LessonHistory(
            user_id=current_user.id,
            topic=topic,
            level=sublevel.split(".")[0],
            sublevel=sublevel,
            archetype=adaptive_plan.get("archetype", "practice"),
            phonetic_data=adaptive_plan.get("phonetic_focus", {}),
            lesson_data=script,
        )
        db.add(new_lesson)
        await db.commit()
        await db.refresh(new_lesson)
        lesson_id = new_lesson.id
    except Exception as e:
        logger.error(f"Error saving adaptive lesson: {e}")
        lesson_id = f"gen-{sublevel}-{abs(hash(topic)) % 100000}"

    return {
        "lesson_id": lesson_id,
        "script": script,
        "adaptive_plan": adaptive_plan
    }


@router.post("/generate")
async def generate_lesson(
    req: LessonGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()

    sublevel = req.sublevel or (profile.current_sublevel if profile else "A1.1")
    topic = req.topic or "Greetings and Introductions"

    agent = TutorAgent(api_key=profile.minimax_api_key if profile else None)
    prof_dict = {
        "current_sublevel": sublevel,
        "native_language": getattr(current_user, "native_language", "es"),
        "weak_areas": profile.weak_areas if profile and profile.weak_areas else [],
        "total_xp": profile.total_xp if profile else 0,
    }
    try:
        script = await agent.generate_lesson_script(topic, sublevel, prof_dict)
    except Exception as e:
        logger.error(f"Error calling agent.generate_lesson_script: {e}")
        is_a_level = sublevel.startswith("A1") or sublevel.startswith("A2")
        script = agent._build_fallback_lesson(topic, sublevel, is_a_level)

    try:
        new_lesson = LessonHistory(
            user_id=current_user.id,
            topic=topic,
            level=sublevel.split(".")[0],
            sublevel=sublevel,
            lesson_data=script,
        )
        db.add(new_lesson)
        await db.commit()
        await db.refresh(new_lesson)
        lesson_id = new_lesson.id
    except Exception as e:
        logger.error(f"Error saving lesson to database: {e}")
        lesson_id = f"gen-{sublevel}-{abs(hash(topic)) % 100000}"

    return {"lesson_id": lesson_id, "script": script}


@router.get("/current")
async def current_lesson(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LessonHistory)
        .where(LessonHistory.user_id == current_user.id)
        .order_by(LessonHistory.completed_at.desc())
    )
    lesson = result.scalars().first()
    if not lesson:
        return {"lesson": None}
    return {
        "lesson": {
            "id": lesson.id,
            "topic": lesson.topic,
            "sublevel": lesson.sublevel,
            "phases_completed": lesson.phases_completed,
        }
    }


@router.post("/checkpoint")
async def save_lesson_checkpoint(
    req: LessonCheckpointRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prof_result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de estudiante no encontrado")

    checkpoint_data = {
        "lesson_id": req.lesson_id,
        "topic": req.topic,
        "sublevel": req.sublevel,
        "class_index": req.class_index or 1,
        "current_slide": req.current_slide,
        "view_mode": req.view_mode,
        "quiz_completed": req.quiz_completed,
        "quiz_score": req.quiz_score,
        "reading_completed": req.reading_completed,
        "reading_score": req.reading_score,
        "mystery_word_completed": req.mystery_word_completed,
        "mystery_word_score": req.mystery_word_score,
        "twin_cards_completed": req.twin_cards_completed,
        "twin_cards_score": req.twin_cards_score,
        "overall_score": req.overall_score,
        "is_completed": req.is_completed,
        "updated_at": datetime.utcnow().isoformat(),
    }

    k_map = dict(profile.knowledge_map or {})
    current_class_idx = req.class_index or 1

    # Strict CEFR completion logic: only pass if overall_score >= 80
    if req.is_completed and req.overall_score >= 80:
        # Mark class as completed
        xp_earned = max(35, req.overall_score // 2)
        profile.total_xp = (profile.total_xp or 0) + xp_earned

        # Update Knowledge Map for Topic
        topic_stat = k_map.get(req.topic, {})
        k_map[req.topic] = AdaptiveEngine.update_knowledge_node(
            current_data=topic_stat,
            is_correct=True,
            is_productive_speaking=True
        )

        # Advance class index or sublevel
        if current_class_idx < 4:
            next_class_idx = current_class_idx + 1
            next_sublevel = req.sublevel
        else:
            # Advance to next sublevel if available
            cur_sub = req.sublevel
            idx = LEVEL_SEQUENCE.index(cur_sub) if cur_sub in LEVEL_SEQUENCE else 0
            if idx + 1 < len(LEVEL_SEQUENCE):
                next_sublevel = LEVEL_SEQUENCE[idx + 1]
            else:
                next_sublevel = cur_sub
            next_class_idx = 1
            profile.current_sublevel = next_sublevel
            profile.current_level = next_sublevel.split(".")[0]

        k_map["current_class_index"] = next_class_idx
        # Clear in-progress checkpoint since class was successfully passed
        k_map["active_checkpoint"] = None
        profile.knowledge_map = k_map

        # Update LessonHistory if lesson_id
        if req.lesson_id and not req.lesson_id.startswith("gen-"):
            lh_res = await db.execute(
                select(LessonHistory).where(
                    LessonHistory.id == req.lesson_id,
                    LessonHistory.user_id == current_user.id
                )
            )
            lh = lh_res.scalars().first()
            if lh:
                lh.overall_score = req.overall_score
                lh.phases_completed = 6

        await db.commit()
        return {
            "status": "approved",
            "passed": True,
            "overall_score": req.overall_score,
            "next_class_index": next_class_idx,
            "next_sublevel": next_sublevel,
            "message": "¡Felicitaciones! Has aprobado la clase con un puntaje de 80 o más."
        }

    # If not finished or score < 80, persist savepoint
    k_map["active_checkpoint"] = checkpoint_data
    k_map["current_class_index"] = current_class_idx
    profile.knowledge_map = k_map

    await db.commit()
    return {
        "status": "saved",
        "passed": False,
        "overall_score": req.overall_score,
        "current_class_index": current_class_idx,
        "current_sublevel": profile.current_sublevel or req.sublevel,
        "message": "Punto de guardado actualizado." if not req.is_completed else "Puntaje insuficiente (< 80%). Debes repetir actividades para aprobar la clase."
    }


@router.get("/checkpoint")
async def get_lesson_checkpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prof_result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_result.scalars().first()
    if not profile:
        return {"checkpoint": None, "current_sublevel": "A1.1", "current_class_index": 1}

    k_map = dict(profile.knowledge_map or {})
    active_cp = k_map.get("active_checkpoint")
    current_class_idx = k_map.get("current_class_index", 1)

    return {
        "checkpoint": active_cp,
        "current_sublevel": profile.current_sublevel or "A1.1",
        "current_class_index": current_class_idx,
    }


@router.get("/{lesson_id}")
async def get_lesson(
    lesson_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    query = select(LessonHistory).where(LessonHistory.id == lesson_id)
    if current_user:
        query = select(LessonHistory).where(
            LessonHistory.id == lesson_id,
            LessonHistory.user_id == current_user.id
        )
    result = await db.execute(query)
    lesson = result.scalars().first()
    if not lesson:
        # Fallback lookup without user_id filter for seamless multi-device or fresh sessions
        result_any = await db.execute(select(LessonHistory).where(LessonHistory.id == lesson_id))
        lesson = result_any.scalars().first()

    if not lesson and current_user:
        # Fallback to most recent in-progress lesson for current student
        recent_res = await db.execute(
            select(LessonHistory)
            .where(LessonHistory.user_id == current_user.id)
            .order_by(LessonHistory.completed_at.desc())
        )
        lesson = recent_res.scalars().first()

    if not lesson:
        raise HTTPException(status_code=404, detail="Lección no encontrada")

    script_data = lesson.lesson_data or {}
    try:
        if isinstance(script_data, dict) and "phases" in script_data and isinstance(script_data["phases"], list):
            agent = TutorAgent()
            script_data = agent._audit_and_sanitize_lesson_content(script_data, lesson.topic, lesson.sublevel)
            lesson.lesson_data = script_data
            await db.commit()
    except Exception as e:
        logger.warning(f"Error auditing lesson script: {e}")

    return {
        "id": lesson.id,
        "topic": lesson.topic,
        "level": lesson.level,
        "sublevel": lesson.sublevel,
        "phases_completed": lesson.phases_completed,
        "overall_score": lesson.overall_score,
        "script": script_data,
    }


@router.post("/{lesson_id}/evaluate")
async def evaluate_lesson(
    lesson_id: str,
    phase: int = Form(...),
    answer: str = Form(...),
    question: Optional[str] = Form(None),
    expected_answer: Optional[str] = Form(None),
    is_sub_exercise: Optional[bool] = Form(False),
    audio: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Try fetching lesson by ID
    result = await db.execute(
        select(LessonHistory).where(
            LessonHistory.id == lesson_id,
            LessonHistory.user_id == current_user.id,
        )
    )
    lesson = result.scalars().first()

    prof_result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = prof_result.scalars().first()

    student_level = profile.current_sublevel if profile else "A1.1"

    # Extract expected_answer from lesson script if available and not a sub-exercise
    if lesson and lesson.lesson_data:
        student_level = lesson.sublevel or student_level
        phases = lesson.lesson_data.get("phases", [])
        for p in phases:
            if p.get("phase_number") == phase:
                if not is_sub_exercise and not question:
                    expected_answer = expected_answer or p.get("expected_answer", "")
                    question = question or p.get("student_task", "")
                break

    # If audio file is provided, handle speech answer text
    evaluated_text = answer.strip()
    if audio and (not evaluated_text or evaluated_text == "Respuesta grabada por voz"):
        evaluated_text = "[Grabación de Voz Recibida]"

    agent = TutorAgent(api_key=profile.minimax_api_key if profile else None)
    eval_result = await agent.evaluate_student_response(
        text=evaluated_text,
        question=question or f"Fase {phase}",
        expected_answer=expected_answer or "",
        history=[],
        student_level=student_level,
    )

    # Update lesson record if lesson exists
    if lesson and eval_result.get("overall_score"):
        lesson.overall_score = max(lesson.overall_score or 0, eval_result["overall_score"])
        lesson.phases_completed = max(lesson.phases_completed or 0, phase)
        await db.commit()

    return eval_result


@router.post("/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LessonHistory).where(
            LessonHistory.id == lesson_id,
            LessonHistory.user_id == current_user.id,
        )
    )
    lesson = result.scalars().first()
    if lesson:
        lesson.phases_completed = 6
        prof_result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
        profile = prof_result.scalars().first()
        if profile:
            score = lesson.overall_score or 75
            xp_earned = max(15, score // 2)
            profile.total_xp = (profile.total_xp or 0) + xp_earned

            # Update Knowledge Map for Topic
            is_success = score >= 65
            k_map = dict(profile.knowledge_map or {})
            topic_stat = k_map.get(lesson.topic, {})
            k_map[lesson.topic] = AdaptiveEngine.update_knowledge_node(
                current_data=topic_stat,
                is_correct=is_success,
                is_productive_speaking=True
            )
            profile.knowledge_map = k_map

            # Update Phonetics Mastery if phonetic data exists
            if lesson.phonetic_data and isinstance(lesson.phonetic_data, dict):
                symbols = lesson.phonetic_data.get("symbols", [])
                p_map = dict(profile.phonetics_mastery or {})
                for sym in symbols:
                    sym_stat = p_map.get(sym, {})
                    p_map[sym] = AdaptiveEngine.update_knowledge_node(
                        current_data=sym_stat,
                        is_correct=is_success,
                        is_productive_speaking=True
                    )
                profile.phonetics_mastery = p_map

        await db.commit()
    return {"status": "success", "message": "Lección completada y Knowledge Map actualizado"}
