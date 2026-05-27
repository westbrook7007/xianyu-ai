# 零成本部署指南

本指南帮助你在 **Vercel + Supabase + GitHub Actions + Replit** 上免费部署闲鱼AI选品工具。

## 架构总览

```
用户浏览器 → Vercel (Next.js) → Supabase (数据库)
                    ↓
              Replit (Python RPA 爬虫)
                    ↓
         GitHub Actions (每日定时触发)
```

---

## 第一步：Supabase 数据库（免费）

1. 注册 [Supabase](https://supabase.com)，创建新项目
2. 进入 **SQL Editor**，粘贴并执行 `supabase/schema.sql`
3. 在 **Settings → API** 复制：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 第二步：Vercel 部署前端（免费）

1. 将代码推送到 GitHub
2. 登录 [Vercel](https://vercel.com)，Import 该仓库
3. 框架自动识别为 Next.js
4. 在 **Environment Variables** 添加：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRAWL_API_SECRET=your-random-secret-string
CRAWLER_ENDPOINT=https://your-replit-url/crawl
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

5. Deploy → 获得 `https://your-app.vercel.app`

### Cloudflare Pages（备选）

1. 连接 GitHub 仓库
2. 构建命令: `npm run build`
3. 输出目录: `.next`（需适配 Next.js on Pages 或使用静态导出）

---

## 第三步：Python 爬虫部署（Replit 免费）

1. 注册 [Replit](https://replit.com)
2. 创建 Python Repl，上传 `crawler/` 目录全部文件
3. 在 Replit Shell 执行：

```bash
pip install -r requirements.txt
playwright install chrome
```

4. 设置 Replit Secrets：
   - `CRAWL_API_SECRET` = 与 Vercel 相同
5. 运行 `python server.py`
6. 首次运行：在 Replit 弹出的浏览器中登录闲鱼
7. 复制 Replit 提供的 URL → 填入 Vercel 的 `CRAWLER_ENDPOINT`

> Replit 免费版有休眠限制。也可在本地运行 `python server.py`，用 ngrok 暴露端口。

---

## 第四步：GitHub Actions 定时任务（免费）

1. 在 GitHub 仓库 **Settings → Secrets** 添加：
   - `CRAWL_API_SECRET`
   - `APP_URL` = 你的 Vercel 地址
2. `.github/workflows/daily-crawl.yml` 已配置每日 UTC 02:00（北京 10:00）自动爬取
3. 也可在 Actions 页手动 **Run workflow**

---

## 第五步：免费域名（可选）

1. 注册 [ClouDNS](https://www.clouddns.net/) 免费二级域名
2. 在 Vercel **Domains** 添加 CNAME 指向
3. 自动获得 HTTPS

---

## 本地开发完整流程

```bash
# 终端 1: 前端
cd xianyu-ai
cp .env.example .env.local
# 填写 Supabase 密钥（或留空使用演示模式）
npm install
npm run dev

# 终端 2: 爬虫
cd crawler
pip install -r requirements.txt
playwright install chrome
python server.py
```

`.env.local` 添加：
```
CRAWLER_ENDPOINT=http://localhost:8080/crawl
CRAWL_API_SECRET=change-me-to-random-string
```

---

## 自定义配置

所有可调参数在 `src/lib/config.ts` 和环境变量中：

| 配置 | 环境变量 | 默认值 |
|------|----------|--------|
| 爬取数量 | `CRAWL_MIN/MAX_ITEMS` | 20-30 |
| 爬取间隔 | `CRAWL_INTERVAL_SECONDS` | 30 |
| 价格权重 | `SCORE_WEIGHT_PRICE` | 35 |
| 低价阈值 | 代码中 `goodDealRatio` | 0.8 |

---

## 常见问题

**Q: 演示模式和真实模式区别？**
未配置 Supabase / CRAWLER_ENDPOINT 时使用内置演示数据，UI 功能完整可预览。

**Q: 爬虫登录态过期？**
重新运行 `python rpa_browser.py`，在浏览器中登录闲鱼。

**Q: 爬取被风控？**
- 确保间隔 ≥30 秒
- 每日手动不超过 3 次
- 使用固定 IP 和浏览器 Profile

**Q: Vercel 函数超时？**
爬取在 Replit/本地执行，Vercel 仅触发和展示，不会超时。

---

## 费用总结

| 服务 | 费用 |
|------|------|
| Vercel | 免费 |
| Supabase | 免费版 |
| GitHub Actions | 免费（公开仓库） |
| Replit | 免费版 |
| ClouDNS 域名 | 免费 |
| **合计** | **¥0** |
