import { useState } from "react";
import { ChatPanel, type TopicoSelecionado } from "../components/ChatPanel";
import { GrafoProgresso } from "../components/GrafoProgresso";
import { ProgressoTopico } from "../components/ProgressoTopico";
import { useProgresso } from "../hooks/useProgresso";

export function Tutor() {
  const [topicoSelecionado, setTopicoSelecionado] = useState<TopicoSelecionado | null>(null);
  const { porTopico, loading } = useProgresso();

  const topicoAtual = porTopico.find((t) => t.topico_codigo === topicoSelecionado?.codigo) ?? null;

  return (
    <div style={{
      display: "flex",
      height: "calc(100vh - 82px)",
      overflow: "hidden",
      background: "#f8fafc",
    }}>
      {/* Painel esquerdo — Chat */}
      <div style={{
        width: "50%",
        flexShrink: 0,
        borderRight: "1px solid #dee2e6",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#fff",
      }}>
        <ChatPanel topicoSelecionado={topicoSelecionado} />
      </div>

      {/* Painel direito — Grafo + Progresso */}
      <div style={{
        width: "50%",
        flexShrink: 0,
        overflowY: "auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>
        {loading ? (
          <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", paddingTop: 40 }}>
            Carregando grafo...
          </p>
        ) : (
          <>
            <GrafoProgresso
              porTopico={porTopico}
              onNodeClick={(codigo, nome) => setTopicoSelecionado({ codigo, nome })}
              topicoSelecionado={topicoSelecionado?.codigo ?? null}
            />
            <ProgressoTopico topico={topicoAtual} />
          </>
        )}
      </div>
    </div>
  );
}
