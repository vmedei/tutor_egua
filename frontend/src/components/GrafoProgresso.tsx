import { createElement, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import type { TopicoProgresso } from "../hooks/useProgresso";

interface Props {
  porTopico: TopicoProgresso[];
}

const TOPICOS = [
  { id: "introducao", nome: "Introdução à Égua", position: { x: 300, y: 0 } },
  { id: "variaveis", nome: "Variáveis e Tipos", position: { x: 300, y: 115 } },
  { id: "operadores", nome: "Operadores", position: { x: 300, y: 230 } },
  { id: "condicionais", nome: "Condicionais", position: { x: 300, y: 345 } },
  { id: "lacos", nome: "Laços", position: { x: 300, y: 460 } },
  { id: "funcoes", nome: "Funções", position: { x: 120, y: 575 } },
  { id: "listas", nome: "Listas", position: { x: 480, y: 575 } },
  { id: "classes", nome: "Classes e Objetos", position: { x: 300, y: 690 } },
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

function nodeLabel(nome: string, pct: number) {
  return createElement(
    "div",
    { style: { textAlign: "center", lineHeight: 1.4 } },
    createElement("div", { style: { fontSize: 11, fontWeight: 600, opacity: 0.9 } }, nome),
    createElement("div", { style: { fontSize: 16, fontWeight: 800, marginTop: 2 } }, `${pct}%`)
  );
}

function buildNodes(profMap: Record<string, TopicoProgresso>): Node[] {
  return TOPICOS.map((t) => {
    const item = profMap[t.id];
    const prof = item?.proficiencia ?? 0;
    const pct = item?.pct ?? 0;
    return {
      id: t.id,
      position: t.position,
      data: { label: nodeLabel(t.nome, pct) },
      style: {
        background: `hsl(${prof * 120}, 65%, 40%)`,
        color: "#fff",
        border: "2px solid rgba(0,0,0,0.2)",
        borderRadius: 10,
        padding: "8px 16px",
        minWidth: 160,
        textAlign: "center" as const,
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      },
    };
  });
}

export function GrafoProgresso({ porTopico }: Props) {
  const [ns, setNodes, onNodesChange] = useNodesState(buildNodes({}));
  const [es, , onEdgesChange] = useEdgesState(ARESTAS);

  useEffect(() => {
    const profMap = Object.fromEntries(porTopico.map((p) => [p.topico_codigo, p]));
    setNodes(buildNodes(profMap));
  }, [porTopico, setNodes]);

  return (
    <div
      style={{
        height: 760,
        border: "1px solid #dee2e6",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <ReactFlow
        nodes={ns}
        edges={es}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.15 }}
      >
        <Background />
        <Controls />
        <MiniMap nodeColor={(n) => (n.style?.background as string) ?? "#ccc"} />
      </ReactFlow>
    </div>
  );
}
