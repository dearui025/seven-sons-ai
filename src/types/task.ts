export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: string
  assigneeName?: string
  assigneeAvatar?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  dueDate?: Date
  tags: string[]
  progress: number // 0-100
  subtasks: Subtask[]
  comments: TaskComment[]
  attachments: TaskAttachment[]
  estimatedHours?: number
  actualHours?: number
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
  createdAt: Date
}

export interface TaskComment {
  id: string
  content: string
  authorId: string
  authorName: string
  authorAvatar?: string
  createdAt: Date
}

export interface TaskAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedBy: string
  uploadedAt: Date
}

export type TaskStatus = 
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'cancelled'

export type TaskPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'

export interface TaskFilter {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assigneeId?: string[]
  tags?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  search?: string
}

export interface TaskStats {
  total: number
  todo: number
  inProgress: number
  review: number
  done: number
  cancelled: number
  overdue: number
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  icon: string
  ownerId: string
  memberIds: string[]
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'archived' | 'completed'
  progress: number
  dueDate?: Date
}

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: Date
}