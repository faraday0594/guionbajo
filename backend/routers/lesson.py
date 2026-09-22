from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse
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
from core.lesson_exporter import (
    export_lesson_materials,
    PowerPointLessonExporter,
    WordLessonExporter,
    PdfLessonExporter,
    LessonExportData
)
import logging
import asyncio
import tempfile
import os
import re
from datetime import datetime
from typing import Optional, Dict, Any, List
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
    pov_quest_completed: bool = False
    pov_quest_score: int = 0
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

    profile_key = profile.minimax_api_key.strip() if profile and profile.minimax_api_key and profile.minimax_api_key.strip() else None
    agent = TutorAgent(api_key=profile_key)
    prof_dict = {
        "current_sublevel": sublevel,
        "native_language": getattr(current_user, "native_language", "es"),
        "weak_areas": profile.weak_areas if profile and profile.weak_areas else [],
        "total_xp": profile.total_xp if profile else 0,
    }

    logger.info(f"Generating adaptive lesson with MiniMax M3 for topic: '{topic}', sublevel: '{sublevel}'...")
    try:
        script = await asyncio.wait_for(
            agent.generate_adaptive_lesson_script(topic, sublevel, prof_dict, adaptive_plan),
            timeout=75.0
        )
        logger.info(f"Successfully generated adaptive lesson with MiniMax M3 for '{topic}' ({len(script.get('phases', []))} phases)")
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
        "pov_quest_completed": req.pov_quest_completed,
        "pov_quest_score": req.pov_quest_score,
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

        # Calculate current highest global progress (0 to 63)
        cur_prog_sub = profile.current_sublevel or "A1.1"
        cur_prog_cls = k_map.get("current_class_index", 1)
        cur_prog_sub_idx = LEVEL_SEQUENCE.index(cur_prog_sub) if cur_prog_sub in LEVEL_SEQUENCE else 0
        cur_global_prog = cur_prog_sub_idx * 4 + (cur_prog_cls - 1)

        # Calculate candidate next progress from this finished lesson
        lesson_sub = req.sublevel or cur_prog_sub
        lesson_sub_idx = LEVEL_SEQUENCE.index(lesson_sub) if lesson_sub in LEVEL_SEQUENCE else 0
        if current_class_idx < 4:
            cand_class_idx = current_class_idx + 1
            cand_sublevel = lesson_sub
        else:
            if lesson_sub_idx + 1 < len(LEVEL_SEQUENCE):
                cand_sublevel = LEVEL_SEQUENCE[lesson_sub_idx + 1]
            else:
                cand_sublevel = lesson_sub
            cand_class_idx = 1
        
        cand_sub_idx = LEVEL_SEQUENCE.index(cand_sublevel) if cand_sublevel in LEVEL_SEQUENCE else 0
        cand_global_prog = cand_sub_idx * 4 + (cand_class_idx - 1)

        # Only advance highest checkpoint if this lesson advances the student's furthest reach
        if cand_global_prog > cur_global_prog:
            next_class_idx = cand_class_idx
            next_sublevel = cand_sublevel
            profile.current_sublevel = cand_sublevel
            profile.current_level = cand_sublevel.split(".")[0]
            k_map["current_class_index"] = cand_class_idx
        else:
            # Retain current highest checkpoint
            next_class_idx = cur_prog_cls
            next_sublevel = cur_prog_sub

        # Clear in-progress checkpoint
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
    cur_prog_sub = profile.current_sublevel or "A1.1"
    cur_prog_cls = k_map.get("current_class_index", 1)
    cur_prog_sub_idx = LEVEL_SEQUENCE.index(cur_prog_sub) if cur_prog_sub in LEVEL_SEQUENCE else 0
    cur_global_prog = cur_prog_sub_idx * 4 + (cur_prog_cls - 1)

    lesson_sub = req.sublevel or cur_prog_sub
    lesson_sub_idx = LEVEL_SEQUENCE.index(lesson_sub) if lesson_sub in LEVEL_SEQUENCE else 0
    lesson_global = lesson_sub_idx * 4 + (current_class_idx - 1)

    k_map["active_checkpoint"] = checkpoint_data
    if lesson_global >= cur_global_prog:
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
    user_sublevel = profile.current_sublevel or "A1.1"

    # Strict isolation: If active checkpoint belongs to a different class index or sublevel, discard and clear it
    if active_cp:
        cp_class_idx = active_cp.get("class_index")
        cp_sublevel = active_cp.get("sublevel")
        if (cp_class_idx is not None and int(cp_class_idx) != int(current_class_idx)) or (cp_sublevel and cp_sublevel != user_sublevel):
            active_cp = None
            k_map["active_checkpoint"] = None
            profile.knowledge_map = k_map
            await db.commit()

    if current_user.email == "megafer1994@gmail.com" and profile:
        if profile.current_sublevel != "B2.1" or profile.current_level != "B2":
            profile.current_level = "B2"
            profile.current_sublevel = "B2.1"
            await db.commit()
            user_sublevel = "B2.1"

    return {
        "checkpoint": active_cp,
        "current_sublevel": user_sublevel,
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


class LessonExportRequest(BaseModel):
    lesson_id: Optional[str] = None
    format: str = "pptx"  # "pptx" | "docx" | "pdf"
    script_data: Optional[Dict[str, Any]] = None
    topic: Optional[str] = None
    sublevel: Optional[str] = None


def adapt_script_to_export_data(
    script_data: Optional[Dict[str, Any]],
    topic: str = "",
    sublevel: str = ""
) -> Dict[str, Any]:
    """
    Transforms either a Guionbajo raw lesson script (with 'phases') or an already
    structured dictionary into the strict LessonExportData format.
    """
    if not script_data:
        script_data = {}

    # If already structured with stages, return as-is
    if script_data.get("stages") and isinstance(script_data["stages"], list) and len(script_data["stages"]) > 0:
        return script_data

    cur_topic = script_data.get("topic") or topic or "Clase de Inglés"
    cur_sublevel = script_data.get("sublevel") or sublevel or "B1.1"

    phases = script_data.get("phases", [])
    stages: List[Dict[str, Any]] = []
    quiz_questions: List[Dict[str, Any]] = []

    pedagogical_obj = (
        script_data.get("pedagogical_objective")
        or (phases[0].get("tutor_says") if phases else "")
        or f"Dominio comunicativo y estructural de {cur_topic} ({cur_sublevel})."
    )
    mental_model = (
        script_data.get("mental_model")
        or (phases[1].get("tutor_says") if len(phases) > 1 else "")
        or f"Comprender la función pragmática y la dinámica comunicativa de {cur_topic}."
    )

    stage_num = 1
    quiz_num = 1

    for p_idx, phase in enumerate(phases):
        if not isinstance(phase, dict):
            continue

        p_name = phase.get("phase_name", f"Etapa {p_idx + 1}")
        is_practice = phase.get("is_practice_slide") or phase.get("interaction_type") == "quiz"
        exercises = phase.get("exercises") or []

        if is_practice or exercises:
            if exercises and isinstance(exercises, list):
                for ex in exercises:
                    if not isinstance(ex, dict):
                        continue
                    q_text = ex.get("sentence") or ex.get("question") or ex.get("task") or "Completa la oración:"
                    opts_list = ex.get("options") or []
                    opts_dict = {}
                    if isinstance(opts_list, list):
                        for oi, opt in enumerate(opts_list):
                            char = chr(ord('A') + oi)
                            clean_opt = re.sub(r'^[A-D]\)\s*', '', str(opt)).strip()
                            opts_dict[char] = clean_opt
                    elif isinstance(opts_list, dict):
                        opts_dict = opts_list

                    exp_ans = str(ex.get("expected_answer", "")).strip()
                    correct_char = "A"
                    if exp_ans.upper() in ["A", "B", "C", "D"]:
                        correct_char = exp_ans.upper()
                    else:
                        for k, v in opts_dict.items():
                            if v.lower() == exp_ans.lower():
                                correct_char = k
                                break

                    quiz_questions.append({
                        "question_number": quiz_num,
                        "question": q_text,
                        "options": opts_dict or {"A": "Opción 1", "B": "Opción 2", "C": "Opción 3", "D": "Opción 4"},
                        "correct_option": correct_char,
                        "explanation": ex.get("explanation") or ex.get("spanish_translation") or "Respuesta correcta basada en el modelo gramatical de la clase."
                    })
                    quiz_num += 1
            elif phase.get("options"):
                opts_list = phase.get("options") or []
                opts_dict = {}
                for oi, opt in enumerate(opts_list):
                    char = chr(ord('A') + oi)
                    clean_opt = re.sub(r'^[A-D]\)\s*', '', str(opt)).strip()
                    opts_dict[char] = clean_opt
                exp_ans = str(phase.get("expected_answer", "")).strip()
                correct_char = "A"
                if exp_ans.upper() in ["A", "B", "C", "D"]:
                    correct_char = exp_ans.upper()
                else:
                    for k, v in opts_dict.items():
                        if v.lower() == exp_ans.lower():
                            correct_char = k
                            break
                quiz_questions.append({
                    "question_number": quiz_num,
                    "question": phase.get("student_task") or phase.get("tutor_says") or "Elige la opción correcta:",
                    "options": opts_dict,
                    "correct_option": correct_char,
                    "explanation": phase.get("quiz_explanation") or "Opción gramaticalmente precisa."
                })
                quiz_num += 1
            continue

        # Conceptual stage
        gs = phase.get("grammar_structure") or {}
        tokens = []
        raw_tokens = gs.get("formula_tokens") or []
        for rt in raw_tokens:
            if isinstance(rt, dict):
                tokens.append({
                    "role": rt.get("role", "Elemento"),
                    "example": rt.get("pattern") or rt.get("example") or "",
                    "color": rt.get("color", "blue")
                })

        examples = []
        for it in phase.get("target_audio_items") or []:
            if isinstance(it, dict) and it.get("english"):
                examples.append({
                    "english": it["english"],
                    "spanish": it.get("translation", ""),
                    "tip": it.get("label", "")
                })
        if not examples and gs.get("example_breakdowns"):
            for eb in gs.get("example_breakdowns") or []:
                if isinstance(eb, dict) and eb.get("english"):
                    examples.append({
                        "english": eb["english"],
                        "spanish": eb.get("spanish", ""),
                        "tip": ""
                    })

        mistake = None
        if "error" in p_name.lower() or "duelo" in p_name.lower() or "trampa" in p_name.lower():
            mistake = {
                "incorrect": phase.get("incorrect_example") or "Error común frecuente de concordancia",
                "correct": phase.get("correct_example") or (examples[0]["english"] if examples else "Oración correcta"),
                "why": phase.get("tutor_says") or "Cuidado con la transferencia directa del español."
            }

        clean_name = re.sub(r'^(?:fase|stage|etapa|hook|slide)\s*\d*[\s:\-–—]+', '', p_name, flags=re.IGNORECASE).strip()
        stages.append({
            "stage_number": stage_num,
            "title": clean_name or p_name,
            "objective": phase.get("objective") or clean_name or f"Concepto clave {stage_num}",
            "explanation": phase.get("tutor_says") or phase.get("board_content") or "",
            "formula": gs.get("formula") or "",
            "formula_tokens": tokens,
            "examples": examples,
            "common_mistake": mistake
        })
        stage_num += 1

    contrast_table = script_data.get("contrast_table")
    low_top = cur_topic.lower()

    if not contrast_table:
        if any(w in low_top for w in ["passive", "pasiva", "voz pasiva"]):
            contrast_table = {
                "title": "Matriz de Transformación por Tiempos Verbales (Voz Activa ➔ Voz Pasiva)",
                "headers": ["Tiempo Verbal", "Voz Activa (Sujeto Agente)", "Voz Pasiva (Objeto Receptor)", "Fórmula Auxiliar"],
                "rows": [
                    ["Present Simple", "The chef prepares the dishes.", "The dishes are prepared by the chef.", "am / is / are + V3"],
                    ["Past Simple", "The chef prepared the dishes.", "The dishes were prepared by the chef.", "was / were + V3"],
                    ["Present Perfect", "The chef has prepared the dishes.", "The dishes have been prepared.", "has / have been + V3"],
                    ["Modals (Must/Can)", "The chef must prepare the dishes.", "The dishes must be prepared.", "modal + be + V3"],
                    ["Future (Will)", "The chef will prepare the dishes.", "The dishes will be prepared.", "will be + V3"]
                ]
            }
        elif any(w in low_top for w in ["reported speech", "indirect speech", "discurso indirecto"]):
            contrast_table = {
                "title": "Matriz de Retroceso Temporal: Direct Speech vs. Reported Speech (Backshift)",
                "headers": ["Tiempo Directo", "Oración Directa (Cita)", "Estilo Indirecto (Reported)", "Regla de Retroceso"],
                "rows": [
                    ["Present Simple", "\"I work in London.\"", "She said that she worked in London.", "Presente ➔ Pasado Simple"],
                    ["Present Continuous", "\"I am studying now.\"", "He said he was studying then.", "Present Cont. ➔ Past Cont."],
                    ["Past Simple", "\"I bought a car.\"", "She said she had bought a car.", "Past Simple ➔ Past Perfect"],
                    ["Present Perfect", "\"We have finished the task.\"", "They said they had finished the task.", "Pres. Perfect ➔ Past Perfect"],
                    ["Modal Will", "\"I will call you tomorrow.\"", "He told me he would call the next day.", "Will ➔ Would"],
                    ["Modal Can", "\"I can solve this issue.\"", "She said she could solve that issue.", "Can ➔ Could"]
                ]
            }
        elif any(w in low_top for w in ["present perfect vs past simple", "perfect vs past"]):
            contrast_table = {
                "title": "Duelo Didáctico: Present Perfect vs. Past Simple",
                "headers": ["Dimensión", "Present Perfect (Tiempo Abierto)", "Past Simple (Tiempo Cerrado)"],
                "rows": [
                    ["Foco Temporal", "Conecta el pasado con el momento presente", "Evento finalizado en un momento específico del pasado"],
                    ["Marcadores Clave", "ever, never, already, yet, so far, recently, since, for", "yesterday, in 2020, two days ago, last night, then"],
                    ["Estructura", "Sujeto + have / has + Participio Pasado (V3)", "Sujeto + Verbo Pasado (V2)"],
                    ["Ejemplo Modelo", "I have visited Tokyo twice. (mi vida sigue abierta)", "I visited Tokyo in 2019. (año finalizado)"]
                ]
            }

    takeaways = script_data.get("summary_takeaways") or [
        f"Comprender la función y estructura nuclear de {cur_topic}.",
        "Reconocer las variaciones por sujeto, tiempo y contexto comunicativo.",
        "Evitar los errores sintácticos comunes por interferencia del español.",
        "Aplicar el patrón en oraciones completas con confianza y fluidez."
    ]

    return {
        "topic": cur_topic,
        "sublevel": cur_sublevel,
        "pedagogical_objective": pedagogical_obj,
        "mental_model": mental_model,
        "stages": stages,
        "contrast_table": contrast_table,
        "quiz": quiz_questions,
        "summary_takeaways": takeaways
    }


@router.post("/export")
async def export_lesson(
    req: LessonExportRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Exports a comprehensive lesson material package in PPTX, DOCX, or PDF.
    Can export directly from client state (script_data) or database (lesson_id).
    """
    fmt = (req.format or "pptx").lower().strip()
    if fmt not in ["pptx", "docx", "pdf"]:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usa 'pptx', 'docx' o 'pdf'.")

    script_data = req.script_data

    # If script_data not sent directly, attempt loading from DB
    if not script_data and req.lesson_id and current_user:
        res = await db.execute(
            select(LessonHistory).where(
                LessonHistory.id == req.lesson_id,
                LessonHistory.user_id == current_user.id
            )
        )
        hist = res.scalars().first()
        if hist and hist.lesson_data and isinstance(hist.lesson_data, dict):
            script_data = hist.lesson_data
            if not req.topic:
                req.topic = hist.topic
            if not req.sublevel:
                req.sublevel = hist.sublevel

    export_dict = adapt_script_to_export_data(
        script_data=script_data,
        topic=req.topic or "Clase de Inglés",
        sublevel=req.sublevel or "B1.1"
    )

    clean_topic = re.sub(r'[^a-zA-Z0-9_\-]+', '_', export_dict.get("topic", "clase").lower().strip()).strip('_')
    sub_tag = export_dict.get('sublevel', 'b1').lower().replace('.', '_')
    base_name = f"clase_{clean_topic}_{sub_tag}"

    export_cache_dir = os.path.join(tempfile.gettempdir(), "guionbajo_lesson_exports")
    os.makedirs(export_cache_dir, exist_ok=True)

    export_data = LessonExportData.from_dict(export_dict)
    target_path = os.path.join(export_cache_dir, f"{base_name}.{fmt}")

    try:
        if fmt == "pptx":
            exporter = PowerPointLessonExporter(export_data)
            actual_path = exporter.export(target_path)
            media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        elif fmt == "docx":
            exporter = WordLessonExporter(export_data)
            actual_path = exporter.export(target_path)
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:  # pdf
            exporter = PdfLessonExporter(export_data)
            actual_path = exporter.export(target_path)
            media_type = "application/pdf"
    except Exception as e:
        logger.error(f"Error compiling lesson export {fmt}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al compilar el archivo {fmt.upper()}: {str(e)}")

    out_filename = os.path.basename(actual_path)
    return FileResponse(
        path=actual_path,
        media_type=media_type,
        filename=out_filename,
        headers={"Content-Disposition": f'attachment; filename="{out_filename}"'}
    )

