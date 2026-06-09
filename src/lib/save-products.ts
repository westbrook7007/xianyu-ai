import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { scoreProduct, classifySeller, getPricePosition } from "@/lib/scoring";
import type { Product, UserPreference } from "@/lib/types";

/** 与 supabase/schema.sql 列宽一致，防止 varchar 超长写入失败 */
function clip(value: string | null | undefined, max: number): string | null {
  if (value == null || value === "") return null;
  const s = String(value);
  return s.length <= max ? s : s.slice(0, max);
}

function clipRequired(value: string | null | undefined, max: number, fallback: string): string {
  return clip(value, max) || fallback;
}

/** 与 supabase/schema.sql 中 product_data 列一致，避免写入 UI 专用字段导致 upsert 失败 */
function toProductRow(p: Product) {
  return {
    keyword: clipRequired(p.keyword, 255, "unknown"),
    title: clipRequired(p.title, 500, "未知商品"),
    price: p.price,
    original_price: p.original_price ?? null,
    avg_price: p.avg_price ?? null,
    quality: clip(p.quality, 100),
    service: clip(p.service, 255),
    service_day: p.service_day ?? 0,
    seller_id: clip(p.seller_id, 100),
    seller_level: clip(p.seller_level, 50),
    seller_bio: p.seller_bio ?? null,
    seller_item_count: p.seller_item_count ?? 0,
    seller_type: p.seller_type,
    life_level: p.life_level,
    ai_score: p.ai_score,
    flaw_desc: p.flaw_desc ?? null,
    description: p.description ?? null,
    publish_time: p.publish_time ?? null,
    product_url: clipRequired(p.product_url, 1000, ""),
    is_filtered: p.is_filtered ?? false,
    price_position: clip(p.price_position, 20),
  };
}

export function buildEnrichedProducts(
  products: Partial<Product>[],
  keyword: string,
  preference?: UserPreference
): Product[] {
  const prices = products.map((p) => p.price || 0).filter((p) => p > 0);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;

  return products.map((p) => {
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
    product.price_position = getPricePosition(product.price, avgPrice, minPrice);
    return product;
  });
}

export async function saveProductsToDb(
  products: Product[],
  keyword: string
): Promise<{ saved: number; demo: boolean }> {
  if (!products.length) return { saved: 0, demo: true };

  const db = getSupabaseAdmin();
  if (!isSupabaseConfigured() || !db) {
    return { saved: products.length, demo: true };
  }

  const prices = products.map((p) => p.price).filter((p) => p > 0);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const { error } = await db.from("product_data").upsert(
    products.map(toProductRow),
    { onConflict: "product_url" }
  );
  if (error) throw new Error(error.message);

  const today = new Date().toISOString().slice(0, 10);
  await db.from("price_trend").upsert(
    {
      keyword,
      date: today,
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      avg_price: avgPrice,
      product_count: products.filter((p) => !p.is_filtered).length,
    },
    { onConflict: "keyword,date" }
  );

  return { saved: products.length, demo: false };
}
