/// <reference types="vitest" />
import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

interface ViteConfigWithTest extends UserConfig {
  test?: {
    globals?: boolean;
    environment?: string;
    setupFiles?: string[];
  };
}

const config: ViteConfigWithTest = {
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "DívidaZero",
        short_name: "DívidaZero",
        description: "Plano de eliminação de dívidas",
        theme_color: "#818cf8",
        background_color: "#080d19",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
};

export default defineConfig(config);
