from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://chess:chess@localhost:5432/chess_move_reader"
    storage_dir: Path = Path("./data/uploads")
    max_upload_mb: int = 10
    allowed_origins: list[str] = ["http://localhost:4200"]

    # "mock" (default, no real OCR service yet) or "http" (calls ocr_service_url)
    ocr_client: str = "mock"
    ocr_service_url: str = "http://localhost:9000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
