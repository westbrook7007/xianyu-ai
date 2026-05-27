import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_PREFERENCE } from "@/lib/mock-data";
import type { UserPreference } from "@/lib/types";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "";
  const keyword = req.nextUrl.searchParams.get("keyword") || "";

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ preference: MOCK_PREFERENCE, demo: true });
  }

  const db = getSupabaseAdmin()!;
  let query = db.from("user_preference").select("*").eq("user_id", userId);
  if (keyword) query = query.eq("keyword", keyword);
  const { data, error } = await query.order("create_time", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preference: data, demo: false });
}

export async function POST(req: NextRequest) {
  const pref = (await req.json()) as UserPreference;
  if (!pref.user_id || !pref.keyword) {
    return NextResponse.json({ error: "缺少 user_id 或 keyword" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ saved: pref, demo: true });
  }

  const db = getSupabaseAdmin()!;
  if (pref.is_default) {
    await db.from("user_preference").update({ is_default: false }).eq("user_id", pref.user_id);
  }
  const { data, error } = await db.from("user_preference").insert(pref).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: data, demo: false });
}
