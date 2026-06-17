import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Exercicio
from app.schemas.exercicio import ExercicioResponse

router = APIRouter()


@router.get("/{exercicio_id}", response_model=ExercicioResponse)
async def buscar_exercicio(exercicio_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    exercicio = await db.get(Exercicio, exercicio_id)
    if not exercicio:
        raise HTTPException(status_code=404, detail="Exercício não encontrado")
    # Ocultar gabarito na resposta
    exercicio_dict = {
        "id": exercicio.id,
        "topico_id": exercicio.topico_id,
        "enunciado": exercicio.enunciado,
        "tipo": exercicio.tipo,
        "nivel_bloom": exercicio.nivel_bloom,
    }
    if exercicio.tipo == "multipla_escolha":
        exercicio_dict["gabarito"] = {"opcoes": exercicio.gabarito.get("opcoes", [])}
    return ExercicioResponse(**exercicio_dict)


@router.get("/topico/{topico_id}", response_model=list[ExercicioResponse])
async def listar_por_topico(topico_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.scalars(
        select(Exercicio).where(Exercicio.topico_id == topico_id)
    )
    return list(result)
