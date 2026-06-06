import { CONFIG } from "@/lib/config";
import { enrichProducts } from "@/lib/enrich-products";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import type { Product, UserPreference } from "@/lib/types";

export type CrawlResult = {
  status: "success" | "demo" | "empty" | "error";
  keyword: string;
  itemCount: number;
  products: Product[];
  error?: string;
  message?: string;
};

export async function executeCrawl(params: {
  keyword: string;
  userId?: string;
  preference?: UserPreference;
  triggerType?: "manual" | "scheduled";
  isScheduled?: boolean;
}): Promise<CrawlResult> {
  const { keyword, userId, preference, triggerType = "manual", isScheduled = false } = params;

  if (!process.env.CRAWLER_ENDPOINT) {
    const demoProducts = enrichProducts(
      MOCK_PRODUCTS.map((p) => ({ ...p, keyword })),
      keyword,
      preference
    );

    if (isSupabaseConfigured()) {
      const db = getSupabaseAdmin()!;
      await db.from("crawl_logs").insert({
        keyword,
        user_id: userId,
        trigger_type: triggerType,
        item_count: demoProducts.length,
        status: "demo",
        message: "演示模式",
      });
    }

    return {
      status: "demo",
      keyword,
      itemCount: demoProducts.length,
      products: demoProducts,
      message: "演示模式已返回模拟数据",
    };
  }

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
      return {
        status: "error",
        keyword,
        itemCount: 0,
        products: [],
        error: `爬虫执行失败: ${errText}`,
      };
    }

    const crawlData = await crawlerRes.json();
    const rawProducts = crawlData.products || [];

    if (rawProducts.length === 0) {
      return {
        status: "empty",
        keyword,
        itemCount: 0,
        products: [],
        error: "爬取完成但未找到商品",
      };
    }

    const products = enrichProducts(rawProducts, keyword, preference);

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

    return {
      status: "success",
      keyword,
      itemCount: products.length,
      products,
    };
  } catch (e) {
    return {
      status: "error",
      keyword,
      itemCount: 0,
      products: [],
      error: e instanceof Error ? e.message : "未知错误",
    };
  }
}
