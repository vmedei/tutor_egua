import { Link, useLocation, useNavigate } from "react-router-dom";
import { useProgresso } from "../hooks/useProgresso";

export function Navbar() {
  const { globalPct } = useProgresso();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const nome = localStorage.getItem("nome") ?? "Aluno";

  const sair = () => {
    localStorage.clear();
    navigate("/login");
  };

  const linkBase: React.CSSProperties = {
    color: "#fff",
    textDecoration: "none",
    padding: "5px 12px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    transition: "background 0.15s",
  };

  const linkAtivo: React.CSSProperties = {
    ...linkBase,
    background: "rgba(255,255,255,0.22)",
    fontWeight: 700,
  };

  const barColor =
    globalPct < 30 ? "#f87171" : globalPct < 70 ? "#fbbf24" : "#4ade80";

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#5c2e91",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
      }}
    >
      {/* Linha principal */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          gap: 16,
        }}
      >
        <span
          style={{
            color: "#fff",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "-0.3px",
            flexShrink: 0,
          }}
        >
          TutorÉgua
        </span>

        <div style={{ display: "flex", gap: 4 }}>
          <Link to="/dashboard" style={pathname === "/dashboard" ? linkAtivo : linkBase}>
            Dashboard
          </Link>
          <Link to="/exercicio" style={pathname === "/exercicio" ? linkAtivo : linkBase}>
            Exercício
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>{nome}</span>
          <button
            onClick={sair}
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              padding: "5px 12px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Barra de progresso global */}
      <div
        style={{
          padding: "0 24px 10px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 11,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Domínio da linguagem Égua
        </span>
        <div
          style={{
            flex: 1,
            height: 7,
            background: "rgba(255,255,255,0.18)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${globalPct}%`,
              height: "100%",
              background: barColor,
              borderRadius: 4,
              transition: "width 0.7s ease",
            }}
          />
        </div>
        <span
          style={{
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            minWidth: 40,
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {globalPct.toFixed(1)}%
        </span>
      </div>
    </nav>
  );
}
