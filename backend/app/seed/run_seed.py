"""
Popula o banco com os tópicos e exercícios iniciais.

Uso:
  python -m app.seed.run_seed           # upsert (não apaga nada)
  python -m app.seed.run_seed --clear   # apaga tudo exceto alunos e reinicia
"""
import asyncio
import sys
import yaml
from pathlib import Path

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from passlib.context import CryptContext

from app.database import AsyncSessionLocal, engine, Base
from app.models import Aluno, Exercicio, FeedbackIA, Prerequisito, ProgressoAluno, Sessao, Topico

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

SEED_DIR = Path(__file__).parent


async def clear_seed_data(db: AsyncSession):
    """Apaga todos os dados de seed mantendo os alunos cadastrados."""
    await db.execute(delete(FeedbackIA))
    await db.execute(delete(Sessao))
    await db.execute(delete(ProgressoAluno))
    await db.execute(delete(Exercicio))
    await db.execute(delete(Prerequisito))
    await db.execute(delete(Topico))
    await db.flush()
    print("  Dados antigos removidos.")


async def seed(clear: bool = False):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        if clear:
            await clear_seed_data(db)
        await seed_aluno_teste(db)
        await seed_topicos(db)
        await seed_exercicios(db)
        await db.commit()
    print("Seed concluído com sucesso!")


async def seed_aluno_teste(db: AsyncSession):
    existente = await db.scalar(select(Aluno).where(Aluno.email == "aluno@teste.com"))
    if existente:
        print("  Aluno de teste já existe, pulando.")
        return
    aluno = Aluno(
        nome="Aluno Teste",
        email="aluno@teste.com",
        senha_hash=_pwd_ctx.hash("senha123"),
    )
    db.add(aluno)
    await db.flush()
    print(f"  Aluno de teste criado — id: {aluno.id}")


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
            existe = await db.scalar(
                select(Prerequisito).where(
                    Prerequisito.topico_id == topico.id,
                    Prerequisito.requer_id == prereq.id,
                )
            )
            if not existe:
                db.add(Prerequisito(topico_id=topico.id, requer_id=prereq.id))

    print(f"  {len(topico_map)} tópicos inseridos.")


async def seed_exercicios(db: AsyncSession):
    data = yaml.safe_load((SEED_DIR / "exercicios.yaml").read_text())
    inseridos = atualizados = 0

    for e in data["exercicios"]:
        topico = await db.scalar(
            select(Topico).where(Topico.codigo == e["topico"])
        )
        if not topico:
            print(f"  Tópico '{e['topico']}' não encontrado, pulando exercício.")
            continue

        existente = await db.scalar(
            select(Exercicio).where(
                Exercicio.topico_id == topico.id,
                Exercicio.enunciado == e["enunciado"],
            )
        )

        if existente:
            existente.gabarito = e["gabarito"]
            existente.casos_de_teste = e.get("casos_de_teste")
            existente.nivel_bloom = e.get("nivel_bloom", 1)
            atualizados += 1
        else:
            db.add(Exercicio(
                topico_id=topico.id,
                enunciado=e["enunciado"],
                tipo=e["tipo"],
                nivel_bloom=e.get("nivel_bloom", 1),
                gabarito=e["gabarito"],
                casos_de_teste=e.get("casos_de_teste"),
            ))
            inseridos += 1

    print(f"  {inseridos} exercícios inseridos, {atualizados} atualizados.")


if __name__ == "__main__":
    clear = "--clear" in sys.argv
    asyncio.run(seed(clear=clear))
