import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    native_language = Column(String, default="es")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    settings = relationship("SettingsStore", back_populates="user", cascade="all, delete-orphan")
    lessons = relationship("LessonHistory", back_populates="user", cascade="all, delete-orphan")
    diagnoses = relationship("DiagnosisResult", back_populates="user", cascade="all, delete-orphan")

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    current_level = Column(String, default="A1")
    current_sublevel = Column(String, default="A1.1")
    total_xp = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    weak_areas = Column(JSON, default=list)
    learning_map = Column(JSON, default=list)
    knowledge_map = Column(JSON, default=dict)
    phonetics_mastery = Column(JSON, default=dict)
    minimax_api_key = Column(String, nullable=True)
    preferred_voice = Column(String, default="female-yujie")
    
    user = relationship("User", back_populates="profile")

class SettingsStore(Base):
    __tablename__ = "settings_store"
    
    key = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    value = Column(String, nullable=False)
    
    user = relationship("User", back_populates="settings")
