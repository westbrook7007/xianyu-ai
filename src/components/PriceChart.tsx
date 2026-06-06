"use client";

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { PriceTrendPoint } from "@/lib/types";

interface Props {
  data: PriceTrendPoint[];
  days?: 7 | 30;
}

export default function PriceChart({ data, days = 30 }: Props) {
  const sliced = data.slice(-days);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sliced}>
          <defs>
            <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value: number) => [`¥${value}`, ""]}
            labelFormatter={(label) => `日期: ${label}`}
          />
          <Area type="monotone" dataKey="avg_price" stroke="#f97316" fill="url(#avgGrad)" name="均价" strokeWidth={2} />
          <Line type="monotone" dataKey="min_price" stroke="#22c55e" dot={false} name="最低价" strokeWidth={1.5} />
          <Line type="monotone" dataKey="max_price" stroke="#ef4444" dot={false} name="最高价" strokeWidth={1.5} strokeDasharray="4 4" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
