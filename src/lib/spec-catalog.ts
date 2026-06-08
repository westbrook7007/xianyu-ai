/** 一期标品规格库 + 关键词匹配（PRD R2） */

export type SpecCategory = "phone" | "drone" | "sneaker";

export type SpecEntry = {
  id: string;
  category: SpecCategory;
  label: string;
  keywords: string[];
  example: string;
};

export const SPEC_CATEGORIES: { value: SpecCategory; label: string; desc: string }[] = [
  { value: "phone", label: "手机", desc: "iPhone / 安卓旗舰等固定型号" },
  { value: "drone", label: "无人机", desc: "DJI 等固定型号飞行器" },
  { value: "sneaker", label: "球星签名鞋", desc: "KD / PG / 莫兰特等签名款" },
];

export const SPEC_CATALOG: SpecEntry[] = [
  // 手机
  { id: "iphone-15-pro", category: "phone", label: "iPhone 15 Pro", keywords: ["iphone 15 pro", "15pro", "苹果15pro"], example: "iPhone 15 Pro 256G" },
  { id: "iphone-15", category: "phone", label: "iPhone 15", keywords: ["iphone 15", "苹果15"], example: "iPhone 15 128G" },
  { id: "iphone-14-pro", category: "phone", label: "iPhone 14 Pro", keywords: ["iphone 14 pro", "14pro"], example: "iPhone 14 Pro 256G" },
  { id: "iphone-13", category: "phone", label: "iPhone 13", keywords: ["iphone 13", "苹果13"], example: "iPhone 13 128G" },
  // 无人机
  { id: "dji-mini4-pro", category: "drone", label: "DJI Mini 4 Pro", keywords: ["mini 4 pro", "mini4pro", "御mini4"], example: "DJI Mini 4 Pro 畅飞套装" },
  { id: "dji-mini3-pro", category: "drone", label: "DJI Mini 3 Pro", keywords: ["mini 3 pro", "mini3pro"], example: "DJI Mini 3 Pro" },
  { id: "dji-air3", category: "drone", label: "DJI Air 3", keywords: ["air 3", "air3", "御air3"], example: "DJI Air 3 畅飞套装" },
  { id: "dji-mavic3", category: "drone", label: "DJI Mavic 3", keywords: ["mavic 3", "mavic3", "御3"], example: "DJI Mavic 3" },
  // 球星签名鞋
  { id: "kd16", category: "sneaker", label: "KD 16", keywords: ["kd16", "kd 16", "杜兰特16"], example: "KD 16 黑武士 42码" },
  { id: "kd15", category: "sneaker", label: "KD 15", keywords: ["kd15", "kd 15"], example: "KD 15 42码" },
  { id: "pg6", category: "sneaker", label: "PG 6", keywords: ["pg6", "pg 6", "保罗乔治6"], example: "PG 6 42码" },
  { id: "ja1", category: "sneaker", label: "JA 1 莫兰特", keywords: ["ja1", "ja 1", "莫兰特1"], example: "JA 1 42码" },
  { id: "ja2", category: "sneaker", label: "JA 2 莫兰特", keywords: ["ja2", "ja 2", "莫兰特2"], example: "JA 2 42码" },
];

export type SpecMatchResult = {
  matched: boolean;
  specId?: string;
  specLabel?: string;
  category?: SpecCategory;
};

/** 从用户输入或商品标题匹配标准规格 */
export function matchSpec(text: string, hintCategory?: SpecCategory): SpecMatchResult {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const pool = hintCategory
    ? SPEC_CATALOG.filter((s) => s.category === hintCategory)
    : SPEC_CATALOG;

  let best: { entry: SpecEntry; score: number } | null = null;

  for (const entry of pool) {
    for (const kw of entry.keywords) {
      const nkw = kw.toLowerCase();
      if (normalized.includes(nkw)) {
        const score = nkw.length;
        if (!best || score > best.score) best = { entry, score };
      }
    }
    if (normalized.includes(entry.label.toLowerCase())) {
      const score = entry.label.length;
      if (!best || score > best.score) best = { entry, score };
    }
  }

  if (!best) return { matched: false };

  return {
    matched: true,
    specId: best.entry.id,
    specLabel: best.entry.label,
    category: best.entry.category,
  };
}

export function detectCategoryFromKeyword(keyword: string): SpecCategory {
  const match = matchSpec(keyword);
  if (match.matched && match.category) return match.category;

  const k = keyword.toLowerCase();
  if (/dji|无人机|mini\s*\d|mavic|air\s*\d|御/.test(k)) return "drone";
  if (/kd|pg\s*\d|ja\s*\d|莫兰特|杜兰特|球鞋|nike|jordan/.test(k)) return "sneaker";
  return "phone";
}

export function getSpecsByCategory(category: SpecCategory): SpecEntry[] {
  return SPEC_CATALOG.filter((s) => s.category === category);
}

export function getHotSpecs(): SpecEntry[] {
  return [
    SPEC_CATALOG.find((s) => s.id === "iphone-15-pro")!,
    SPEC_CATALOG.find((s) => s.id === "dji-mini4-pro")!,
    SPEC_CATALOG.find((s) => s.id === "kd16")!,
    SPEC_CATALOG.find((s) => s.id === "ja1")!,
  ];
}
