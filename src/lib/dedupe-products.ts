import type { Product } from "@/lib/types";

/** 按闲鱼商品 ID 去重 */
export function dedupeProducts(products: Product[]): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of products) {
    const id = p.product_url?.match(/[?&]id=(\d+)/)?.[1];
    const key = id || p.product_url?.trim() || p.title?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
