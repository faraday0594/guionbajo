"""
Script para borrar las lecciones guardadas con contenido antiguo/generico
y permitir que MiniMax-M3 genere clases totalmente nuevas.
"""
import asyncio
import sys
import os

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, Base, AsyncSessionLocal
from models.lesson import LessonHistory
from sqlalchemy import delete

async def main():
    async with AsyncSessionLocal() as db:
        await db.execute(delete(LessonHistory))
        await db.commit()
        print("[OK] Historial de lecciones antiguas borrado correctamente.")

if __name__ == "__main__":
    asyncio.run(main())
