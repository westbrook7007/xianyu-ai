"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { ExternalLink, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import clsx from "clsx";
import { getGoofishLink, isDirectItemLink } from "@/lib/goofish-url";
import { getUserId } from "@/lib/user";

const LABEL_STYLE: Record<string, string> = {
  "优质个人卖家": "bg-green-100 text-green-700",
  "普通卖家": "bg-blue-100 text-blue-700",
  "疑似黄牛（已过滤）": "bg-red-100 text-red-500 line-through",
};

const POSITION_STYLE: Record<string, string> = {
  史低: "bg-red-500 text-white animate-pulse",
  好价: "bg-green-500 text-white",
  正常: "bg-gray-200 text-gray-700",
  偏高: "bg-orange-200 text-orange-800",
};

export default function ProductCard({ product }: { product: Product }) {
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const label = product.seller_label || (product.seller_type === 2 ? "疑似黄牛（已过滤）" : "普通卖家");
  const goofishLink = getGoofishLink({ product_url: product.product_url, title: product.title, keyword: product.keyword });
  const isDirect = isDirectItemLink(product.product_url);
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
        "flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md",
        product.is_filtered ? "border-red-100 opacity-60" : isLowPrice ? "border-green-300 ring-1 ring-green-200" : "border-orange-100"
      )}
    >
      {/* 标签 + 价格：垂直居中对齐 */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className={clsx("type-badge rounded-full px-2.5 py-0.5", LABEL_STYLE[label] || "bg-gray-100")}>
            {label}
          </span>
          {product.spec_matched && product.spec_label && (
            <span className="type-badge rounded-full bg-blue-100 px-2.5 py-0.5 text-blue-700">
              {product.spec_label}
            </span>
          )}
          {product.spec_matched === false && (
            <span className="type-badge rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-500">
              未识别规格
            </span>
          )}
          {product.price_position && (
            <span className={clsx("type-badge rounded-full px-2.5 py-0.5", POSITION_STYLE[product.price_position])}>
              {product.price_position}
              {isLowPrice && " · 推荐关注"}
            </span>
          )}
        </div>
        {!product.is_filtered && (
          <div className="shrink-0 text-right leading-tight">
            <div className="type-price">¥{product.price}</div>
            {product.avg_price ? (
              <div className="type-caption text-gray-400">均价 ¥{Math.round(product.avg_price)}</div>
            ) : (
              <div className="type-caption text-transparent">—</div>
            )}
            <div className="type-caption">性价比分 {product.ai_score}</div>
          </div>
        )}
      </div>

      {/* 标题：固定最小高度，多卡对齐 */}
      <h3 className="type-card-title mb-3 min-h-[2.75rem] line-clamp-2">{product.title}</h3>

      {/* 属性区：固定高度，缺字段也占位 */}
      <div className="type-body mb-4 min-h-[4rem] space-y-1.5 text-gray-500">
        <div>成色: {product.quality || "—"}</div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-0.5">
            寿命: {Array.from({ length: product.life_level || 3 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            ))}
          </span>
          {product.service && <span className="text-green-600">✓ {product.service}</span>}
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-gray-400">信用: {product.seller_level || "未知"}</span>
            {product.seller_review_note && (
              <span className="type-badge rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                {product.seller_review_note}
              </span>
            )}
          </div>
          {!product.is_filtered && goofishLink && (
            <a
              href={goofishLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              去闲鱼下单
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {!product.is_filtered && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="type-caption text-gray-400">这条推荐有用吗？</span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={!!feedback || submitting}
                onClick={() => sendFeedback(true)}
                className={clsx(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition",
                  feedback === "helpful" ? "bg-green-100 text-green-700" : "hover:bg-gray-100 text-gray-600"
                )}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                有用
              </button>
              <button
                type="button"
                disabled={!!feedback || submitting}
                onClick={() => sendFeedback(false)}
                className={clsx(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition",
                  feedback === "not_helpful" ? "bg-red-100 text-red-600" : "hover:bg-gray-100 text-gray-600"
                )}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                无用
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
