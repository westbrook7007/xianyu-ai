import { detectCategoryFromKeyword } from "@/lib/spec-catalog";
import type { Category, Product, UserPreference } from "@/lib/types";

/** 无人机类选品过滤：低价异常、出租信息（PRD） */
export function applyCategoryFilters(
  products: Product[],
  keyword: string,
  preference?: UserPreference
): Product[] {
  const category: Category = preference?.category || detectCategoryFromKeyword(keyword);
  if (category !== "drone") return products;

  return products.filter((p) => {
    if (p.price < 100) return false;
    const text = `${p.title || ""} ${p.description || ""} ${p.seller_bio || ""}`;
    if (text.includes("出租")) return false;
    return true;
  });
}

/** 过滤低于均价 30% 的引流标价 */
export function filterBaitPrices(products: Product[], avgPrice: number): Product[] {
  if (avgPrice <= 0) return products;
  const floor = avgPrice * 0.3;
  return products.filter((p) => p.price >= floor);
}
