# 闲鱼AI 远程爬取队列 PRD（v7.0）

> **文档版本**：v7.0  
> **基线版本**：v6.6（`d197abd`）  
> **撰写日期**：2026-05-27  
> **状态**：待评审 / 待开发  
> **交付对象**：Cursor AI + 产品负责人

---

## 一、文档概述

### 1.1 项目名称

闲鱼AI智能比价选品工具 — **远程爬取队列模块**

### 1.2 背景与动机

v6.6 已具备：本地 RPA 爬取、AI 评分、邮件通知、爬取进度 UI、首页趋势等能力。但存在架构瓶颈：

| 场景 | v6.6 现状 | 用户期望 |
|------|-----------|----------|
| 本机使用 | ✅ 完整可用 | ✅ 保持 |
| 外地用户手机访问 Vercel | 仅演示数据 | **真实提交 + 真实结果** |
| 爬取执行位置 | 仅 `127.0.0.1:8080` 本机 | **仍在本机**，但可被远程触发 |
| 结果共享 | `sessionStorage` / 本机 `.crawl-cache` | **云端可读** |

本产品负责人确认目标体验为：

> **外地用户自己在手机上打开网站、输入商品、点爬取 → 运营者电脑代为执行闲鱼爬取 → 用户在手机查看结果（及可选邮件通知）。**

### 1.3 项目定位

在 **零服务器爬虫成本** 前提下，通过 **云端任务队列 + 本机 Worker**，将现有「单机爬虫」升级为「远程可提交的分布式爬取」模式。

- **网站**：托管于 Vercel（免费）
- **数据中转**：Supabase（免费版）
- **爬取执行**：运营者个人电脑（Windows + Python Playwright）
- **闲鱼账号**：运营者个人账号登录态（`browser_profile`）

### 1.4 目标用户

| 角色 | 描述 | 核心诉求 |
|------|------|----------|
| **运营者（Owner）** | 项目维护者，电脑常开、已登录闲鱼 | 低成本托管、防滥用、稳定爬取 |
| **远程用户（Remote User）** | 外地朋友/客户，用手机浏览器访问 | 输入关键词即可查价选品，无需装环境 |
| **本机用户（Local User）** | 运营者自己在电脑上调试 | 保持 v6.6 同步爬取体验不变 |

### 1.5 核心价值

1. **远程可用**：手机提交任务，不必微信报关键词
2. **爬取仍合规轻量**：单次 20–30 条、间隔 ≥30 秒、模拟人工浏览
3. **结果可共享**：云端持久化，多人可看同一关键词结果
4. **零爬虫服务器费**：不购买云主机跑 Playwright
5. **渐进增强**：未配 Supabase 时退回演示模式；配好后自动启用队列

### 1.6 非目标（Out of Scope）

- 多运营者多账号调度
- 用户自行在本机跑爬虫的 SaaS 化
- 公开大规模商业化运营（需额外合规评估）
- 国内备案域名、阿里云迁移（列为 v8 可选）
- 实时 WebSocket 推送（v7 用轮询即可）

---

## 二、整体架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        远程用户（手机浏览器）                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Vercel — Next.js 网站 + API Routes                    │
│  • POST /api/crawl        → 无本机爬虫时写入队列                    │
│  • GET  /api/crawl/queue  → 查询任务状态                           │
│  • GET  /api/products     → 从 Supabase 读结果                     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase（免费 PostgreSQL）                           │
│  • crawl_queue      任务队列（pending/running/done/failed）       │
│  • product_data     商品结果                                      │
│  • user_preference  用户偏好                                      │
│  • crawl_logs       爬取日志                                      │
│  • price_trend      价格趋势                                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ 轮询（每 30s）
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              运营者电脑（Windows Surface）                        │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ queue_worker.py  │───▶│ server.py :8080  │───▶ 闲鱼 Goofish  │
│  │ 拉任务→调爬虫→回写  │    │ Playwright RPA   │                   │
│  └──────────────────┘    └──────────────────┘                   │
│           browser_profile/（运营者闲鱼登录态）                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 核心设计原则

