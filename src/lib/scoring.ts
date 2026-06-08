import { CONFIG } from "./config";
import type { Product, UserPreference } from "./types";

const SERVICE_KEYWORDS = [
  "随心换", "碎屏保", "官方延保", "在保", "保修剩余", "Care", "AppleCare",
  "原盒", "防伪扣", "购买凭证", "未穿", "全新吊牌",
];

const QUALITY_RANK: Record<string, number> = {
  "全新": 1, "99新": 1, "98新": 2, "95新": 2,
  "9成新": 3, "8成新": 4, "7成新": 5, "6成新": 5,
};

const USER_QUALITY_MAX: Record<string, number> = {
  like_new: 1,
  light_wear: 2,
  visible_wear: 4,
  functional_flaw: 5,
};

/** 从描述文本识别成色等级 1-5 */
export function detectQualityRank(text: string): number {
  const t = text.toLowerCase();
  for (const [key, rank] of Object.entries(QUALITY_RANK)) {
    if (t.includes(key.toLowerCase())) return rank;
  }
  if (/划痕|掉漆|磕碰/.test(text)) return 4;
  if (/功能.*正常|功能完好/.test(text)) return 3;
  return 3;
}

/** 识别增值服务 */
export function detectService(text: string): { service: string; days: number } {
  let service = "";
  for (const kw of SERVICE_KEYWORDS) {
    if (text.includes(kw)) service += (service ? "、" : "") + kw;
  }
  const dayMatch = text.match(/(?:剩余|还有)\s*(\d+)\s*天/);
  const monthMatch = text.match(/(?:剩余|还有)\s*(\d+)\s*[个]?月/);
  let days = 0;
  if (dayMatch) days = parseInt(dayMatch[1], 10);
  else if (monthMatch) days = parseInt(monthMatch[1], 10) * 30;
  else if (service) days = 90;
  return { service, days };
}

/** 识别寿命等级 1-5 星 */
export function detectLifeLevel(text: string, category: string): number {
  let score = 3;
  const yearMatch = text.match(/(\d{4})\s*年(?:购买|入手|出厂)/);
  if (yearMatch) {
    const age = new Date().getFullYear() - parseInt(yearMatch[1], 10);
    if (age <= 1) score = 5;
    else if (age <= 2) score = 4;
    else if (age <= 3) score = 3;
    else if (age <= 5) score = 2;
    else score = 1;
  }
  if (/使用(?:了)?\s*(\d+)\s*个月/.test(text)) {
    const m = text.match(/使用(?:了)?\s*(\d+)\s*个月/);
    if (m) {
      const months = parseInt(m[1], 10);
      if (months <= 6) score = Math.max(score, 5);
      else if (months <= 12) score = Math.max(score, 4);
      else if (months <= 24) score = Math.max(score, 3);
    }
  }
  if (/无拆无修|官方在保/.test(text)) score = Math.min(5, score + 1);
  const highWear = ["无人机", "游戏机", "switch", "ps5", "dji"];
  if (highWear.some((k) => text.toLowerCase().includes(k)) && (category === "phone" || category === "drone")) {
    score = Math.max(1, score - 0); // 高损耗设备已在 PRD 加权，此处保持基础评级
  }
  return Math.min(5, Math.max(1, Math.round(score)));
}

