import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Exercicio, Prerequisito, ProgressoAluno, Sessao, Topico
from app.schemas.exercicio import ExercicioResponse
from app.schemas.progresso import ProgressoGlobalResponse, ProgressoResponse, TopicoProgressoItem
from app.services.seletor import selecionar_exercicio

router = APIRouter()


@router.get("/proximo-exercicio/{aluno_id}", response_model=ExercicioResponse)
async def proximo_exercicio(aluno_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Seleciona o próximo exercício que o aluno ainda não acertou."""
    exercicio, topico = await selecionar_exercicio(db, aluno_id)
    if exercicio and topico:
        resp = ExercicioResponse.model_validate(exercicio)
        resp.topico_nome = topico.nome
        return resp

    raise HTTPException(status_code=404, detail="Todos os exercícios foram concluídos!")


@router.get("/exercicio-por-topico/{aluno_id}/{topico_codigo}", response_model=ExercicioResponse)
async def exercicio_por_topico(
    aluno_id: uuid.UUID,
    topico_codigo: str,
    db: AsyncSession = Depends(get_db),
):
    """Retorna o próximo exercício não tentado de um tópico específico."""
    topico = await db.scalar(select(Topico).where(Topico.codigo == topico_codigo))
    if not topico:
        raise HTTPException(status_code=404, detail="Tópico não encontrado")

    tentados = select(Sessao.exercicio_id).where(Sessao.aluno_id == aluno_id)
    exercicio = await db.scalar(
        select(Exercicio)
        .where(
            Exercicio.topico_id == topico.id,
            Exercicio.id.not_in(tentados),
        )
        .order_by(Exercicio.nivel_bloom.asc(), Exercicio.id.asc())
    )

    if not exercicio:
        raise HTTPException(status_code=404, detail="Todos os exercícios deste tópico foram concluídos")

    resp = ExercicioResponse.model_validate(exercicio)
    resp.topico_nome = topico.nome
    return resp


@router.get("/progresso/{aluno_id}", response_model=list[ProgressoResponse])
async def progresso_aluno(aluno_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.scalars(
        select(ProgressoAluno).where(ProgressoAluno.aluno_id == aluno_id)
    )
    return list(result)


@router.get("/progresso-global/{aluno_id}", response_model=ProgressoGlobalResponse)
async def progresso_global(aluno_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Retorna o progresso de todos os tópicos (inclusive não iniciados) e a média global."""
    topicos = list(await db.scalars(select(Topico).order_by(Topico.ordem)))

    prog_list = await db.scalars(
        select(ProgressoAluno).where(ProgressoAluno.aluno_id == aluno_id)
    )
    prog_map = {p.topico_id: p for p in prog_list}

    # Busca todas as arestas do DAG e monta mapa: topico_id → [codigo dos pré-requisitos]
    prereqs_rows = list(await db.scalars(select(Prerequisito)))
    topico_id_to_codigo = {t.id: t.codigo for t in topicos}
    prereqs_map: dict[uuid.UUID, list[str]] = {}
    for row in prereqs_rows:
        prereq_codigo = topico_id_to_codigo.get(row.requer_id)
        if prereq_codigo:
            prereqs_map.setdefault(row.topico_id, []).append(prereq_codigo)

    por_topico: list[TopicoProgressoItem] = []
    soma = 0.0
    for t in topicos:
        p = prog_map.get(t.id)
        prof = p.proficiencia if p else 0.0
        soma += prof
        por_topico.append(TopicoProgressoItem(
            topico_id=t.id,
            topico_codigo=t.codigo,
            topico_nome=t.nome,
            proficiencia=prof,
            pct=round(prof * 100),
            tentativas=p.tentativas if p else 0,
            acertos=p.acertos if p else 0,
            prerequisitos=prereqs_map.get(t.id, []),
        ))

    global_pct = round(soma / len(topicos) * 100, 1) if topicos else 0.0
    return ProgressoGlobalResponse(global_pct=global_pct, por_topico=por_topico)
