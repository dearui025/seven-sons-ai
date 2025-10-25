"use client"

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary 捕获到错误:', error)
    console.error('📍 错误信息:', errorInfo)
    
    // 调用自定义错误处理函数
    this.props.onError?.(error, errorInfo)
    
    // 检查是否是RSC相关错误
    const isRSCError = error.message.includes('RSC') || 
                      error.message.includes('Failed to fetch') ||
                      error.message.includes('ERR_ABORTED')
    
    if (isRSCError) {
      console.log('🔄 检测到RSC错误，准备重试')
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`🔄 重试 ${this.state.retryCount + 1}/${this.maxRetries}`)
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                页面加载出错
              </h2>
              <p className="text-gray-600 mb-4">
                抱歉，页面遇到了一些问题
              </p>
              
              {this.state.error && (
                <details className="text-left bg-gray-50 p-3 rounded text-sm mb-4">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    错误详情
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
            
            <div className="space-y-3">
              {this.state.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  重试 ({this.state.retryCount + 1}/{this.maxRetries})
                </button>
              )}
              
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                返回首页
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 函数式组件包装器，用于更简单的使用
interface ErrorBoundaryWrapperProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ErrorBoundaryWrapper({ children, fallback }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary 
      fallback={fallback}
      onError={(error, errorInfo) => {
        // 可以在这里添加错误上报逻辑
        console.error('🚨 应用错误:', { error, errorInfo })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}