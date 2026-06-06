import { NextRequest, NextResponse } from "next/server";
import { loadCrawlResults } from "@/lib/crawl-cache";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "";
  const keyword = req.nextUrl.searchParams.get("keyword") || "";

  if (!userId || !keyword) {
    return NextResponse.json({ error: "缺少 userId 或 keyword" }, { status: 400 });
  }

  const cached = await loadCrawlResults(userId, keyword);
  if (!cached) {
    return NextResponse.json({ products: [], status: "not_found" });
  }

  return NextResponse.json({
    products: cached.products,
    status: cached.status,
    savedAt: cached.savedAt,
  });
}
