'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'

interface LoginFormProps {
  onSwitchToSignUp?: () => void
  onSuccess?: () => void
}

export function LoginForm({ onSwitchToSignUp, onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ 
    email?: string
    password?: string
    general?: string 
  }>({})
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  
  const { signIn, resetPassword } = useAuth()
  const router = useRouter()

  const validateForm = () => {
    const newErrors: { 
      email?: string
      password?: string 
    } = {}

    if (!email) {
      newErrors.email = '请输入邮箱地址'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    if (!password) {
      newErrors.password = '请输入密码'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔐 用户开始登录:', { email })
    
    if (!validateForm()) {
      console.log('❌ 表单验证失败')
      return
    }

    setLoading(true)
    setErrors({})
    console.log('🚀 开始提交登录表单...')

    try {
      const { data, error } = await signIn({ email, password })
      
      console.log('📋 登录结果:', { data, error })
      
      if (error) {
        console.error('❌ 登录失败:', error)
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid email or password')) {
          setErrors({ general: '邮箱或密码错误，请检查后重试' })
        } else if (error.message?.includes('Email not confirmed')) {
          setErrors({ general: '请先验证您的邮箱地址，检查邮件中的验证链接' })
        } else if (error.message?.includes('Too many requests')) {
          setErrors({ general: '登录尝试过于频繁，请稍后再试' })
        } else {
          setErrors({ general: error.message || '登录失败，请检查邮箱和密码' })
        }
      } else if (data.user) {
        console.log('✅ 登录成功!')
        setLoginSuccess(true)
        // 显示成功消息后跳转
        setTimeout(() => {
          onSuccess?.()
          router.push('/')
        }, 1500)
      }
    } catch (error) {
      console.error('💥 登录过程中发生异常:', error)
      setErrors({ general: '登录过程中发生错误，请检查网络连接后重试' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔄 用户开始重置密码:', { email: resetEmail })
    
    if (!resetEmail) {
      setErrors({ email: '请输入邮箱地址' })
      return
    }
    
    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setErrors({ email: '请输入有效的邮箱地址' })
      return
    }

    setResetLoading(true)
    setErrors({})
    console.log('🚀 开始发送重置邮件...')

    try {
      const { error } = await resetPassword(resetEmail)
      
      console.log('📋 重置密码结果:', { error })
      
      if (error) {
        console.error('❌ 发送重置邮件失败:', error)
        if (error.message?.includes('User not found')) {
          setErrors({ general: '该邮箱地址未注册，请检查后重试' })
        } else {
          setErrors({ general: error.message || '发送重置邮件失败，请稍后重试' })
        }
      } else {
        console.log('✅ 重置邮件发送成功!')
        setResetSuccess(true)
        setTimeout(() => {
          setShowForgotPassword(false)
          setResetSuccess(false)
          setResetEmail('')
        }, 3000)
      }
    } catch (error) {
      console.error('💥 发送重置邮件过程中发生异常:', error)
      setErrors({ general: '发送重置邮件过程中发生错误，请稍后重试' })
    } finally {
      setResetLoading(false)
    }
  }

  // 登录成功页面
  if (loginSuccess) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">登录成功！</h2>
          <p className="text-gray-600 mb-4">
            欢迎回到7个儿子AI助手平台
          </p>
          <p className="text-sm text-gray-500">
            正在跳转到主页...
          </p>
        </div>
      </div>
    )
  }

  if (showForgotPassword) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">重置密码</h2>
            <p className="text-gray-600 mt-2">输入您的邮箱地址，我们将发送重置链接</p>
          </div>

          {resetSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">邮件已发送</h3>
              <p className="text-gray-600 mb-4">
                我们已向您的邮箱发送了密码重置链接，请查收邮件并按照说明操作。
              </p>
              <p className="text-sm text-gray-500">
                3秒后自动返回登录页面...
              </p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                label="邮箱地址"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="请输入您的邮箱地址"
                error={errors.email}
                disabled={resetLoading}
              />

              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{errors.general}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                loading={resetLoading}
                disabled={resetLoading}
              >
                {resetLoading ? '发送中...' : '发送重置邮件'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              返回登录
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">登录</h2>
          <p className="text-gray-600 mt-2">欢迎回到7个儿子AI助手平台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="邮箱地址"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入您的邮箱地址"
            error={errors.email}
            disabled={loading}
          />

          <Input
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入您的密码"
            error={errors.password}
            disabled={loading}
          />

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            还没有账户？{' '}
            <button
              onClick={onSwitchToSignUp}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              立即注册
            </button>
          </p>
        </div>

        <div className="mt-4 text-center">
          <button 
            onClick={() => setShowForgotPassword(true)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            忘记密码？
          </button>
        </div>
      </div>
    </div>
  )
}