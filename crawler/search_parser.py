"""从闲鱼搜索页/API 响应解析商品列表"""

import json
import re
from typing import Any

from url_utils import normalize_goofish_item_url


def parse_mtop_search_response(text: str) -> list[dict]:
    """解析 mtop 搜索接口返回（JSON 或 JSONP）"""
    items: list[dict] = []
    raw = text.strip()
    if not raw:
        return items

    # JSONP: mtopjsonp3({...})
    jsonp = re.match(r"^[^(]+\((.*)\)\s*$", raw, re.DOTALL)
    if jsonp:
        raw = jsonp.group(1)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return items

    def walk(node: Any):
        if isinstance(node, dict):
            # 常见结构：resultList / items / itemList
            for key in ("resultList", "items", "itemList", "data"):
                if key in node and isinstance(node[key], list):
                    for entry in node[key]:
                        parsed = _parse_search_entry(entry)
                        if parsed:
                            items.append(parsed)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for entry in node:
                if isinstance(entry, dict):
                    parsed = _parse_search_entry(entry)
                    if parsed:
                        items.append(parsed)
                walk(entry)

    walk(data)
    return _dedupe_items(items)


def _parse_search_entry(entry: dict) -> dict | None:
    """从多种嵌套结构提取商品字段"""
    # 结构1: data.item.main.exContent
    try:
        content = entry.get("data", {}).get("item", {}).get("main", {})
        ex = content.get("exContent") or content.get("excontent") or {}
        if ex.get("title"):
            return _build_item(ex, content.get("targetUrl") or ex.get("targetUrl"))
    except Exception:
        pass

    # 结构2: 扁平字段
    title = entry.get("title") or entry.get("itemTitle") or entry.get("name")
    if not title:
        return None

    price = _extract_price_from_obj(entry)
    item_id = str(entry.get("itemId") or entry.get("id") or entry.get("item_id") or "")
    url = entry.get("targetUrl") or entry.get("detailUrl") or entry.get("url") or ""
    url = normalize_goofish_item_url(url, item_id)

    return {
        "title": title,
        "price": price,
        "product_url": url,
        "item_id": item_id,
        "seller_id": str(entry.get("userId") or entry.get("sellerId") or ""),
        "seller_level": entry.get("sellerLevel") or entry.get("credit") or "",
        "description": title,
        "area": entry.get("area") or "",
    }


def _build_item(ex: dict, target_url: str | None) -> dict | None:
    title = ex.get("title")
    if not title:
        return None
    price = 0.0
    price_arr = ex.get("price")
    if isinstance(price_arr, list):
        price_text = "".join(str(p.get("text", p) if isinstance(p, dict) else p) for p in price_arr)
        price = _parse_price_text(price_text)
    elif price_arr:
        price = _parse_price_text(str(price_arr))

    item_id = str(ex.get("itemId") or "")
    url = normalize_goofish_item_url(target_url or ex.get("targetUrl") or "", item_id)

    return {
        "title": title,
        "price": price,
        "product_url": url,
        "item_id": item_id,
        "seller_id": str(ex.get("userId") or ex.get("sellerUserId") or ""),
        "seller_level": "",
        "description": title,
        "area": ex.get("area") or "",
        "seller_nick": ex.get("userNickName") or "",
    }


def _extract_price_from_obj(entry: dict) -> float:
    for key in ("price", "soldPrice", "priceText", "priceWan"):
        if key in entry:
            return _parse_price_text(str(entry[key]))
    return 0.0


def _parse_price_text(text: str) -> float:
    text = text.replace("¥", "").replace("￥", "").replace(",", "").strip()
    m = re.search(r"(\d+\.?\d*)", text)
    return float(m.group(1)) if m else 0.0


def _dedupe_items(items: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for it in items:
        key = it.get("product_url") or it.get("title")
        if key and key not in seen:
            seen.add(key)
            out.append(it)
    return out


def parse_dom_cards(cards: list[dict]) -> list[dict]:
    """解析浏览器 DOM 卡片数据"""
    items = []
    for c in cards:
        title = (c.get("title") or "").strip()
        price = _parse_price_text(c.get("price") or "")
        url = normalize_goofish_item_url(c.get("url") or "", c.get("item_id") or "")
        if title and len(title) > 3:
            items.append({
                "title": title,
                "price": price,
                "product_url": url,
                "description": title,
                "seller_level": "",
                "seller_id": "",
            })
    return _dedupe_items(items)
