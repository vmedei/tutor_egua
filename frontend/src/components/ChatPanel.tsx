import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useProgresso } from "../hooks/useProgresso";

// ─── Tipos locais ────────────────────────────────────────────────────────────

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

interface MensagemTexto {
  id: number;
  papel: "aluno" | "assistente";
  tipo?: "aviso";
  texto: string;
}

interface MensagemExercicio {
  id: number;
  papel: "sistema";
  tipo: "exercicio";
  exercicio: ExercicioData;
}

type Mensagem = MensagemTexto | MensagemExercicio;

export interface TopicoSelecionado {
  codigo: string;
  nome: string;
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styleTag = document.createElement("style");
styleTag.textContent = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }`;
document.head.appendChild(styleTag);

const S = {
  btnPrimary: {
    padding: "8px 18px", background: "#0d6efd", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13,
  } as React.CSSProperties,
  btnSecondary: {
    padding: "8px 16px", background: "#fff", color: "#333",
    border: "1px solid #ccc", borderRadius: 6, cursor: "pointer", fontSize: 13,
  } as React.CSSProperties,
  btnSuccess: {
    padding: "8px 18px", background: "#198754", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13,
  } as React.CSSProperties,
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" } as React.CSSProperties,
  tag: (ok: boolean): React.CSSProperties => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
    background: ok ? "#d1fae5" : "#fee2e2", color: ok ? "#065f46" : "#991b1b",
  }),
};

// ─── ExercicioCard ────────────────────────────────────────────────────────────

function ExercicioCard({
  exercicio,
  alunoId,
  onProximoExercicio,
}: {
  exercicio: ExercicioData;
  alunoId: string;
  onProximoExercicio: () => void;
}) {
  const [resposta, setResposta] = useState("");
  const [codigo, setCodigo] = useState("");
  const [executando, setExecutando] = useState(false);
  const [submetendo, setSubmetendo] = useState(false);
  const [execucao, setExecucao] = useState<ResultadoExecucao | null>(null);
  const [submissao, setSubmissao] = useState<ResultadoSubmissao | null>(null);
  const { recarregar } = useProgresso();

  const eLivre = exercicio.tipo === "implementacao_livre";
  const casos = exercicio.casos_de_teste ?? [];

  // Após resposta correta, avança automaticamente depois de 1 s
  useEffect(() => {
    if (!submissao?.correto) return;
    const t = setTimeout(onProximoExercicio, 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissao?.correto]);

  const tentarNovamente = () => {
    setCodigo("");
    setResposta("");
    setExecucao(null);
    setSubmissao(null);
  };

  const executar = async () => {
    if (executando) return;
    setExecutando(true);
    setExecucao(null);
    try {
      const { data } = await api.post("/sessao/executar", {
        codigo,
        casos_de_teste: casos,
      });
      setExecucao(data);
    } finally {
      setExecutando(false);
    }
  };

  const submeter = async () => {
    if (submetendo) return;
    const respostaFinal = eLivre ? codigo : resposta;
    setSubmetendo(true);
    try {
      const { data } = await api.post("/sessao/", {
        aluno_id: alunoId,
        exercicio_id: exercicio.id,
        resposta: respostaFinal,
        dicas_usadas: 0,
      });
      setSubmissao(data);
      recarregar();
    } finally {
      setSubmetendo(false);
    }
  };

  return (
    <div style={{
      border: "1px solid #dee2e6", borderRadius: 12, overflow: "hidden",
      background: "#fff", marginTop: 4,
    }}>
      <div style={{
        background: "#5c2e91", color: "#fff", padding: "10px 16px",
        fontSize: 13, fontWeight: 700,
      }}>
        Exercício — {exercicio.tipo.replace(/_/g, " ")}
      </div>

      <div style={{ padding: 16 }}>
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14, margin: "0 0 14px" }}>
          {exercicio.enunciado}
        </p>

        {eLivre && casos.length > 0 && (
          <div style={{ background: "#f8f9fa", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <strong style={{ fontSize: 12, color: "#495057" }}>Exemplos:</strong>
            <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#e9ecef" }}>
                  <th style={{ padding: "4px 8px", textAlign: "left" }}>Entrada</th>
                  <th style={{ padding: "4px 8px", textAlign: "left" }}>Saída esperada</th>
                </tr>
              </thead>
              <tbody>
                {casos.map((c, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #dee2e6" }}>
                    <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{c.entrada || "(nenhuma)"}</td>
                    <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{c.saida_esperada}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {exercicio.tipo === "multipla_escolha" && exercicio.gabarito?.opcoes && !submissao && (
          <div style={{ marginBottom: 12 }}>
            {exercicio.gabarito.opcoes.map((op, i) => (
              <label key={i} style={{
                display: "block", padding: "8px 12px", marginBottom: 6,
                border: `1px solid ${resposta === String(i) ? "#0d6efd" : "#dee2e6"}`,
                borderRadius: 6, cursor: "pointer",
                background: resposta === String(i) ? "#e7f1ff" : "#fff",
                fontSize: 13,
              }}>
                <input
                  type="radio" name={`opcao-${exercicio.id}`} value={String(i)}
                  onChange={(e) => setResposta(e.target.value)}
                  style={{ marginRight: 8 }}
                />
                {op}
              </label>
            ))}
          </div>
        )}

        {exercicio.tipo === "completar_codigo" && !submissao && (
          <input
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Digite a resposta"
            style={{
              width: "100%", padding: 10, fontSize: 14, borderRadius: 6,
              border: "1px solid #ccc", boxSizing: "border-box", marginBottom: 12,
            }}
          />
        )}

        {eLivre && !submissao && (
          <textarea
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder={'escreva("olá mundo")'}
            style={{
              width: "100%", minHeight: 140, fontFamily: "monospace", fontSize: 13,
              padding: 12, border: "1px solid #495057", borderRadius: 6,
              background: "#1e1e1e", color: "#d4d4d4", resize: "vertical",
              boxSizing: "border-box", lineHeight: 1.6, marginBottom: 12,
            }}
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
        )}

        {execucao && !submissao && (
          <div style={{ marginBottom: 12 }}>
            {execucao.erro && (
              <pre style={{ background: "#fff3cd", padding: 10, borderRadius: 6, fontSize: 12, whiteSpace: "pre-wrap", margin: "0 0 8px" }}>
                ⚠️ {execucao.erro}
              </pre>
            )}
            {execucao.saidas.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#e9ecef" }}>
                    <th style={{ padding: "4px 8px", textAlign: "left" }}>Entrada</th>
                    <th style={{ padding: "4px 8px", textAlign: "left" }}>Esperado</th>
                    <th style={{ padding: "4px 8px", textAlign: "left" }}>Obtido</th>
                    <th style={{ padding: "4px 8px", textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {execucao.saidas.map((s, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #dee2e6", background: s.correto ? "#f0fdf4" : "#fff5f5" }}>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{s.entrada || "—"}</td>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{s.saida_esperada || "—"}</td>
                      <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{s.saida_obtida || "—"}</td>
                      <td style={{ padding: "4px 8px", textAlign: "center" }}>
                        <span style={S.tag(s.correto)}>{s.correto ? "✓" : "✗"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {execucao.todos_corretos && (
              <p style={{ color: "#065f46", marginTop: 8, fontSize: 13, fontWeight: 600 }}>
                Todos os casos passaram! Clique em Submeter para registrar.
              </p>
            )}
          </div>
        )}

        {!submissao && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              disabled={submetendo || (eLivre ? !codigo.trim() : !resposta)}
              style={{ ...S.btnPrimary, ...(submetendo || (eLivre ? !codigo.trim() : !resposta) ? S.btnDisabled : {}) }}
            >
              {submetendo ? "Submetendo..." : "✓ Submeter"}
            </button>
          </div>
        )}

        {submissao && (
          <div style={{
            padding: 14, borderRadius: 8,
            background: submissao.correto ? "#d1fae5" : "#fff3cd",
            border: `1px solid ${submissao.correto ? "#6ee7b7" : "#fcd34d"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{submissao.correto ? "✅" : "❌"}</span>
              <strong style={{ fontSize: 14 }}>{submissao.correto ? "Correto!" : "Resposta incorreta"}</strong>
              {submissao.delta_proficiencia !== 0 && (
                <span style={{ fontSize: 11, color: "#555" }}>
                  ({submissao.delta_proficiencia > 0 ? "+" : ""}{(submissao.delta_proficiencia * 100).toFixed(0)}% proficiência)
                </span>
              )}
            </div>
            {submissao.detalhe && (
              <p style={{ fontSize: 12, color: "#555", margin: "0 0 8px" }}>{submissao.detalhe}</p>
            )}
            {submissao.feedback && (
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
                <strong>Dica da IA:</strong> {submissao.feedback}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!submissao.correto && (
                <button onClick={tentarNovamente} style={S.btnPrimary}>
                  ↩ Tentar novamente
                </button>
              )}
              {submissao.correto && (
                <button onClick={onProximoExercicio} style={S.btnSuccess}>
                  Prosseguir →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componentes de mensagem ──────────────────────────────────────────────────

function BolhaDigitando() {
  return (
    <div style={{ alignSelf: "flex-start" }}>
      <div style={{
        padding: "8px 14px", borderRadius: 10, background: "#f1f3f5",
        fontSize: 20, letterSpacing: 2, color: "#6c757d",
      }}>
        <span style={{ animation: "blink 1.2s infinite" }}>•••</span>
      </div>
    </div>
  );
}

function MarkdownSimples({ texto }: { texto: string }) {
  const partes = texto.split(/(```[\s\S]*?```|\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((parte, i) => {
        if (parte.startsWith("```") && parte.endsWith("```")) {
          const codigo = parte.slice(3, -3).replace(/^[a-z]*\n/, "");
          return (
            <pre key={i} style={{
              background: "#1e1e1e", color: "#d4d4d4", padding: "8px 10px",
              borderRadius: 6, fontSize: 12, overflowX: "auto", margin: "6px 0", whiteSpace: "pre",
            }}>
              {codigo}
            </pre>
          );
        }
        if (parte.startsWith("**") && parte.endsWith("**")) {
          return <strong key={i}>{parte.slice(2, -2)}</strong>;
        }
        return <span key={i}>{parte}</span>;
      })}
    </>
  );
}

function BolhaMensagem({ mensagem }: { mensagem: MensagemTexto }) {
  const eAluno = mensagem.papel === "aluno";
  const eAviso = mensagem.tipo === "aviso";
  const bg = eAluno ? "#6f42c1" : eAviso ? "#fff3cd" : "#f1f3f5";
  const cor = eAluno ? "#fff" : eAviso ? "#856404" : "#212529";

  return (
    <div style={{ display: "flex", justifyContent: eAluno ? "flex-end" : "flex-start" }}>
      <div style={{
        maxWidth: "85%", padding: "9px 13px", borderRadius: 10, fontSize: 13, lineHeight: 1.65,
        background: bg, color: cor,
        border: eAviso ? "1px solid #ffc107" : "none",
        borderBottomRightRadius: eAluno ? 2 : 10,
        borderBottomLeftRadius: eAluno ? 10 : 2,
        whiteSpace: "pre-wrap",
      }}>
        <MarkdownSimples texto={mensagem.texto} />
      </div>
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

interface Props {
  topicoSelecionado: TopicoSelecionado | null;
}

export function ChatPanel({ topicoSelecionado }: Props) {
  const [historico, setHistorico] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [buscandoExercicio, setBuscandoExercicio] = useState(false);
  const [tempoEspera, setTempoEspera] = useState(0);
  const [contextoExercicio, setContextoExercicio] = useState("");
  const [proximoExercicio, setProximoExercicio] = useState<ExercicioData | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);
  const alunoId = localStorage.getItem("aluno_id") ?? "";

  const genId = () => ++counter.current;

  useEffect(() => {
    if (tempoEspera <= 0) return;
    const id = setTimeout(() => setTempoEspera((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tempoEspera]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico, carregando, buscandoExercicio]);

  // Busca o próximo exercício do tópico e armazena (sem adicionar ao histórico)
  const buscarProximoExercicio = useCallback(async (topicoCodigo: string): Promise<ExercicioData | null> => {
    setBuscandoExercicio(true);
    try {
      const { data } = await api.get<ExercicioData>(`/tutor/exercicio-por-topico/${alunoId}/${topicoCodigo}`);
      setProximoExercicio(data);
      setContextoExercicio(data.enunciado);
      return data;
    } catch {
      setProximoExercicio(null);
      return null;
    } finally {
      setBuscandoExercicio(false);
    }
  }, [alunoId]);

  // Mostra o exercício pré-buscado no histórico
  const mostrarExercicio = () => {
    if (!proximoExercicio) return;
    setHistorico((prev) => [...prev, {
      id: genId(),
      papel: "sistema" as const,
      tipo: "exercicio" as const,
      exercicio: proximoExercicio,
    }]);
    setProximoExercicio(null);
  };

  // Após resposta correta: IA apresenta o próximo exercício e disponibiliza botão
  const aoProximoExercicio = useCallback(async () => {
    if (!topicoSelecionado) return;

    setBuscandoExercicio(true);
    try {
      const { data: proxExercicio } = await api.get<ExercicioData>(
        `/tutor/exercicio-por-topico/${alunoId}/${topicoSelecionado.codigo}`
      );
      setProximoExercicio(proxExercicio);
      setContextoExercicio(proxExercicio.enunciado);

      // IA apresenta o próximo exercício automaticamente
      setCarregando(true);
      const { data: iaData } = await api.post("/chat/", {
        mensagem: "[próximo-exercício]",
        historico: [],
        contexto_topico: topicoSelecionado.nome,
        contexto_exercicio: proxExercicio.enunciado,
      });
      setHistorico((prev) => [...prev, {
        id: genId(),
        papel: "assistente" as const,
        texto: iaData.resposta,
      }]);
    } catch {
      setProximoExercicio(null);
      setContextoExercicio("");
      setHistorico((prev) => [...prev, {
        id: genId(),
        papel: "assistente" as const,
        texto: "Você concluiu todos os exercícios deste tópico! 🎉 Escolha outro tópico no grafo para continuar.",
      }]);
    } finally {
      setBuscandoExercicio(false);
      setCarregando(false);
    }
  }, [alunoId, topicoSelecionado]);

  // Quando o tópico muda: pré-preenche o input e pré-busca o exercício
  useEffect(() => {
    if (!topicoSelecionado) return;
    setHistorico([]);
    setContextoExercicio("");
    setTempoEspera(0);
    setProximoExercicio(null);
    setInput(`quero estudar sobre ${topicoSelecionado.nome}`);
    buscarProximoExercicio(topicoSelecionado.codigo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicoSelecionado?.codigo]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || carregando || tempoEspera > 0) return;

    const msgAluno: MensagemTexto = { id: genId(), papel: "aluno", texto };
    const historicoAtualizado = [...historico, msgAluno];
    setHistorico(historicoAtualizado);
    setInput("");
    setCarregando(true);

    const historicoParaIA = historicoAtualizado
      .filter((m): m is MensagemTexto => m.papel !== "sistema")
      .map((m) => ({ papel: m.papel, texto: m.texto }));

    try {
      const { data } = await api.post("/chat/", {
        mensagem: texto,
        historico: historicoParaIA.slice(0, -1),
        contexto_topico: topicoSelecionado?.nome ?? "",
        contexto_exercicio: contextoExercicio,
      });
      setHistorico((prev) => [...prev, { id: genId(), papel: "assistente", texto: data.resposta }]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response;
      if (status?.status === 429) {
        const detalhe = status.data?.detail ?? "Limite atingido.";
        const match = detalhe.match(/(\d+) segundo/);
        setTempoEspera(match ? parseInt(match[1]) : 60);
        setHistorico((prev) => [...prev, { id: genId(), papel: "assistente", tipo: "aviso", texto: `⏳ ${detalhe}` }]);
      } else {
        setHistorico((prev) => [...prev, { id: genId(), papel: "assistente", texto: "Desculpe, ocorreu um erro. Tente novamente." }]);
      }
    } finally {
      setCarregando(false);
    }
  };

  const bloqueado = carregando || buscandoExercicio || tempoEspera > 0;
  const temRespostaIA = historico.some((m) => m.papel === "assistente");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Cabeçalho */}
      <div style={{
        background: "#5c2e91", color: "#fff",
        padding: "14px 20px",
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Assistente TutorÉgua</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
          {topicoSelecionado
            ? `Estudando: ${topicoSelecionado.nome}`
            : "Clique em um tópico no grafo para começar"}
        </div>
      </div>

      {/* Área de mensagens */}
      <div style={{
        flex: 1, overflowY: "auto", padding: 16,
        display: "flex", flexDirection: "column", gap: 10,
        background: "#fafafa",
      }}>
        {historico.length === 0 && !carregando && !buscandoExercicio && (
          <div style={{
            margin: "auto", textAlign: "center", color: "#94a3b8", fontSize: 14, padding: 40,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            {topicoSelecionado ? (
              <p>Clique em <strong>Enviar</strong> para começar a estudar <strong>{topicoSelecionado.nome}</strong>.</p>
            ) : (
              <p>Selecione um tópico no grafo ao lado para começar a estudar.</p>
            )}
          </div>
        )}

        {historico.map((msg) => {
          if (msg.papel === "sistema" && msg.tipo === "exercicio") {
            return (
              <div key={msg.id} style={{ alignSelf: "stretch" }}>
                <ExercicioCard
                  exercicio={msg.exercicio}
                  alunoId={alunoId}
                  onProximoExercicio={aoProximoExercicio}
                />
              </div>
            );
          }
          if (msg.papel === "aluno" || msg.papel === "assistente") {
            return <BolhaMensagem key={msg.id} mensagem={msg} />;
          }
          return null;
        })}

        {(carregando || buscandoExercicio) && <BolhaDigitando />}

        {/* Botão "Fazer exercício" — aparece após a IA responder, se há exercício disponível */}
        {proximoExercicio && temRespostaIA && !carregando && !buscandoExercicio && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button
              onClick={mostrarExercicio}
              style={{
                padding: "10px 20px",
                background: "#5c2e91",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                boxShadow: "0 4px 12px rgba(92, 46, 145, 0.3)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(92, 46, 145, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(92, 46, 145, 0.3)";
              }}
            >
              Fazer exercício →
            </button>
          </div>
        )}

        <div ref={fimRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "10px 12px",
        borderTop: "1px solid #dee2e6",
        display: "flex", gap: 8,
        background: "#fff",
        flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
          placeholder={
            !topicoSelecionado
              ? "Selecione um tópico no grafo para começar…"
              : tempoEspera > 0
              ? `Aguarde ${tempoEspera}s…`
              : "Escreva sua dúvida…"
          }
          disabled={bloqueado || !topicoSelecionado}
          style={{
            flex: 1, padding: "9px 13px",
            border: `1px solid ${tempoEspera > 0 ? "#ffc107" : "#ced4da"}`,
            borderRadius: 6, fontSize: 14, outline: "none",
            background: !topicoSelecionado ? "#f8f9fa" : tempoEspera > 0 ? "#fffbea" : "#fff",
          }}
        />
        <button
          onClick={enviar}
          disabled={bloqueado || !input.trim() || !topicoSelecionado}
          style={{
            ...S.btnPrimary,
            ...(bloqueado || !input.trim() || !topicoSelecionado ? S.btnDisabled : {}),
            background: "#6f42c1",
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
