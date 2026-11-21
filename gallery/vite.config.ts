import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { runsApi } from "./server/plugin.ts";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: here("."),
  plugins: [
    react(),
    tailwindcss(),
    runsApi({ results: here("../evals/results"), fixtures: here("./fixtures") }),
  ],
  resolve: { alias: { "@": here("./src") } },
});
