import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AnalysisStatus(StrEnum):
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"


class AnalysisRequest(Base):
    __tablename__ = "analysis_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus, native_enum=False, length=20), default=AnalysisStatus.PROCESSING
    )

    image_path: Mapped[str] = mapped_column(String)
    image_filename: Mapped[str] = mapped_column(String)
    image_content_type: Mapped[str] = mapped_column(String)
    image_size_bytes: Mapped[int] = mapped_column(Integer)

    client_ip: Mapped[str | None] = mapped_column(String, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    error_message: Mapped[str | None] = mapped_column(String, nullable=True)

    moves_detected_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    moves_gap_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    moves: Mapped[list["AnalysisMove"]] = relationship(
        back_populates="request", order_by="AnalysisMove.ply_index", cascade="all, delete-orphan"
    )


class AnalysisMove(Base):
    __tablename__ = "analysis_moves"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    analysis_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("analysis_requests.id"))
    ply_index: Mapped[int] = mapped_column(Integer)
    san: Mapped[str] = mapped_column(String)
    confidence: Mapped[int] = mapped_column(Integer)

    request: Mapped[AnalysisRequest] = relationship(back_populates="moves")
