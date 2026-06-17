import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Sessao(Base):
    __tablename__ = "sessao"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    aluno_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aluno.id"), nullable=False
    )
    exercicio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercicio.id"), nullable=False
    )
    codigo_submetido: Mapped[str | None] = mapped_column(Text, nullable=True)
    correto: Mapped[bool] = mapped_column(Boolean, default=False)
    dicas_usadas: Mapped[int] = mapped_column(Integer, default=0)
    delta_proficiencia: Mapped[float] = mapped_column(Float, default=0.0)
    realizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    aluno = relationship("Aluno", back_populates="sessoes")
    exercicio = relationship("Exercicio", back_populates="sessoes")
    feedback = relationship("FeedbackIA", back_populates="sessao", uselist=False)
