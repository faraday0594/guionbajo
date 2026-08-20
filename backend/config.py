from pydantic_settings import BaseSettings

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
    
    class Config:
        env_file = ".env"

settings = Settings()
