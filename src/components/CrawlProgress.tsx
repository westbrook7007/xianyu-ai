"use client";

import { useEffect, useState } from "react";
import { Loader2, Radar } from "lucide-react";
import clsx from "clsx";

const STEPS = [
  { id: 1, label: "连接本地爬虫服务", durationMs: 2000 },
  { id: 2, label: "打开闲鱼搜索页", durationMs: 4000 },
  { id: 3, label: "滚动加载商品列表", durationMs: 8000 },
  { id: 4, label: "解析价格与卖家信息", durationMs: 12000 },
  { id: 5, label: "AI 智能评分与排序", durationMs: 16000 },
];

interface Props {
  keyword: string;
  active: boolean;
}

export default function CrawlProgress({ keyword, active }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      setPercent(0);
      return;
    }

    setStepIndex(0);
    setPercent(5);

    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      let idx = 0;
      let acc = 0;
      for (let i = 0; i < STEPS.length; i++) {
        acc += STEPS[i].durationMs;
        if (elapsed >= acc) idx = Math.min(i + 1, STEPS.length - 1);
        else break;
      }
      setStepIndex(idx);
      setPercent(Math.min(92, 5 + Math.floor((elapsed / 45000) * 87)));
    }, 400);

    return () => clearInterval(tick);
  }, [active, keyword]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-brand-600">
            <Radar className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <p className="type-caption">正在爬取</p>
            <p className="type-card-title">{keyword}</p>
          </div>
        </div>

        <div className="mb-2 h-2 overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="type-caption mb-5 text-right font-medium text-brand-600">{percent}%</p>

        <ul className="space-y-2">
          {STEPS.map((step, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            return (
              <li
                key={step.id}
                className={clsx(
                  "type-body flex items-center gap-2 rounded-lg px-3 py-2 transition",
                  current && "bg-orange-50 text-brand-700",
                  done && "text-gray-400",
                  !done && !current && "text-gray-500"
                )}
              >
                {current ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500" />
                ) : (
                  <span
                    className={clsx(
                      "type-badge flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                      done ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                )}
                {step.label}
              </li>
            );
          })}
        </ul>

        <p className="type-caption mt-4 text-center">
          首次爬取约 40–90 秒，请勿关闭爬虫窗口与弹出的 Chrome
        </p>
      </div>
    </div>
  );
}
