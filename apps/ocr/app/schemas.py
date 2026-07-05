from pydantic import BaseModel


class OcrMoveOut(BaseModel):
    san: str
    confidence: int


class AnalyzeResponse(BaseModel):
    moves: list[OcrMoveOut]
