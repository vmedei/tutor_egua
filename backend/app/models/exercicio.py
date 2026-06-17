import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Exercicio(Base):
    __tablename__ = "exercicio"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    topico_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topico.id"), nullable=False
    )
    enunciado: Mapped[str] = mapped_column(Text, nullable=False)
    # Tipos: "multipla_escolha" | "completar_codigo" | "implementacao_livre"
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    # Nível Bloom: 1=Lembrar, 2=Aplicar, 3=Criar
    nivel_bloom: Mapped[int] = mapped_column(Integer, default=1)
    gabarito: Mapped[dict] = mapped_column(JSONB, nullable=False)
    casos_de_teste: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    topico = relationship("Topico", back_populates="exercicios")
    sessoes = relationship("Sessao", back_populates="exercicio")
