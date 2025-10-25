'use client'

import React from 'react'
import { useUserPresence } from '@/hooks/useRealtime'
import Avatar from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnlineUsersProps {
  className?: string
  maxDisplay?: number
  showStatus?: boolean
}

export const OnlineUsers: React.FC<OnlineUsersProps> = ({ 
  className,
  maxDisplay = 5,
  showStatus = true 
}) => {
  const { onlineUsers, currentStatus, setStatus } = useUserPresence()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'away':
        return 'bg-yellow-500'
      case 'busy':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return '在线'
      case 'away':
        return '离开'
      case 'busy':
        return '忙碌'
      default:
        return '离线'
    }
  }

  const displayUsers = onlineUsers.slice(0, maxDisplay)
  const remainingCount = Math.max(0, onlineUsers.length - maxDisplay)

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4" />
          在线用户 ({onlineUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 当前用户状态 */}
        {showStatus && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', getStatusColor(currentStatus))} />
              <span className="text-sm font-medium">你的状态</span>
            </div>
            <div className="flex gap-1 ml-auto">
              {(['online', 'away', 'busy'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatus(status)}
                  className={cn(
                    'px-2 py-1 text-xs rounded transition-colors',
                    currentStatus === status
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100'
                  )}
                >
                  {getStatusText(status)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 在线用户列表 */}
        <div className="space-y-2">
          {displayUsers.length > 0 ? (
            <>
              {displayUsers.map((user) => (
                <div key={user.userId} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      src={user.avatar}
                      alt={user.userName}
                      size={32}
                      className="w-8 h-8"
                      fallback={user.userName.slice(0, 2).toUpperCase()}
                    />
                    <div 
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                        getStatusColor(user.status)
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.userName}</p>
                    {user.location && (
                      <p className="text-xs text-gray-500 truncate">{user.location}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getStatusText(user.status)}
                  </Badge>
                </div>
              ))}
              
              {remainingCount > 0 && (
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xs">+{remainingCount}</span>
                  </div>
                  <span className="text-sm">还有 {remainingCount} 位用户在线</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无其他用户在线</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 简化版在线用户指示器
export const OnlineUsersIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const { onlineUsers } = useUserPresence()

  if (onlineUsers.length === 0) return null

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Circle className="w-2 h-2 fill-green-500 text-green-500" />
      <span className="text-xs text-gray-600">{onlineUsers.length} 在线</span>
    </div>
  )
}

export default OnlineUsers