import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_ALERTS } from "@/lib/mock-data";
import type { PriceAlert } from "@/lib/types";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "";
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ alerts: MOCK_ALERTS, demo: true });
  }
  const db = getSupabaseAdmin()!;
  const { data, error } = await db
    .from("price_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("create_time", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data || [], demo: false });
}

export async function POST(req: NextRequest) {
  const alert = (await req.json()) as PriceAlert;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ saved: alert, demo: true });
  }
  const db = getSupabaseAdmin()!;
  const { data, error } = await db.from("price_alerts").insert(alert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: data, demo: false });
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ updated: true, demo: true });
  }
  const db = getSupabaseAdmin()!;
  const { error } = await db.from("price_alerts").update({ is_read: true }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true, demo: false });
}
