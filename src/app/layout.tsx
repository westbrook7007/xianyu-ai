import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: "闲鱼比价助手 — 标品二手比价工具",
  description: "手机 / 无人机 / 球星签名鞋标品比价 · 过滤黄牛 · 好价提醒 · 邮件通知",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-4">{children}</main>
        <footer className="type-caption border-t border-orange-100 py-4 text-center">
          数据来源：闲鱼公开商品信息 · 仅供个人参考 · 站内不交易，点击跳转闲鱼下单 · v{APP_VERSION}
        </footer>
      </body>
    </html>
  );
}
