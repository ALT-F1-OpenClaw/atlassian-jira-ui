import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    allowedHosts: ["atlf1be-raspberry-pi-4.tail981e59.ts.net"],
    proxy: {
      "/api": {
        target: "http://localhost:35400",
        changeOrigin: true,
      },
    },
  },
});
