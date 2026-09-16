from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from auth.jwt import get_password_hash, verify_password, create_access_token
from auth.dependencies import get_current_user
from database import get_db
from models.user import User, StudentProfile
from schemas.auth import UserCreate, UserLogin, Token, UserResponse
from core.minimax_agent import TutorAgent
from services.email_service import notify_new_registration, notify_user_login

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
