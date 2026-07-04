import asyncio
import mimetypes
from pathlib import Path
from typing import Protocol

import httpx

from app.config import get_settings
from app.schemas import OcrMoveOut

# Mirrors apps/web/src/app/core/services/chess-ocr.service.ts MOCK_OCR_MOVES,
# so the pipeline is testable end-to-end before a real OCR service exists.
MOCK_MOVES: list[OcrMoveOut] = [
    OcrMoveOut(san="e4", confidence=98),
    OcrMoveOut(san="e5", confidence=95),
    OcrMoveOut(san="Nf3", confidence=92),
    OcrMoveOut(san="Nc6", confidence=97),
    OcrMoveOut(san="Bb5", confidence=89),
    OcrMoveOut(san="a6", confidence=85),
    OcrMoveOut(san="", confidence=0),
    OcrMoveOut(san="Nf6", confidence=91),
    OcrMoveOut(san="O-O", confidence=72),
    OcrMoveOut(san="Be7", confidence=88),
    OcrMoveOut(san="Re1", confidence=65),
    OcrMoveOut(san="b5", confidence=82),
    OcrMoveOut(san="Bb3", confidence=91),
    OcrMoveOut(san="d6", confidence=93),
    OcrMoveOut(san="c3", confidence=87),
    OcrMoveOut(san="O-O", confidence=68),
    OcrMoveOut(san="h3", confidence=94),
    OcrMoveOut(san="Nb8", confidence=45),
    OcrMoveOut(san="d4", confidence=88),
    OcrMoveOut(san="Nbd7", confidence=52),
    OcrMoveOut(san="c4", confidence=90),
    OcrMoveOut(san="c6", confidence=86),
]


class OcrClient(Protocol):
    async def analyze(self, image_path: Path) -> list[OcrMoveOut]: ...


class MockOcrClient:
    async def analyze(self, image_path: Path) -> list[OcrMoveOut]:
        await asyncio.sleep(1.5)
        return list(MOCK_MOVES)


class HttpOcrClient:
    """Calls the real OCR service (apps/ocr)."""

    async def analyze(self, image_path: Path) -> list[OcrMoveOut]:
        settings = get_settings()
        # apps/ocr validates the multipart content-type against a PNG/JPEG/WEBP
        # allowlist; without an explicit type here httpx defaults to
        # application/octet-stream and every request gets rejected with 415.
        content_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
        async with httpx.AsyncClient(timeout=120) as client:
            with image_path.open("rb") as f:
                response = await client.post(
                    f"{settings.ocr_service_url}/analyze",
                    files={"image": (image_path.name, f, content_type)},
                )
            response.raise_for_status()
            return [OcrMoveOut(**move) for move in response.json()["moves"]]


def get_ocr_client() -> OcrClient:
    settings = get_settings()
    if settings.ocr_client == "http":
        return HttpOcrClient()
    return MockOcrClient()
