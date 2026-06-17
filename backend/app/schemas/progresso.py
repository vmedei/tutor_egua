import uuid
from datetime import datetime
from pydantic import BaseModel


class ProgressoResponse(BaseModel):
    id: uuid.UUID
    aluno_id: uuid.UUID
    topico_id: uuid.UUID
    proficiencia: float
    tentativas: int
    acertos: int
    atualizado_em: datetime
    proxima_revisao: datetime | None

    model_config = {"from_attributes": True}


class TopicoProgressoItem(BaseModel):
    topico_id: uuid.UUID
    topico_codigo: str
    topico_nome: str
    proficiencia: float
    pct: int
    tentativas: int
    acertos: int


class ProgressoGlobalResponse(BaseModel):
    global_pct: float
    por_topico: list[TopicoProgressoItem]
