import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_TRENDS } from "@/lib/mock-data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ keyword: string }> }
) {
  const { keyword } = await params;
  const decoded = decodeURIComponent(keyword);
  const days = parseInt(_req.nextUrl.searchParams.get("days") || "30", 10);

  if (!isSupabaseConfigured()) {
    const trends = MOCK_TRENDS.slice(-days);
    const avg30 = trends.reduce((s, t) => s + t.avg_price, 0) / trends.length;
    const min30 = Math.min(...trends.map((t) => t.min_price));
    const max30 = Math.max(...trends.map((t) => t.max_price));
    return NextResponse.json({
      keyword: decoded,
      trends,
      stats: { avg30, min30, max30, bestDay: trends.find((t) => t.min_price === min30)?.date },
      demo: true,
    });
  }

  const db = getSupabaseAdmin()!;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await db
    .from("price_trend")
    .select("*")
    .eq("keyword", decoded)
    .gte("date", since.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const trends = data || [];
  const avg30 = trends.length
    ? trends.reduce((s, t) => s + t.avg_price, 0) / trends.length
    : 0;
  const min30 = trends.length ? Math.min(...trends.map((t) => t.min_price)) : 0;
  const max30 = trends.length ? Math.max(...trends.map((t) => t.max_price)) : 0;
  const bestDay = trends.find((t) => t.min_price === min30)?.date;

  return NextResponse.json({
    keyword: decoded,
    trends,
    stats: { avg30, min30, max30, bestDay },
    demo: false,
  });
}
