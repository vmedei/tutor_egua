import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class AlunoCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str


class AlunoResponse(BaseModel):
    id: uuid.UUID
    nome: str
    email: str
    criado_em: datetime

    model_config = {"from_attributes": True}


class AlunoLogin(BaseModel):
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    aluno_id: str
    nome: str
