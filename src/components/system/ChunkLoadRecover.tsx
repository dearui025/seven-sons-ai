"use client";

import { useEffect } from "react";

/**
 * 自动恢复 ChunkLoadError / 动态模块加载失败导致的白屏问题：
 * 当用户的 HTML/路由预取与最新部署的静态资源不一致时，可能出现 Loading chunk failed。
 * 该组件会在捕获到相关错误时，进行一次带缓存破坏参数的页面刷新以恢复。
 */
export default function ChunkLoadRecover() {
  useEffect(() => {
    const onceKey = "chunk_reload_once";

    const reloadOnce = () => {
      try {
        if (sessionStorage.getItem(onceKey) === "1") return;
        sessionStorage.setItem(onceKey, "1");
      } catch {}
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("__r", String(Date.now()));
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    };

    const isChunkErrorMessage = (msg?: string) => {
      if (!msg) return false;
      return (
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module")
      );
    };

    const onError = (e: ErrorEvent) => {
      const msg = e?.message || "";
      if (isChunkErrorMessage(msg)) {
        console.warn("捕获到 ChunkLoadError，准备刷新以恢复", msg);
        reloadOnce();
      }
    };

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reason: any = e?.reason;
      const msg =
        typeof reason === "string"
          ? reason
          : reason?.message || reason?.toString?.() || "";
      const name = reason?.name || "";
      if (name === "ChunkLoadError" || isChunkErrorMessage(msg)) {
        console.warn("捕获到未处理的 ChunkLoadError，准备刷新以恢复", { name, msg });
        reloadOnce();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}