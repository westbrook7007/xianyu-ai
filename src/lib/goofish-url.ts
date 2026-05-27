/** 闲鱼商品链接标准化 */

const ITEM_BASE = "https://www.goofish.com/item?id=";

export function extractItemId(url?: string): string {
  if (!url) return "";
  const m = url.match(/[?&]id=(\d+)/);
  return m ? m[1] : "";
}

export function normalizeGoofishItemUrl(url?: string, itemId?: string): string {
  const id = itemId && /^\d+$/.test(itemId) ? itemId : extractItemId(url);
  if (id) return `${ITEM_BASE}${id}`;

  if (!url) return "";

  let u = url.trim();
  if (u.startsWith("//")) u = "https:" + u;
  if (u.startsWith("/")) u = "https://www.goofish.com" + u;

  if (u.includes("goofish.com/item") && /id=\d+/.test(u)) {
    const m = u.match(/id=(\d+)/);
    return m ? `${ITEM_BASE}${m[1]}` : u.split("#")[0];
  }

  // 搜索页不是商品链接
  if (u.includes("/search")) return "";

  return "";
}

/** 获取可打开的闲鱼链接：优先商品页，否则按标题搜索 */
export function getGoofishLink(product: {
  product_url?: string;
  title?: string;
  keyword?: string;
}): string {
  const itemUrl = normalizeGoofishItemUrl(product.product_url);
  if (itemUrl) return itemUrl;

  const q = product.title || product.keyword || "";
  if (q) {
    return `https://www.goofish.com/search?q=${encodeURIComponent(q.slice(0, 40))}`;
  }
  return "https://www.goofish.com/";
}

export function isDirectItemLink(url?: string): boolean {
  return !!normalizeGoofishItemUrl(url);
}
