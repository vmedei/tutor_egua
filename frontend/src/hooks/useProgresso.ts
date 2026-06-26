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
  prerequisitos: string[];
}

interface ProgressoGlobalApi {
  global_pct: number;
  por_topico: TopicoProgresso[];
}

interface ProgressoCtxType {
  globalPct: number;
  porTopico: TopicoProgresso[];
  loading: boolean;
  error: string | null;
  recarregar: () => void;
  resetKey: number;
  sinalReset: () => void;
}

export const ProgressoContext = createContext<ProgressoCtxType>({
  globalPct: 0,
  porTopico: [],
  loading: true,
  error: null,
  recarregar: () => {},
  resetKey: 0,
  sinalReset: () => {},
});

export function useProgresso() {
  return useContext(ProgressoContext);
}

export function ProgressoProvider({ children }: { children: ReactNode }) {
  const [globalPct, setGlobalPct] = useState(0);
  const [porTopico, setPorTopico] = useState<TopicoProgresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const sinalReset = useCallback(() => setResetKey((k) => k + 1), []);
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
      .get<ProgressoGlobalApi>(`/tutor/progresso-global/${alunoId}`)
      .then(({ data }) => {
        setGlobalPct(data.global_pct);
        setPorTopico(data.por_topico);
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
    { value: { globalPct, porTopico, loading, error, recarregar, resetKey, sinalReset } },
    children
  );
}
