import { NextRequest, NextResponse } from "next/server";
import { enrichProducts } from "@/lib/enrich-products";
import { updateQueueJob } from "@/lib/crawl-queue";
import { saveProductsToDb } from "@/lib/save-products";
import { sendCrawlResultEmail } from "@/lib/crawl-email";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Product, UserPreference } from "@/lib/types";

function checkWorkerAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRAWL_API_SECRET;
  return !!secret && auth === `Bearer ${secret}`;
}

/**
 * 本机 Worker 爬取完成后回调：评分、入库、更新队列、发邮件
 */
export async function POST(req: NextRequest) {
  if (!checkWorkerAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase 未配置" }, { status: 503 });
  }

  const body = await req.json();
  const {
    jobId,
    keyword,
    userId,
    preference,
    notifyEmail,
    products = [],
    status,
    error: crawlError,
  } = body as {
    jobId: string;
    keyword: string;
    userId?: string;
    preference?: UserPreference;
    notifyEmail?: string;
    products?: Partial<Product>[];
    status: "success" | "empty" | "error";
    error?: string;
  };

  if (!jobId || !keyword) {
    return NextResponse.json({ error: "缺少 jobId 或 keyword" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const db = getSupabaseAdmin()!;

  try {
    if (status === "error") {
      await updateQueueJob(jobId, {
        status: "failed",
        error_message: crawlError || "爬取失败",
        finished_at: now,
      });
      if (notifyEmail) {
        await sendCrawlResultEmail(notifyEmail, {
          status: "error",
          keyword,
          itemCount: 0,
          products: [],
          error: crawlError || "爬取失败",
        });
      }
      return NextResponse.json({ ok: true, status: "failed" });
    }

    if (status === "empty" || products.length === 0) {
      await updateQueueJob(jobId, {
        status: "done",
        item_count: 0,
        error_message: crawlError || "未找到商品",
        finished_at: now,
      });
      await db.from("crawl_logs").insert({
        keyword,
        user_id: userId,
        trigger_type: "manual",
        item_count: 0,
        status: "empty",
        message: "队列爬取无结果",
      });
      if (notifyEmail) {
        await sendCrawlResultEmail(notifyEmail, {
          status: "empty",
          keyword,
          itemCount: 0,
          products: [],
          error: crawlError || "爬取完成但未找到商品",
        });
      }
      return NextResponse.json({ ok: true, status: "empty", itemCount: 0 });
    }

    const enriched = enrichProducts(products, keyword, preference);
    await saveProductsToDb(enriched, keyword);

    await updateQueueJob(jobId, {
      status: "done",
      item_count: enriched.length,
      error_message: null,
      finished_at: now,
    });

    await db.from("crawl_logs").insert({
      keyword,
      user_id: userId,
      trigger_type: "manual",
      item_count: enriched.length,
      status: "success",
      message: "队列爬取完成",
    });

    if (notifyEmail) {
      await sendCrawlResultEmail(notifyEmail, {
        status: "success",
        keyword,
        itemCount: enriched.length,
        products: enriched,
      });
    }

    return NextResponse.json({ ok: true, status: "success", itemCount: enriched.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "处理失败";
    await updateQueueJob(jobId, {
      status: "failed",
      error_message: msg,
      finished_at: now,
    }).catch(() => {});
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
