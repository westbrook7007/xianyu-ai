"""闲鱼商品链接标准化"""

import re

GOOFISH_ITEM_BASE = "https://www.goofish.com/item?id="


def extract_item_id(url: str = "", item_id: str = "") -> str:
    """从 URL 或字段中提取商品 ID"""
    if item_id and str(item_id).isdigit():
        return str(item_id)
    if not url:
        return ""
    m = re.search(r"[?&]id=(\d+)", url)
    if m:
        return m.group(1)
    m = re.search(r"/item[/\-]?(\d{8,})", url)
    if m:
        return m.group(1)
    return ""


def normalize_goofish_item_url(url: str = "", item_id: str = "") -> str:
    """
    统一为: https://www.goofish.com/item?id=商品ID
    无效则返回空字符串（绝不返回搜索页链接）
    """
    iid = extract_item_id(url, item_id)
    if iid:
        return f"{GOOFISH_ITEM_BASE}{iid}"

    if not url:
        return ""

    u = url.strip()
    if u.startswith("//"):
        u = "https:" + u
    elif u.startswith("/"):
        u = "https://www.goofish.com" + u

    # 已是标准商品页
    if "goofish.com/item" in u and re.search(r"id=\d+", u):
        m = re.search(r"id=(\d+)", u)
        return f"{GOOFISH_ITEM_BASE}{m.group(1)}" if m else u.split("#")[0]

    # 搜索页、首页等一律视为无效商品链接
    if "/search" in u or u.rstrip("/").endswith("goofish.com"):
        return ""

    return ""


def normalize_product_urls(products: list[dict]) -> list[dict]:
    """批量修正商品链接"""
    for p in products:
        raw_url = p.get("product_url") or p.get("url") or ""
        item_id = str(p.get("item_id") or p.get("itemId") or "")
        fixed = normalize_goofish_item_url(raw_url, item_id)
        if fixed:
            p["product_url"] = fixed
        elif raw_url:
            # 清掉错误的搜索页链接
            p["product_url"] = ""
    return products
