import { useEffect, useRef, useState } from "react";
import { ChatPanel, type TopicoSelecionado } from "../components/ChatPanel";
import { GrafoProgresso } from "../components/GrafoProgresso";
import { ProgressoTopico } from "../components/ProgressoTopico";
import { useProgresso } from "../hooks/useProgresso";

export function Tutor() {
  const [topicoSelecionado, setTopicoSelecionado] = useState<TopicoSelecionado | null>(null);
  const { porTopico, loading, resetKey } = useProgresso();
  const montado = useRef(false);

  useEffect(() => {
    if (!montado.current) { montado.current = true; return; }
    setTopicoSelecionado(null);
  }, [resetKey]);

  const topicoAtual = porTopico.find((t) => t.topico_codigo === topicoSelecionado?.codigo) ?? null;

  return (
    <div className="tutor-page">
      {/* Card esquerdo — Chat */}
      <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ChatPanel topicoSelecionado={topicoSelecionado} />
      </div>

      {/* Coluna direita */}
      <div className="tutor-right">
        {/* Card superior — Grafo de tópicos clicável */}
        <div className="tutor-card">
          {loading ? (
            <div className="card" style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              color: "#94a3b8",
              fontSize: 14,
            }}>
              Carregando tópicos…
            </div>
          ) : (
            <GrafoProgresso
              porTopico={porTopico}
              embedded
              onNodeClick={(codigo, nome) => setTopicoSelecionado({ codigo, nome })}
              topicoSelecionado={topicoSelecionado?.codigo ?? null}
            />
          )}
        </div>

        {/* Card inferior — Progresso do tópico selecionado */}
        <div className="tutor-card" style={{ overflow: "auto" }}>
          <ProgressoTopico
            topico={topicoAtual}
            style={{ height: "100%", boxSizing: "border-box" }}
          />
        </div>
      </div>
    </div>
  );
}
