/** 全局可配置参数 - 可通过环境变量覆盖 */

export const CONFIG = {
  crawl: {
    minItems: parseInt(process.env.CRAWL_MIN_ITEMS || "20", 10),
    maxItems: parseInt(process.env.CRAWL_MAX_ITEMS || "30", 10),
    intervalSeconds: parseInt(process.env.CRAWL_INTERVAL_SECONDS || "30", 10),
    maxManualPerDay: 3,
    maxScheduledPerDay: 1,
  },
  scoring: {
    price: parseInt(process.env.SCORE_WEIGHT_PRICE || "35", 10),
    quality: parseInt(process.env.SCORE_WEIGHT_QUALITY || "25", 10),
    seller: parseInt(process.env.SCORE_WEIGHT_SELLER || "20", 10),
    life: parseInt(process.env.SCORE_WEIGHT_LIFE || "20", 10),
    serviceBonus: 8,
    serviceLongBonus: 5,
    serviceLongDays: 180,
  },
  alerts: {
    goodDealRatio: 0.8, // 低于30日均价80%
    historicLowTolerance: 0.01,
  },
  seller: {
    scalperItemThreshold: 30,
    merchantKeywords: [
      "工作室", "批发", "回收", "翻新", "专卖", "数码店",
      "商行", "贸易", "源头", "一手", "代理", "全新专卖",
    ],
    personalKeywords: ["自用", "闲置", "转出", "搬家", "毕业", "换机"],
  },
} as const;

export const QUALITY_OPTIONS = [
  { value: "like_new", label: "近乎全新", desc: "无划痕、无磕碰、无使用痕迹" },
  { value: "light_wear", label: "轻微使用痕迹", desc: "细微划痕，不影响观感" },
  { value: "visible_wear", label: "明显划痕/掉漆", desc: "优先低价" },
  { value: "functional_flaw", label: "功能瑕疵可接受", desc: "外观问题，功能完好，极致低价" },
] as const;

export const LIFE_OPTIONS = [
  { value: "life_first", label: "优先剩余寿命长" },
  { value: "price_first", label: "优先价格最低" },
  { value: "balanced", label: "成色&寿命均衡" },
] as const;

export const SERVICE_OPTIONS = [
  { value: "required", label: "必须带官方增值服务" },
  { value: "preferred", label: "优先带增值服务，无也可" },
  { value: "not_needed", label: "不需要，只看裸机性价比" },
] as const;

export const SELLER_OPTIONS = [
  { value: "excellent_only", label: "只看信用优秀/极好个人卖家" },
  { value: "allow_normal", label: "可接受普通信用，杜绝黄牛" },
] as const;

export const CATEGORY_OPTIONS = [
  { value: "phone", label: "手机" },
  { value: "drone", label: "无人机" },
  { value: "sneaker", label: "球星签名鞋" },
] as const;

export const SERVICE_HINTS = {
  phone: "关注 AppleCare+、碎屏保、官方延保等增值服务",
  drone: "关注 DJI 随心换、在保状态、电池循环次数",
  sneaker: "关注原盒、防伪扣、购买凭证、未穿/全新吊牌",
} as const;

export const SERVICE_OPTIONS_BY_CATEGORY = {
  phone: SERVICE_OPTIONS,
  drone: SERVICE_OPTIONS,
  sneaker: SERVICE_OPTIONS,
} as const;
