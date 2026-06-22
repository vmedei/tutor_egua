import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import api from "../api/client";
import { ChatBot } from "../components/ChatBot";
import { useProgresso } from "../hooks/useProgresso";

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
  enunciado: { whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: 15, margin: 0 } as CSSProperties,
  editor: {
    width: "100%",
    minHeight: 230,
    fontFamily: '"Fira Code", "Consolas", monospace',
    fontSize: 14,
    padding: 16,
    border: "1px solid #334155",
    borderRadius: 14,
    background: "#1f2937",
    color: "#e5e7eb",
    resize: "vertical",
    lineHeight: 1.6,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
  } as CSSProperties,
  tag: (ok: boolean): CSSProperties => ({
    display: "inline-flex",
    justifyContent: "center",
    minWidth: 42,
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: ok ? "#d1fae5" : "#fee2e2",
    color: ok ? "#065f46" : "#991b1b",
  }),
  feedbackBox: (ok: boolean): CSSProperties => ({
    marginTop: 18,
    padding: 20,
    borderRadius: 16,
    lineHeight: 1.7,
    background: ok ? "#f0fdf4" : "#fffbeb",
    border: `1px solid ${ok ? "#9fd7b4" : "#f6d477"}`,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.07)",
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
  const [dicasUsadas, setDicasUsadas] = useState(0);
  const { recarregar } = useProgresso();

  const alunoId = localStorage.getItem("aluno_id") ?? "";

  const carregarProximo = () => {
    setExercicio(null);
    setCodigo("");
    setResposta("");
    setExecucao(null);
    setSubmissao(null);
    setDicasUsadas(0);
    setErro(null);
    setConcluido(false);
    setCarregando(true);
    api
      .get(`/tutor/proximo-exercicio/${alunoId}`)
      .then(({ data }) => setExercicio(data))
      .catch((e) => {
        if (e?.response?.status === 404) setConcluido(true);
        else setErro("Erro ao carregar exercício. Tente novamente.");
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    if (!alunoId) {
      setErro("Sessão inválida. Faça login novamente.");
      setCarregando(false);
      return;
    }
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
        dicas_usadas: dicasUsadas,
      });
      setSubmissao(data);
      recarregar();
    } catch {
      setErro("Erro ao submeter resposta.");
    } finally {
      setSubmetendo(false);
    }
  };

  if (carregando) {
    return (
      <main className="page page-narrow">
        <div className="notice">Carregando exercício...</div>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="page page-narrow">
        <div className="notice notice-error">
          <strong>Algo deu errado.</strong>
          <p style={{ margin: "6px 0 0" }}>{erro}</p>
        </div>
      </main>
    );
  }

  if (concluido) {
    return (
      <main className="page page-narrow" style={{ textAlign: "center" }}>
        <div className="card exercise-card">
          <span className="icon-badge" aria-hidden="true" style={{ margin: "0 auto 12px" }}>✓</span>
          <h2 className="page-title" style={{ fontSize: 28 }}>
            Parabéns!
          </h2>
          <p className="page-subtitle" style={{ margin: "8px auto 22px", maxWidth: 560 }}>
            Você concluiu todos os exercícios disponíveis. Continue praticando na IDEgua ou aguarde novos conteúdos.
          </p>
          <a
            href="http://programar.egua.dev/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
            style={{ textDecoration: "none" }}
          >
            Abrir IDEgua ↗
          </a>
        </div>
      </main>
    );
  }

  if (!exercicio) return null;

  const eLivre = exercicio.tipo === "implementacao_livre";
  const casos = exercicio.casos_de_teste ?? [];

  return (
    <main className="page page-narrow">
      <section className="hero-panel" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <p className="hero-kicker">Prática guiada</p>
          <h2 className="hero-title">Exercício</h2>
          <p className="page-subtitle">
            {exercicio.topico_nome} · {exercicio.tipo.replace(/_/g, " ")}
          </p>
        </div>
      </section>

      <div className="exercise-shell">
        <section className="card card-soft exercise-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span className="icon-badge" aria-hidden="true">?</span>
            <strong style={{ color: "#334155" }}>Enunciado</strong>
          </div>
          <p style={S.enunciado}>{exercicio.enunciado}</p>
        </section>

        {eLivre && casos.length > 0 && (
          <section className="card exercise-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="icon-badge" aria-hidden="true">↔</span>
              <strong style={{ fontSize: 14, color: "#334155" }}>Exemplos de entrada/saída</strong>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Entrada</th>
                    <th>Saída esperada</th>
                  </tr>
                </thead>
                <tbody>
                  {casos.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: "monospace" }}>{c.entrada || "(nenhuma)"}</td>
                      <td style={{ fontFamily: "monospace" }}>{c.saida_esperada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {exercicio.tipo === "multipla_escolha" && exercicio.gabarito?.opcoes && (
          <section className="card exercise-card">
            <div style={{ display: "grid", gap: 10 }}>
              {exercicio.gabarito.opcoes.map((op, i) => (
                <label
                  key={i}
                  className={`card option-card ${resposta === String(i) ? "option-card-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="opcao"
                    value={String(i)}
                    onChange={(e) => setResposta(e.target.value)}
                  />
                  {op}
                </label>
              ))}
            </div>
          </section>
        )}

        {exercicio.tipo === "completar_codigo" && (
          <section className="card exercise-card">
            <label className="form-field" style={{ margin: 0 }}>
              <span>Resposta</span>
              <input
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Digite a palavra que completa o código"
                className="input"
              />
            </label>
          </section>
        )}

        {eLivre && (
          <section className="card exercise-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="icon-badge" aria-hidden="true">{`{}`}</span>
                <strong style={{ color: "#334155" }}>Seu código em Égua</strong>
              </div>
              <a href="http://programar.egua.dev/" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#5c2e91", fontWeight: 800 }}>
                Abrir IDEgua ↗
              </a>
            </div>
            <textarea
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder={'escreva("olá mundo")'}
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
          </section>
        )}

        {!submissao && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {eLivre && (
              <button onClick={executar} disabled={executando || !codigo.trim()} className="btn-muted">
                <span aria-hidden="true">▶</span>
                {executando ? "Executando..." : "Executar"}
              </button>
            )}
            <button onClick={submeter} disabled={submetendo} className="btn-primary">
              <span aria-hidden="true">✓</span>
              {submetendo ? "Submetendo..." : "Submeter"}
            </button>
          </div>
        )}

        {execucao && !submissao && (
          <section className="card exercise-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="icon-badge" aria-hidden="true">▶</span>
              <strong style={{ fontSize: 14 }}>Resultado da execução</strong>
            </div>
            {execucao.erro && (
              <pre
                style={{
                  background: "#fffbeb",
                  border: "1px solid #f6d477",
                  padding: 12,
                  borderRadius: 12,
                  marginTop: 12,
                  fontSize: 13,
                  whiteSpace: "pre-wrap",
                }}
              >
                {execucao.erro}
              </pre>
            )}
            {execucao.saidas.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Entrada</th>
                      <th>Esperado</th>
                      <th>Obtido</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {execucao.saidas.map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: "monospace" }}>{s.entrada || "-"}</td>
                        <td style={{ fontFamily: "monospace" }}>{s.saida_esperada || "-"}</td>
                        <td style={{ fontFamily: "monospace" }}>{s.saida_obtida || "-"}</td>
                        <td style={{ textAlign: "center" }}>
                          <span style={S.tag(s.correto)}>{s.correto ? "OK" : "Erro"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {execucao.todos_corretos && (
              <p style={{ color: "#065f46", margin: "12px 0 0", fontWeight: 800 }}>
                Todos os casos passaram. Clique em "Submeter" para registrar.
              </p>
            )}
          </section>
        )}

        <ChatBot
          topicoNome={exercicio.topico_nome ?? exercicio.tipo.replace(/_/g, " ")}
          exercicioEnunciado={exercicio.enunciado}
          onMensagemEnviada={() => setDicasUsadas((total) => total + 1)}
        />

        {submissao && (
          <section style={S.feedbackBox(submissao.correto)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <span className={`icon-badge ${submissao.correto ? "chip-success" : "chip-error"}`} aria-hidden="true">
                {submissao.correto ? "✓" : "×"}
              </span>
              <strong>{submissao.correto ? "Correto!" : "Resposta incorreta"}</strong>
              {submissao.delta_proficiencia !== 0 && (
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                  ({submissao.delta_proficiencia > 0 ? "+" : ""}
                  {(submissao.delta_proficiencia * 100).toFixed(0)}% proficiência)
                </span>
              )}
            </div>
            {submissao.detalhe && (
              <p style={{ fontSize: 13, color: "#475569", marginBottom: submissao.feedback ? 8 : 12 }}>
                {submissao.detalhe}
              </p>
            )}
            {submissao.feedback && (
              <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, marginBottom: 14 }}>
                <strong>Dica da IA:</strong> {submissao.feedback}
              </p>
            )}
            <button onClick={carregarProximo} className="btn-success">
              Próxima questão →
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
