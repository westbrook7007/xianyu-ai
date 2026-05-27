# Vercel 一步步部署指南（小白版）

> 预计耗时：30～45 分钟  
> 费用：**0 元**（Vercel + Supabase 免费版）

---

## 部署后能做什么？

| 功能 | 线上（Vercel） | 说明 |
|------|----------------|------|
| 打开网站、看界面 | ✅ | 发链接给朋友即可 |
| 演示数据 / 已有数据 | ✅ | 不配数据库也能用演示模式 |
| 真实爬取闲鱼 | ⚠️ | 爬虫仍在你电脑或 Replit 上跑 |
| 多人共享价格历史 | ✅ | 配置 Supabase 后 |

---

## 第 1 步：注册 GitHub（5 分钟）

1. 打开 https://github.com/signup 注册账号
2. 登录后点击右上角 **+** → **New repository**
3. 填写：
   - Repository name：`xianyu-ai`
   - 选 **Public**
   - **不要**勾选 "Add a README"
4. 点 **Create repository**
5. **记下仓库地址**，类似：`https://github.com/你的用户名/xianyu-ai.git`

---

## 第 2 步：把代码上传到 GitHub（10 分钟）

在 Cursor 里打开终端，**逐行**执行（把下面地址换成你的）：

```powershell
cd c:\Cursorfile\xianyu-ai

git init
git add .
git commit -m "Initial commit: xianyu-ai deploy ready"
git branch -M main
git remote add origin https://github.com/你的用户名/xianyu-ai.git
git push -u origin main
```

> 第一次 push 会弹出 GitHub 登录窗口，按提示登录即可。

---

## 第 3 步：注册 Supabase 数据库（10 分钟，可选但推荐）

1. 打开 https://supabase.com → **Start your project** → 用 GitHub 登录
2. **New project**：
   - Name：`xianyu-ai`
   - Database Password：自己设一个（记下来）
   - Region：选 **Northeast Asia (Tokyo)** 离中国近
3. 等 1～2 分钟项目创建完成
4. 左侧 **SQL Editor** → **New query**
5. 打开本地文件 `c:\Cursorfile\xianyu-ai\supabase\schema.sql`，**全选复制**，粘贴到 SQL Editor
6. 点 **Run**（绿色按钮）
7. 左侧 **Settings** → **API**，复制这三项（先存到记事本）：

| 名称 | 填到 Vercel 的变量名 |
|------|---------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role | `SUPABASE_SERVICE_ROLE_KEY` |

> 暂时跳过 Supabase 也能部署，网站会以演示模式运行。

---

## 第 4 步：部署到 Vercel（10 分钟）

1. 打开 https://vercel.com → **Sign Up** → 选 **Continue with GitHub**
2. 登录后点 **Add New…** → **Project**
3. 找到 `xianyu-ai` 仓库 → **Import**
4. 配置页面：
   - **Framework Preset**：Next.js（自动识别）
   - **Root Directory**：留空
   - **Build Command**：`npm run build`（默认）
   - **Output Directory**：留空（默认）

5. 展开 **Environment Variables**，添加：

### 必填（先填这些就能上线）

| Key | Value | 说明 |
|-----|-------|------|
| `CRAWL_API_SECRET` | 随便一串字母数字，如 `my-secret-2026-abc` | 爬虫鉴权密钥 |

### 如果配置了 Supabase（推荐）

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |

### 部署完成后补填

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_APP_URL` | 你的 Vercel 地址，如 `https://xianyu-ai.vercel.app` |

> `CRAWLER_ENDPOINT` 先不填 → 线上为演示模式；真实爬取见第 6 步。

6. 点 **Deploy**
7. 等待 1～2 分钟，出现 🎉 **Congratulations!**
8. 点 **Visit** 打开网站

**你的公网地址类似：** `https://xianyu-ai-xxx.vercel.app`

---

## 第 5 步：补全环境变量（2 分钟）

1. Vercel 项目页 → **Settings** → **Environment Variables**
2. 添加：
   ```
   NEXT_PUBLIC_APP_URL = https://你的实际域名.vercel.app
   ```
3. **Deployments** → 最新部署右侧 **⋯** → **Redeploy**

---

## 第 6 步：线上真实爬取（可选，进阶）

Vercel 不能跑 Chrome 爬虫，有三种方案：

### 方案 A：你电脑跑爬虫 + 网站已上线（最简单）

1. 电脑继续运行 `start_crawler.bat`
2. 安装 [ngrok](https://ngrok.com/)（免费）
3. 终端执行：`ngrok http 8080`
4. 复制 ngrok 给的 https 地址，如 `https://abc123.ngrok.io`
5. 在 Vercel 添加环境变量：
   ```
   CRAWLER_ENDPOINT = https://abc123.ngrok.io/crawl
   CRAWL_API_SECRET = 与本地相同
   ```
6. Redeploy

> 缺点：电脑要开着，ngrok 免费版地址会变。

### 方案 B：演示模式分享（零配置）

不填 `CRAWLER_ENDPOINT`，朋友打开网站能体验全部界面和演示数据。

### 方案 C：Replit 托管爬虫

见 `DEPLOY.md` 第三步。

---

## 第 7 步：分享给朋友

直接把 Vercel 链接发出去，例如：

```
https://xianyu-ai-xxx.vercel.app
```

---

## 以后更新功能怎么做？

```powershell
cd c:\Cursorfile\xianyu-ai
# 改完代码、本地测试 OK 后：
git add .
git commit -m "更新说明"
git push
```

Vercel 会**自动**重新部署，1～2 分钟后线上更新。

---

## 常见问题

**Q: Deploy 失败？**  
看 Vercel 的 **Build Logs**，通常是环境变量填错。本地先跑 `npm run build` 确认能通过。

**Q: 打开网站是空的？**  
没配 Supabase 时正常，用演示模式；搜索 `iPhone 15 Pro` 可看到示例数据。

**Q: 线上不能爬取？**  
需要配置 `CRAWLER_ENDPOINT` 指向正在运行的爬虫服务。

**Q: 要自定义域名？**  
Vercel → Settings → Domains → 添加你的域名（可选，免费二级域名已够用）。

---

## 检查清单

- [ ] GitHub 仓库已创建，代码已 push
- [ ] Supabase 已建表（可选）
- [ ] Vercel Deploy 成功
- [ ] `NEXT_PUBLIC_APP_URL` 已填写并 Redeploy
- [ ] 浏览器能打开 Vercel 链接
- [ ] 发给朋友测试
