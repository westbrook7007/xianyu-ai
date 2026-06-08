/**
 * Supabase 一键配置
 * 用法: node scripts/setup-supabase.mjs
 *
 * 模式 A（推荐）: 设置环境变量 SUPABASE_ACCESS_TOKEN 后全自动建项目+建表
 * 模式 B: 交互粘贴 Project URL / anon / service_role / 数据库密码
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const SCHEMA_FILE = path.join(ROOT, "supabase", "schema.sql");

const SUPABASE_API = "https://api.supabase.com/v1";

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function randomPassword(len = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function api(token, method, pathSuffix, body) {
  const res = await fetch(`${SUPABASE_API}${pathSuffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }
  if (!res.ok) throw new Error(json.message || json.error || text);
  return json;
}

async function waitProjectReady(token, ref, maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const p = await api(token, "GET", `/projects/${ref}`);
    if (p.status === "ACTIVE_HEALTHY") return p;
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 8000));
  }
  throw new Error("项目创建超时，请稍后在 Supabase 控制台确认状态后重试");
}

async function listOrganizations(token) {
  const orgs = await api(token, "GET", "/organizations");
  return Array.isArray(orgs) ? orgs : [];
}

async function waitForOrganization(token) {
  let orgs = await listOrganizations(token);
  if (orgs.length) return orgs[0].id;

  console.log("\n⚠ 你的 Supabase 账号还没有「组织」（新账号常见）。");
  console.log("请按下面步骤操作（约 2 分钟）：");
  console.log("  1. 浏览器打开 https://supabase.com/dashboard");
  console.log("  2. 点击 New project，随便填项目名（如 xianyu-ai）");
  console.log("  3. 设数据库密码并创建（创建项目会自动建好组织）");
  console.log("  4. 回到本窗口按 Enter 继续\n");

  try {
    const { execSync } = await import("child_process");
    execSync("start https://supabase.com/dashboard/new/new-project", { stdio: "ignore" });
  } catch {
    /* ignore */
  }

  await ask("在网页创建好项目后，按 Enter 继续...");
  orgs = await listOrganizations(token);
  if (!orgs.length) {
    console.log("\n仍未检测到组织。改用「手动粘贴密钥」模式更稳妥。");
    return null;
  }
  return orgs[0].id;
}

async function createProjectAuto(token) {
  const orgId = await waitForOrganization(token);
  if (!orgId) return null;
  const dbPass = randomPassword();
  console.log("\n正在创建 Supabase 项目 xianyu-ai ...");
  const project = await api(token, "POST", "/projects", {
    organization_id: orgId,
    name: "xianyu-ai",
    db_pass: dbPass,
    region: "ap-northeast-1",
  });
  console.log(`\n项目 ref=${project.id}，等待就绪（约 1–3 分钟）`);
  await waitProjectReady(token, project.id);
  console.log("\n项目已就绪");

  const keys = await api(token, "GET", `/projects/${project.id}/api-keys`);
  const anon = keys.find((k) => k.name === "anon")?.api_key;
  const service = keys.find((k) => k.name === "service_role")?.api_key;
  const url = `https://${project.id}.supabase.co`;

  return { url, anon, service, dbPass, projectRef: project.id };
}

