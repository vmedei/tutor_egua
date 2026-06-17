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

interface ProgressoGlobalData {
  global_pct: number;
  por_topico: TopicoProgresso[];
}

interface ProgressoCtxType {
  globalPct: number;
  porTopico: TopicoProgresso[];
  loading: boolean;
  recarregar: () => void;
}

export const ProgressoContext = createContext<ProgressoCtxType>({
  globalPct: 0,
  porTopico: [],
  loading: true,
  recarregar: () => {},
});

export function useProgresso() {
  return useContext(ProgressoContext);
}

export function ProgressoProvider({ children }: { children: ReactNode }) {
  const [globalPct, setGlobalPct] = useState(0);
  const [porTopico, setPorTopico] = useState<TopicoProgresso[]>([]);
  const [loading, setLoading] = useState(true);
  const alunoId = localStorage.getItem("aluno_id") ?? "";

  const recarregar = useCallback(() => {
    if (!alunoId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<ProgressoGlobalData>(`/tutor/progresso-global/${alunoId}`)
      .then(({ data }) => {
        setGlobalPct(data.global_pct);
        setPorTopico(data.por_topico);
      })
      .finally(() => setLoading(false));
  }, [alunoId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return createElement(
    ProgressoContext.Provider,
    { value: { globalPct, porTopico, loading, recarregar } },
    children
  );
}
