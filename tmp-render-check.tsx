import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { App } from "./frontend/src/App.tsx";
import { AuthProvider } from "./frontend/src/context/AuthContext.tsx";

try {
  const html = renderToString(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
  console.log("RENDER_OK");
  console.log(html.slice(0, 500));
} catch (error) {
  console.error("RENDER_FAIL");
  console.error(error);
  process.exit(1);
}
