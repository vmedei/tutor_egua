import { useMemo } from "react";
import type { TopicoProgresso } from "../hooks/useProgresso";

interface Props {
  porTopico: TopicoProgresso[];
  compacto?: boolean;
  embedded?: boolean;
  onNodeClick?: (codigo: string, nome: string) => void;
  topicoSelecionado?: string | null;
}

type StatusProgresso = "iniciante" | "em progresso" | "dominado";

interface NodeExibido {
  id: string;
  nome: string;
  pct: number;
  status: StatusProgresso;
  position: { x: number; y: number };
  disponivel: boolean;
}

const NODE_WIDTH = 210;
const NODE_HEIGHT = 92;
const COLUMN_GAP = 46;
const ROW_GAP = 34;
const CONTENT_PADDING = 28;
const HEADER_HEIGHT = 80;
const STAGE_HEIGHT = 360;
const LIMIAR_DESBLOQUEIO = 70;

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
    const pctAnterior = index > 0
      ? (porTopico[index - 1]?.pct ?? normalizarPct(porTopico[index - 1]?.proficiencia ?? 0))
      : LIMIAR_DESBLOQUEIO;
    const disponivel = index === 0 || pctAnterior >= LIMIAR_DESBLOQUEIO;

    return {
      id: item.topico_codigo,
      nome: item.topico_nome,
      pct,
      status: statusFromPct(pct),
      position: { x, y },
      disponivel,
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

export function GrafoProgresso({ porTopico, compacto = false, embedded = false, onNodeClick, topicoSelecionado }: Props) {
  const nodes = useMemo(() => buildNodes(porTopico), [porTopico]);
  const stageWidth = useMemo(() => {
    const maxX = nodes.reduce((max, node) => Math.max(max, node.position.x + NODE_WIDTH), 0);
    return Math.max(900, maxX + CONTENT_PADDING);
  }, [nodes]);
  const stageHeight = useMemo(() => {
    if (compacto) return 300;
    if (nodes.length === 0) return STAGE_HEIGHT;
    const maxY = nodes.reduce((max, node) => Math.max(max, node.position.y), 0);
    return maxY + NODE_HEIGHT + CONTENT_PADDING;
  }, [nodes, compacto]);

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
    <div
      className="card graph-card"
      style={embedded
        ? { minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }
        : { minHeight: compacto ? undefined : 720 }
      }
    >
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

      {/* Grafo visual (apenas modo não-compacto) */}
      {!compacto && (
        <div
          className="graph-stage"
          style={{
            height: stageHeight,
            ...(embedded ? { flexShrink: 0, overflowY: "auto" } : {}),
          }}
        >
          <svg
            width={stageWidth}
            height={stageHeight}
            viewBox={`0 0 ${stageWidth} ${stageHeight}`}
            preserveAspectRatio="xMinYMin meet"
            style={{ position: "absolute", top: 0, left: 0, width: stageWidth, height: stageHeight, minWidth: "100%" }}
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

          {nodes.map((node) => {
            const isSelecionado = topicoSelecionado === node.id;
            return (
              <div
                key={node.id}
                onClick={() => onNodeClick?.(node.id, node.nome)}
                title={!node.disponivel ? "Complete o tópico anterior para desbloquear (70%)" : node.nome}
                style={{
                  position: "absolute",
                  left: node.position.x,
                  top: node.position.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  borderRadius: 14,
                  background: node.disponivel ? "#fff" : "#f1f5f9",
                  border: isSelecionado
                    ? "2px solid #6f42c1"
                    : node.disponivel
                    ? "1px solid #e7e0f2"
                    : "1px solid #cbd5e1",
                  boxShadow: isSelecionado
                    ? "0 0 0 3px rgba(111, 66, 193, 0.18), 0 8px 20px rgba(67, 32, 111, 0.12)"
                    : "0 8px 20px rgba(67, 32, 111, 0.08)",
                  padding: "14px 14px 12px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 5,
                  cursor: onNodeClick ? "pointer" : "default",
                  opacity: node.disponivel ? 1 : 0.55,
                  transition: "all 150ms ease",
                  userSelect: "none",
                }}
              >
                {!node.disponivel && (
                  <div style={{ fontSize: 13, marginBottom: 2 }}>🔒</div>
                )}
                <div style={{ fontSize: 15, fontWeight: 800, color: node.disponivel ? "#243042" : "#64748b", lineHeight: 1.2 }}>
                  {node.nome}
                </div>
                <div style={{ fontSize: 13, color: node.disponivel ? "#475569" : "#94a3b8", fontWeight: 800 }}>
                  {node.pct}%
                </div>
                <div style={{ height: 7, borderRadius: 999, background: "#ede7f7", overflow: "hidden", marginTop: 2 }}>
                  <div
                    style={{
                      width: `${node.pct}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: node.disponivel ? statusColor(node.status) : "#cbd5e1",
                      transition: "width 180ms ease",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: node.disponivel ? "#64748b" : "#94a3b8" }}>
                  {node.disponivel ? statusLabel(node.status) : "Bloqueado"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de nós (visível em modo compacto e em telas pequenas) */}
      <div
        className={compacto ? "graph-list graph-list-scroll" : "graph-mobile-list"}
        style={embedded && compacto ? { maxHeight: "none", flex: 1, overflowY: "auto" } : undefined}
      >
        {nodes.map((node) => {
          const isSelecionado = topicoSelecionado === node.id;
          return (
            <div
              key={node.id}
              onClick={() => onNodeClick?.(node.id, node.nome)}
              title={!node.disponivel ? "Complete o tópico anterior para desbloquear (70%)" : node.nome}
              style={{
                border: isSelecionado ? "2px solid #6f42c1" : node.disponivel ? "1px solid #e7e0f2" : "1px solid #cbd5e1",
                borderRadius: 14,
                padding: 12,
                background: node.disponivel ? "#fff" : "#f8fafc",
                opacity: node.disponivel ? 1 : 0.65,
                cursor: onNodeClick ? "pointer" : "default",
                userSelect: "none",
                transition: "all 150ms ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <strong style={{ color: node.disponivel ? "#243042" : "#64748b", fontSize: 14 }}>
                  {!node.disponivel && "🔒 "}{node.nome}
                </strong>
                <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
                  {node.disponivel ? statusLabel(node.status) : "Bloqueado"}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "#ede7f7", overflow: "hidden", marginTop: 10 }}>
                <div
                  style={{
                    width: `${node.pct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: node.disponivel ? statusColor(node.status) : "#cbd5e1",
                  }}
                />
              </div>
              <div style={{ marginTop: 6, color: node.disponivel ? "#475569" : "#94a3b8", fontSize: 12, fontWeight: 800 }}>
                {node.pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
