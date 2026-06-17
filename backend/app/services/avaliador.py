"""
Avalia a resposta do aluno conforme o tipo de exercício.

Para implementacao_livre, executa o código Égua via egua_runner.js
(usa a biblioteca @designliquido/delegua programaticamente via Node.js).
"""
import asyncio
import os
import shutil
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from app.models import Exercicio

TIMEOUT_EXECUCAO = 10.0

# Caminho absoluto para o runner Node.js (backend/egua_runner.js)
_RUNNER = str(Path(__file__).resolve().parent.parent.parent / "egua_runner.js")

# Resolve o binário node em tempo de inicialização para evitar problemas de PATH
_NODE = shutil.which("node") or "/home/vmedei/.nvm/versions/node/v24.16.0/bin/node"


@dataclass
class ResultadoAvaliacao:
    correto: bool
    detalhe: str | None = None
    saidas_obtidas: list[str] = field(default_factory=list)


async def _executar_egua(codigo: str, entrada: str = "") -> tuple[str, str]:
    """
    Executa código Égua via egua_runner.js e retorna (stdout, stderr).
    Múltiplas entradas devem ser separadas por '\\n' — cada linha vira um argumento.
    """
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".egua", delete=False, encoding="utf-8"
    ) as f:
        f.write(codigo)
        temp_path = f.name

    # Cada linha de entrada vira um argumento posicional para o runner
    args_entrada = [e for e in entrada.split("\n") if e.strip()] if entrada else []

    try:
        proc = await asyncio.create_subprocess_exec(
            _NODE, _RUNNER, temp_path, *args_entrada,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(),
            timeout=TIMEOUT_EXECUCAO,
        )
        return stdout.decode("utf-8").strip(), stderr.decode("utf-8").strip()
    except FileNotFoundError:
        return "", "Node.js não encontrado no PATH. Instale em nodejs.org"
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except Exception:
            pass
        return "", f"Tempo limite de {TIMEOUT_EXECUCAO}s excedido."
    finally:
        try:
            os.unlink(temp_path)
        except Exception:
            pass


async def avaliar_resposta(exercicio: Exercicio, resposta: str) -> ResultadoAvaliacao:
    tipo = exercicio.tipo
    gabarito = exercicio.gabarito

    if tipo == "multipla_escolha":
        indice_correto = gabarito.get("correta", -1)
        opcoes = gabarito.get("opcoes", [])
        try:
            indice_aluno = int(resposta.strip())
        except ValueError:
            resposta_limpa = resposta.strip().lower()
            indice_aluno = next(
                (i for i, op in enumerate(opcoes) if op.lower() == resposta_limpa), -1
            )
        correto = indice_aluno == indice_correto
        detalhe = None if correto else f"Resposta correta: {opcoes[indice_correto]}"
        return ResultadoAvaliacao(correto=correto, detalhe=detalhe)

    if tipo == "completar_codigo":
        esperado = gabarito.get("resposta", "").strip().lower()
        correto = resposta.strip().lower() == esperado
        detalhe = None if correto else f"Esperado: '{gabarito.get('resposta')}'"
        return ResultadoAvaliacao(correto=correto, detalhe=detalhe)

    if tipo == "implementacao_livre":
        if not resposta.strip():
            return ResultadoAvaliacao(correto=False, detalhe="Código vazio.")

        casos = exercicio.casos_de_teste or []
        if not casos:
            return ResultadoAvaliacao(correto=True, detalhe="Sem casos de teste — código aceito.")

        saidas_obtidas = []
        for caso in casos:
            entrada = caso.get("entrada", "")
            saida_esperada = caso.get("saida_esperada", "").strip()

            saida, erro = await _executar_egua(resposta, entrada)
            saidas_obtidas.append(saida)

            if erro and not saida:
                return ResultadoAvaliacao(
                    correto=False,
                    detalhe=f"Erro de execução: {erro}",
                    saidas_obtidas=saidas_obtidas,
                )

            if saida != saida_esperada:
                return ResultadoAvaliacao(
                    correto=False,
                    detalhe=f"Entrada: '{entrada}' → esperado '{saida_esperada}', obtido '{saida}'",
                    saidas_obtidas=saidas_obtidas,
                )

        return ResultadoAvaliacao(
            correto=True,
            detalhe=f"{len(casos)} caso(s) de teste passaram ✓",
            saidas_obtidas=saidas_obtidas,
        )

    return ResultadoAvaliacao(correto=False, detalhe=f"Tipo desconhecido: {tipo}")
