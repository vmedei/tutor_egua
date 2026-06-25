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
const ROW_GAP = 40;
const CONTENT_PADDING = 28;
const HEADER_HEIGHT = 80;
const COLS_PER_ROW = 4;
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
  const pctByCode = new Map(
    porTopico.map((t) => [t.topico_codigo, t.pct ?? normalizarPct(t.proficiencia)])
  );

  return porTopico.map((item, index) => {
    const coluna = index % COLS_PER_ROW;
    const linha = Math.floor(index / COLS_PER_ROW);
    const x = CONTENT_PADDING + coluna * (NODE_WIDTH + COLUMN_GAP);
    const y = HEADER_HEIGHT + CONTENT_PADDING + linha * (NODE_HEIGHT + ROW_GAP);
    const pct = item.pct ?? normalizarPct(item.proficiencia);

    // Disponível apenas quando TODOS os pré-requisitos atingiram o limiar
    const disponivel =
      item.prerequisitos.length === 0 ||
      item.prerequisitos.every((prereqCodigo) => (pctByCode.get(prereqCodigo) ?? 0) >= LIMIAR_DESBLOQUEIO);

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

/**
 * Caminho bezier entre dois nós. Para arestas na mesma linha: S-curva horizontal.
 * Para arestas entre linhas diferentes (wrappping do grid): arco que desce e sobe.
 */
function buildPath(source: NodeExibido, target: NodeExibido): string {
  const s = getNodeCenter(source);
  const e = getNodeCenter(target);

  const dy = e.y - s.y;

  if (Math.abs(dy) < NODE_HEIGHT * 0.6) {
    // Mesma linha — S-curva horizontal
    const forward = e.x >= s.x;
    const cx = Math.max(80, Math.abs(e.x - s.x) * 0.45);
    const dir = forward ? 1 : -1;
    return `M ${s.x} ${s.y} C ${s.x + cx * dir} ${s.y}, ${e.x - cx * dir} ${e.y}, ${e.x} ${e.y}`;
  }

  // Linhas diferentes — arco que desce verticalmente com inclinação suave
  const c1x = s.x + (e.x - s.x) * 0.15;
  const c1y = s.y + dy * 0.65;
  const c2x = e.x - (e.x - s.x) * 0.15;
  const c2y = e.y - dy * 0.35;
  return `M ${s.x} ${s.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${e.x} ${e.y}`;
}

export function GrafoProgresso({ porTopico, compacto = false, embedded = false, onNodeClick, topicoSelecionado }: Props) {
  const nodes = useMemo(() => buildNodes(porTopico), [porTopico]);

  const stageWidth = useMemo(() => {
    const maxX = nodes.reduce((max, node) => Math.max(max, node.position.x + NODE_WIDTH), 0);
    return Math.max(900, maxX + CONTENT_PADDING);
  }, [nodes]);

  const stageHeight = useMemo(() => {
    if (compacto) return 300;
    if (nodes.length === 0) return 360;
    const maxY = nodes.reduce((max, node) => Math.max(max, node.position.y), 0);
    return maxY + NODE_HEIGHT + CONTENT_PADDING;
  }, [nodes, compacto]);

  // Mapa código → node para lookup eficiente nas arestas
  const nodeByCode = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  // Arestas reais do DAG: para cada nó, uma aresta por pré-requisito
  const paths = useMemo(() => {
    const result: { key: string; d: string }[] = [];
    for (const item of porTopico) {
      const target = nodeByCode.get(item.topico_codigo);
      if (!target) continue;
      for (const prereqCodigo of item.prerequisitos) {
        const source = nodeByCode.get(prereqCodigo);
        if (!source) continue;
        result.push({
          key: `${prereqCodigo}→${item.topico_codigo}`,
          d: buildPath(source, target),
        });
      }
    }
    return result;
  }, [porTopico, nodeByCode]);

  return (
    <div
      className="card graph-card"
      style={embedded
        ? { minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }
        : { minHeight: compacto ? undefined : 720 }
      }
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "20px 20px 10px",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <div>
          <strong style={{ fontSize: 18, color: "#243042" }}>Mapa de progresso</strong>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Grafo de pré-requisitos — clique em um nó para estudar
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

      {/* Grafo visual (modo não-compacto) */}
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
            style={{ position: "absolute", top: 0, left: 0, width: stageWidth, height: stageHeight, minWidth: "100%" }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="rgba(111, 66, 193, 0.35)" />
              </marker>
            </defs>
            {paths.map((path) => (
              <path
                key={path.key}
                d={path.d}
                fill="none"
                stroke="rgba(111, 66, 193, 0.28)"
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#arrowhead)"
              />
            ))}
          </svg>

          {nodes.map((node) => {
            const isSelecionado = topicoSelecionado === node.id;
            return (
              <div
                key={node.id}
                onClick={() => onNodeClick?.(node.id, node.nome)}
                title={!node.disponivel ? "Complete os pré-requisitos para desbloquear (70%)" : node.nome}
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

      {/* Lista de nós — modo compacto ou mobile */}
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
              title={!node.disponivel ? "Complete os pré-requisitos para desbloquear (70%)" : node.nome}
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
