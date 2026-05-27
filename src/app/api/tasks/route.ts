import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_TASKS } from "@/lib/mock-data";
import type { TaskSchedule } from "@/lib/types";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "";
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ tasks: MOCK_TASKS, demo: true });
  }
  const db = getSupabaseAdmin()!;
  const { data, error } = await db
    .from("task_schedule")
    .select("*")
    .eq("user_id", userId)
    .order("create_time", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data || [], demo: false });
}

export async function POST(req: NextRequest) {
  const task = (await req.json()) as TaskSchedule;
  if (!task.user_id || !task.keyword) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ saved: task, demo: true });
  }
  const db = getSupabaseAdmin()!;
  const { data, error } = await db.from("task_schedule").insert(task).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: data, demo: false });
}

export async function PATCH(req: NextRequest) {
  const { id, task_status } = await req.json();
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ updated: true, demo: true });
  }
  const db = getSupabaseAdmin()!;
  const { error } = await db.from("task_schedule").update({ task_status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true, demo: false });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ deleted: true, demo: true });
  }
  const db = getSupabaseAdmin()!;
  const { error } = await db.from("task_schedule").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true, demo: false });
}
