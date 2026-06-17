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
