import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatProvider } from '@/contexts/ChatContext'
import { TaskProvider } from '@/contexts/TaskContext'
import { Navigation } from '@/components/layout/Navigation'
import ChunkLoadRecover from '@/components/system/ChunkLoadRecover'

export const metadata: Metadata = {
  title: "7个儿子 - AI智能助手平台",
  description: "与7个独特的AI角色对话，体验个性化的智能助手服务",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-background">
        <AuthProvider>
          <ChatProvider>
            <TaskProvider>
              <Navigation />
              {/* 全局 ChunkLoadError 自动恢复（客户端组件） */}
              <ChunkLoadRecover />
              <main className="min-h-screen">
                {children}
              </main>
            </TaskProvider>
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
