import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TopicoProgresso } from "../hooks/useProgresso";

interface Props {
  dados: TopicoProgresso[];
}

function corPorPercentual(pct: number) {
  if (pct >= 70) return "#198754";
  if (pct >= 30) return "#fd7e14";
  return "#dc3545";
}

export function ProgressoPorTopicoChart({ dados }: Props) {
  const chartData = dados.map((item) => ({
    nome: item.topico_nome,
    pct: item.pct,
    tentativas: item.tentativas,
    acertos: item.acertos,
  }));

  if (chartData.length === 0) {
    return (
      <div
        style={{
          border: "1px dashed #ced4da",
          borderRadius: 8,
          padding: 24,
          color: "#6c757d",
          textAlign: "center",
        }}
      >
        Nenhum progresso registrado ainda.
      </div>
    );
  }

  return (
    <div
      style={{
        height: Math.max(360, chartData.length * 54),
        border: "1px solid #dee2e6",
        borderRadius: 8,
        padding: "18px 18px 8px",
        background: "#fff",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 42, bottom: 8, left: 32 }}
          barCategoryGap={14}
        >
          <CartesianGrid stroke="#edf0f2" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: "#6c757d", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="nome"
            width={150}
            tick={{ fill: "#343a40", fontSize: 13, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(111, 66, 193, 0.08)" }}
            formatter={(value, _name, item) => {
              const payload = item.payload as { acertos: number; tentativas: number };
              return [`${value}% (${payload.acertos}/${payload.tentativas} acertos)`, "Proficiência"];
            }}
            labelStyle={{ color: "#343a40", fontWeight: 700 }}
            contentStyle={{
              border: "1px solid #dee2e6",
              borderRadius: 8,
              boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
            }}
          />
          <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={26}>
            {chartData.map((item) => (
              <Cell key={item.nome} fill={corPorPercentual(item.pct)} />
            ))}
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(value) => `${value ?? 0}%`}
              style={{ fill: "#343a40", fontSize: 13, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
