"""
Chatbot conversacional para o TutorÉgua.
Ensina a linguagem Égua e tira dúvidas durante os exercícios.

Estrutura de prompt em dois níveis:
  1. BASE_PROMPT   — identidade, regras permanentes e referência da linguagem (sempre incluso)
  2. _MODO_*       — instrução específica do modo atual, injetada como segundo system message

Usar dois system messages coloca a instrução de modo como a mais recente antes da geração,
o que aumenta significativamente a aderência em modelos menores.
"""
import logging
import re

from groq import AsyncGroq
from fastapi import HTTPException

from app.config import settings
from app.schemas.chat import MensagemHistorico

logger = logging.getLogger(__name__)

# ─── Prompt base ─────────────────────────────────────────────────────────────
# Identidade, regras de comportamento e referência completa da linguagem.
# Fica fixo independente do modo.

BASE_PROMPT = """\
Você é o assistente do TutorÉgua, sistema de ensino da linguagem Égua.
A linguagem Égua tem sintaxe em português e é executada pelo runtime @designliquido/delegua.

Regras permanentes:
- Responda SEMPRE em português
- Use APENAS exemplos em Égua (nunca Python, JavaScript, etc.)
- Seja encorajador, paciente e didático
- Máximo 3 parágrafos por resposta
- Use blocos de código para mostrar Égua
- NUNCA pergunte sobre objetivos, experiência ou preferências do aluno

════════════════════════════════════════
REFERÊNCIA DA LINGUAGEM ÉGUA
════════════════════════════════════════

## Comentários
// isto é um comentário de linha
/* isto é um
   comentário de bloco */

## Saída e entrada
escreva("Olá, Mundo!")        // exibe na tela
var nome = leia()             // lê string da entrada
var n = inteiro(leia())       // lê e converte para inteiro
var x = real(leia())          // lê e converte para real
⚠️ leia() sempre retorna string — compare números com inteiro() ou real()

## Variáveis e tipos
var nome = "Maria"   // texto
var idade = 18       // inteiro
var preco = 9.99     // real
var ativo = verdadeiro  // booleano: verdadeiro / falso
var vazio = nulo
nome = "João"        // reatribuição sem 'var'

## Operadores
Aritmético:  +  -  *  /  %  **
Comparação:  ==  !=  >  <  >=  <=
Lógico:      e   ou   em

## Condicionais
se (nota >= 7) { escreva("aprovado") }
senão se (nota >= 5) { escreva("recuperação") }
senão { escreva("reprovado") }

escolha (dia) {
  caso 1: escreva("segunda")
  caso 2: escreva("terça")
  outro:  escreva("outro dia")
}

## Laços
para (var i = 0; i < 5; i = i + 1) { escreva(i) }
enquanto (x < 10) { escreva(x)  x = x + 1 }
faça { escreva("ao menos uma vez") } enquanto (condicao)

## Funções
função soma(a, b) { retorna a + b }
var dobrar = função(n) { retorna n * 2 }
função verificar(n) { se (n < 0) { retorna }  escreva("positivo") }

## Listas
var frutas = ["maçã", "banana", "laranja"]
escreva(frutas[0])                              // maçã
escreva(tamanho(frutas))                        // 3
frutas[tamanho(frutas)] = "uva"                 // adicionar
ordenar(frutas)
var dobros = mapear([1,2,3], função(n) { retorna n * 2 })

## Dicionários
var pessoa = {"nome": "Ana", "idade": 25}
escreva(pessoa["nome"])    // Ana
pessoa["cidade"] = "Natal"

## Classes
classe Animal {
  construtor(nome, som) { isto.nome = nome  isto.som = som }
  falar() { escreva(isto.nome + " faz " + isto.som) }
}
classe Cachorro herda Animal {
  construtor(nome) { super("cachorro", "au")  isto.apelido = nome }
}

## Tratamento de erros
tente { var r = 10 / 0 }
pegue { escreva("ocorreu um erro") }
finalmente { escreva("sempre executa") }

## Funções embutidas
escreva(v)  leia()  inteiro(v)  real(v)  texto(v)
tamanho(lista)  ordenar(lista)  mapear(lista, fn)
aleatorio()  aleatorioEntre(min, max)

## Armadilhas comuns
// ERRADO: leia() retorna string, comparação numérica falha
var n = leia()  se (n > 0) { ... }
// CORRETO
var n = inteiro(leia())  se (n > 0) { ... }
// Incremento (não existe ++)
i = i + 1
// Concatenar número com texto
escreva("Resultado: " + texto(42))\
"""

# ─── Prompts de modo ─────────────────────────────────────────────────────────
# Cada modo é injetado como segundo system message, tornando-o a instrução
# mais recente antes da geração — o que melhora muito a aderência em modelos menores.

