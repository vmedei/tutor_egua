# agents.md — Contexto do TutorÉgua

Este documento descreve o estado atual do sistema. Leia-o inteiramente antes de escrever qualquer código.

> **Fundamentação teórica completa:** [`adr_docs/002-fundamentacao-teorica.md`](adr_docs/002-fundamentacao-teorica.md)  
> Leia o ADR antes de alterar qualquer lógica de progressão, seleção de exercícios, feedback ou interface do grafo.

---

## 0. Restrições pedagógicas obrigatórias

Estas regras derivam das teorias de ITS documentadas no ADR 002. Violá-las quebra a coerência pedagógica do sistema.

| Regra | Teoria | Onde no código |
|---|---|---|
| Limiar de desbloqueio = **70%** de proficiência em todos os pré-requisitos | Mastery Learning (Bloom) | `LIMIAR_DESBLOQUEIO = 0.70` em `modelo_aluno.py`; `LIMIAR_DESBLOQUEIO = 70` em `GrafoProgresso.tsx` |
| Exercícios ordenados do mais simples ao mais complexo dentro do tópico | Taxonomia de Bloom | `ORDER BY nivel_bloom ASC` em `seletor.py` |
| O chat explica o tópico **antes** de apresentar o exercício | ZDP (Vygotsky) | Fluxo obrigatório no `ChatPanel.tsx`: IA explica → botão "Fazer exercício" |
| Feedback sempre explicativo quando o aluno erra, nunca só "errado" | ACT-R (Anderson) | `ia_feedback.py` + campo `detalhe` na resposta de `/sessao/` |
| Dicas são progressivas; o chat nunca entrega a solução direta | ZDP (Vygotsky) | System prompt de `ia_chat.py` — modo "dúvida durante exercício" |
| Nós sem pré-requisito cumprido são soft-locked (visual), não hard-locked | Mastery Learning | `GrafoProgresso.tsx` — opacidade 55%, cursor desabilitado |
| `proxima_revisao` e `DECAIMENTO_SEMANAL` não devem ser removidos | Ebbinghaus / Spaced Repetition | `modelo_aluno.py` |
| Remediação: se proficiência ≤ 35% e ≥ 2 erros, voltar ao pré-requisito | ZDP (Vygotsky) | `seletor.py` — `LIMIAR_REMEDIACAO`, `LIMIAR_ERROS_REPETIDOS` |

---

## 1. O que é o TutorÉgua

Sistema Tutor Inteligente (ITS) voltado para o ensino da linguagem de programação **Égua** — uma linguagem didática com sintaxe em português, desenvolvida para iniciantes. O sistema:

- Apresenta exercícios progressivos organizados em tópicos conectados por um DAG de pré-requisitos
- Executa código Égua de forma real, comparando saída com casos de teste
- Atualiza um modelo de proficiência por tópico (BKT simplificado)
- Gera feedback via IA (Groq — llama-3.3-70b-versatile) quando o aluno erra
- Oferece um assistente conversacional na página Tutor que explica conceitos, apresenta exercícios e avança automaticamente após acertos

---

## 2. Arquitetura do sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend  React + Vite + TypeScript (porta 5173)                   │
│                                                                     │
│  Páginas: Login · Dashboard · Exercicio · Tutor · Historico         │
│                                                                     │
│  Componentes-chave:                                                 │
│    ChatPanel      — assistente conversacional + fluxo de exercício  │
│    GrafoProgresso — DAG SVG com nós clicáveis e setas               │
│    ProgressoTopico— detalhes de proficiência do tópico selecionado  │
│    Navbar         — nav global + barra de progresso                 │
│                                                                     │
│  Hook:  useProgresso (ProgressoContext)                             │
│    — estado global de progresso; polling via recarregar()           │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/JSON (axios)
┌────────────────────────────▼────────────────────────────────────────┐
│  Backend  FastAPI Python 3.12 (porta 8000)                          │
│                                                                     │
│  Routers: /aluno  /exercicio  /sessao  /tutor  /chat                │
│                                                                     │
│  Services:                                                          │
│    avaliador.py    — executa egua_runner.js e compara saídas        │
│    modelo_aluno.py — BKT: atualiza proficiência, decaimento         │
│    seletor.py      — seleciona próximo exercício via DAG + BKT      │
│    ia_feedback.py  — feedback textual quando o aluno erra           │
│    ia_chat.py      — chatbot com 3 modos de operação                │
│                                                                     │
│  egua_runner.js  (@designliquido/delegua via Node.js)               │
└───────┬───────────────────────────┬─────────────────────────────────┘
        │                           │
