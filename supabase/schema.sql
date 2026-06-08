-- 闲鱼AI智能比价选品 - Supabase 数据库结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 商品数据表
CREATE TABLE IF NOT EXISTS product_data (
  id BIGSERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  price FLOAT NOT NULL,
  original_price FLOAT,
  avg_price FLOAT,
  quality VARCHAR(100),
  service VARCHAR(255),
  service_day INT DEFAULT 0,
  seller_id VARCHAR(100),
  seller_level VARCHAR(50),
  seller_bio TEXT,
  seller_item_count INT DEFAULT 0,
  seller_type INT DEFAULT 1, -- 1个人 2黄牛
  life_level INT DEFAULT 3, -- 1-5星
  ai_score FLOAT DEFAULT 0,
  flaw_desc TEXT,
  description TEXT,
  publish_time TIMESTAMPTZ,
  crawl_time TIMESTAMPTZ DEFAULT NOW(),
  product_url VARCHAR(1000) UNIQUE,
  is_filtered BOOLEAN DEFAULT FALSE,
  price_position VARCHAR(20) -- 偏高/正常/好价/史低
);

CREATE INDEX IF NOT EXISTS idx_product_keyword ON product_data(keyword);
CREATE INDEX IF NOT EXISTS idx_product_crawl_time ON product_data(crawl_time);
CREATE INDEX IF NOT EXISTS idx_product_ai_score ON product_data(ai_score DESC);

-- 用户偏好表
CREATE TABLE IF NOT EXISTS user_preference (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  quality_limit VARCHAR(50) NOT NULL,
  life_priority VARCHAR(50) NOT NULL,
  service_demand VARCHAR(50) NOT NULL,
  max_price FLOAT,
  accept_premium BOOLEAN DEFAULT FALSE,
  seller_preference VARCHAR(50) DEFAULT 'excellent',
  category VARCHAR(50) DEFAULT 'general',
  is_default BOOLEAN DEFAULT FALSE,
  create_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pref_user ON user_preference(user_id);

-- 价格波动表
CREATE TABLE IF NOT EXISTS price_trend (
  id BIGSERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  min_price FLOAT NOT NULL,
  max_price FLOAT NOT NULL,
  avg_price FLOAT NOT NULL,
  product_count INT DEFAULT 0,
  UNIQUE(keyword, date)
);

CREATE INDEX IF NOT EXISTS idx_trend_keyword ON price_trend(keyword);

-- 定时任务表
CREATE TABLE IF NOT EXISTS task_schedule (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  task_time VARCHAR(10) DEFAULT '10:00',
  task_status INT DEFAULT 1, -- 1开启 0关闭
  remind_threshold FLOAT DEFAULT 0.8,
  create_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_user ON task_schedule(user_id);

-- 低价提醒记录
CREATE TABLE IF NOT EXISTS price_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  product_url VARCHAR(1000),
  title VARCHAR(500),
  price FLOAT,
  alert_type VARCHAR(30), -- good_deal / historic_low
  ai_score FLOAT,
  is_read BOOLEAN DEFAULT FALSE,
  create_time TIMESTAMPTZ DEFAULT NOW()
);

-- 爬取日志
CREATE TABLE IF NOT EXISTS crawl_logs (
  id BIGSERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL,
  user_id VARCHAR(100),
  trigger_type VARCHAR(20), -- manual / scheduled
  item_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success',
  message TEXT,
  create_time TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 Row Level Security（匿名用户只读公共数据）
ALTER TABLE product_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_trend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products" ON product_data FOR SELECT USING (true);
CREATE POLICY "Public read trends" ON price_trend FOR SELECT USING (true);

-- 允许 service role 写入（后端/爬虫使用 service key）
CREATE POLICY "Service insert products" ON product_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert trends" ON price_trend FOR INSERT WITH CHECK (true);

-- 远程爬取任务队列（v7）
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
