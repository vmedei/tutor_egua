# TutorÉgua

Sistema Tutor Inteligente (ITS) para aprendizado de programação com a [linguagem Égua](http://programar.egua.dev/).

**Stack:** FastAPI · PostgreSQL · React · Vite · TypeScript · Groq llama-3.3-70b-versatile (gratuito)

---

## Estrutura do repositório

```
tutor_egua/
├── backend/                   # API FastAPI (Python 3.12)
│   ├── app/
│   │   ├── config.py          # Settings (lê .env)
│   │   ├── main.py            # FastAPI app, CORS, routers
│   │   ├── models/            # ORM SQLAlchemy
│   │   │   ├── aluno.py       # Aluno(id, nome, email, senha_hash)
│   │   │   ├── exercicio.py   # Exercicio(topico_id, enunciado, tipo, gabarito, casos_de_teste)
│   │   │   ├── sessao.py      # Sessao(aluno_id, exercicio_id, correto, delta_proficiencia)
│   │   │   ├── feedback.py    # FeedbackIA(sessao_id, mensagem, tokens_usados)
│   │   │   ├── progresso.py   # ProgressoAluno(aluno_id, topico_id, proficiencia, tentativas, acertos)
│   │   │   └── topico.py      # Topico(codigo, nome, nivel, ordem) + Prerequisito(topico_id, requer_id)
│   │   ├── routers/
│   │   │   ├── aluno.py       # POST /aluno/registrar  POST /aluno/login
│   │   │   ├── sessao.py      # POST /sessao/executar  POST /sessao/
│   │   │   ├── tutor.py       # GET  /tutor/proximo-exercicio  /exercicio-por-topico  /progresso-global
│   │   │   ├── exercicio.py   # GET  /exercicio/{id}
│   │   │   └── chat.py        # POST /chat/
│   │   ├── services/
│   │   │   ├── avaliador.py   # Executa código Égua e avalia saída
│   │   │   ├── modelo_aluno.py# BKT simplificado — atualiza proficiência
│   │   │   ├── seletor.py     # Seleciona próximo exercício (DAG + BKT)
│   │   │   ├── ia_feedback.py # Gera feedback textual quando o aluno erra
│   │   │   └── ia_chat.py     # Chatbot conversacional (3 modos de operação)
│   │   └── seed/              # Dados iniciais (topicos.yaml + exercicios.yaml)
│   ├── alembic/               # Migrations do banco
│   ├── egua_runner.js         # Runner de código Égua (Node.js + @designliquido/delegua)
│   ├── package.json           # Dependência: @designliquido/delegua
│   └── requirements.txt
├── frontend/                  # App React + Vite + TypeScript
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx      # Cadastro e autenticação
│       │   ├── Dashboard.tsx  # Progresso geral + gráficos
│       │   ├── Exercicio.tsx  # Resolução de exercícios
│       │   ├── Tutor.tsx      # Tutor IA (chat + grafo + progresso)
│       │   └── Historico.tsx  # Histórico de sessões
│       ├── components/
│       │   ├── ChatPanel.tsx  # Assistente conversacional com fluxo exercício
│       │   ├── GrafoProgresso.tsx # Grafo SVG de pré-requisitos clicável
│       │   ├── ProgressoTopico.tsx# Detalhes do tópico selecionado
│       │   ├── Navbar.tsx     # Navegação global + barra de progresso
│       │   ├── Modal.tsx      # Modal genérico reutilizável
│       │   ├── ProtectedRoute.tsx # Guard de rota autenticada
│       │   └── ...            # Outros componentes (ChatBot, EditorEgua, etc.)
│       └── hooks/
│           └── useProgresso.ts# Context provider do progresso global
├── adr_docs/                  # Decisões arquiteturais e contexto para IA
│   ├── 002-fundamentacao-teorica.md
│   └── agents.md
├── agents.md                  # Contexto completo do projeto (para assistentes IA)
├── docker-compose.yml
└── README.md
```

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| Docker + Docker Compose | qualquer |

```bash
python3 --version
node --version
docker --version
```

---

## Configuração inicial

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd tutor_egua
```

### 2. Variáveis de ambiente

**Backend** — copie e edite o arquivo `.env`:

```bash
cp backend/.env.example backend/.env
```

Abra `backend/.env` e preencha:

```env
DATABASE_URL=postgresql://tutor:tutor123@localhost:5432/tutoregua
DATABASE_URL_ASYNC=postgresql+asyncpg://tutor:tutor123@localhost:5432/tutoregua

# Gere com: openssl rand -hex 32
SECRET_KEY=sua-chave-secreta-aqui

# Obtenha gratuitamente em: https://console.groq.com/keys
GROQ_API_KEY=gsk_...

DEBUG=true
```

> **Como criar a chave Groq:** acesse <https://console.groq.com/keys>, crie uma conta, clique em **Create API Key** e copie a chave (começa com `gsk_`). O plano gratuito oferece 14.400 requisições/dia.

---

## Como rodar

### Opção A — Docker (recomendado)

```bash
# 1. Subir banco de dados
docker compose up -d db

# 2. Criar e ativar ambiente virtual Python
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Rodar migrations
alembic upgrade head

# 4. Popular o banco
python -m app.seed.run_seed

# 5. Iniciar a API
uvicorn app.main:app --reload --port 8000
```

Em outro terminal, subir o frontend:

```bash
cd frontend
npm install
npm run dev
# Acesse: http://localhost:5173
```

### Opção B — Docker completo

```bash
docker compose up --build -d
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed.run_seed
curl http://localhost:8000/health
# → {"status":"ok","app":"TutorÉgua"}
```

---

## Seed (dados iniciais)

```bash
# Inserir/atualizar sem apagar dados existentes
python -m app.seed.run_seed

# Apagar tudo (exceto alunos) e reinserir do zero
python -m app.seed.run_seed --clear
```

O `--clear` remove sessões, progresso, exercícios, pré-requisitos e tópicos antes de reinserir, preservando os alunos cadastrados. Necessário após alterar `topicos.yaml` ou `exercicios.yaml`.

---

## Usuário de teste

| Campo | Valor |
|---|---|
| E-mail | `aluno@teste.com` |
| Senha | `senha123` |

---

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Saúde da API |
| POST | `/aluno/registrar` | Criar conta |
| POST | `/aluno/login` | Autenticar (retorna JWT + aluno_id) |
| GET | `/tutor/proximo-exercicio/{aluno_id}` | Próximo exercício não concluído (modo livre) |
| GET | `/tutor/exercicio-por-topico/{aluno_id}/{topico_codigo}` | Próximo exercício de um tópico específico |
| GET | `/tutor/progresso-global/{aluno_id}` | Progresso em todos os tópicos com pré-requisitos |
| POST | `/sessao/executar` | Executar código Égua sem salvar |
| POST | `/sessao/` | Submeter resposta e registrar sessão |
| POST | `/chat/` | Enviar mensagem ao assistente IA |

Documentação interativa (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Páginas do frontend

| Página | Rota | Descrição |
|---|---|---|
| Login | `/` | Cadastro e autenticação |
| Dashboard | `/dashboard` | Progresso geral com gráficos |
| Exercício | `/exercicio` | Resolução guiada de exercícios |
| Tutor | `/tutor` | Chat IA + grafo de pré-requisitos + progresso por tópico |
| Histórico | `/historico` | Histórico de sessões resolvidas |

---

## Fluxo do Tutor IA

A página `/tutor` implementa um loop de aprendizagem completo:

1. **Grafo de pré-requisitos** (painel superior direito): mostra o DAG de tópicos com desbloqueio progressivo. Clicar em um nó disponível seleciona o tópico.
2. **Chat IA** (painel esquerdo): ao selecionar um tópico, pré-busca o próximo exercício e preenche o campo de texto. O aluno clica em Enviar e recebe uma explicação focada nos conceitos do exercício.
3. **Botão "Fazer exercício"**: aparece após a explicação da IA. Exibe o card do exercício no histórico do chat.
4. **Resolução do exercício**: múltipla escolha, completar código ou implementação livre com execução real.
5. **Progressão automática**: ao acertar, após 1 segundo, a IA apresenta o próximo exercício e o ciclo recomeça.

---

## Currículo — tópicos e exercícios

| # | Tópico | Conceitos |
|---|---|---|
| 1 | Introdução à Égua | `escreva()`, comentários |
| 2 | Variáveis e Tipos | `var`, tipos primitivos, `verdadeiro`/`falso` |
| 3 | Operadores | aritméticos, `==`, `e`/`ou`, `%` |
| 4 | Condicionais | `se`, `senão se`, `senão` |
| 5 | Laços de Repetição | `para`, `enquanto` |
| 6 | Funções | `função`, `retorna`, parâmetros |
| 7 | Listas e Vetores | `[]`, índices, `tamanho()` |
| 8 | Classes e Objetos | `classe`, `construtor`, `isto`, `herda` |

Grafo de pré-requisitos:

```
Introdução
  └── Variáveis
        └── Operadores
              └── Condicionais
                    ├── Laços ─────────────┐
                    └── Funções ───────────┤
                                           └── Listas
                                                 └── Classes
```

Para adicionar exercícios, edite `backend/app/seed/exercicios.yaml` e rode `python -m app.seed.run_seed --clear`.

---

## Modelo do aluno (BKT simplificado)

| Evento | Delta de proficiência |
|---|---|
| Acerto sem dica | +0.15 |
| Acerto com dica | +0.07 |
| Erro | −0.08 |
| Decaimento semanal sem revisão | −0.05 / semana |

Desbloqueio do próximo tópico: proficiência ≥ **70%** em todos os pré-requisitos.

---

## Migrations (Alembic)

```bash
# Criar nova migration após alterar modelos
alembic revision --autogenerate -m "descricao"

# Aplicar pendentes
alembic upgrade head
```

---

## Roadmap

### Implementado

- [x] Execução real de código Égua com casos de teste
- [x] Modelo de proficiência BKT por tópico
- [x] Grafo de pré-requisitos (DAG) com desbloqueio progressivo
- [x] Feedback IA quando o aluno erra (Groq llama-3.3-70b)
- [x] Dashboard com progresso global e gráfico por tópico
- [x] Histórico de sessões do aluno
- [x] Chatbot conversacional integrado à página Tutor
- [x] Fluxo tutor: explicação → exercício → progressão automática
- [x] Grafo SVG com nós clicáveis e setas de dependência
- [x] Layout responsivo de 3 painéis na página Tutor

### Próximas melhorias

- [ ] Mais exercícios por tópico (editar `backend/app/seed/exercicios.yaml`)
- [ ] Testes automatizados com `pytest` + `httpx.AsyncClient`
- [ ] Suporte a múltiplos `escreva()` em sequência (saída multi-linha)
- [ ] Persistência do histórico do chat entre sessões

---

*TutorÉgua — IA Aplicada à Educação · UFRN · 2025*
