export const USER_ID_KEY = "xianyu_ai_user_id";
const NOTIFY_KEY = "xianyu_notify_settings";

export interface NotifySettings {
  email: string;
  enabled: boolean;
  /** 后台爬取，完成后邮件通知（适合耗时较长的任务） */
  backgroundNotify: boolean;
}

const DEFAULT_NOTIFY: NotifySettings = {
  email: "",
  enabled: false,
  backgroundNotify: true,
};

export function getUserId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function savePreferenceTemplate(data: unknown): void {
  localStorage.setItem("xianyu_pref_template", JSON.stringify(data));
}

export function loadPreferenceTemplate<T>(): T | null {
  const raw = localStorage.getItem("xianyu_pref_template");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadNotifySettings(): NotifySettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFY;
  try {
    const raw = localStorage.getItem(NOTIFY_KEY);
    if (!raw) return DEFAULT_NOTIFY;
    return { ...DEFAULT_NOTIFY, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFY;
  }
}

export function saveNotifySettings(settings: NotifySettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFY_KEY, JSON.stringify(settings));
}