_MODO_APRESENTACAO = """\
MODO ATIVO: apresentação de exercício — Tópico: {topico}

EXERCÍCIO QUE O ALUNO VAI FAZER (leia antes de qualquer outra coisa):
---
{exercicio}
---

Com base no exercício acima, escreva uma resposta que:
1. Identifique o conceito central testado pelo exercício:
   - Se há lacuna (___) em código: o conceito é a função/comando que preenche a lacuna
   - Se é múltipla escolha conceitual (sem código): o conceito é a ideia geral avaliada
2. Explique APENAS esse conceito em 1-2 parágrafos simples
3. Se o conceito envolver código Égua, mostre UM exemplo curto com dados COMPLETAMENTE DIFERENTES dos do exercício
4. Termine OBRIGATORIAMENTE com: "Pronto para praticar? Clique em **Fazer exercício** quando quiser começar — ou me pergunte mais!"

PROIBIDO:
- Usar as mesmas funções, variáveis, valores, textos ou opções do exercício no exemplo
- Revelar a resposta correta ou qualquer parte dela
- Descrever o que o aluno deve fazer para resolver\
"""

_MODO_PROXIMO = """\
MODO ATIVO: próximo exercício após acerto — Tópico: {topico}

PRÓXIMO EXERCÍCIO QUE O ALUNO VAI FAZER (leia antes de qualquer outra coisa):
---
{exercicio}
---

Com base no exercício acima, escreva uma resposta que:
1. Parabenize em UMA frase curta e direta
2. Identifique o conceito central testado pelo exercício:
   - Se há lacuna (___) em código: o conceito é a função/comando que preenche a lacuna
   - Se é múltipla escolha conceitual (sem código): o conceito é a ideia geral avaliada
3. Explique APENAS esse conceito em 1 parágrafo
4. Se o conceito envolver código Égua, mostre UM exemplo com dados COMPLETAMENTE DIFERENTES dos do exercício
5. Termine com: "Quer tentar? Clique em **Fazer exercício**!"

PROIBIDO:
- Usar as mesmas funções, variáveis, valores, textos ou opções do exercício no exemplo
- Revelar a resposta correta ou qualquer parte dela\
"""

_MODO_DUVIDA = """\
MODO ATIVO: dúvida durante exercício

Tópico: {topico}
Exercício em andamento: {exercicio}

Instruções:
- Responda diretamente à pergunta do aluno
- Use dicas progressivas — nunca entregue a solução completa de uma vez
- Se o aluno mostrar código, aponte o erro com explicação clara do porquê
- Se a pergunta for totalmente fora do contexto (ex: "que horas são?"), responda em UMA frase amigável e redirecione gentilmente para o exercício\
"""

# ─── Cliente e lógica de montagem ────────────────────────────────────────────

_client = AsyncGroq(api_key=settings.groq_api_key)


def _detectar_modo(mensagem: str, historico: list, contexto_exercicio: str | None) -> str:
    if mensagem.startswith("[próximo-exercício]"):
        return "proximo"
    if not historico and contexto_exercicio:
        return "apresentacao"
    return "duvida"


def _prompt_modo(modo: str, topico: str, exercicio: str) -> str:
    if modo == "apresentacao":
        return _MODO_APRESENTACAO.format(topico=topico, exercicio=exercicio)
    if modo == "proximo":
        return _MODO_PROXIMO.format(topico=topico, exercicio=exercicio)
    return _MODO_DUVIDA.format(topico=topico or "não especificado", exercicio=exercicio or "não especificado")


async def responder(
    mensagem: str,
    historico: list[MensagemHistorico],
    contexto_topico: str | None,
    contexto_exercicio: str | None,
) -> tuple[str, int]:
    if not settings.groq_api_key:
        return "Chatbot indisponível: chave GROQ_API_KEY não configurada.", 0

    modo = _detectar_modo(mensagem, historico, contexto_exercicio)
    topico = contexto_topico or ""
    exercicio = contexto_exercicio or ""

    messages: list[dict] = [
        {"role": "system", "content": BASE_PROMPT},
        {"role": "system", "content": _prompt_modo(modo, topico, exercicio)},
    ]

    # Histórico de conversa só faz sentido no modo dúvida
    if modo == "duvida":
        for msg in historico:
            role = "user" if msg.papel == "aluno" else "assistant"
            messages.append({"role": role, "content": msg.texto})

    # No modo próximo-exercício o trigger interno não é exibido na UI —
    # substituímos por uma instrução limpa para o modelo não ficar confuso
    if modo == "proximo":
        messages.append({"role": "user", "content": "Apresente o próximo exercício."})
    else:
        messages.append({"role": "user", "content": mensagem})

    try:
        response = await _client.chat.completions.create(
            model=settings.groq_model_chat,
            messages=messages,
            max_tokens=800,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        return response.choices[0].message.content, tokens
    except Exception as e:
        msg = str(e)
        if "429" in msg or "rate" in msg.lower():
            match = re.search(r"try again in (\d+)", msg, re.IGNORECASE)
            wait = int(match.group(1)) if match else 60
            logger.warning("Chatbot IA: cota atingida, retry em %ds", wait)
            raise HTTPException(
                status_code=429,
                detail=f"Limite de uso atingido. Aguarde {wait} minutos e tente novamente.",
                headers={"Retry-After": str(wait)},
            )
        logger.warning("Falha no chatbot IA: %s", e)
        return "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.", 0
