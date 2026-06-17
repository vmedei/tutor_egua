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
