from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
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
import asyncio

app = FastAPI(title="Guionbajo Cloud - Master Phonetics Engine", version="1.0.9")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
