# Migração: Gemini → Groq

**Motivação:** O plano gratuito do Gemini (1 M tokens/dia) esgota rapidamente em uso simultâneo.
A Groq oferece `llama-3.3-70b-versatile` gratuitamente com 14.400 requisições/dia, sem limite de
tokens/dia e latência menor. A API é compatível com o padrão OpenAI, tornando a migração mínima.

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `backend/requirements.txt` | Trocar `google-generativeai` → `groq` |
| `backend/app/config.py` | Renomear `gemini_api_key` → `groq_api_key` |
| `backend/app/services/ia_chat.py` | Reescrever chamada de API |
| `backend/app/services/ia_feedback.py` | Reescrever chamada de API |
| `backend/.env.example` | Atualizar variável e URL |
| `backend/.env` | Adicionar `GROQ_API_KEY` (manual, não commitado) |
| `agent.md` | Atualizar seções 2, 3, 8 e 10 |
| `docker-compose.yml` | Nenhuma mudança (usa `env_file`) |
| `backend/Dockerfile` | Nenhuma mudança |
| `frontend/` | Nenhuma mudança |

---

## Passo 1 — Obter a chave Groq

1. Acesse <https://console.groq.com/keys> e crie uma conta (Google ou GitHub)
2. Clique em **Create API Key**, copie a chave (começa com `gsk_`)
3. Adicione ao `backend/.env`:
   ```
   GROQ_API_KEY=gsk_...
   ```

---

## Passo 2 — `backend/requirements.txt`

Remover:
```
google-generativeai==0.8.3
```

Adicionar:
```
groq==0.13.0
```

---

## Passo 3 — `backend/app/config.py`

```python
# Antes
gemini_api_key: str = ""

# Depois
groq_api_key: str = ""
```

---

## Passo 4 — `backend/app/services/ia_chat.py`

Substituir o bloco de importação e inicialização do cliente:

```python
# Antes
import google.generativeai as genai
genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction=SYSTEM_PROMPT,
    generation_config=genai.GenerationConfig(max_output_tokens=800),
)

# Depois
from groq import AsyncGroq
_client = AsyncGroq(api_key=settings.groq_api_key)
```

Substituir a verificação de chave e a montagem do histórico dentro de `responder()`:

```python
# Antes
if not settings.gemini_api_key:
    return "Chatbot indisponível: chave GEMINI_API_KEY não configurada.", 0

contents = []
for msg in historico:
    role = "user" if msg.papel == "aluno" else "model"
    contents.append({"role": role, "parts": [{"text": msg.texto}]})

texto_final = (prefixo + mensagem) if (prefixo and not historico) else mensagem
contents.append({"role": "user", "parts": [{"text": texto_final}]})

resposta = await _model.generate_content_async(contents)
tokens = resposta.usage_metadata.total_token_count if resposta.usage_metadata else 0
return resposta.text, tokens

# Depois
if not settings.groq_api_key:
    return "Chatbot indisponível: chave GROQ_API_KEY não configurada.", 0

messages = [{"role": "system", "content": SYSTEM_PROMPT}]
for msg in historico:
    role = "user" if msg.papel == "aluno" else "assistant"
    messages.append({"role": role, "content": msg.texto})

texto_final = (prefixo + mensagem) if (prefixo and not historico) else mensagem
messages.append({"role": "user", "content": texto_final})

response = await _client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=messages,
    max_tokens=800,
)
tokens = response.usage.total_tokens if response.usage else 0
return response.choices[0].message.content, tokens
```

Atualizar o bloco de tratamento de erro (padrão de mensagem de rate limit diferente):

```python
# Antes
if "429" in msg or "quota" in msg.lower():
    match = re.search(r"retry in (\d+)", msg, re.IGNORECASE)

# Depois
if "429" in msg or "rate" in msg.lower():
    match = re.search(r"try again in (\d+)", msg, re.IGNORECASE)
```

---

## Passo 5 — `backend/app/services/ia_feedback.py`

Substituir importação e cliente:

```python
# Antes
import google.generativeai as genai
genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=genai.GenerationConfig(max_output_tokens=500),
)

# Depois
from groq import AsyncGroq
_client = AsyncGroq(api_key=settings.groq_api_key)
```

Substituir a verificação de chave e a chamada dentro de `gerar_feedback()`:

