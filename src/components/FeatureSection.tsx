import { Shield, Sparkles, TrendingDown, Clock } from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "避黄牛",
    desc: "知识库规则引擎，自动识别个人卖家与黄牛商家",
  },
  {
    icon: Sparkles,
    title: "AI个性化匹配",
    desc: "根据成色、寿命、增值服务偏好智能评分排序",
  },
  {
    icon: TrendingDown,
    title: "价格监控",
    desc: "7/30日价格波动可视化，识别好价与史低",
  },
  {
    icon: Clock,
    title: "定时任务",
    desc: "每日自动爬取20-30条新品，低价自动提醒",
  },
];

export default function FeatureSection() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f) => (
        <div
          key={f.title}
          className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <f.icon className="mb-3 h-8 w-8 text-brand-500" />
          <h3 className="font-semibold text-gray-900">{f.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
        </div>
      ))}
    </section>
  );
}
