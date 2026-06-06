"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, TrendingDown, TrendingUp, Flame } from "lucide-react";
import { HOT_KEYWORDS } from "@/lib/mock-data";
import { getSearchHistory } from "@/lib/search-history";
import TrendSparkline from "@/components/TrendSparkline";
import type { PriceTrendPoint } from "@/lib/types";

type TrendItem = {
  keyword: string;
  trends: PriceTrendPoint[];
  avg_price: number;
  trend: number;
};

function TrendRow({ item }: { item: TrendItem }) {
  const down = item.trend < 0;
  return (
    <tr className="border-b border-gray-50 transition hover:bg-orange-50/40">
      <td className="px-4 py-3 font-medium text-gray-900">{item.keyword}</td>
      <td className="px-4 py-3">
        <TrendSparkline data={item.trends} positive={down} />
      </td>
      <td className="px-4 py-3 text-gray-700">¥{item.avg_price}</td>
      <td className="px-4 py-3">
        <span className={`type-body inline-flex items-center gap-1 ${down ? "text-green-600" : "text-red-500"}`}>
          {down ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          {item.trend > 0 ? "+" : ""}
          {item.trend}%
        </span>
      </td>
      <td className="px-4 py-3">
        <Link href={`/trend/${encodeURIComponent(item.keyword)}`} className="type-body text-brand-600 hover:underline">
          查看走势 →
        </Link>
      </td>
    </tr>
  );
}

function TrendTable({
  title,
  icon: Icon,
  items,
  loading,
  emptyHint,
}: {
  title: string;
  icon: typeof Flame;
  items: TrendItem[];
  loading: boolean;
  emptyHint?: string;
}) {
  return (
    <section>
      <h2 className="type-section-title mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-brand-500" />
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        {loading ? (
          <div className="type-caption px-4 py-8 text-center">加载价格走势…</div>
        ) : items.length === 0 ? (
          <div className="type-caption px-4 py-8 text-center">{emptyHint}</div>
        ) : (
          <table className="type-body w-full text-left">
            <thead className="type-label border-b border-orange-50 bg-orange-50/50 text-gray-600">
              <tr>
                <th className="px-4 py-3">商品</th>
                <th className="px-4 py-3">14日走势</th>
                <th className="px-4 py-3">均价</th>
                <th className="px-4 py-3">涨跌</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <TrendRow key={item.keyword} item={item} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

async function fetchTrendBatch(keywords: string[]): Promise<TrendItem[]> {
  if (!keywords.length) return [];
  const q = keywords.map((k) => encodeURIComponent(k)).join(",");
  const res = await fetch(`/api/trends/batch?keywords=${q}&days=14`);
  const data = await res.json();
  return data.items || [];
}

export default function HomeTrendSection() {
  const [hotItems, setHotItems] = useState<TrendItem[]>([]);
  const [historyItems, setHistoryItems] = useState<TrendItem[]>([]);
  const [hotLoading, setHotLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    fetchTrendBatch(HOT_KEYWORDS.map((h) => h.keyword)).then((items) => {
      setHotItems(items);
      setHotLoading(false);
    });
  }, []);

  useEffect(() => {
    const history = getSearchHistory();
    if (!history.length) {
      setHistLoading(false);
      return;
    }
    fetchTrendBatch(history).then((items) => {
      setHistoryItems(items);
      setHistLoading(false);
    });
  }, []);

  return (
    <div className="space-y-10">
      <TrendTable title="热门商品价格趋势" icon={Flame} items={hotItems} loading={hotLoading} />
      <TrendTable
        title="历史查询价格趋势"
        icon={History}
        items={historyItems}
        loading={histLoading}
        emptyHint="搜索并选品后，这里会显示你查过的商品走势"
      />
    </div>
  );
}
