from fastapi import APIRouter

from app.schemas.chat import ChatPayload, ChatResponse
from app.services.ia_chat import responder

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat(payload: ChatPayload):
    texto, tokens = await responder(
        mensagem=payload.mensagem,
        historico=payload.historico,
        contexto_topico=payload.contexto_topico,
        contexto_exercicio=payload.contexto_exercicio,
    )
    return ChatResponse(resposta=texto, tokens_usados=tokens)
