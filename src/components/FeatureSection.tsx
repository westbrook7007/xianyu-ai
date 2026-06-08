import { Shield, Zap, TrendingDown, Mail } from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "干掉黄牛信息差",
    desc: "自动识别个人卖家与黄牛，过滤不靠谱货源，降低踩坑风险",
  },
  {
    icon: Zap,
    title: "标品快速比价",
    desc: "手机 / 无人机 / 球星签名鞋，15 分钟决策压缩到几分钟",
  },
  {
    icon: TrendingDown,
    title: "低价好价提醒",
    desc: "识别史低与好价区间，推送相对低价商品，辅助下单决策",
  },
  {
    icon: Mail,
    title: "双通道通知",
    desc: "即时页面返回结果，或关闭页面后邮件异步通知",
  },
];

export default function FeatureSection() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f) => (
        <div
          key={f.title}
          className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <f.icon className="mb-2 h-7 w-7 text-brand-500" />
          <h3 className="type-card-title">{f.title}</h3>
          <p className="type-caption mt-0.5 leading-snug">{f.desc}</p>
        </div>
      ))}
    </section>
  );
}
