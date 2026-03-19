import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function AdminLoginPage(): JSX.Element {
  const { isAuthenticated, login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="panel login-card stack" aria-labelledby="admin-login-title">
        <span className="badge">开发者站</span>
        <h1 id="admin-login-title" style={{ margin: 0 }}>
          管理后台登录
        </h1>
        <p className="meta" style={{ marginTop: 0 }}>
          这里用于管理页面内容、作品资料、私信与评论，并查看手机端实时预览。
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label htmlFor="admin-email">
            管理员邮箱
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@yvanlouise.xyz"
              required
              autoComplete="username"
            />
          </label>

          <label htmlFor="admin-password">
            密码
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "登录中..." : "进入开发者后台"}
          </button>
        </form>

        <p className="meta" style={{ margin: 0 }}>
          生产环境使用 Supabase Auth 单管理员登录；如果你仍在本地旧后端模式调试，也可以在这里输入本地账号名。
        </p>

        {error ? <p className="notice error">{error}</p> : null}
      </section>
    </main>
  );
}
