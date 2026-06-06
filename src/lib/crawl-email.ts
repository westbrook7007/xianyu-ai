import { sendEmail } from "@/lib/email";
import type { Product } from "@/lib/types";
import type { CrawlResult } from "@/lib/run-crawl";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildProductRows(products: Product[]): string {
  const top = products
    .filter((p) => !p.is_filtered)
    .sort((a, b) => b.ai_score - a.ai_score)
    .slice(0, 5);

  if (!top.length) {
    return "<p>未找到符合条件的商品，请尝试更换关键词或检查闲鱼登录状态。</p>";
  }

  return `<table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead>
      <tr style="background:#fff7ed;">
        <th style="padding:8px;text-align:left;border-bottom:1px solid #fed7aa;">商品</th>
        <th style="padding:8px;text-align:right;border-bottom:1px solid #fed7aa;">价格</th>
        <th style="padding:8px;text-align:right;border-bottom:1px solid #fed7aa;">AI分</th>
      </tr>
    </thead>
    <tbody>
      ${top
        .map(
          (p) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6;">${escapeHtml(p.title.slice(0, 40))}${p.title.length > 40 ? "…" : ""}</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #f3f4f6;color:#ea580c;font-weight:600;">¥${p.price}</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #f3f4f6;">${p.ai_score}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

export async function sendCrawlResultEmail(
  to: string,
  result: CrawlResult,
  appUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const base = appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resultsUrl = `${base}/results?keyword=${encodeURIComponent(result.keyword)}`;

  let subject: string;
  let statusLine: string;

  if (result.status === "success" || result.status === "demo") {
    subject = `【闲鱼AI】「${result.keyword}」爬取完成，共 ${result.itemCount} 条`;
    statusLine = `爬取成功，共找到 <strong>${result.itemCount}</strong> 条商品。`;
  } else if (result.status === "empty") {
    subject = `【闲鱼AI】「${result.keyword}」爬取完成，未找到商品`;
    statusLine = "爬取已结束，但未找到商品。请确认闲鱼登录状态或更换关键词。";
  } else {
    subject = `【闲鱼AI】「${result.keyword}」爬取失败`;
    statusLine = `爬取失败：${escapeHtml(result.error || "未知错误")}`;
  }

  const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">
    <h2 style="color:#ea580c;margin-bottom:8px;">闲鱼AI选品通知</h2>
    <p>关键词：<strong>${escapeHtml(result.keyword)}</strong></p>
    <p>${statusLine}</p>
    ${result.products.length ? buildProductRows(result.products) : ""}
    <p style="margin-top:20px;">
      <a href="${resultsUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">查看完整选品结果</a>
    </p>
    <p style="margin-top:24px;font-size:12px;color:#9ca3af;">此邮件由闲鱼AI选品工具自动发送，请勿直接回复。</p>
  </div>`;

  const text = [
    `闲鱼AI选品 - ${result.keyword}`,
    statusLine.replace(/<[^>]+>/g, ""),
    `查看结果: ${resultsUrl}`,
  ].join("\n");

  return sendEmail({ to, subject, html, text });
}
