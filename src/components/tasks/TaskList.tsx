'use client'

import React, { useState } from 'react'
import { Task } from '@/types/task'
import { useTask } from '@/contexts/TaskContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface TaskListProps {
  tasks: Task[]
}

type SortField = 'title' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'progress'
type SortDirection = 'asc' | 'desc'

const priorityConfig = {
  low: { color: 'bg-green-100 text-green-800', label: '低', order: 1 },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: '中', order: 2 },
  high: { color: 'bg-red-100 text-red-800', label: '高', order: 3 },
  urgent: { color: 'bg-purple-100 text-purple-800', label: '紧急', order: 4 }
}

const statusConfig = {
  todo: { color: 'bg-gray-100 text-gray-800', label: '待办', order: 1 },
  in_progress: { color: 'bg-blue-100 text-blue-800', label: '进行中', order: 2 },
  review: { color: 'bg-yellow-100 text-yellow-800', label: '待审核', order: 3 },
  done: { color: 'bg-green-100 text-green-800', label: '已完成', order: 4 },
  cancelled: { color: 'bg-red-100 text-red-800', label: '已取消', order: 5 }
}

export function TaskList({ tasks }: TaskListProps) {
  const { updateTask, deleteTask } = useTask()
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('dueDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'status':
          aValue = statusConfig[a.status].order
          bValue = statusConfig[b.status].order
          break
        case 'priority':
          aValue = priorityConfig[a.priority].order
          bValue = priorityConfig[b.priority].order
          break
        case 'assignee':
          aValue = a.assigneeName || ''
          bValue = b.assigneeName || ''
          break
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0
          break
        case 'progress':
          aValue = a.progress || 0
          bValue = b.progress || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [tasks, sortField, sortDirection])

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks(prev => [...prev, taskId])
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(tasks.map(task => task.id))
    } else {
      setSelectedTasks([])
    }
  }

  const handleEdit = (task: Task) => {
    // TODO: 打开编辑表单
    console.log('Edit task:', task.id)
  }

  const handleDelete = async (task: Task) => {
    if (confirm('确定要删除这个任务吗？')) {
      await deleteTask(task.id)
    }
  }

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await updateTask(task.id, { status: newStatus })
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />
  }

  const isOverdue = (task: Task) => {
    return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  }

  return (
    <div className="space-y-4">
      {/* 批量操作 */}
      {selectedTasks.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">
            已选择 {selectedTasks.length} 个任务
          </span>
          <Button variant="outline" size="sm">
            批量编辑
          </Button>
          <Button variant="outline" size="sm">
            批量删除
          </Button>
        </div>
      )}

      {/* 任务表格 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('title')}
                  className="h-auto p-0 font-medium"
                >
                  任务名称
                  {getSortIcon('title')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('status')}
                  className="h-auto p-0 font-medium"
                >
                  状态
                  {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('priority')}
                  className="h-auto p-0 font-medium"
                >
                  优先级
                  {getSortIcon('priority')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('assignee')}
                  className="h-auto p-0 font-medium"
                >
                  分配人
                  {getSortIcon('assignee')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('progress')}
                  className="h-auto p-0 font-medium"
                >
                  进度
                  {getSortIcon('progress')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('dueDate')}
                  className="h-auto p-0 font-medium"
                >
                  截止日期
                  {getSortIcon('dueDate')}
                </Button>
              </TableHead>
              <TableHead className="w-12">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map(task => (
              <TableRow 
                key={task.id} 
                className={`${isOverdue(task) ? 'bg-red-50' : ''} hover:bg-gray-50`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-600 line-clamp-1">
                        {task.description}
                      </div>
                    )}
                    {task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {task.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{task.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={`${statusConfig[task.status].color}`}
                    variant="secondary"
                  >
                    {statusConfig[task.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={`${priorityConfig[task.priority].color}`}
                    variant="secondary"
                  >
                    {priorityConfig[task.priority].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.assigneeName ? (
                    <div className="flex items-center gap-2">
                      {task.assigneeAvatar && <span>{task.assigneeAvatar}</span>}
                      <span className="text-sm">{task.assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">未分配</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.progress !== undefined ? (
                    <div className="space-y-1">
                      <div className="text-sm">{task.progress}%</div>
                      <Progress value={task.progress} className="h-2 w-20" />
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.dueDate ? (
                    <div className={`text-sm ${isOverdue(task) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                      {isOverdue(task) && (
                        <div className="text-xs text-red-500">已逾期</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => console.log('View task:', task.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(task)}>
                        <Edit className="h-4 w-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleComplete(task)}>
                        {task.status === 'done' ? '取消完成' : '标记完成'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(task)} 
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📋</div>
          <p>暂无任务数据</p>
        </div>
      )}
    </div>
  )
}