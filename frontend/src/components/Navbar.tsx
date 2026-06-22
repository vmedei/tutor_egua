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
    color: "rgba(255,255,255,0.86)",
    textDecoration: "none",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    transition: "background 0.16s ease, color 0.16s ease, transform 0.16s ease",
  };

  const linkAtivo: React.CSSProperties = {
    ...linkBase,
    color: "#43206f",
    background: "#fff",
    boxShadow: "0 8px 18px rgba(25, 10, 45, 0.16)",
  };

  const barColor = globalPct < 30 ? "#f87171" : globalPct < 70 ? "#fbbf24" : "#4ade80";

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "linear-gradient(90deg, #43206f 0%, #5c2e91 58%, #6f42c1 100%)",
        boxShadow: "0 2px 16px rgba(38, 18, 68, 0.22)",
      }}
    >
      <div className="app-nav-inner">
        <div className="app-nav-main">
          <span className="app-brand">
            <span
              aria-hidden="true"
              style={{
                width: 32,
                height: 32,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.24)",
              }}
            >
              T
            </span>
            TutorÉgua
          </span>

          <div className="app-nav-links">
            <Link to="/dashboard" style={pathname === "/dashboard" ? linkAtivo : linkBase}>
              Dashboard
            </Link>
            <Link to="/exercicio" style={pathname === "/exercicio" ? linkAtivo : linkBase}>
              Exercício
            </Link>
            <Link to="/historico" style={pathname === "/historico" ? linkAtivo : linkBase}>
              Histórico
            </Link>
          </div>

          <div className="app-user-actions">
            <span style={{ color: "rgba(255,255,255,0.84)", fontSize: 13, fontWeight: 700 }}>{nome}</span>
            <button
              onClick={sair}
              style={{
                minHeight: 34,
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.28)",
                padding: "6px 12px",
                fontSize: 13,
                borderRadius: 999,
              }}
            >
              Sair
            </button>
          </div>
        </div>

        <div className="app-progress">
          <span className="app-progress-label">
            Domínio em Égua
          </span>
          <div className="app-progress-track">
            <div
              style={{
                width: `${globalPct}%`,
                height: "100%",
                background: barColor,
                borderRadius: 999,
                transition: "width 0.7s ease",
              }}
            />
          </div>
          <span className="app-progress-value">
            {globalPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </nav>
  );
}
