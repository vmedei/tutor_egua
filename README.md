# TutorÉgua

Sistema Tutor Inteligente (ITS) para aprendizado de programação com a [linguagem Égua](http://programar.egua.dev/).

**Stack:** FastAPI · PostgreSQL · Redis · React · Vite · TypeScript · Google Gemini 2.0 Flash (gratuito)

---

## Estrutura do repositório

```
tutor-egua/
├── backend/                  # API FastAPI (Python 3.12)
│   ├── app/
│   │   ├── models/           # ORM SQLAlchemy
│   │   ├── schemas/          # Validação Pydantic
│   │   ├── routers/          # Endpoints REST
│   │   ├── services/         # Lógica de negócio (BKT, IA, avaliador)
│   │   └── seed/             # Dados iniciais (tópicos e exercícios)
│   ├── alembic/              # Migrations do banco
│   ├── egua_runner.js        # Runner de código Égua (Node.js + @designliquido/delegua)
│   ├── package.json          # Dependência: @designliquido/delegua
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # App React + Vite + TypeScript
│   └── src/
│       ├── pages/            # Login, Dashboard, Exercicio
│       ├── components/
│       └── api/
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
cd tutor-egua
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
REDIS_URL=redis://localhost:6379/0

# Gere com: openssl rand -hex 32
SECRET_KEY=sua-chave-secreta-aqui

# Obtenha gratuitamente em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIza...

DEBUG=true
```

**Frontend** — já vem configurado em `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

---

## Como rodar

### Opção A — Docker (recomendado)

```bash
# 1. Construir e subir tudo
docker compose up --build -d

# 2. Rodar migrations
docker compose exec api alembic upgrade head

# 3. Popular o banco
docker compose exec api python -m app.seed.run_seed

# 4. Verificar se a API está no ar
curl http://localhost:8000/health
# → {"status":"ok","app":"TutorÉgua"}
```

Em outro terminal, subir o frontend:

```bash
cd frontend
npm install
npm run dev
# Acesse: http://localhost:5173
```

---

### Opção B — Ambiente local (sem Docker)

#### Backend

```bash
# Instalar python3-venv se não tiver (Ubuntu/Debian)
sudo apt install python3.12-venv

# Criar e ativar ambiente virtual
cd backend
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependências Python
pip install -r requirements.txt

# Instalar dependência Node.js para execução de código Égua
npm install
```

Subir banco e Redis via Docker:

```bash
# Na raiz do projeto
docker compose up -d db redis
```

Rodar migrations e seed:

```bash
cd backend
alembic upgrade head
python -m app.seed.run_seed
```

Iniciar a API:

```bash
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Seed (dados iniciais)

```bash
# Inserir/atualizar sem apagar dados existentes
python -m app.seed.run_seed

# Apagar tudo (exceto alunos) e reinserir do zero
python -m app.seed.run_seed --clear
```

O `--clear` remove sessões, progresso, exercícios, pré-requisitos e tópicos antes de reinserir, preservando os alunos cadastrados.

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
| GET | `/tutor/proximo-exercicio/{aluno_id}` | Próximo exercício não concluído |
| GET | `/tutor/progresso/{aluno_id}` | Proficiência em todos os tópicos |
| POST | `/sessao/executar` | Executar código Égua (sem salvar) |
| POST | `/sessao/` | Submeter resposta e registrar sessão |

Documentação interativa (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Execução de código Égua

O sistema executa código Égua de forma real via `egua_runner.js`, usando a biblioteca `@designliquido/delegua` programaticamente. Cada submissão de exercício do tipo `implementacao_livre` tem o código executado para cada caso de teste, com a saída comparada ao valor esperado.

```
Código do aluno → egua_runner.js → @designliquido/delegua → stdout → comparação
```

O botão **▶ Executar** testa o código sem registrar sessão (modo rascunho). O botão **✓ Submeter** executa, avalia e salva o resultado.

---

## Currículo — tópicos e exercícios

Cada tópico tem 3 exercícios (múltipla escolha + completar código + implementação livre):

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
                    ├── Laços ──── Funções
                    │                └── (Laços + Funções) → Listas
                    └── Funções                                   └── Classes
```

Para adicionar exercícios, edite `backend/app/seed/exercicios.yaml` e rode:

```bash
python -m app.seed.run_seed --clear
```

---

## Modelo do aluno (BKT simplificado)

| Evento | Delta de proficiência |
|---|---|
| Acerto sem dica | +0.15 |
| Acerto com dica | +0.07 |
| Erro | −0.08 |
| Desbloqueio de tópico filho | +0.10 no filho |
| Decaimento semanal sem revisão | −0.05 / semana |

Desbloqueio do próximo tópico: proficiência ≥ 0.70 no tópico atual.

---

## Migrations (Alembic)

```bash
# Criar nova migration após alterar modelos
alembic revision --autogenerate -m "descricao"

# Aplicar pendentes
alembic upgrade head
```

---

*TutorÉgua — IA Aplicada à Educação · UFRN · 2025*
