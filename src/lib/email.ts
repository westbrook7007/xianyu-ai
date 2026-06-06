import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  const pass = process.env.SMTP_PASS?.trim() || "";
  const placeholder = !pass || pass.includes("授权码") || pass.includes("请在这里");
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && !placeholder);
}

function createTransport() {
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE !== "false";
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "未配置 SMTP（SMTP_HOST / SMTP_USER / SMTP_PASS）" };
  }

  const to = options.to.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "收件邮箱格式无效" };
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "发送失败";
    return { ok: false, error: msg };
  }
}