┌───────▼──────┐       ┌────────────▼─────────────────────────────────┐
│  PostgreSQL  │       │  Groq Cloud (free tier)                      │
│  (Docker)    │       │  llama-3.3-70b-versatile                     │
└──────────────┘       └──────────────────────────────────────────────┘
```

---

## 3. Estrutura de arquivos relevante

```
backend/
├── app/
│   ├── config.py           # Settings (lê .env) — GROQ_API_KEY aqui
│   ├── main.py             # FastAPI app, CORS, todos os routers
│   ├── models/
│   │   ├── aluno.py        # Aluno(id, nome, email, senha_hash)
│   │   ├── exercicio.py    # Exercicio(topico_id, enunciado, tipo, gabarito, casos_de_teste, nivel_bloom)
│   │   ├── sessao.py       # Sessao(aluno_id, exercicio_id, resposta, correto, delta_proficiencia)
│   │   ├── feedback.py     # FeedbackIA(sessao_id, mensagem, tokens_usados)
│   │   ├── progresso.py    # ProgressoAluno(aluno_id, topico_id, proficiencia, tentativas, acertos, proxima_revisao)
│   │   └── topico.py       # Topico(codigo, nome, nivel, ordem) + Prerequisito(topico_id, requer_id)
│   ├── routers/
│   │   ├── aluno.py        # POST /aluno/registrar  POST /aluno/login
│   │   ├── sessao.py       # POST /sessao/executar  POST /sessao/
│   │   ├── tutor.py        # GET  /tutor/proximo-exercicio/{aluno_id}
│   │   │                   # GET  /tutor/exercicio-por-topico/{aluno_id}/{topico_codigo}
│   │   │                   # GET  /tutor/progresso-global/{aluno_id}
│   │   └── chat.py         # POST /chat/
│   ├── schemas/
│   │   ├── chat.py         # ChatPayload, ChatResponse, MensagemHistorico
│   │   ├── progresso.py    # TopicoProgressoItem (inclui prerequisitos: list[str])
│   │   │                   # ProgressoGlobalResponse(global_pct, por_topico)
│   │   └── exercicio.py    # ExercicioResponse
│   └── services/
│       ├── avaliador.py    # run_egua(codigo, casos_de_teste) → ResultadoExecucao
│       ├── modelo_aluno.py # atualizar_proficiencia(), LIMIAR_DESBLOQUEIO=0.70
│       ├── seletor.py      # selecionar_exercicio() — lógica BKT + DAG
│       ├── ia_feedback.py  # gerar_feedback() — chamada Groq para feedback de erro
│       └── ia_chat.py      # responder() — chatbot com system prompt + 3 modos
frontend/
└── src/
    ├── api/
    │   └── client.ts       # axios instance → http://localhost:8000
    ├── hooks/
    │   └── useProgresso.ts # ProgressoProvider + useProgresso() hook
    │                       # Chama GET /tutor/progresso-global/{alunoId}
    │                       # Expõe: globalPct, porTopico, loading, recarregar()
    ├── pages/
    │   ├── Login.tsx        # Cadastro + autenticação, salva aluno_id no localStorage
    │   ├── Dashboard.tsx    # Gráficos de progresso global e por tópico
    │   ├── Exercicio.tsx    # Resolução guiada — editor, execução, submissão, feedback
    │   ├── Tutor.tsx        # Layout 3 painéis: ChatPanel | GrafoProgresso + ProgressoTopico
    │   └── Historico.tsx    # Histórico de sessões passadas
    └── components/
        ├── ChatPanel.tsx    # Assistente conversacional (ver seção 5)
        ├── GrafoProgresso.tsx # DAG SVG (ver seção 6)
        ├── ProgressoTopico.tsx# Proficiência + acertos/tentativas do tópico ativo
        ├── Navbar.tsx       # Links + barra de progresso global
        ├── Modal.tsx        # Modal genérico reutilizável
        └── ProtectedRoute.tsx # Redireciona para / se não autenticado
