"use client"

import React from "react"

// 全局错误边界：当 App Router 在开发或运行时出现未捕获错误时，使用该组件替代 Next 的内置 global-error。
// 这可以规避开发模式下 React Client Manifest 缺少内置错误组件时的报错，确保页面能正常渲染并提供重试入口。
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const digest = (error as any)?.digest
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h1 className="text-2xl font-bold text-red-700 mb-2">应用发生错误</h1>
            <p className="text-sm text-red-600 mb-4">
              抱歉，渲染过程中出现异常。您可以尝试刷新或点击“重试”。
            </p>
            <div className="bg-white rounded-md border p-4 mb-4">
              <div className="text-sm font-mono whitespace-pre-wrap break-all">
                {error?.message || String(error)}
              </div>
              {digest ? (
                <div className="text-xs text-gray-500 mt-2">错误摘要: {digest}</div>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-white text-sm hover:bg-red-700"
                onClick={() => reset()}
              >
                重试
              </button>
              <button
                className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-white text-sm hover:bg-black"
                onClick={() => {
                  try {
                    const url = new URL(window.location.href)
                    url.searchParams.set("__r", String(Date.now()))
                    window.location.replace(url.toString())
                  } catch {
                    window.location.reload()
                  }
                }}
              >
                强制刷新
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}