from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class DiagnosisStartResponse(BaseModel):
    questions: List[Dict[str, Any]]


class DiagnosisAnswer(BaseModel):
    question_id: int
    answer: str


class DiagnosisCompleteRequest(BaseModel):
    answers: List[DiagnosisAnswer]
    questions: Optional[List[Dict[str, Any]]] = []  # frontend sends questions back for proper eval


class DiagnosisSkipRequest(BaseModel):
    chosen_level: str


class DiagnosisResultResponse(BaseModel):
    assigned_level: str
    score_by_level: Dict[str, Any]
    agent_reasoning: str
    recommendation: Optional[str] = None
    strong_areas: Optional[List[str]] = []
    weak_areas: Optional[List[str]] = []
    total_score: Optional[int] = 0
    confidence: Optional[float] = 0.8
