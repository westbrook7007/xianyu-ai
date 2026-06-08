import { NextRequest, NextResponse } from "next/server";
import { saveFeedback, getFeedbackStats } from "@/lib/product-feedback";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productUrl, keyword, helpful, ordered, userId } = body as {
    productUrl?: string;
    keyword?: string;
    helpful?: boolean;
    ordered?: boolean;
    userId?: string;
  };

  if (!productUrl || !keyword || typeof helpful !== "boolean") {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  saveFeedback({ productUrl, keyword, helpful, ordered, userId });
  return NextResponse.json({ saved: true });
}

export async function GET() {
  return NextResponse.json(getFeedbackStats());
}
