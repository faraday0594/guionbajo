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
    quest_router,
    speech_router,
    live_chat_router,
    netflix_companion_router,
)

def sync_table_columns(sync_conn):
    from sqlalchemy import inspect, text
    try:
        if sync_conn.dialect.name == "postgresql":
            sync_conn.execute(text("SET LOCAL lock_timeout = '5s'"))
            sync_conn.execute(text("SET LOCAL statement_timeout = '10s'"))
    except Exception:
        pass

    inspector = inspect(sync_conn)
    existing_tables = set(inspector.get_table_names())
    
    for table_name, table in Base.metadata.tables.items():
        if table_name not in existing_tables:
            continue
        existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
        for column in table.columns:
            if column.name not in existing_cols:
                col_type = column.type.compile(sync_conn.dialect)
                default_clause = ""
                if column.default is not None and getattr(column.default, "arg", None) is not None:
                    val = column.default.arg
                    if isinstance(val, (str, int, float, bool)):
                        default_clause = f" DEFAULT '{val}'" if isinstance(val, str) else f" DEFAULT {val}"
                if_not_exists = "IF NOT EXISTS " if sync_conn.dialect.name == "postgresql" else ""
                sql = f"ALTER TABLE {table_name} ADD COLUMN {if_not_exists}{column.name} {col_type}{default_clause}"
                try:
                    sync_conn.execute(text(sql))
                    print(f"[DB MIGRATION] Added column '{column.name}' to table '{table_name}'.")
                except Exception as ex:
                    print(f"[DB MIGRATION WARN] Could not add column '{column.name}' to '{table_name}': {ex}")


async def _init_database_task():
    try:
        async def _do_init():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await conn.run_sync(sync_table_columns)
            print("[OK] Database tables initialized successfully.")

            async with AsyncSessionLocal() as db:
                fer_res = await db.execute(select(User).where(User.email == "megafer1994@gmail.com"))
                fer_user = fer_res.scalars().first()
                if fer_user:
                    fer_user.access_status = "approved"
                    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == fer_user.id))
                    prof = prof_res.scalars().first()
                    if prof:
                        prof.current_level = "B2"
                        prof.current_sublevel = "B2.1"
                        if not prof.total_xp or prof.total_xp < 6800:
                            prof.total_xp = 6800
                        if not prof.streak_days or prof.streak_days < 28:
                            prof.streak_days = 28
                        k_map = dict(prof.knowledge_map or {})
                        k_map["current_class_index"] = 1
                        k_map["active_checkpoint"] = None
                        prof.knowledge_map = k_map
                        await db.commit()
                        print("[OK] megafer1994@gmail.com profile set to B2.1 in database.")
                else:
                    new_fer = User(
                        id=str(uuid.uuid4()),
                        email="megafer1994@gmail.com",
                        password_hash=get_password_hash("123456"),
                        name="Fernando",
                        native_language="es",
                        access_status="approved",
                    )
                    db.add(new_fer)
                    await db.flush()
                    new_prof = StudentProfile(
                        user_id=new_fer.id,
                        current_level="B2",
                        current_sublevel="B2.1",
                        total_xp=6800,
                        streak_days=28,
                        knowledge_map={"current_class_index": 1, "active_checkpoint": None},
                        preferred_voice="es-US-AlonsoNeural",
                    )
                    db.add(new_prof)
                    await db.commit()
                    print("[OK] megafer1994@gmail.com initialized in B2.1 with password 123456.")
                lau_res = await db.execute(select(User).where(User.email == 'lauvalencia542@gmail.com'))
                lau_user = lau_res.scalars().first()
                if lau_user:
                    lau_user.password_hash = get_password_hash('lau12345')
                    lau_user.access_status = "approved"
                    await db.commit()

        await asyncio.wait_for(_do_init(), timeout=25.0)
    except Exception as e:
        print(f"[WARN] Database initialization notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Launch DB init in background so Uvicorn binds to $PORT immediately on Render
    init_task = asyncio.create_task(_init_database_task())
    yield
    if not init_task.done():
        init_task.cancel()

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
    allow_origin_regex=r"https?://.*|chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_private_network_access_header(request: Request, call_next):
    # Support Chrome Private Network Access (PNA) from https://www.netflix.com to localhost
    if request.method == "OPTIONS" and request.headers.get("access-control-request-private-network"):
        origin = request.headers.get("origin", "*")
        resp = JSONResponse(status_code=200, content={"status": "ok"})
        resp.headers["Access-Control-Allow-Private-Network"] = "true"
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Methods"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "*"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        return resp
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network"):
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

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
app.include_router(quest_router)
app.include_router(speech_router)
app.include_router(live_chat_router)
app.include_router(netflix_companion_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    is_dev = os.environ.get("RENDER") is None and "PORT" not in os.environ
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=is_dev)