| 原则 | 说明 |
|------|------|
| **爬虫不离家** | `CRAWLER_ENDPOINT` 仅存在于运营者本机 `.env.local`，Vercel **不配置** |
| **云端只做中转** | Supabase 存任务与结果，不跑 Playwright |
| **幂等与防重** | 同一 `job_id` 仅执行一次；Worker 用乐观锁认领任务 |
| **失败可感知** | 任务失败写 `error_message`，前端展示；可选邮件通知 |
| **向后兼容** | 本机直连爬虫的同步模式保留；无 Supabase 时演示模式不变 |

### 2.3 部署拓扑

| 组件 | 部署位置 | 环境变量 |
|------|----------|----------|
| 网站前端 + API | Vercel | Supabase URL/Keys；**无** `CRAWLER_ENDPOINT` |
| 数据库 | Supabase Cloud | — |
| 爬虫 HTTP 服务 | 本机 `127.0.0.1:8080` | `CRAWL_API_SECRET` |
| 队列 Worker | 本机常驻进程 | Supabase Service Key + `CRAWLER_ENDPOINT` |
| SMTP 邮件 | Vercel（发信）或本机 | `SMTP_*` |

---

## 三、功能需求

### 3.1 模块清单

| 模块 | 优先级 | 说明 |
|------|--------|------|
| F1 远程任务提交 | P0 | 手机端提交关键词 + 偏好，进入队列 |
| F2 本机队列 Worker | P0 | 拉取、执行、回写、更新状态 |
| F3 任务状态查询 | P0 | 前端轮询 pending/running/done/failed |
| F4 结果云端展示 | P0 | `/results` 从 Supabase 读真实数据 |
| F5 邮件通知 | P1 | 沿用 v6.6，队列完成后触发 |
| F6 限流与防滥用 | P1 | 每 `user_id` 每日上限（默认 3 次） |
| F7 本机同步模式 | P1 | 本机有爬虫时仍可即时爬取（不走队列） |
| F8 运营者监控面板 | P2 | 查看队列积压、最近失败任务 |
| F9 微信/短信通知 | P3 | 未来扩展，v7 不做 |

### 3.2 F1 — 远程任务提交

**触发页面**：`/preferences?keyword=xxx`（与 v6.6 一致）

**输入**：
- `keyword`（必填）
- `userId`（浏览器本地生成，沿用 `getUserId()`）
- `preference`（UserPreference 问卷结果）
- `notifyEmail`（可选）
- `backgroundNotify`（可选，默认 true 当填写邮箱时）

**逻辑分支**：

```
POST /api/crawl
  ├─ 本机模式：存在 CRAWLER_ENDPOINT 且请求来自本机调试
  │     → 直接 executeCrawl()（v6.6 行为）
  └─ 远程模式：无 CRAWLER_ENDPOINT（Vercel 生产环境）
        → 写入 crawl_queue，status = pending
        → 返回 { status: "queued", jobId, estimatedWait }
```

**输出（远程模式）**：

```json
{
  "status": "queued",
  "jobId": "uuid",
  "message": "已提交，正在等待爬取（预计 3–10 分钟）",
  "queuePosition": 1
}
```

**异常**：
- 关键词为空 → 400
- 超日限额 → 429
- Supabase 未配置 → 返回演示模式提示（与现网一致）

### 3.3 F2 — 本机队列 Worker

**程序**：`crawler/queue_worker.py`（新增）

**运行方式**：
- 新增 `crawler/start_worker.bat`，与 `start_crawler.bat` 一并启动
- 轮询间隔：30 秒（可配置 `QUEUE_POLL_SECONDS`）

**处理流程**：

```
1. SELECT * FROM crawl_queue
   WHERE status = 'pending'
   ORDER BY create_time ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED  -- 或等价乐观锁

2. UPDATE status = 'running', started_at = now()

3. POST http://127.0.0.1:8080/crawl
   Body: { keyword, min_items, max_items, interval_seconds }

4. 成功：
   - enrichProducts（偏好评分）
   - UPSERT product_data
   - UPDATE price_trend
   - UPDATE crawl_queue status = 'done', item_count, finished_at
   - INSERT crawl_logs

5. 失败：
   - UPDATE crawl_queue status = 'failed', error_message
   - 若有 notify_email → 调用邮件 API 或本地 SMTP

6. 休眠 30s，循环
```

