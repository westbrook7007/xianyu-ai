/** 爬虫执行监控（PRD 埋点：执行时间、成功率） */

export type CrawlMetricEntry = {
  keyword: string;
  status: "success" | "demo" | "empty" | "error";
  durationMs: number;
  itemCount: number;
  timestamp: string;
  error?: string;
};

const MAX_ENTRIES = 50;
const metrics: CrawlMetricEntry[] = [];

export function recordCrawlMetric(entry: Omit<CrawlMetricEntry, "timestamp">) {
  metrics.unshift({ ...entry, timestamp: new Date().toISOString() });
  if (metrics.length > MAX_ENTRIES) metrics.pop();
}

export function getCrawlMetrics() {
  const total = metrics.length;
  const success = metrics.filter((m) => m.status === "success" || m.status === "demo").length;
  const avgDuration =
    total > 0 ? Math.round(metrics.reduce((s, m) => s + m.durationMs, 0) / total) : 0;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

  return {
    summary: { total, success, successRate, avgDurationMs: avgDuration },
    recent: metrics.slice(0, 10),
  };
}