async function applySchemaWithPg(projectRef, dbPass) {
  let pg;
  try {
    pg = (await import("pg")).default;
  } catch {
    console.log("\n正在安装 pg 依赖以自动建表...");
    const { execSync } = await import("child_process");
    execSync("npm install pg --no-save", { cwd: ROOT, stdio: "inherit" });
    pg = (await import("pg")).default;
  }

  const sql = fs.readFileSync(SCHEMA_FILE, "utf-8");
  const connStr = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPass)}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;
  const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✓ 数据库表结构已创建");
  } finally {
    await client.end();
  }
}

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const map = {};
  for (const line of fs.readFileSync(ENV_FILE, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

function upsertEnv(updates) {
  let lines = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf-8").split(/\r?\n/) : [];
  const keys = new Set(Object.keys(updates));
  lines = lines.filter((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    return !(m && keys.has(m[1]));
  });
  for (const [k, v] of Object.entries(updates)) {
    if (v) lines.push(`${k}=${v}`);
  }
  fs.writeFileSync(ENV_FILE, lines.join("\n").replace(/\n+$/, "\n"), "utf-8");
}

async function verifyConnection(url, serviceKey) {
  const sb = createClient(url, serviceKey);
  const { error } = await sb.from("crawl_logs").select("id", { count: "exact", head: true });
  if (error && error.message.includes("does not exist")) {
    return false;
  }
  if (error) throw new Error(error.message);
  return true;
}

async function manualMode() {
  console.log("\n=== 手动模式（粘贴密钥）===\n");
  console.log("1. 打开 https://supabase.com/dashboard 创建项目");
  console.log("2. Settings → API Keys 复制 Publishable key 和 Secret key");
  console.log("   （新项目没有 anon/service_role，用 sb_publishable_ / sb_secret_ 即可）");
  console.log("3. Settings → Database 复制数据库密码\n");

  const url = await ask("Project URL: ");
  const anon = await ask("Publishable key (sb_publishable_... 或 anon): ");
  const service = await ask("Secret key (sb_secret_... 或 service_role): ");
  const dbPass = await ask("Database password: ");
  const projectRef = url.replace("https://", "").replace(".supabase.co", "");

  return { url, anon, service, dbPass, projectRef };
}

async function tryVercelEnv(updates) {
  try {
    const { execSync } = await import("child_process");
    execSync("npx vercel whoami", { cwd: ROOT, stdio: "pipe" });
    console.log("\n检测到 Vercel 已登录，正在同步环境变量...");
    for (const [key, val] of Object.entries(updates)) {
      if (!val || key === "CRAWLER_ENDPOINT") continue;
      try {
        execSync(`npx vercel env rm ${key} production --yes`, { cwd: ROOT, stdio: "pipe" });
      } catch {
        /* ignore */
      }
      execSync(`npx vercel env add ${key} production`, {
        cwd: ROOT,
        input: val,
        stdio: ["pipe", "inherit", "inherit"],
      });
    }
    console.log("✓ Vercel 环境变量已更新（请到 Vercel 控制台 Redeploy）");
  } catch {
    console.log("\n未登录 Vercel CLI，请手动在 Vercel 控制台添加环境变量后 Redeploy");
  }
}

async function main() {
  console.log("=== 闲鱼AI Supabase 一键配置 ===\n");

  let creds;
  const token = process.env.SUPABASE_ACCESS_TOKEN;

  if (token) {
    creds = await createProjectAuto(token);
    if (!creds) creds = await manualMode();
  } else {
    console.log("未检测到 SUPABASE_ACCESS_TOKEN。");
    console.log("全自动建项目：打开 https://supabase.com/dashboard/account/tokens");
    console.log("创建 Token 后执行: set SUPABASE_ACCESS_TOKEN=sbp_xxx && node scripts/setup-supabase.mjs\n");
    const mode = await ask("按 Enter 使用手动粘贴模式，或输入 token 继续全自动: ");
    if (mode.startsWith("sbp_")) {
      process.env.SUPABASE_ACCESS_TOKEN = mode;
      creds = await createProjectAuto(mode);
    } else {
      creds = await manualMode();
    }
  }

  const { url, anon, service, dbPass, projectRef } = creds;

  console.log("\n正在写入 .env.local ...");
  const existing = readEnvFile();
  const crawlSecret = existing.CRAWL_API_SECRET || "xianyu-local-secret-2026";
  const appUrl = existing.NEXT_PUBLIC_APP_URL || "https://xianyu-ai.vercel.app";
  upsertEnv({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
    CRAWL_API_SECRET: crawlSecret,
    CRAWLER_ENDPOINT: existing.CRAWLER_ENDPOINT || "http://127.0.0.1:8080/crawl",
    NEXT_PUBLIC_APP_URL: appUrl,
    WORKER_CALLBACK_URL:
      existing.WORKER_CALLBACK_URL || `${appUrl.replace(/\/$/, "")}/api/crawl/worker`,
  });
  console.log("✓ .env.local 已更新");

  const ok = await verifyConnection(url, service).catch(() => false);
  if (!ok) {
    console.log("\n正在执行建表 SQL ...");
    await applySchemaWithPg(projectRef, dbPass);
  } else {
    console.log("✓ 数据库连接正常，表已存在");
  }

  await tryVercelEnv({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
    CRAWL_API_SECRET: crawlSecret,
    NEXT_PUBLIC_APP_URL: appUrl,
  });

  console.log("\n=== 配置完成 ===");
  console.log("下一步：");
  console.log("  1. crawler\\start_crawler.bat");
  console.log("  2. crawler\\start_worker.bat");
  console.log("  3. Vercel Redeploy（若未自动同步）");
  console.log("  4. 别人打开 Vercel 链接提交搜索，你电脑自动爬取\n");
}

main().catch((e) => {
  console.error("\n配置失败:", e.message);
  process.exit(1);
});
