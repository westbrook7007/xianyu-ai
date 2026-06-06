const HISTORY_KEY = "xianyu_search_history";
const MAX_ITEMS = 8;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function addSearchKeyword(keyword: string): void {
  const kw = keyword.trim();
  if (!kw || typeof window === "undefined") return;
  const prev = getSearchHistory().filter((k) => k.toLowerCase() !== kw.toLowerCase());
  localStorage.setItem(HISTORY_KEY, JSON.stringify([kw, ...prev].slice(0, MAX_ITEMS)));
}
