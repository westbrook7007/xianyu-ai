"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { PriceTrendPoint } from "@/lib/types";

interface Props {
  data: PriceTrendPoint[];
  positive?: boolean;
}

export default function TrendSparkline({ data, positive }: Props) {
  if (!data.length) {
    return <div className="h-10 w-24 rounded bg-orange-50" />;
  }

  const stroke = positive === false ? "#ef4444" : positive === true ? "#16a34a" : "#f97316";

  return (
    <div className="h-10 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
          <Line
            type="monotone"
            dataKey="avg_price"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
