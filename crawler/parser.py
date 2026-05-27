"""闲鱼商品页面解析器 - 从 DOM 提取字段"""

import re
from typing import Optional


SERVICE_KEYWORDS = ["随心换", "碎屏保", "官方延保", "在保", "保修剩余", "AppleCare", "Care"]
MERCHANT_KEYWORDS = ["工作室", "批发", "回收", "翻新", "专卖", "数码店", "商行", "贸易"]


def extract_price(text: str) -> Optional[float]:
    """从文本提取价格"""
    match = re.search(r"[\d,]+\.?\d*", text.replace(",", ""))
    if match:
        try:
            return float(match.group())
        except ValueError:
            return None
    return None


def parse_product_from_page(page_data: dict) -> dict:
    """
    解析单条商品数据
    page_data 由 rpa_browser 从页面 DOM 收集
    """
    title = page_data.get("title", "")
    desc = page_data.get("description", "") + " " + title
    price = page_data.get("price", 0)

    # 成色识别
    quality = ""
    for q in ["全新", "99新", "98新", "95新", "9成新", "8成新"]:
        if q in desc:
            quality = q
            break

    # 增值服务
    service = ""
    service_day = 0
    for kw in SERVICE_KEYWORDS:
        if kw in desc:
            service += (service + "、" if service else "") + kw
    day_m = re.search(r"(?:剩余|还有)\s*(\d+)\s*天", desc)
    month_m = re.search(r"(?:剩余|还有)\s*(\d+)\s*[个]?月", desc)
    if day_m:
        service_day = int(day_m.group(1))
    elif month_m:
        service_day = int(month_m.group(1)) * 30

    # 卖家信息
    seller_bio = page_data.get("seller_bio", "")
    seller_item_count = page_data.get("seller_item_count", 0)

    return {
        "title": title,
        "price": price,
        "original_price": page_data.get("original_price"),
        "quality": quality,
        "service": service,
        "service_day": service_day,
        "seller_id": page_data.get("seller_id", ""),
        "seller_level": page_data.get("seller_level", ""),
        "seller_bio": seller_bio,
        "seller_item_count": seller_item_count,
        "description": desc,
        "flaw_desc": page_data.get("flaw_desc", ""),
        "publish_time": page_data.get("publish_time"),
        "product_url": page_data.get("product_url", ""),
        "life_level": _estimate_life(desc),
    }


def _estimate_life(text: str) -> int:
    """估算寿命等级 1-5"""
    year_m = re.search(r"(\d{4})\s*年", text)
    if year_m:
        from datetime import datetime
        age = datetime.now().year - int(year_m.group(1))
        if age <= 1:
            return 5
        if age <= 2:
            return 4
        if age <= 3:
            return 3
        if age <= 5:
            return 2
        return 1
    return 3


def is_valid_product(product: dict) -> bool:
    """过滤无效/虚假标价商品"""
    title = product.get("title") or ""
    if not title or title == "未知商品" or len(title) < 3:
        return False
    price = product.get("price") or 0
    if price <= 0 or price > 999999:
        return False
    if any(kw in product.get("description", "") for kw in MERCHANT_KEYWORDS):
        if product.get("seller_item_count", 0) > 30:
            return False
    return True
