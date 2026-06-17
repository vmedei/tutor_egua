# TutorÉgua — Guia de Início do Projeto

> Sistema Tutor Inteligente para aprendizado de programação com a linguagem Égua.
> Stack: **FastAPI + PostgreSQL + Redis + React + Vite + TypeScript**

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Estrutura de pastas](#2-estrutura-de-pastas)
3. [Configuração do backend](#3-configuração-do-backend)
4. [Modelos SQLAlchemy (banco de dados)](#4-modelos-sqlalchemy-banco-de-dados)
5. [Migrations com Alembic](#5-migrations-com-alembic)
6. [Seed do banco (tópicos e exercícios)](#6-seed-do-banco-tópicos-e-exercícios)
7. [Routers FastAPI](#7-routers-fastapi)
8. [Lógica do modelo do aluno](#8-lógica-do-modelo-do-aluno)
9. [Configuração do frontend](#9-configuração-do-frontend)
10. [Docker Compose](#10-docker-compose)
11. [Variáveis de ambiente](#11-variáveis-de-ambiente)
12. [Rodando o projeto](#12-rodando-o-projeto)
13. [Extensões recomendadas para VS Code](#13-extensões-recomendadas-para-vs-code)

---

## 1. Pré-requisitos

Instale as seguintes ferramentas antes de começar:

| Ferramenta | Versão mínima | Link |
|---|---|---|
| Python | 3.11+ | https://python.org |
| Node.js | 20+ | https://nodejs.org |
| Docker Desktop | qualquer | https://docker.com |
| Git | qualquer | https://git-scm.com |

Verifique as instalações:

```bash
python --version   # Python 3.11+
node --version     # v20+
docker --version   # Docker 24+
```

---

## 2. Estrutura de pastas

Crie a estrutura abaixo. Cada pasta tem um propósito claro no projeto:

```
tutor-egua/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # Entry point FastAPI
│   │   ├── config.py             # Variáveis de ambiente
│   │   ├── database.py           # Conexão SQLAlchemy
│   │   │
│   │   ├── models/               # Tabelas do banco (ORM)
│   │   │   ├── __init__.py
│   │   │   ├── aluno.py
│   │   │   ├── topico.py
│   │   │   ├── exercicio.py
│   │   │   ├── progresso.py
│   │   │   ├── sessao.py
│   │   │   └── feedback.py
│   │   │
│   │   ├── schemas/              # Validação Pydantic (request/response)
│   │   │   ├── __init__.py
│   │   │   ├── aluno.py
│   │   │   ├── exercicio.py
│   │   │   ├── sessao.py
│   │   │   └── progresso.py
│   │   │
│   │   ├── routers/              # Endpoints da API
│   │   │   ├── __init__.py
│   │   │   ├── aluno.py
│   │   │   ├── exercicio.py
│   │   │   ├── sessao.py
│   │   │   └── tutor.py
│   │   │
│   │   ├── services/             # Lógica de negócio
│   │   │   ├── __init__.py
│   │   │   ├── modelo_aluno.py   # BKT + decaimento
│   │   │   ├── seletor.py        # Seleção de exercícios
│   │   │   ├── avaliador.py      # Execução de código Égua
│   │   │   └── ia_feedback.py    # Integração Claude API
│   │   │
│   │   └── seed/
│   │       ├── topicos.yaml      # 8 tópicos do grafo
│   │       └── exercicios.yaml   # Exercícios iniciais
│   │
│   ├── alembic/                  # Migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Exercicio.tsx
│   │   ├── components/
│   │   │   ├── GrafoProgresso.tsx
│   │   │   ├── EditorEgua.tsx
│   │   │   └── PainelFeedback.tsx
│   │   └── api/
│   │       └── client.ts         # Axios / fetch wrapper
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

Para criar a estrutura de uma vez só, rode no terminal:

```bash
mkdir -p tutor-egua/backend/app/{models,schemas,routers,services,seed}
mkdir -p tutor-egua/backend/alembic/versions
mkdir -p tutor-egua/frontend/src/{pages,components,api}
touch tutor-egua/backend/app/__init__.py
touch tutor-egua/backend/app/models/__init__.py
touch tutor-egua/backend/app/schemas/__init__.py
touch tutor-egua/backend/app/routers/__init__.py
touch tutor-egua/backend/app/services/__init__.py
cd tutor-egua
```

---

## 3. Configuração do backend

### 3.1 Ambiente virtual e dependências

```bash
cd backend
python -m venv .venv

# Ativar no Linux/macOS:
source .venv/bin/activate

# Ativar no Windows (PowerShell):
.venv\Scripts\Activate.ps1
```

Crie o arquivo `backend/requirements.txt`:

```txt
# Web framework
fastapi==0.115.0
uvicorn[standard]==0.30.6

# Banco de dados
sqlalchemy==2.0.35
alembic==1.13.3
asyncpg==0.29.0          # driver PostgreSQL assíncrono
psycopg2-binary==2.9.9   # driver síncrono (Alembic usa este)

# Validação
pydantic==2.9.2
pydantic-settings==2.5.2

# Cache e filas
redis==5.1.1
celery==5.4.0

# IA
anthropic==0.34.2

# Grafo de conhecimento
networkx==3.3

# Utilitários
python-jose[cryptography]==3.3.0   # JWT
passlib[bcrypt]==1.7.4             # hash de senha
python-multipart==0.0.12
pyyaml==6.0.2                      # leitura do seed YAML
httpx==0.27.2                      # cliente HTTP para testes
```

Instale:

```bash
pip install -r requirements.txt
```

### 3.2 `app/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Banco
    database_url: str
    database_url_async: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8 horas

    # Anthropic
    anthropic_api_key: str = ""

    # App
    debug: bool = False


settings = Settings()
```

### 3.3 `app/database.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


from app.config import settings

engine = create_async_engine(settings.database_url_async, echo=settings.debug)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### 3.4 `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import aluno, exercicio, sessao, tutor

app = FastAPI(
    title="TutorÉgua API",
    description="Sistema Tutor Inteligente para a linguagem Égua",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(aluno.router, prefix="/aluno", tags=["aluno"])
app.include_router(exercicio.router, prefix="/exercicio", tags=["exercicio"])
app.include_router(sessao.router, prefix="/sessao", tags=["sessao"])
app.include_router(tutor.router, prefix="/tutor", tags=["tutor"])


@app.get("/health")
async def health():
    return {"status": "ok", "app": "TutorÉgua"}
```

---

## 4. Modelos SQLAlchemy (banco de dados)

### `app/models/aluno.py`

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Aluno(Base):
    __tablename__ = "aluno"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ultimo_acesso: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    progressos = relationship("ProgressoAluno", back_populates="aluno")
    sessoes = relationship("Sessao", back_populates="aluno")
```

### `app/models/topico.py`

```python
import uuid

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Topico(Base):
    __tablename__ = "topico"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=True)
    nivel: Mapped[int] = mapped_column(Integer, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False)

    exercicios = relationship("Exercicio", back_populates="topico")
    progressos = relationship("ProgressoAluno", back_populates="topico")


class Prerequisito(Base):
    """Arestas do grafo DAG de tópicos."""
    __tablename__ = "prerequisito"

    topico_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
    )
    requer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
    )
```

### `app/models/exercicio.py`

```python
import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Exercicio(Base):
    __tablename__ = "exercicio"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    topico_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topico.id"), nullable=False
    )
    enunciado: Mapped[str] = mapped_column(Text, nullable=False)
    # Tipos: "multipla_escolha" | "completar_codigo" | "implementacao_livre"
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    # Nível Bloom: 1=Lembrar, 2=Aplicar, 3=Criar
    nivel_bloom: Mapped[int] = mapped_column(Integer, default=1)
    gabarito: Mapped[dict] = mapped_column(JSONB, nullable=False)
    casos_de_teste: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    topico = relationship("Topico", back_populates="exercicios")
    sessoes = relationship("Sessao", back_populates="exercicio")
```

### `app/models/progresso.py`

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProgressoAluno(Base):
    __tablename__ = "progresso_aluno"
    __table_args__ = (UniqueConstraint("aluno_id", "topico_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    aluno_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aluno.id"), nullable=False
    )
    topico_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topico.id"), nullable=False
    )
    proficiencia: Mapped[float] = mapped_column(Float, default=0.0)
    tentativas: Mapped[int] = mapped_column(Integer, default=0)
    acertos: Mapped[int] = mapped_column(Integer, default=0)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    proxima_revisao: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    aluno = relationship("Aluno", back_populates="progressos")
    topico = relationship("Topico", back_populates="progressos")
```

### `app/models/sessao.py`

```python
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Sessao(Base):
    __tablename__ = "sessao"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    aluno_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aluno.id"), nullable=False
    )
    exercicio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercicio.id"), nullable=False
    )
    codigo_submetido: Mapped[str | None] = mapped_column(Text, nullable=True)
    correto: Mapped[bool] = mapped_column(Boolean, default=False)
    dicas_usadas: Mapped[int] = mapped_column(Integer, default=0)
    delta_proficiencia: Mapped[float] = mapped_column(Float, default=0.0)
    realizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    aluno = relationship("Aluno", back_populates="sessoes")
    exercicio = relationship("Exercicio", back_populates="sessoes")
    feedback = relationship("FeedbackIA", back_populates="sessao", uselist=False)
```

### `app/models/feedback.py`

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FeedbackIA(Base):
    __tablename__ = "feedback_ia"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sessao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessao.id"), nullable=False, unique=True
    )
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    # Níveis: "leve" | "moderada" | "solucao"
    nivel_dica: Mapped[str] = mapped_column(String(20), nullable=False)
    tokens_usados: Mapped[int] = mapped_column(Integer, default=0)
    gerado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    sessao = relationship("Sessao", back_populates="feedback")
```

### `app/models/__init__.py`

```python
# Importar todos os modelos aqui para o Alembic detectar automaticamente
from app.models.aluno import Aluno
from app.models.exercicio import Exercicio
from app.models.feedback import FeedbackIA
from app.models.progresso import ProgressoAluno
from app.models.sessao import Sessao
from app.models.topico import Prerequisito, Topico

__all__ = [
    "Aluno",
    "Topico",
    "Prerequisito",
    "Exercicio",
    "ProgressoAluno",
    "Sessao",
    "FeedbackIA",
]
```

---

## 5. Migrations com Alembic

### 5.1 Inicializar o Alembic

```bash
cd backend
alembic init alembic
```

### 5.2 Editar `alembic/env.py`

Substitua o início do arquivo pelo trecho abaixo (mantenha o restante intacto):

```python
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Adicionar backend/ ao path para importar os modelos
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import Base
from app.models import *  # noqa: garante que todos os modelos sejam registrados
from app.config import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
```

### 5.3 Criar e aplicar a migration inicial

```bash
# Criar a migration (detecta os modelos automaticamente)
alembic revision --autogenerate -m "initial schema"

# Aplicar ao banco
alembic upgrade head
```

Para ver o histórico de migrations:

```bash
alembic history --verbose
```

---

## 6. Seed do banco (tópicos e exercícios)

### `app/seed/topicos.yaml`

```yaml
topicos:
  - codigo: introducao
    nome: "Introdução à Égua"
    descricao: "IDEgua, escreva(), comentários básicos"
    nivel: 1
    ordem: 1
    prerequisitos: []

  - codigo: variaveis
    nome: "Variáveis e Tipos"
    descricao: "var, tipos primitivos, atribuição"
    nivel: 1
    ordem: 2
    prerequisitos: [introducao]

  - codigo: operadores
    nome: "Operadores"
    descricao: "Aritméticos, lógicos, relacionais"
    nivel: 1
    ordem: 3
    prerequisitos: [variaveis]

  - codigo: condicionais
    nome: "Condicionais"
    descricao: "se/senão, escolha/caso"
    nivel: 2
    ordem: 4
    prerequisitos: [operadores]

  - codigo: lacos
    nome: "Laços de Repetição"
    descricao: "enquanto, para"
    nivel: 2
    ordem: 5
    prerequisitos: [condicionais]

  - codigo: funcoes
    nome: "Funções"
    descricao: "funcao, retorne, parâmetros"
    nivel: 3
    ordem: 6
    prerequisitos: [condicionais, lacos]

  - codigo: listas
    nome: "Listas e Vetores"
    descricao: "[], acesso por índice, tamanho()"
    nivel: 3
    ordem: 7
    prerequisitos: [lacos]

  - codigo: classes
    nome: "Classes e Objetos"
    descricao: "classe, isto, métodos, herança"
    nivel: 4
    ordem: 8
    prerequisitos: [funcoes, listas]
```

### `app/seed/exercicios.yaml`

```yaml
exercicios:
  - topico: introducao
    enunciado: "Qual comando é usado para exibir texto na tela em Égua?"
    tipo: multipla_escolha
    nivel_bloom: 1
    gabarito:
      opcoes:
        - "imprimir()"
        - "escreva()"
        - "print()"
        - "mostrar()"
      correta: 1

  - topico: variaveis
    enunciado: |
      Complete o código abaixo para declarar uma variável chamada
      'idade' com o valor 18 em Égua:
      
      ___ idade = 18
    tipo: completar_codigo
    nivel_bloom: 1
    gabarito:
      resposta: "var"

  - topico: condicionais
    enunciado: |
      Escreva um programa em Égua que leia um número e exiba
      "positivo", "negativo" ou "zero" conforme o valor.
    tipo: implementacao_livre
    nivel_bloom: 2
    gabarito:
      descricao: "Deve usar se/senão e cobrir os três casos"
    casos_de_teste:
      - entrada: "5"
        saida_esperada: "positivo"
      - entrada: "-3"
        saida_esperada: "negativo"
      - entrada: "0"
        saida_esperada: "zero"
```

### Script de seed `app/seed/run_seed.py`

```python
"""
Popula o banco com os tópicos e exercícios iniciais.
Execute com: python -m app.seed.run_seed
"""
import asyncio
import yaml
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, engine, Base
from app.models import Topico, Prerequisito, Exercicio


SEED_DIR = Path(__file__).parent


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await seed_topicos(db)
        await seed_exercicios(db)
        await db.commit()
    print("Seed concluído com sucesso!")


async def seed_topicos(db: AsyncSession):
    data = yaml.safe_load((SEED_DIR / "topicos.yaml").read_text())
    topico_map: dict[str, Topico] = {}

    for t in data["topicos"]:
        existente = await db.scalar(
            select(Topico).where(Topico.codigo == t["codigo"])
        )
        if existente:
            topico_map[t["codigo"]] = existente
            continue

        topico = Topico(
            codigo=t["codigo"],
            nome=t["nome"],
            descricao=t.get("descricao"),
            nivel=t["nivel"],
            ordem=t["ordem"],
        )
        db.add(topico)
        await db.flush()
        topico_map[t["codigo"]] = topico

    await db.flush()

    for t in data["topicos"]:
        topico = topico_map[t["codigo"]]
        for prereq_codigo in t.get("prerequisitos", []):
            prereq = topico_map[prereq_codigo]
            db.add(Prerequisito(topico_id=topico.id, requer_id=prereq.id))

    print(f"  {len(topico_map)} tópicos inseridos.")


async def seed_exercicios(db: AsyncSession):
    data = yaml.safe_load((SEED_DIR / "exercicios.yaml").read_text())
    count = 0

    for e in data["exercicios"]:
        topico = await db.scalar(
            select(Topico).where(Topico.codigo == e["topico"])
        )
        if not topico:
            print(f"  Tópico '{e['topico']}' não encontrado, pulando exercício.")
            continue

        exercicio = Exercicio(
            topico_id=topico.id,
            enunciado=e["enunciado"],
            tipo=e["tipo"],
            nivel_bloom=e.get("nivel_bloom", 1),
            gabarito=e["gabarito"],
            casos_de_teste=e.get("casos_de_teste"),
        )
        db.add(exercicio)
        count += 1

    print(f"  {count} exercícios inseridos.")


if __name__ == "__main__":
    asyncio.run(seed())
```

Executar:

```bash
cd backend
python -m app.seed.run_seed
```

---

## 7. Routers FastAPI

### `app/routers/sessao.py` (exemplo completo)

Este router ilustra o fluxo principal do ITS: o aluno submete uma resposta, o sistema avalia, atualiza o modelo e retorna feedback.

```python
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Sessao, Exercicio, ProgressoAluno
from app.schemas.sessao import SessaoCreate, SessaoResponse
from app.services.modelo_aluno import atualizar_proficiencia
from app.services.avaliador import avaliar_resposta
from app.services.ia_feedback import gerar_feedback

router = APIRouter()


@router.post("/", response_model=SessaoResponse)
async def submeter_resposta(
    payload: SessaoCreate,
    db: AsyncSession = Depends(get_db),
):
    exercicio = await db.get(Exercicio, payload.exercicio_id)
    if not exercicio:
        raise HTTPException(status_code=404, detail="Exercício não encontrado")

    # 1. Avaliar a resposta do aluno
    correto, detalhe = await avaliar_resposta(exercicio, payload.resposta)

    # 2. Criar registro da sessão
    sessao = Sessao(
        aluno_id=payload.aluno_id,
        exercicio_id=payload.exercicio_id,
        codigo_submetido=payload.resposta,
        correto=correto,
        dicas_usadas=payload.dicas_usadas,
    )
    db.add(sessao)
    await db.flush()  # gera o ID

    # 3. Atualizar o modelo do aluno
    delta = await atualizar_proficiencia(
        db=db,
        aluno_id=payload.aluno_id,
        topico_id=exercicio.topico_id,
        correto=correto,
        dicas_usadas=payload.dicas_usadas,
    )
    sessao.delta_proficiencia = delta

    # 4. Gerar feedback com IA se o aluno errou
    feedback_msg = None
    if not correto:
        feedback_msg = await gerar_feedback(
            exercicio=exercicio,
            resposta_aluno=payload.resposta,
            dicas_usadas=payload.dicas_usadas,
            sessao_id=sessao.id,
            db=db,
        )

    return SessaoResponse(
        id=sessao.id,
        correto=correto,
        delta_proficiencia=delta,
        feedback=feedback_msg,
        detalhe=detalhe,
    )
```

### `app/schemas/sessao.py`

```python
import uuid
from pydantic import BaseModel


class SessaoCreate(BaseModel):
    aluno_id: uuid.UUID
    exercicio_id: uuid.UUID
    resposta: str
    dicas_usadas: int = 0


class SessaoResponse(BaseModel):
    id: uuid.UUID
    correto: bool
    delta_proficiencia: float
    feedback: str | None
    detalhe: str | None

    model_config = {"from_attributes": True}
```

---

## 8. Lógica do modelo do aluno

### `app/services/modelo_aluno.py`

```python
"""
Implementação do modelo híbrido de atualização de proficiência:
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

    # Calcular delta
    if correto:
        if dicas_usadas > 0:
            delta = GANHO_COM_DICA
        else:
            delta = GANHO_ACERTO
        progresso.acertos += 1
    else:
        delta = -PERDA_ERRO

    progresso.proficiencia = max(0.0, min(1.0, progresso.proficiencia + delta))

    # Agendar próxima revisão
    progresso.proxima_revisao = datetime.now(timezone.utc) + timedelta(
        days=INTERVALO_REVISAO_DIAS
    )

    # Verificar desbloqueio de tópicos sucessores
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
```

### `app/services/ia_feedback.py`

```python
"""
Gera feedback explicativo usando a API da Anthropic (Claude).
Só é chamado quando o aluno erra ou pede uma dica.
"""
import uuid

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Exercicio, FeedbackIA

NIVEIS_DICA = ["leve", "moderada", "solucao"]

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


async def gerar_feedback(
    exercicio: Exercicio,
    resposta_aluno: str,
    dicas_usadas: int,
    sessao_id: uuid.UUID,
    db: AsyncSession,
) -> str:
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

    mensagem = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    texto = mensagem.content[0].text
    tokens = mensagem.usage.input_tokens + mensagem.usage.output_tokens

    feedback = FeedbackIA(
        sessao_id=sessao_id,
        mensagem=texto,
        nivel_dica=nivel,
        tokens_usados=tokens,
    )
    db.add(feedback)

    return texto
```

---

## 9. Configuração do frontend

```bash
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install
npm install axios react-router-dom @types/react-router-dom
npm install reactflow  # grafo de progresso
```

### `src/api/client.ts`

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Injeta o token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

### `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

### `src/components/EditorEgua.tsx` (embed do IDEgua)

```typescript
export function EditorEgua() {
  return (
    <iframe
      src="https://egua.tech/ide"
      title="Editor Égua"
      width="100%"
      height="500px"
      style={{ border: "none", borderRadius: 8 }}
      allow="clipboard-write"
    />
  );
}
```

---

## 10. Docker Compose

Crie o arquivo `docker-compose.yml` na raiz do projeto:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: tutor
      POSTGRES_PASSWORD: tutor123
      POSTGRES_DB: tutoregua
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tutor -d tutoregua"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://tutor:tutor123@db:5432/tutoregua
      - DATABASE_URL_ASYNC=postgresql+asyncpg://tutor:tutor123@db:5432/tutoregua
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=troque-esta-chave-em-producao
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  pgdata:
```

### `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 11. Variáveis de ambiente

Crie `backend/.env` (nunca commite este arquivo):

```env
# Banco de dados
DATABASE_URL=postgresql://tutor:tutor123@localhost:5432/tutoregua
DATABASE_URL_ASYNC=postgresql+asyncpg://tutor:tutor123@localhost:5432/tutoregua

# Redis
REDIS_URL=redis://localhost:6379/0

# Segurança
SECRET_KEY=gere-uma-chave-aleatoria-com-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# IA (obtenha em https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# Debug
DEBUG=true
```

Crie `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Adicione ao `.gitignore` na raiz:

```gitignore
# Python
__pycache__/
*.pyc
.venv/
.env
*.egg-info/

# Node
node_modules/
dist/
.env.local

# Alembic
alembic/versions/*.py

# OS
.DS_Store
Thumbs.db
```

---

## 12. Rodando o projeto

### Opção A — com Docker (recomendado)

```bash
# Na raiz do projeto:
docker compose up -d db redis   # sobe apenas o banco e o cache

# Aguarde o banco ficar saudável, então rode as migrations:
cd backend
source .venv/bin/activate
alembic upgrade head
python -m app.seed.run_seed

# Suba a API:
uvicorn app.main:app --reload --port 8000

# Em outro terminal, suba o frontend:
cd ../frontend
npm run dev
```

### Opção B — stack completa via Docker

```bash
docker compose up --build
# A API estará em http://localhost:8000
# O frontend em http://localhost:5173 (rodar separado com npm run dev)
```

### Verificar se está funcionando

```bash
# Saúde da API:
curl http://localhost:8000/health

# Documentação interativa (Swagger):
# Abra no navegador: http://localhost:8000/docs
```

---

## 13. Extensões recomendadas para VS Code

Crie `.vscode/extensions.json` na raiz:

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-python.black-formatter",
    "charliermarsh.ruff",
    "ms-azuretools.vscode-docker",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "mtxr.sqltools",
    "mtxr.sqltools-driver-pg",
    "eamodio.gitlens",
    "usernamehw.errorlens"
  ]
}
```

Crie `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "python.linting.enabled": true,
  "python.analysis.typeCheckingMode": "basic",
  "python.defaultInterpreterPath": "./backend/.venv/bin/python"
}
```

---

## Próximos passos sugeridos

Depois de ter o projeto rodando, siga esta ordem de desenvolvimento:

1. Implementar autenticação JWT (`/aluno/registrar` e `/aluno/login`)
2. Criar o endpoint `/tutor/proximo-exercicio` com a lógica de seleção baseada no grafo
3. Construir o componente `GrafoProgresso.tsx` com React Flow mostrando os 8 nós
4. Implementar o avaliador de código em `services/avaliador.py`
5. Adicionar mais exercícios ao `exercicios.yaml`
6. Integrar o IDEgua embed na tela de exercício
7. Escrever testes com `pytest` e `httpx.AsyncClient`

---

*TutorÉgua — IA Aplicada à Educação · 2025*
