'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import { AIRole } from '@/types/ai-roles'

interface RoleFormProps {
  role?: AIRole
  onSave: (role: Omit<AIRole, 'id'>) => void
  onCancel: () => void
}

export function RoleForm({ role, onSave, onCancel }: RoleFormProps) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    personality: role?.personality || '',
    specialties: role?.specialties || [],
    avatar_url: role?.avatar_url || '/avatars/default.png',
    learning_progress: role?.learning_progress || { level: 1, experience: 0, skills: [] },
    settings: role?.settings || { voice_enabled: false, auto_save: true, theme: 'default' }
  })

  const [newSpecialty, setNewSpecialty] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }))
      setNewSpecialty('')
    }
  }

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }))
  }



  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{role ? '编辑角色' : '创建新角色'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">角色名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入角色名称"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar_url">头像URL</Label>
              <Input
                id="avatar_url"
                value={formData.avatar_url}
                onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                placeholder="输入头像图片URL"
              />
              {formData.avatar_url && (
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                  <img
                    src={formData.avatar_url}
                    alt="头像预览"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/avatars/default.png'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">角色描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="描述这个AI角色的特点和用途"
              rows={3}
              required
            />
          </div>

          {/* 个性特征 */}
          <div className="space-y-2">
            <Label htmlFor="personality">个性特征</Label>
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
              placeholder="描述AI的个性特征，如友善、专业、创意等"
              rows={2}
            />
          </div>

          {/* 专长标签 */}
          <div className="space-y-2">
            <Label>专长标签</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.specialties.map(specialty => (
                <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                  {specialty}
                  <button
                    type="button"
                    onClick={() => removeSpecialty(specialty)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="添加专长标签"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
              />
              <Button type="button" onClick={addSpecialty} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>



          {/* 操作按钮 */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit">
              {role ? '保存修改' : '创建角色'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}