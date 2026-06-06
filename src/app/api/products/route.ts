import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { scoreProduct, classifySeller, getPricePosition } from "@/lib/scoring";
import { sortProducts } from "@/lib/filter-products";
import type { Product, SortMode, UserPreference } from "@/lib/types";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword") || "";
  const sort = req.nextUrl.searchParams.get("sort") || "ai_score";
  const hideFiltered = req.nextUrl.searchParams.get("hideFiltered") !== "false";
  const minPrice = parseFloat(req.nextUrl.searchParams.get("minPrice") || "0");
  const maxPrice = parseFloat(req.nextUrl.searchParams.get("maxPrice") || "999999");
  const personalOnly = req.nextUrl.searchParams.get("personalOnly") === "true";
  const withService = req.nextUrl.searchParams.get("withService") === "true";

  if (!isSupabaseConfigured()) {
    let items = MOCK_PRODUCTS.filter((p) => !keyword || p.keyword.includes(keyword));
    if (hideFiltered) items = items.filter((p) => !p.is_filtered);
    if (personalOnly) items = items.filter((p) => p.seller_type === 1 && p.seller_label?.includes("个人"));
    if (withService) items = items.filter((p) => p.service);
    items = items.filter((p) => p.price >= minPrice && p.price <= maxPrice);
    items = sortProducts(items, sort as SortMode);
    return NextResponse.json({ products: items, demo: true });
  }

  const db = getSupabaseAdmin()!;
  let query = db.from("product_data").select("*").eq("keyword", keyword);
  if (hideFiltered) query = query.eq("is_filtered", false);
  if (personalOnly) query = query.eq("seller_type", 1);
  if (withService) query = query.not("service", "eq", "");
  query = query.gte("price", minPrice).lte("price", maxPrice);

  const { data, error } = await query.order("ai_score", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products = sortProducts((data || []) as Product[], sort as SortMode);
  return NextResponse.json({ products, demo: false });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { products, keyword, preference } = body as {
    products: Partial<Product>[];
    keyword: string;
    preference?: UserPreference;
  };

  if (!products?.length) {
    return NextResponse.json({ error: "无商品数据" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const prices = products.map((p) => p.price || 0).filter((p) => p > 0);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const enriched: Product[] = products.map((p) => {
    const seller = classifySeller(p);
    const product: Product = {
      keyword,
      title: p.title || "",
      price: p.price || 0,
      original_price: p.original_price,
      avg_price: avgPrice,
      quality: p.quality,
      service: p.service,
      service_day: p.service_day,
      seller_id: p.seller_id,
      seller_level: p.seller_level,
      seller_bio: p.seller_bio,
      seller_item_count: p.seller_item_count,
      seller_type: seller.seller_type,
      seller_label: seller.seller_label,
      is_filtered: seller.is_filtered,
      life_level: p.life_level || 3,
      ai_score: 0,
      flaw_desc: p.flaw_desc,
      description: p.description,
      publish_time: p.publish_time,
      product_url: p.product_url || "",
      price_position: "正常",
    };
    if (preference) {
      product.ai_score = scoreProduct(product, preference, avgPrice);
    }
    product.price_position = getPricePosition(product.price, avgPrice, Math.min(...prices));
    return product;
  });

  if (!isSupabaseConfigured() || !db) {
    return NextResponse.json({ saved: enriched.length, demo: true, products: enriched });
  }

  const { error } = await db.from("product_data").upsert(
    enriched.map(({ seller_label, ...rest }) => rest),
    { onConflict: "product_url" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 更新价格趋势
  const today = new Date().toISOString().slice(0, 10);
  await db.from("price_trend").upsert(
    {
      keyword,
      date: today,
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      avg_price: avgPrice,
      product_count: enriched.filter((p) => !p.is_filtered).length,
    },
    { onConflict: "keyword,date" }
  );

  return NextResponse.json({ saved: enriched.length, demo: false, products: enriched });
}