```

---

## 4. Endpoints da API

### Aluno

```
POST /aluno/registrar     { nome, email, senha } → { id, nome, email }
POST /aluno/login         { email, senha }        → { token, aluno_id, nome }
```

### Sessão

```
POST /sessao/executar     { codigo, casos_de_teste } → ResultadoExecucao
     # Executa sem salvar. Retorna: { saidas: [{entrada, saida_esperada, saida_obtida, correto}],
     #                                todos_corretos, erro }

POST /sessao/             { aluno_id, exercicio_id, resposta, dicas_usadas }
     # Avalia, salva sessão, atualiza proficiência.
     # Retorna: { correto, delta_proficiencia, feedback, detalhe }
```

### Tutor

```
GET /tutor/proximo-exercicio/{aluno_id}
    → ExercicioResponse   # Próximo exercício não tentado (qualquer tópico)

GET /tutor/exercicio-por-topico/{aluno_id}/{topico_codigo}
    → ExercicioResponse   # Próximo exercício não tentado de um tópico específico
    # 404 se todos os exercícios do tópico já foram tentados

GET /tutor/progresso-global/{aluno_id}
    → { global_pct: float, por_topico: TopicoProgressoItem[] }
    # TopicoProgressoItem: { topico_id, topico_codigo, topico_nome,
    #                        proficiencia, pct, tentativas, acertos,
    #                        prerequisitos: string[] }  ← códigos dos pré-requisitos
```

### Chat

```
POST /chat/   { mensagem, historico, contexto_topico, contexto_exercicio }
     → { resposta: string, tokens_usados: int }
```

---

## 5. ChatPanel — fluxo e implementação

`frontend/src/components/ChatPanel.tsx` é o componente central da experiência de tutoria.

### Estados principais

| Estado | Tipo | Propósito |
|---|---|---|
| `historico` | `Mensagem[]` | Histórico do chat (texto ou card de exercício) |
| `proximoExercicio` | `ExercicioData \| null` | Exercício pré-buscado, aguardando ser exibido |
| `contextoExercicio` | `string` | Enunciado enviado ao backend como contexto |
| `carregando` | `boolean` | IA respondendo |
| `buscandoExercicio` | `boolean` | Fetch do próximo exercício em andamento |

### Fluxo ao selecionar tópico

```
useEffect([topicoSelecionado.codigo]) →
  limpa histórico + estado
  preenche input: "quero estudar sobre {nome}"
  buscarProximoExercicio() → armazena em proximoExercicio + seta contextoExercicio
```

### Fluxo ao clicar Enviar

```
enviar() →
  adiciona mensagem do aluno ao histórico
  POST /chat/ com { mensagem, historico, contexto_topico, contexto_exercicio }
  adiciona resposta da IA ao histórico
  → botão "Fazer exercício" aparece (proximoExercicio !== null && temRespostaIA)
```

### Fluxo ao clicar "Fazer exercício"

```
mostrarExercicio() →
  adiciona card ExercicioCard ao histórico
  limpa proximoExercicio
```

### Fluxo após acerto (ExercicioCard)

```
ExercicioCard.useEffect([submissao.correto]) →
  setTimeout(onProximoExercicio, 1000)   ← progressão automática após 1 s
  (botão "Pular espera →" antecipa)

onProximoExercicio = aoProximoExercicio() →
  GET /tutor/exercicio-por-topico → seta proximoExercicio + contextoExercicio
  POST /chat/ com mensagem "[próximo-exercício]" (trigger interno, não aparece na UI)
  adiciona resposta da IA ao histórico
  → botão "Fazer exercício" aparece novamente
