"""
Modelo híbrido de atualização de proficiência:
  - Acerto:          +0.15 (ajustado por dicas)
  - Erro:            -0.08
  - Dica solicitada:  bônus reduzido (+0.07 por dica em vez de +0.15)
  - Decaimento:      -0.05 por semana sem revisão (calculado na leitura)
  - Desbloqueio:     +0.10 ao tópico seguinte quando proficiência >= 0.70
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ProgressoAluno, Topico, Prerequisito

LIMIAR_DESBLOQUEIO = 0.70
GANHO_ACERTO = 0.15
GANHO_COM_DICA = 0.07
PERDA_ERRO = 0.08
BONUS_DESBLOQUEIO = 0.10
DECAIMENTO_SEMANAL = 0.05
INTERVALO_REVISAO_DIAS = 7


async def _get_ou_criar_progresso(
    db: AsyncSession, aluno_id: uuid.UUID, topico_id: uuid.UUID
) -> ProgressoAluno:
    progresso = await db.scalar(
        select(ProgressoAluno).where(
            ProgressoAluno.aluno_id == aluno_id,
            ProgressoAluno.topico_id == topico_id,
        )
    )
    if not progresso:
        progresso = ProgressoAluno(aluno_id=aluno_id, topico_id=topico_id)
        db.add(progresso)
        await db.flush()
    return progresso


def _aplicar_decaimento(progresso: ProgressoAluno) -> float:
    """Reduz proficiência baseado no tempo sem revisão."""
    if not progresso.proxima_revisao:
        return progresso.proficiencia
    agora = datetime.now(timezone.utc)
    if agora < progresso.proxima_revisao:
        return progresso.proficiencia
    semanas_atrasadas = (agora - progresso.proxima_revisao).days // 7
    decaimento = semanas_atrasadas * DECAIMENTO_SEMANAL
    return max(0.0, progresso.proficiencia - decaimento)


async def atualizar_proficiencia(
    db: AsyncSession,
    aluno_id: uuid.UUID,
    topico_id: uuid.UUID,
    correto: bool,
    dicas_usadas: int = 0,
) -> float:
    progresso = await _get_ou_criar_progresso(db, aluno_id, topico_id)

    # Aplicar decaimento acumulado antes de atualizar
    progresso.proficiencia = _aplicar_decaimento(progresso)
    progresso.tentativas += 1

    if correto:
        delta = GANHO_COM_DICA if dicas_usadas > 0 else GANHO_ACERTO
        progresso.acertos += 1
    else:
        delta = -PERDA_ERRO

    progresso.proficiencia = max(0.0, min(1.0, progresso.proficiencia + delta))

    progresso.proxima_revisao = datetime.now(timezone.utc) + timedelta(
        days=INTERVALO_REVISAO_DIAS
    )

    if progresso.proficiencia >= LIMIAR_DESBLOQUEIO:
        await _desbloquear_sucessores(db, aluno_id, topico_id)

    return delta


async def _desbloquear_sucessores(
    db: AsyncSession, aluno_id: uuid.UUID, topico_id: uuid.UUID
):
    """Aplica bônus inicial nos tópicos que dependem deste."""
    sucessores = await db.scalars(
        select(Prerequisito).where(Prerequisito.requer_id == topico_id)
    )
    for prereq in sucessores:
        prog_suc = await _get_ou_criar_progresso(db, aluno_id, prereq.topico_id)
        if prog_suc.proficiencia == 0.0:
            prog_suc.proficiencia = BONUS_DESBLOQUEIO
