'use client'

import React, { useEffect, useState } from 'react'
import { useRealtime, useTaskRealtime } from '@/hooks/useRealtime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, X, CheckSquare, MessageSquare, Users, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'task_update' | 'chat_message' | 'user_join' | 'user_leave' | 'system'
  title: string
  message: string
  timestamp: number
  read: boolean
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

interface RealtimeNotificationsProps {
  className?: string
  maxNotifications?: number
  autoHide?: boolean
  autoHideDelay?: number
}

export const RealtimeNotifications: React.FC<RealtimeNotificationsProps> = ({
  className,
  maxNotifications = 5,
  autoHide = true,
  autoHideDelay = 5000,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isVisible, setIsVisible] = useState(false)
  
  const { lastMessage, onlineUsers } = useRealtime()
  const { lastUpdate } = useTaskRealtime()

  // 处理实时消息
  useEffect(() => {
    if (!lastMessage) return

    const createNotification = (): Notification | null => {
      const baseNotification = {
        id: `${lastMessage.type}-${lastMessage.timestamp}`,
        timestamp: lastMessage.timestamp,
        read: false,
      }

      switch (lastMessage.type) {
        case 'user_join':
          return {
            ...baseNotification,
            type: 'user_join' as const,
            title: '用户上线',
            message: `${lastMessage.payload.userName} 加入了协作`,
            icon: <Users className="w-4 h-4 text-green-600" />,
          }

        case 'user_leave':
          return {
            ...baseNotification,
            type: 'user_leave' as const,
            title: '用户离线',
            message: `${lastMessage.payload.userName} 离开了协作`,
            icon: <Users className="w-4 h-4 text-gray-600" />,
          }

        case 'chat_message':
          return {
            ...baseNotification,
            type: 'chat_message' as const,
            title: '新消息',
            message: `${lastMessage.payload.userName}: ${lastMessage.payload.content.slice(0, 50)}${lastMessage.payload.content.length > 50 ? '...' : ''}`,
            icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
            action: {
              label: '查看',
              onClick: () => {
                // 跳转到主页
                window.location.href = '/'
              },
            },
          }

        default:
          return null
      }
    }

    const notification = createNotification()
    if (notification) {
      addNotification(notification)
    }
  }, [lastMessage])

  // 处理任务更新
  useEffect(() => {
    if (!lastUpdate) return

    const notification: Notification = {
      id: `task-${lastUpdate.payload.taskId}-${lastUpdate.timestamp}`,
      type: 'task_update',
      title: '任务更新',
      message: getTaskUpdateMessage(lastUpdate.type, lastUpdate.payload),
      timestamp: lastUpdate.timestamp,
      read: false,
      icon: <CheckSquare className="w-4 h-4 text-orange-600" />,
      action: {
        label: '查看任务',
        onClick: () => {
          window.location.href = '/'
        },
      },
    }

    addNotification(notification)
  }, [lastUpdate])

  const getTaskUpdateMessage = (type: string, payload: any) => {
    switch (type) {
      case 'task_create':
        return `新任务已创建: ${payload.task?.title || '未知任务'}`
      case 'task_update':
        return `任务已更新: ${payload.taskId}`
      case 'task_delete':
        return `任务已删除: ${payload.taskId}`
      default:
        return '任务状态已更改'
    }
  }

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      const newNotifications = [notification, ...prev].slice(0, maxNotifications)
      setIsVisible(true)
      
      // 自动隐藏
      if (autoHide) {
        setTimeout(() => {
          markAsRead(notification.id)
        }, autoHideDelay)
      }
      
      return newNotifications
    })
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setIsVisible(false)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (notifications.length === 0) return null

  return (
    <div className={cn('fixed top-4 right-4 z-50 space-y-2', className)}>
      {/* 通知计数器 */}
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Badge 
            variant="destructive" 
            className="animate-pulse cursor-pointer"
            onClick={() => setIsVisible(!isVisible)}
          >
            <Bell className="w-3 h-3 mr-1" />
            {unreadCount} 条新通知
          </Badge>
        </div>
      )}

      {/* 通知列表 */}
      {isVisible && (
        <div className="space-y-2 max-w-sm">
          {/* 清除所有按钮 */}
          {notifications.length > 1 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-xs"
              >
                清除所有
              </Button>
            </div>
          )}

          {/* 通知卡片 */}
          {notifications.map((notification) => (
            <Card 
              key={notification.id}
              className={cn(
                'transition-all duration-300 transform',
                notification.read 
                  ? 'opacity-60 scale-95' 
                  : 'shadow-lg animate-in slide-in-from-right-5',
                'hover:shadow-xl'
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {notification.icon && (
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.icon}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNotification(notification.id)}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    {notification.action && !notification.read && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            notification.action!.onClick()
                            markAsRead(notification.id)
                          }}
                          className="text-xs h-7"
                        >
                          {notification.action.label}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// 简化版通知指示器
export const NotificationIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const { lastMessage } = useRealtime()
  const [hasNewNotification, setHasNewNotification] = useState(false)

  useEffect(() => {
    if (lastMessage) {
      setHasNewNotification(true)
      setTimeout(() => setHasNewNotification(false), 3000)
    }
  }, [lastMessage])

  if (!hasNewNotification) return null

  return (
    <div className={cn('flex items-center gap-1 animate-pulse', className)}>
      <AlertCircle className="w-4 h-4 text-orange-500" />
      <span className="text-xs text-orange-600">有新动态</span>
    </div>
  )
}

export default RealtimeNotifications