// src/components/subscription/UserDashboard.tsx
// 用户仪表板组件

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Crown, 
  Zap, 
  MessageSquare, 
  Calendar, 
  Download, 
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { getUserSubscription, recordUsage } from '@/lib/subscription-middleware'

interface UsageStats {
  monthlyConversations: number
  conversationsUsed: number
  conversationsRemaining: number
  groupChatsActive: number
  groupChatsLimit: number
  apiCallsUsed: number
  apiCallsLimit: number
}

interface SubscriptionStatus {
  planName: string
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd: string
  nextBillingDate: string
  price: number
}

export default function UserDashboard() {
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // 获取用户信息
      const { data: { user: userData } } = await supabase.auth.getUser()
      setUser(userData)

      if (userData) {
        // 获取订阅信息
        const subscriptionData = await getUserSubscription(userData.id)
        setSubscription(subscriptionData ? {
          planName: subscriptionData.plan_name,
          status: subscriptionData.status,
          currentPeriodEnd: subscriptionData.current_period_end,
          nextBillingDate: subscriptionData.current_period_end,
          price: getPlanPrice(subscriptionData.plan_name)
        } : {
          planName: '免费版',
          status: 'active' as const,
          currentPeriodEnd: '',
          nextBillingDate: '',
          price: 0
        })

        // 获取使用统计
        const stats = await calculateUsageStats(userData.id, subscriptionData?.limits)
        setUsageStats(stats)
      }
    } catch (err) {
      console.error('加载仪表板数据失败:', err)
      setError('加载数据失败，请刷新页面重试')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateUsageStats = async (userId: string, limits: any) => {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // 获取对话使用量
    const { data: conversationUsage } = await supabase
      .from('usage_records')
      .select('amount')
      .eq('user_id', userId)
      .eq('usage_type', 'conversation')
      .gte('timestamp', startOfMonth.toISOString())

    const conversationsUsed = conversationUsage?.reduce((sum, record) => sum + record.amount, 0) || 0
    const conversationLimit = limits?.monthlyConversations || 100

    // 获取群聊使用量
    const { data: groupChatUsage } = await supabase
      .from('usage_records')
      .select('amount')
      .eq('user_id', userId)
      .eq('usage_type', 'group_chat')
      .eq('timestamp', `>=${startOfMonth.toISOString()}`)
      .eq('metadata->is_active', true)

    const activeGroupChats = groupChatUsage?.filter(record => 
      new Date(record.metadata?.started_at || 0) > startOfMonth
    ).length || 0

    // 获取API使用量
    const { data: apiUsage } = await supabase
      .from('usage_records')
      .select('amount')
      .eq('user_id', userId)
      .eq('usage_type', 'api_call')
      .gte('timestamp', startOfMonth.toISOString())

    const apiCallsUsed = apiUsage?.reduce((sum, record) => sum + record.amount, 0) || 0
    const apiCallsLimit = limits?.apiCallsPerMonth || 0

    return {
      monthlyConversations: conversationLimit,
      conversationsUsed,
      conversationsRemaining: Math.max(0, conversationLimit === -1 ? -1 : conversationLimit - conversationsUsed),
      groupChatsActive: activeGroupChats,
      groupChatsLimit: limits?.concurrentGroupChats || 1,
      apiCallsUsed,
      apiCallsLimit
    }
  }

  const getPlanPrice = (planName: string): number => {
    switch (planName) {
      case 'pro': return 19
      case 'enterprise': return 99
      default: return 0
    }
  }

  const getPlanColor = (planName: string): string => {
    switch (planName) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'pro': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <Button onClick={loadDashboardData} className="mt-4">
            重新加载
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">用户仪表板</h1>
        <p className="text-gray-600">欢迎回来，{user?.email}</p>
      </div>

      {/* 订阅状态卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Crown className="w-5 h-5 mr-2 text-yellow-500" />
              当前订阅
            </span>
            <Badge className={getPlanColor(subscription?.planName || '')}>
              {subscription?.planName}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">状态</p>
              <p className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                {subscription?.status === 'active' ? '激活' : '已取消'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">当前周期结束</p>
              <p>{formatDate(subscription?.currentPeriodEnd || '')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">月费</p>
              <p className="text-lg font-semibold">${subscription?.price}/月</p>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-4">
            <Button variant="outline" size="sm">
              <CreditCard className="w-4 h-4 mr-1" />
              管理订阅
            </Button>
            <Button variant="outline" size="sm">
              升级套餐
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 使用统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 对话使用量 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              对话次数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">
                {usageStats?.conversationsUsed || 0}
              </span>
              <span className="text-sm text-gray-500">
                / {usageStats?.monthlyConversations === -1 ? '无限制' : usageStats?.monthlyConversations}
              </span>
            </div>
            {usageStats?.monthlyConversations !== -1 && (
              <Progress 
                value={((usageStats?.conversationsUsed || 0) / (usageStats?.monthlyConversations || 1)) * 100}
                className="h-2"
              />
            )}
          </CardContent>
        </Card>

        {/* 群聊使用量 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              活跃群聊
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">
                {usageStats?.groupChatsActive || 0}
              </span>
              <span className="text-sm text-gray-500">
                / {usageStats?.groupChatsLimit === -1 ? '无限制' : usageStats?.groupChatsLimit}
              </span>
            </div>
            {usageStats?.groupChatsLimit !== -1 && (
              <Progress 
                value={((usageStats?.groupChatsActive || 0) / (usageStats?.groupChatsLimit || 1)) * 100}
                className="h-2"
              />
            )}
          </CardContent>
        </Card>

        {/* API使用量 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              API调用
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">
                {usageStats?.apiCallsUsed || 0}
              </span>
              <span className="text-sm text-gray-500">
                / {usageStats?.apiCallsLimit === -1 ? '无限制' : usageStats?.apiCallsLimit}
              </span>
            </div>
            {usageStats?.apiCallsLimit !== -1 && (
              <Progress 
                value={((usageStats?.apiCallsUsed || 0) / (usageStats?.apiCallsLimit || 1)) * 100}
                className="h-2"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col">
              <MessageSquare className="w-6 h-6 mb-2" />
              开始对话
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col" disabled>
              <Download className="w-6 h-6 mb-2" />
              导出数据
              {subscription?.planName === 'free' && (
                <span className="text-xs text-gray-400">专业版功能</span>
              )}
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col">
              <CreditCard className="w-6 h-6 mb-2" />
              账单历史
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col">
              <Crown className="w-6 h-6 mb-2" />
              升级套餐
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}