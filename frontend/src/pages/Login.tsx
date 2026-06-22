import { useState } from "react";
import api from "../api/client";

export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    try {
      const { data } = await api.post("/aluno/login", { email, senha });
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("aluno_id", data.aluno_id);
      localStorage.setItem("nome", data.nome);
      window.location.href = "/dashboard";
    } catch {
      setErro("E-mail ou senha incorretos.");
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 430, padding: 28, boxShadow: "var(--shadow-md)" }}>
        <div
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: "#f1ebfb",
            color: "#5c2e91",
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          T
        </div>

        <h1 className="page-title" style={{ fontSize: 32 }}>
          TutorÉgua
        </h1>
        <p className="page-subtitle" style={{ marginBottom: 24 }}>
          Entre para continuar seus exercícios e acompanhar seu progresso na linguagem Égua.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="seu.email@exemplo.com"
            />
          </div>

          <div className="form-field">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="input"
              placeholder="Digite sua senha"
            />
          </div>

          {erro && (
            <p className="notice notice-error" style={{ padding: 12, margin: "0 0 14px", fontSize: 14 }}>
              {erro}
            </p>
          )}

          <button type="submit" className="btn-primary" style={{ width: "100%" }}>
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
