import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { type Plugin } from "vite";
import { buildContent } from "./scripts/build-content.ts";
import fs from "node:fs";
import path from "node:path";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"];

function markdownPlugin(): Plugin {
  const contentPath = path.resolve("src/content.json");
  const docsDir = path.resolve("docs");
  const publicDir = path.resolve("public");

  const generate = (): void => {
    if (!fs.existsSync(docsDir)) return;
    const data = buildContent("docs", "public");
    fs.writeFileSync(contentPath, JSON.stringify(data, null, 2));
  };

  return {
    name: "statix-markdown",
    buildStart() {
      generate();
    },
    configureServer(server) {
      server.watcher.add(docsDir);
      const onImageChange = (file: string): void => {
        if (!file.startsWith(docsDir)) return;
        const ext = path.extname(file).toLowerCase();
        if (!IMAGE_EXTENSIONS.includes(ext)) return;
        generate();
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", onImageChange);
      server.watcher.on("change", onImageChange);
      server.watcher.on("unlink", onImageChange);
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
