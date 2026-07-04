import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import get_settings

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
EXTENSIONS_BY_CONTENT_TYPE = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}


def save_upload(file: UploadFile, content: bytes, analysis_id: uuid.UUID) -> Path:
    settings = get_settings()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)

    extension = EXTENSIONS_BY_CONTENT_TYPE[file.content_type]
    destination = settings.storage_dir / f"{analysis_id}{extension}"
    destination.write_bytes(content)
    return destination