```python
# Antes
if not settings.gemini_api_key:
    return None

resposta = await _model.generate_content_async(prompt)
texto = resposta.text
tokens = resposta.usage_metadata.total_token_count if resposta.usage_metadata else 0

# Depois
if not settings.groq_api_key:
    return None

response = await _client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": prompt}],
    max_tokens=500,
)
texto = response.choices[0].message.content
tokens = response.usage.total_tokens if response.usage else 0
```

---

## Passo 6 — `backend/.env.example`

```bash
# Antes
# IA — obtenha gratuitamente em https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIza...

# Depois
# IA — obtenha gratuitamente em https://console.groq.com/keys
GROQ_API_KEY=gsk_...
```

---

## Passo 7 — `agent.md`

### Seção 2 — diagrama de arquitetura

```
# Antes
│  Google Gemini 2.0 Flash (free)  │
│  gemini-2.0-flash                │

# Depois
│  Groq Cloud (free tier)          │
│  llama-3.3-70b-versatile         │
```

### Seção 3 — integração existente

Substituir o bloco de código de referência e os limites do plano gratuito:

````markdown
O serviço `backend/app/services/ia_feedback.py` é o padrão a seguir:

```python
from groq import AsyncGroq
from app.config import settings

_client = AsyncGroq(api_key=settings.groq_api_key)

response = await _client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": prompt}],
    max_tokens=500,
)
texto = response.choices[0].message.content
tokens = response.usage.total_tokens
```

A chave `GROQ_API_KEY` já está em `backend/.env` e no `Settings`.

**Limites do plano gratuito (Groq — llama-3.3-70b-versatile):**
- 30 requisições/minuto
- 14.400 requisições/dia
- 6.000 tokens/minuto
````

### Seção 8 — chamada com histórico

Substituir o exemplo de `generate_content` com `contents` pelo padrão OpenAI com `messages`:

````markdown
```python
from groq import AsyncGroq
from app.config import settings

_client = AsyncGroq(api_key=settings.groq_api_key)

async def responder_chat(mensagem: str, historico: list[dict]) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in historico:
        role = "user" if msg["papel"] == "aluno" else "assistant"
        messages.append({"role": role, "content": msg["texto"]})
    messages.append({"role": "user", "content": mensagem})

    response = await _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=800,
    )
    return response.choices[0].message.content
```
````

### Seção 10 — referências

Remover:
- `Google Generative AI Python SDK: https://ai.google.dev/gemini-api/docs`
- `Google AI Studio (obter chave gratuita): https://aistudio.google.com/app/apikey`

Adicionar:
- `Groq Python SDK: https://github.com/groq/groq-python`
- `Groq Console (obter chave gratuita): https://console.groq.com/keys`
- `Modelos disponíveis no Groq: https://console.groq.com/docs/models`

---

## Passo 8 — Reconstruir e testar

```bash
# Reconstruir imagem do backend (reinstala dependências)
docker compose up --build api

# Testar feedback (ia_feedback.py)
curl -X POST http://localhost:8000/sessao/executar \
  -H "Content-Type: application/json" \
  -d '{"exercicio_id": "<uuid>", "resposta": "escreva(1)"}'

# Testar chatbot (ia_chat.py)
curl -X POST http://localhost:8000/chat/ \
  -H "Content-Type: application/json" \
  -d '{"mensagem": "Como funciona o leia()?", "historico": []}'
```

---

## Diferenças conceituais Gemini → Groq

| Aspecto | Gemini SDK | Groq SDK |
|---|---|---|
| Pacote Python | `google-generativeai` | `groq` |
| Variável de ambiente | `GEMINI_API_KEY` | `GROQ_API_KEY` |
| Modelo | `gemini-2.0-flash` | `llama-3.3-70b-versatile` |
| Cliente assíncrono | `genai.GenerativeModel` | `AsyncGroq` |
| System prompt | `system_instruction=` no construtor | `{"role": "system", ...}` em `messages` |
| Papel do assistente no histórico | `"model"` | `"assistant"` |
| Método de chamada | `generate_content_async(contents)` | `chat.completions.create(messages=...)` |
| Texto da resposta | `resposta.text` | `response.choices[0].message.content` |
| Total de tokens | `resposta.usage_metadata.total_token_count` | `response.usage.total_tokens` |
| Mensagem de rate limit | `"retry in N"` | `"try again in N"` |
