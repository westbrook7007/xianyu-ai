import SearchBox from "@/components/SearchBox";
import FeatureSection from "@/components/FeatureSection";
import HomeTrendSection from "@/components/HomeTrendSection";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="pb-2 pt-2 text-center">
        <p className="type-caption mb-1 text-brand-600">一期 MVP · 标品二手比价工具</p>
        <h1 className="type-hero mb-2">
          闲鱼<span className="text-brand-500">比价助手</span>
        </h1>
        <p className="type-subtitle mx-auto mb-4 max-w-2xl">
          面向闲鱼资深玩家与重度用户，高效筛选高性价比靠谱标品，以低风险买到心仪二手
        </p>
        <SearchBox />
      </section>

      <FeatureSection />

      <HomeTrendSection />
    </div>
  );
}