**约束**：
- 单 Worker 串行执行（避免同一闲鱼账号并发爬取）
- 爬虫服务不可达时：任务保持 `pending` 或标记 `failed`（连续 3 次不可达则 failed）
- Worker 启动时打印：Supabase 连接状态、爬虫健康检查

### 3.4 F3 — 任务状态查询

**API**：`GET /api/crawl/queue?jobId=xxx`

**响应示例**：

```json
{
  "jobId": "uuid",
  "status": "running",
  "keyword": "iPhone 15 Pro",
  "itemCount": 0,
  "queuePosition": 0,
  "createdAt": "2026-05-27T10:00:00Z",
  "startedAt": "2026-05-27T10:01:00Z",
  "finishedAt": null,
  "error": null
}
```

**前端轮询策略**：
- 间隔：5 秒
- 最长：15 分钟（超时提示「电脑可能未开机，请联系管理员」）
- `done` → 跳转 `/results?keyword=xxx&jobId=xxx`
- `failed` → 展示错误 + 重试按钮

**UI 组件**：扩展 `CrawlProgress.tsx`，新增状态：
- `queued` — 排队中（显示队列位置）
- `waiting_worker` — 等待电脑上线
- `running` — 爬取中（沿用现有动画）
- `done` / `failed`

### 3.5 F4 — 结果云端展示

**页面**：`/results?keyword=xxx`

**数据加载优先级**（调整后）：

```
1. sessionStorage（本机刚爬完，最快）
2. GET /api/crawl/results（本机 .crawl-cache，仅 localhost 有效）
3. GET /api/products?keyword=xxx（Supabase product_data）  ← 远程主路径
4. MOCK 演示数据（兜底）
```

**展示要求**：
- 有真实数据时不显示「演示数据」徽章
- 显示 `crawl_time` 最近更新时间
- 空结果时区分：「从未爬取」「爬取中」「爬取失败」

### 3.6 F5 — 邮件通知（沿用 + 扩展）

复用 v6.6：
- `src/lib/crawl-email.ts`
- `NotifySettingsCard.tsx`

**扩展**：
- 队列任务完成（`done` / `failed` / `empty`）后，Vercel `after()` 或 Worker 触发邮件
- 邮件正文含：`keyword`、商品数、Top 3 商品、结果页链接（Vercel URL）

### 3.7 F6 — 限流与防滥用

| 规则 | 默认值 | 配置项 |
|------|--------|--------|
| 每 user_id 每日手动爬取 | 3 次 | `CONFIG.crawl.maxManualPerDay` |
| 单关键词最短重爬间隔 | 30 分钟 | 新增 `minResubmitMinutes` |
| 队列最大积压 | 20 条 | 超出返回 503「系统繁忙」 |
| 关键词长度 | 2–50 字符 | 校验 |

**运营者豁免**（可选）：`OWNER_USER_ID` 环境变量不限流。

### 3.7 F7 — 本机同步模式（兼容）

运营者在本机 `localhost:3000` 且配置了 `CRAWLER_ENDPOINT` 时：
- **默认**：仍走同步爬取（即时返回结果，体验与 v6.6 相同）
- **可选开关**：`PREFER_QUEUE=true` 强制走队列（用于联调远程流程）

---

## 四、数据模型

### 4.1 新增表：`crawl_queue`

```sql
CREATE TABLE IF NOT EXISTS crawl_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  preference JSONB,
  notify_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | running | done | failed | cancelled
  item_count INT DEFAULT 0,
  error_message TEXT,
  queue_position INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  worker_id VARCHAR(100)
);

CREATE INDEX idx_queue_status_created ON crawl_queue(status, created_at);
CREATE INDEX idx_queue_user ON crawl_queue(user_id);
```

### 4.2 既有表（沿用）

| 表名 | 用途 |
|------|------|
| `product_data` | 爬取商品持久化 |
| `user_preference` | 用户偏好模板 |
| `price_trend` | 价格走势 |
| `crawl_logs` | 审计日志 |
| `task_schedule` | 定时任务（v7 不改动） |
| `price_alerts` | 低价提醒（v7 不改动） |

### 4.3 状态机

```
pending ──(worker 认领)──▶ running ──(成功)──▶ done
                              │
                              └──(失败)──▶ failed

pending ──(超时 24h)──▶ cancelled（可选定时清理）
```

