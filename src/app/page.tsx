import SearchBox from "@/components/SearchBox";
import FeatureSection from "@/components/FeatureSection";
import Link from "next/link";
import { HOT_KEYWORDS } from "@/lib/mock-data";
import { TrendingDown, TrendingUp } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="py-8 text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          闲鱼<span className="text-brand-500">AI</span>智能比价选品
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-gray-500">
          避黄牛 · 个性化匹配 · 价格监控 · 定时提醒 — 零成本开源，免费部署
        </p>
        <SearchBox />
      </section>

      <FeatureSection />

      <section>
        <h2 className="mb-4 text-xl font-semibold">热门商品价格趋势</h2>
        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-orange-50 bg-orange-50/50">
              <tr>
                <th className="px-4 py-3 font-medium">商品</th>
                <th className="px-4 py-3 font-medium">30日均价</th>
                <th className="px-4 py-3 font-medium">趋势</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {HOT_KEYWORDS.map((item) => (
                <tr key={item.keyword} className="border-b border-gray-50 hover:bg-orange-50/30">
                  <td className="px-4 py-3 font-medium">{item.keyword}</td>
                  <td className="px-4 py-3">¥{item.avg_price}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 ${item.trend < 0 ? "text-green-600" : "text-red-500"}`}>
                      {item.trend < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      {item.trend > 0 ? "+" : ""}{item.trend}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/trend/${encodeURIComponent(item.keyword)}`} className="text-brand-600 hover:underline">
                      查看走势 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
