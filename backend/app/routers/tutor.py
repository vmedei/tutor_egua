import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Exercicio, ProgressoAluno, Sessao, Topico
from app.schemas.exercicio import ExercicioResponse
from app.schemas.progresso import ProgressoResponse

router = APIRouter()


@router.get("/proximo-exercicio/{aluno_id}", response_model=ExercicioResponse)
async def proximo_exercicio(aluno_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Seleciona o próximo exercício que o aluno ainda não acertou."""
    progressos = await db.scalars(
        select(ProgressoAluno).where(ProgressoAluno.aluno_id == aluno_id)
    )
    progresso_map = {p.topico_id: p for p in progressos}

    # IDs de exercícios já acertados pelo aluno
    acertados = select(Sessao.exercicio_id).where(
        Sessao.aluno_id == aluno_id,
        Sessao.correto == True,  # noqa: E712
    )

    topicos = await db.scalars(select(Topico).order_by(Topico.ordem))
    for topico in topicos:
        prog = progresso_map.get(topico.id)
        if prog is not None and prog.proficiencia >= 1.0:
            continue

        exercicio = await db.scalar(
            select(Exercicio)
            .where(
                Exercicio.topico_id == topico.id,
                Exercicio.id.not_in(acertados),
            )
            .order_by(Exercicio.id)
            .limit(1)
        )
        if exercicio:
            resp = ExercicioResponse.model_validate(exercicio)
            resp.topico_nome = topico.nome
            return resp

    raise HTTPException(status_code=404, detail="Todos os exercícios foram concluídos!")


@router.get("/progresso/{aluno_id}", response_model=list[ProgressoResponse])
async def progresso_aluno(aluno_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.scalars(
        select(ProgressoAluno).where(ProgressoAluno.aluno_id == aluno_id)
    )
    return list(result)
