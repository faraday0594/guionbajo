"""
Script para crear el usuario demo y verificar la BD.
Ejecutar desde: d:\tutor ai\backend\
  python create_demo_user.py
"""
import asyncio
import sys
import os

# Fix encoding for Windows terminal
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, Base, AsyncSessionLocal
from models.user import User, StudentProfile
from models.lesson import LessonHistory, DiagnosisResult
from auth.jwt import get_password_hash
from sqlalchemy.future import select
import uuid

DEMO_EMAIL = "demo@guionbajo.com"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Demo Student"


async def main():
    # Crear todas las tablas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tablas creadas/verificadas")

    async with AsyncSessionLocal() as db:
        # Verificar si el demo ya existe
        result = await db.execute(select(User).where(User.email == DEMO_EMAIL))
        existing = result.scalars().first()

        if existing:
            print(f"[INFO] Usuario demo ya existe: {DEMO_EMAIL}")
            # Forzar reset de contrasena por si acaso
            existing.password_hash = get_password_hash(DEMO_PASSWORD)
            await db.commit()
            print("[OK] Contrasena del demo reseteada")
        else:
            # Crear usuario demo
            demo_user = User(
                id=str(uuid.uuid4()),
                email=DEMO_EMAIL,
                password_hash=get_password_hash(DEMO_PASSWORD),
                name=DEMO_NAME,
                native_language="es",
            )
            db.add(demo_user)
            await db.flush()

            # Crear perfil del estudiante demo en A1.2
            demo_profile = StudentProfile(
                user_id=demo_user.id,
                current_level="A1",
                current_sublevel="A1.2",
                total_xp=150,
                streak_days=3,
                weak_areas=["past_tense", "pronunciation"],
                learning_map=[],
                minimax_api_key=None,
            )
            db.add(demo_profile)
            await db.commit()
            print(f"[OK] Usuario demo creado:")
            print(f"     Email:    {DEMO_EMAIL}")
            print(f"     Password: {DEMO_PASSWORD}")
            print(f"     Level:    A1.2")

    print("\n[OK] Todo listo. Puedes iniciar sesion con las credenciales demo.")


if __name__ == "__main__":
    asyncio.run(main())
