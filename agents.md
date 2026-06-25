# agent.md — Contexto do TutorÉgua

Este documento reúne todo o contexto necessário para implementar funcionalidades no TutorÉgua. Leia-o inteiramente antes de escrever qualquer código.

> **Fundamentação teórica completa:** [`adr_docs/002-fundamentacao-teorica.md`](adr_docs/002-fundamentacao-teorica.md)  
> Leia o ADR antes de alterar qualquer lógica de progressão, seleção de exercícios, feedback ou interface do grafo.

---

## 0. Restrições pedagógicas obrigatórias

Estas regras derivam das teorias de ITS documentadas no ADR 002. Violá-las quebra a coerência pedagógica do sistema.

| Regra | Teoria | Onde no código |
|---|---|---|
| Limiar de desbloqueio do próximo nó = **70%** | Mastery Learning (Bloom) | `LIMIAR_DESBLOQUEIO = 0.70` em `modelo_aluno.py` |
| Exercícios ordenados do mais simples ao mais complexo dentro do tópico | Taxonomia de Bloom | `ORDER BY nivel_bloom ASC` no seletor |
| O chat explica o tópico **antes** de apresentar o exercício | ZDP (Vygotsky) | Sequência obrigatória no `ChatPanel` |
| Feedback sempre explicativo quando o aluno erra, nunca só "errado" | ACT-R (Anderson) | `ia_feedback.py` + campo `detalhe` na resposta |
| Dicas são progressivas; o chat nunca entrega a solução direta | ZDP (Vygotsky) | System prompt do chat |
| Nós sem pré-requisito cumprido são soft-locked (visual), não hard-locked | Mastery Learning | `GrafoProgresso.tsx` + lógica de `prerequisito` |
| `proxima_revisao` e `DECAIMENTO_SEMANAL` não devem ser removidos | Ebbinghaus / Spaced Repetition | `modelo_aluno.py` |
| Remediação: se proficiência ≤ 35% e ≥ 2 erros, voltar ao pré-requisito | ZDP (Vygotsky) | `seletor.py` — `LIMIAR_REMEDIACAO`, `LIMIAR_ERROS_REPETIDOS` |

---

## 1. O que é o TutorÉgua

Sistema Tutor Inteligente (ITS) voltado para o ensino da linguagem de programação **Égua** — uma linguagem didática com sintaxe em português, desenvolvida para iniciantes. O sistema:

- Apresenta exercícios progressivos organizados em tópicos (grafo de conhecimento)
- Executa código Égua de forma real, comparando a saída com casos de teste
- Atualiza um modelo de proficiência por tópico (BKT simplificado)
- Gera feedback via IA (Groq — llama-3.3-70b-versatile) quando o aluno erra

O chatbot é a **próxima grande funcionalidade**: um assistente conversacional que o aluno pode acionar a qualquer momento para tirar dúvidas, pedir explicações e ver exemplos sobre a linguagem Égua.

---

## 2. Arquitetura do sistema

```
┌─────────────────────────────────────────────────────┐
│  Frontend  React + Vite + TypeScript (porta 5173)   │
│                                                      │
│  Páginas: Login · Dashboard · Exercicio · [Chat]    │
└────────────────────┬────────────────────────────────┘
                     │ HTTP (axios)
┌────────────────────▼────────────────────────────────┐
│  Backend  FastAPI Python 3.12 (porta 8000)          │
│                                                      │
│  Routers: /aluno  /exercicio  /sessao  /tutor       │
│           [/chat]  ← a ser criado                   │
│                                                      │
│  Services: avaliador · modelo_aluno · ia_feedback   │
│            [ia_chat]  ← a ser criado                │
│                                                      │
│  egua_runner.js  (@designliquido/delegua via Node)  │
└───────┬──────────────────────┬──────────────────────┘
        │                      │
┌───────▼──────┐   ┌───────────▼──────────────────────┐
│  PostgreSQL  │   │  Groq Cloud (free tier)          │
│  (Docker)    │   │  llama-3.3-70b-versatile         │
└──────────────┘   └──────────────────────────────────┘
```

### Diretórios relevantes

