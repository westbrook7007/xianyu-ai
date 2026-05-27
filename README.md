# 闲鱼AI智能比价选品工具

面向闲鱼个人买家的免费智能选品平台：避黄牛 · AI个性化匹配 · 价格监控 · 定时提醒。

## 功能概览

- **智能问卷** — 采集成色、寿命、增值服务、价格底线等个性化偏好
- **RPA 爬取** — Playwright 模拟人工浏览，单次 20-30 条，间隔 ≥30 秒
- **卖家甄别** — 规则引擎识别个人卖家 / 黄牛，自动过滤
- **AI 评分** — 价格、成色、卖家、寿命四维打分（满分 100）
- **价格趋势** — 7/30 日折线图，好价 / 史低定位
- **定时监控** — GitHub Actions 每日触发 + 浏览器桌面通知

## 快速开始（本地预览）

```bash
cd xianyu-ai
npm install
npm run dev
```

浏览器打开 http://localhost:3000 — 未配置 Supabase 时自动使用演示数据。

## 项目结构

```
xianyu-ai/
├── src/                    # Next.js 前端 + API
│   ├── app/                # 5 个页面 + API 路由
│   ├── components/         # UI 组件
│   └── lib/                # 评分引擎、配置、类型
├── crawler/                # Python RPA 爬虫
│   ├── rpa_browser.py      # Playwright 爬取逻辑
│   ├── parser.py           # 页面解析
│   └── server.py           # HTTP 服务（供后端调用）
├── supabase/schema.sql     # 数据库表结构
├── .github/workflows/      # GitHub Actions 定时任务
├── DEPLOY.md               # 完整部署文档
└── .env.example            # 环境变量模板
```

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端密钥 |
| `CRAWL_API_SECRET` | 爬虫/API 鉴权密钥 |
| `CRAWLER_ENDPOINT` | Python 爬虫服务地址（如 `http://localhost:8080/crawl`） |

## 爬虫首次登录

```bash
cd crawler
pip install -r requirements.txt
playwright install chrome
python rpa_browser.py "iPhone 15 Pro"
```

弹出 Chrome 窗口后手动登录闲鱼，登录态保存在 `crawler/browser_profile/`。

## 详细部署

请参阅 [DEPLOY.md](./DEPLOY.md) — 含 Vercel、Supabase、GitHub Actions、Replit 零成本部署步骤。

## 合规说明

- 轻量模拟人工浏览，无接口破解
- 仅采集公开商品信息，仅供个人参考
- 数据来源标注为闲鱼

## License

MIT
