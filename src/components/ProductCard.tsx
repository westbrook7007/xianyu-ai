"use client";

import type { Product } from "@/lib/types";
import { ExternalLink, Star } from "lucide-react";
import clsx from "clsx";
import { getGoofishLink, isDirectItemLink } from "@/lib/goofish-url";

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
  const label = product.seller_label || (product.seller_type === 2 ? "疑似黄牛（已过滤）" : "普通卖家");
  const goofishLink = getGoofishLink({ product_url: product.product_url, title: product.title, keyword: product.keyword });
  const isDirect = isDirectItemLink(product.product_url);

  return (
    <div
      className={clsx(
        "rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md",
        product.is_filtered ? "border-red-100 opacity-60" : "border-orange-100"
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className={clsx("type-badge rounded-full px-2.5 py-0.5", LABEL_STYLE[label] || "bg-gray-100")}>
            {label}
          </span>
          {product.price_position && (
            <span className={clsx("type-badge rounded-full px-2.5 py-0.5", POSITION_STYLE[product.price_position])}>
              {product.price_position}
            </span>
          )}
        </div>
        {!product.is_filtered && (
          <div className="text-right">
            <div className="type-price">¥{product.price}</div>
            <div className="type-caption">AI适配分 {product.ai_score}</div>
          </div>
        )}
      </div>

      <h3 className="type-card-title mb-2 line-clamp-2">{product.title}</h3>

      <div className="type-body mb-3 flex flex-wrap gap-3 text-gray-500">
        {product.quality && <span>成色: {product.quality}</span>}
        <span className="flex items-center gap-0.5">
          寿命: {Array.from({ length: product.life_level || 3 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ))}
        </span>
        {product.service && <span className="text-green-600">✓ {product.service}</span>}
      </div>

      <div className="type-body flex items-center justify-between">
        <span className="text-gray-400">信用: {product.seller_level || "未知"}</span>
        {!product.is_filtered && goofishLink && (
          <a
            href={goofishLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-brand-600 hover:underline"
          >
            {isDirect ? "查看闲鱼" : "闲鱼搜索"}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
