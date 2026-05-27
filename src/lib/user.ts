export const USER_ID_KEY = "xianyu_ai_user_id";

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
