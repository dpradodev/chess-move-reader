import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models import AnalysisStatus


class OcrMoveOut(BaseModel):
    san: str
    confidence: int


class AnalysisCreated(BaseModel):
    id: uuid.UUID
    status: AnalysisStatus


class AnalysisStatusResponse(BaseModel):
    id: uuid.UUID
    status: AnalysisStatus
    moves: list[OcrMoveOut] | None
    error: str | None
    created_at: datetime
    completed_at: datetime | None
