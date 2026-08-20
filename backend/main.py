import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, AsyncSessionLocal
import models
from models.user import User, StudentProfile
from auth.jwt import get_password_hash
from sqlalchemy.future import select
import uuid
import asyncio
from routers import (
    auth_router,
    settings_router,
    diagnosis_router,
    lesson_router,
    progress_router,
    tts_router,
    image_router,
    game_router,
    phonetics_router,
    reading_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-initialize database tables and seed demo user
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] Database tables initialized successfully.")
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.email == "demo@guionbajo.com"))
            existing = result.scalars().first()
            if not existing:
                demo_user = User(
                    id=str(uuid.uuid4()),
                    email="demo@guionbajo.com",
                    password_hash=get_password_hash("demo1234"),
                    name="Demo Student",
                    native_language="es",
                )
                db.add(demo_user)
                await db.flush()

                demo_profile = StudentProfile(
                    user_id=demo_user.id,
                    current_level="A1",
                    current_sublevel="A1.2",
                    total_xp=150,
                    streak_days=3,
                    weak_areas=["past_tense", "pronunciation"],
                    learning_map=[],
                    knowledge_map={},
                    phonetics_mastery={},
                    minimax_api_key=None,
                )
                db.add(demo_profile)
                await db.commit()
                print("[OK] Demo user (demo@guionbajo.com) created in database.")
    except Exception as e:
        print(f"[WARN] Database initialization notice: {e}")
    yield

app = FastAPI(
    title="Guionbajo Cloud - Master Phonetics Engine",
    version="1.1.1",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "https://guionbajo.vercel.app",
        "https://guionbajo-git-main-faraday0594s-projects.vercel.app",
    ],
    allow_origin_regex=r"https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.get("/")
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Guionbajo Cloud Master Phonetics Engine",
        "version": "1.1.1"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal Server Error"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(diagnosis_router)
app.include_router(lesson_router)
app.include_router(progress_router)
app.include_router(tts_router)
app.include_router(image_router)
app.include_router(game_router)
app.include_router(phonetics_router)
app.include_router(reading_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
