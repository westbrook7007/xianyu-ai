import type { Product, PriceTrendPoint, PriceAlert, TaskSchedule, UserPreference } from "./types";

/** 演示数据 - Supabase 未配置时使用 */
export const MOCK_KEYWORD = "iPhone 15 Pro";

export const MOCK_PRODUCTS: Product[] = [
  {
    keyword: MOCK_KEYWORD,
    title: "自用 iPhone 15 Pro 256G 原色 99新 无磕碰",
    price: 5899,
    original_price: 8999,
    avg_price: 6200,
    quality: "99新",
    service: "AppleCare+剩余8个月",
    service_day: 240,
    seller_id: "u001",
    seller_level: "极好",
    seller_item_count: 5,
    seller_type: 1,
    life_level: 5,
    ai_score: 92.5,
    description: "个人自用，闲置转出，无拆无修，官方在保",
    product_url: "https://www.goofish.com/item?id=demo001",
    price_position: "好价",
    seller_label: "优质个人卖家",
    publish_time: new Date().toISOString(),
    crawl_time: new Date().toISOString(),
  },
  {
    keyword: MOCK_KEYWORD,
    title: "iPhone 15 Pro 256G 黑色 95新 轻微划痕",
    price: 5599,
    avg_price: 6200,
    quality: "95新",
    service: "",
    service_day: 0,
    seller_id: "u002",
    seller_level: "优秀",
    seller_item_count: 12,
    seller_type: 1,
    life_level: 4,
    ai_score: 85.2,
    description: "换机出，功能完好，细微划痕",
    product_url: "https://www.goofish.com/item?id=demo002",
    price_position: "好价",
    seller_label: "优质个人卖家",
    publish_time: new Date().toISOString(),
    crawl_time: new Date().toISOString(),
  },
  {
    keyword: MOCK_KEYWORD,
    title: "iPhone15Pro 256G 批发 工作室专供",
    price: 5200,
    avg_price: 6200,
    quality: "9成新",
    seller_id: "u003",
    seller_level: "良好",
    seller_item_count: 45,
    seller_type: 2,
    life_level: 3,
    ai_score: 0,
    description: "数码专卖 长期供货",
    product_url: "https://www.goofish.com/item?id=demo003",
    is_filtered: true,
    price_position: "正常",
    seller_label: "疑似黄牛（已过滤）",
    publish_time: new Date().toISOString(),
    crawl_time: new Date().toISOString(),
  },
  {
    keyword: MOCK_KEYWORD,
    title: "15Pro 256 国行 98新 带碎屏保",
    price: 5999,
    avg_price: 6200,
    quality: "98新",
    service: "碎屏保剩余200天",
    service_day: 200,
    seller_id: "u004",
    seller_level: "极好",
    seller_item_count: 3,
    seller_type: 1,
    life_level: 5,
    ai_score: 88.0,
    description: "毕业出闲置，带官方碎屏保",
    product_url: "https://www.goofish.com/item?id=demo004",
    price_position: "正常",
    seller_label: "优质个人卖家",
    publish_time: new Date().toISOString(),
    crawl_time: new Date().toISOString(),
  },
];

export const MOCK_TRENDS: PriceTrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const base = 6200 + Math.sin(i / 3) * 200;
  return {
    date: d.toISOString().slice(0, 10),
    min_price: Math.round(base - 350),
    max_price: Math.round(base + 280),
    avg_price: Math.round(base),
    product_count: 20 + (i % 5),
  };
});

export const MOCK_ALERTS: PriceAlert[] = [
  {
    user_id: "demo",
    keyword: MOCK_KEYWORD,
    title: "自用 iPhone 15 Pro 256G 原色 99新",
    price: 5899,
    alert_type: "good_deal",
    ai_score: 92.5,
    product_url: "https://www.goofish.com/item?id=demo001",
    is_read: false,
    create_time: new Date().toISOString(),
  },
];

export const MOCK_TASKS: TaskSchedule[] = [
  {
    user_id: "demo",
    keyword: MOCK_KEYWORD,
    task_time: "10:00",
    task_status: 1,
    remind_threshold: 0.8,
  },
];

export const MOCK_PREFERENCE: UserPreference = {
  user_id: "demo",
  keyword: MOCK_KEYWORD,
  quality_limit: "light_wear",
  life_priority: "balanced",
  service_demand: "preferred",
  max_price: 6500,
  accept_premium: true,
  seller_preference: "excellent_only",
  category: "digital",
  is_default: true,
};

export const HOT_KEYWORDS = [
  { keyword: "iPhone 15 Pro", avg_price: 6200, trend: -3.2 },
  { keyword: "DJI Mini 4 Pro", avg_price: 3200, trend: -5.1 },
  { keyword: "Switch OLED", avg_price: 1580, trend: 1.2 },
  { keyword: "MacBook Air M2", avg_price: 5400, trend: -2.8 },
  { keyword: "PS5 光驱版", avg_price: 2100, trend: 0.5 },
];
