import { CONFIG } from "@/lib/config";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { UserPreference } from "@/lib/types";

export type QueueStatus = "pending" | "running" | "done" | "failed" | "cancelled";

export type CrawlQueueJob = {
  id: string;
  user_id: string;
  keyword: string;
  preference: UserPreference | null;
  notify_email: string | null;
  status: QueueStatus;
  item_count: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  worker_id: string | null;
};

const MAX_QUEUE_BACKLOG = 20;
const MIN_KEYWORD_LEN = 2;
const MAX_KEYWORD_LEN = 50;

/** Vercel 等无本机爬虫时走队列；本机有 CRAWLER_ENDPOINT 时默认同步爬取 */
export function shouldUseQueue(): boolean {
  if (process.env.PREFER_QUEUE === "true") return isSupabaseConfigured();
  return isSupabaseConfigured() && !process.env.CRAWLER_ENDPOINT;
}

export function isQueueEnabled(): boolean {
  return isSupabaseConfigured();
}

function validateKeyword(keyword: string): string | null {
  const k = keyword.trim();
  if (k.length < MIN_KEYWORD_LEN || k.length > MAX_KEYWORD_LEN) {
    return `关键词长度需在 ${MIN_KEYWORD_LEN}–${MAX_KEYWORD_LEN} 字之间`;
  }
  return null;
}

export async function countPendingJobs(): Promise<number> {
  const db = getSupabaseAdmin()!;
  const { count } = await db
    .from("crawl_queue")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "running"]);
  return count || 0;
}

export async function enqueueCrawlJob(params: {
  userId: string;
  keyword: string;
  preference?: UserPreference;
  notifyEmail?: string;
}): Promise<{ job: CrawlQueueJob; queuePosition: number }> {
  const kwError = validateKeyword(params.keyword);
  if (kwError) throw new Error(kwError);

  const db = getSupabaseAdmin()!;
  const backlog = await countPendingJobs();
  if (backlog >= MAX_QUEUE_BACKLOG) {
    throw new Error("系统繁忙，队列已满，请稍后再试");
  }

  const { data, error } = await db
    .from("crawl_queue")
    .insert({
      user_id: params.userId,
      keyword: params.keyword.trim(),
      preference: params.preference || null,
      notify_email: params.notifyEmail || null,
      status: "pending",
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "写入队列失败");

  const { count: ahead } = await db
    .from("crawl_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .lt("created_at", data.created_at);

  return {
    job: data as CrawlQueueJob,
    queuePosition: (ahead || 0) + 1,
  };
}

export async function getQueueJob(jobId: string): Promise<CrawlQueueJob | null> {
  const db = getSupabaseAdmin()!;
  const { data, error } = await db.from("crawl_queue").select("*").eq("id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CrawlQueueJob) || null;
}

export async function getQueuePosition(job: CrawlQueueJob): Promise<number> {
  if (job.status !== "pending") return 0;
  const db = getSupabaseAdmin()!;
  const { count } = await db
    .from("crawl_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .lt("created_at", job.created_at);
  return (count || 0) + 1;
}

export async function updateQueueJob(
  jobId: string,
  patch: Partial<{
    status: QueueStatus;
    item_count: number;
    error_message: string | null;
    started_at: string | null;
    finished_at: string | null;
    worker_id: string | null;
  }>
): Promise<void> {
  const db = getSupabaseAdmin()!;
  const { error } = await db.from("crawl_queue").update(patch).eq("id", jobId);
  if (error) throw new Error(error.message);
}

export async function checkManualCrawlLimit(userId: string): Promise<boolean> {
  const db = getSupabaseAdmin()!;
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await db
    .from("crawl_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("trigger_type", "manual")
    .gte("create_time", today);
  return (count || 0) < CONFIG.crawl.maxManualPerDay;
}
