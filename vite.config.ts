import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.md"],
  server: {
    host: true,
    allowedHosts: [".ts.net", "elliots-macbook-air"],
  },
});
