import { createClient } from '@supabase/supabase-js'
import { ensureAIConversationsTable } from './database-init'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface MemorySnippet {
  type: 'personality' | 'preference' | 'fact' | 'emotion'
  content: string
  importance: number // 1-10
  timestamp: string
}

export class AIConversationManager {
  private maxHistoryLength: number = 20 // 保留最近20条消息
  private maxMemorySnippets: number = 10 // 保留最重要的10个记忆片段
  private initialized = false // 初始化标志

  /**
   * 确保数据库表已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      console.log('[AI对话管理器] 正在初始化数据库表...')
      const success = await ensureAIConversationsTable()
      if (success) {
        this.initialized = true
        console.log('[AI对话管理器] 数据库表初始化成功')
      } else {
        console.error('[AI对话管理器] 数据库表初始化失败')
        throw new Error('数据库表初始化失败')
      }
    }
  }

  /**
   * 获取指定角色的对话历史
   * @param botName 角色名称
   * @param sessionId 会话ID
   * @param userId 用户ID（可选）
   */
  async getConversationHistory(
    botName: string, 
    sessionId: string, 
    userId?: string
  ): Promise<ConversationMessage[]> {
    await this.ensureInitialized()
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('bot_name', botName)
        .eq('session_id', sessionId)
        .maybeSingle()

      if (error) {
        console.error('获取对话历史失败:', error)
        return []
      }

      return data?.messages || []
    } catch (error) {
      console.error('获取对话历史异常:', error)
      return []
    }
  }

  /**
   * 添加消息到角色的对话历史
   * @param botName 角色名称
   * @param sessionId 会话ID
   * @param message 消息内容
   * @param userId 用户ID（可选）/**
   * 添加消息到指定角色的对话历史
   */
  async addMessage(
    botName: string,
    sessionId: string,
    message: ConversationMessage,
    userId?: string
  ): Promise<void> {
    await this.ensureInitialized()
    try {      // 获取现有对话记录
      const { data: existing } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('bot_name', botName)
        .eq('session_id', sessionId)
        .maybeSingle()

      const currentMessages = existing?.messages || []
      const updatedMessages = [...currentMessages, message]

      // 保持历史长度限制
      const trimmedMessages = updatedMessages.slice(-this.maxHistoryLength)

      if (existing) {
        // 更新现有记录
        const { error } = await supabase
          .from('ai_conversations')
          .update({
            messages: trimmedMessages,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) {
          console.error('更新对话历史失败:', error)
        }
      } else {
        // 创建新记录
        const { error } = await supabase
          .from('ai_conversations')
          .insert({
            bot_name: botName,
            user_id: userId,
            session_id: sessionId,
            messages: trimmedMessages,
            last_message_at: new Date().toISOString()
          })

        if (error) {
          console.error('创建对话历史失败:', error)
        }
      }
    } catch (error) {
      console.error('添加消息异常:', error)
    }
  }

  /**
   * 获取角色的记忆片段
   * @param botName 角色名称
   * @param sessionId 会话ID
   */
  async getMemorySnippets(
    botName: string,
    sessionId: string
  ): Promise<MemorySnippet[]> {
    await this.ensureInitialized()
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('memory_snippets')
        .eq('bot_name', botName)
        .eq('session_id', sessionId)
        .maybeSingle()

      if (error) {
        console.error('获取记忆片段失败:', error)
        return []
      }

      return data?.memory_snippets || []
    } catch (error) {
      console.error('获取记忆片段异常:', error)
      return []
    }
  }

  /**
   * 添加记忆片段
   * @param botName 角色名称
   * @param sessionId 会话ID
   * @param snippet/**
   * 添加记忆片段
   */
  async addMemorySnippet(
    botName: string,
    sessionId: string,
    snippet: MemorySnippet
  ): Promise<void> {
    await this.ensureInitialized()
    try {
      const currentSnippets = await this.getMemorySnippets(botName, sessionId)
      const updatedSnippets = [...currentSnippets, snippet]
        .sort((a, b) => b.importance - a.importance) // 按重要性排序
        .slice(0, this.maxMemorySnippets) // 保留最重要的片段

      const { data: existing } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('bot_name', botName)
        .eq('session_id', sessionId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('ai_conversations')
          .update({
            memory_snippets: updatedSnippets,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) {
          console.error('更新记忆片段失败:', error)
        }
      }
    } catch (error) {
      console.error('添加记忆片段异常:', error)
    }
  }

  /**
   * 构建包含记忆的系统提示词
   * @param botName 角色名称
   * @param sessionId 会话ID
   * @param baseSystemPrompt 基础系统提示词
   */
  async buildSystemPromptWithMemory(
    botName: string,
    sessionId: string,
    baseSystemPrompt: string
  ): Promise<string> {
    try {
      const memorySnippets = await this.getMemorySnippets(botName, sessionId)
      
      if (memorySnippets.length === 0) {
        return baseSystemPrompt
      }

      const memoryText = memorySnippets
        .map(snippet => `- ${snippet.content}`)
        .join('\n')

      return `${baseSystemPrompt}

你的记忆片段：
${memoryText}

请根据这些记忆保持角色的一致性和连续性。`
    } catch (error) {
      console.error('构建记忆系统提示词异常:', error)
      return baseSystemPrompt
    }
  }

  /**
   * 清空指定角色的对话历史
   * @param botName 角色名称
   * @param sessionId 会话ID
   */
  async clearConversation(botName: string, sessionId: string): Promise<void> {
    await this.ensureInitialized()
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('bot_name', botName)
        .eq('session_id', sessionId)

      if (error) {
        console.error('清空对话历史失败:', error)
      }
    } catch (error) {
      console.error('清空对话历史异常:', error)
    }
  }

  /**
   * 获取对话摘要
   * @param botName 角色名称
   * @param sessionId 会话ID
   */
  async getConversationSummary(
    botName: string,
    sessionId: string
  ): Promise<string | null> {
    await this.ensureInitialized()
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('conversation_summary')
        .eq('bot_name', botName)
        .eq('session_id', sessionId)
        .maybeSingle()

      if (error) {
        console.error('获取对话摘要失败:', error)
        return null
      }

      return data?.conversation_summary || null
    } catch (error) {
      console.error('获取对话摘要异常:', error)
      return null
    }
  }

  /**
   * 更新对话摘要
   * @param botName 角色名称
   * @param sessionId 会话ID
   * @param summary 摘要内容
   */
  async updateConversationSummary(
    botName: string,
    sessionId: string,
    summary: string
  ): Promise<void> {
    await this.ensureInitialized()
    try {
      const { data: existing } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('bot_name', botName)
        .eq('session_id', sessionId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('ai_conversations')
          .update({
            conversation_summary: summary,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) {
          console.error('更新对话摘要失败:', error)
        }
      }
    } catch (error) {
      console.error('更新对话摘要异常:', error)
    }
  }
}

// 全局实例
export const aiConversationManager = new AIConversationManager()