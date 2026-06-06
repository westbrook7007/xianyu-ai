import { NextRequest, NextResponse } from "next/server";
import { MOCK_TRENDS } from "@/lib/mock-data";
import type { PriceTrendPoint } from "@/lib/types";

function trendPercent(points: PriceTrendPoint[]): number {
  if (points.length < 2) return 0;
  const first = points[0].avg_price;
  const last = points[points.length - 1].avg_price;
  if (!first) return 0;
  return Math.round(((last - first) / first) * 1000) / 10;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("keywords") || "";
  const keywords = raw
    .split(",")
    .map((k) => decodeURIComponent(k.trim()))
    .filter(Boolean)
    .slice(0, 12);

  if (!keywords.length) {
    return NextResponse.json({ items: [], demo: true });
  }

  const days = parseInt(req.nextUrl.searchParams.get("days") || "14", 10);
  const sliceDays = Math.min(Math.max(days, 7), 30);

  const items = keywords.map((keyword) => {
    const trends = MOCK_TRENDS.slice(-sliceDays).map((t, i) => ({
      ...t,
      avg_price: Math.round(t.avg_price + (keyword.length % 7) * 40 + i * 3),
      min_price: Math.round(t.min_price + (keyword.length % 5) * 30),
      max_price: Math.round(t.max_price + (keyword.length % 5) * 30),
    }));
    const avg30 = trends.reduce((s, t) => s + t.avg_price, 0) / trends.length;
    return {
      keyword,
      trends,
      avg_price: Math.round(avg30),
      trend: trendPercent(trends),
    };
  });

  return NextResponse.json({ items, demo: true });
}