---

## 五、接口规格

### 5.1 API 变更摘要

| 方法 | 路径 | 变更 |
|------|------|------|
| POST | `/api/crawl` | 增加远程队列分支 |
| GET | `/api/crawl/queue` | **新增** 查询任务状态 |
| GET | `/api/crawl` | 增加 `queueEnabled` 字段 |
| POST | `/api/products` | Worker 回写结果（已有，复用） |

### 5.2 POST `/api/crawl` 远程模式请求体

```typescript
{
  keyword: string;
  userId: string;
  preference?: UserPreference;
  notifyEmail?: string;
  backgroundNotify?: boolean;
  triggerType?: "manual";
}
```

### 5.3 错误码

| HTTP | 场景 |
|------|------|
| 400 | 参数缺失、邮箱格式错误 |
| 429 | 日限额、重爬间隔未到 |
| 503 | 队列积压超限、Supabase 不可用 |
| 502 | 本机模式下爬虫执行失败 |

---

## 六、用户流程

### 6.1 远程用户（主流程）

```
首页输入关键词
    → 偏好问卷页
    → 填写邮箱（可选）→ 点「启动爬取」
    → 提示「已提交，排队中」
    → CrawlProgress 轮询状态
    → 完成 → 结果页（Supabase 真实数据）
    → 可选：收到邮件通知
```

### 6.2 运营者（日常运维）

```
1. 开机后双击：
   - crawler\start_crawler.bat
   - crawler\start_worker.bat
   - 启动网站.bat（仅本地调试时需要）

2. 确认闲鱼登录态有效（browser_profile）

3. 观察 Worker 日志：
   - 「拉取任务 keyword=xxx」
   - 「爬取完成 25 条」

4. 电脑休眠/关机前：知晓远程用户任务将排队等待
```

### 6.3 本机调试流程（不变）

```
localhost:3000 → 搜索 → 爬取 → 同步返回 → sessionStorage → 结果页
```

---

## 七、非功能需求

### 7.1 性能

| 指标 | 目标 |
|------|------|
| 任务提交 API 响应 | < 500ms |
| 单次爬取耗时 | 3–10 分钟（20–30 条 × 30s 间隔） |
| 状态轮询间隔 | 5s |
| Worker 轮询间隔 | 30s |
| 结果页加载 | < 2s（50 条以内） |

### 7.2 可用性

| 场景 | 预期 |
|------|------|
| 电脑在线 + Worker 运行 | 远程任务正常完成 |
| 电脑关机 | 任务保持 pending，上线后继续 |
| 爬虫崩溃 | 任务 failed，用户看到错误 |
| Supabase 宕机 | 提交失败，友好提示 |
| Vercel 在国内慢 | 可访问但加载慢（已知限制） |

### 7.3 安全

- `CRAWL_API_SECRET`：爬虫与 Worker 鉴权
- `SUPABASE_SERVICE_ROLE_KEY`：仅服务端 / Worker 使用，不进前端
- 队列 API 不暴露其他用户任务详情（需 `jobId` + `userId` 匹配）
- 不公开运营者爬虫端口（无 ngrok 公网暴露）

### 7.4 合规

- 轻量 RPA，模拟人工浏览
- 仅采集公开商品信息
- 运营者个人账号，非批量商用
- 用户协议注明：数据仅供参考，来源为闲鱼

---

## 八、配置清单

### 8.1 Vercel 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRAWL_API_SECRET=随机长字符串
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=xxx@qq.com
SMTP_PASS=授权码
SMTP_FROM=闲鱼AI <xxx@qq.com>
# 注意：不设置 CRAWLER_ENDPOINT
```

### 8.2 本机 `.env.local`（完整）

```env
# Supabase（与 Vercel 相同）
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# 本机爬虫
CRAWLER_ENDPOINT=http://127.0.0.1:8080/crawl
CRAWL_API_SECRET=与 Vercel 相同

# Worker
QUEUE_POLL_SECONDS=30
WORKER_ID=surface-home-pc

