from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GOOGLE_API_KEY: str = ""
    GOOGLE_MODEL: str = "gemini-1.5-flash"         # 1500 RPD free tier
    GOOGLE_VISION_MODEL: str = "gemini-1.5-flash"  # 1500 RPD free tier
    
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"
    
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    SQLITE_PATH: str = "./data/legal.db"
    UPLOAD_DIR: str = "./data/uploads"
    EXTRACTED_DIR: str = "./data/extracted"
    MAX_UPLOAD_MB: int = 50
    OCR_CONFIDENCE_THRESHOLD: float = 0.7
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    RETRIEVAL_TOP_K: int = 8
    PATTERN_SIMILARITY_THRESHOLD: float = 0.85
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"


settings = Settings()
