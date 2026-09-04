import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { App } from "./App";
import "@shared/styles/tokens.css";
import "@shared/styles/main.css";
import "./enhancements.css";

function normalizeBasePath(value: string): string {
  if (!value) {
    return "/";
  }

  let next = value.trim();
  if (!next.startsWith("/")) {
    next = `/${next}`;
  }
  if (!next.endsWith("/")) {
    next += "/";
  }
  return next;
}

function resolveRuntimeBasename(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  const repoBase = normalizeBasePath(import.meta.env.VITE_REPOSITORY_BASE || "/YvanLouise-web/");
  const onGithubPagesHost = /\.github\.io$/i.test(window.location.hostname);

  if (!onGithubPagesHost) {
    return "/";
  }

  const currentPath = normalizeBasePath(window.location.pathname);
  return currentPath.startsWith(repoBase) ? repoBase : "/";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter basename={resolveRuntimeBasename()} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>
);
