"""
闲鱼 RPA 浏览器模块
- 优先从搜索页 API 响应 / 卡片 DOM 提取商品（无需逐个进详情页）
- 兼容 goofish.com 动态加载
"""

import asyncio
import random
import re
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import yaml
from playwright.async_api import async_playwright, Page, Response

from parser import parse_product_from_page, is_valid_product, extract_price
from search_parser import parse_mtop_search_response, parse_dom_cards
from url_utils import normalize_goofish_item_url, normalize_product_urls
from utils_io import setup_utf8_console, safe_print

setup_utf8_console()

CONFIG_PATH = Path(__file__).parent / "config.yaml"
DEBUG_DIR = Path(__file__).parent / "debug"


def load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


async def random_delay(min_sec: int = 30, max_sec: int = 60):
    delay = random.uniform(min_sec, max_sec)
    await asyncio.sleep(delay)


def _build_search_url(keyword: str) -> str:
    q = quote(keyword)
    return f"https://www.goofish.com/search?q={q}"


async def _capture_mtop_items(page: Page, timeout: float = 15.0) -> list[dict]:
    """监听 mtop 搜索接口响应"""
    collected: list[dict] = []

    async def on_response(response: Response):
        url = response.url
        if "mtop" not in url.lower():
            return
        if not any(k in url.lower() for k in ("search", "idle", "item")):
            return
        try:
            text = await response.text()
            items = parse_mtop_search_response(text)
            for it in items:
                if it.get("title"):
                    collected.append(it)
        except Exception:
            pass

    page.on("response", on_response)
    await asyncio.sleep(timeout)
    return collected


async def _extract_dom_cards(page: Page) -> list[dict]:
    """从搜索页可见卡片提取标题/价格/链接"""
    for _ in range(5):
        await page.mouse.wheel(0, 900)
        await asyncio.sleep(0.8)

    return await page.evaluate("""
        () => {
            const results = [];
            const seen = new Set();

            document.querySelectorAll('a[href*="id="]').forEach(a => {
                const href = (a.href || '').split('#')[0];
                const m = href.match(/[?&]id=(\\d{8,})/);
                if (!m) return;

                const itemUrl = 'https://www.goofish.com/item?id=' + m[1];
                if (seen.has(itemUrl)) return;

                let root = a.closest('div[class]') || a.parentElement;
                const text = (root && root.innerText) ? root.innerText : (a.innerText || '');
                const lines = text.split('\\n').map(s => s.trim()).filter(Boolean);
                const title = lines.find(l => l.length > 5 && !/^[¥￥]/.test(l)) || a.innerText.trim().slice(0, 80);
                const priceLine = lines.find(l => /[¥￥]\\s*\\d/.test(l)) || '';

                if (!title) return;
                seen.add(itemUrl);
                results.push({ title, price: priceLine, url: itemUrl, item_id: m[1] });
            });

            return results.slice(0, 50);
        }
    """)


async def _try_mtop_in_page(page: Page, keyword: str) -> list[dict]:
    """尝试在页面内调用 lib.mtop 搜索（已登录时可用）"""
    try:
        result = await page.evaluate("""
            async (keyword) => {
                if (!window.lib || !window.lib.mtop || !window.lib.mtop.request) {
                    return { error: 'no mtop' };
                }
                const apis = [
                    'mtop.taobao.idlemtopsearch.pc.search',
                    'mtop.taobao.idle.pc.search',
                    'mtop.taobao.idlemtopsearch.search',
                ];
                for (const api of apis) {
                    try {
                        const res = await window.lib.mtop.request({
                            api,
                            v: '1.0',
                            data: { keyword, pageNumber: 1, rowsPerPage: 30, sortField: 'create', sortValue: 'desc' },
                        });
                        return { ok: true, data: res };
                    } catch (e) { /* try next */ }
                }
                return { error: 'all failed' };
            }
        """, keyword)
        if result.get("ok"):
            import json
            items = parse_mtop_search_response(json.dumps(result.get("data", {})))
            return items
    except Exception as e:
        safe_print(f"[WARN] mtop 页面调用失败: {e}")
    return []


async def scrape_product_detail(page: Page, url: str) -> Optional[dict]:
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(random.uniform(2, 3))

        title = await _text(page, ['h1', '[class*="title"]', '[class*="Title"]'])
        price_text = await _text(page, ['[class*="price"]', '[class*="Price"]'])
        if not price_text:
            price_text = await page.evaluate("""
                () => {
                    const m = document.body.innerText.match(/[¥￥]\\s*([\\d,]+\\.?\\d*)/);
                    return m ? m[0] : '';
                }
            """)
        price = extract_price(price_text or "0") or 0
        description = await _text(page, ['[class*="desc"]', '[class*="Desc"]', '[class*="detail"]'])

        page_data = {
            "title": title or "未知商品",
            "price": price,
            "description": description or title or "",
            "seller_level": _parse_credit(await _text(page, ['[class*="credit"]', '[class*="Credit"]'])),
            "seller_bio": "",
            "seller_item_count": 0,
            "seller_id": _extract_seller_id(url),
            "product_url": normalize_goofish_item_url(
                url.split("?")[0] if "?" in url else url,
                _extract_item_id_from_url(url),
            ),
            "publish_time": None,
        }
        product = parse_product_from_page(page_data)
        return product if is_valid_product(product) else None
    except Exception as e:
        safe_print(f"[WARN] 详情页失败 {url[:50]}: {e}")
        return None


async def _text(page: Page, selectors: list[str]) -> str:
    for sel in selectors:
        try:
            el = await page.query_selector(sel)
            if el:
                t = await el.inner_text()
                if t.strip():
                    return t.strip()
        except Exception:
            continue
    return ""


