import { scoreProduct, classifySeller, getPricePosition } from "@/lib/scoring";
import { dedupeProducts } from "@/lib/dedupe-products";
import type { Product, UserPreference } from "@/lib/types";

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

  return unique.map((p) => {
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
