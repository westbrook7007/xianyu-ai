import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "闲鱼AI智能比价选品",
  description: "避黄牛 · AI个性化匹配 · 价格监控 · 定时提醒 — 零成本开源部署",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="border-t border-orange-100 py-6 text-center text-sm text-gray-500">
          数据来源：闲鱼公开商品信息 · 仅供个人参考 · 开源免费部署
        </footer>
      </body>
    </html>
  );
}
