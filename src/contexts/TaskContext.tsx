'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Task, TaskFilter, TaskStats, Project, TeamMember, TaskStatus, TaskPriority } from '@/types/task'

interface TaskContextType {
  // 任务管理
  tasks: Task[]
  currentTask: Task | null
  taskStats: TaskStats
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  getTask: (taskId: string) => Task | undefined
  
  // 过滤和搜索
  filter: TaskFilter
  setFilter: (filter: TaskFilter) => void
  filteredTasks: Task[]
  
  // 项目管理
  projects: Project[]
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  
  // 团队成员
  teamMembers: TeamMember[]
  addTeamMember: (member: Omit<TeamMember, 'id' | 'joinedAt'>) => Promise<void>
  removeTeamMember: (memberId: string) => Promise<void>
  
  // 加载状态
  loading: boolean
  error: string | null
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<TaskFilter>({})
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 计算任务统计
  const taskStats: TaskStats = React.useMemo(() => {
    const total = tasks.length
    const todo = tasks.filter(t => t.status === 'todo').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const review = tasks.filter(t => t.status === 'review').length
    const done = tasks.filter(t => t.status === 'done').length
    const cancelled = tasks.filter(t => t.status === 'cancelled').length
    const overdue = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length

    return { total, todo, inProgress, review, done, cancelled, overdue }
  }, [tasks])

  // 过滤任务
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      // 状态过滤
      if (filter.status && filter.status.length > 0) {
        if (!filter.status.includes(task.status)) return false
      }
      
      // 优先级过滤
      if (filter.priority && filter.priority.length > 0) {
        if (!filter.priority.includes(task.priority)) return false
      }
      
      // 分配人过滤
      if (filter.assigneeId && filter.assigneeId.length > 0) {
        if (!task.assigneeId || !filter.assigneeId.includes(task.assigneeId)) return false
      }
      
      // 标签过滤
      if (filter.tags && filter.tags.length > 0) {
        if (!filter.tags.some(tag => task.tags.includes(tag))) return false
      }
      
      // 日期范围过滤
      if (filter.dateRange) {
        const taskDate = new Date(task.createdAt)
        if (taskDate < filter.dateRange.start || taskDate > filter.dateRange.end) return false
      }
      
