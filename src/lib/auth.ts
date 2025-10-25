import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'

export interface SignUpData {
  email: string
  password: string
  fullName: string
}

export interface SignInData {
  email: string
  password: string
}

// 演示模式标志 - 只有在没有配置真实 Supabase URL 时才启用演示模式
const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_url_here') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your_supabase_anon_key_here')

console.log('🔧 Auth Service 初始化:', {
  demoMode: DEMO_MODE,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '已配置' : '未配置'
})

export class AuthService {
  private static supabase = DEMO_MODE ? null : createClientComponentClient()

  // 用户注册
  static async signUp(data: SignUpData) {
    console.log('📝 开始注册流程:', { email: data.email, fullName: data.fullName })
    
    if (DEMO_MODE) {
      console.log('🎭 演示模式：模拟注册成功')
      return { 
        data: { user: null }, 
        error: null 
      }
    }

    if (!this.supabase) {
      console.error('❌ Supabase 客户端未初始化')
      return {
        data: { user: null },
        error: { message: 'Supabase 客户端未正确初始化' }
      }
    }

    try {
      console.log('🚀 调用 Supabase 注册 API...')
      console.log('🔧 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...')
      
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      })

      console.log('📊 Supabase 响应:', { 
        hasData: !!authData, 
        hasUser: !!authData?.user,
        hasError: !!error,
        errorMessage: error?.message 
      })

      if (error) {
        console.error('❌ 注册失败:', error)
        return { data: authData, error }
      }

      console.log('✅ 注册成功:', { userId: authData.user?.id, email: authData.user?.email })
      return { data: authData, error: null }
    } catch (err) {
      console.error('💥 注册过程中发生异常:', err)
      return { 
        data: { user: null }, 
        error: { message: '注册过程中发生网络错误，请稍后重试' } 
      }
    }
  }

  // 用户登录
  static async signIn(data: SignInData) {
    console.log('🔐 开始登录流程:', { email: data.email })
    
    if (DEMO_MODE) {
      console.log('🎭 演示模式：模拟登录成功')
      const mockUser = {
        id: 'demo-user-id',
        email: data.email,
        user_metadata: { full_name: '演示用户' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated'
      } as User
      return { data: { user: mockUser }, error: null }
    }

    try {
      console.log('🚀 调用 Supabase 登录 API...')
      const { data: authData, error } = await this.supabase!.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        console.error('❌ 登录失败:', error)
        return { data: authData, error }
      }

      console.log('✅ 登录成功:', { userId: authData.user?.id, email: authData.user?.email })
      return { data: authData, error: null }
    } catch (err) {
      console.error('💥 登录过程中发生异常:', err)
      return { 
        data: { user: null }, 
        error: { message: '登录过程中发生网络错误，请稍后重试' } 
      }
    }
  }

  // 用户登出
  static async signOut() {
    if (DEMO_MODE) {
      console.log('演示模式：模拟登出')
      return { error: null }
    }

    const { error } = await this.supabase!.auth.signOut()
    return { error }
  }

  // 获取当前用户
  static async getCurrentUser() {
    if (DEMO_MODE) {
      return { user: null, error: null }
    }

    const { data: { user }, error } = await this.supabase!.auth.getUser()
    return { user, error }
  }

  // 获取当前会话
  static async getSession() {
    if (DEMO_MODE) {
      return { session: null, error: null }
    }

    const { data: { session }, error } = await this.supabase!.auth.getSession()
    return { session, error }
  }

  // 重置密码
  static async resetPassword(email: string) {
    if (DEMO_MODE) {
      console.log('演示模式：模拟密码重置')
      return { error: null }
    }

    const { error } = await this.supabase!.auth.resetPasswordForEmail(email)
    return { error }
  }

  // 更新用户资料
  static async updateProfile(updates: { full_name?: string; avatar_url?: string }) {
    if (DEMO_MODE) {
      console.log('演示模式：模拟资料更新')
      return { user: null, error: null }
    }

    const { data, error } = await this.supabase!.auth.updateUser({
      data: updates
    })
    return { user: data.user, error }
  }

  // 监听认证状态变化
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    if (DEMO_MODE) {
      console.log('演示模式：跳过认证状态监听')
      return { data: { subscription: { unsubscribe: () => {} } } }
    }

    return this.supabase!.auth.onAuthStateChange(callback)
  }
}

export const authService = AuthService