```
backend/
├── app/
│   ├── config.py           # Settings (lê .env) — gemini_api_key está aqui
│   ├── main.py             # FastAPI app, CORS, routers
│   ├── models/             # SQLAlchemy ORM
│   │   ├── aluno.py        # Aluno(id, nome, email, senha_hash)
│   │   ├── exercicio.py    # Exercicio(topico_id, enunciado, tipo, gabarito, casos_de_teste)
│   │   ├── sessao.py       # Sessao(aluno_id, exercicio_id, correto, delta_proficiencia)
│   │   ├── feedback.py     # FeedbackIA(sessao_id, mensagem, nivel_dica, tokens_usados)
│   │   ├── progresso.py    # ProgressoAluno(aluno_id, topico_id, proficiencia, tentativas)
│   │   └── topico.py       # Topico(codigo, nome, nivel, ordem)
│   ├── routers/
│   │   ├── sessao.py       # POST /sessao/executar  POST /sessao/
│   │   └── tutor.py        # GET /tutor/proximo-exercicio  GET /tutor/progresso
│   └── services/
│       └── ia_feedback.py  # gerar_feedback() — padrão a seguir para o chat
frontend/
└── src/
    ├── api/client.ts       # axios instance apontando para http://localhost:8000
    └── pages/
        ├── Login.tsx
        ├── Dashboard.tsx
        └── Exercicio.tsx   # Página principal — referência de estrutura de componente
```

---

## 3. Integração Groq existente (referência para o chat)

O serviço `backend/app/services/ia_feedback.py` é o padrão a seguir:

```python
from groq import AsyncGroq
from app.config import settings

_client = AsyncGroq(api_key=settings.groq_api_key)

# Chamada assíncrona:
response = await _client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": prompt}],
    max_tokens=500,
)
texto = response.choices[0].message.content
tokens = response.usage.total_tokens
```

A chave `GROQ_API_KEY` já está em `backend/.env` e no `Settings`. Não há necessidade de nenhuma dependência adicional.

**Limites do plano gratuito (Groq — llama-3.3-70b-versatile):**
- 30 requisições/minuto
- 14.400 requisições/dia
- 6.000 tokens/minuto

---

## 4. Referência completa da linguagem Égua

Esta seção deve compor o **system prompt** do chatbot.

### 4.1 Visão geral

Égua é uma linguagem de programação didática com sintaxe em **português**, executada pela biblioteca Node.js `@designliquido/delegua`. IDE online: http://programar.egua.dev/

### 4.2 Saída e entrada

```egua
// Exibir texto ou valor
escreva("Olá, Mundo!")
escreva(42)
escreva("Valor: " + texto(x))

// Ler entrada do usuário (retorna string — sempre converta se precisar de número)
var nome = leia()
var idade = inteiro(leia())
var preco = real(leia())
```

> `leia()` retorna **string**. Para operações numéricas use `inteiro()` ou `real()`.

### 4.3 Comentários

```egua
// isto é um comentário de linha
```

### 4.4 Variáveis e tipos

```egua
var nome = "Maria"        // texto (string)
var idade = 18            // número inteiro
var preco = 9.99          // número real
var ativo = verdadeiro    // booleano
var vazio = nulo          // nulo

// Reatribuição (sem var)
nome = "João"
```

**Tipos primitivos:** `texto`, número inteiro, número real, `verdadeiro`/`falso`, `nulo`

**Escopo:** blocos `{ }` criam escopo local. Uma variável declarada com `var` dentro de um bloco é local. Atribuir sem `var` modifica a variável do escopo externo.

### 4.5 Operadores

| Categoria | Operadores |
|---|---|
| Aritmético | `+` `-` `*` `/` `%` `**` |
| Comparação | `==` `!=` `>` `<` `>=` `<=` |
| Lógico | `e` `ou` `em` |
| Bitwise | `&` `\|` `^` `<<` `>>` |

```egua
escreva(10 % 3)      // 1
escreva(2 ** 8)      // 256
escreva(5 > 3 e 2 < 4)   // verdadeiro
```

### 4.6 Condicionais

```egua
se (nota >= 7) {
  escreva("aprovado")
} senão se (nota >= 5) {
  escreva("recuperação")
} senão {
  escreva("reprovado")
}
```

```egua
// escolha/caso (switch)
escolha (dia) {
  caso 1:
    escreva("segunda")
  caso 2:
    escreva("terça")
  outro:
    escreva("outro dia")
}
```

### 4.7 Laços de repetição

```egua
// para (for)
para (var i = 0; i < 5; i = i + 1) {
  escreva(i)
}

// enquanto (while)
var x = 0
enquanto (x < 10) {
  escreva(x)
  x = x + 1
}

// faça-enquanto (do-while) — executa ao menos uma vez
faça {
  escreva("executou")
} enquanto (condicao)
```

### 4.8 Funções

```egua
// Declaração
função soma(a, b) {
  retorna a + b
}

// Chamada
var resultado = soma(3, 4)
escreva(resultado)   // 7

// Função anônima
var dobrar = função(n) {
  retorna n * 2
}
escreva(dobrar(5))   // 10

// Retorno antecipado (sem valor)
função verificar(n) {
  se (n < 0) {
    retorna
  }
  escreva("positivo")
}
```

### 4.9 Listas (vetores)

