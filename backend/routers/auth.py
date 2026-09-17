from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from auth.jwt import get_password_hash, verify_password, create_access_token
from auth.dependencies import get_current_user
from database import get_db
from models.user import User, StudentProfile
from schemas.auth import UserCreate, UserLogin, Token, UserResponse
from core.minimax_agent import TutorAgent
from services.email_service import notify_new_registration, notify_user_login, send_registered_users_report
import logging
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(
    user: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = User(
        email=user.email,
        password_hash=get_password_hash(user.password),
        name=user.name,
        native_language=user.native_language
    )
    db.add(new_user)
    await db.flush()
    
    agent = TutorAgent()
    default_lmap = agent._fallback_learning_map("A1.1")

    profile = StudentProfile(
        user_id=new_user.id,
        current_level="A1",
        current_sublevel="A1.1",
        learning_map=default_lmap,
        preferred_voice="es-US-AlonsoNeural",
    )
    db.add(profile)
    await db.commit()
    await db.refresh(new_user)

    # Notificar al administrador en segundo plano sin demorar la respuesta
    background_tasks.add_task(
        notify_new_registration,
        user_name=new_user.name or "Usuario",
        user_email=new_user.email,
        native_language=new_user.native_language or "es",
        user_id=str(new_user.id)
    )

    return new_user

@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalars().first()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user.id})

    # Notificar al administrador en segundo plano sin demorar la respuesta
    client_ip = request.client.host if request.client else "Desconocida"
    background_tasks.add_task(
        notify_user_login,
        user_name=user.name or "",
        user_email=user.email,
        ip_address=client_ip
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout():
    return {"message": "Successfully logged out"}

@router.get("/admin/users-report")
async def get_and_send_users_report(
    send_email: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene todos los usuarios registrados en la base de datos (local o nube)
    y opcionalmente despacha el reporte por correo a settings.NOTIFICATION_EMAIL.
    """
    result = await db.execute(select(User))
    users = result.scalars().all()

    users_data = []
    for u in users:
        prof = None
        try:
            prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == u.id))
            prof = prof_res.scalars().first()
        except Exception as err:
            logger.warning(f"Could not load student profile for {u.id}: {err}")

        users_data.append({
            "id": u.id,
            "name": u.name or "Sin nombre",
            "email": u.email,
            "native_language": u.native_language or "es",
            "created_at": str(u.created_at) if getattr(u, "created_at", None) else "N/A",
            "current_level": getattr(prof, "current_level", "A1") if prof else "A1",
            "current_sublevel": getattr(prof, "current_sublevel", "A1.1") if prof else "A1.1",
            "total_xp": getattr(prof, "total_xp", 0) if prof else 0,
            "streak_days": getattr(prof, "streak_days", 0) if prof else 0,
        })

    email_sent = False
    if send_email and users_data:
        email_sent = await send_registered_users_report(users_data)

    return {
        "status": "success",
        "total_users": len(users_data),
        "email_sent": email_sent,
        "recipient": settings.NOTIFICATION_EMAIL,
        "users": users_data,
    }

