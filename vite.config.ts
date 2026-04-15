import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
// GitHub Pages project URL: https://<user>.github.io/<repo>/
const repoBase = "/HowManyMe/"

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? repoBase : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