```egua
var frutas = ["maçã", "banana", "laranja"]

// Acesso por índice (começa em 0)
escreva(frutas[0])        // maçã

// Tamanho
escreva(tamanho(frutas))  // 3

// Adicionar elementos
frutas[tamanho(frutas)] = "uva"

// Iterar
para (var i = 0; i < tamanho(frutas); i = i + 1) {
  escreva(frutas[i])
}

// Ordenar
ordenar(frutas)

// Mapear (aplicar função a cada elemento)
var dobros = mapear([1, 2, 3], função(n) { retorna n * 2 })
```

### 4.10 Dicionários

```egua
var pessoa = {"nome": "Ana", "idade": 25}
escreva(pessoa["nome"])   // Ana
pessoa["cidade"] = "Natal"
```

### 4.11 Classes e Objetos

```egua
classe Animal {
  construtor(nome, som) {
    isto.nome = nome
    isto.som = som
  }

  falar() {
    escreva(isto.nome + " faz " + isto.som)
  }
}

var gato = Animal("Miau", "miau")
gato.falar()   // Miau faz miau

// Herança
classe Cachorro herda Animal {
  construtor(nome) {
    super("cachorro", "au")
    isto.apelido = nome
  }

  buscar() {
    escreva(isto.apelido + " foi buscar!")
  }
}

var rex = Cachorro("Rex")
rex.falar()    // cachorro faz au
rex.buscar()   // Rex foi buscar!
```

### 4.12 Tratamento de erros

```egua
tente {
  var resultado = 10 / 0
  escreva(resultado)
} pegue {
  escreva("ocorreu um erro")
} finalmente {
  escreva("sempre executa")
}
```

### 4.13 Funções embutidas

| Função | Descrição |
|---|---|
| `escreva(valor)` | Exibe valor na tela |
| `leia()` | Lê entrada do usuário (retorna string) |
| `inteiro(valor)` | Converte para inteiro |
| `real(valor)` | Converte para número real |
| `texto(valor)` | Converte para string |
| `tamanho(lista_ou_texto)` | Retorna comprimento |
| `mapear(lista, funcao)` | Aplica função a cada elemento |
| `ordenar(lista)` | Ordena lista in-place |
| `aleatorio()` | Número aleatório entre 0 e 1 |
| `aleatorioEntre(min, max)` | Inteiro aleatório (max exclusivo) |

### 4.14 Bibliotecas (importar)

```egua
importar tempo

var agora = tempo()
escreva(agora)
```

### 4.15 Padrões comuns e armadilhas

```egua
// ERRADO — leia() retorna string, comparação com número falha
var n = leia()
se (n > 0) { ... }          // nunca funciona

// CORRETO
var n = inteiro(leia())
se (n > 0) { ... }

// Concatenação de string com número requer conversão
escreva("Resultado: " + texto(42))

// Incremento (não existe i++)
i = i + 1

// Igualdade estrita (tipo + valor)
se (x == "5") { ... }   // verdadeiro só se x for a string "5"
```

---

## 5. Design do chatbot

### 5.1 Propósito

O chatbot deve ser capaz de:

1. **Ensinar** conceitos da linguagem Égua com exemplos práticos
2. **Responder dúvidas** sobre sintaxe, semântica e boas práticas
3. **Explicar erros** quando o aluno colar um trecho de código
4. **Sugerir exercícios mentais** sem entregar soluções diretas (modo pedagógico)
5. **Manter contexto** do tópico que o aluno está estudando no momento

### 5.2 Comportamento esperado

- Responder **sempre em português**
- Ser **encorajador e didático**, nunca condescendente
- Priorizar **exemplos em Égua** (não Python, não JavaScript)
- Quando o aluno perguntar sobre um erro de código, analisá-lo e apontar o problema com explicação
- **Não revelar soluções diretas** de exercícios do sistema — dar dicas progressivas
- Manter histórico da conversa para contexto coerente

### 5.3 System prompt sugerido

```
Você é o assistente do TutorÉgua, um sistema de ensino de programação para a linguagem Égua.
A linguagem Égua é uma linguagem didática com sintaxe em português, executada pelo runtime @designliquido/delegua.

Seu papel é:
- Ensinar conceitos de programação usando a linguagem Égua
- Responder dúvidas sobre sintaxe e funcionamento da linguagem
- Analisar trechos de código Égua e explicar erros
- Dar dicas progressivas, sem entregar soluções prontas de exercícios

Regras:
- Responda sempre em português
- Use exemplos em Égua (nunca Python, JavaScript, etc.)
- Seja encorajador e didático
- Quando mostrar código, use o formato de bloco de código
- Máximo de 4 parágrafos por resposta

[Referência da linguagem Égua]
<inserir seção 4 deste documento>
```

