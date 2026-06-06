"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PriceChart from "@/components/PriceChart";
import type { PriceTrendPoint } from "@/lib/types";

function TrendContent() {
  const params = useParams();
  const keyword = decodeURIComponent(params.keyword as string);
  const [days, setDays] = useState<7 | 30>(30);
  const [trends, setTrends] = useState<PriceTrendPoint[]>([]);
  const [stats, setStats] = useState<{ avg30: number; min30: number; max30: number; bestDay?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trends/${encodeURIComponent(keyword)}?days=30`)
      .then((r) => r.json())
      .then((data) => {
        setTrends(data.trends || []);
        setStats(data.stats);
        setLoading(false);
      });
  }, [keyword]);

  if (loading) return <div className="py-12 text-center">加载中...</div>;

  const currentAvg = trends.length ? trends[trends.length - 1].avg_price : 0;
  const position =
    stats && currentAvg <= stats.min30 * 1.01
      ? "史低入手时机"
      : stats && currentAvg <= stats.avg30 * 0.8
        ? "优质好价区间"
        : stats && currentAvg <= stats.avg30 * 1.1
          ? "正常价格区间"
          : "价格偏高，建议观望";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="type-page-title">{keyword}</h1>
        <p className="type-subtitle">价格波动分析 & 入手建议</p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="30日均价" value={`¥${Math.round(stats.avg30)}`} />
          <StatCard label="30日最低" value={`¥${stats.min30}`} highlight />
          <StatCard label="30日最高" value={`¥${stats.max30}`} />
          <StatCard label="最佳入手日" value={stats.bestDay?.slice(5) || "—"} />
        </div>
      )}

      <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="type-section-title">价格走势</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setDays(7)}
              className={`type-body rounded-lg px-3 py-1 ${days === 7 ? "bg-brand-100 text-brand-700" : "text-gray-500"}`}
            >
              7日
            </button>
            <button
              onClick={() => setDays(30)}
              className={`type-body rounded-lg px-3 py-1 ${days === 30 ? "bg-brand-100 text-brand-700" : "text-gray-500"}`}
            >
              30日
            </button>
          </div>
        </div>
        <PriceChart data={trends} days={days} />
        <div className="type-caption mt-2 flex gap-4">
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-orange-500" /> 均价</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-green-500" /> 最低价</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-red-500" /> 最高价</span>
        </div>
      </div>

      <div className="rounded-2xl border border-green-100 bg-green-50 p-6">
        <h3 className="type-card-title mb-2 text-green-800">入手建议</h3>
        <p className="type-body text-green-700">{position}</p>
        <p className="type-caption mt-2 text-green-600">
          当价格 ≤ 30日均价 80% 时触发「优质好价」提醒；等于 30 日史低时触发「史低入手」强提醒。
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-green-200 bg-green-50" : "border-orange-100 bg-white"}`}>
      <div className="type-stat-label">{label}</div>
      <div className={`type-stat-value ${highlight ? "text-green-600" : ""}`}>{value}</div>
    </div>
  );
}

export default function TrendPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">加载中...</div>}>
      <TrendContent />
    </Suspense>
  );
}
