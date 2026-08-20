from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal Server Error"},
        headers={"Access-Control-Allow-Origin": "*"}
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
