"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";
import { addSearchKeyword } from "@/lib/search-history";
import { getHotSpecs } from "@/lib/spec-catalog";

export default function SearchBox({ defaultKeyword = "" }: { defaultKeyword?: string }) {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const router = useRouter();

  function goSearch(kw: string) {
    const trimmed = kw.trim();
    if (!trimmed) return;
    addSearchKeyword(trimmed);
    sessionStorage.setItem("search_keyword", trimmed);
    sessionStorage.removeItem("search_category");
    router.push(`/preferences?keyword=${encodeURIComponent(trimmed)}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    goSearch(keyword);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-2">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="输入标品款式，如 iPhone 15 Pro 256G、DJI Mini 4 Pro..."
          className="type-search w-full rounded-2xl border border-orange-200 bg-white py-3 pl-12 pr-36 shadow-sm outline-none ring-brand-400 focus:ring-2"
        />
        <button
          type="submit"
          className="type-body absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-brand-500 px-6 py-2.5 font-medium text-white transition hover:bg-brand-600"
        >
          开始比价
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
        <span className="type-caption shrink-0 text-gray-400">热门标品：</span>
        {getHotSpecs().map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goSearch(s.example)}
            className="type-caption inline-flex items-center rounded-full border border-orange-100 bg-white px-3 py-1 leading-none text-brand-600 hover:bg-orange-50"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
