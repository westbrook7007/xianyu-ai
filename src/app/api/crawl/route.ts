import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { scoreProduct, classifySeller } from "@/lib/scoring";
import type { UserPreference } from "@/lib/types";

/**
 * 触发爬取任务
 * - 前端手动触发：POST { keyword, userId, preference, triggerType: 'manual' }
 * - GitHub Actions / Replit：需携带 Authorization: Bearer CRAWL_API_SECRET
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isScheduled = authHeader === `Bearer ${process.env.CRAWL_API_SECRET}`;

  const body = await req.json();
  const { keyword, userId, preference, triggerType = "manual" } = body as {
    keyword: string;
    userId?: string;
    preference?: UserPreference;
    triggerType?: "manual" | "scheduled";
  };

  if (!keyword) {
    return NextResponse.json({ error: "请输入商品关键词" }, { status: 400 });
  }

  // 风控：检查今日爬取次数
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

  // 演示模式：返回模拟爬取结果
  if (!process.env.CRAWLER_ENDPOINT) {
    const demoProducts = MOCK_PRODUCTS.map((p) => ({
      ...p,
      keyword,
      ...classifySeller(p),
    }));

    if (preference) {
      const avg = demoProducts.reduce((s, p) => s + p.price, 0) / demoProducts.length;
      demoProducts.forEach((p) => {
        p.ai_score = scoreProduct(p, preference, avg);
      });
    }

    if (isSupabaseConfigured()) {
      const db = getSupabaseAdmin()!;
      await db.from("crawl_logs").insert({
        keyword,
        user_id: userId,
        trigger_type: triggerType,
        item_count: demoProducts.length,
        status: "demo",
        message: "演示模式：请配置 CRAWLER_ENDPOINT 连接 Python RPA 爬虫",
      });
    }

    return NextResponse.json({
      status: "demo",
      message: "演示模式已返回模拟数据。部署 Python 爬虫后设置 CRAWLER_ENDPOINT 即可真实爬取。",
      itemCount: demoProducts.length,
      products: demoProducts,
      config: {
        minItems: CONFIG.crawl.minItems,
        maxItems: CONFIG.crawl.maxItems,
        intervalSeconds: CONFIG.crawl.intervalSeconds,
      },
    });
  }

  // 调用外部 Python 爬虫服务（Replit / 本地）
  try {
    const crawlerRes = await fetch(process.env.CRAWLER_ENDPOINT!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRAWL_API_SECRET}`,
      },
      body: JSON.stringify({
        keyword,
        min_items: CONFIG.crawl.minItems,
        max_items: CONFIG.crawl.maxItems,
        interval_seconds: CONFIG.crawl.intervalSeconds,
      }),
    });

    if (!crawlerRes.ok) {
      const errText = await crawlerRes.text();
      return NextResponse.json({ error: `爬虫执行失败: ${errText}` }, { status: 502 });
    }

    const crawlData = await crawlerRes.json();
    const rawProducts = crawlData.products || [];

    if (rawProducts.length === 0) {
      return NextResponse.json({
        status: "empty",
        error: "爬取完成但未找到商品，请确认已登录闲鱼，或更换关键词重试",
        itemCount: 0,
        products: [],
      });
    }

    // 评分并返回（无 Supabase 时直接给前端）
    // 评分并返回（无 Supabase 时直接给前端）
    const ingestRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/products`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: rawProducts,
          keyword,
          preference,
        }),
      }
    );
    const ingestResult = await ingestRes.json();
    const products = ingestResult.products || rawProducts;

    if (isSupabaseConfigured()) {
      const db = getSupabaseAdmin()!;
      await db.from("crawl_logs").insert({
        keyword,
        user_id: userId,
        trigger_type: isScheduled ? "scheduled" : triggerType,
        item_count: rawProducts.length,
        status: "success",
      });
    }

    return NextResponse.json({
      status: "success",
      itemCount: rawProducts.length,
      products,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    config: CONFIG.crawl,
    crawlerConfigured: !!process.env.CRAWLER_ENDPOINT,
    supabaseConfigured: isSupabaseConfigured(),
  });
}
