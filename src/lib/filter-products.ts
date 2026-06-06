import type { Product, SortMode } from "@/lib/types";

export function sortProducts(items: Product[], sort: SortMode): Product[] {
  const copy = [...items];
  switch (sort) {
    case "price_low":
      return copy.sort((a, b) => a.price - b.price);
    case "quality_best":
      return copy.sort((a, b) => (a.life_level || 0) - (b.life_level || 0)).reverse();
    case "life_longest":
      return copy.sort((a, b) => (b.life_level || 0) - (a.life_level || 0));
    case "value":
      return copy.sort((a, b) => b.price / (b.ai_score || 1) - a.price / (a.ai_score || 1));
    default:
      return copy.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
  }
}

export function filterProducts(
  items: Product[],
  opts: {
    hideFiltered?: boolean;
    personalOnly?: boolean;
    withService?: boolean;
  }
): Product[] {
  let out = items;
  if (opts.hideFiltered) out = out.filter((p) => !p.is_filtered);
  if (opts.personalOnly) {
    out = out.filter((p) => p.seller_type === 1 && p.seller_label?.includes("个人"));
  }
  if (opts.withService) out = out.filter((p) => p.service);
  return out;
}

export function applyProductView(
  items: Product[],
  opts: {
    sort: SortMode;
    hideFiltered?: boolean;
    personalOnly?: boolean;
    withService?: boolean;
  }
): Product[] {
  return sortProducts(
    filterProducts(items, opts),
    opts.sort
  );
}
