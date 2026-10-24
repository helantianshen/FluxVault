import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (
    command === "build" &&
    mode === "production" &&
    !env.VITE_ADMIN_API_URL &&
    !process.env.VITE_ADMIN_API_URL
  )
    throw new Error("构建时必须提供 VITE_ADMIN_API_URL");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
  };
});
