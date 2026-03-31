import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    headers: {
      // مطلوب للـ Service Worker
      "Service-Worker-Allowed": "/",
    },
  },
  build: {
    // تأكد إن sw.js يُنسخ كما هو
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
