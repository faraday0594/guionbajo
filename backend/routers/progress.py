from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from auth.dependencies import get_current_user
from database import get_db
from models.user import User, StudentProfile
from models.lesson import LessonHistory

router = APIRouter(prefix="/progress", tags=["progress"])

@router.get("/map")
async def get_progress_map(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    return profile.learning_map if profile else []

@router.get("/history")
async def get_progress_history(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LessonHistory).where(LessonHistory.user_id == current_user.id).limit(50))
    return result.scalars().all()

@router.get("/stats")
async def get_progress_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    
    if not profile:
        return {}
        
    return {
        "total_xp": profile.total_xp,
        "streak_days": profile.streak_days,
        "current_level": profile.current_level,
        "current_sublevel": profile.current_sublevel
    }

@router.post("/level")
async def update_student_level(
    sublevel: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if profile:
        profile.current_sublevel = sublevel
        profile.current_level = sublevel.split('.')[0]
        await db.commit()
    return {"status": "success", "current_sublevel": sublevel, "current_level": sublevel.split('.')[0]}
