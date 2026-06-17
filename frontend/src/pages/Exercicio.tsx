import { useEffect, useState } from "react";
import api from "../api/client";
import { ChatBot } from "../components/ChatBot";

interface CasoTeste {
  entrada: string;
  saida_esperada: string;
}

interface ExercicioData {
  id: string;
  topico_nome: string | null;
  enunciado: string;
  tipo: string;
  gabarito?: { opcoes?: string[]; resposta?: string };
  casos_de_teste?: CasoTeste[];
}

interface ResultadoCaso {
  entrada: string;
  saida_esperada: string;
  saida_obtida: string;
  correto: boolean;
}

interface ResultadoExecucao {
  saidas: ResultadoCaso[];
  todos_corretos: boolean;
  erro: string | null;
}

interface ResultadoSubmissao {
  correto: boolean;
  delta_proficiencia: number;
  feedback: string | null;
  detalhe: string | null;
}

const S = {
  page: { padding: 24, maxWidth: 860, margin: "0 auto", fontFamily: "sans-serif" } as React.CSSProperties,
  card: { background: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: 8, padding: 20, marginBottom: 20 } as React.CSSProperties,
  enunciado: { whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 15 } as React.CSSProperties,
  editor: {
    width: "100%", minHeight: 200, fontFamily: "monospace", fontSize: 14,
    padding: 14, border: "1px solid #495057", borderRadius: 6,
    background: "#1e1e1e", color: "#d4d4d4", resize: "vertical",
    boxSizing: "border-box", lineHeight: 1.6,
  } as React.CSSProperties,
  btnPrimary: {
    padding: "10px 28px", background: "#0d6efd", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14,
  } as React.CSSProperties,
  btnSecondary: {
    padding: "10px 20px", background: "#fff", color: "#333",
    border: "1px solid #ccc", borderRadius: 6, cursor: "pointer", fontSize: 14,
  } as React.CSSProperties,
  btnSuccess: {
    padding: "10px 28px", background: "#198754", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14,
  } as React.CSSProperties,
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" } as React.CSSProperties,
  tag: (ok: boolean): React.CSSProperties => ({
    display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700,
    background: ok ? "#d1fae5" : "#fee2e2", color: ok ? "#065f46" : "#991b1b",
  }),
  feedbackBox: (ok: boolean): React.CSSProperties => ({
    marginTop: 16, padding: 16, borderRadius: 8, lineHeight: 1.7,
    background: ok ? "#d1fae5" : "#fff3cd",
    border: `1px solid ${ok ? "#6ee7b7" : "#fcd34d"}`,
  }),
};

