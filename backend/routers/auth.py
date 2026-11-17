from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from auth.jwt import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
)
from auth.dependencies import get_current_user, get_admin_user
from database import get_db
from models.user import User, StudentProfile
from schemas.auth import (
    UserCreate,
    UserLogin,
    Token,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from core.minimax_agent import TutorAgent
from services.email_service import (
    notify_new_registration,
    notify_user_login,
    send_registered_users_report,
    send_password_reset_email,
    send_access_approved_email,
)
import logging
from urllib.parse import urlparse
from config import settings
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _extract_base_url(request: Request) -> str:
    """Detecta el origen del frontend dinámicamente (Vercel o localhost)."""
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        base_url = origin.split("?")[0].rstrip("/")
        parsed = urlparse(base_url)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
    return settings.FRONTEND_URL.rstrip("/")


@router.post("/register", response_model=UserResponse)
async def register(
    user: UserCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    clean_email = user.email.strip().lower()
    result = await db.execute(select(User).where(func.lower(func.trim(User.email)) == clean_email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Este correo electrónico ya está registrado.")
        
    # La cuenta principal siempre queda aprobada; los nuevos registros quedan pendientes
    initial_status = "approved" if clean_email == "megafer1994@gmail.com" else "pending"

    new_user = User(
        email=clean_email,
        password_hash=get_password_hash(user.password.strip()),
        name=(user.name or "").strip(),
        native_language=user.native_language,
        access_status=initial_status,
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
        user_id=str(new_user.id),
        dashboard_url=_extract_base_url(request),
    )

    return new_user

@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    clean_email = user_data.email.strip().lower()
    if clean_email == "demo@guionbajo.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El acceso Demo ha sido deshabilitado. Por favor solicita tu cuenta e inicia sesión una vez aprobada.",
        )
    result = await db.execute(select(User).where(func.lower(func.trim(User.email)) == clean_email))
    user = result.scalars().first()

    # Si es megafer1994@gmail.com con su clave 123456, asegurar acceso y sincronizar B2.1
    if clean_email == "megafer1994@gmail.com" and user_data.password.strip() == "123456":
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="megafer1994@gmail.com",
                password_hash=get_password_hash("123456"),
                name="Fernando",
                native_language="es"
            )
            db.add(user)
            await db.flush()
            prof = StudentProfile(
                user_id=user.id,
                current_level="B2",
                current_sublevel="B2.1",
                total_xp=6800,
                streak_days=0,
                knowledge_map={"current_class_index": 1, "active_checkpoint": None},
                preferred_voice="es-US-AlonsoNeural"
            )
            db.add(prof)
            await db.commit()
        else:
            if not verify_password("123456", user.password_hash):
                user.password_hash = get_password_hash("123456")
            prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user.id))
            prof = prof_res.scalars().first()
            if prof:
                prof.current_level = "B2"
                prof.current_sublevel = "B2.1"
                if not prof.total_xp or prof.total_xp < 6800:
                    prof.total_xp = 6800
            else:
                prof = StudentProfile(
                    user_id=user.id,
                    current_level="B2",
                    current_sublevel="B2.1",
                    total_xp=6800,
                    streak_days=0,
                    knowledge_map={"current_class_index": 1, "active_checkpoint": None},
                    preferred_voice="es-US-AlonsoNeural"
                )
                db.add(prof)
            await db.commit()

    # Asegurar acceso de Laura Valencia (lauvalencia542@gmail.com) con su clave lau12345
    if clean_email == "lauvalencia542@gmail.com" and user_data.password.strip() == "lau12345":
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="lauvalencia542@gmail.com",
                password_hash=get_password_hash("lau12345"),
                name="Laura Valencia",
                native_language="es"
            )
            db.add(user)
            await db.flush()
            agent = TutorAgent()
            prof = StudentProfile(
                user_id=user.id,
                current_level="A1",
                current_sublevel="A1.1",
                learning_map=agent._fallback_learning_map("A1.1"),
                preferred_voice="es-US-AlonsoNeural"
            )
            db.add(prof)
            await db.commit()
        else:
            if not verify_password("lau12345", user.password_hash):
                user.password_hash = get_password_hash("lau12345")
                await db.commit()

    raw_pwd = user_data.password
    stripped_pwd = user_data.password.strip()
    pwd_valid = bool(user and (
        verify_password(raw_pwd, user.password_hash) or
        (stripped_pwd != raw_pwd and verify_password(stripped_pwd, user.password_hash))
    ))
    if not user or not pwd_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos. Verifica tus datos o usa '¿Olvidaste tu contraseña?'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if clean_email != "megafer1994@gmail.com":
        user_status = getattr(user, "access_status", "approved") or "approved"
        if user_status == "pending":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu solicitud de registro está pendiente de aprobación por el administrador. Te avisaremos cuando tengas acceso.",
            )
        if user_status == "rejected":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu solicitud de acceso fue rechazada o revocada. Contacta al administrador.",
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


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Recibe el email del usuario. Si existe, genera un token firmado (30m)
    y envía un correo mediante Resend con el enlace para restablecer la contraseña.
    """
    clean_email = data.email.lower().strip()
    result = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    user = result.scalars().first()

    if not user:
        logger.warning(f"⚠️ [PASSWORD RESET] No existe ninguna cuenta registrada con el correo: '{clean_email}'")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No encontramos ninguna cuenta registrada con este correo electrónico. Por favor verifica que esté bien escrito o regístrate."
        )

    token = create_password_reset_token(
        user_id=user.id,
        email=user.email,
        current_password_hash=user.password_hash or ""
    )

    base_url = _extract_base_url(request)
    reset_url = f"{base_url}/reset-password?token={token}"

    logger.info(f"🔑 [PASSWORD RESET] Solicitud para {user.email} -> Enlace: {reset_url}")
    print(f"🔑 [PASSWORD RESET] Despachando correo para {user.email}...")

    sent = await send_password_reset_email(
        to_email=user.email,
        reset_url=reset_url,
        user_name=user.name or ""
    )

    if not sent:
        logger.error(f"❌ [PASSWORD RESET] Falló el despacho de correo para {user.email}")
        print(f"❌ [PASSWORD RESET] Falló el despacho de correo para {user.email}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo enviar el correo de recuperación en este momento. Por favor verifica que las credenciales de correo (SMTP de Gmail o Resend) estén configuradas en el servidor."
        )

    return {"message": "Hemos enviado el enlace para restablecer tu contraseña a tu correo electrónico."}


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica el token recibido y actualiza la contraseña del usuario en la base de datos.
    Invalida el token una vez procesado (single-use).
    """
    payload = verify_password_reset_token(data.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo."
        )

    user_id = payload.get("sub")
    token_pwh = payload.get("pwh")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario no encontrado."
        )

    # Protección de un solo uso: si la contraseña ya cambió, el prefijo del hash no coincidirá
    current_pwh = (user.password_hash or "")[:12]
    if token_pwh and token_pwh != current_pwh:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este enlace ya fue utilizado previamente. Solicita uno nuevo si necesitas restablecer tu contraseña."
        )

    if len(data.new_password.strip()) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe contener al menos 6 caracteres."
        )

    user.password_hash = get_password_hash(data.new_password.strip())
    await db.commit()

    return {"message": "¡Tu contraseña ha sido actualizada con éxito! Ya puedes iniciar sesión."}


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


