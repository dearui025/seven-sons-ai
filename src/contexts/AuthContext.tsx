'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/auth-helpers-nextjs'
import { authService, SignUpData, SignInData } from '@/lib/auth'

// 演示模式标志 - 只有在没有配置真实 Supabase URL 时才启用演示模式
const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_url_here') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your_supabase_anon_key_here')

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (data: SignUpData) => Promise<{ data: any; error: any }>
  signIn: (data: SignInData) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_MODE) {
      // 演示模式：设置一个模拟用户
      console.log('演示模式：使用模拟用户')
      setUser({
        id: 'demo-user-id',
        email: 'demo@example.com',
        user_metadata: { full_name: '演示用户' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated'
      } as User)
      setLoading(false)
      return
    }

    // 获取初始会话
    const getInitialSession = async () => {
      try {
        const { session } = await authService.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('获取会话失败:', error)
        
        // 检查是否是 token 相关错误
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('Invalid Refresh Token') || 
            errorMessage.includes('Refresh Token Not Found') ||
            errorMessage.includes('refresh_token_not_found')) {
          console.warn('🔑 检测到无效的 refresh token，清理本地会话')
          // 清理可能存在的无效 token
          try {
            await authService.signOut()
          } catch (signOutError) {
            console.error('清理会话时出错:', signOutError)
          }
        }
        
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 监听认证状态变化
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('认证状态变化:', event, session?.user?.email)
        
        // 处理 token 失效的情况
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('🔄 Token 刷新失败，清理用户状态')
          setUser(null)
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          console.log('👋 用户已登出或删除')
          setUser(null)
        } else if (session?.user) {
          setUser(session.user)
        } else if (!session) {
          setUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (data: SignUpData) => {
    console.log('AuthContext: 开始注册流程')
    try {
      const result = await authService.signUp(data)
      console.log('AuthContext: 注册结果', result)
      return result
    } catch (error) {
      console.error('AuthContext: 注册异常', error)
      return { data: { user: null }, error }
    }
  }

  const signIn = async (data: SignInData) => {
    console.log('AuthContext: 开始登录流程')
    try {
      const result = await authService.signIn(data)
      console.log('AuthContext: 登录结果', result)
      return result
    } catch (error) {
      console.error('AuthContext: 登录异常', error)
      return { data: { user: null }, error }
    }
  }

  const signOut = async () => {
    console.log('AuthContext: 开始登出流程')
    try {
      const result = await authService.signOut()
      setUser(null)
      return result
    } catch (error) {
      console.error('AuthContext: 登出异常', error)
      return { error }
    }
  }

  const resetPassword = async (email: string) => {
    console.log('AuthContext: 开始重置密码流程')
    try {
      return await authService.resetPassword(email)
    } catch (error) {
      console.error('AuthContext: 重置密码异常', error)
      return { error }
    }
  }

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    console.log('AuthContext: 开始更新资料流程')
    try {
      const result = await authService.updateProfile(updates)
      if (result.user) {
        setUser(result.user)
      }
      return result
    } catch (error) {
      console.error('AuthContext: 更新资料异常', error)
      return { error }
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}