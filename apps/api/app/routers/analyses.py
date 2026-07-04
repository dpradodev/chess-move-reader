import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal, get_db
from app.models import AnalysisMove, AnalysisRequest, AnalysisStatus
from app.ocr_client import get_ocr_client
from app.schemas import AnalysisCreated, AnalysisStatusResponse, OcrMoveOut
from app.storage import ALLOWED_CONTENT_TYPES, save_upload

router = APIRouter(prefix="/api/v1/analyses", tags=["analyses"])


async def run_ocr_job(analysis_id: uuid.UUID, image_path: str) -> None:
    db = SessionLocal()
    try:
        analysis = db.get(AnalysisRequest, analysis_id)
        if analysis is None:
            return
        try:
            moves = await get_ocr_client().analyze(Path(image_path))
        except Exception as exc:  # noqa: BLE001 - persisted as the job's error state
            analysis.status = AnalysisStatus.ERROR
            analysis.error_message = str(exc)
            db.commit()
            return

        for ply_index, move in enumerate(moves):
            db.add(
                AnalysisMove(
                    analysis_request_id=analysis_id,
                    ply_index=ply_index,
                    san=move.san,
                    confidence=move.confidence,
                )
            )

        detected = [m for m in moves if m.san.strip()]
        analysis.status = AnalysisStatus.DONE
        analysis.moves_detected_count = len(detected)
        analysis.moves_gap_count = len(moves) - len(detected)
        analysis.avg_confidence = sum(m.confidence for m in detected) / len(detected) if detected else None
        analysis.completed_at = datetime.now(UTC)
        db.commit()
    finally:
        db.close()


@router.post("", response_model=AnalysisCreated, status_code=201)
async def create_analysis(
    request: Request,
    background_tasks: BackgroundTasks,
    image: UploadFile,
    db: Session = Depends(get_db),
) -> AnalysisCreated:
    settings = get_settings()

    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Formato de imagen no soportado (usa PNG, JPG o WEBP)")

    content = await image.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"La imagen supera el límite de {settings.max_upload_mb}MB")

    analysis = AnalysisRequest(
        image_path="",
        image_filename=image.filename or "upload",
        image_content_type=image.content_type,
        image_size_bytes=len(content),
        client_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(analysis)
    db.flush()

    destination = save_upload(image, content, analysis.id)
    analysis.image_path = str(destination)
    db.commit()
    db.refresh(analysis)

    background_tasks.add_task(run_ocr_job, analysis.id, analysis.image_path)

    return AnalysisCreated(id=analysis.id, status=analysis.status)


@router.get("/{analysis_id}", response_model=AnalysisStatusResponse)
def get_analysis(analysis_id: uuid.UUID, db: Session = Depends(get_db)) -> AnalysisStatusResponse:
    analysis = db.get(AnalysisRequest, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")

    moves = None
    if analysis.status == AnalysisStatus.DONE:
        moves = [OcrMoveOut(san=m.san, confidence=m.confidence) for m in analysis.moves]

    return AnalysisStatusResponse(
        id=analysis.id,
        status=analysis.status,
        moves=moves,
        error=analysis.error_message,
        created_at=analysis.created_at,
        completed_at=analysis.completed_at,
    )


@router.get("/{analysis_id}/image")
def get_analysis_image(analysis_id: uuid.UUID, db: Session = Depends(get_db)) -> FileResponse:
    analysis = db.get(AnalysisRequest, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    return FileResponse(analysis.image_path, media_type=analysis.image_content_type)
