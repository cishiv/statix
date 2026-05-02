import fs from "node:fs/promises";
import path from "node:path";
import {
  parsePageMeta,
  scanMarkdownFiles,
} from "../../scripts/build-content.ts";

export type SearchHit = {
  path: string;
  title: string;
  snippet: string;
};

const SNIPPET_BEFORE = 30;
const SNIPPET_AFTER = 60;

export async function searchBodies(
  docsDir: string,
  query: string
): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (trimmed === "") return [];
  const needle = trimmed.toLowerCase();

  const filePaths = scanMarkdownFiles(docsDir);
  const hits: SearchHit[] = [];

  for (const fp of filePaths) {
    const content = await fs.readFile(fp, "utf-8");
    const meta = parsePageMeta(content, fp, docsDir);
    const body = meta.body;
    const idx = body.toLowerCase().indexOf(needle);
    if (idx === -1) continue;
    hits.push({
      path: path.relative(docsDir, fp).split(path.sep).join("/"),
      title: meta.title,
      snippet: makeSnippet(body, idx, needle.length),
    });
  }
  return hits;
}

function makeSnippet(body: string, idx: number, len: number): string {
  const start = Math.max(0, idx - SNIPPET_BEFORE);
  const end = Math.min(body.length, idx + len + SNIPPET_AFTER);
  let snippet = body.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < body.length) snippet = snippet + "…";
  return snippet;
}
