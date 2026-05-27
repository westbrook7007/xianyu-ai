export type QualityLimit =
  | "like_new"
  | "light_wear"
  | "visible_wear"
  | "functional_flaw";

export type LifePriority = "life_first" | "price_first" | "balanced";

export type ServiceDemand =
  | "required"
  | "preferred"
  | "not_needed";

export type SellerPreference = "excellent_only" | "allow_normal";

export type Category = "digital" | "appliance" | "trendy" | "general";

export type SortMode =
  | "ai_score"
  | "price_low"
  | "quality_best"
  | "life_longest"
  | "value";

export interface UserPreference {
  id?: number;
  user_id: string;
  keyword: string;
  quality_limit: QualityLimit;
  life_priority: LifePriority;
  service_demand: ServiceDemand;
  max_price?: number;
  accept_premium?: boolean;
  seller_preference?: SellerPreference;
  category?: Category;
  is_default?: boolean;
  create_time?: string;
}

export interface Product {
  id?: number;
  keyword: string;
  title: string;
  price: number;
  original_price?: number;
  avg_price?: number;
  quality?: string;
  service?: string;
  service_day?: number;
  seller_id?: string;
  seller_level?: string;
  seller_bio?: string;
  seller_item_count?: number;
  seller_type: number; // 1个人 2黄牛
  life_level: number;
  ai_score: number;
  flaw_desc?: string;
  description?: string;
  publish_time?: string;
  crawl_time?: string;
  product_url: string;
  is_filtered?: boolean;
  price_position?: string;
  seller_label?: string;
}

export interface PriceTrendPoint {
  date: string;
  min_price: number;
  max_price: number;
  avg_price: number;
  product_count: number;
}

export interface TaskSchedule {
  id?: number;
  user_id: string;
  keyword: string;
  task_time: string;
  task_status: number;
  remind_threshold: number;
  create_time?: string;
}

export interface PriceAlert {
  id?: number;
  user_id: string;
  keyword: string;
  product_url?: string;
  title?: string;
  price?: number;
  alert_type: "good_deal" | "historic_low";
  ai_score?: number;
  is_read?: boolean;
  create_time?: string;
}

export interface CrawlLog {
  id?: number;
  keyword: string;
  user_id?: string;
  trigger_type: "manual" | "scheduled";
  item_count: number;
  status: string;
  message?: string;
  create_time?: string;
}
