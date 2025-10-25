// 新增: 数据库迁移 - 订阅管理系统
// supabase/migrations/008_add_subscription_system.sql

-- 订阅计划表
CREATE TABLE subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 用户订阅表
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 使用记录表
CREATE TABLE usage_records (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL, -- 'conversation', 'api_call', 'group_chat'
  amount INTEGER NOT NULL DEFAULT 1,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- 计费记录表
CREATE TABLE billing_records (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES user_subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMPTZ
);

-- 插入默认订阅计划
INSERT INTO subscription_plans (name, display_name, price_monthly, price_yearly, features, limits) VALUES
('free', '免费版', 0, 0, 
 '{"conversations": true, "ai_roles": ["孙悟空", "李白"], "group_chats": 1}', 
 '{"monthly_conversations": 100, "concurrent_group_chats": 1}'),

('pro', '专业版', 19.00, 190.00, 
 '{"conversations": true, "ai_roles": "all", "group_chats": 5, "api_access": true, "export_data": true}', 
 '{"monthly_conversations": -1, "concurrent_group_chats": 5}'),

('enterprise', '企业版', 99.00, 990.00, 
 '{"conversations": true, "ai_roles": "all", "group_chats": -1, "api_access": "full", "white_label": true, "support": "premium"}', 
 '{"monthly_conversations": -1, "concurrent_group_chats": -1}');

-- 创建索引
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_timestamp ON usage_records(timestamp);
CREATE INDEX idx_billing_records_user_id ON billing_records(user_id);

-- RLS 策略
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- 订阅计划的读取策略（公开）
CREATE POLICY "允许读取活跃订阅计划" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- 用户订阅的访问策略
CREATE POLICY "用户只能访问自己的订阅" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 使用记录的访问策略
CREATE POLICY "用户只能查看自己的使用记录" ON usage_records
  FOR SELECT USING (auth.uid() = user_id);

-- 计费记录的访问策略
CREATE POLICY "用户只能查看自己的账单" ON billing_records
  FOR SELECT USING (auth.uid() = user_id);

-- 系统服务角色可以插入使用记录
CREATE POLICY "系统可以插入使用记录" ON usage_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "系统可以插入账单记录" ON billing_records
  FOR INSERT WITH CHECK (true);