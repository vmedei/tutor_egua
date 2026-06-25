# ADR 002 — Fundamentação Teórica do TutorÉgua

**Status:** Ativo  
**Data:** 2025  
**Contexto:** Este documento registra as teorias pedagógicas e de ITS que fundamentam cada decisão de design do TutorÉgua, e mapeia cada teoria para o código existente. Agentes de IA devem ler este ADR antes de implementar qualquer funcionalidade que envolva progressão do aluno, seleção de exercícios, feedback, interface do grafo ou lógica do chat.

---

## Visão geral

O TutorÉgua é um **Intelligent Tutoring System (ITS)** para a linguagem de programação Égua. Suas decisões de design não são arbitrárias: cada parâmetro numérico, cada regra de progressão e cada comportamento do chat deriva de uma ou mais teorias da literatura de educação e de ITS. Alterar qualquer um desses parâmetros sem considerar a teoria subjacente pode quebrar a coerência pedagógica do sistema.

---

## 1. Zona de Desenvolvimento Proximal — Vygotsky (1978)

### O que diz a teoria
O aprendizado mais efetivo ocorre na **zona de desenvolvimento proximal (ZDP)**: a região entre o que o aluno já sabe fazer sozinho e o que ele consegue fazer com suporte. Oferecer desafios abaixo desta zona é entediante; acima, frustrante. O papel do tutor é oferecer **andaimes (scaffolding)** que permitam ao aluno operar dentro da ZDP.

### Como está implementado
- **Seleção de exercícios** (`backend/app/services/seletor.py`): exercícios são ordenados por `nivel_bloom` ascendente. O sistema seleciona o exercício mais simples disponível no tópico atual, avançando gradualmente.
- **Sequência Explicação → Exercício**: a nova interface faz o chat **explicar o tópico antes** de apresentar o exercício. A explicação é o andaime; o exercício é o desafio dentro da ZDP.
- **Chat com dicas progressivas**: o assistente não entrega a solução direta. Dá dicas em camadas (`dicas_usadas` é registrado na `Sessao`).
- **Remediação automática** (`seletor.py`, `LIMIAR_REMEDIACAO = 0.35`, `LIMIAR_ERROS_REPETIDOS = 2`): se o aluno acumula erros e proficiência baixa, o sistema volta a um pré-requisito — devolvendo-o para dentro da ZDP.

### Restrições para implementação
- **Nunca mostre um exercício sem contexto.** O chat deve sempre ter explicado o tópico antes de apresentar o card de exercício.
- **Dicas devem ser progressivas**, não revelar a solução imediatamente. O `dicas_usadas` influencia o ganho de proficiência — use-o.
- **Não remova a lógica de remediação** do seletor sem adicionar uma alternativa equivalente.

---

## 2. Mastery Learning — Bloom (1968)

### O que diz a teoria
O aluno deve demonstrar **domínio do conteúdo atual** antes de avançar para o próximo. O limiar de domínio (mastery threshold) é tipicamente 70–80% de acertos. Avançar sem dominar gera lacunas acumuladas que comprometem o aprendizado futuro.

### Como está implementado
- **Limiar de desbloqueio** (`modelo_aluno.py`): `LIMIAR_DESBLOQUEIO = 0.70` — ao atingir 70% de proficiência, o tópico seguinte recebe um bônus inicial e é "desbloqueado" visualmente no grafo.
- **Grafo de pré-requisitos** (tabela `prerequisito`): define a sequência obrigatória de tópicos. O seletor respeita a ordem.
- **Status "Dominado"** (`GrafoProgresso.tsx`, `statusFromPct`): nós com ≥ 70% são marcados como dominados (verde escuro).

### Restrições para implementação
- **O limiar é 70% (`0.70`), não 100%.** O seletor usa `proficiencia >= 1.0` para considerar um tópico *esgotado de exercícios*, o que é diferente de *dominado*. Não confunda os dois conceitos.
- **Nós sem pré-requisito cumprido devem ter sinalização visual de soft-lock** (acinzentado, cursor de aviso), mas não hard-lock. O aluno pode tentar, porém o sistema deve deixar claro que não dominou o anterior.
- **Nunca altere `LIMIAR_DESBLOQUEIO` sem justificativa teórica.** 70% é o valor consagrado na literatura de mastery learning.

---

## 3. Repetição Espaçada — Ebbinghaus / Spaced Repetition

### O que diz a teoria
A curva do esquecimento de Ebbinghaus mostra que memórias decaem exponencialmente sem revisão. A técnica de repetição espaçada combate isso agendando revisões em intervalos crescentes, justo quando a memória está prestes a ser esquecida.

### Como está implementado
- **Decaimento temporal** (`modelo_aluno.py`): `DECAIMENTO_SEMANAL = 0.05` — a proficiência diminui 5% por semana sem revisão.
- **Agendamento de revisão** (`proxima_revisao` em `ProgressoAluno`): calculado como `agora + 7 dias` após cada interação. O `_aplicar_decaimento()` é chamado na próxima atualização do progresso.
- **Grafo clicável** (nova interface): permite ao aluno revisitar voluntariamente nós cujo nível decaiu, funcionando como gatilho manual de revisão espaçada.

### Restrições para implementação
- **Não remova os campos `proxima_revisao` e `DECAIMENTO_SEMANAL`** — eles são a implementação da repetição espaçada.
- **O grafo deve mostrar visualmente nós que decaíram** (proficiência caiu abaixo do limiar desde a última interação) para incentivar revisão.
- O intervalo de 7 dias é um valor inicial razoável. Pode ser ajustado, mas deve seguir princípios de espaçamento crescente (não reduzir).

---

## 4. Taxonomia de Bloom para Design de Exercícios

