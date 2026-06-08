/** 商品反馈收集（PRD R6） */

export type ProductFeedback = {
  productUrl: string;
  keyword: string;
  helpful: boolean;
  ordered?: boolean;
  userId?: string;
  timestamp: string;
};

const feedbackStore: ProductFeedback[] = [];
const MAX = 200;

export function saveFeedback(entry: Omit<ProductFeedback, "timestamp">) {
  feedbackStore.unshift({ ...entry, timestamp: new Date().toISOString() });
  if (feedbackStore.length > MAX) feedbackStore.pop();
}

export function getFeedbackStats() {
  const total = feedbackStore.length;
  const helpful = feedbackStore.filter((f) => f.helpful).length;
  const ordered = feedbackStore.filter((f) => f.ordered).length;
  return { total, helpful, ordered, recent: feedbackStore.slice(0, 20) };
}
