'use client'

import React from 'react'
import { useRealtime } from '@/hooks/useRealtime'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  className?: string
  showText?: boolean
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className,
  showText = true 
}) => {
  const { connected, connectionAttempts } = useRealtime()

  const getStatusInfo = () => {
    if (connected) {
      return {
        icon: <Wifi className="w-3 h-3" />,
        text: '已连接',
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 border-green-200',
      }
    } else if (connectionAttempts > 0) {
      return {
        icon: <AlertCircle className="w-3 h-3" />,
        text: '重连中...',
        variant: 'secondary' as const,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      }
    } else {
      return {
        icon: <WifiOff className="w-3 h-3" />,
        text: '已断开',
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 border-red-200',
      }
    }
  }

  const status = getStatusInfo()

  return (
    <Badge 
      variant={status.variant}
      className={cn(
        'flex items-center gap-1 text-xs',
        status.className,
        className
      )}
    >
      {status.icon}
      {showText && <span>{status.text}</span>}
    </Badge>
  )
}

export default ConnectionStatus