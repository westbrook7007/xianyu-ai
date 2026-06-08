import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { buildEnrichedProducts, saveProductsToDb } from "@/lib/save-products";
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

  const enriched = buildEnrichedProducts(products, keyword, preference);
  const { saved, demo } = await saveProductsToDb(enriched, keyword);
  return NextResponse.json({ saved, demo, products: enriched });
}

