'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'

interface SignUpFormProps {
  onSwitchToLogin?: () => void
  onSuccess?: () => void
}

export function SignUpForm({ onSwitchToLogin, onSuccess }: SignUpFormProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ 
    fullName?: string
    email?: string
    password?: string
    confirmPassword?: string
    general?: string 
  }>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const { signUp } = useAuth()

  const validateForm = () => {
    const newErrors: { 
      fullName?: string
      email?: string
      password?: string
      confirmPassword?: string 
    } = {}

    if (!fullName.trim()) {
      newErrors.fullName = '请输入您的姓名'
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = '姓名至少需要2个字符'
    }

    if (!email) {
      newErrors.email = '请输入邮箱地址'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    if (!password) {
      newErrors.password = '请输入密码'
    } else if (password.length < 6) {
      newErrors.password = '密码至少需要6个字符'
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      newErrors.password = '密码需要包含字母和数字'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('📝 用户开始注册:', { email, fullName })
    
    if (!validateForm()) {
      console.log('❌ 表单验证失败')
      return
    }

    setLoading(true)
    setErrors({})
    console.log('🚀 开始提交注册表单...')

    // 添加超时处理
    const timeoutId = setTimeout(() => {
      console.warn('⏰ 注册请求超时')
      setLoading(false)
      setErrors({ general: '注册请求超时，请检查网络连接后重试' })
    }, 30000) // 30秒超时

    try {
      console.log('🔄 正在调用注册API...')
      const { data, error } = await signUp({ 
        email, 
        password, 
        fullName: fullName.trim() 
      })
      
      // 清除超时定时器
      clearTimeout(timeoutId)
      
      console.log('📋 注册结果:', { data, error })
      
      if (error) {
        console.error('❌ 注册失败:', error)
        if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
          setErrors({ general: '该邮箱已被注册，请使用其他邮箱或直接登录' })
        } else if (error.message?.includes('Invalid email')) {
          setErrors({ general: '邮箱格式不正确，请检查后重试' })
        } else if (error.message?.includes('Password')) {
          setErrors({ general: '密码不符合要求，请检查后重试' })
        } else {
          setErrors({ general: error.message || '注册失败，请稍后重试' })
        }
      } else {
        console.log('✅ 注册成功!')
        setSuccess(true)
        // 显示成功消息3秒后跳转
        setTimeout(() => {
          onSuccess?.()
        }, 3000)
      }
    } catch (error) {
      // 清除超时定时器
      clearTimeout(timeoutId)
      console.error('💥 注册过程中发生异常:', error)
      setErrors({ general: '注册过程中发生错误，请检查网络连接后重试' })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">注册成功！</h2>
          <p className="text-gray-600 mb-4">
            欢迎加入7个儿子AI助手平台！我们已向您的邮箱发送了验证邮件，请查收并点击验证链接完成账户激活。
          </p>
          <p className="text-sm text-gray-500">
            3秒后自动跳转到登录页面...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">注册账户</h2>
          <p className="text-gray-600 mt-2">加入7个儿子AI助手平台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="姓名"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="请输入您的姓名"
            error={errors.fullName}
            disabled={loading}
          />

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
            placeholder="请输入密码（至少6位，包含字母和数字）"
            error={errors.password}
            disabled={loading}
          />

          <Input
            label="确认密码"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入密码"
            error={errors.confirmPassword}
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
            {loading ? '注册中...' : '注册'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            已有账户？{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              立即登录
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}