```

### Tipo de mensagem no histórico

```ts
type Mensagem = MensagemTexto | MensagemExercicio;
// MensagemTexto: { id, papel: "aluno"|"assistente", tipo?: "aviso", texto }
// MensagemExercicio: { id, papel: "sistema", tipo: "exercicio", exercicio: ExercicioData }
```

---

## 6. GrafoProgresso — implementação do DAG

`frontend/src/components/GrafoProgresso.tsx`

### Props

```ts
{
  porTopico: TopicoProgresso[];     // dados de progresso incluindo prerequisitos: string[]
  compacto?: boolean;               // modo lista (sem SVG)
  embedded?: boolean;               // true na página Tutor (flex: 1, sem altura mínima)
  onNodeClick?: (codigo, nome) => void;
  topicoSelecionado?: string | null; // código do tópico selecionado (destaca borda)
}
```

### Lógica de desbloqueio

```ts
const disponivel =
  item.prerequisitos.length === 0 ||
  item.prerequisitos.every(
    (prereqCodigo) => (pctByCode.get(prereqCodigo) ?? 0) >= LIMIAR_DESBLOQUEIO  // 70
  );
```

### Layout do grafo

- Grade de 4 colunas (`COLS_PER_ROW = 4`), nós posicionados por `(index % 4, Math.floor(index / 4))`
- SVG absoluto sobre a área de nós, com `<marker>` arrowhead e curvas bézier por aresta real do DAG
- Modo embedded: `flex: 1; min-height: 0; overflow-y: auto`

---

## 7. ia_chat.py — modos de operação do chatbot

O backend detecta o modo a partir do conteúdo da mensagem e do histórico:

### Modo 1: apresentação de exercício

**Ativado quando:** `not historico and contexto_exercicio`

**Payload enviado ao Groq:**
```
Tópico: {contexto_topico}
Próximo exercício: {contexto_exercicio}

{mensagem do aluno}
```

**Comportamento esperado:** IA explica os 1-2 conceitos necessários para o exercício, termina com convite ao exercício.

### Modo 2: próximo exercício após acerto

**Ativado quando:** `mensagem.startswith("[próximo-exercício]")`

**Payload enviado ao Groq:**
```
[próximo-exercício]
Tópico: {contexto_topico}
Próximo exercício: {contexto_exercicio}
```

**Comportamento esperado:** breve parabéns + introdução ao próximo exercício + convite ao exercício.

### Modo 3: dúvida durante exercício

**Ativado quando:** `historico` não vazio e exercício em andamento

**Payload enviado ao Groq:**
```
[Tópico: {topico} | Exercício em andamento: {exercicio}]

{mensagem do aluno}
```

**Comportamento esperado:** responde diretamente a dúvida com dicas progressivas, sem revelar a solução.

---

## 8. useProgresso — contexto global de progresso

`frontend/src/hooks/useProgresso.ts`

Provê estado global de progresso via React Context. Qualquer componente dentro de `<ProgressoProvider>` pode chamar `useProgresso()`.

```ts
interface ProgressoCtxType {
  globalPct: number;           // percentual global (0-100)
  porTopico: TopicoProgresso[];// lista completa com prerequisitos
  loading: boolean;
  error: string | null;
  recarregar: () => void;      // chama GET /tutor/progresso-global novamente
}
```

`recarregar()` é chamado automaticamente após cada submissão (em `ExercicioCard` e em `Exercicio.tsx`) para atualizar grafo, navbar e ProgressoTopico.

---

## 9. Modelo do aluno (BKT simplificado)

`backend/app/services/modelo_aluno.py`

| Evento | Delta |
|---|---|
| Acerto sem dica (`dicas_usadas == 0`) | +0.15 |
| Acerto com dica | +0.07 |
| Erro | −0.08 |
| Decaimento semanal (`proxima_revisao` expirada) | −0.05/semana acumulado |

Proficiência armazenada em `[0.0, 1.0]`. Frontend exibe como `pct = round(proficiencia * 100)`.

Remediação em `seletor.py`: se `proficiencia ≤ LIMIAR_REMEDIACAO (0.35)` e `tentativas_erradas ≥ LIMIAR_ERROS_REPETIDOS (2)`, retorna exercícios do tópico pré-requisito ao invés do tópico atual.

---

## 10. Integração Groq

```python
from groq import AsyncGroq
from app.config import settings

_client = AsyncGroq(api_key=settings.groq_api_key)