### O que diz a teoria
A Taxonomia de Bloom (revisada) organiza objetivos cognitivos em seis níveis: Lembrar → Compreender → Aplicar → Analisar → Avaliar → Criar. Exercícios efetivos devem cobrir múltiplos níveis, começando pelos mais básicos.

### Como está implementado
- **Coluna `nivel_bloom`** em `Exercicio`: classifica cada exercício na taxonomia.
- **Tipos de exercício mapeados**:
  - `multipla_escolha` → Lembrar / Compreender (nível 1–2)
  - `completar_codigo` → Aplicar / Analisar (nível 3–4)
  - `implementacao_livre` → Avaliar / Criar (nível 5–6)
- **Ordenação** no seletor: `ORDER BY nivel_bloom ASC` — o aluno sempre começa pelo mais simples dentro do tópico.

### Restrições para implementação
- **Ao criar exercícios**, sempre atribuir `nivel_bloom` coerente com o tipo.
- **Não inverter a ordem de apresentação** dentro de um tópico — os exercícios de lembrar/compreender sempre vêm antes dos de criar/avaliar.
- Novos tipos de exercício criados no futuro devem ser mapeados explicitamente a um nível da taxonomia.

---

## 5. Feedback Imediato e Explicativo — Anderson et al. (ACT-R)

### O que diz a teoria
O tutor ACT-R de John Anderson demonstrou que feedback imediato, específico e explicativo acelera dramaticamente o aprendizado. O feedback deve apontar **por que** o erro ocorreu, não apenas que está errado. Isso favorece a metacognição — o aluno aprende a monitorar seu próprio raciocínio.

### Como está implementado
- **`ia_feedback.py`**: gera feedback explicativo via LLM (Groq/llama) quando o aluno erra. O prompt instrui a IA a explicar o raciocínio correto, não apenas apontar o erro.
- **`detalhe`** na `SessaoResponse`: campo para feedback determinístico (ex: "Saída esperada: X, obtida: Y").
- **Inline no chat**: na nova interface, o feedback aparece como mensagem do assistente dentro da conversa, mantendo o contexto pedagógico.

### Restrições para implementação
- **Feedback deve sempre ser gerado quando o aluno erra**, mesmo que seja uma mensagem padrão.
- **Não mostre apenas "Errado" sem explicação.** O `detalhe` e o `feedback` da IA devem sempre estar presentes.
- **O feedback da IA deve aparecer antes do botão "Tentar novamente"**, não depois — o aluno lê a explicação antes de tentar de novo.
- Manter a instrução no system prompt que proíbe entregar a solução direta: o feedback deve guiar, não resolver.

---

## 6. Mapa: Teoria → Parâmetros de código

| Teoria | Parâmetro / Constante | Arquivo | Valor |
|---|---|---|---|
| Mastery Learning | `LIMIAR_DESBLOQUEIO` | `modelo_aluno.py` | `0.70` (70%) |
| Mastery Learning | `BONUS_DESBLOQUEIO` | `modelo_aluno.py` | `0.10` |
| ZDP | `LIMIAR_REMEDIACAO` | `seletor.py` | `0.35` |
| ZDP | `LIMIAR_ERROS_REPETIDOS` | `seletor.py` | `2` |
| ACT-R | `GANHO_ACERTO` | `modelo_aluno.py` | `0.15` |
| ACT-R | `GANHO_COM_DICA` | `modelo_aluno.py` | `0.07` |
| ACT-R | `PERDA_ERRO` | `modelo_aluno.py` | `0.08` |
| Ebbinghaus | `DECAIMENTO_SEMANAL` | `modelo_aluno.py` | `0.05` |
| Ebbinghaus | `INTERVALO_REVISAO_DIAS` | `modelo_aluno.py` | `7` |
| Bloom (exercícios) | `nivel_bloom` | `Exercicio` (model) | 1–6 |
| Bloom (threshold) | `statusFromPct` ≥ 70 = "Dominado" | `GrafoProgresso.tsx` | `70` |

---

## 7. Tensão pedagógica: autonomia vs. sequência obrigatória

A nova interface permite ao aluno **escolher qual nó do grafo estudar**. Isso entra em tensão com o mastery learning, que pressupõe sequência obrigatória.

**Resolução adotada: soft-lock visual**
- Nós com pré-requisitos não cumpridos (proficiência do predecessor < 70%) são exibidos acinzentados no grafo.
- Ao clicar em um nó soft-locked, o chat exibe uma mensagem explicando que o tópico anterior ainda não foi dominado e sugere estudá-lo primeiro.
- O aluno **pode insistir** (o sistema não bloqueia por hard), mas o grafo deixa claro a situação.
- Nós desbloqueados (pré-requisito ≥ 70%) ficam com aparência normal e são plenamente clicáveis.

Este comportamento preserva a teoria de mastery learning sem infantilizar o aluno.

---

## Referências bibliográficas

- Vygotsky, L. S. (1978). *Mind in Society: The Development of Higher Psychological Processes*. Harvard University Press.
- Bloom, B. S. (1968). Learning for Mastery. *Evaluation Comment*, 1(2).
- Ebbinghaus, H. (1885). *Über das Gedächtnis*. Duncker & Humblot.
- Anderson, J. R., Corbett, A. T., Koedinger, K. R., & Pelletier, R. (1995). Cognitive Tutors: Lessons Learned. *The Journal of the Learning Sciences*, 4(2), 167–207.
- Bloom, B. S., Engelhart, M. D., Furst, E. J., Hill, W. H., & Krathwohl, D. R. (1956). *Taxonomy of Educational Objectives: The Classification of Educational Goals. Handbook I: Cognitive Domain*. David McKay Company.
