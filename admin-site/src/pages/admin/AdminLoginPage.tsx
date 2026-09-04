import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function AdminLoginPage(): JSX.Element {
  const { isAuthenticated, login, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await login({ username: username.trim(), password });
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
          这里用于管理页面内容、作品资料、访客私信、评论反馈，以及手机端实时预览。
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label htmlFor="admin-username">
            管理员用户名
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              required
              autoComplete="username"
              disabled={submitting}
            />
          </label>

          <label htmlFor="admin-password">
            密码
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              disabled={submitting}
            />
          </label>

          <button type="button" className="btn btn-secondary" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "隐藏密码" : "显示密码"}</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "登录中..." : "进入开发者后台"}
          </button>
        </form>

        <p className="meta" style={{ margin: 0 }}>
          管理后台仅在本机使用。请先启动本地 API 服务，再使用本地配置的管理员账号登录。
        </p>

        {error ? <p className="notice error" role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
