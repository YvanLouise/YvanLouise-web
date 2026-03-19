import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function AdminLoginPage(): JSX.Element {
  const { isAuthenticated, login, loading } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ username, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请检查账号或密码。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="panel login-card stack" aria-labelledby="admin-login-title">
        <span className="badge">开发者模式</span>
        <h1 id="admin-login-title" style={{ margin: 0 }}>
          登录开发者后台
        </h1>
        <p className="meta" style={{ marginTop: 0 }}>
          仅站长可访问。登录后可以编辑站点内容、管理作品、查看私信与评论，并使用手机端预览工作台。
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label htmlFor="admin-user">
            用户名
            <input
              id="admin-user"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
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
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "登录中..." : "进入开发者后台"}
          </button>
        </form>

        {error ? <p className="notice error">{error}</p> : null}
      </section>
    </main>
  );
}
