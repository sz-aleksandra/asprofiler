/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/api/**", "src/utils/**", "src/hooks/**"],
      exclude: [
        "src/**/*.test.{js,jsx}",
        "test/**",
        "src/**/*Plot.js",
        "src/**/plotConstants.js",
        "src/**/constants.js",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 95,
      },
    },
  },
});
