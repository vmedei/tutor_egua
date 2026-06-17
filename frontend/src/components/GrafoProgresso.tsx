import { useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";

interface Progresso {
  topico_id: string;
  proficiencia: number;
}

interface Props {
  progressos: Progresso[];
}

const TOPICOS_LAYOUT: Node[] = [
  { id: "introducao", data: { label: "Introdução à Égua" }, position: { x: 300, y: 0 } },
  { id: "variaveis", data: { label: "Variáveis e Tipos" }, position: { x: 300, y: 100 } },
  { id: "operadores", data: { label: "Operadores" }, position: { x: 300, y: 200 } },
  { id: "condicionais", data: { label: "Condicionais" }, position: { x: 300, y: 300 } },
  { id: "lacos", data: { label: "Laços" }, position: { x: 300, y: 400 } },
  { id: "funcoes", data: { label: "Funções" }, position: { x: 150, y: 500 } },
  { id: "listas", data: { label: "Listas" }, position: { x: 450, y: 500 } },
  { id: "classes", data: { label: "Classes e Objetos" }, position: { x: 300, y: 600 } },
];

const ARESTAS: Edge[] = [
  { id: "e1", source: "introducao", target: "variaveis" },
  { id: "e2", source: "variaveis", target: "operadores" },
  { id: "e3", source: "operadores", target: "condicionais" },
  { id: "e4", source: "condicionais", target: "lacos" },
  { id: "e5", source: "condicionais", target: "funcoes" },
  { id: "e6", source: "lacos", target: "funcoes" },
  { id: "e7", source: "lacos", target: "listas" },
  { id: "e8", source: "funcoes", target: "classes" },
  { id: "e9", source: "listas", target: "classes" },
];

export function GrafoProgresso({ progressos }: Props) {
  const profMap = Object.fromEntries(progressos.map((p) => [p.topico_id, p.proficiencia]));

  const nodes = TOPICOS_LAYOUT.map((n) => {
    const prof = profMap[n.id] ?? 0;
    return {
      ...n,
      style: {
        background: `hsl(${prof * 120}, 70%, 50%)`,
        color: "#fff",
        border: "2px solid #333",
        borderRadius: 8,
        padding: "8px 16px",
      },
    };
  });

  const [ns, , onNodesChange] = useNodesState(nodes);
  const [es, , onEdgesChange] = useEdgesState(ARESTAS);

  return (
    <div style={{ height: 700 }}>
      <ReactFlow
        nodes={ns}
        edges={es}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
