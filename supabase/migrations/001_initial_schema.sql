-- 创建用户表 (users)
-- 用于存储每个用户的认证信息、头像、偏好设置等
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建AI角色表 (ai_roles)
-- 用于存储每个AI角色的信息、个性化设置、学习进度等
CREATE TABLE ai_roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  personality TEXT,
  specialties TEXT[] DEFAULT '{}',
  learning_progress JSONB DEFAULT '{"level": 1, "experience": 0, "skills": []}',
  api_url TEXT,
  settings JSONB DEFAULT '{"tone": "friendly", "creativity": 70, "verbosity": "medium"}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建对话记录表 (conversations)
-- 存储用户与AI角色的对话内容
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ai_role_id INTEGER REFERENCES ai_roles(id) ON DELETE CASCADE,
  title TEXT,
  is_group_chat BOOLEAN DEFAULT false,
  participants JSONB DEFAULT '[]', -- 群聊参与者
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建消息表 (messages)
-- 存储具体的消息内容
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'ai')),
  sender_id INTEGER, -- user_id 或 ai_role_id
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'file')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建任务表 (tasks)
-- 存储AI角色的任务及其进度
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ai_role_id INTEGER REFERENCES ai_roles(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建学习记录表 (learning_records)
-- 记录AI角色的学习历史和改进
CREATE TABLE learning_records (
  id SERIAL PRIMARY KEY,
  ai_role_id INTEGER REFERENCES ai_roles(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
  improvement_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户AI角色关系表 (user_ai_relationships)
-- 存储用户与AI角色的个性化关系
CREATE TABLE user_ai_relationships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ai_role_id INTEGER REFERENCES ai_roles(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'friend',
  custom_settings JSONB DEFAULT '{}',
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, ai_role_id)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_ai_role_id ON conversations(ai_role_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_ai_role_id ON tasks(ai_role_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_learning_records_ai_role_id ON learning_records(ai_role_id);
CREATE INDEX idx_user_ai_relationships_user_id ON user_ai_relationships(user_id);

-- 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间戳触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_roles_updated_at BEFORE UPDATE ON ai_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_relationships ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
-- 用户只能访问自己的数据
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- AI角色对所有认证用户可见
CREATE POLICY "AI roles are viewable by authenticated users" ON ai_roles
    FOR SELECT TO authenticated USING (true);

-- 对话记录只有参与者可以访问
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 消息只有对话参与者可以访问
CREATE POLICY "Users can view messages in own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can create messages in own conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id::text = auth.uid()::text
        )
    );

-- 任务只有创建者可以访问
CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own tasks" ON tasks
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 学习记录只有相关用户可以访问
CREATE POLICY "Users can view own learning records" ON learning_records
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create learning records" ON learning_records
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 用户AI关系只有用户自己可以访问
CREATE POLICY "Users can view own AI relationships" ON user_ai_relationships
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create AI relationships" ON user_ai_relationships
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own AI relationships" ON user_ai_relationships
    FOR UPDATE USING (auth.uid()::text = user_id::text);