response = await _client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=messages,   # lista de {"role": "system"|"user"|"assistant", "content": "..."}
    max_tokens=800,
)
texto = response.choices[0].message.content
tokens = response.usage.total_tokens
```

**Limites do plano gratuito:**
- 30 requisições/minuto
- 14.400 requisições/dia
- 6.000 tokens/minuto

Erros 429 são capturados em `ia_chat.py` e relançados como `HTTPException(status_code=429)`. O frontend exibe a mensagem e inicia um contador regressivo.

---

## 11. Seed de dados

`backend/app/seed/topicos.yaml` — define tópicos e pré-requisitos:

```yaml
- codigo: listas
  nome: Listas e Vetores
  nivel: intermediario
  ordem: 7
  prerequisitos: [lacos, funcoes]   # ← DOIS pré-requisitos (DAG não-linear)
```

`backend/app/seed/exercicios.yaml` — define exercícios por tópico (tipo: `multipla_escolha`, `completar_codigo`, `implementacao_livre`).

Após qualquer alteração nesses arquivos, rodar:
```bash
python -m app.seed.run_seed --clear
```

---

## 12. Referência da linguagem Égua

Égua é executada por `@designliquido/delegua` (Node.js). IDE online: http://programar.egua.dev/

### Saída e entrada
```egua
escreva("Olá, Mundo!")
var nome = leia()          // retorna STRING sempre
var n = inteiro(leia())    // converta antes de comparar com números
```

### Variáveis e tipos
```egua
var nome = "Maria"     // texto
var idade = 18         // inteiro
var preco = 9.99       // real
var ativo = verdadeiro // booleano
var vazio = nulo
```

### Operadores
```egua
+  -  *  /  %  **          // aritméticos (** = potência)
==  !=  >  <  >=  <=       // comparação
e   ou   em                // lógicos
```

### Condicionais
```egua
se (nota >= 7) {
  escreva("aprovado")
} senão se (nota >= 5) {
  escreva("recuperação")
} senão {
  escreva("reprovado")
}

escolha (dia) {
  caso 1: escreva("segunda")
  caso 2: escreva("terça")
  outro:  escreva("outro dia")
}
```

### Laços
```egua
para (var i = 0; i < 5; i = i + 1) { escreva(i) }
enquanto (x < 10) { x = x + 1 }
faça { escreva("ao menos uma vez") } enquanto (condicao)
```

### Funções
```egua
função soma(a, b) { retorna a + b }
var dobrar = função(n) { retorna n * 2 }
```

### Listas
```egua
var frutas = ["maçã", "banana"]
escreva(frutas[0])                    // índice começa em 0
frutas[tamanho(frutas)] = "laranja"   // adicionar
ordenar(frutas)
var dobros = mapear([1,2,3], função(n) { retorna n * 2 })
```

### Classes
```egua
classe Animal {
  construtor(nome, som) {
    isto.nome = nome
    isto.som = som
  }
  falar() { escreva(isto.nome + " faz " + isto.som) }
}
classe Cachorro herda Animal {
  construtor(nome) { super("cachorro", "au") }
}
```

### Armadilhas comuns
```egua
// ERRADO — leia() retorna string
var n = leia()
se (n > 0) { ... }   // sempre falso

// CORRETO
var n = inteiro(leia())
se (n > 0) { ... }

i = i + 1            // não existe i++
escreva("Res: " + texto(42))   // concatenar número com string requer texto()
```

### Funções embutidas

| Função | Descrição |
|---|---|
| `escreva(v)` | Exibe na tela |
| `leia()` | Lê entrada (retorna string) |
| `inteiro(v)` | Converte para inteiro |
| `real(v)` | Converte para real |
| `texto(v)` | Converte para string |
| `tamanho(lista)` | Comprimento |
| `mapear(lista, fn)` | Aplica função a cada elemento |
| `ordenar(lista)` | Ordena in-place |
| `aleatorio()` | Float aleatório 0..1 |
| `aleatorioEntre(min, max)` | Inteiro aleatório (max exclusivo) |

---

## 13. Referências

- Documentação Égua: https://github.com/eguadev/docs/tree/master/docs/egua
- IDE online: http://programar.egua.dev/
- Runtime: https://www.npmjs.com/package/@designliquido/delegua
- Groq Python SDK: https://github.com/groq/groq-python
- Groq Console: https://console.groq.com/keys
