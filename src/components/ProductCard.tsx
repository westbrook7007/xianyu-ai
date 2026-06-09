"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { ExternalLink, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import clsx from "clsx";
import { getGoofishLink } from "@/lib/goofish-url";
import { getUserId } from "@/lib/user";

const LABEL_STYLE: Record<string, string> = {
  "优质个人卖家": "bg-green-100 text-green-700",
  "普通卖家": "bg-blue-100 text-blue-700",
  "疑似黄牛（已过滤）": "bg-red-100 text-red-500 line-through",
};

const POSITION_STYLE: Record<string, string> = {
  史低: "bg-red-500 text-white",
  好价: "bg-green-500 text-white",
  正常: "bg-gray-200 text-gray-700",
  偏高: "bg-orange-200 text-orange-800",
};

export default function ProductCard({ product }: { product: Product }) {
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const label = product.seller_label || (product.seller_type === 2 ? "疑似黄牛（已过滤）" : "普通卖家");
  const goofishLink = getGoofishLink({ product_url: product.product_url, title: product.title, keyword: product.keyword });
  const isLowPrice = product.price_position === "好价" || product.price_position === "史低";

  async function sendFeedback(helpful: boolean) {
    if (submitting || feedback) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productUrl: product.product_url,
          keyword: product.keyword,
          helpful,
          userId: getUserId(),
        }),
      });
      setFeedback(helpful ? "helpful" : "not_helpful");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={clsx(
        "flex h-full flex-col rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md",
        product.is_filtered ? "border-red-100 opacity-60" : isLowPrice ? "border-green-300 ring-1 ring-green-200" : "border-orange-100"
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <span className={clsx("rounded px-1.5 py-0.5 text-xs font-medium", LABEL_STYLE[label] || "bg-gray-100")}>
            {label}
          </span>
          {product.spec_matched && product.spec_label && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">{product.spec_label}</span>
          )}
          {product.price_position && (
            <span className={clsx("rounded px-1.5 py-0.5 text-xs font-medium", POSITION_STYLE[product.price_position])}>
              {product.price_position}
            </span>
          )}
        </div>
        {!product.is_filtered && (
          <div className="shrink-0 text-right leading-none">
            <div className="text-lg font-bold text-brand-600">¥{product.price}</div>
            <div className="mt-0.5 text-xs text-gray-400">
              {product.avg_price ? `均¥${Math.round(product.avg_price)}` : ""}
              {product.avg_price ? " · " : ""}
              分{product.ai_score}
            </div>
          </div>
        )}
      </div>

      <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{product.title}</h3>

      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
        <span>成色 {product.quality || "—"}</span>
        <span className="text-gray-300">|</span>
        <span className="inline-flex items-center gap-0.5">
          寿命
          {Array.from({ length: product.life_level || 3 }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
          ))}
        </span>
        <span className="text-gray-300">|</span>
        <span>信用 {product.seller_level || "未知"}</span>
        {product.service && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-green-600">✓ {product.service}</span>
          </>
        )}
        {product.seller_review_note && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-amber-700">{product.seller_review_note}</span>
          </>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
        {!product.is_filtered && goofishLink ? (
          <a
            href={goofishLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-600"
          >
            去闲鱼
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span />
        )}

        {!product.is_filtered && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!!feedback || submitting}
              onClick={() => sendFeedback(true)}
              className={clsx(
                "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition",
                feedback === "helpful" ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-gray-100"
              )}
              title="有用"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={!!feedback || submitting}
              onClick={() => sendFeedback(false)}
              className={clsx(
                "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition",
                feedback === "not_helpful" ? "bg-red-100 text-red-600" : "text-gray-500 hover:bg-gray-100"
              )}
              title="无用"
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
