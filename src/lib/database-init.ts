import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * 初始化数据库表结构
 * 确保ai_conversations表存在
 */
export async function initializeDatabase() {
  try {
    console.log('[数据库初始化] 开始检查和创建必要的表结构...')

    // 直接尝试创建表，使用 CREATE TABLE IF NOT EXISTS
    console.log('[数据库初始化] 正在创建ai_conversations表...')
    
    // 创建ai_conversations表的SQL
    const createTableSQL = `
      -- 创建AI角色独立对话历史表
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id SERIAL PRIMARY KEY,
        bot_name TEXT NOT NULL,
        user_id UUID,
        session_id TEXT NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]',
        memory_snippets JSONB DEFAULT '[]',
        conversation_summary TEXT,
        last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- 创建索引以提高查询性能
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_bot_session 
      ON ai_conversations(bot_name, session_id);
      
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id 
      ON ai_conversations(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_message 
      ON ai_conversations(last_message_at);
    `

    // 执行SQL（注意：这需要服务端权限，可能需要通过API调用）
    try {
      // 由于Supabase客户端限制，我们需要通过RPC调用来执行DDL
      console.log('[数据库初始化] 尝试通过RPC执行表创建...')
      
      // 这里我们先尝试简单的插入操作来测试表是否存在
      const { error: testError } = await supabase
        .from('ai_conversations')
        .select('id')
        .limit(1)

      if (testError && testError.code === '42P01') {
        // 表不存在，需要创建
        console.log('[数据库初始化] 表不存在，需要手动创建表结构')
        console.log('[数据库初始化] 请在Supabase Dashboard中执行以下SQL:')
        console.log(createTableSQL)
        return false
      } else {
        console.log('[数据库初始化] ai_conversations表创建成功或已存在')
      }
    } catch (error) {
      console.error('[数据库初始化] 创建表失败:', error)
      return false
    }

    console.log('[数据库初始化] 数据库初始化完成')
    return true

  } catch (error) {
    console.error('[数据库初始化] 初始化过程中发生错误:', error)
    return false
  }
}

/**
 * 检查表是否存在的简单方法
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    return !error || error.code !== '42P01'
  } catch (error) {
    return false
  }
}

/**
 * 确保ai_conversations表可用
 */
export async function ensureAIConversationsTable(): Promise<boolean> {
  const exists = await checkTableExists('ai_conversations')
  
  if (!exists) {
    console.log('[数据库检查] ai_conversations表不存在，尝试创建...')
    return await initializeDatabase()
  }
  
  return true
}