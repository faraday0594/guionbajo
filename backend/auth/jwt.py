from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    # Ensure password length within bcrypt limits
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_password_reset_token(user_id: str, email: str, current_password_hash: str) -> str:
    """
    Genera un token de restablecimiento firmado con expiración de 30 minutos.
    Incluye un prefijo del hash actual para garantizar uso único e invalidación inmediata al cambiar la clave.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    data = {
        "sub": user_id,
        "email": email,
        "pwh": current_password_hash[:12] if current_password_hash else "",
        "purpose": "password_reset",
        "exp": expire,
    }
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_password_reset_token(token: str) -> Optional[dict]:
    """
    Verifica la validez y firma del token de restablecimiento de contraseña.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        return payload
    except JWTError:
        return None

