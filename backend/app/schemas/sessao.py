import uuid
from pydantic import BaseModel


class SessaoCreate(BaseModel):
    aluno_id: uuid.UUID
    exercicio_id: uuid.UUID
    resposta: str
    dicas_usadas: int = 0


class SessaoResponse(BaseModel):
    id: uuid.UUID
    correto: bool
    delta_proficiencia: float
    feedback: str | None
    detalhe: str | None
    saidas_obtidas: list[str] = []

    model_config = {"from_attributes": True}


class ExecutarPayload(BaseModel):
    codigo: str
    casos_de_teste: list[dict] = []


class ExecutarResponse(BaseModel):
    saidas: list[dict]  # [{entrada, saida_esperada, saida_obtida, correto}]
    todos_corretos: bool
    erro: str | None = None
