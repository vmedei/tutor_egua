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
  if (pct >= 30) return "#d97706";
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
          border: "1px dashed #cbd5e1",
          borderRadius: 14,
          padding: 24,
          color: "#64748b",
          textAlign: "center",
          background: "#fff",
        }}
      >
        Nenhum progresso registrado ainda.
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        height: Math.max(360, chartData.length * 54),
        padding: "20px 18px 10px",
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
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="nome"
            width={150}
            tick={{ fill: "#334155", fontSize: 13, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(111, 66, 193, 0.08)" }}
            formatter={(value, _name, item) => {
              const payload = item.payload as { acertos: number; tentativas: number };
              return [`${value}% (${payload.acertos}/${payload.tentativas} acertos)`, "Proficiência"];
            }}
            labelStyle={{ color: "#334155", fontWeight: 800 }}
            contentStyle={{
              border: "1px solid #dfe4ea",
              borderRadius: 12,
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)",
            }}
          />
          <Bar dataKey="pct" radius={[0, 8, 8, 0]} barSize={26}>
            {chartData.map((item) => (
              <Cell key={item.nome} fill={corPorPercentual(item.pct)} />
            ))}
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(value) => `${value ?? 0}%`}
              style={{ fill: "#334155", fontSize: 13, fontWeight: 800 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
