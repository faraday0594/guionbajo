import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class StoryQuest(Base):
    __tablename__ = "story_quests"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    grammar_topic = Column(String, nullable=False)
    difficulty_level = Column(String, nullable=False, default="A1")
    nodes = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship("StorySession", back_populates="quest", cascade="all, delete-orphan")


class StorySession(Base):
    __tablename__ = "story_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    quest_id = Column(String, ForeignKey("story_quests.id"), nullable=True)
    current_node_index = Column(Integer, default=0)
    attempt_count = Column(Integer, default=0)
    transcript_history = Column(JSON, default=list)
    is_completed = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="quest_sessions")
    quest = relationship("StoryQuest", back_populates="sessions")
