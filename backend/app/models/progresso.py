import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProgressoAluno(Base):
    __tablename__ = "progresso_aluno"
    __table_args__ = (UniqueConstraint("aluno_id", "topico_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    aluno_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aluno.id"), nullable=False
    )
    topico_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topico.id"), nullable=False
    )
    proficiencia: Mapped[float] = mapped_column(Float, default=0.0)
    tentativas: Mapped[int] = mapped_column(Integer, default=0)
    acertos: Mapped[int] = mapped_column(Integer, default=0)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    proxima_revisao: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    aluno = relationship("Aluno", back_populates="progressos")
    topico = relationship("Topico", back_populates="progressos")