### 5.4 Contexto que pode ser injetado por requisição

Para personalizar a resposta com o estado atual do aluno, o backend pode injetar no prompt:

```python
contexto_aluno = f"""
Tópico atual do aluno: {topico_nome}
Exercício em andamento: {exercicio_enunciado}
Proficiência no tópico: {proficiencia:.0%}
"""
```

Isso é opcional mas melhora muito a relevância das respostas.

---

## 6. Onde implementar

### 6.1 Backend — novo router e service

**`backend/app/routers/chat.py`** (a criar):
```python
POST /chat/          # envia mensagem, recebe resposta
GET  /chat/{aluno_id}/historico   # (opcional) histórico de sessão
```

Payload de entrada:
```json
{
  "aluno_id": "uuid",
  "mensagem": "Como funciona o leia()?",
  "historico": [
    {"papel": "aluno", "texto": "..."},
    {"papel": "assistente", "texto": "..."}
  ],
  "contexto_topico_id": "uuid"  // opcional
}
```

Resposta:
```json
{
  "resposta": "O leia() lê uma entrada...",
  "tokens_usados": 120
}
```

**`backend/app/services/ia_chat.py`** (a criar):
- Baseado em `ia_feedback.py`
- Usa `genai.GenerativeModel` com `start_chat()` para manter histórico
- O histórico é passado pelo cliente (stateless no servidor) para simplicidade
- Alternativamente: usar `generate_content` com o histórico montado como lista de `Content`

### 6.2 Frontend — novo componente

**`frontend/src/components/ChatBot.tsx`** (a criar):
- Painel flutuante ou aba lateral
- Campo de texto para digitar mensagem
- Lista de mensagens (bolhas aluno/assistente)
- Botão de enviar + Enter para enviar
- Indicador de "digitando..." durante a requisição
- Botão para limpar histórico

Pode ser acessado:
- Como aba na página `Exercicio.tsx` (recomendado — contexto do exercício disponível)
- Como botão flutuante em todas as páginas

### 6.3 Registro no main.py

```python
from app.routers import aluno, exercicio, sessao, tutor, chat

app.include_router(chat.router, prefix="/chat", tags=["chat"])
```

---

## 7. Gestão do histórico de conversa

### Opção A — Stateless (recomendado para começar)

O frontend mantém o histórico em memória (estado React). A cada mensagem, envia o histórico completo para o backend, que monta o prompt e chama a API do Gemini. Vantagens: simples, sem tabela extra no banco.

### Opção B — Persistido no banco (para histórico entre sessões)

Criar tabela `chat_mensagem`:
```sql
id UUID PK
aluno_id UUID FK aluno
papel VARCHAR(20)  -- 'aluno' ou 'assistente'
texto TEXT
criado_em TIMESTAMP
```

Recuperar as últimas N mensagens no endpoint de chat para passar ao Gemini.

---

## 8. Chamada ao Groq com histórico (referência de implementação)

```python
from groq import AsyncGroq
from app.config import settings

_client = AsyncGroq(api_key=settings.groq_api_key)

async def responder_chat(mensagem: str, historico: list[dict]) -> str:
    # Monta messages no formato OpenAI (compatível com Groq)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in historico:
        role = "user" if msg["papel"] == "aluno" else "assistant"
        messages.append({"role": role, "content": msg["texto"]})

    # Adiciona a mensagem atual
    messages.append({"role": "user", "content": mensagem})

    response = await _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=800,
    )
    return response.choices[0].message.content
```

---

## 9. Checklist de implementação

- [ ] Criar `backend/app/services/ia_chat.py` com system prompt + função `responder_chat()`
- [ ] Criar `backend/app/schemas/chat.py` com `ChatPayload` e `ChatResponse`
- [ ] Criar `backend/app/routers/chat.py` com `POST /chat/`
- [ ] Registrar router em `backend/app/main.py`
- [ ] Criar `frontend/src/components/ChatBot.tsx`
- [ ] Integrar ChatBot em `frontend/src/pages/Exercicio.tsx`
- [ ] (Opcional) Criar modelo `ChatMensagem` e migration para persistir histórico
- [ ] (Opcional) Injetar tópico/exercício atual no prompt para respostas contextualizadas

---

## 10. Referências

- Documentação oficial da linguagem Égua: https://github.com/eguadev/docs/tree/master/docs/egua
- IDE online: http://programar.egua.dev/
- Biblioteca runtime: https://www.npmjs.com/package/@designliquido/delegua
- Groq Python SDK: https://github.com/groq/groq-python
- Groq Console (obter chave gratuita): https://console.groq.com/keys
- Modelos disponíveis no Groq: https://console.groq.com/docs/models