# SMTP（可选，Worker 本地发信时用）
SMTP_HOST=smtp.qq.com
...
```

---

## 九、交付物与里程碑

### 9.1 里程碑

| 阶段 | 内容 | 预估工时 |
|------|------|----------|
| M1 | Supabase 建表 + 环境配置文档 | 0.5 天 |
| M2 | `crawl_queue` API + `/api/crawl` 队列分支 | 1 天 |
| M3 | `queue_worker.py` + 启动脚本 | 1 天 |
| M4 | 前端 CrawlProgress 队列态 + 结果页改造 | 1 天 |
| M5 | 邮件通知 + 限流 + 联调 | 0.5 天 |
| M6 | `npm run verify` 扩展 + 端到端验收 | 0.5 天 |

**合计**：约 4–5 天（含联调）

### 9.2 代码交付清单

```
supabase/schema.sql              -- 新增 crawl_queue 表
src/app/api/crawl/route.ts       -- 远程队列分支
src/app/api/crawl/queue/route.ts -- 新增
src/lib/crawl-queue.ts           -- 新增队列操作封装
crawler/queue_worker.py          -- 新增
crawler/start_worker.bat         -- 新增
src/components/CrawlProgress.tsx -- 扩展队列 UI
src/app/preferences/page.tsx     -- 队列响应处理
src/app/results/page.tsx         -- 云端结果优先
scripts/verify.mjs               -- 队列 API 测试
```

### 9.3 文档交付

- 本 PRD
- `DEPLOY.md` 增补「远程队列模式」章节
- `README.md` 更新启动说明（Worker）

---

## 十、验收标准

### 10.1 功能验收

- [ ] 手机访问 Vercel，提交关键词后返回 `queued` 与 `jobId`
- [ ] 本机 Worker 在 30s 内拉取任务并执行爬取
- [ ] 爬取完成后 Supabase `product_data` 有对应关键词数据
- [ ] 手机结果页展示真实商品，无「演示数据」标
- [ ] 填写邮箱后收到完成通知邮件
- [ ] 电脑关机期间提交的任务，开机后自动继续执行
- [ ] 本机 `localhost` 同步爬取仍正常工作
- [ ] 超日限额时返回 429

### 10.2 回归验收

- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过
- [ ] `npm run verify` 通过（≥11 项）
- [ ] v6.6 已有功能：首页趋势、偏好问卷、AI 评分、过滤排序不受影响

---

## 十一、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 运营者电脑不常开 | 远程任务长时间 pending | 前端明确提示；邮件可选「电脑上线后通知」 |
| 闲鱼登录失效 | 批量任务失败 | Worker 检测登录页，failed + 运营者告警 |
| Vercel 国内访问慢 | 用户体验差 | v8 考虑阿里云；短期接受 |
| 滥用刷队列 | 运营者电脑负载 | 日限额 + 队列上限 |
| Supabase 免费额度 | 存储/API 超限 | 定期清理旧任务；商品 upsert 去重 |
| 共用闲鱼账号 | 风控/封号 | 保持低频；间隔 ≥30s；单日任务量可控 |

---

## 十二、版本规划

| 版本 | 范围 |
|------|------|
| **v7.0** | 远程队列（本 PRD） |
| v7.1 | 运营者队列监控页、任务取消 |
| v8.0 | 阿里云国内部署 + 备案域名 |
| v8.1 | 多 Worker 高可用（仍单账号串行爬） |

---

## 十三、附录

### A. 名词解释

| 术语 | 含义 |
|------|------|
| Owner | 运营者，电脑与闲鱼账号持有者 |
| Worker | 本机常驻进程，消费 `crawl_queue` |
| 远程模式 | Vercel 无爬虫，走队列 |
| 本机模式 | 有 `CRAWLER_ENDPOINT`，同步爬取 |

### B. 参考链接

- 线上站点：https://xianyu-ai.vercel.app/
- 代码仓库：https://github.com/westbrook7007/xianyu-ai
- 基线标签：`v6.6`

### C. 决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-05-27 | 采用方案 4 + 云端队列 | 零爬虫服务器成本，满足远程提交 |
| 2026-05-27 | v7 引入 Supabase | 远程与本机数据桥接必需 |
| 2026-05-27 | 单 Worker 串行 | 单闲鱼账号不宜并发爬取 |

---

*本文档可直接作为 Cursor AI 的开发输入。评审通过后可进入 M1 实施。*
