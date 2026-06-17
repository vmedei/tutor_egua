import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FeedbackIA(Base):
    __tablename__ = "feedback_ia"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sessao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessao.id"), nullable=False, unique=True
    )
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    # Níveis: "leve" | "moderada" | "solucao"
    nivel_dica: Mapped[str] = mapped_column(String(20), nullable=False)
    tokens_usados: Mapped[int] = mapped_column(Integer, default=0)
    gerado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    sessao = relationship("Sessao", back_populates="feedback")
