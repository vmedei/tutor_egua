import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import api from "../api/client";

export interface TopicoProgresso {
  topico_id: string;
  topico_codigo: string;
  topico_nome: string;
  proficiencia: number;
  pct: number;
  tentativas: number;
  acertos: number;
}

interface ProgressoApiItem {
  topico_id: string;
  topico_codigo?: string;
  topico_nome?: string;
  proficiencia: number;
  pct?: number;
  tentativas: number;
  acertos: number;
}

interface ProgressoCtxType {
  globalPct: number;
  porTopico: TopicoProgresso[];
  loading: boolean;
  error: string | null;
  recarregar: () => void;
}

const TOPICOS_BASE = [
  { topico_codigo: "introducao", topico_nome: "Introdução à Égua" },
  { topico_codigo: "variaveis", topico_nome: "Variáveis e Tipos" },
  { topico_codigo: "operadores", topico_nome: "Operadores" },
  { topico_codigo: "condicionais", topico_nome: "Condicionais" },
  { topico_codigo: "lacos", topico_nome: "Laços de Repetição" },
  { topico_codigo: "funcoes", topico_nome: "Funções" },
  { topico_codigo: "listas", topico_nome: "Listas e Vetores" },
  { topico_codigo: "classes", topico_nome: "Classes e Objetos" },
];

function toPct(proficiencia: number) {
  return Math.round(Math.max(0, Math.min(1, proficiencia)) * 100);
}

function normalizarProgresso(data: ProgressoApiItem[]) {
  const itens = data.map((item, index) => {
    const base = TOPICOS_BASE[index];
    const pct = item.pct ?? toPct(item.proficiencia);

    return {
      topico_id: item.topico_id,
      topico_codigo: item.topico_codigo ?? base?.topico_codigo ?? item.topico_id,
      topico_nome: item.topico_nome ?? base?.topico_nome ?? `Tópico ${index + 1}`,
      proficiencia: item.proficiencia,
      pct,
      tentativas: item.tentativas,
      acertos: item.acertos,
    };
  });

  const codigosPresentes = new Set(itens.map((item) => item.topico_codigo));
  const faltantes = TOPICOS_BASE.filter((topico) => !codigosPresentes.has(topico.topico_codigo)).map(
    (topico) => ({
      topico_id: topico.topico_codigo,
      topico_codigo: topico.topico_codigo,
      topico_nome: topico.topico_nome,
      proficiencia: 0,
      pct: 0,
      tentativas: 0,
      acertos: 0,
    })
  );

  return [...itens, ...faltantes];
}

export const ProgressoContext = createContext<ProgressoCtxType>({
  globalPct: 0,
  porTopico: [],
  loading: true,
  error: null,
  recarregar: () => {},
});

export function useProgresso() {
  return useContext(ProgressoContext);
}

export function ProgressoProvider({ children }: { children: ReactNode }) {
  const [globalPct, setGlobalPct] = useState(0);
  const [porTopico, setPorTopico] = useState<TopicoProgresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alunoId = localStorage.getItem("aluno_id") ?? "";

  const recarregar = useCallback(() => {
    if (!alunoId) {
      setError("Sessão inválida. Faça login novamente.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get<ProgressoApiItem[]>(`/tutor/progresso/${alunoId}`)
      .then(({ data }) => {
        const porTopicoNormalizado = normalizarProgresso(data);
        const soma = porTopicoNormalizado.reduce((total, item) => total + item.proficiencia, 0);
        const global = porTopicoNormalizado.length ? (soma / porTopicoNormalizado.length) * 100 : 0;

        setGlobalPct(Number(global.toFixed(1)));
        setPorTopico(porTopicoNormalizado);
      })
      .catch(() => {
        setError("Não foi possível carregar o progresso do aluno.");
        setGlobalPct(0);
        setPorTopico([]);
      })
      .finally(() => setLoading(false));
  }, [alunoId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return createElement(
    ProgressoContext.Provider,
    { value: { globalPct, porTopico, loading, error, recarregar } },
    children
  );
}
