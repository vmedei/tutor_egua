"""
Gera feedback explicativo usando a API do Google Gemini (gratuita).
Só é chamado quando o aluno erra.

Limites do plano gratuito (Gemini 2.0 Flash):
  - 15 requisições/minuto
  - 1.000.000 tokens/dia
  - 1.500 requisições/dia
"""
import logging
import uuid

import google.generativeai as genai
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Exercicio, FeedbackIA

logger = logging.getLogger(__name__)

NIVEIS_DICA = ["leve", "moderada", "solucao"]

genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=genai.GenerationConfig(max_output_tokens=500),
)


async def gerar_feedback(
    exercicio: Exercicio,
    resposta_aluno: str,
    dicas_usadas: int,
    sessao_id: uuid.UUID,
    db: AsyncSession,
) -> str | None:
    if not settings.gemini_api_key:
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
        resposta = await _model.generate_content_async(prompt)
        texto = resposta.text
        tokens = resposta.usage_metadata.total_token_count if resposta.usage_metadata else 0

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
