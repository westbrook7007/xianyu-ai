/**
 * 闲鱼AI 接口与逻辑冒烟测试
 * 用法: node scripts/verify.mjs [baseUrl]
 * 默认 baseUrl = http://localhost:3000
 */

const BASE = process.argv[2] || "http://localhost:3000";

const results = [];

function record(id, name, pass, detail = "") {
  results.push({ id, name, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`[${mark}] ${id} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, json, text };
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, json, text };
}

// --- 纯函数测试（与 src/lib 逻辑一致） ---
function dedupeProducts(products) {
  const seen = new Set();
  const out = [];
  for (const p of products) {
    const id = p.product_url?.match(/[?&]id=(\d+)/)?.[1];
    const key = id || p.product_url?.trim() || p.title?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function testDedupe() {
  const input = [
    { title: "A", product_url: "https://www.goofish.com/item?id=111" },
    { title: "A dup", product_url: "https://www.goofish.com/item?id=111" },
    { title: "B", product_url: "https://www.goofish.com/item?id=222" },
  ];
  const out = dedupeProducts(input);
  record("L01", "商品按 ID 去重", out.length === 2, `got ${out.length}`);
}

async function main() {
  console.log(`\n=== 闲鱼AI 验证 @ ${BASE} ===\n`);

  testDedupe();

  try {
    const home = await get("/");
    record("A01", "首页可访问", home.res.status === 200, `status ${home.res.status}`);
  } catch (e) {
    record("A01", "首页可访问", false, e.message);
  }

  try {
    const crawl = await get("/api/crawl");
    record(
      "A02",
      "爬取配置接口",
      crawl.res.status === 200 && crawl.json?.config != null,
      crawl.json ? `crawler=${crawl.json.crawlerConfigured}` : "no json"
    );
  } catch (e) {
    record("A02", "爬取配置接口", false, e.message);
  }

  try {
    const bad = await post("/api/crawl", {});
    record("A03", "爬取缺关键词返回 400", bad.res.status === 400, `status ${bad.res.status}`);
  } catch (e) {
    record("A03", "爬取缺关键词返回 400", false, e.message);
  }

  try {
    const demo = await post("/api/crawl", {
      keyword: "verify-test",
      userId: "verify_user",
      triggerType: "manual",
    });
    const ok = demo.res.status === 200 && (demo.json?.products?.length > 0 || demo.json?.status);
    record("A04", "爬取同步返回", ok, demo.json?.status || demo.text?.slice(0, 80));
  } catch (e) {
    record("A04", "爬取同步返回", false, e.message);
  }

  try {
    const bg = await post("/api/crawl", {
      keyword: "verify-bg",
      userId: "verify_user",
      notifyEmail: "test@example.com",
      backgroundNotify: true,
    });
    const queued = bg.json?.status === "queued";
    const blocked = bg.res.status === 400 && bg.json?.error?.includes("SMTP");
    record("A05", "后台爬取排队或 SMTP 校验", queued || blocked, bg.json?.status || bg.json?.error?.slice(0, 60));
  } catch (e) {
    record("A05", "后台爬取排队或 SMTP 校验", false, e.message);
  }

  try {
    const trends = await get("/api/trends/batch?keywords=iPhone%2015%20Pro,PS5%20光驱版&days=14");
    record(
      "A06",
      "批量趋势接口",
      trends.res.status === 200 && trends.json?.items?.length === 2,
      `items=${trends.json?.items?.length}`
    );
  } catch (e) {
    record("A06", "批量趋势接口", false, e.message);
  }

  try {
    const trend = await get("/api/trends/iPhone%2015%20Pro?days=30");
    record(
      "A07",
      "单关键词趋势",
      trend.res.status === 200 && trend.json?.trends?.length > 0,
      `points=${trend.json?.trends?.length}`
    );
  } catch (e) {
    record("A07", "单关键词趋势", false, e.message);
  }

  try {
    const products = await get("/api/products?keyword=iPhone%2015%20Pro");
    record(
      "A08",
      "商品列表演示数据",
      products.res.status === 200 && products.json?.products?.length > 0,
      `count=${products.json?.products?.length}`
    );
  } catch (e) {
    record("A08", "商品列表演示数据", false, e.message);
  }

  try {
    const miss = await get("/api/crawl/results");
    record("A09", "爬取缓存缺参 400", miss.res.status === 400, `status ${miss.res.status}`);
  } catch (e) {
    record("A09", "爬取缓存缺参 400", false, e.message);
  }

  try {
    const cache = await get("/api/crawl/results?userId=verify_user&keyword=not-exist");
    record(
      "A10",
      "爬取缓存未命中",
      cache.res.status === 200 && cache.json?.status === "not_found",
      cache.json?.status
    );
  } catch (e) {
    record("A10", "爬取缓存未命中", false, e.message);
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败, 共 ${results.length} 项 ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
