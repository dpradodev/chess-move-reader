from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    claude_model: str = "claude-opus-4-8"
    max_tokens: int = 8192


@lru_cache
def get_settings() -> Settings:
    return Settings()
