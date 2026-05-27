"use client";

import {
  QUALITY_OPTIONS,
  LIFE_OPTIONS,
  SERVICE_OPTIONS,
  SELLER_OPTIONS,
  CATEGORY_OPTIONS,
} from "@/lib/config";
import type { UserPreference } from "@/lib/types";

interface Props {
  keyword: string;
  initial?: Partial<UserPreference>;
  onSubmit: (pref: UserPreference) => void;
  loading?: boolean;
}

export default function PreferenceForm({ keyword, initial, onSubmit, loading }: Props) {
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
      category: fd.get("category") as UserPreference["category"],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">个性化偏好问卷</h2>
        <p className="text-sm text-gray-500">关键词: <strong>{keyword}</strong></p>
      </div>

      <fieldset>
        <legend className="mb-2 font-medium">成色容忍度</legend>
        <div className="space-y-2">
          {QUALITY_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-orange-50">
              <input type="radio" name="quality_limit" value={o.value} defaultChecked={initial?.quality_limit === o.value || o.value === "light_wear"} className="mt-1" />
              <div>
                <div className="font-medium">{o.label}</div>
                <div className="text-sm text-gray-500">{o.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium">剩余使用寿命优先级</legend>
        <div className="flex flex-wrap gap-2">
          {LIFE_OPTIONS.map((o) => (
            <label key={o.value} className="cursor-pointer">
              <input type="radio" name="life_priority" value={o.value} defaultChecked={initial?.life_priority === o.value || o.value === "balanced"} className="peer sr-only" />
              <span className="block rounded-full border border-gray-200 px-4 py-2 text-sm peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700">
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium">增值服务需求（数码类）</legend>
        <select name="service_demand" defaultValue={initial?.service_demand || "preferred"} className="w-full rounded-lg border border-gray-200 p-3">
          {SERVICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block font-medium">心理最高价 (¥)</label>
          <input type="number" name="max_price" defaultValue={initial?.max_price || ""} placeholder="如 6500" className="w-full rounded-lg border border-gray-200 p-3" />
        </div>
        <div>
          <label className="mb-1 block font-medium">商品类目</label>
          <select name="category" defaultValue={initial?.category || "digital"} className="w-full rounded-lg border border-gray-200 p-3">
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="accept_premium" defaultChecked={initial?.accept_premium} />
        <span className="text-sm">可接受高于均价小幅溢价（优质成色/带服务）</span>
      </label>

      <fieldset>
        <legend className="mb-2 font-medium">卖家筛选偏好</legend>
        <select name="seller_preference" defaultValue={initial?.seller_preference || "excellent_only"} className="w-full rounded-lg border border-gray-200 p-3">
          {SELLER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand-500 py-3 font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
      >
        {loading ? "爬取中，请稍候..." : "保存偏好并启动爬取"}
      </button>
    </form>
  );
}
