-- 仅创建远程爬取队列表（在 Supabase SQL Editor 中 Run 一次即可）

CREATE TABLE IF NOT EXISTS crawl_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  preference JSONB,
  notify_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  item_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  worker_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_queue_status_created ON crawl_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_user ON crawl_queue(user_id);

-- 仅服务端（service_role）访问，禁止匿名直连
ALTER TABLE crawl_queue ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
