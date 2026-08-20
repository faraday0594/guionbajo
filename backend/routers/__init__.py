from .auth import router as auth_router
from .settings import router as settings_router
from .diagnosis import router as diagnosis_router
from .lesson import router as lesson_router
from .progress import router as progress_router
from .tts import router as tts_router
from .image import router as image_router
from .game import router as game_router
from .phonetics import router as phonetics_router
from .reading import router as reading_router

__all__ = [
    "auth_router",
    "settings_router",
    "diagnosis_router",
    "lesson_router",
    "progress_router",
    "tts_router",
    "image_router",
    "game_router",
    "phonetics_router",
    "reading_router",
]
