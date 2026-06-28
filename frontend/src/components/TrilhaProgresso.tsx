import { useEffect, useState } from "react";
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
  exercicioAtivo?: string | null;
  onTopicoClick?: (codigo: string) => void;
  onExercicioClick?: (id: string) => void;
  onTopicoSoftLock?: (codigo: string, nome: string) => void;
}

const LIMIAR = 70;

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

export function TrilhaProgresso({ porTopico, versao, topicoAtivo, exercicioAtivo, onTopicoClick, onExercicioClick, onTopicoSoftLock }: Props) {
  const [dados, setDados] = useState<TopicoExercicios[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const alunoId = localStorage.getItem("aluno_id") ?? "";

  useEffect(() => {
    api
      .get<TopicoExercicios[]>(`/tutor/exercicios-status/${alunoId}`)
      .then(({ data }) => setDados(data))
      .catch(() => {});
  }, [alunoId, versao]);

  // Auto-expande o tópico ativo para manter os círculos de exercícios visíveis
  useEffect(() => {
    if (topicoAtivo) setExpandido(topicoAtivo);
  }, [topicoAtivo]);

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
    setExpandido((prev) => (prev === codigo ? null : codigo));
    if (isDisponivel(codigo)) {
      onTopicoClick?.(codigo);
    } else {
      const tp = porTopico.find((t) => t.topico_codigo === codigo);
      onTopicoSoftLock?.(codigo, tp?.topico_nome ?? codigo);
    }
  }

  // ── Constrói lista plana de itens ─────────────────────────────────────────
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
      const color = topicColor(tp.pct, avail);

      nodes.push(
        <div
          key={tp.topico_codigo}
          onClick={() => handleTopicClick(tp.topico_codigo)}
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
          }}
        />
      );
      void d; // suprime aviso de variável não usada
    } else {
      const { ex } = item;
      const isExAtivo = exercicioAtivo === ex.id;

      nodes.push(
        <div
          key={ex.id}
          onClick={() => onExercicioClick?.(ex.id)}
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: exColor(ex.correto, ex.tentado),
            flexShrink: 0,
            cursor: onExercicioClick ? "pointer" : "default",
            border: isExAtivo ? "2px solid #6f42c1" : "1.5px solid rgba(255,255,255,0.85)",
            boxShadow: isExAtivo
              ? "0 0 0 2px rgba(111,66,193,0.35)"
              : "0 0 0 1px rgba(100,100,100,0.1)",
            transition: "background 140ms ease, box-shadow 140ms ease",
          }}
        />
      );
    }

    if (!isLast) {
      const curIsEx = item.kind === "ex";
      const nxtIsEx = next?.kind === "ex";
      const isTopicToTopic = !curIsEx && !nxtIsEx;

      // Conectores tópico→tópico crescem para preencher a largura disponível;
      // conectores envolvendo exercícios têm largura fixa para manter compactos
      if (isTopicToTopic) {
        nodes.push(
          <div key={`c${i}`} style={{ flex: 1, minWidth: 30, height: 2, background: "#e2e8f0" }} />
        );
      } else {
        const w = curIsEx && nxtIsEx ? 10 : 14;
        nodes.push(
          <div key={`c${i}`} style={{ width: w, height: 2, background: "#e2e8f0", flexShrink: 0 }} />
        );
      }
    }
  }

  return (
    <div style={{ overflowX: "auto", padding: "4px 24px 16px", scrollbarWidth: "none" }}>
      {/* minWidth: 100% faz a trilha preencher o card; flex:1 nos conectores distribui o espaço */}
      <div style={{ display: "flex", alignItems: "center", minWidth: "100%", height: 44, paddingTop: 8 }}>
        {nodes}
      </div>

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
    </div>
  );
}
