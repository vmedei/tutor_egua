import uuid
from pydantic import BaseModel


class ExercicioResponse(BaseModel):
    id: uuid.UUID
    topico_id: uuid.UUID
    topico_nome: str | None = None
    enunciado: str
    tipo: str
    nivel_bloom: int
    gabarito: dict | None = None
    casos_de_teste: list[dict] | None = None

    model_config = {"from_attributes": True}
