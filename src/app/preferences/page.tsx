"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PreferenceForm from "@/components/PreferenceForm";
import CrawlProgress from "@/components/CrawlProgress";
import NotifySettingsCard from "@/components/NotifySettingsCard";
import {
  getUserId,
  loadPreferenceTemplate,
  loadNotifySettings,
  saveNotifySettings,
  savePreferenceTemplate,
} from "@/lib/user";
import { addSearchKeyword } from "@/lib/search-history";
import type { UserPreference } from "@/lib/types";

function PreferencesContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || sessionStorage.getItem("search_keyword") || "";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<Partial<UserPreference>>({});
  const [notify, setNotify] = useState(loadNotifySettings());
  const [emailConfigured, setEmailConfigured] = useState<boolean | undefined>();

  useEffect(() => {
    const tpl = loadPreferenceTemplate<Partial<UserPreference>>();
    if (tpl) setInitial(tpl);
    fetch("/api/crawl")
      .then((r) => r.json())
      .then((d) => setEmailConfigured(d.emailConfigured));
  }, []);

  function handleNotifyChange(next: typeof notify) {
    setNotify(next);
    saveNotifySettings(next);
  }

  async function handleSubmit(pref: UserPreference) {
    const userId = getUserId();
    pref.user_id = userId;
    pref.keyword = keyword;

    const useEmail = notify.enabled && notify.email.trim();
    const background = useEmail && notify.backgroundNotify;

    if (useEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notify.email.trim())) {
      alert("请填写有效的通知邮箱");
      return;
    }

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
        body: JSON.stringify({
          keyword,
          userId,
          preference: pref,
          triggerType: "manual",
          notifyEmail: useEmail ? notify.email.trim() : undefined,
          backgroundNotify: background,
        }),
      });
      const crawlData = await crawlRes.json();

      if (!crawlRes.ok || crawlData.error) {
        alert(
          crawlData.error ||
            "爬取失败。若刚登录闲鱼，请确认已用「登录闲鱼.bat」扫码登录，然后重试。"
        );
        return;
      }

      addSearchKeyword(keyword);

      // 后台模式：立即提示并返回首页
      if (crawlData.status === "queued") {
        alert(
          `爬取已在后台进行。\n完成后将发送邮件至：${notify.email.trim()}\n您可以关闭此页面，稍后在邮件中查看结果。`
        );
        router.push("/");
        return;
      }

      const products = crawlData.products || [];
      if (products.length === 0) {
        alert(
          "爬取完成但没有找到商品。\n可能原因：关键词太偏、尚未登录闲鱼、或页面结构变化。\n建议：先运行「登录闲鱼.bat」扫码登录，再换常见关键词重试。"
        );
        return;
      }

      sessionStorage.setItem("last_products", JSON.stringify(products));
      sessionStorage.setItem("last_keyword", keyword);
      sessionStorage.setItem("last_crawl_status", crawlData.status || "success");

      if (crawlData.emailSent === false && useEmail) {
        alert(`爬取成功，但邮件发送失败：${crawlData.emailError || "请检查 SMTP 配置"}`);
      }

      router.push(`/results?keyword=${encodeURIComponent(keyword)}`);
    } catch {
      alert("爬取失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (!keyword) {
    return (
      <div className="type-subtitle py-12 text-center">
        请先从首页输入商品关键词
      </div>
    );
  }

  const showProgress = loading && !(notify.enabled && notify.backgroundNotify);

  return (
    <>
      <CrawlProgress keyword={keyword} active={showProgress} />
      <div className="mx-auto max-w-2xl">
        <NotifySettingsCard
          settings={notify}
          onChange={handleNotifyChange}
          emailConfigured={emailConfigured}
        />
        <PreferenceForm
          keyword={keyword}
          initial={{ ...initial, user_id: getUserId() }}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">加载中...</div>}>
      <PreferencesContent />
    </Suspense>
  );
}
