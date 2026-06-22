import { useMemo } from "react";
import type { TopicoProgresso } from "../hooks/useProgresso";

interface Props {
  porTopico: TopicoProgresso[];
  compacto?: boolean;
}

type StatusProgresso = "iniciante" | "em progresso" | "dominado";

interface NodeExibido {
  id: string;
  nome: string;
  pct: number;
  status: StatusProgresso;
  position: { x: number; y: number };
}

const NODE_WIDTH = 210;
const NODE_HEIGHT = 92;
const COLUMN_GAP = 46;
const ROW_GAP = 34;
const CONTENT_PADDING = 28;
const HEADER_HEIGHT = 80;
const STAGE_HEIGHT = 360;

function normalizarPct(proficiencia: number) {
  return Math.round(Math.max(0, Math.min(1, proficiencia)) * 100);
}

function statusFromPct(pct: number): StatusProgresso {
  if (pct >= 70) return "dominado";
  if (pct > 0) return "em progresso";
  return "iniciante";
}

function statusColor(status: StatusProgresso) {
  if (status === "dominado") return "#198754";
  if (status === "em progresso") return "#d97706";
  return "#94a3b8";
}

function statusLabel(status: StatusProgresso) {
  if (status === "dominado") return "Dominado";
  if (status === "em progresso") return "Em progresso";
  return "Iniciante";
}

function legendItem(color: string, label: string) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
      <span style={{ width: 12, height: 12, borderRadius: 999, background: color, display: "inline-block" }} />
      <span>{label}</span>
    </div>
  );
}

function buildNodes(porTopico: TopicoProgresso[]): NodeExibido[] {
  const itensOrdenados = [...porTopico].map((item, index) => ({ item, index }));
  const total = itensOrdenados.length;
  const colunas = Math.max(1, Math.min(4, total));

  return itensOrdenados.map(({ item, index }) => {
    const coluna = index % colunas;
    const linha = Math.floor(index / colunas);
    const x = CONTENT_PADDING + coluna * (NODE_WIDTH + COLUMN_GAP);
    const y = HEADER_HEIGHT + CONTENT_PADDING + linha * (NODE_HEIGHT + ROW_GAP);
    const pct = item.pct ?? normalizarPct(item.proficiencia);

    return {
      id: item.topico_codigo,
      nome: item.topico_nome,
      pct,
      status: statusFromPct(pct),
      position: { x, y },
    };
  });
}

function getNodeCenter(node: NodeExibido) {
  return {
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_HEIGHT / 2,
  };
}

function buildPath(source: NodeExibido, target: NodeExibido) {
  const start = getNodeCenter(source);
  const end = getNodeCenter(target);
  const dx = Math.max(90, (end.x - start.x) * 0.45);
  const c1x = start.x + dx;
  const c1y = start.y;
  const c2x = end.x - dx;
  const c2y = end.y;
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

export function GrafoProgresso({ porTopico, compacto = false }: Props) {
  const nodes = useMemo(() => buildNodes(porTopico), [porTopico]);
  const stageWidth = useMemo(() => {
    const maxX = nodes.reduce((max, node) => Math.max(max, node.position.x + NODE_WIDTH), 0);
    return Math.max(900, maxX + CONTENT_PADDING);
  }, [nodes]);
  const stageHeight = compacto ? 300 : STAGE_HEIGHT;

  const paths = useMemo(() => {
    return nodes
      .slice(0, -1)
      .map((source, index) => {
        const target = nodes[index + 1];
        if (!source || !target) return null;
        return {
          key: `${source.id}-${target.id}`,
          d: buildPath(source, target),
        };
      })
      .filter((path): path is { key: string; d: string } => path !== null);
  }, [nodes]);

  return (
    <div className="card graph-card" style={{ minHeight: compacto ? undefined : 720 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "20px 20px 10px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ fontSize: 18, color: "#243042" }}>Mapa de progresso</strong>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Os mesmos dados do progresso por tópico, organizados como grafo de pré-requisitos.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          {compacto && (
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
              {nodes.length} tópicos
            </span>
          )}
          {legendItem("#94a3b8", "Iniciante")}
          {legendItem("#d97706", "Em progresso")}
          {legendItem("#198754", "Dominado")}
        </div>
      </div>

      {!compacto && (
        <div className="graph-stage" style={{ height: stageHeight }}>
          <svg
            width={stageWidth}
            height={stageHeight}
            viewBox={`0 0 ${stageWidth} ${stageHeight}`}
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {paths.map((path) => (
              <path
                key={path.key}
                d={path.d}
                fill="none"
                stroke="rgba(111, 66, 193, 0.24)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </svg>

          {nodes.map((node) => (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: node.position.x,
                top: node.position.y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                borderRadius: 14,
                background: "#fff",
                border: "1px solid #e7e0f2",
                boxShadow: "0 8px 20px rgba(67, 32, 111, 0.08)",
                padding: "14px 14px 12px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: "#243042", lineHeight: 1.2 }}>
                {node.nome}
              </div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 800 }}>{node.pct}%</div>
              <div
                style={{
                  height: 7,
                  borderRadius: 999,
                  background: "#ede7f7",
                  overflow: "hidden",
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    width: `${node.pct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: statusColor(node.status),
                    transition: "width 180ms ease",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b" }}>
                {statusLabel(node.status)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={compacto ? "graph-list graph-list-scroll" : "graph-mobile-list"}>
        {nodes.map((node) => (
          <div
            key={node.id}
            style={{
              border: "1px solid #e7e0f2",
              borderRadius: 14,
              padding: 12,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <strong style={{ color: "#243042", fontSize: 14 }}>{node.nome}</strong>
              <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{statusLabel(node.status)}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "#ede7f7", overflow: "hidden", marginTop: 10 }}>
              <div
                style={{
                  width: `${node.pct}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: statusColor(node.status),
                }}
              />
            </div>
            <div style={{ marginTop: 6, color: "#475569", fontSize: 12, fontWeight: 800 }}>{node.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
