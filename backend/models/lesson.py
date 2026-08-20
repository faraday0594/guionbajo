import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class LessonHistory(Base):
    __tablename__ = "lesson_history"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    topic = Column(String, nullable=False)
    level = Column(String, nullable=False)
    sublevel = Column(String, nullable=False)
    archetype = Column(String, default="practice")
    phonetic_data = Column(JSON, default=dict)
    overall_score = Column(Integer, default=0)
    phases_completed = Column(Integer, default=0)
    duration_seconds = Column(Integer, default=0)
    lesson_data = Column(JSON, default=dict)
    completed_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="lessons")

class DiagnosisResult(Base):
    __tablename__ = "diagnosis_results"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    assigned_level = Column(String, nullable=False)
    score_by_level = Column(JSON, default=dict)
    skills_breakdown = Column(JSON, default=dict)
    agent_reasoning = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="diagnoses")
