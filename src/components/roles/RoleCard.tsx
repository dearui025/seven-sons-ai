'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Edit, Trash2, MessageSquare, Star } from 'lucide-react'
import { AIRole } from '@/types/ai-roles'
import { cn } from '@/lib/utils'

interface RoleCardProps {
  role: AIRole
  isSelected?: boolean
  isFavorite?: boolean
  onSelect?: (role: AIRole) => void
  onEdit?: (role: AIRole) => void
  onDelete?: (role: AIRole) => void
  onToggleFavorite?: (role: AIRole) => void
  onStartChat?: (role: AIRole) => void
}

export function RoleCard({
  role,
  isSelected = false,
  isFavorite = false,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  onStartChat
}: RoleCardProps) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
    green: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
    purple: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950',
    red: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
    orange: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950',
    pink: 'border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-950',
    indigo: 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950',
    teal: 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950'
  }

  const avatarColorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500'
  }

  return (
    <Card 
      className={cn(
        'relative transition-all duration-200 hover:shadow-lg cursor-pointer group',
        isSelected && 'ring-2 ring-primary',
        colorClasses[role.color as keyof typeof colorClasses] || colorClasses.blue
      )}
      onClick={() => onSelect?.(role)}
    >
      {/* 收藏按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite?.(role)
        }}
        className={cn(
          'absolute top-3 right-3 p-1 rounded-full transition-colors',
          isFavorite 
            ? 'text-yellow-500 hover:text-yellow-600' 
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Star className={cn('w-4 h-4', isFavorite && 'fill-current')} />
      </button>

      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
            <img
              src={role.avatar_url}
              alt={role.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{role.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {role.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 个性特征 */}
        {role.personality && (
          <div className="mb-3">
            <p className="text-sm text-muted-foreground italic">
              "{role.personality}"
            </p>
          </div>
        )}

        {/* 专长标签 */}
        {role.specialties && role.specialties.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {role.specialties.slice(0, 3).map(specialty => (
                <Badge key={specialty} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
              {role.specialties.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{role.specialties.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-2">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(role)
                }}
                className="h-8 w-8 p-0"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(role)
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          {onStartChat && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onStartChat(role)
              }}
              className="h-8"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              聊天
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}