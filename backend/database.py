from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import settings
import ssl
import logging

logger = logging.getLogger(__name__)

import re

raw_url = settings.DATABASE_URL.strip() if settings.DATABASE_URL else "sqlite+aiosqlite:///./guionbajo.db"

# Auto-strip accidental square brackets around password (common mistake when copying from Supabase [YOUR-PASSWORD])
raw_url = re.sub(r':\[(.*?)\]@', r':\1@', raw_url)

if raw_url.startswith("postgres://"):
    db_url = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+asyncpg://"):
    db_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    db_url = raw_url

# asyncpg does not accept URL query parameters (like ?sslmode=require or &pgbouncer=true)
if db_url.startswith("postgresql+asyncpg://") and "?" in db_url:
    db_url = db_url.split("?", 1)[0]

connect_args = {}
engine_kwargs = {"echo": False}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # Cloud PostgreSQL (Supabase / Render) requires SSL and statement cache size 0 for asyncpg & PgBouncer
    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_context
    except Exception as e:
        logger.warning(f"Error creating SSL context for DB: {e}")
    connect_args["statement_cache_size"] = 0
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_async_engine(
    db_url, 
    connect_args=connect_args,
    **engine_kwargs
)
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
