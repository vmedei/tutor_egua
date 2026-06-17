from pydantic import BaseModel


class MensagemHistorico(BaseModel):
    papel: str  # "aluno" | "assistente"
    texto: str


class ChatPayload(BaseModel):
    mensagem: str
    historico: list[MensagemHistorico] = []
    contexto_topico: str | None = None
    contexto_exercicio: str | None = None


class ChatResponse(BaseModel):
    resposta: str
    tokens_usados: int = 0
