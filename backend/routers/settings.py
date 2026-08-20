from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from auth.dependencies import get_current_user
from database import get_db
from models.user import User, StudentProfile
from schemas.student import SettingsUpdate
from core.tts_service import AVAILABLE_VOICES

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/")
async def get_settings(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    
    key = profile.minimax_api_key if profile and profile.minimax_api_key else None
    masked_key = f"{key[:6]}...{key[-4:]}" if key else None
    
    return {"minimax_api_key": masked_key}

@router.post("/minimax-key")
async def update_key(settings_update: SettingsUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    
    if not profile:
        profile = StudentProfile(user_id=current_user.id, minimax_api_key=settings_update.api_key)
        db.add(profile)
    else:
        profile.minimax_api_key = settings_update.api_key
    await db.commit()
    
    return {"status": "success"}

@router.get("/voices")
async def get_voices():
    return AVAILABLE_VOICES
