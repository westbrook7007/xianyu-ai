import SearchBox from "@/components/SearchBox";
import FeatureSection from "@/components/FeatureSection";
import HomeTrendSection from "@/components/HomeTrendSection";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="py-8 text-center">
        <h1 className="type-hero mb-3">
          闲鱼<span className="text-brand-500">AI</span>智能比价选品
        </h1>
        <p className="type-subtitle mx-auto mb-8 max-w-xl">
          避黄牛 · 个性化匹配 · 价格监控 · 定时提醒 — 零成本开源，免费部署
        </p>
        <SearchBox />
      </section>

      <FeatureSection />

      <HomeTrendSection />
    </div>
  );
}
