import { Link } from "react-router-dom";
import { GrafoProgresso } from "../components/GrafoProgresso";
import { ProgressoPorTopicoChart } from "../components/ProgressoPorTopicoChart";
import { useProgresso } from "../hooks/useProgresso";

function corDominio(globalPct: number) {
  if (globalPct >= 70) return "#198754";
  if (globalPct >= 30) return "#d97706";
  return "#dc3545";
}

export function Dashboard() {
  const { porTopico, globalPct, loading, error, recarregar } = useProgresso();

  return (
    <main className="page">
      <section className="hero-panel">
        <div>
          <p className="hero-kicker">Painel de aprendizagem</p>
          <h2 className="hero-title">Progresso por tópico</h2>
          <p className="page-subtitle" style={{ maxWidth: 620 }}>
            Acompanhe a proficiência atual em cada etapa da trilha de Égua e escolha o próximo passo de estudo.
          </p>

          <div className="hero-actions">
            <Link to="/exercicio" className="btn btn-primary" style={{ textDecoration: "none" }}>
              <span aria-hidden="true">▶</span>
              Próximo exercício
            </Link>
            <Link to="/historico" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              <span aria-hidden="true">↺</span>
              Ver histórico
            </Link>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Domínio global</div>
          <strong className="stat-value" style={{ color: corDominio(globalPct) }}>
            {globalPct.toFixed(1)}%
          </strong>
          <div
            style={{
              height: 8,
              marginTop: 12,
              borderRadius: 999,
              background: "#e2e8f0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${globalPct}%`,
                height: "100%",
                background: corDominio(globalPct),
                transition: "width 0.7s ease",
              }}
            />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="notice">Carregando progresso...</div>
      ) : error ? (
        <div className="notice notice-error">
          <strong>Erro ao carregar progresso.</strong>
          <p style={{ margin: "6px 0 12px" }}>{error}</p>
          <button onClick={recarregar} className="btn-secondary">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
          <section style={{ minWidth: 0 }}>
            <div className="section-label">
              <span className="icon-badge" aria-hidden="true">%</span>
              Visão clássica
            </div>
            <ProgressoPorTopicoChart dados={porTopico} />
          </section>

          <section style={{ minWidth: 0 }}>
            <div className="section-label">
              <span className="icon-badge" aria-hidden="true">◎</span>
              Mapa de conhecimento
            </div>
            <GrafoProgresso porTopico={porTopico} compacto />
          </section>
        </div>
      )}
    </main>
  );
}
