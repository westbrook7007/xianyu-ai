import { scoreProduct, classifySeller, getPricePosition } from "@/lib/scoring";
import { dedupeProducts } from "@/lib/dedupe-products";
import { applyCategoryFilters, filterBaitPrices } from "@/lib/category-filters";
import { matchSpec } from "@/lib/spec-catalog";
import type { Product, UserPreference } from "@/lib/types";

const INVALID_TITLE_KEYWORDS = [
  "为你推荐", "猜你喜欢", "看了又看", "相似宝贝", "热门推荐", "相关推荐",
];

function sanitizeTitle(title: string, keyword: string, description?: string): string {
  const t = (title || "").trim();
  const bad = (s: string) =>
    !s || s.length < 4 || INVALID_TITLE_KEYWORDS.some((k) => s.includes(k));
  if (!bad(t)) return t.slice(0, 500);
  const desc = (description || "").trim();
  if (!bad(desc)) return desc.slice(0, 500);
  return keyword ? `${keyword} 相关商品` : (t || "未知商品").slice(0, 500);
}

export function enrichProducts(
  rawProducts: Partial<Product>[],
  keyword: string,
  preference?: UserPreference
): Product[] {
  const unique = dedupeProducts(
    rawProducts.map((p) => ({ ...p, product_url: p.product_url || "" })) as Product[]
  );
  const prices = unique.map((p) => p.price || 0).filter((p) => p > 0);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;

  const hintCategory = preference?.category;

  const enriched = unique.map((p) => {
    const seller = classifySeller(p);
    const spec = matchSpec(`${p.title || ""} ${keyword}`, hintCategory);
    const product: Product = {
      keyword,
      title: sanitizeTitle(p.title || "", keyword, p.description),
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
      spec_label: spec.specLabel,
      spec_matched: spec.matched,
      seller_bad_reviews: p.seller_bad_reviews,
      seller_review_note: p.seller_review_note,
    };
    if (preference) {
      product.ai_score = scoreProduct(product, preference, avgPrice);
    }
    product.price_position = getPricePosition(product.price, avgPrice, minPrice);
    return product;
  });

  const afterBait = filterBaitPrices(enriched, avgPrice);
  return applyCategoryFilters(afterBait, keyword, preference);
}
