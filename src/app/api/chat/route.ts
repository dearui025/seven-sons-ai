import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/ai-service'
import { getAllAIRoles } from '@/lib/database-setup'
import { checkConversationLimit, recordUsage } from '@/lib/subscription-middleware'

export async function POST(request: NextRequest) {
  try {
    const { message, roleName, sessionId, userId } = await request.json()
    
    console.log(`[聊天API] 收到请求:`, {
      角色: roleName,
      消息长度: message?.length,
      会话ID: sessionId,
      用户ID: userId
    })

    if (!message || !roleName || !sessionId) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数: message, roleName, sessionId'
      }, { status: 400 })
    }

    // 如果提供了userId，则检查订阅限制
    if (userId) {
      console.log(`[聊天API] 检查订阅限制...`)
      const limitCheck = await checkConversationLimit(userId, roleName)
      
      if (!limitCheck.allowed) {
        console.log(`[聊天API] 用户 ${userId} 超出对话限制:`, limitCheck)
        return NextResponse.json({
          success: false,
          error: limitCheck.error || '对话次数已用完，请升级订阅或等待下个月',
          limitInfo: limitCheck
        }, { status: 429 })
      }

      console.log(`[聊天API] 用户 ${userId} 订阅限制检查通过:`, {
        剩余次数: limitCheck.remaining,
        限制: limitCheck.limit
      })
    }

    // 获取角色信息
    const roles = await getAllAIRoles()
    const role = roles.find(r => r.name === roleName)
    
    if (!role) {
      return NextResponse.json({
        success: false,
        error: `未找到角色: ${roleName}`
      }, { status: 404 })
    }

    console.log(`[聊天API] 找到角色:`, {
      角色名: role.name,
      角色ID: role.id,
      有API配置: !!role.api_config,
      API提供商: role.api_config?.provider
    })

    // 调用AI服务生成回复
    const response = await AIService.generateResponse(role, message, sessionId, userId)

    // 如果有用户ID，记录使用量
    if (userId) {
      try {
        await recordUsage(userId, 'conversation', 1, {
          roleName,
          sessionId,
          messageLength: message.length,
          timestamp: new Date().toISOString()
        })
        console.log(`[聊天API] 记录使用量: 用户 ${userId} 进行了1次对话`)
      } catch (error) {
        console.error('[聊天API] 记录使用量失败:', error)
        // 不阻塞主要功能，仅记录错误
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        content: response.content,
        role: roleName,
        timestamp: new Date().toISOString(),
        userId,
        sessionId
      }
    })

  } catch (error) {
    console.error('[聊天API] 处理请求失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    }, { status: 500 })
  }
}