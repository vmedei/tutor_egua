import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useProgresso } from "../hooks/useProgresso";
import { Modal } from "./Modal";

export function Navbar() {
  const { globalPct, recarregar, sinalReset } = useProgresso();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const nome = localStorage.getItem("nome") ?? "Aluno";
  const alunoId = localStorage.getItem("aluno_id") ?? "";

  const [modalAberto, setModalAberto] = useState(false);
  const [resetando, setResetando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  const sair = () => {
    localStorage.clear();
    navigate("/login");
  };

  const confirmarReset = async () => {
    setResetando(true);
    try {
      await api.post(`/aluno/${alunoId}/resetar`);
      setModalAberto(false);
      setMensagemSucesso(true);
      recarregar();
      sinalReset();
      setTimeout(() => setMensagemSucesso(false), 3000);
    } catch {
      setModalAberto(false);
    } finally {
      setResetando(false);
    }
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
    <>
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
              <Link to="/tutor" style={pathname === "/tutor" ? linkAtivo : linkBase}>
                Tutor
              </Link>
              <Link to="/exercicio" style={pathname === "/exercicio" ? linkAtivo : linkBase}>
                Exercícios
              </Link>
              <Link to="/dashboard" style={pathname === "/dashboard" ? linkAtivo : linkBase}>
                Dashboard
              </Link>
              <Link to="/historico" style={pathname === "/historico" ? linkAtivo : linkBase}>
                Histórico
              </Link>
            </div>

            <div className="app-user-actions">
              <span style={{ color: "rgba(255,255,255,0.84)", fontSize: 13, fontWeight: 700 }}>{nome}</span>
              {mensagemSucesso && (
                <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>
                  Dados zerados!
                </span>
              )}
              <button
                onClick={() => setModalAberto(true)}
                title="Resetar todos os dados de progresso"
                style={{
                  minHeight: 34,
                  background: "rgba(220,53,69,0.18)",
                  color: "#fca5a5",
                  border: "1px solid rgba(220,53,69,0.4)",
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                Resetar dados
              </button>
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
                  cursor: "pointer",
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

      {modalAberto && (
        <Modal
          titulo="Resetar todos os dados?"
          mensagem={`Isso apagará permanentemente todo o progresso, sessões e histórico de ${nome}. O acesso ao sistema continua, mas tudo voltará ao zero. Essa ação não pode ser desfeita.`}
          labelConfirmar="Sim, resetar tudo"
          labelCancelar="Cancelar"
          perigoso
          carregando={resetando}
          onConfirmar={confirmarReset}
          onCancelar={() => !resetando && setModalAberto(false)}
        />
      )}
    </>
  );
}
