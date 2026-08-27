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

class HookImage(BaseModel):
    prompt: str
    caption: Optional[str] = None
    role: Optional[str] = "hook_situation"  # "hook_situation" | "hook_context" | "hook_contrast"

class LessonPhase(BaseModel):
    phase_number: int
    phase_name: str
    tutor_says: str
    is_hook: Optional[bool] = False
    hook_type: Optional[str] = None  # "dilemma" | "curiosity_question" | "daily_scenario" | "contrast"
    hook_images: Optional[List[Dict[str, Any]]] = None
    student_task: Optional[str] = None
    expected_answer: Optional[str] = None
    key_structure: Optional[str] = None
    grammar_structure: Optional[Dict[str, Any]] = None
    exercises: List[Dict[str, Any]] = []
    image_prompt: Optional[str] = None
    image_prompts: Optional[List[str]] = None
    image_style: Optional[str] = "flat_art"
    board_content: Optional[str] = None
    board_theme: Optional[str] = "chalkboard_green"
    diagram_svg: Optional[str] = None
    target_audio_items: Optional[List[Dict[str, Any]]] = None
    storyboard_steps: Optional[List[Dict[str, Any]]] = None

class LessonScript(BaseModel):
    topic: Optional[str] = None
    sublevel: Optional[str] = None
    level: Optional[str] = None
    subject: Optional[str] = "English"
    archetype: Optional[str] = "practice"
    phases: List[LessonPhase]

