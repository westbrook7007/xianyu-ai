"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import type { Product, SortMode } from "@/lib/types";
import { applyProductView } from "@/lib/filter-products";
import { getUserId } from "@/lib/user";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "ai_score", label: "性价比分" },
  { value: "price_low", label: "价格最低" },
  { value: "quality_best", label: "成色最优" },
  { value: "life_longest", label: "寿命最长" },
  { value: "value", label: "性价比最高" },
];

function productKey(p: Product, index: number): string {
  return p.product_url?.match(/id=(\d+)/)?.[1] || String(p.id || index);
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [sort, setSort] = useState<SortMode>("ai_score");
  const [hideFiltered, setHideFiltered] = useState(true);
  const [personalOnly, setPersonalOnly] = useState(false);
  const [withService, setWithService] = useState(false);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<string>("");

  const products = applyProductView(rawProducts, {
    sort,
    hideFiltered,
    personalOnly,
    withService,
  });

  useEffect(() => {
    loadProducts();
  }, [keyword]);

  async function loadProducts() {
    setLoading(true);
    const kw = keyword || sessionStorage.getItem("last_keyword") || "";

    const cached = sessionStorage.getItem("last_products");
    const cachedKw = sessionStorage.getItem("last_keyword") || "";
    if (cached && kw && cachedKw.toLowerCase() === kw.toLowerCase()) {
      setRawProducts(JSON.parse(cached) as Product[]);
      setDemo(sessionStorage.getItem("last_crawl_status") === "demo");
      setCrawlStatus(sessionStorage.getItem("last_crawl_status") || "");
      setLoading(false);
      return;
    }

    if (kw) {
      const cacheRes = await fetch(
        `/api/crawl/results?userId=${encodeURIComponent(getUserId())}&keyword=${encodeURIComponent(kw)}`
      );
      const cacheData = await cacheRes.json();
      if (cacheData.products?.length) {
        setRawProducts(cacheData.products);
        setDemo(cacheData.status === "demo");
        setCrawlStatus(cacheData.status || "");
        sessionStorage.setItem("last_products", JSON.stringify(cacheData.products));
        sessionStorage.setItem("last_keyword", kw);
        setLoading(false);
        return;
      }
    }

    const params = new URLSearchParams({
      keyword: kw,
      sort: "ai_score",
      hideFiltered: "false",
      personalOnly: "false",
      withService: "false",
    });
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setRawProducts(data.products || []);
    setDemo(data.demo);
    setCrawlStatus("");
    setLoading(false);
  }

  const kw = keyword || (typeof window !== "undefined" ? sessionStorage.getItem("last_keyword") : "") || "";
  const isEmpty = !loading && products.length === 0;

  if (isEmpty) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <p className="type-page-title text-center text-gray-600">
          小助手没有找到你想要的宝贝
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="text-lg font-bold text-gray-900">比价结果</h1>
          <span className="text-sm text-gray-500">
            {kw || "—"}
            {products.length > 0 && <span className="text-gray-400"> · {products.length} 条</span>}
          </span>
          {demo && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">演示</span>}
        </div>
        {kw && (
          <Link href={`/trend/${encodeURIComponent(kw)}`} className="text-sm text-brand-600 hover:underline">
            价格走势 →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="rounded border border-gray-200 px-2 py-1 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>排序: {o.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-gray-600">
          <input type="checkbox" checked={hideFiltered} onChange={(e) => setHideFiltered(e.target.checked)} />
          隐藏黄牛
        </label>
        <label className="flex items-center gap-1.5 text-gray-600">
          <input type="checkbox" checked={personalOnly} onChange={(e) => setPersonalOnly(e.target.checked)} />
          仅个人
        </label>
        <label className="flex items-center gap-1.5 text-gray-600">
          <input type="checkbox" checked={withService} onChange={(e) => setWithService(e.target.checked)} />
          带服务
        </label>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-gray-400">加载中...</div>
      ) : (
        <div className="grid items-stretch gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <ProductCard key={productKey(p, i)} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">加载中...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
