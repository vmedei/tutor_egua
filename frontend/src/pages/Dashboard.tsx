import { Link } from "react-router-dom";
import { ProgressoPorTopicoChart } from "../components/ProgressoPorTopicoChart";
import { useProgresso } from "../hooks/useProgresso";

export function Dashboard() {
  const { porTopico, globalPct, loading, error, recarregar } = useProgresso();

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Progresso por Tópico</h2>
          <p style={{ margin: "6px 0 0", color: "#6c757d", fontSize: 14 }}>
            Acompanhe a proficiência atual em cada etapa da trilha de Égua.
          </p>
        </div>
        <div
          style={{
            border: "1px solid #dee2e6",
            borderRadius: 8,
            padding: "10px 14px",
            minWidth: 145,
            textAlign: "right",
            background: "#fff",
          }}
        >
          <div style={{ color: "#6c757d", fontSize: 12 }}>Domínio global</div>
          <strong
            style={{
              color: globalPct >= 70 ? "#198754" : globalPct >= 30 ? "#fd7e14" : "#dc3545",
              fontSize: 24,
              lineHeight: 1.2,
            }}
          >
            {globalPct.toFixed(1)}%
          </strong>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            border: "1px solid #dee2e6",
            borderRadius: 8,
            padding: 24,
            color: "#6c757d",
            background: "#fff",
          }}
        >
          Carregando progresso...
        </div>
      ) : error ? (
        <div
          style={{
            border: "1px solid #f5c2c7",
            borderRadius: 8,
            padding: 18,
            background: "#f8d7da",
            color: "#842029",
          }}
        >
          <strong>Erro ao carregar progresso.</strong>
          <p style={{ margin: "6px 0 12px" }}>{error}</p>
          <button
            onClick={recarregar}
            style={{
              padding: "8px 14px",
              border: "1px solid #842029",
              borderRadius: 6,
              background: "transparent",
              color: "#842029",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <ProgressoPorTopicoChart dados={porTopico} />
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <Link to="/exercicio">
          <button
            style={{
              padding: "10px 24px",
              background: "#6f42c1",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Próximo Exercício →
          </button>
        </Link>
        <Link to="/historico">
          <button
            style={{
              padding: "10px 20px",
              background: "#fff",
              color: "#6f42c1",
              border: "1px solid #6f42c1",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Ver Histórico
          </button>
        </Link>
      </div>
    </div>
  );
}