export function Exercicio() {
  const [exercicio, setExercicio] = useState<ExercicioData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [resposta, setResposta] = useState("");
  const [executando, setExecutando] = useState(false);
  const [submetendo, setSubmetendo] = useState(false);
  const [execucao, setExecucao] = useState<ResultadoExecucao | null>(null);
  const [submissao, setSubmissao] = useState<ResultadoSubmissao | null>(null);

  const alunoId = localStorage.getItem("aluno_id") ?? "";

  const carregarProximo = () => {
    setExercicio(null);
    setCodigo("");
    setResposta("");
    setExecucao(null);
    setSubmissao(null);
    setErro(null);
    setConcluido(false);
    setCarregando(true);
    api.get(`/tutor/proximo-exercicio/${alunoId}`)
      .then(({ data }) => setExercicio(data))
      .catch((e) => {
        if (e?.response?.status === 404) setConcluido(true);
        else setErro("Erro ao carregar exercício. Tente novamente.");
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    if (!alunoId) { setErro("Sessão inválida. Faça login novamente."); setCarregando(false); return; }
    carregarProximo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executar = async () => {
    if (!exercicio || executando) return;
    setExecutando(true);
    setExecucao(null);
    setSubmissao(null);
    try {
      const { data } = await api.post("/sessao/executar", {
        codigo,
        casos_de_teste: exercicio.casos_de_teste ?? [],
      });
      setExecucao(data);
    } catch {
      setErro("Erro ao executar código.");
    } finally {
      setExecutando(false);
    }
  };

  const submeter = async () => {
    if (!exercicio || submetendo) return;
    const respostaFinal = exercicio.tipo === "implementacao_livre" ? codigo : resposta;
    setSubmetendo(true);
    setSubmissao(null);
    try {
      const { data } = await api.post("/sessao/", {
        aluno_id: alunoId,
        exercicio_id: exercicio.id,
        resposta: respostaFinal,
        dicas_usadas: 0,
      });
      setSubmissao(data);
    } catch {
      setErro("Erro ao submeter resposta.");
    } finally {
      setSubmetendo(false);
    }
  };

  if (carregando) return <p style={{ padding: 24 }}>Carregando exercício...</p>;
  if (erro) return <p style={{ padding: 24, color: "#dc3545" }}>{erro}</p>;
  if (concluido) return (
    <div style={{ padding: 40, maxWidth: 560, margin: "0 auto", textAlign: "center", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h2 style={{ marginBottom: 8 }}>Parabéns!</h2>
      <p style={{ color: "#555", lineHeight: 1.7 }}>
        Você concluiu todos os exercícios disponíveis.<br />
        Continue praticando na IDEgua ou aguarde novos conteúdos.
      </p>
      <a
        href="http://programar.egua.dev/"
        target="_blank"
        rel="noreferrer"
        style={{ display: "inline-block", marginTop: 20, padding: "10px 24px", background: "#0d6efd", color: "#fff", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}
      >
        Abrir IDEgua
      </a>
    </div>
  );
  if (!exercicio) return null;

  const eLivre = exercicio.tipo === "implementacao_livre";
  const casos = exercicio.casos_de_teste ?? [];

  return (
    <div style={S.page}>
      <h2 style={{ marginBottom: 4 }}>Exercício</h2>
      <p style={{ color: "#6c757d", marginBottom: 20, fontSize: 13 }}>
        Tópico · {exercicio.tipo.replace("_", " ")}
      </p>

      {/* Enunciado */}
      <div style={S.card}>
        <p style={S.enunciado}>{exercicio.enunciado}</p>
      </div>

      {/* Casos de teste visíveis (só para implementação livre) */}
      {eLivre && casos.length > 0 && (
        <div style={{ ...S.card, background: "#fff" }}>
          <strong style={{ fontSize: 13 }}>Exemplos de entrada/saída:</strong>
          <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#e9ecef" }}>
                <th style={{ padding: "6px 10px", textAlign: "left" }}>Entrada</th>
                <th style={{ padding: "6px 10px", textAlign: "left" }}>Saída esperada</th>
              </tr>
            </thead>
            <tbody>
              {casos.map((c, i) => (
                <tr key={i} style={{ borderTop: "1px solid #dee2e6" }}>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{c.entrada || "(nenhuma)"}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{c.saida_esperada}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Múltipla escolha */}
      {exercicio.tipo === "multipla_escolha" && exercicio.gabarito?.opcoes && (
        <div style={{ marginBottom: 20 }}>
          {exercicio.gabarito.opcoes.map((op, i) => (
            <label key={i} style={{ display: "block", padding: "10px 14px", marginBottom: 8, border: "1px solid #dee2e6", borderRadius: 6, cursor: "pointer", background: resposta === String(i) ? "#e7f1ff" : "#fff" }}>
              <input type="radio" name="opcao" value={String(i)} onChange={(e) => setResposta(e.target.value)} style={{ marginRight: 10 }} />
              {op}
            </label>
          ))}
        </div>
      )}

      {/* Completar código */}
      {exercicio.tipo === "completar_codigo" && (
        <input
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          placeholder="Digite a palavra que completa o código"
          style={{ width: "100%", padding: 10, fontSize: 15, borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box", marginBottom: 16 }}
        />
      )}

      {/* Editor de código */}
      {eLivre && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#495057", fontWeight: 600 }}>Seu código em Égua:</span>
            <a href="http://programar.egua.dev/" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0d6efd" }}>
              Abrir IDEgua ↗
            </a>
          </div>
          <textarea
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder={"escreva(\"olá mundo\")"}
            style={S.editor}
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const s = e.currentTarget;
                const v = s.value;
                s.value = v.substring(0, s.selectionStart) + "    " + v.substring(s.selectionEnd);
                s.selectionStart = s.selectionEnd = s.selectionStart + 4 - (v.length - s.value.length + 4);
                setCodigo(s.value);
              }
            }}
          />
        </div>
      )}

      {/* Botões — ocultos após submissão */}
      {!submissao && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {eLivre && (
            <button
              onClick={executar}
              disabled={executando || !codigo.trim()}
              style={{ ...S.btnSecondary, ...(executando || !codigo.trim() ? S.btnDisabled : {}) }}
            >
              {executando ? "Executando..." : "▶ Executar"}
            </button>
          )}
          <button
            onClick={submeter}
            disabled={submetendo}
            style={{ ...S.btnPrimary, ...(submetendo ? S.btnDisabled : {}) }}
          >
            {submetendo ? "Submetendo..." : "✓ Submeter"}
          </button>
        </div>
      )}

      {/* Resultado da execução (rascunho) */}
      {execucao && !submissao && (
        <div style={{ marginBottom: 20 }}>
          <strong style={{ fontSize: 14 }}>Resultado da execução:</strong>
          {execucao.erro && (
            <pre style={{ background: "#fff3cd", padding: 12, borderRadius: 6, marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap" }}>
              ⚠️ {execucao.erro}
            </pre>
          )}
          {execucao.saidas.length > 0 && (
            <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#e9ecef" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Entrada</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Esperado</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Obtido</th>
                  <th style={{ padding: "6px 10px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {execucao.saidas.map((s, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #dee2e6", background: s.correto ? "#f0fdf4" : "#fff5f5" }}>
                    <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{s.entrada || "—"}</td>
                    <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{s.saida_esperada || "—"}</td>
                    <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{s.saida_obtida || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <span style={S.tag(s.correto)}>{s.correto ? "✓" : "✗"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {execucao.todos_corretos && (
            <p style={{ color: "#065f46", marginTop: 8, fontWeight: 600 }}>
              Todos os casos passaram! Clique em "Submeter" para registrar.
            </p>
          )}
        </div>
      )}

      {/* Chatbot de apoio */}
      <ChatBot
        topicoNome={exercicio.topico_nome ?? exercicio.tipo.replace(/_/g, " ")}
        exercicioEnunciado={exercicio.enunciado}
      />

      {/* Resultado da submissão */}
      {submissao && (
        <div style={S.feedbackBox(submissao.correto)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{submissao.correto ? "✅" : "❌"}</span>
            <strong>{submissao.correto ? "Correto!" : "Resposta incorreta"}</strong>
            {submissao.delta_proficiencia !== 0 && (
              <span style={{ fontSize: 12, color: "#555" }}>
                ({submissao.delta_proficiencia > 0 ? "+" : ""}{(submissao.delta_proficiencia * 100).toFixed(0)}% proficiência)
              </span>
            )}
          </div>
          {submissao.detalhe && (
            <p style={{ fontSize: 13, color: "#555", marginBottom: submissao.feedback ? 8 : 12 }}>
              {submissao.detalhe}
            </p>
          )}
          {submissao.feedback && (
            <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
              <strong>Dica da IA:</strong> {submissao.feedback}
            </p>
          )}
          <button onClick={carregarProximo} style={S.btnSuccess}>
            Próxima questão →
          </button>
        </div>
      )}
    </div>
  );
}
