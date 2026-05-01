import fs from "node:fs/promises";
import path from "node:path";
import {
  parsePageMeta,
  scanMarkdownFiles,
} from "../../scripts/build-content.ts";

export type DocSummary = {
  path: string;
  slug: string;
  title: string;
  order: number | null;
  hidden: boolean;
};

export async function listDocs(docsDir: string): Promise<DocSummary[]> {
  const filePaths = scanMarkdownFiles(docsDir);
  const docs: DocSummary[] = [];
  for (const fp of filePaths) {
    const content = await fs.readFile(fp, "utf-8");
    const meta = parsePageMeta(content, fp, docsDir);
    docs.push({
      path: path.relative(docsDir, fp).split(path.sep).join("/"),
      slug: meta.slug,
      title: meta.title,
      order: meta.order === Infinity ? null : meta.order,
      hidden: meta.hidden,
    });
  }
  return docs;
}

export async function readDocFile(absPath: string): Promise<string> {
  return fs.readFile(absPath, "utf-8");
}

export async function writeDocFile(
  absPath: string,
  body: string
): Promise<void> {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, body, "utf-8");
}

export async function deleteDocFile(absPath: string): Promise<void> {
  await fs.unlink(absPath);
}
