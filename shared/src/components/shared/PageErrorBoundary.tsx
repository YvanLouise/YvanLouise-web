import { Component, type PropsWithChildren, type ReactNode } from "react";

export class PageErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <section className="status-card stack" role="alert">
      <h1>页面暂时无法显示</h1>
      <p>可能是网络中断或网站刚刚更新，请重新加载页面。</p>
      <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>重新加载</button>
    </section>;
  }
}
