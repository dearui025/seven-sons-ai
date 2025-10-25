// src/lib/subscription-middleware.ts
// 订阅和配额管理中间件

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/auth-helpers-nextjs'

export interface UsageLimits {
  monthlyConversations: number // -1 表示无限制
  concurrentGroupChats: number // -1 表示无限制
  apiCallsPerMonth: number // -1 表示无限制
  canExportData: boolean
  availableRoles: string[]
  supportLevel: 'none' | 'basic' | 'premium'
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_name: string
  status: 'active' | 'canceled' | 'past_due'
  current_period_end: string
  limits: UsageLimits
}

// 获取用户订阅信息
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = createClientComponentClient()
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      subscription_plans (
        name,
        limits,
        features
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    user_id: data.user_id,
    plan_name: data.subscription_plans.name,
    status: data.status,
    current_period_end: data.current_period_end,
    limits: parseLimits(data.subscription_plans.limits, data.subscription_plans.features)
  }
}

// 解析计划限制
function parseLimits(limits: any, features: any): UsageLimits {
  return {
    monthlyConversations: limits?.monthly_conversations || 100,
    concurrentGroupChats: limits?.concurrent_group_chats || 1,
    apiCallsPerMonth: features?.api_access ? 10000 : 0,
    canExportData: features?.export_data || false,
    availableRoles: features?.ai_roles === 'all' ? 
      ['李白', '孙悟空', '诸葛亮', '林黛玉', '墨子', '庄子', '鲁班'] :
      features?.ai_roles || ['孙悟空', '李白'],
    supportLevel: features?.support === 'premium' ? 'premium' : 
                   features?.support === 'basic' ? 'basic' : 'none'
  }
}

// 检查对话限制
export async function checkConversationLimit(userId: string, aiRoleName: string): Promise<{
  allowed: boolean
  remaining: number
  limit: number
  error?: string
}> {
  const subscription = await getUserSubscription(userId)
  
  if (!subscription) {
    // 免费用户 - 模拟检查
    return {
      allowed: true,
      remaining: 10,
      limit: 100
    }
  }

  // 检查AI角色可用性
  if (!subscription.limits.availableRoles.includes(aiRoleName)) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      error: `当前订阅不支持${aiRoleName}角色，请升级到专业版`
    }
  }

  // 检查月使用量
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const supabase = createClientComponentClient()
  const { data: usage } = await supabase
    .from('usage_records')
    .select('amount')
    .eq('user_id', userId)
    .eq('usage_type', 'conversation')
    .gte('timestamp', startOfMonth.toISOString())

  const usedConversations = usage?.reduce((sum, record) => sum + record.amount, 0) || 0
  const limit = subscription.limits.monthlyConversations

  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

  const remaining = Math.max(0, limit - usedConversations)
  
  return {
    allowed: remaining > 0,
    remaining,
    limit
  }
}

// 记录使用量
export async function recordUsage(userId: string, usageType: string, amount: number = 1, metadata: any = {}): Promise<void> {
  const supabase = createClientComponentClient()
  
  await supabase
    .from('usage_records')
    .insert({
      user_id: userId,
      usage_type: usageType,
      amount,
      metadata,
      timestamp: new Date().toISOString()
    })
}

// 检查API限制
export async function checkApiLimit(userId: string, apiType: string = 'chat'): Promise<{
  allowed: boolean
  remaining: number
  limit: number
}> {
  const subscription = await getUserSubscription(userId)
  
  if (!subscription || !subscription.limits.apiCallsPerMonth) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0
    }
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const supabase = createClientComponentClient()
  const { data: usage } = await supabase
    .from('usage_records')
    .select('amount')
    .eq('user_id', userId)
    .eq('usage_type', 'api_call')
    .gte('timestamp', startOfMonth.toISOString())

  const usedApiCalls = usage?.reduce((sum, record) => sum + record.amount, 0) || 0
  const limit = subscription.limits.apiCallsPerMonth

  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

  const remaining = Math.max(0, limit - usedApiCalls)
  
  return {
    allowed: remaining > 0,
    remaining,
    limit
  }
}

// 装饰器：检查订阅权限
export function requireSubscription(requiredFeatures: string[] = []) {
  return async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const subscription = await getUserSubscription(userId)
    
    if (!subscription) {
      return {
        success: false,
        error: '需要订阅才能使用此功能'
      }
    }

    for (const feature of requiredFeatures) {
      switch (feature) {
        case 'export_data':
          if (!subscription.limits.canExportData) {
            return {
              success: false,
              error: '当前订阅不支持数据导出功能，请升级到专业版'
            }
          }
          break
        case 'api_access':
          if (subscription.limits.apiCallsPerMonth === 0) {
            return {
              success: false,
              error: '当前订阅不支持API访问，请升级到专业版'
            }
          }
          break
        case 'premium_support':
          if (subscription.limits.supportLevel !== 'premium') {
            return {
              success: false,
              error: '需要企业版订阅才能获得专属支持'
            }
          }
          break
      }
    }

    return { success: true }
  }
}