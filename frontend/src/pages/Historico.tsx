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

  const resumo = useMemo(() => {
    const acertos = itens.filter((item) => item.acertou).length;
    const dicas = itens.reduce((total, item) => total + item.dicas_usadas, 0);
    const aproveitamento = itens.length ? Math.round((acertos / itens.length) * 100) : 0;
    return { acertos, dicas, aproveitamento };
  }, [itens]);

  return (
    <main className="page" style={{ maxWidth: 980 }}>
      <section className="hero-panel">
        <div>
          <p className="hero-kicker">Registro de prática</p>
          <h2 className="hero-title">Histórico de sessões</h2>
          <p className="page-subtitle" style={{ maxWidth: 620 }}>
            Reveja tentativas, acertos, dicas e mudanças de proficiência ao longo dos exercícios.
          </p>
          <div className="hero-actions">
            <Link to="/dashboard" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              <span aria-hidden="true">←</span>
              Voltar ao dashboard
            </Link>
          </div>
        </div>

        <div className="history-summary-grid">
          <div className="card" style={{ padding: 14 }}>
            <div className="stat-label">Sessões</div>
            <strong style={{ fontSize: 24 }}>{itens.length}</strong>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="stat-label">Acertos</div>
            <strong style={{ fontSize: 24, color: "#198754" }}>{resumo.acertos}</strong>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="stat-label">Aproveit.</div>
            <strong style={{ fontSize: 24, color: "#5c2e91" }}>{resumo.aproveitamento}%</strong>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="notice">Carregando histórico...</div>
      ) : erro ? (
        <div className="notice notice-error">
          <strong>Erro ao carregar histórico.</strong>
          <p style={{ margin: "6px 0 12px" }}>{erro}</p>
          <button onClick={carregar} className="btn-secondary">
            Tentar novamente
          </button>
        </div>
      ) : itens.length === 0 ? (
        <div className="notice">
          <strong>Nenhuma sessão registrada ainda.</strong>
          <p style={{ margin: "6px 0 0" }}>Resolva um exercício para começar a construir seu histórico.</p>
        </div>
      ) : (
        <div className="timeline">
          {Object.entries(agrupadoPorData).map(([data, sessoes]) => (
            <section key={data} className="timeline-day">
              <span className="timeline-dot" />
              <h3 className="timeline-date">{data}</h3>

              <div style={{ display: "grid", gap: 14 }}>
                {sessoes.map((item) => (
                  <article key={item.id} className="card card-hover" style={{ padding: 18 }}>
                    <div className="history-session-heading">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span className={`icon-badge ${item.acertou ? "chip-success" : "chip-error"}`} aria-hidden="true">
                            {item.acertou ? "✓" : "×"}
                          </span>
                          <strong style={{ fontSize: 16, color: "#243042" }}>{resumoExercicio(item.exercicio)}</strong>
                          <span className={`chip ${item.acertou ? "chip-success" : "chip-error"}`}>
                            {item.acertou ? "Acerto" : "Erro"}
                          </span>
                        </div>
                        <p style={{ margin: "7px 0 0 44px", color: "#64748b", fontSize: 13 }}>{item.topico}</p>
                      </div>
                      <span style={{ color: "#64748b", fontSize: 13, whiteSpace: "nowrap", fontWeight: 700 }}>
                        {formatarHora(item.data)}
                      </span>
                    </div>

                    <div className="history-metrics">
                      <Metric label="Proficiência" value={`${formatarPct(item.proficiencia_antes)} → ${formatarPct(item.proficiencia_depois)}`} />
                      <Metric label="Tentativas" value={String(item.tentativas)} />
                      <Metric label="Dicas" value={item.usou_dica ? `Sim (${item.dicas_usadas})` : "Não"} />
                    </div>

                    <details style={{ marginTop: 14 }}>
                      <summary style={{ cursor: "pointer", color: "#5c2e91", fontWeight: 800, fontSize: 13 }}>
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
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 12, background: "#f8fafc", border: "1px solid #edf1f5" }}>
      <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800, marginBottom: 4 }}>{label}</div>
      <strong style={{ color: "#334155", fontSize: 13 }}>{value}</strong>
    </div>
  );
}

const S = {
  enunciado: {
    margin: "10px 0 0",
    whiteSpace: "pre-wrap",
    color: "#475569",
    lineHeight: 1.6,
    fontSize: 13,
  } as React.CSSProperties,
};
