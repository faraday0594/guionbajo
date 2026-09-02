from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class StudentProfileResponse(BaseModel):
    user_id: str
    current_level: str
    current_sublevel: str
    total_xp: int
    streak_days: int
    weak_areas: List[str]
    learning_map: List[Dict[str, Any]]
    preferred_voice: Optional[str] = "female-yujie"
    
    class Config:
        from_attributes = True

class SettingsUpdate(BaseModel):
    api_key: str

class GroqKeyUpdate(BaseModel):
    api_key: str

class VoicePreferenceUpdate(BaseModel):
    voice: str

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "female-yujie"
    emotion: Optional[str] = "calm"
    speed: Optional[float] = 1.0
