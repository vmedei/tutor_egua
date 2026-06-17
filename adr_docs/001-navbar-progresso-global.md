# ADR 001 — Navbar global e barra de progresso de domínio da linguagem

**Status:** Aprovado  
**Data:** 2026-06-17  
**Autor:** vmedei

---

## Contexto

O TutorÉgua atualmente não tem navegação persistente entre telas nem uma visão consolidada de quanto o aluno domina a linguagem Égua como um todo. O grafo de progresso exibe a proficiência por tópico (0.0–1.0) em forma de cor de nó (vermelho → verde), mas:

- Não existe barra de progresso global visible em todas as telas
- Não há percentual numérico nos nós do grafo
- A navegação entre Login, Dashboard e Exercício é feita via redirecionamento implícito, sem componente visual de navegação
- O endpoint `GET /tutor/progresso/{aluno_id}` só retorna tópicos com registros existentes em `ProgressoAluno` — tópicos não iniciados ficam invisíveis, o que distorce a média global

---

## Decisão

### 1. Novo endpoint de progresso global (backend)

Adicionar `GET /tutor/progresso-global/{aluno_id}` que retorna:

```json
{
  "global_pct": 34.2,
  "por_topico": [
    {
      "topico_id": "...",
      "topico_nome": "Introdução à Égua",
      "proficiencia": 0.85,
      "pct": 85,
      "tentativas": 5,
      "acertos": 4
    },
    {
      "topico_id": "...",
      "topico_nome": "Classes e Objetos",
      "proficiencia": 0.0,
      "pct": 0,
      "tentativas": 0,
      "acertos": 0
    }
  ]
}
```

**Por que novo endpoint em vez de alterar o existente:**
- Não quebra o contrato atual do `GET /tutor/progresso/{aluno_id}` (usado por `GrafoProgresso`)
- Semântica distinta: o endpoint atual é para renderizar o grafo; o novo é para o painel de navegação
- O novo faz LEFT JOIN com todos os tópicos, garantindo que o denominador do global seja sempre o total de tópicos cadastrados

**Cálculo do `global_pct`:**
```
global_pct = (soma de proficiencias de TODOS os topicos) / (total de topicos) × 100
```
Tópicos não iniciados entram com `proficiencia = 0.0`.

### 2. Hook compartilhado de progresso (frontend)

Criar `frontend/src/hooks/useProgresso.ts` que:
- Faz fetch em `GET /tutor/progresso-global/{aluno_id}` uma vez por montagem
- Expõe `{ globalPct, porTopico, loading, erro, recarregar }`
- É usado tanto pela `Navbar` quanto pelo `Dashboard` — evita dois fetches

### 3. Componente `Navbar` (frontend)

Criar `frontend/src/components/Navbar.tsx`:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🐴 TutorÉgua    [Dashboard]  [Exercício]          João ▸ [Sair]       │
│  Domínio da linguagem Égua                                    34%       │
│  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │
└─────────────────────────────────────────────────────────────────────────┘
```

- Fixo no topo (`position: sticky; top: 0`)
- Links ativos destacados (rota atual)
- Barra de progresso com gradiente verde baseado no `global_pct`
- Botão "Sair" limpa token e redireciona para `/login`
- Nome do aluno lido do `localStorage` (gravado no login)

### 4. Percentual numérico nos nós do grafo

Atualizar `GrafoProgresso.tsx`:
- Cada nó exibe `"Introdução à Égua\n85%"` (nome + percentual)
- Cor mantida: `hsl(proficiencia × 120, 70%, 50%)`
- Tamanho do nó ligeiramente aumentado para acomodar o texto

### 5. Layout com Navbar em todas as rotas protegidas

Atualizar `App.tsx` para usar um layout wrapper:

```tsx
// Rotas públicas: /login
// Rotas protegidas: /dashboard, /exercicio — envolvidas em <LayoutComNavbar>
```

`LayoutComNavbar` renderiza `<Navbar>` + `<Outlet>` (React Router v6).

---

## Arquivos afetados

### Backend
| Arquivo | Mudança |
|---|---|
| `backend/app/schemas/progresso.py` | Novo schema `ProgessoGlobalResponse` |
| `backend/app/routers/tutor.py` | Novo endpoint `GET /tutor/progresso-global/{aluno_id}` |

### Frontend
| Arquivo | Mudança |
|---|---|
| `frontend/src/hooks/useProgresso.ts` | Novo hook — fetch + estado do progresso global |
| `frontend/src/components/Navbar.tsx` | Novo componente — navbar + barra de progresso |
| `frontend/src/components/GrafoProgresso.tsx` | Adicionar % numérico dentro de cada nó |
| `frontend/src/pages/Dashboard.tsx` | Consumir `useProgresso` em vez de fetch próprio |
| `frontend/src/App.tsx` | Adicionar `<LayoutComNavbar>` envolvendo rotas protegidas |

---

## Sequência de implementação

```
1. Backend: schema ProgessoGlobalResponse
2. Backend: endpoint /tutor/progresso-global
3. Frontend: hook useProgresso
4. Frontend: componente Navbar
5. Frontend: App.tsx — layout wrapper
6. Frontend: GrafoProgresso — adicionar % nos nós
7. Frontend: Dashboard — migrar para useProgresso
```

---

## Consequências

**Positivo:**
- Aluno tem referência visual permanente do seu progresso
- Navegação intuitiva sem depender de botões dispersos nas páginas
- Percentual nos nós torna o grafo autoexplicativo
- Hook compartilhado evita fetches duplicados

**Negativo / trade-offs:**
- A Navbar faz um fetch a cada montagem (página carregada) — aceitável para o escopo atual; cache pode ser adicionado depois via React Query ou SWR se necessário
- O progresso global não é ponderado por dificuldade do tópico (todos valem igual) — decisão intencional por simplicidade; pode ser revisada em ADR futuro
- `global_pct` pode parecer baixo no início (tópicos não iniciados puxam a média para zero) — comportamento esperado e pedagogicamente correto
