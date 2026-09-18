"use client";

import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function Chart({ data, xKey = "name", yKey = "value", type = "bar" }) {
  const ChartType = type === "line" ? LineChart : BarChart;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartType data={data}>
          <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
          <Tooltip />
          {type === "line" ? (
            <Line type="monotone" dataKey={yKey} stroke="#4f46e5" strokeWidth={2} dot={false} />
          ) : (
            <Bar dataKey={yKey} fill="#4f46e5" radius={[6, 6, 0, 0]} />
          )}
        </ChartType>
      </ResponsiveContainer>
    </div>
  );
}
