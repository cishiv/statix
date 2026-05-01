import fs from "node:fs/promises";
import {
  parsePageMeta,
  scanMarkdownFiles,
} from "../../scripts/build-content.ts";

export type LinkEntry = {
  title: string;
  slug: string;
};

export async function listLinks(docsDir: string): Promise<LinkEntry[]> {
  const filePaths = scanMarkdownFiles(docsDir);
  const links: LinkEntry[] = [];
  for (const fp of filePaths) {
    const content = await fs.readFile(fp, "utf-8");
    const meta = parsePageMeta(content, fp, docsDir);
    links.push({ title: meta.title, slug: meta.slug });
  }
  return links;
}
