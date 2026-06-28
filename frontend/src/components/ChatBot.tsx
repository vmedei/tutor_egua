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
  onMensagemEnviada?: () => void;
  avisoSoftLock?: { nome: string; ts: number } | null;
}

const BOAS_VINDAS = (topico: string) =>
  `Olá! Sou o assistente do TutorÉgua. Estou aqui para ajudar com o exercício de **${topico}**.\n\nPode me perguntar sobre sintaxe da linguagem Égua, pedir uma explicação do conceito ou pedir uma dica sobre o exercício. Como posso ajudar?`;

export function ChatBot({ topicoNome, exercicioEnunciado, onMensagemEnviada, avisoSoftLock }: Props) {
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [tempoEspera, setTempoEspera] = useState(0);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aberto && historico.length === 0) {
      setHistorico([{ papel: "assistente", texto: BOAS_VINDAS(topicoNome) }]);
    }
  }, [aberto, topicoNome, historico.length]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico, carregando]);

  useEffect(() => {
    if (tempoEspera <= 0) return;
    const id = setTimeout(() => setTempoEspera((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tempoEspera]);

  useEffect(() => {
    if (!avisoSoftLock) return;
    const aviso: Mensagem = {
      papel: "assistente",
      texto: `O tópico **${avisoSoftLock.nome}** ainda não está disponível. Você precisa dominar os pré-requisitos com pelo menos 70% de proficiência antes de avançar. Quer que eu te ajude com o exercício atual ou explique o conceito necessário?`,
      tipo: "aviso",
    };
    setAberto(true);
    setHistorico((prev) => {
      const base =
        prev.length === 0
          ? [{ papel: "assistente" as const, texto: BOAS_VINDAS(topicoNome) }]
          : prev;
      return [...base, aviso];
    });
  }, [avisoSoftLock, topicoNome]);

  const bloqueado = carregando || tempoEspera > 0;

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || bloqueado) return;

    const novaMensagem: Mensagem = { papel: "aluno", texto };
    const historicoAtualizado = [...historico, novaMensagem];
    setHistorico(historicoAtualizado);
    setInput("");
    setCarregando(true);
    onMensagemEnviada?.();

    try {
      const { data } = await api.post("/chat/", {
        mensagem: texto,
        historico: historico.map((m) => ({ papel: m.papel, texto: m.texto })),
        contexto_topico: topicoNome,
        contexto_exercicio: exercicioEnunciado,
      });
      setHistorico([...historicoAtualizado, { papel: "assistente", texto: data.resposta }]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response;
      if (status?.status === 429) {
        const detalhe = status.data?.detail ?? "Limite atingido. Tente em alguns segundos.";
        const match = detalhe.match(/(\d+) segundo/);
        const wait = match ? parseInt(match[1]) : 60;
        setTempoEspera(wait);
        setHistorico([...historicoAtualizado, { papel: "assistente", texto: detalhe, tipo: "aviso" }]);
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
    <section>
      <button onClick={() => setAberto((v) => !v)} className={aberto ? "btn-muted" : "btn-primary"}>
        <span aria-hidden="true">?</span>
        {aberto ? "Fechar assistente" : "Preciso de ajuda"}
      </button>

      {aberto && (
        <div
          className="card"
          style={{
            marginTop: 12,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: 440,
          }}
        >
          <div
            style={{
              background: "#5c2e91",
              color: "#fff",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 14 }}>Assistente TutorÉgua · {topicoNome}</span>
            <button
              onClick={limpar}
              title="Limpar conversa"
              style={{
                minHeight: 30,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.28)",
                color: "#fff",
                padding: "4px 10px",
                fontSize: 12,
                borderRadius: 999,
              }}
            >
              Limpar
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
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

          <div style={{ padding: 12, borderTop: "1px solid #dfe4ea", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
              placeholder={tempoEspera > 0 ? `Aguarde ${tempoEspera}s para enviar novamente...` : "Escreva sua dúvida..."}
              disabled={bloqueado}
              className="input"
              style={{
                flex: 1,
                background: tempoEspera > 0 ? "#fffbeb" : "#fff",
                borderColor: tempoEspera > 0 ? "#f6d477" : "#cbd5e1",
              }}
            />
            <button onClick={enviar} disabled={bloqueado || !input.trim()} className="btn-primary">
              Enviar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function BolhaMensagem({ mensagem }: { mensagem: Mensagem }) {
  const eAluno = mensagem.papel === "aluno";
  const eAviso = mensagem.tipo === "aviso";

  const bg = eAluno ? "#5c2e91" : eAviso ? "#fffbeb" : "#f5f7fb";
  const cor = eAluno ? "#fff" : eAviso ? "#92400e" : "#243042";
  const borda = eAviso ? "1px solid #f6d477" : "1px solid #edf1f5";

  return (
    <div style={{ display: "flex", justifyContent: eAluno ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "82%",
          padding: "10px 13px",
          borderRadius: 14,
          fontSize: 13,
          lineHeight: 1.6,
          background: bg,
          color: cor,
          border: borda,
          borderBottomRightRadius: eAluno ? 4 : 14,
          borderBottomLeftRadius: eAluno ? 14 : 4,
          whiteSpace: "pre-wrap",
        }}
      >
        <MarkdownSimples texto={mensagem.texto} />
      </div>
    </div>
  );
}

function BolhaDigitando() {
  return (
    <div
      style={{
        padding: "8px 14px",
        borderRadius: 14,
        background: "#f5f7fb",
        border: "1px solid #edf1f5",
        fontSize: 18,
        letterSpacing: 2,
        color: "#64748b",
      }}
    >
      <span style={{ animation: "typingBlink 1.2s infinite" }}>...</span>
    </div>
  );
}

function MarkdownSimples({ texto }: { texto: string }) {
  const partes = texto.split(/(```[\s\S]*?```|\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((parte, i) => {
        if (parte.startsWith("```") && parte.endsWith("```")) {
          const codigo = parte.slice(3, -3).replace(/^[a-z]*\n/, "");
          return (
            <pre
              key={i}
              style={{
                background: "#1f2937",
                color: "#e5e7eb",
                padding: "8px 10px",
                borderRadius: 10,
                fontSize: 12,
                overflowX: "auto",
                margin: "6px 0",
                whiteSpace: "pre",
              }}
            >
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
