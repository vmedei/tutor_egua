"""
Seleção de exercícios baseada no progresso do aluno e no grafo de tópicos.
"""
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercicio, ProgressoAluno, Prerequisito, Sessao, Topico


LIMIAR_REMEDIACAO = 0.35
LIMIAR_ERROS_REPETIDOS = 2


async def _exercicios_disponiveis_do_topico(
    db: AsyncSession,
    aluno_id: uuid.UUID,
    topico_id: uuid.UUID,
) -> list[Exercicio]:
    tentados = select(Sessao.exercicio_id).where(
        Sessao.aluno_id == aluno_id,
    )

    resultado = await db.scalars(
        select(Exercicio)
        .where(
            Exercicio.topico_id == topico_id,
            Exercicio.id.not_in(tentados),
        )
        .order_by(Exercicio.nivel_bloom.asc(), Exercicio.id.asc())
    )
    return list(resultado)


async def _melhor_exercicio_do_topico(
    db: AsyncSession,
    aluno_id: uuid.UUID,
    topico_id: uuid.UUID,
) -> Exercicio | None:
    exercicios = await _exercicios_disponiveis_do_topico(db, aluno_id, topico_id)
    return exercicios[0] if exercicios else None


async def _topico_de_revisao(
    db: AsyncSession,
    aluno_id: uuid.UUID,
    topico: Topico,
    progresso_map: dict[uuid.UUID, ProgressoAluno],
) -> Topico | None:
    prerequisitos = list(
        await db.scalars(
            select(Prerequisito).where(Prerequisito.topico_id == topico.id)
        )
    )
    if not prerequisitos:
        return None

    topicos_ids = [rel.requer_id for rel in prerequisitos]
    topicos = list(
        await db.scalars(
            select(Topico).where(Topico.id.in_(topicos_ids)).order_by(Topico.ordem)
        )
    )

    candidato: Topico | None = None
    pior_progresso = 1.0
    for prereq in topicos:
        progresso = progresso_map.get(prereq.id)
        proficiencia = progresso.proficiencia if progresso else 0.0
        if proficiencia < pior_progresso:
            candidato = prereq
            pior_progresso = proficiencia

    return candidato


async def selecionar_exercicio(
    db: AsyncSession,
    aluno_id: uuid.UUID,
) -> tuple[Exercicio | None, Topico | None]:
    """
    Estratégia adaptativa:
    - mantém o aluno no tópico atual enquanto ainda houver exercícios adequados;
    - se houver erro repetido e baixa proficiência, volta para um pré-requisito;
    - sempre prefere o exercício mais simples disponível no tópico escolhido.
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

        erros_acumulados = max(0, (prog.tentativas if prog else 0) - (prog.acertos if prog else 0))
        if prog and prog.proficiencia <= LIMIAR_REMEDIACAO and erros_acumulados >= LIMIAR_ERROS_REPETIDOS:
            topico_revisao = await _topico_de_revisao(db, aluno_id, topico, progresso_map)
            if topico_revisao:
                exercicio_revisao = await _melhor_exercicio_do_topico(db, aluno_id, topico_revisao.id)
                if exercicio_revisao:
                    return exercicio_revisao, topico_revisao

        exercicio = await _melhor_exercicio_do_topico(db, aluno_id, topico.id)
        if exercicio:
            return exercicio, topico

    return None, None
