import asyncio
import os
import sys
import uuid
import json
import sqlite3

# Fix encoding for Windows terminal
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, r'd:\tutor ai\backend')

from auth.jwt import get_password_hash
from core.minimax_agent import TutorAgent, LEVEL_SEQUENCE

USER_EMAIL = "megafer1994@gmail.com"
USER_NAME = "Fernando"
USER_PASSWORD = "megafer1234"
TARGET_LEVEL = "B2"
TARGET_SUBLEVEL = "B2.1"

# All sublevels before B2.1
COMPLETED_SUBLEVELS = [
    'A1.1', 'A1.2', 'A1.3', 'A1.4',
    'A2.1', 'A2.2', 'A2.3', 'A2.4',
    'B1.1', 'B1.2', 'B1.3', 'B1.4'
]

def build_b2_learning_map():
    agent = TutorAgent()
    lmap_dict = agent._fallback_learning_map("A1.1")
    modules = lmap_dict.get("modules", [])
    for mod in modules:
        sublevel = mod.get("sublevel", "")
        if sublevel in COMPLETED_SUBLEVELS:
            mod["status"] = "completed"
            mod["score"] = 95
        elif sublevel == TARGET_SUBLEVEL and mod.get("module_id", "").endswith("-01"):
            mod["status"] = "current"
        else:
            mod["status"] = "locked"
    return modules

async def update_sqlalchemy():
    from database import AsyncSessionLocal, engine, Base
    from models.user import User, StudentProfile
    from sqlalchemy.future import select

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == USER_EMAIL))
        user = res.scalars().first()

        pw_hash = get_password_hash(USER_PASSWORD)
        lmap = build_b2_learning_map()

        if user:
            print(f"[FOUND] Usuario existente: {user.email} ({user.id})")
            user.name = USER_NAME
            user.password_hash = pw_hash
            await db.flush()

            prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user.id))
            prof = prof_res.scalars().first()
            if prof:
                prof.current_level = TARGET_LEVEL
                prof.current_sublevel = TARGET_SUBLEVEL
                prof.total_xp = 6800
                prof.streak_days = 28
                prof.learning_map = lmap
                prof.knowledge_map = {"current_class_index": 1, "active_checkpoint": None}
            else:
                prof = StudentProfile(
                    user_id=user.id,
                    current_level=TARGET_LEVEL,
                    current_sublevel=TARGET_SUBLEVEL,
                    total_xp=6800,
                    streak_days=28,
                    learning_map=lmap,
                    knowledge_map={"current_class_index": 1, "active_checkpoint": None},
                    preferred_voice="es-US-AlonsoNeural"
                )
                db.add(prof)
        else:
            print(f"[CREATE] Creando nuevo usuario: {USER_EMAIL}")
            user = User(
                id=str(uuid.uuid4()),
                email=USER_EMAIL,
                password_hash=pw_hash,
                name=USER_NAME,
                native_language="es"
            )
            db.add(user)
            await db.flush()

            prof = StudentProfile(
                user_id=user.id,
                current_level=TARGET_LEVEL,
                current_sublevel=TARGET_SUBLEVEL,
                total_xp=6800,
                streak_days=28,
                learning_map=lmap,
                knowledge_map={"current_class_index": 1, "active_checkpoint": None},
                preferred_voice="es-US-AlonsoNeural"
            )
            db.add(prof)

        await db.commit()
        print(f"[OK] Usuario {USER_EMAIL} configurado con éxito en B2.1 (XP: 6800, Racha: 28)")

def sync_other_databases():
    # Sync to other sqlite databases if they exist
    dbs = [r'd:\tutor ai\backend\tutor_ai.db', r'd:\tutor ai\guionbajo.db']
    pw_hash = get_password_hash(USER_PASSWORD)
    lmap_json = json.dumps(build_b2_learning_map())
    kmap_json = json.dumps({"current_class_index": 1, "active_checkpoint": None})

    for db_path in dbs:
        if not os.path.exists(db_path):
            continue
        try:
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
            if not cur.fetchone():
                conn.close()
                continue

            cur.execute("SELECT id FROM users WHERE email = ?", (USER_EMAIL,))
            row = cur.fetchone()
            if row:
                uid = row[0]
                cur.execute("UPDATE users SET password_hash = ?, name = ? WHERE id = ?", (pw_hash, USER_NAME, uid))
                cur.execute("""
                    UPDATE student_profiles 
                    SET current_level = ?, current_sublevel = ?, total_xp = 6800, streak_days = 28, 
                        learning_map = ?, knowledge_map = ?
                    WHERE user_id = ?
                """, (TARGET_LEVEL, TARGET_SUBLEVEL, lmap_json, kmap_json, uid))
            else:
                uid = str(uuid.uuid4())
                cur.execute("INSERT INTO users (id, email, password_hash, name, native_language) VALUES (?, ?, ?, ?, 'es')",
                            (uid, USER_EMAIL, pw_hash, USER_NAME))
                cur.execute("""
                    INSERT INTO student_profiles (user_id, current_level, current_sublevel, total_xp, streak_days, learning_map, knowledge_map)
                    VALUES (?, ?, ?, 6800, 28, ?, ?)
                """, (uid, TARGET_LEVEL, TARGET_SUBLEVEL, lmap_json, kmap_json))
            conn.commit()
            conn.close()
            print(f"[SYNC] Sincronizado en {db_path}")
        except Exception as e:
            print(f"[WARN] Error sincronizando {db_path}: {e}")

if __name__ == "__main__":
    asyncio.run(update_sqlalchemy())
    sync_other_databases()
