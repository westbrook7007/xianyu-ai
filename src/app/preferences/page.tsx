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
import type { Category, UserPreference } from "@/lib/types";

function PreferencesContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || sessionStorage.getItem("search_keyword") || "";
  const categoryParam = (searchParams.get("category") || sessionStorage.getItem("search_category") || "") as Category | "";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [queueJobId, setQueueJobId] = useState<string | null>(null);
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
        setLoading(false);
        return;
      }

      addSearchKeyword(keyword);

      // 邮件后台模式（本机直连爬虫）
      if (crawlData.status === "queued" && background && !crawlData.jobId) {
        alert(
          `爬取已在后台进行。\n完成后将发送邮件至：${notify.email.trim()}\n您可以关闭此页面，稍后在邮件中查看结果。`
        );
        setLoading(false);
        router.push("/");
        return;
      }

      // 远程队列模式：轮询任务状态
      if (crawlData.status === "queued" && crawlData.jobId) {
        setQueueJobId(crawlData.jobId);
        return;
      }

      const products = crawlData.products || [];
      if (products.length === 0) {
        sessionStorage.setItem("last_products", "[]");
        sessionStorage.setItem("last_keyword", keyword);
        sessionStorage.setItem("last_crawl_status", crawlData.status || "empty");
        setLoading(false);
        router.push(`/results?keyword=${encodeURIComponent(keyword)}`);
        return;
      }

      sessionStorage.setItem("last_products", JSON.stringify(products));
      sessionStorage.setItem("last_keyword", keyword);
      sessionStorage.setItem("last_crawl_status", crawlData.status || "success");

      if (crawlData.emailSent === false && useEmail) {
        alert(`爬取成功，但邮件发送失败：${crawlData.emailError || "请检查 SMTP 配置"}`);
      }

      setLoading(false);
      router.push(`/results?keyword=${encodeURIComponent(keyword)}`);
    } catch {
      alert("爬取失败，请重试");
      setLoading(false);
      setQueueJobId(null);
    }
  }

  function handleQueueComplete(kw: string) {
    setLoading(false);
    setQueueJobId(null);
    sessionStorage.removeItem("last_products");
    sessionStorage.setItem("last_keyword", kw);
    sessionStorage.setItem("last_crawl_status", "success");
    router.push(`/results?keyword=${encodeURIComponent(kw)}`);
  }

  function handleQueueFailed(error: string) {
    setLoading(false);
    setQueueJobId(null);
    alert(error || "远程爬取失败，请确认运营者电脑已运行爬虫与 Worker");
  }

  if (!keyword) {
    return (
      <div className="type-subtitle py-12 text-center">
        请先从首页输入商品关键词
      </div>
    );
  }

  const showProgress =
    (loading && !(notify.enabled && notify.backgroundNotify)) || !!queueJobId;

  return (
    <>
      <CrawlProgress
        keyword={keyword}
        active={showProgress}
        jobId={queueJobId || undefined}
        onComplete={handleQueueComplete}
        onFailed={handleQueueFailed}
      />
      <div className="mx-auto max-w-2xl">
        <NotifySettingsCard
          settings={notify}
          onChange={handleNotifyChange}
          emailConfigured={emailConfigured}
        />
        <PreferenceForm
          keyword={keyword}
          defaultCategory={categoryParam || undefined}
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
