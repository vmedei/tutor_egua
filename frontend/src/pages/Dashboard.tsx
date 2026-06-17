import { Link } from "react-router-dom";
import { GrafoProgresso } from "../components/GrafoProgresso";
import { useProgresso } from "../hooks/useProgresso";

export function Dashboard() {
  const { porTopico, globalPct, loading } = useProgresso();

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Mapa de Conhecimento</h2>
        <span style={{ color: "#6c757d", fontSize: 14 }}>
          Domínio global: <strong style={{ color: globalPct >= 70 ? "#198754" : globalPct >= 30 ? "#fd7e14" : "#dc3545" }}>{globalPct.toFixed(1)}%</strong>
        </span>
      </div>

      {loading ? (
        <p style={{ color: "#6c757d" }}>Carregando progresso…</p>
      ) : (
        <GrafoProgresso porTopico={porTopico} />
      )}

      <Link to="/exercicio">
        <button
          style={{
            marginTop: 20,
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
    </div>
  );
}
