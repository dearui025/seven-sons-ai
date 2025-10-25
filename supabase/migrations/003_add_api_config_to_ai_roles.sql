-- 为 AI 角色新增 API 配置字段，用于保存各角色的模型提供商、API Key、模型、温度、最大 Token、系统提示词等
ALTER TABLE ai_roles
ADD COLUMN IF NOT EXISTS api_config JSONB DEFAULT '{}' NOT NULL;

-- 可选：为已有数据填充一个合理的默认结构，避免前端读取出错
UPDATE ai_roles
SET api_config = COALESCE(api_config, '{"provider":"openai","apiKey":"","model":"gpt-3.5-turbo","temperature":0.7,"maxTokens":2048,"systemPrompt":"","host":""}'::jsonb);