def _parse_credit(text: str) -> str:
    for level in ["极好", "优秀", "良好", "较差"]:
        if level in text:
            return level
    return ""


def _extract_seller_id(url: str) -> str:
    m = re.search(r"seller[_]?id=(\w+)", url)
    return m.group(1) if m else ""


def _extract_item_id_from_url(url: str) -> str:
    m = re.search(r"[?&]id=(\d+)", url)
    return m.group(1) if m else ""


def _list_item_to_product(raw: dict, keyword: str) -> Optional[dict]:
    """搜索列表项 → 标准商品结构"""
    title = raw.get("title", "")
    price = raw.get("price", 0)
    if isinstance(price, str):
        price = extract_price(price) or 0
    url = normalize_goofish_item_url(
        raw.get("product_url") or raw.get("url") or "",
        str(raw.get("item_id") or raw.get("itemId") or ""),
    )
    if not title:
        return None
    if price <= 0:
        price = 1.0

    return parse_product_from_page({
        "title": title,
        "price": float(price),
        "description": raw.get("description") or title,
        "seller_level": raw.get("seller_level") or "",
        "seller_id": raw.get("seller_id") or "",
        "seller_bio": raw.get("seller_nick") or "",
        "seller_item_count": 0,
        "product_url": url,
        "publish_time": None,
    })


async def _save_debug(page: Page, keyword: str, reason: str):
    DEBUG_DIR.mkdir(exist_ok=True)
    safe = re.sub(r"[^\w]", "_", keyword)[:30]
    path = DEBUG_DIR / f"{safe}_{reason}.png"
    try:
        await page.screenshot(path=str(path), full_page=True)
        safe_print(f"[DEBUG] 截图已保存: {path}")
    except Exception:
        pass


async def crawl_keyword(keyword: str, min_items: int = 20, max_items: int = 30, interval: int = 30) -> list[dict]:
    config = load_config()
    profile_dir = str(Path(__file__).parent / config["browser"]["profile_dir"])
    search_url = _build_search_url(keyword)

    launch_args = [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--no-default-browser-check",
    ]

    products: list[dict] = []
    target = random.randint(min_items, max_items)

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=config["browser"]["headless"],
            channel=config["browser"].get("channel", "chrome"),
            viewport={"width": 1280, "height": 900},
            locale="zh-CN",
            args=launch_args,
            ignore_default_args=["--enable-automation"],
        )
        page = context.pages[0] if context.pages else await context.new_page()
        await page.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
        )

        safe_print(f"[INFO] 打开搜索页: {keyword}")
        await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(2)

        # 等待商品区域出现
        try:
            await page.wait_for_selector('a[href*="item"], [class*="feeds"], [class*="card"]', timeout=15000)
        except Exception:
            safe_print("[WARN] 未检测到商品区域，可能未登录或页面加载慢")

        # 尝试点「最新」
        try:
            btn = page.locator("text=最新").first
            if await btn.count() > 0:
                await btn.click()
                await asyncio.sleep(2)
        except Exception:
            pass

        raw_items: list[dict] = []

        # 策略1: 页面内 mtop 调用
        safe_print("[INFO] 策略1: 页面 mtop 接口...")
        raw_items = await _try_mtop_in_page(page, keyword)
        safe_print(f"  -> {len(raw_items)} 条")

        # 策略2: 监听网络 mtop 响应
        if len(raw_items) < min_items:
            safe_print("[INFO] 策略2: 监听网络响应...")
            await page.reload(wait_until="domcontentloaded")
            await asyncio.sleep(2)
            net_items = await _capture_mtop_items(page, timeout=12.0)
            raw_items.extend(net_items)
            raw_items = list({(i.get("product_url") or i.get("title")): i for i in raw_items}.values())
            safe_print(f"  -> 累计 {len(raw_items)} 条")

        # 策略3: DOM 卡片解析
        if len(raw_items) < min_items:
            safe_print("[INFO] 策略3: 解析页面卡片...")
            dom_cards = await _extract_dom_cards(page)
            raw_items.extend(parse_dom_cards(dom_cards))
            raw_items = list({(i.get("product_url") or i.get("title")): i for i in raw_items}.values())
            safe_print(f"  -> 累计 {len(raw_items)} 条")

        if not raw_items:
            await _save_debug(page, keyword, "no_items")
            safe_print("[ERROR] 未找到商品。请确认：1) 已扫码登录 2) 搜索页能看到商品列表")
            await context.close()
            return []

        # 转为标准结构，列表数据优先（快）
        for raw in raw_items[:target]:
            prod = _list_item_to_product(raw, keyword)
            if prod and prod.get("title"):
                products.append(prod)

        # 对缺价格/需详情的条目，进详情页补全（最多补 3 条，避免太慢）
        need_detail = [p for p in products if (p.get("price") or 0) <= 1 and p.get("product_url", "").find("item?id=") > 0]
        for p in need_detail[:3]:
            url = p["product_url"]
            detail = await scrape_product_detail(page, url)
            if detail:
                idx = products.index(p)
                products[idx] = detail
            if need_detail.index(p) < len(need_detail) - 1:
                await asyncio.sleep(min(interval, 5))

        await context.close()

    # 过滤无效
    valid = [p for p in products if p.get("title") and (p.get("price") or 0) > 0]
    valid = normalize_product_urls(valid)
    safe_print(f"[INFO] 完成，共 {len(valid)} 条有效商品")
    return valid[:target]


if __name__ == "__main__":
    import sys
    kw = sys.argv[1] if len(sys.argv) > 1 else "iPhone 15 Pro"
    result = asyncio.run(crawl_keyword(kw, min_items=3, max_items=5, interval=3))
    for p in result:
        safe_print(f"  [OK] {p['title'][:40]} - {p['price']}元")
