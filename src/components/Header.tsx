"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fish, User, Bell } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/preferences", label: "偏好设置" },
  { href: "/results", label: "选品结果" },
  { href: "/profile", label: "个人中心" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 glass border-b border-orange-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-600">
          <Fish className="h-7 w-7" />
          <span>闲鱼AI选品</span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "type-nav rounded-lg px-3 py-2 transition",
                pathname === item.href
                  ? "bg-brand-100 text-brand-700"
                  : "text-gray-600 hover:bg-orange-50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/profile" className="rounded-lg p-2 text-gray-500 hover:bg-orange-50">
            <Bell className="h-5 w-5" />
          </Link>
          <Link href="/profile" className="rounded-lg p-2 text-gray-500 hover:bg-orange-50">
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
