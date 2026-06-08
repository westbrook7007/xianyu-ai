import { NextResponse } from "next/server";
import { getCrawlMetrics } from "@/lib/crawl-metrics";

export async function GET() {
  return NextResponse.json(getCrawlMetrics());
}
