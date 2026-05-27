"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import type { Product, SortMode } from "@/lib/types";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "ai_score", label: "AI综合分" },
  { value: "price_low", label: "价格最低" },
  { value: "quality_best", label: "成色最优" },
  { value: "life_longest", label: "寿命最长" },
  { value: "value", label: "性价比最高" },
];

function ResultsContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [sort, setSort] = useState<SortMode>("ai_score");
  const [hideFiltered, setHideFiltered] = useState(true);
  const [personalOnly, setPersonalOnly] = useState(false);
  const [withService, setWithService] = useState(false);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<string>("");

  useEffect(() => {
    loadProducts();
  }, [keyword, sort, hideFiltered, personalOnly, withService]);

  async function loadProducts() {
    setLoading(true);
    const kw = keyword || sessionStorage.getItem("last_keyword") || "";

    // 优先显示刚爬取到的缓存（真实数据）
    const cached = sessionStorage.getItem("last_products");
    const cachedKw = sessionStorage.getItem("last_keyword") || "";
    if (cached && kw && cachedKw.toLowerCase() === kw.toLowerCase()) {
      setProducts(JSON.parse(cached));
      setDemo(sessionStorage.getItem("last_crawl_status") === "demo");
      setCrawlStatus(sessionStorage.getItem("last_crawl_status") || "");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({
      keyword: kw,
      sort,
      hideFiltered: String(hideFiltered),
      personalOnly: String(personalOnly),
      withService: String(withService),
    });
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setDemo(data.demo);
    setCrawlStatus("");
    setLoading(false);
  }

  const kw = keyword || (typeof window !== "undefined" ? sessionStorage.getItem("last_keyword") : "") || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">选品结果</h1>
          <p className="text-gray-500">
            关键词: {kw || "—"}
            {demo && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">演示数据</span>}
          </p>
        </div>
        {kw && (
          <Link href={`/trend/${encodeURIComponent(kw)}`} className="text-brand-600 hover:underline">
            查看价格走势 →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-orange-100 bg-white p-4">
        <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>排序: {o.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hideFiltered} onChange={(e) => setHideFiltered(e.target.checked)} />
          隐藏已过滤黄牛
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={personalOnly} onChange={(e) => setPersonalOnly(e.target.checked)} />
          仅个人卖家
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withService} onChange={(e) => setWithService(e.target.checked)} />
          带增值服务
        </label>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">加载中...</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">暂无商品数据</p>
          <p className="mt-2 text-sm text-gray-400">
            登录闲鱼后不会自动爬取，需要回首页重新搜索并点「启动爬取」
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/" className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600">
              回首页重新搜索
            </Link>
            {kw && (
              <Link href={`/preferences?keyword=${encodeURIComponent(kw)}`} className="rounded-lg border border-brand-300 px-4 py-2 text-sm text-brand-600 hover:bg-orange-50">
                重新爬取「{kw}」
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((p) => (
            <ProductCard key={p.product_url || p.id} product={p} />
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
