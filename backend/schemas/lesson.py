from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class LessonGenerateRequest(BaseModel):
    topic: str
    sublevel: str
    lesson_type: str = "grammar"

class LessonEvaluateRequest(BaseModel):
    phase: int
    answer: str

class LessonEvaluateResponse(BaseModel):
    is_correct: bool
    feedback: str
    score: int
    tutor_reply: str

class LessonPhase(BaseModel):
    phase_number: int
    phase_name: str
    tutor_says: str
    student_task: str
    expected_answer: str
    key_structure: str
    exercises: List[Dict[str, Any]] = []
    image_prompt: Optional[str] = None
    board_content: Optional[str] = None

class LessonScript(BaseModel):
    phases: List[LessonPhase]
