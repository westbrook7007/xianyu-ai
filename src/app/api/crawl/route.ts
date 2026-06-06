import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { CONFIG } from "@/lib/config";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { executeCrawl } from "@/lib/run-crawl";
import { saveCrawlResults } from "@/lib/crawl-cache";
import { sendCrawlResultEmail } from "@/lib/crawl-email";
import { isEmailConfigured } from "@/lib/email";
import type { UserPreference } from "@/lib/types";

async function persistAndNotify(
  userId: string | undefined,
  notifyEmail: string | undefined,
  result: Awaited<ReturnType<typeof executeCrawl>>
) {
  if (userId && result.products.length) {
    await saveCrawlResults(userId, result.keyword, result.products, result.status).catch(() => {});
  } else if (userId && (result.status === "empty" || result.status === "error" || result.status === "demo")) {
    await saveCrawlResults(userId, result.keyword, [], result.status).catch(() => {});
  }

  if (notifyEmail) {
    await sendCrawlResultEmail(notifyEmail, result);
  }
}

/**
 * 触发爬取任务
 * - 前端手动触发：POST { keyword, userId, preference, notifyEmail?, backgroundNotify? }
 * - GitHub Actions / Replit：需携带 Authorization: Bearer CRAWL_API_SECRET
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isScheduled = authHeader === `Bearer ${process.env.CRAWL_API_SECRET}`;

  const body = await req.json();
  const {
    keyword,
    userId,
    preference,
    triggerType = "manual",
    notifyEmail,
    backgroundNotify = false,
  } = body as {
    keyword: string;
    userId?: string;
    preference?: UserPreference;
    triggerType?: "manual" | "scheduled";
    notifyEmail?: string;
    backgroundNotify?: boolean;
  };

  if (!keyword) {
    return NextResponse.json({ error: "请输入商品关键词" }, { status: 400 });
  }

  const email = notifyEmail?.trim();
  if (email && backgroundNotify && !isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "已开启邮件通知但未配置 SMTP。请在 .env.local 中设置 SMTP_HOST、SMTP_USER、SMTP_PASS（如 QQ 邮箱授权码）。",
      },
      { status: 400 }
    );
  }

  if (isSupabaseConfigured() && userId && triggerType === "manual") {
    const db = getSupabaseAdmin()!;
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await db
      .from("crawl_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("trigger_type", "manual")
      .gte("create_time", today);

    if ((count || 0) >= CONFIG.crawl.maxManualPerDay) {
      return NextResponse.json(
        { error: `今日手动爬取已达上限（${CONFIG.crawl.maxManualPerDay}次）` },
        { status: 429 }
      );
    }
  }

  const crawlParams = {
    keyword,
    userId,
    preference,
    triggerType,
    isScheduled,
  };

  // 后台爬取：立即返回，完成后发邮件
  if (backgroundNotify && email) {
    after(async () => {
      const result = await executeCrawl(crawlParams);
      await persistAndNotify(userId, email, result);
    });

    return NextResponse.json({
      status: "queued",
      message: `爬取已在后台进行，完成后将发送邮件至 ${email}`,
      notifyEmail: email,
      emailConfigured: isEmailConfigured(),
    });
  }

  const result = await executeCrawl(crawlParams);

  if (result.status === "error") {
    if (email) await sendCrawlResultEmail(email, result);
    return NextResponse.json({ error: result.error, status: "error" }, { status: 502 });
  }

  if (result.status === "empty") {
    if (userId) await saveCrawlResults(userId, keyword, [], "empty").catch(() => {});
    if (email) await sendCrawlResultEmail(email, result);
    return NextResponse.json({
      status: "empty",
      error: result.error || "爬取完成但未找到商品",
      itemCount: 0,
      products: [],
    });
  }

  if (userId) {
    await saveCrawlResults(userId, keyword, result.products, result.status).catch(() => {});
  }

  if (email) {
    const mail = await sendCrawlResultEmail(email, result);
    return NextResponse.json({
      status: result.status,
      itemCount: result.itemCount,
      products: result.products,
      message: result.message,
      emailSent: mail.ok,
      emailError: mail.error,
    });
  }

  return NextResponse.json({
    status: result.status,
    itemCount: result.itemCount,
    products: result.products,
    message: result.message,
    config: {
      minItems: CONFIG.crawl.minItems,
      maxItems: CONFIG.crawl.maxItems,
      intervalSeconds: CONFIG.crawl.intervalSeconds,
    },
  });
}

export async function GET() {
  return NextResponse.json({
    config: CONFIG.crawl,
    crawlerConfigured: !!process.env.CRAWLER_ENDPOINT,
    supabaseConfigured: isSupabaseConfigured(),
    emailConfigured: isEmailConfigured(),
  });
}