@router.get("/admin/access-requests")
async def list_access_requests(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lista todas las solicitudes de acceso y usuarios (solo accesible por megafer1994@gmail.com).
    """
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    items = []
    pending_count = 0
    for u in users:
        if (u.email or "").strip().lower() == "megafer1994@gmail.com":
            continue
        user_status = getattr(u, "access_status", "approved") or "approved"
        if user_status == "pending":
            pending_count += 1
        items.append({
            "id": u.id,
            "name": u.name or "Sin nombre",
            "email": u.email,
            "native_language": u.native_language or "es",
            "access_status": user_status,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    # Ordenar primero los pendientes
    status_order = {"pending": 0, "rejected": 1, "approved": 2}
    items.sort(key=lambda x: status_order.get(x["access_status"], 3))

    return {
        "pending_count": pending_count,
        "users": items,
    }


@router.post("/admin/access-requests/{user_id}/approve")
async def approve_user_access(
    user_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Aprueba el acceso de un usuario registrado (solo megafer1994@gmail.com).
    """
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    target.access_status = "approved"
    await db.commit()
    await db.refresh(target)

    background_tasks.add_task(
        send_access_approved_email,
        to_email=target.email,
        user_name=target.name or "",
        login_url=_extract_base_url(request),
    )

    return {
        "status": "success",
        "message": f"Acceso aprobado para {target.email}.",
        "user": {
            "id": target.id,
            "name": target.name,
            "email": target.email,
            "access_status": target.access_status,
        },
    }


@router.post("/admin/access-requests/{user_id}/reject")
async def reject_user_access(
    user_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rechaza o revoca el acceso de un usuario (solo megafer1994@gmail.com).
    """
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if (target.email or "").strip().lower() == "megafer1994@gmail.com":
        raise HTTPException(status_code=400, detail="No puedes rechazar la cuenta principal.")

    target.access_status = "rejected"
    await db.commit()
    await db.refresh(target)

    return {
        "status": "success",
        "message": f"Acceso rechazado para {target.email}.",
        "user": {
            "id": target.id,
            "name": target.name,
            "email": target.email,
            "access_status": target.access_status,
        },
    }

