import { NextRequest, NextResponse } from "next/server";
import { getQueueJob, getQueuePosition } from "@/lib/crawl-queue";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId") || "";
  if (!jobId) {
    return NextResponse.json({ error: "缺少 jobId" }, { status: 400 });
  }

  try {
    const job = await getQueueJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    const queuePosition = await getQueuePosition(job);

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      keyword: job.keyword,
      itemCount: job.item_count,
      queuePosition,
      createdAt: job.created_at,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
      error: job.error_message,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "查询失败" },
      { status: 500 }
    );
  }
}
