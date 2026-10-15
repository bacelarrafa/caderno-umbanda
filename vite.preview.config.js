import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    {
      name: "stub",
      enforce: "pre",
      resolveId(src) {
        if (src.endsWith("/ml/cliente")) return path.resolve("preview/cliente-preview.js");
        if (src === "./demo") return path.resolve("preview/demo-preview.js");
      },
    },
  ],
  build: { outDir: "dist-preview" },
});
