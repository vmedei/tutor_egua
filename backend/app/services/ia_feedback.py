"""
Gera feedback explicativo usando a API Groq.
Só é chamado quando o aluno erra.

"""
import logging
import uuid

from groq import AsyncGroq
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Exercicio, FeedbackIA

logger = logging.getLogger(__name__)

NIVEIS_DICA = ["leve", "moderada", "solucao"]

_client = AsyncGroq(api_key=settings.groq_api_key)


async def gerar_feedback(
    exercicio: Exercicio,
    resposta_aluno: str,
    dicas_usadas: int,
    sessao_id: uuid.UUID,
    db: AsyncSession,
) -> str | None:
    if not settings.groq_api_key:
        return None

    nivel = NIVEIS_DICA[min(dicas_usadas, len(NIVEIS_DICA) - 1)]

    instrucao_nivel = {
        "leve": "Dê apenas uma dica sutil, sem revelar a resposta.",
        "moderada": "Explique o conceito relacionado ao erro e dê um exemplo diferente.",
        "solucao": "Explique o erro cometido e mostre como resolver corretamente.",
    }[nivel]

    prompt = f"""Você é um tutor de programação especializado na linguagem Égua (linguagem em português).

Exercício: {exercicio.enunciado}
Tipo: {exercicio.tipo}
Resposta do aluno: {resposta_aluno}

{instrucao_nivel}

Responda em português, de forma encorajadora e didática. Máximo de 3 parágrafos."""

    try:
        response = await _client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
        )
        texto = response.choices[0].message.content
        tokens = response.usage.total_tokens if response.usage else 0

        feedback = FeedbackIA(
            sessao_id=sessao_id,
            mensagem=texto,
            nivel_dica=nivel,
            tokens_usados=tokens,
        )
        db.add(feedback)

        return texto
    except Exception as e:
        logger.warning("Falha ao gerar feedback IA: %s", e)
        return None
