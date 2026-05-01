import fs from "node:fs/promises";
import path from "node:path";
import {
  parsePageMeta,
  renderPageHtml,
  scanMarkdownFiles,
} from "../../scripts/build-content.ts";
import {
  buildPageIndex,
  type PageRef,
} from "../../scripts/wikilink-resolver.ts";
import type { WikilinkEnv } from "../../scripts/markdown-wikilink.ts";

export async function renderPreview(
  body: string,
  rel: string,
  docsDir: string
): Promise<string> {
  const fullPath = path.join(docsDir, rel);
  const meta = parsePageMeta(body, fullPath, docsDir);

  const filePaths = scanMarkdownFiles(docsDir);
  const refs: PageRef[] = [];
  let coveredSelf = false;
  for (const fp of filePaths) {
    if (path.resolve(fp) === path.resolve(fullPath)) {
      refs.push({ slug: meta.slug, title: meta.title, filename: meta.filename });
      coveredSelf = true;
    } else {
      const content = await fs.readFile(fp, "utf-8");
      const otherMeta = parsePageMeta(content, fp, docsDir);
      refs.push({
        slug: otherMeta.slug,
        title: otherMeta.title,
        filename: otherMeta.filename,
      });
    }
  }
  if (!coveredSelf) {
    refs.push({ slug: meta.slug, title: meta.title, filename: meta.filename });
  }

  const index = buildPageIndex(refs);
  const env: WikilinkEnv = {
    index,
    outbound: new Set<string>(),
    broken: [],
  };
  return renderPageHtml(meta, docsDir, env);
}