      // 搜索过滤
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        if (!task.title.toLowerCase().includes(searchLower) && 
            !task.description.toLowerCase().includes(searchLower)) return false
      }
      
      return true
    })
  }, [tasks, filter])

  // 初始化数据
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      // 在演示模式下，创建一些示例数据
      const sampleTasks: Task[] = [
        {
          id: '1',
          title: '设计用户界面原型',
          description: '为新功能创建用户界面原型，包括移动端和桌面端设计',
          status: 'in_progress',
          priority: 'high',
          assigneeId: 'user1',
          assigneeName: '张三',
          assigneeAvatar: '👨‍💻',
          createdBy: 'admin',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-16'),
          dueDate: new Date('2024-01-25'),
          tags: ['设计', 'UI/UX', '原型'],
          progress: 60,
          subtasks: [
            { id: 's1', title: '移动端设计', completed: true, createdAt: new Date() },
            { id: 's2', title: '桌面端设计', completed: false, createdAt: new Date() }
          ],
          comments: [],
          attachments: [],
          estimatedHours: 20,
          actualHours: 12
        },
        {
          id: '2',
          title: '实现API接口',
          description: '开发后端API接口，包括用户认证、数据管理等功能',
          status: 'todo',
          priority: 'medium',
          assigneeId: 'user2',
          assigneeName: '李四',
          assigneeAvatar: '👩‍💻',
          createdBy: 'admin',
          createdAt: new Date('2024-01-16'),
          updatedAt: new Date('2024-01-16'),
          dueDate: new Date('2024-01-30'),
          tags: ['开发', 'API', '后端'],
          progress: 0,
          subtasks: [],
          comments: [],
          attachments: [],
          estimatedHours: 40
        },
        {
          id: '3',
          title: '编写测试用例',
          description: '为核心功能编写单元测试和集成测试',
          status: 'review',
          priority: 'medium',
          assigneeId: 'user3',
          assigneeName: '王五',
          assigneeAvatar: '🧑‍💻',
          createdBy: 'admin',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-17'),
          dueDate: new Date('2024-01-20'),
          tags: ['测试', '质量保证'],
          progress: 90,
          subtasks: [],
          comments: [],
          attachments: [],
          estimatedHours: 16,
          actualHours: 14
        }
      ]

      const sampleProjects: Project[] = [
        {
          id: 'p1',
          name: '七个儿子智能平台',
          description: '基于AI的游戏开发智能体生成平台',
          color: '#3B82F6',
          icon: '🎮',
          ownerId: 'admin',
          memberIds: ['user1', 'user2', 'user3'],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-17'),
          status: 'active',
          progress: 45,
          dueDate: new Date('2024-03-01')
        }
      ]

      const sampleMembers: TeamMember[] = [
        {
          id: 'user1',
          name: '张三',
          email: 'zhangsan@example.com',
          avatar: '👨‍💻',
          role: 'admin',
          joinedAt: new Date('2024-01-01')
        },
        {
          id: 'user2',
          name: '李四',
          email: 'lisi@example.com',
          avatar: '👩‍💻',
          role: 'member',
          joinedAt: new Date('2024-01-02')
        },
        {
          id: 'user3',
          name: '王五',
          email: 'wangwu@example.com',
          avatar: '🧑‍💻',
          role: 'member',
          joinedAt: new Date('2024-01-03')
        }
      ]

      setTasks(sampleTasks)
      setProjects(sampleProjects)
      setCurrentProject(sampleProjects[0])
      setTeamMembers(sampleMembers)
    } catch (err) {
      setError('加载数据失败')
      console.error('Failed to load initial data:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setTasks(prev => [...prev, newTask])
    } catch (err) {
      setError('创建任务失败')
      console.error('Failed to create task:', err)
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, ...updates, updatedAt: new Date() }
          : task
      ))
    } catch (err) {
      setError('更新任务失败')
      console.error('Failed to update task:', err)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (err) {
      setError('删除任务失败')
      console.error('Failed to delete task:', err)
    }
  }

  const getTask = (taskId: string) => {
    return tasks.find(task => task.id === taskId)
  }

  const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProject: Project = {
        ...projectData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setProjects(prev => [...prev, newProject])
    } catch (err) {
      setError('创建项目失败')
      console.error('Failed to create project:', err)
    }
  }

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      setProjects(prev => prev.map(project => 
        project.id === projectId 
          ? { ...project, ...updates, updatedAt: new Date() }
          : project
      ))
    } catch (err) {
      setError('更新项目失败')
      console.error('Failed to update project:', err)
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      setProjects(prev => prev.filter(project => project.id !== projectId))
      if (currentProject?.id === projectId) {
        setCurrentProject(null)
      }
    } catch (err) {
      setError('删除项目失败')
      console.error('Failed to delete project:', err)
    }
  }

  const addTeamMember = async (memberData: Omit<TeamMember, 'id' | 'joinedAt'>) => {
    try {
      const newMember: TeamMember = {
        ...memberData,
        id: Date.now().toString(),
        joinedAt: new Date()
      }
      setTeamMembers(prev => [...prev, newMember])
    } catch (err) {
      setError('添加团队成员失败')
      console.error('Failed to add team member:', err)
    }
  }

  const removeTeamMember = async (memberId: string) => {
    try {
      setTeamMembers(prev => prev.filter(member => member.id !== memberId))
    } catch (err) {
      setError('移除团队成员失败')
      console.error('Failed to remove team member:', err)
    }
  }

  const value: TaskContextType = {
    tasks,
    currentTask,
    taskStats,
    createTask,
    updateTask,
    deleteTask,
    getTask,
    filter,
    setFilter,
    filteredTasks,
    projects,
    currentProject,
    setCurrentProject,
    createProject,
    updateProject,
    deleteProject,
    teamMembers,
    addTeamMember,
    removeTeamMember,
    loading,
    error
  }

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTask() {
  const context = useContext(TaskContext)
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider')
  }
  return context
}