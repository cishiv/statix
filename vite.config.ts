import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { type Plugin } from "vite";
import { buildContent } from "./scripts/build-content.ts";
import fs from "node:fs";
import path from "node:path";

function markdownPlugin(): Plugin {
  const contentPath = path.resolve("src/content.json");
  const docsDir = path.resolve("docs");

  const generate = (): void => {
    if (!fs.existsSync(docsDir)) return;
    const data = buildContent("docs");
    fs.writeFileSync(contentPath, JSON.stringify(data, null, 2));
  };

  return {
    name: "statix-markdown",
    buildStart() {
      generate();
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".md") && file.startsWith(docsDir)) {
        generate();
        const mod = server.moduleGraph.getModuleById(contentPath);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          return [mod];
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [markdownPlugin(), preact()],
});
