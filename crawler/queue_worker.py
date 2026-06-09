"""本机队列 Worker：从 Supabase 拉取任务 → 调本地爬虫 → 回写结果（HTTP 或直连 Supabase）"""

import os
import time
import uuid
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
HTTP_CONNECT_TIMEOUT = int(os.getenv("WORKER_HTTP_CONNECT_TIMEOUT", "10"))
HTTP_READ_TIMEOUT = int(os.getenv("WORKER_HTTP_READ_TIMEOUT", "60"))


def load_config():
    with open(Path(__file__).parent / "config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_callback_urls():
    urls = []
    primary = os.getenv("WORKER_CALLBACK_URL", "").strip()
    if primary:
        urls.append(primary.rstrip("/"))
    local = "http://127.0.0.1:3000/api/crawl/worker"
    if local not in urls:
        urls.append(local)
    vercel = os.getenv("WORKER_CALLBACK_URL_VERCEL", "https://xianyu-ai.vercel.app/api/crawl/worker").strip()
    if vercel and vercel not in urls:
        urls.append(vercel.rstrip("/"))
    return urls


def get_env():
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    secret = os.getenv("CRAWL_API_SECRET")
    crawler = os.getenv("CRAWLER_ENDPOINT", "http://127.0.0.1:8080/crawl")
    if not url or not key:
        raise RuntimeError("请在 .env.local 配置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY")
    if not secret:
        raise RuntimeError("请在 .env.local 配置 CRAWL_API_SECRET")
    return url, key, secret, crawler, get_callback_urls()


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


def _clip(value, max_len: int, fallback: str = "") -> str:
    s = str(value or fallback)
    return s[:max_len] if len(s) > max_len else s


def to_product_row(p: dict, keyword: str, avg_price: float) -> dict:
    price = float(p.get("price") or 0)
    return {
        "keyword": _clip(keyword, 255, "unknown"),
        "title": _clip(p.get("title"), 500, "未知商品"),
        "price": price,
        "original_price": p.get("original_price"),
        "avg_price": avg_price,
        "quality": _clip(p.get("quality"), 100) or None,
        "service": _clip(p.get("service"), 255) or None,
        "service_day": int(p.get("service_day") or 0),
        "seller_id": _clip(p.get("seller_id"), 100) or None,
        "seller_level": _clip(p.get("seller_level"), 50) or None,
        "seller_bio": p.get("seller_bio"),
        "seller_item_count": int(p.get("seller_item_count") or 0),
        "seller_type": int(p.get("seller_type") or 1),
        "life_level": int(p.get("life_level") or 3),
        "ai_score": float(p.get("ai_score") or 50),
        "flaw_desc": p.get("flaw_desc"),
        "description": p.get("description"),
        "publish_time": p.get("publish_time"),
        "product_url": _clip(p.get("product_url"), 1000),
        "is_filtered": bool(p.get("is_filtered", False)),
        "price_position": _clip(p.get("price_position"), 20, "正常"),
    }


def complete_direct(sb, payload: dict):
    """本机直连 Supabase 回写（不依赖 Vercel 网络）"""
    job_id = payload["jobId"]
    keyword = payload["keyword"]
    user_id = payload.get("userId")
    status = payload.get("status")
    products = payload.get("products") or []
    crawl_error = payload.get("error")
    finished = now_iso()

    if status == "error":
        sb.table("crawl_queue").update(
            {
                "status": "failed",
                "error_message": crawl_error or "爬取失败",
                "finished_at": finished,
            }
        ).eq("id", job_id).execute()
        return {"ok": True, "status": "failed", "mode": "direct"}

    if status == "empty" or not products:
        sb.table("crawl_queue").update(
            {
                "status": "done",
                "item_count": 0,
                "error_message": crawl_error or "未找到商品",
                "finished_at": finished,
            }
        ).eq("id", job_id).execute()
        sb.table("crawl_logs").insert(
            {
                "keyword": keyword,
                "user_id": user_id,
                "trigger_type": "manual",
                "item_count": 0,
                "status": "empty",
                "message": "队列爬取无结果",
            }
        ).execute()
        return {"ok": True, "status": "empty", "mode": "direct"}

    prices = [float(p.get("price") or 0) for p in products if float(p.get("price") or 0) > 0]
    avg_price = sum(prices) / len(prices) if prices else 0
    rows = [to_product_row(p, keyword, avg_price) for p in products if p.get("product_url")]
    if rows:
        sb.table("product_data").upsert(rows, on_conflict="product_url").execute()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        sb.table("price_trend").upsert(
            {
                "keyword": keyword,
                "date": today,
                "min_price": min(prices),
                "max_price": max(prices),
                "avg_price": avg_price,
                "product_count": len([r for r in rows if not r.get("is_filtered")]),
            },
            on_conflict="keyword,date",
        ).execute()

    sb.table("crawl_queue").update(
        {
            "status": "done",
            "item_count": len(rows),
            "error_message": None,
            "finished_at": finished,
        }
    ).eq("id", job_id).execute()
    sb.table("crawl_logs").insert(
        {
            "keyword": keyword,
            "user_id": user_id,
            "trigger_type": "manual",
            "item_count": len(rows),
            "status": "success",
            "message": "队列爬取完成（Worker 直连 Supabase）",
        }
    ).execute()
    return {"ok": True, "status": "success", "itemCount": len(rows), "mode": "direct"}


def callback_http(callback_urls: list, secret: str, payload: dict):
    last_err = None
    for url in callback_urls:
        try:
            safe_print(f"[Worker] 尝试 HTTP 回调: {url}")
            r = requests.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
                timeout=(HTTP_CONNECT_TIMEOUT, HTTP_READ_TIMEOUT),
            )
            if r.status_code in (200, 201):
                safe_print(f"[Worker] HTTP 回调成功: {url}")
                return r.json()
            last_err = f"HTTP {r.status_code}: {r.text[:200]}"
            safe_print(f"[Worker] HTTP 回调失败 {url}: {last_err}")
        except Exception as e:
            last_err = str(e)
            safe_print(f"[Worker] HTTP 回调超时/失败 {url}: {e}")
    raise RuntimeError(last_err or "所有 HTTP 回调均失败")


