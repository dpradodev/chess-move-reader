from fastapi import FastAPI, HTTPException, UploadFile

from app.ocr import OcrServiceError, transcribe_scoresheet
from app.schemas import AnalyzeResponse

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}

app = FastAPI(title="Chess Move Reader OCR")


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(image: UploadFile) -> AnalyzeResponse:
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Formato de imagen no soportado (usa PNG, JPG o WEBP)")

    content = await image.read()

    try:
        moves = await transcribe_scoresheet(content, image.content_type)
    except OcrServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return AnalyzeResponse(moves=moves)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
