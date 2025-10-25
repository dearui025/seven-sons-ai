-- 创建AI角色独立对话历史表
-- 用于防止角色间的上下文混淆，每个角色维护独立的对话记录
CREATE TABLE ai_conversations (
  id SERIAL PRIMARY KEY,
  bot_name TEXT NOT NULL,
  user_id UUID,
  session_id TEXT NOT NULL, -- 会话标识符
  messages JSONB NOT NULL DEFAULT '[]', -- 存储对话上下文
  memory_snippets JSONB DEFAULT '[]', -- 角色记忆片段
  conversation_summary TEXT, -- 对话摘要
  last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_ai_conversations_bot_session ON ai_conversations(bot_name, session_id);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_last_message ON ai_conversations(last_message_at);

-- 添加注释
COMMENT ON TABLE ai_conversations IS '存储每个AI角色的独立对话历史，防止角色间上下文混淆';
COMMENT ON COLUMN ai_conversations.bot_name IS 'AI角色名称，如"李白"、"孙悟空"等';
COMMENT ON COLUMN ai_conversations.messages IS '对话消息数组，格式：[{"role": "user|assistant", "content": "消息内容", "timestamp": "时间戳"}]';
COMMENT ON COLUMN ai_conversations.memory_snippets IS '角色记忆片段，用于长期记忆和个性化';
COMMENT ON COLUMN ai_conversations.conversation_summary IS '对话摘要，用于上下文压缩';

-- 启用行级安全策略
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（暂时允许所有操作，后续可根据需要调整）
CREATE POLICY "Allow all operations on ai_conversations" ON ai_conversations
  FOR ALL USING (true);