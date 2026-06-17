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
