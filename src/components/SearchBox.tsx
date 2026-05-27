"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export default function SearchBox({ defaultKeyword = "" }: { defaultKeyword?: string }) {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    sessionStorage.setItem("search_keyword", keyword.trim());
    router.push(`/preferences?keyword=${encodeURIComponent(keyword.trim())}`);
  }

  return (
    <form onSubmit={handleSearch} className="relative mx-auto max-w-2xl">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="输入商品关键词，如 iPhone 15 Pro、DJI Mini 4 Pro..."
        className="w-full rounded-2xl border border-orange-200 bg-white py-4 pl-12 pr-36 text-lg shadow-sm outline-none ring-brand-400 focus:ring-2"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-brand-500 px-6 py-2.5 font-medium text-white transition hover:bg-brand-600"
      >
        开始选品
      </button>
    </form>
  );
}
