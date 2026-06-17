import { useEffect, useRef, useState } from "react";
import api from "../api/client";

interface Mensagem {
  papel: "aluno" | "assistente";
  texto: string;
  tipo?: "aviso";
}

interface Props {
  topicoNome: string;
  exercicioEnunciado: string;
}

const BOAS_VINDAS = (topico: string) =>
  `Olá! Sou o assistente do TutorÉgua. Estou aqui para ajudar com o exercício de **${topico}**.\n\nPode me perguntar sobre sintaxe da linguagem Égua, pedir uma explicação do conceito ou pedir uma dica sobre o exercício. Como posso ajudar?`;

const styleTag = document.createElement("style");
styleTag.textContent = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }`;
document.head.appendChild(styleTag);

export function ChatBot({ topicoNome, exercicioEnunciado }: Props) {
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [tempoEspera, setTempoEspera] = useState(0);
  const fimRef = useRef<HTMLDivElement>(null);

  // Inicializa com mensagem de boas-vindas ao abrir pela primeira vez
  useEffect(() => {
    if (aberto && historico.length === 0) {
      setHistorico([{ papel: "assistente", texto: BOAS_VINDAS(topicoNome) }]);
    }
  }, [aberto, topicoNome, historico.length]);

  // Scroll automático para última mensagem
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico, carregando]);

  // Countdown do rate limit
  useEffect(() => {
    if (tempoEspera <= 0) return;
    const id = setTimeout(() => setTempoEspera((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tempoEspera]);

  const bloqueado = carregando || tempoEspera > 0;

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || bloqueado) return;

    const novaMensagem: Mensagem = { papel: "aluno", texto };
    const historicoAtualizado = [...historico, novaMensagem];
    setHistorico(historicoAtualizado);
    setInput("");
    setCarregando(true);

    try {
      const { data } = await api.post("/chat/", {
        mensagem: texto,
        historico: historico.map((m) => ({ papel: m.papel, texto: m.texto })),
        contexto_topico: topicoNome,
        contexto_exercicio: exercicioEnunciado,
      });
      setHistorico([...historicoAtualizado, { papel: "assistente", texto: data.resposta }]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })
        ?.response;
      if (status?.status === 429) {
        const detalhe = status.data?.detail ?? "Limite atingido. Tente em alguns segundos.";
        const match = detalhe.match(/(\d+) segundo/);
        const wait = match ? parseInt(match[1]) : 60;
        setTempoEspera(wait);
        setHistorico([
          ...historicoAtualizado,
          { papel: "assistente", texto: `⏳ ${detalhe}`, tipo: "aviso" },
        ]);
      } else {
        setHistorico([
          ...historicoAtualizado,
          { papel: "assistente", texto: "Desculpe, ocorreu um erro. Tente novamente." },
        ]);
      }
    } finally {
      setCarregando(false);
    }
  };

  const limpar = () => {
    setHistorico([{ papel: "assistente", texto: BOAS_VINDAS(topicoNome) }]);
  };

  return (
    <div style={{ marginTop: 24 }}>
      {/* Botão de toggle */}
      <button
        onClick={() => setAberto((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px", background: aberto ? "#495057" : "#6f42c1",
          color: "#fff", border: "none", borderRadius: 8,
          cursor: "pointer", fontWeight: 600, fontSize: 14,
        }}
      >
        <span style={{ fontSize: 18 }}>💬</span>
        {aberto ? "Fechar assistente" : "Preciso de ajuda"}
      </button>

      {/* Painel do chat */}
      {aberto && (
        <div style={{
          marginTop: 12, border: "1px solid #dee2e6", borderRadius: 10,
          overflow: "hidden", background: "#fff",
          display: "flex", flexDirection: "column", height: 420,
        }}>
          {/* Cabeçalho */}
          <div style={{
            background: "#6f42c1", color: "#fff",
            padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              Assistente TutorÉgua · {topicoNome}
            </span>
            <button
              onClick={limpar}
              title="Limpar conversa"
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, opacity: 0.8 }}
            >
              Limpar
            </button>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {historico.map((msg, i) => (
              <BolhaMensagem key={i} mensagem={msg} />
            ))}
            {carregando && (
              <div style={{ alignSelf: "flex-start" }}>
                <BolhaDigitando />
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #dee2e6", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
              placeholder={
                tempoEspera > 0
                  ? `Aguarde ${tempoEspera}s para enviar novamente…`
                  : "Escreva sua dúvida…"
              }
              disabled={bloqueado}
              style={{
                flex: 1, padding: "8px 12px",
                border: `1px solid ${tempoEspera > 0 ? "#ffc107" : "#ced4da"}`,
                borderRadius: 6, fontSize: 14, outline: "none",
                background: tempoEspera > 0 ? "#fffbea" : "#fff",
              }}
            />
            <button
              onClick={enviar}
              disabled={bloqueado || !input.trim()}
              style={{
                padding: "8px 16px", background: "#6f42c1", color: "#fff",
                border: "none", borderRadius: 6, cursor: "pointer",
                fontWeight: 600, fontSize: 14,
                opacity: bloqueado || !input.trim() ? 0.5 : 1,
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BolhaMensagem({ mensagem }: { mensagem: Mensagem }) {
  const eAluno = mensagem.papel === "aluno";
  const eAviso = mensagem.tipo === "aviso";

  const bg = eAluno ? "#6f42c1" : eAviso ? "#fff3cd" : "#f1f3f5";
  const cor = eAluno ? "#fff" : eAviso ? "#856404" : "#212529";
  const borda = eAviso ? "1px solid #ffc107" : "none";

  return (
    <div style={{ display: "flex", justifyContent: eAluno ? "flex-end" : "flex-start" }}>
      <div style={{
        maxWidth: "82%", padding: "8px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.6,
        background: bg, color: cor, border: borda,
        borderBottomRightRadius: eAluno ? 2 : 10,
        borderBottomLeftRadius: eAluno ? 10 : 2,
        whiteSpace: "pre-wrap",
      }}>
        <MarkdownSimples texto={mensagem.texto} />
      </div>
    </div>
  );
}

function BolhaDigitando() {
  return (
    <div style={{
      padding: "8px 14px", borderRadius: 10, background: "#f1f3f5",
      fontSize: 20, letterSpacing: 2, color: "#6c757d",
    }}>
      <DotAnimation />
    </div>
  );
}

function DotAnimation() {
  return <span style={{ animation: "blink 1.2s infinite" }}>•••</span>;
}

// Renderizador mínimo de markdown: **negrito** e blocos de código
function MarkdownSimples({ texto }: { texto: string }) {
  const partes = texto.split(/(```[\s\S]*?```|\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((parte, i) => {
        if (parte.startsWith("```") && parte.endsWith("```")) {
          const codigo = parte.slice(3, -3).replace(/^[a-z]*\n/, "");
          return (
            <pre key={i} style={{
              background: "#1e1e1e", color: "#d4d4d4", padding: "8px 10px",
              borderRadius: 6, fontSize: 12, overflowX: "auto", margin: "6px 0",
              whiteSpace: "pre",
            }}>
              {codigo}
            </pre>
          );
        }
        if (parte.startsWith("**") && parte.endsWith("**")) {
          return <strong key={i}>{parte.slice(2, -2)}</strong>;
        }
        return <span key={i}>{parte}</span>;
      })}
    </>
  );
}
