import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { GrafoProgresso } from "../components/GrafoProgresso";

interface Progresso {
  topico_id: string;
  proficiencia: number;
}

export function Dashboard() {
  const [progressos, setProgressos] = useState<Progresso[]>([]);
  const alunoId = localStorage.getItem("aluno_id") ?? "";

  useEffect(() => {
    if (!alunoId) return;
    api.get(`/tutor/progresso/${alunoId}`).then(({ data }) => setProgressos(data));
  }, [alunoId]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Seu Progresso</h1>
      <GrafoProgresso progressos={progressos} />
      <Link to="/exercicio">
        <button style={{ marginTop: 24, padding: "10px 24px" }}>
          Próximo Exercício
        </button>
      </Link>
    </div>
  );
}