def complete_job(sb, callback_urls: list, secret: str, payload: dict):
    try:
        return callback_http(callback_urls, secret, payload)
    except Exception as http_err:
        safe_print(f"[Worker] HTTP 回调不可用，改用 Supabase 直连: {http_err}")
        return complete_direct(sb, payload)


def process_job(sb, job, crawler_url, callback_urls, secret, config):
    job_id = job["id"]
    keyword = job["keyword"]
    safe_print(f"[Worker] 开始任务 {job_id} keyword={keyword}")

    base_payload = {
        "jobId": job_id,
        "keyword": keyword,
        "userId": job.get("user_id"),
        "preference": job.get("preference"),
        "notifyEmail": job.get("notify_email"),
    }

    try:
        products = run_crawl(crawler_url, secret, keyword, config)
        if not products:
            result = complete_job(
                sb,
                callback_urls,
                secret,
                {**base_payload, "products": [], "status": "empty"},
            )
            safe_print(f"[Worker] 完成（无商品） {job_id} mode={result.get('mode', 'http')}")
            return

        result = complete_job(
            sb,
            callback_urls,
            secret,
            {**base_payload, "products": products, "status": "success"},
        )
        safe_print(
            f"[Worker] 完成 {job_id} count={result.get('itemCount', len(products))} mode={result.get('mode', 'http')}"
        )
    except Exception as e:
        safe_print(f"[Worker] 失败 {job_id}: {e}")
        try:
            complete_job(
                sb,
                callback_urls,
                secret,
                {**base_payload, "products": [], "status": "error", "error": str(e)},
            )
        except Exception as cb_err:
            safe_print(f"[Worker] 回写失败: {cb_err}")
            sb.table("crawl_queue").update(
                {"status": "failed", "error_message": str(e), "finished_at": now_iso()}
            ).eq("id", job_id).execute()


def main():
    url, key, secret, crawler_url, callback_urls = get_env()
    config = load_config()
    sb = create_client(url, key)

    safe_print(f"队列 Worker 启动 id={WORKER_ID}")
    safe_print(f"  Supabase: {url}")
    safe_print(f"  爬虫: {crawler_url}")
    safe_print(f"  HTTP 回调（依次尝试）: {callback_urls}")
    safe_print(f"  兜底: Supabase 直连（无需访问 Vercel）")
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

            process_job(sb, job, crawler_url, callback_urls, secret, config)
        except KeyboardInterrupt:
            safe_print("Worker 已停止")
            break
        except Exception as e:
            safe_print(f"[ERROR] 主循环: {e}")
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
