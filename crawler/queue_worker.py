"""本机队列 Worker：从 Supabase 拉取任务 → 调本地爬虫 → 回调 Vercel/本机 API"""

import os
import time
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from utils_io import setup_utf8_console, safe_print

setup_utf8_console()

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")
load_dotenv(Path(__file__).resolve().parent / ".env")

import requests
import yaml
from supabase import create_client

WORKER_ID = os.getenv("WORKER_ID", f"worker-{uuid.uuid4().hex[:8]}")
POLL_SECONDS = int(os.getenv("QUEUE_POLL_SECONDS", "30"))


def load_config():
    with open(Path(__file__).parent / "config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_env():
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    secret = os.getenv("CRAWL_API_SECRET")
    crawler = os.getenv("CRAWLER_ENDPOINT", "http://127.0.0.1:8080/crawl")
    callback = os.getenv(
        "WORKER_CALLBACK_URL",
        (os.getenv("NEXT_PUBLIC_APP_URL") or "http://localhost:3000").rstrip("/")
        + "/api/crawl/worker",
    )
    if not url or not key:
        raise RuntimeError("请在 .env.local 配置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY")
    if not secret:
        raise RuntimeError("请在 .env.local 配置 CRAWL_API_SECRET")
    return url, key, secret, crawler, callback


def health_check(crawler_url: str) -> bool:
    base = crawler_url.rsplit("/crawl", 1)[0]
    try:
        r = requests.get(f"{base}/health", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def claim_job(sb):
    pending = (
        sb.table("crawl_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(1)
        .execute()
    )
    if not pending.data:
        return None

    job = pending.data[0]
    updated = (
        sb.table("crawl_queue")
        .update({"status": "running", "started_at": now_iso(), "worker_id": WORKER_ID})
        .eq("id", job["id"])
        .eq("status", "pending")
        .execute()
    )
    if not updated.data:
        return None
    return updated.data[0]


def run_crawl(crawler_url: str, secret: str, keyword: str, config: dict):
    body = {
        "keyword": keyword,
        "min_items": config["crawl"]["min_items"],
        "max_items": config["crawl"]["max_items"],
        "interval_seconds": config["crawl"]["interval_seconds"],
    }
    r = requests.post(
        crawler_url,
        json=body,
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
        timeout=600,
    )
    if r.status_code != 200:
        raise RuntimeError(f"爬虫 HTTP {r.status_code}: {r.text[:300]}")
    data = r.json()
    return data.get("products") or []


def callback(callback_url: str, secret: str, payload: dict):
    r = requests.post(
        callback_url,
        json=payload,
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
        timeout=120,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"回调失败 HTTP {r.status_code}: {r.text[:300]}")
    return r.json()


def process_job(sb, job, crawler_url, callback_url, secret, config):
    job_id = job["id"]
    keyword = job["keyword"]
    safe_print(f"[Worker] 开始任务 {job_id} keyword={keyword}")

    try:
        products = run_crawl(crawler_url, secret, keyword, config)
        if not products:
            callback(
                callback_url,
                secret,
                {
                    "jobId": job_id,
                    "keyword": keyword,
                    "userId": job.get("user_id"),
                    "preference": job.get("preference"),
                    "notifyEmail": job.get("notify_email"),
                    "products": [],
                    "status": "empty",
                },
            )
            safe_print(f"[Worker] 完成（无商品） {job_id}")
            return

        callback(
            callback_url,
            secret,
            {
                "jobId": job_id,
                "keyword": keyword,
                "userId": job.get("user_id"),
                "preference": job.get("preference"),
                "notifyEmail": job.get("notify_email"),
                "products": products,
                "status": "success",
            },
        )
        safe_print(f"[Worker] 完成 {job_id} count={len(products)}")
    except Exception as e:
        safe_print(f"[Worker] 失败 {job_id}: {e}")
        try:
            callback(
                callback_url,
                secret,
                {
                    "jobId": job_id,
                    "keyword": keyword,
                    "userId": job.get("user_id"),
                    "preference": job.get("preference"),
                    "notifyEmail": job.get("notify_email"),
                    "products": [],
                    "status": "error",
                    "error": str(e),
                },
            )
        except Exception as cb_err:
            safe_print(f"[Worker] 回调失败: {cb_err}")
            sb.table("crawl_queue").update(
                {"status": "failed", "error_message": str(e), "finished_at": now_iso()}
            ).eq("id", job_id).execute()


def main():
    url, key, secret, crawler_url, callback_url = get_env()
    config = load_config()
    sb = create_client(url, key)

    safe_print(f"队列 Worker 启动 id={WORKER_ID}")
    safe_print(f"  Supabase: {url}")
    safe_print(f"  爬虫: {crawler_url}")
    safe_print(f"  回调: {callback_url}")
    safe_print(f"  轮询间隔: {POLL_SECONDS}s")

    if not health_check(crawler_url):
        safe_print("[WARN] 爬虫服务未就绪，请先运行 start_crawler.bat")

    while True:
        try:
            if not health_check(crawler_url):
                safe_print("[WARN] 等待爬虫服务...")
                time.sleep(POLL_SECONDS)
                continue

            job = claim_job(sb)
            if not job:
                time.sleep(POLL_SECONDS)
                continue

            process_job(sb, job, crawler_url, callback_url, secret, config)
        except KeyboardInterrupt:
            safe_print("Worker 已停止")
            break
        except Exception as e:
            safe_print(f"[ERROR] 主循环: {e}")
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
