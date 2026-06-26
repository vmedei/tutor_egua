import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import type { TopicoProgresso } from "../hooks/useProgresso";

interface ExercicioStatus {
  id: string;
  tipo: string;
  tentado: boolean;
  correto: boolean;
}

interface TopicoExercicios {
  topico_codigo: string;
  topico_nome: string;
  exercicios: ExercicioStatus[];
}

interface Props {
  porTopico: TopicoProgresso[];
  versao: number;
  topicoAtivo?: string | null;
  onTopicoClick?: (codigo: string) => void;
}

const LIMIAR = 70;

const TIPO_LABEL: Record<string, string> = {
  multipla_escolha: "Múltipla escolha",
  completar_codigo: "Completar código",
  implementacao_livre: "Implementação livre",
};

function topicColor(pct: number, disponivel: boolean) {
  if (!disponivel) return "#e2e8f0";
  if (pct >= LIMIAR) return "#198754";
  if (pct > 0) return "#d97706";
  return "#94a3b8";
}

function exColor(correto: boolean, tentado: boolean) {
  if (correto) return "#198754";
  if (tentado) return "#d97706";
  return "#cbd5e1";
}

export function TrilhaProgresso({ porTopico, versao, topicoAtivo, onTopicoClick }: Props) {
  const [dados, setDados] = useState<TopicoExercicios[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const alunoId = localStorage.getItem("aluno_id") ?? "";

  useEffect(() => {
    api
      .get<TopicoExercicios[]>(`/tutor/exercicios-status/${alunoId}`)
      .then(({ data }) => setDados(data))
      .catch(() => {});
  }, [alunoId, versao]);

  // Disponibilidade seguindo a mesma lógica do GrafoProgresso
  const pctMap = new Map(porTopico.map((t) => [t.topico_codigo, t.pct]));
  function isDisponivel(codigo: string) {
    const tp = porTopico.find((t) => t.topico_codigo === codigo);
    if (!tp) return false;
    return (
      tp.prerequisitos.length === 0 ||
      tp.prerequisitos.every((pr) => (pctMap.get(pr) ?? 0) >= LIMIAR)
    );
  }

  function handleTopicClick(codigo: string) {
    const avail = isDisponivel(codigo);
    // Expande/recolhe independentemente de disponibilidade (para ver status visual)
    setExpandido((prev) => (prev === codigo ? null : codigo));
    if (avail) onTopicoClick?.(codigo);
  }

  function showTooltip(e: React.MouseEvent, text: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cRect = containerRef.current?.getBoundingClientRect();
    const x = cRect ? rect.left - cRect.left + rect.width / 2 : 0;
    setTooltip({ text, x });
  }

  // ── Constrói lista plana de itens para renderizar ──────────────────────────
  type Item =
    | { kind: "topic"; tp: TopicoProgresso; d: TopicoExercicios | undefined }
    | { kind: "ex"; ex: ExercicioStatus };

  const items: Item[] = [];
  for (const tp of porTopico) {
    const d = dados.find((x) => x.topico_codigo === tp.topico_codigo);
    items.push({ kind: "topic", tp, d });
    if (expandido === tp.topico_codigo && d) {
      for (const ex of d.exercicios) items.push({ kind: "ex", ex });
    }
  }

  // ── Renderização ──────────────────────────────────────────────────────────
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;
    const next = items[i + 1];

    if (item.kind === "topic") {
      const { tp, d } = item;
      const avail = isDisponivel(tp.topico_codigo);
      const isAtivo = topicoAtivo === tp.topico_codigo;
      const isExp = expandido === tp.topico_codigo;
      const pct = tp.pct;
      const color = topicColor(pct, avail);
      const concluidos = d ? d.exercicios.filter((e) => e.correto).length : 0;
      const total = d ? d.exercicios.length : 0;
      const tipText = avail
        ? `${tp.topico_nome} — ${pct}% (${concluidos}/${total} corretos)`
        : `${tp.topico_nome} — Bloqueado`;

      nodes.push(
        <div
          key={tp.topico_codigo}
          onMouseEnter={(e) => showTooltip(e, tipText)}
          onMouseLeave={() => setTooltip(null)}
          onClick={() => handleTopicClick(tp.topico_codigo)}
          title=""
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
            cursor: "pointer",
            opacity: avail ? 1 : 0.4,
            border: isAtivo
              ? "3px solid #6f42c1"
              : isExp
              ? "2px solid #6f42c1"
              : "2px solid #fff",
            boxShadow: "0 0 0 1.5px rgba(100,60,160,0.18)",
            transition: "all 140ms ease",
            position: "relative",
          }}
        />
      );
    } else {
      const { ex } = item;
      const label = TIPO_LABEL[ex.tipo] ?? ex.tipo;
      const status = ex.correto ? "Correto ✓" : ex.tentado ? "Tentado" : "Não tentado";

      nodes.push(
        <div
          key={ex.id}
          onMouseEnter={(e) => showTooltip(e, `${label} — ${status}`)}
          onMouseLeave={() => setTooltip(null)}
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: exColor(ex.correto, ex.tentado),
            flexShrink: 0,
            border: "1.5px solid rgba(255,255,255,0.85)",
            boxShadow: "0 0 0 1px rgba(100,100,100,0.1)",
            transition: "background 140ms ease",
          }}
        />
      );
    }

    // Conector após o item (exceto o último)
    if (!isLast) {
      const curIsEx = item.kind === "ex";
      const nxtIsEx = next?.kind === "ex";
      // ex→ex: 10px, topic→ex ou ex→topic: 14px, topic→topic: 30px
      const w = curIsEx && nxtIsEx ? 10 : curIsEx || nxtIsEx ? 14 : 30;
      nodes.push(
        <div
          key={`c${i}`}
          style={{ width: w, height: 2, background: "#e2e8f0", flexShrink: 0 }}
        />
      );
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        overflowX: "auto",
        padding: "4px 24px 16px",
        position: "relative",
        scrollbarWidth: "none",
      }}
    >
      {/* Trilha */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          minWidth: "max-content",
          height: 44,
          paddingTop: 8,
        }}
      >
        {nodes}
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
        {[
          { color: "#198754", label: "Dominado" },
          { color: "#d97706", label: "Em progresso" },
          { color: "#94a3b8", label: "Não iniciado" },
          { color: "#e2e8f0", label: "Bloqueado" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
            {label}
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
          Clique num tópico para ver os exercícios
        </div>
      </div>

      {/* Tooltip flutuante */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% - 4px)",
            left: tooltip.x + 24,
            transform: "translateX(-50%)",
            background: "#1e293b",
            color: "#f8fafc",
            padding: "5px 11px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {tooltip.text}
          {/* Seta */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #1e293b",
            }}
          />
        </div>
      )}
    </div>
  );
}
