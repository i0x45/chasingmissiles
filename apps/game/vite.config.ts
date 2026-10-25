import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes("/phaser/") ? "phaser" : undefined),
      },
    },
  },
  server: { fs: { allow: ["../.."] } },
});
