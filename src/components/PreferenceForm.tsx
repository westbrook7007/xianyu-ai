"use client";

import { useState } from "react";
import {
  QUALITY_OPTIONS,
  LIFE_OPTIONS,
  SELLER_OPTIONS,
  CATEGORY_OPTIONS,
  SERVICE_HINTS,
  SERVICE_OPTIONS_BY_CATEGORY,
} from "@/lib/config";
import { detectCategoryFromKeyword, matchSpec } from "@/lib/spec-catalog";
import type { Category, UserPreference } from "@/lib/types";

interface Props {
  keyword: string;
  initial?: Partial<UserPreference>;
  defaultCategory?: Category;
  onSubmit: (pref: UserPreference) => void;
  loading?: boolean;
}

export default function PreferenceForm({
  keyword,
  initial,
  defaultCategory,
  onSubmit,
  loading,
}: Props) {
  const [category, setCategory] = useState<Category>(
    initial?.category || defaultCategory || detectCategoryFromKeyword(keyword)
  );

  const specMatch = matchSpec(keyword, category);
  const serviceOptions = SERVICE_OPTIONS_BY_CATEGORY[category] || SERVICE_OPTIONS_BY_CATEGORY.phone;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      user_id: initial?.user_id || "",
      keyword,
      quality_limit: fd.get("quality_limit") as UserPreference["quality_limit"],
      life_priority: fd.get("life_priority") as UserPreference["life_priority"],
      service_demand: fd.get("service_demand") as UserPreference["service_demand"],
      max_price: parseFloat(fd.get("max_price") as string) || undefined,
      accept_premium: fd.get("accept_premium") === "on",
      seller_preference: fd.get("seller_preference") as UserPreference["seller_preference"],
      category,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="type-section-title">比价倾向设置</h2>
        <p className="type-subtitle">
          款式: <strong>{keyword}</strong>
          {specMatch.matched ? (
            <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
              已匹配规格: {specMatch.specLabel}
            </span>
          ) : (
            <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              未匹配标准规格，将按关键词搜索
            </span>
          )}
        </p>
      </div>

      <fieldset>
        <legend className="type-label mb-2">标品类目</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((o) => (
            <label key={o.value} className="cursor-pointer">
              <input
                type="radio"
                name="category_pick"
                value={o.value}
                checked={category === o.value}
                onChange={() => setCategory(o.value as Category)}
                className="peer sr-only"
              />
              <span className="type-body block rounded-full border border-gray-200 px-4 py-2 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700">
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-label mb-2">成色容忍度</legend>
        <div className="space-y-2">
          {QUALITY_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-orange-50">
              <input type="radio" name="quality_limit" value={o.value} defaultChecked={initial?.quality_limit === o.value || o.value === "light_wear"} className="mt-1" />
              <div>
                <div className="type-label">{o.label}</div>
                <div className="type-caption">{o.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-label mb-2">剩余使用寿命优先级</legend>
        <div className="flex flex-wrap gap-2">
          {LIFE_OPTIONS.map((o) => (
            <label key={o.value} className="cursor-pointer">
              <input type="radio" name="life_priority" value={o.value} defaultChecked={initial?.life_priority === o.value || o.value === "balanced"} className="peer sr-only" />
              <span className="type-body block rounded-full border border-gray-200 px-4 py-2 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700">
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-label mb-2">增值服务需求</legend>
        <p className="type-caption mb-2 text-gray-500">{SERVICE_HINTS[category]}</p>
        <select name="service_demand" defaultValue={initial?.service_demand || "preferred"} className="type-input w-full rounded-lg border border-gray-200 p-3">
          {serviceOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </fieldset>

      <div>
        <label className="type-label mb-1 block">心理最高价 (¥)</label>
        <input type="number" name="max_price" defaultValue={initial?.max_price || ""} placeholder="如 6500" className="type-input w-full rounded-lg border border-gray-200 p-3" />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="accept_premium" defaultChecked={initial?.accept_premium} />
        <span className="type-body">可接受高于均价小幅溢价（优质成色/带服务）</span>
      </label>

      <fieldset>
        <legend className="type-label mb-2">卖家筛选偏好</legend>
        <select name="seller_preference" defaultValue={initial?.seller_preference || "excellent_only"} className="type-input w-full rounded-lg border border-gray-200 p-3">
          {SELLER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="type-body w-full rounded-xl bg-brand-500 py-3 font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
      >
        {loading ? "查询中，请稍候..." : "开始比价查询"}
      </button>
    </form>
  );
}
