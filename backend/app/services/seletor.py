"""
Seleção de exercícios baseada no progresso do aluno e no grafo de tópicos.
"""
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercicio, ProgressoAluno, Topico, Prerequisito


async def selecionar_exercicio(
    db: AsyncSession,
    aluno_id: uuid.UUID,
) -> Exercicio | None:
    """
    Estratégia: pega o tópico com menor proficiência entre os desbloqueados
    e seleciona um exercício ainda não dominado.
    """
    progressos = await db.scalars(
        select(ProgressoAluno).where(ProgressoAluno.aluno_id == aluno_id)
    )
    progresso_map = {p.topico_id: p for p in progressos}

    topicos = await db.scalars(select(Topico).order_by(Topico.ordem))

    for topico in topicos:
        prog = progresso_map.get(topico.id)
        if prog is not None and prog.proficiencia >= 1.0:
            continue
        exercicio = await db.scalar(
            select(Exercicio)
            .where(Exercicio.topico_id == topico.id)
            .limit(1)
        )
        if exercicio:
            return exercicio

    return None