/** 卖家类型判定 */
export function classifySeller(product: Partial<Product>): {
  seller_type: number;
  seller_label: string;
  is_filtered: boolean;
  seller_score_factors: number;
} {
  const bio = (product.seller_bio || "") + (product.description || "") + (product.title || "");
  const itemCount = product.seller_item_count || 0;
  const level = product.seller_level || "";

  // 黄牛强制过滤
  if (itemCount > CONFIG.seller.scalperItemThreshold) {
    return { seller_type: 2, seller_label: "疑似黄牛（已过滤）", is_filtered: true, seller_score_factors: 0 };
  }
  if (CONFIG.seller.merchantKeywords.some((k) => bio.includes(k))) {
    return { seller_type: 2, seller_label: "疑似黄牛（已过滤）", is_filtered: true, seller_score_factors: 0 };
  }
  if ((level === "良好" || level === "较差" || !level) && itemCount > 15) {
    return { seller_type: 2, seller_label: "疑似黄牛（已过滤）", is_filtered: true, seller_score_factors: 0 };
  }

  let factors = 0;
  if (level === "优秀" || level === "极好") factors++;
  if (itemCount < 15) factors++;
  if (itemCount < 8) factors++;
  if (!CONFIG.seller.merchantKeywords.some((k) => bio.includes(k))) factors++;
  if (CONFIG.seller.personalKeywords.some((k) => bio.includes(k))) factors++;

  if (factors >= 3) {
    return { seller_type: 1, seller_label: "优质个人卖家", is_filtered: false, seller_score_factors: factors };
  }
  return { seller_type: 1, seller_label: "普通卖家", is_filtered: false, seller_score_factors: factors };
}

/** AI 综合评分 */
export function scoreProduct(
  product: Product,
  pref: UserPreference,
  avgPrice: number,
  histMinPrice?: number
): number {
  if (product.is_filtered || product.seller_type === 2) return 0;

  const w = CONFIG.scoring;
  const desc = (product.description || "") + (product.title || "") + (product.quality || "");

  // 价格分
  let priceScore = 0;
  if (avgPrice > 0) {
    const ratio = product.price / avgPrice;
    priceScore = Math.max(0, Math.min(w.price, w.price * (1.3 - ratio) / 0.5));
  } else {
    priceScore = w.price * 0.6;
  }
  if (pref.life_priority === "price_first") priceScore = Math.min(w.price + 5, priceScore * 1.1);

  // 成色匹配分
  const qualityRank = detectQualityRank(desc);
  const maxRank = USER_QUALITY_MAX[pref.quality_limit] || 3;
  let qualityScore = 0;
  if (qualityRank <= maxRank) {
    qualityScore = w.quality * (1 - (qualityRank - 1) / 4);
  }

  // 卖家分
  const sellerInfo = classifySeller(product);
  let sellerScore = 0;
  if (sellerInfo.seller_type === 1) {
    sellerScore = (sellerInfo.seller_score_factors / 5) * w.seller;
  }
  if (pref.seller_preference === "excellent_only" && product.seller_level !== "优秀" && product.seller_level !== "极好") {
    sellerScore *= 0.5;
  }
  if (product.seller_bad_reviews && product.seller_bad_reviews > 0) {
    sellerScore *= Math.max(0.5, 1 - product.seller_bad_reviews * 0.08);
  }

  // 寿命分
  const lifeLevel = product.life_level || detectLifeLevel(desc, pref.category || "phone");
  let lifeScore = (lifeLevel / 5) * w.life;
  if (pref.life_priority === "life_first") lifeScore = Math.min(w.life + 5, lifeScore * 1.15);

  let total = priceScore + qualityScore + sellerScore + lifeScore;

  // 增值服务加分（按品类：手机/无人机/球鞋）
  if (pref.service_demand !== "not_needed") {
    const svc = detectService(desc + (product.service || ""));
    if (svc.service) total += w.serviceBonus;
    if (svc.days > w.serviceLongDays) total += w.serviceLongBonus;
    if (pref.service_demand === "required" && !svc.service) return 0;
  }

  // 价格上限过滤
  if (pref.max_price && product.price > pref.max_price) {
    if (!pref.accept_premium) return 0;
    total *= 0.7;
  }

  return Math.round(Math.min(100, total) * 10) / 10;
}

/** 价格定位 */
export function getPricePosition(
  price: number,
  avg30: number,
  min30: number
): string {
  if (min30 > 0 && price <= min30 * 1.01) return "史低";
  if (avg30 > 0 && price <= avg30 * CONFIG.alerts.goodDealRatio) return "好价";
  if (avg30 > 0 && price <= avg30 * 1.1) return "正常";
  return "偏高";
}
