"use client";

import { Mail } from "lucide-react";
import type { NotifySettings } from "@/lib/user";

interface Props {
  settings: NotifySettings;
  onChange: (settings: NotifySettings) => void;
  emailConfigured?: boolean;
}

export default function NotifySettingsCard({ settings, onChange, emailConfigured }: Props) {
  return (
    <div className="mb-6 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Mail className="h-5 w-5 text-brand-500" />
        <h3 className="type-card-title">爬取完成邮件通知</h3>
      </div>
      <p className="type-subtitle mb-4">
        爬取耗时较长时，可开启后台模式，完成后自动发邮件到您的邮箱。
        {emailConfigured === false && (
          <span className="mt-1 block text-amber-600">
            提示：需在 .env.local 配置 SMTP 后才能实际发送邮件。
          </span>
        )}
      </p>

      <label className="mb-3 flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
        />
        <span className="type-body">爬取完成后发送邮件通知</span>
      </label>

      {settings.enabled && (
        <div className="space-y-3">
          <input
            type="email"
            value={settings.email}
            onChange={(e) => onChange({ ...settings, email: e.target.value })}
            placeholder="your@email.com"
            className="type-input w-full rounded-lg border border-gray-200 px-3 py-2"
          />
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={settings.backgroundNotify}
              onChange={(e) => onChange({ ...settings, backgroundNotify: e.target.checked })}
            />
            <span className="type-body text-gray-600">
              <strong>后台爬取</strong>（推荐）：提交后立即返回，无需等待；完成后邮件通知您查看结果
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
