import type { CSSProperties } from "react";
import type { TopicoProgresso } from "../hooks/useProgresso";

interface Props {
  topico: TopicoProgresso | null;
  prerequisitos?: TopicoProgresso[];
  style?: CSSProperties;
}

const LIMIAR_DOMINADO = 70;
const LIMIAR_EM_PROGRESSO = 1;

function statusLabel(pct: number) {
  if (pct >= LIMIAR_DOMINADO) return { label: "Dominado", color: "#117a7a", bg: "#d1fae5" };
  if (pct >= LIMIAR_EM_PROGRESSO) return { label: "Em progresso", color: "#92400e", bg: "#fef3c7" };
  return { label: "Iniciante", color: "#1e40af", bg: "#dbeafe" };
}

export function ProgressoTopico({ topico, prerequisitos = [], style }: Props) {
  if (!topico) {
    return (
      <div style={{
        border: "1px dashed #cbd5e1",
        borderRadius: 16,
        padding: 28,
        textAlign: "center",
        color: "#94a3b8",
        fontSize: 14,
        background: "#f8fafc",
        ...style,
      }}>
        Clique em um tópico no grafo para ver o progresso
      </div>
    );
  }

  const { label, color, bg } = statusLabel(topico.pct);
  const taxaAcerto = topico.tentativas > 0
    ? Math.round((topico.acertos / topico.tentativas) * 100)
    : 0;

  return (
    <div style={{
      border: "1px solid #d8e3e6",
      borderRadius: 16,
      padding: "20px 24px",
      background: "linear-gradient(180deg, #f7fcfd 0%, #ffffff 100%)",
      boxShadow: "0 4px 12px rgba(20, 35, 40, 0.06)",
      ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <strong style={{ fontSize: 16, color: "#18363d" }}>{topico.topico_nome}</strong>
          <div style={{ fontSize: 12, color: "#648088", marginTop: 2 }}>Progresso no tópico</div>
        </div>
        <span style={{
          padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: bg, color,
        }}>
          {label}
        </span>
      </div>

      {/* Barra de proficiência */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#4d6570" }}>Proficiência</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#18363d" }}>{topico.pct}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "#e2eef0", overflow: "hidden" }}>
          <div style={{
            width: `${topico.pct}%`,
            height: "100%",
            borderRadius: 999,
            background: topico.pct >= LIMIAR_DOMINADO ? "#117a7a" : topico.pct > 0 ? "#f0a43c" : "#d6eaee",
            transition: "width 400ms ease",
          }} />
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
          Meta para desbloquear próximo: 70%
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "Tentativas", value: topico.tentativas },
          { label: "Acertos", value: topico.acertos },
          { label: "Taxa de acerto", value: `${taxaAcerto}%` },
        ].map(({ label: l, value }) => (
          <div key={l} style={{
            flex: 1, textAlign: "center",
            background: "#f0f6f7", borderRadius: 10, padding: "10px 8px",
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#18363d" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#648088", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Pré-requisitos */}
      {prerequisitos.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid #e2eef0", paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#648088", marginBottom: 10 }}>
            Pré-requisitos
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {prerequisitos.map((pre) => {
              const { label: preLabel, color: preColor, bg: preBg } = statusLabel(pre.pct);
              return (
                <div key={pre.topico_codigo} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#f7fafa", borderRadius: 10, padding: "8px 12px",
                  border: "1px solid #e2eef0",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#18363d", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pre.topico_nome}
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "#e2eef0", overflow: "hidden" }}>
                      <div style={{
                        width: `${pre.pct}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: pre.pct >= LIMIAR_DOMINADO ? "#117a7a" : pre.pct > 0 ? "#f0a43c" : "#d6eaee",
                        transition: "width 400ms ease",
                      }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#18363d" }}>{pre.pct}%</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: preBg, color: preColor }}>
                      {preLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
