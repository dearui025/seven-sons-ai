import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 演示模式标志 - 只有在真正缺少有效配置时才启用
export const DEMO_MODE = !supabaseUrl || 
  supabaseUrl.includes('your-project-id') ||
  supabaseUrl.includes('your_supabase_url_here') ||
  !supabaseAnonKey ||
  supabaseAnonKey.includes('your_supabase_anon_key_here')

console.log('🔧 Supabase 配置检查:', {
  supabaseUrl: supabaseUrl ? '已配置' : '未配置',
  supabaseAnonKey: supabaseAnonKey ? '已配置' : '未配置',
  DEMO_MODE
})

// 客户端Supabase实例
export const supabase = DEMO_MODE 
  ? null // 演示模式下不创建真实的Supabase客户端
  : createClient(supabaseUrl, supabaseAnonKey)

// 浏览器端Supabase客户端（用于SSR）
export function createSupabaseBrowserClient() {
  if (DEMO_MODE) {
    return null // 演示模式下返回null
  }
  return createClientComponentClient()
}

// 新增：服务端 Service Role 客户端，仅在服务端路由中调用
export function createSupabaseServiceClient() {
  if (DEMO_MODE) {
    return null
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!serviceKey) {
    console.error('缺少 SUPABASE_SERVICE_ROLE_KEY，服务端写入将失败')
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 未配置')
  }
  return createClient(supabaseUrl, serviceKey)
}

// 数据库类型定义
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      ai_roles: {
        Row: {
          id: string
          name: string
          description: string | null
          avatar_url: string | null
          learning_progress: any | null
          api_url: string | null
          settings: any | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          avatar_url?: string | null
          learning_progress?: any | null
          api_url?: string | null
          settings?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          avatar_url?: string | null
          learning_progress?: any | null
          api_url?: string | null
          settings?: any | null
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          ai_role_id: string
          message: string
          response: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          ai_role_id: string
          message: string
          response?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          ai_role_id?: string
          message?: string
          response?: string | null
          timestamp?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          ai_role_id: string
          task_description: string
          status: string
          progress: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ai_role_id: string
          task_description: string
          status?: string
          progress?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ai_role_id?: string
          task_description?: string
          status?: string
          progress?: number
          created_at?: string
        }
      }
    }
  }
}