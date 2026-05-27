"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PreferenceForm from "@/components/PreferenceForm";
import { getUserId, loadPreferenceTemplate, savePreferenceTemplate } from "@/lib/user";
import type { UserPreference } from "@/lib/types";

function PreferencesContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || sessionStorage.getItem("search_keyword") || "";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<Partial<UserPreference>>({});

  useEffect(() => {
    const tpl = loadPreferenceTemplate<Partial<UserPreference>>();
    if (tpl) setInitial(tpl);
  }, []);

  async function handleSubmit(pref: UserPreference) {
    const userId = getUserId();
    pref.user_id = userId;
    pref.keyword = keyword;
    setLoading(true);

    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pref),
      });
      savePreferenceTemplate(pref);
      sessionStorage.setItem("current_preference", JSON.stringify(pref));

      const crawlRes = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, userId, preference: pref, triggerType: "manual" }),
      });
      const crawlData = await crawlRes.json();

      if (!crawlRes.ok || crawlData.error) {
        alert(
          crawlData.error ||
            "爬取失败。若刚登录闲鱼，请确认已用「登录闲鱼.bat」扫码登录，然后重试。"
        );
        return;
      }

      const products = crawlData.products || [];
      if (products.length === 0) {
        alert(
          "爬取完成但没有找到商品。\n可能原因：关键词太偏、尚未登录闲鱼、或页面结构变化。\n建议：先运行「登录闲鱼.bat」扫码登录，再换常见关键词如 iPhone 15 Pro 重试。"
        );
        return;
      }

      sessionStorage.setItem("last_products", JSON.stringify(products));
      sessionStorage.setItem("last_keyword", keyword);
      sessionStorage.setItem("last_crawl_status", crawlData.status || "success");

      router.push(`/results?keyword=${encodeURIComponent(keyword)}`);
    } catch (e) {
      alert("爬取失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (!keyword) {
    return (
      <div className="py-12 text-center text-gray-500">
        请先从首页输入商品关键词
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PreferenceForm keyword={keyword} initial={{ ...initial, user_id: getUserId() }} onSubmit={handleSubmit} loading={loading} />
      {loading && (
        <p className="mt-4 text-center text-sm text-gray-500">
          正在爬取 20-30 条当日新品，每条间隔 ≥30 秒，预计需要 15-30 分钟（演示模式即时返回）
        </p>
      )}
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">加载中...</div>}>
      <PreferencesContent />
    </Suspense>
  );
}
