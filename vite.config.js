import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    host: true,
    allowedHosts: [
      "5173-ii3o9ej848a6ntfn7mwb1-0b0a8dea.manusvm.computer", 
      "5173-ikfzmlzpeli5nycs88zvw-0b0a8dea.manusvm.computer",
      "5174-ikfzmlzpeli5nycs88zvw-0b0a8dea.manusvm.computer"
    ]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
