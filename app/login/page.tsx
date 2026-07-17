"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin/settings";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(redirect);
        router.refresh();
      } else {
        setError(data.error || "登录失败");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">
        <div className="bg-card-bg rounded-lg shadow-[var(--card-shadow-hover)] p-10 border border-border-color">
          {/* Netflix Logo Style */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl font-bold text-primary mb-2"
              style={{ fontFamily: '"Smiley Sans", sans-serif' }}
            >
              不看
            </h1>
            <p className="text-muted-foreground text-lg">后台管理系统</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-2"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-border-color rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
                placeholder="请输入管理员密码"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-primary/10 border border-primary/50 rounded p-3 text-primary text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold py-3 px-4 rounded transition duration-200"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>默认密码：bukan</p>
            <p className="mt-1">可通过环境变量 ADMIN_PASSWORD 修改</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-foreground">加载中...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
