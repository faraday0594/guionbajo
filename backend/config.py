import os
from pydantic_settings import BaseSettings

_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

class Settings(BaseSettings):
    MINIMAX_API_KEY: str = ""
    MINIMAX_BASE_URL: str = "https://api.minimax.io/v1"
    MINIMAX_LLM_MODEL: str = "MiniMax-M3"
    MINIMAX_TTS_MODEL: str = "speech-02-hd"
    MINIMAX_TTS_ENDPOINT: str = "https://api.minimax.io/v1/t2a_v2"
    DATABASE_URL: str = "sqlite+aiosqlite:///./guionbajo.db"
    JWT_SECRET: str = "guionbajo-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_WHISPER_MODEL: str = "whisper-large-v3-turbo"
    
    class Config:
        env_file = _env_path
        extra = "ignore"

settings = Settings()

