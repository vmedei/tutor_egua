import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  titulo: string;
  mensagem: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  perigoso?: boolean;
  carregando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function Modal({
  titulo,
  mensagem,
  labelConfirmar = "Confirmar",
  labelCancelar = "Cancelar",
  perigoso = false,
  carregando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  // Fecha com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelar(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancelar]);

  return createPortal(
    <div
      onClick={onCancelar}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 12,
          padding: "28px 32px", width: "100%", maxWidth: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          margin: 16,
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 18, color: "#18363d" }}>{titulo}</h3>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#4d6570", lineHeight: 1.6 }}>
          {mensagem}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            disabled={carregando}
            style={{
              padding: "9px 20px", background: "#fff", color: "#333",
              border: "1px solid #ccc", borderRadius: 6, cursor: "pointer", fontSize: 14,
              opacity: carregando ? 0.5 : 1,
            }}
          >
            {labelCancelar}
          </button>
          <button
            onClick={onConfirmar}
            disabled={carregando}
            style={{
              padding: "9px 20px", fontWeight: 700, fontSize: 14,
              border: "none", borderRadius: 6, cursor: carregando ? "not-allowed" : "pointer",
              background: perigoso ? "#dc3545" : "#0d6efd",
              color: "#fff",
              opacity: carregando ? 0.7 : 1,
            }}
          >
            {carregando ? "Aguarde..." : labelConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
