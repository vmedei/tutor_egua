import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

interface HistoricoItem {
  id: string;
  data: string;
  topico: string;
  exercicio: string;
  resultado: "acerto" | "erro";
  acertou: boolean;
  usou_dica: boolean;
  dicas_usadas: number;
  proficiencia_antes: number | null;
  proficiencia_depois: number | null;
  delta_proficiencia: number;
  tentativas: number;
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
}

function formatarHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

function formatarPct(valor: number | null) {
  if (valor === null || valor === undefined) return "sem registro";
  return `${Math.round(valor * 100)}%`;
}

function resumoExercicio(enunciado: string) {
  const primeiraLinha = enunciado.trim().split("\n")[0] ?? "Exercício";
  return primeiraLinha.length > 96 ? `${primeiraLinha.slice(0, 93)}...` : primeiraLinha;
}

export function Historico() {
  const [itens, setItens] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const alunoId = localStorage.getItem("aluno_id") ?? "";

  const carregar = () => {
    if (!alunoId) {
      setErro("Sessão inválida. Faça login novamente.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);
    api
      .get<HistoricoItem[]>(`/sessao/historico/${alunoId}`)
      .then(({ data }) => setItens(data))
      .catch(() => setErro("Não foi possível carregar o histórico de sessões."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agrupadoPorData = useMemo(() => {
    return itens.reduce<Record<string, HistoricoItem[]>>((acc, item) => {
      const data = formatarData(item.data);
      acc[data] = [...(acc[data] ?? []), item];
      return acc;
    }, {});
  }, [itens]);

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Histórico de Sessões</h2>
          <p style={{ margin: "6px 0 0", color: "#6c757d", fontSize: 14 }}>
            Reveja tentativas, acertos, dicas e mudanças de proficiência.
          </p>
        </div>
        <Link to="/dashboard">
          <button
            style={{
              padding: "9px 16px",
              border: "1px solid #6f42c1",
              borderRadius: 8,
              background: "#fff",
              color: "#6f42c1",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Voltar ao Dashboard
          </button>
        </Link>
      </div>

      {loading ? (
        <div style={S.notice}>Carregando histórico...</div>
      ) : erro ? (
        <div style={{ ...S.notice, borderColor: "#f5c2c7", background: "#f8d7da", color: "#842029" }}>
          <strong>Erro ao carregar histórico.</strong>
          <p style={{ margin: "6px 0 12px" }}>{erro}</p>
          <button onClick={carregar} style={S.retryButton}>
            Tentar novamente
          </button>
        </div>
      ) : itens.length === 0 ? (
        <div style={S.notice}>
          <strong>Nenhuma sessão registrada ainda.</strong>
          <p style={{ margin: "6px 0 0" }}>Resolva um exercício para começar a construir seu histórico.</p>
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 22 }}>
          <div style={S.timelineLine} />
          {Object.entries(agrupadoPorData).map(([data, sessoes]) => (
            <section key={data} style={{ marginBottom: 28 }}>
              <h3 style={S.dateTitle}>{data}</h3>
              <div style={{ display: "grid", gap: 14 }}>
                {sessoes.map((item) => (
                  <article key={item.id} style={S.card}>
                    <div
                      style={{
                        ...S.marker,
                        background: item.acertou ? "#198754" : "#dc3545",
                      }}
                    >
                      {item.acertou ? "✓" : "×"}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 16 }}>{resumoExercicio(item.exercicio)}</strong>
                          <span style={item.acertou ? S.successChip : S.errorChip}>
                            {item.acertou ? "Acerto" : "Erro"}
                          </span>
                        </div>
                        <p style={{ margin: "5px 0 0", color: "#6c757d", fontSize: 13 }}>{item.topico}</p>
                      </div>
                      <span style={{ color: "#6c757d", fontSize: 13, whiteSpace: "nowrap" }}>
                        {formatarHora(item.data)}
                      </span>
                    </div>

                    <div style={S.metrics}>
                      <span>
                        Proficiência:{" "}
                        <strong>
                          {formatarPct(item.proficiencia_antes)} → {formatarPct(item.proficiencia_depois)}
                        </strong>
                      </span>
                      <span>
                        Tentativas: <strong>{item.tentativas}</strong>
                      </span>
                      <span>
                        Usou dica: <strong>{item.usou_dica ? `Sim (${item.dicas_usadas})` : "Não"}</strong>
                      </span>
                    </div>

                    <details style={{ marginTop: 12 }}>
                      <summary style={{ cursor: "pointer", color: "#6f42c1", fontWeight: 700, fontSize: 13 }}>
                        Ver enunciado completo
                      </summary>
                      <p style={S.enunciado}>{item.exercicio}</p>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  notice: {
    border: "1px solid #dee2e6",
    borderRadius: 8,
    padding: 20,
    background: "#fff",
    color: "#6c757d",
  } as React.CSSProperties,
  retryButton: {
    padding: "8px 14px",
    border: "1px solid #842029",
    borderRadius: 6,
    background: "transparent",
    color: "#842029",
    cursor: "pointer",
    fontWeight: 600,
  } as React.CSSProperties,
  timelineLine: {
    position: "absolute",
    left: 6,
    top: 8,
    bottom: 0,
    width: 2,
    background: "#dee2e6",
  } as React.CSSProperties,
  dateTitle: {
    margin: "0 0 12px",
    color: "#343a40",
    fontSize: 15,
    fontWeight: 800,
  } as React.CSSProperties,
  card: {
    position: "relative",
    border: "1px solid #dee2e6",
    borderRadius: 8,
    padding: 18,
    background: "#fff",
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  } as React.CSSProperties,
  marker: {
    position: "absolute",
    left: -27,
    top: 18,
    width: 24,
    height: 24,
    borderRadius: "50%",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    border: "3px solid #fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
  } as React.CSSProperties,
  successChip: {
    borderRadius: 999,
    padding: "3px 9px",
    background: "#d1fae5",
    color: "#065f46",
    fontSize: 12,
    fontWeight: 800,
  } as React.CSSProperties,
  errorChip: {
    borderRadius: 999,
    padding: "3px 9px",
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 800,
  } as React.CSSProperties,
  metrics: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 18px",
    marginTop: 14,
    color: "#495057",
    fontSize: 13,
  } as React.CSSProperties,
  enunciado: {
    margin: "10px 0 0",
    whiteSpace: "pre-wrap",
    color: "#495057",
    lineHeight: 1.6,
    fontSize: 13,
  } as React.CSSProperties,
};
