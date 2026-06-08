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

const QUEUE_LABELS: Record<string, string> = {
  pending: "排队中，等待本机电脑接单",
  running: "运营者电脑正在爬取闲鱼",
  done: "爬取完成，正在加载结果",
  failed: "爬取失败",
};

interface Props {
  keyword: string;
  active: boolean;
  jobId?: string;
  onComplete?: (keyword: string) => void;
  onFailed?: (error: string) => void;
}

export default function CrawlProgress({ keyword, active, jobId, onComplete, onFailed }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const [queueStatus, setQueueStatus] = useState<string>("");
  const [queuePosition, setQueuePosition] = useState(0);
  const queueMode = !!jobId;

  useEffect(() => {
    if (!active || !queueMode || !jobId) return;

    const start = Date.now();
    const maxMs = 15 * 60 * 1000;

    const poll = async () => {
      try {
        const res = await fetch(`/api/crawl/queue?jobId=${encodeURIComponent(jobId)}`);
        const data = await res.json();
        if (!res.ok) return;

        setQueueStatus(data.status || "");
        setQueuePosition(data.queuePosition || 0);

        if (data.status === "done") {
          onComplete?.(data.keyword || keyword);
          return true;
        }
        if (data.status === "failed") {
          onFailed?.(data.error || "爬取失败");
          return true;
        }
      } catch {
        /* retry */
      }

      if (Date.now() - start > maxMs) {
        onFailed?.("等待超时，请确认运营者电脑已开机并运行爬虫与 Worker");
        return true;
      }
      return false;
    };

    const tick = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(tick);
    }, 5000);

    poll();
    return () => clearInterval(tick);
  }, [active, jobId, keyword, onComplete, onFailed, queueMode]);

  useEffect(() => {
    if (!active || queueMode) {
      if (!active) {
        setStepIndex(0);
        setPercent(0);
        setQueueStatus("");
        setQueuePosition(0);
      }
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
  }, [active, keyword, queueMode]);

  useEffect(() => {
    if (!active || !queueMode) return;
    if (queueStatus === "pending") setPercent(Math.min(30, 10 + queuePosition * 5));
    else if (queueStatus === "running") setPercent(65);
    else if (queueStatus === "done") setPercent(100);
  }, [active, queueMode, queueStatus, queuePosition]);

  if (!active) return null;

  const statusText = queueMode
    ? QUEUE_LABELS[queueStatus] || "已提交，等待处理"
    : STEPS[stepIndex]?.label;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-brand-600">
            <Radar className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <p className="type-caption">{queueMode ? "远程爬取" : "正在爬取"}</p>
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

        {queueMode ? (
          <div className="type-body space-y-2 rounded-lg bg-orange-50 px-4 py-3 text-brand-800">
            <p className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {statusText}
            </p>
            {queueStatus === "pending" && queuePosition > 0 && (
              <p className="type-caption">当前队列位置：第 {queuePosition} 位</p>
            )}
          </div>
        ) : (
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
        )}

        <p className="type-caption mt-4 text-center">
          {queueMode
            ? "请保持运营者电脑开机，并运行爬虫 + 队列 Worker"
            : "首次爬取约 40–90 秒，请勿关闭爬虫窗口与弹出的 Chrome"}
        </p>
      </div>
    </div>
  );
}
