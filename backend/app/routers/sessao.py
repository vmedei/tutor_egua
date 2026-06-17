import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Sessao, Exercicio
from app.schemas.sessao import (
    SessaoCreate, SessaoResponse,
    ExecutarPayload, ExecutarResponse,
)
from app.services.modelo_aluno import atualizar_proficiencia
from app.services.avaliador import avaliar_resposta, _executar_egua
from app.services.ia_feedback import gerar_feedback

router = APIRouter()


@router.post("/executar", response_model=ExecutarResponse)
async def executar_codigo(payload: ExecutarPayload):
    """
    Executa o código Égua via CLI delegua para cada caso de teste
    sem registrar sessão (modo rascunho).
    """
    if not payload.codigo.strip():
        return ExecutarResponse(saidas=[], todos_corretos=False, erro="Código vazio.")

    saidas = []
    todos_corretos = True
    erro_geral = None

    if not payload.casos_de_teste:
        saida, erro = await _executar_egua(payload.codigo)
        if erro and not saida:
            return ExecutarResponse(saidas=[], todos_corretos=False, erro=erro)
        saidas.append({"entrada": "", "saida_esperada": "", "saida_obtida": saida, "correto": True})
    else:
        for caso in payload.casos_de_teste:
            entrada = caso.get("entrada", "")
            saida_esperada = caso.get("saida_esperada", "").strip()
            saida, erro = await _executar_egua(payload.codigo, entrada)

            if erro and not saida:
                erro_geral = erro
                todos_corretos = False
                saidas.append({
                    "entrada": entrada,
                    "saida_esperada": saida_esperada,
                    "saida_obtida": "",
                    "correto": False,
                })
                break

            caso_correto = saida == saida_esperada
            if not caso_correto:
                todos_corretos = False
            saidas.append({
                "entrada": entrada,
                "saida_esperada": saida_esperada,
                "saida_obtida": saida,
                "correto": caso_correto,
            })

    return ExecutarResponse(saidas=saidas, todos_corretos=todos_corretos, erro=erro_geral)


@router.post("/", response_model=SessaoResponse)
async def submeter_resposta(
    payload: SessaoCreate,
    db: AsyncSession = Depends(get_db),
):
    exercicio = await db.get(Exercicio, payload.exercicio_id)
    if not exercicio:
        raise HTTPException(status_code=404, detail="Exercício não encontrado")

    # 1. Avaliar a resposta
    resultado = await avaliar_resposta(exercicio, payload.resposta)

    # 2. Registrar sessão
    sessao = Sessao(
        aluno_id=payload.aluno_id,
        exercicio_id=payload.exercicio_id,
        codigo_submetido=payload.resposta,
        correto=resultado.correto,
        dicas_usadas=payload.dicas_usadas,
    )
    db.add(sessao)
    await db.flush()

    # 3. Atualizar modelo do aluno
    delta = await atualizar_proficiencia(
        db=db,
        aluno_id=payload.aluno_id,
        topico_id=exercicio.topico_id,
        correto=resultado.correto,
        dicas_usadas=payload.dicas_usadas,
    )
    sessao.delta_proficiencia = delta

    # 4. Feedback IA quando errou
    feedback_msg = None
    if not resultado.correto:
        feedback_msg = await gerar_feedback(
            exercicio=exercicio,
            resposta_aluno=payload.resposta,
            dicas_usadas=payload.dicas_usadas,
            sessao_id=sessao.id,
            db=db,
        )

    return SessaoResponse(
        id=sessao.id,
        correto=resultado.correto,
        delta_proficiencia=delta,
        feedback=feedback_msg,
        detalhe=resultado.detalhe,
        saidas_obtidas=resultado.saidas_obtidas,
    )
