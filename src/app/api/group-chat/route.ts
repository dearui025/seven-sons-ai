import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/ai-service'
import { aiConversationManager } from '@/lib/ai-conversation-manager'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_AI_ROLES } from '@/types/ai-roles'

// 演示模式检查 - 在生产环境中默认启用演示模式，除非明确设置DEMO_MODE=false
const DEMO_MODE = process.env.DEMO_MODE !== 'false' && (
  process.env.DEMO_MODE === 'true' || 
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production'
)
// 控制群聊节奏的可配置延迟（默认0，不人为减速）
const PER_ROLE_DELAY_MS = parseInt(process.env.GROUP_CHAT_DELAY_MS || '0', 10)
const FIRST_MESSAGE_DELAY_MS = parseInt(process.env.GROUP_CHAT_FIRST_DELAY_MS || '0', 10)
// 新增并发批处理相关配置
const BATCH_SIZE = parseInt(process.env.GROUP_CHAT_BATCH_SIZE || '3', 10)
const BATCH_DELAY_MS = parseInt(process.env.GROUP_CHAT_BATCH_DELAY_MS || '0', 10)
const PER_REQUEST_TIMEOUT_MS = parseInt(process.env.GROUP_CHAT_ROLE_TIMEOUT_MS || '30000', 10)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: NextRequest) {
  try {
    // 添加更好的错误处理
    let requestBody
    try {
      requestBody = await req.json()
    } catch (error) {
      console.error('[群聊API] JSON解析失败:', error)
      return NextResponse.json(
        { error: '请求格式错误' },
        { status: 400 }
      )
    }

    const { message, sessionId, userId } = requestBody
    
    if (!message || !sessionId) {
      return NextResponse.json(
        { error: '消息和会话ID不能为空' },
        { status: 400 }
      )
    }

    console.log(`[群聊API] 收到消息: ${message}, 会话ID: ${sessionId}`)

    // 获取所有AI角色 - 支持演示模式
    let roles
    if (DEMO_MODE) {
      console.log('[群聊API] 演示模式：使用默认AI角色')
      roles = DEFAULT_AI_ROLES // 默认角色都是激活的
    } else {
      const { data: rolesData, error } = await supabase
        .from('ai_roles')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('[群聊API] 获取AI角色失败:', error)
        return NextResponse.json(
          { error: '获取AI角色失败' },
          { status: 500 }
        )
      }
      roles = rolesData
    }

    console.log(`[群聊API] 获取到 ${roles.length} 个AI角色`)

    if (roles.length === 0) {
      return NextResponse.json(
        { error: '没有可用的AI角色' },
        { status: 500 }
      )
    }

    // 让所有角色都参与对话
    const participatingRoles = roles
    console.log(`[群聊API] 所有 ${participatingRoles.length} 个角色将参与对话`)

    // 在同一轮内，按顺序生成回复，并让后续角色参考前面角色的回复
    const previousReplies: Array<{ role: string; content: string }> = []

    // 生成AI回复（改为分批并发）
    const responses: any[] = []

    // 按批次并行生成，批与批之间可选延迟
    for (let start = 0; start < participatingRoles.length; start += BATCH_SIZE) {
      const batch = participatingRoles.slice(start, start + BATCH_SIZE)
      console.log(`[群聊API] 正在为本批 ${batch.length} 角色并发生成回复...`)

      const contextSnippet = previousReplies.length > 0
        ? `\n\n[本轮已有角色回复参考]\n${previousReplies.map(pr => `- ${pr.role}: ${pr.content.slice(0, 300)}`).join('\n')}`
        : ''
      const augmentedMessage = `${message}${contextSnippet}`

      const batchPromises = batch.map(role => (async () => {
        try {
          // 为每个角色设置超时保护，避免单个卡死拖慢整批
          const result = await Promise.race([
            AIService.generateResponse(role, augmentedMessage, sessionId, userId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('角色生成超时')), PER_REQUEST_TIMEOUT_MS))
          ])
          const response: any = result as any
          console.log(`[群聊API] 角色 ${role.name} 生成回复: ${response.content.substring(0, 50)}...`)
          previousReplies.push({ role: role.name, content: response.content })
          return {
            content: response.content,
            role: role.name,
            avatar: role.avatar_url,
            timestamp: new Date().toISOString(),
            roleId: role.id
          }
        } catch (error) {
          console.error(`[群聊API] 角色 ${role.name} 生成回复失败:`, error)
          return {
            content: `我现在有点忙，稍后再聊吧~`,
            role: role.name,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : '未知错误',
            avatar: role.avatar_url,
            roleId: role.id
          }
        }
      })())

      const batchResults = await Promise.all(batchPromises)
      responses.push(...batchResults)

      // 批次之间的节奏延迟（默认无延迟）
      if (start + BATCH_SIZE < participatingRoles.length && BATCH_DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }
    console.log(`[群聊API] 成功生成 ${responses.length} 个回复`)

    // 将AI服务的原始回复转换为前端消息结构（按顺序增加延迟）
    const aiResponses = responses.map((r: any, idx: number) => ({
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender: r.role,
      content: r.error ? `${r.content}（错误：${r.error}）` : r.content,
      timestamp: r.timestamp || new Date().toISOString(),
      isUser: false,
      avatar: r.avatar ?? '🤖',
      delay: FIRST_MESSAGE_DELAY_MS + idx * PER_ROLE_DELAY_MS
    }))

    // 返回前端所需的数据结构
    return NextResponse.json({
      success: true,
      data: {
        aiResponses,
        interactions: []
      }
    })

  } catch (error) {
    console.error('[群聊API] 处理请求失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}