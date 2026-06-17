# adr_docs — Arquivo de Decisões e Contexto do Projeto

## O que é esta pasta

`adr_docs/` é o repositório de **decisões arquiteturais, contexto de projeto e instruções para assistentes de IA** do TutorÉgua.

O nome vem de **ADR — Architecture Decision Records**, uma prática de engenharia de software que consiste em registrar, de forma estruturada, *o quê* foi decidido, *por quê* e *quais alternativas foram consideradas*. O objetivo é que qualquer desenvolvedor (ou assistente de IA) que entre no projeto meses depois consiga entender as motivações por trás das escolhas feitas, sem precisar vasculhar o histórico de commits ou perguntar para quem estava presente.

---

## Por que manter esta pasta

Em projetos que envolvem assistentes de IA como colaboradores ativos (Claude Code, GitHub Copilot, Cursor, etc.), há um desafio que não existia no desenvolvimento tradicional: **cada nova sessão começa do zero**. O assistente não tem memória das decisões anteriores, dos problemas que já foram resolvidos nem das restrições que guiaram as escolhas de design.

Esta pasta resolve esse problema. Ela funciona como a memória persistente do projeto — um lugar onde o humano e o assistente de IA registram juntos o raciocínio por trás das mudanças, para que futuras sessões possam continuar o trabalho com contexto completo.

### O que NÃO fica aqui

- Logs brutos de conversa com LLMs — esses são efêmeros e não agregam valor ao repositório
- Código em andamento ou rascunhos temporários — esses pertencem a branches ou stashes
- Histórico de *o quê* foi mudado — isso já está no `git log` com mensagens de commit

O `git log` responde *o quê* mudou. Esta pasta responde **por quê**.

---

## Convenção de nomenclatura

Cada arquivo representa uma decisão ou um contexto. Use nomes descritivos no formato:

```
NNN-assunto-curto.md
```

Exemplos:
- `001-escolha-de-stack.md`
- `002-modelo-do-aluno-bkt.md`
- `003-migracao-gemini-groq.md`

O número garante ordenação cronológica. O assunto deve ser legível sem abrir o arquivo.

---

## Como escrever um ADR

Cada documento deve responder três perguntas:

1. **Contexto** — Qual era a situação? Qual problema precisava ser resolvido?
2. **Decisão** — O que foi escolhido e por quê?
3. **Alternativas consideradas** — O que mais foi avaliado e por que foi descartado?

Um ADR não precisa ser longo. Dois parágrafos bem escritos valem mais do que uma página de informações redundantes.

---

## Documentos nesta pasta

| Arquivo | Assunto |
|---|---|
| `agents.md` | Este documento — explica a pasta e a prática de ADR |

> Adicione uma linha a esta tabela cada vez que criar um novo ADR.

---

## Relação com outros arquivos de contexto

| Arquivo | Propósito |
|---|---|
| [`agent.md`](../agent.md) | Instrução técnica para LLMs implementarem funcionalidades específicas (ex: o chatbot). É um documento *operacional*, não histórico. |
| [`adr_docs/`](.) | Decisões arquiteturais e contexto histórico do projeto. Documentos *explicativos*, voltados para humanos e LLMs que precisam entender o *porquê*. |
| [`docs/`](../docs/) | Documentação técnica duradoura: tutoriais de setup, guias de uso. Voltada para desenvolvedores que entram no projeto. |

---

*TutorÉgua — IA Aplicada à Educação · UFRN · 2025*
