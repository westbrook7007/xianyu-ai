import fs from "fs/promises";
import path from "path";
import type { Product } from "@/lib/types";

const CACHE_DIR = path.join(process.cwd(), ".crawl-cache");

function cacheKey(userId: string, keyword: string): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return `${safe(userId)}_${safe(keyword)}.json`;
}

export async function saveCrawlResults(
  userId: string,
  keyword: string,
  products: Product[],
  status: string
): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, cacheKey(userId, keyword));
  await fs.writeFile(
    file,
    JSON.stringify({ keyword, products, status, savedAt: new Date().toISOString() }),
    "utf-8"
  );
}

export async function loadCrawlResults(
  userId: string,
  keyword: string
): Promise<{ keyword: string; products: Product[]; status: string; savedAt: string } | null> {
  try {
    const file = path.join(CACHE_DIR, cacheKey(userId, keyword));
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
