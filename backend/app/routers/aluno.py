from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext
import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Aluno, FeedbackIA, ProgressoAluno, Sessao
from app.schemas.aluno import AlunoCreate, AlunoLogin, AlunoResponse, TokenResponse

router = APIRouter()
_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _criar_token(aluno_id: str) -> str:
    expira = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {"sub": aluno_id, "exp": expira},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


@router.post("/registrar", response_model=AlunoResponse, status_code=201)
async def registrar(payload: AlunoCreate, db: AsyncSession = Depends(get_db)):
    existente = await db.scalar(select(Aluno).where(Aluno.email == payload.email))
    if existente:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    aluno = Aluno(
        nome=payload.nome,
        email=payload.email,
        senha_hash=_pwd_ctx.hash(payload.senha),
    )
    db.add(aluno)
    await db.flush()
    return aluno


@router.post("/login", response_model=TokenResponse)
async def login(payload: AlunoLogin, db: AsyncSession = Depends(get_db)):
    aluno = await db.scalar(select(Aluno).where(Aluno.email == payload.email))
    if not aluno or not _pwd_ctx.verify(payload.senha, aluno.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

    aluno.ultimo_acesso = datetime.now(timezone.utc)
    return TokenResponse(access_token=_criar_token(str(aluno.id)), aluno_id=str(aluno.id), nome=aluno.nome)


@router.get("/me/{aluno_id}", response_model=AlunoResponse)
async def buscar_aluno(aluno_id: str, db: AsyncSession = Depends(get_db)):
    aluno = await db.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return aluno


@router.post("/{aluno_id}/resetar", status_code=200)
async def resetar_progresso(aluno_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Apaga todo o progresso, sessões e feedbacks do aluno, zerando o histórico."""
    aluno = await db.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # 1. FeedbackIA (FK → Sessao) deve ser deletado antes das sessões
    sessoes_ids = select(Sessao.id).where(Sessao.aluno_id == aluno_id)
    await db.execute(delete(FeedbackIA).where(FeedbackIA.sessao_id.in_(sessoes_ids)))

    # 2. Sessões
    await db.execute(delete(Sessao).where(Sessao.aluno_id == aluno_id))

    # 3. Progresso por tópico
    await db.execute(delete(ProgressoAluno).where(ProgressoAluno.aluno_id == aluno_id))

    return {"ok": True, "mensagem": "Progresso resetado com sucesso."}
