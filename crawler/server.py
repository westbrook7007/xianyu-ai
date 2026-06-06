"""闲鱼 RPA 爬虫 HTTP 服务 - 版本 2.1（已修复 Windows 编码问题）"""

import os
import asyncio

# 必须最先执行，再 import 其他模块
from utils_io import setup_utf8_console, safe_print
setup_utf8_console()
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
os.environ.setdefault("PYTHONUTF8", "1")

from flask import Flask, request, jsonify
from dotenv import load_dotenv
from rpa_browser import crawl_keyword, load_config

load_dotenv()

CRAWLER_VERSION = "6.6"
app = Flask(__name__)
API_SECRET = os.getenv("CRAWL_API_SECRET", "change-me")


def check_auth():
    auth = request.headers.get("Authorization", "")
    return auth == f"Bearer {API_SECRET}"


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "version": CRAWLER_VERSION})


@app.route("/crawl", methods=["POST"])
def crawl():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json or {}
    keyword = data.get("keyword")
    if not keyword:
        return jsonify({"error": "缺少 keyword"}), 400

    config = load_config()
    min_items = data.get("min_items", config["crawl"]["min_items"])
    max_items = data.get("max_items", config["crawl"]["max_items"])
    interval = data.get("interval_seconds", config["crawl"]["interval_seconds"])

    try:
        products = asyncio.run(crawl_keyword(keyword, min_items, max_items, interval))
        return jsonify({"status": "success", "products": products, "count": len(products)})
    except UnicodeEncodeError as e:
        safe_print(f"[ERROR] encoding: {repr(e)}")
        return jsonify({"error": "控制台编码错误，请用 start_crawler.bat 重启爬虫"}), 500
    except Exception as e:
        safe_print(f"[ERROR] crawl failed: {repr(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    config = load_config()
    port = int(os.getenv("CRAWLER_PORT", config["server"]["port"]))
    safe_print(f"爬虫服务 v{CRAWLER_VERSION} 启动: http://127.0.0.1:{port}")
    safe_print("首次运行请在浏览器中登录闲鱼账号")
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
