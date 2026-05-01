import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  parsePageMeta,
  scanMarkdownFiles,
} from "../../scripts/build-content.ts";
import {
  buildPageIndex,
  resolveWikilink,
  type PageIndex,
  type PageRef,
} from "../../scripts/wikilink-resolver.ts";

const WIKILINK_RE = /\[\[([^\]\n[]+)\]\]/g;

export type WikilinkRewrite = {
  path: string;
  changes: number;
};

export type MoveResult =
  | { ok: true; rewrites: WikilinkRewrite[] }
  | { ok: false; reason: string };

function execGit(args: string[], cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("git", args, { cwd, stdio: "ignore" });
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

export async function moveDoc(
  docsDir: string,
  fromAbs: string,
  toAbs: string,
  cwd: string = process.cwd()
): Promise<MoveResult> {
  if (!existsSync(fromAbs)) return { ok: false, reason: "from does not exist" };
  if (existsSync(toAbs)) return { ok: false, reason: "to already exists" };

  const filePathsBefore = scanMarkdownFiles(docsDir);
  const refsBefore: PageRef[] = [];
  let movedSlug = "";
  let movedTitle = "";
  for (const fp of filePathsBefore) {
    const content = await fs.readFile(fp, "utf-8");
    const meta = parsePageMeta(content, fp, docsDir);
    refsBefore.push({
      slug: meta.slug,
      title: meta.title,
      filename: meta.filename,
    });
    if (path.resolve(fp) === path.resolve(fromAbs)) {
      movedSlug = meta.slug;
      movedTitle = meta.title;
    }
  }
  const oldIndex = buildPageIndex(refsBefore);

  await fs.mkdir(path.dirname(toAbs), { recursive: true });
  const gitOk = await execGit(["mv", fromAbs, toAbs], cwd);
  if (!gitOk) {
    await fs.rename(fromAbs, toAbs);
  }

  const rewrites = await rewriteIncomingWikilinks(
    docsDir,
    oldIndex,
    movedSlug,
    movedTitle,
    toAbs
  );

  return { ok: true, rewrites };
}

async function rewriteIncomingWikilinks(
  docsDir: string,
  oldIndex: PageIndex,
  targetSlug: string,
  newTitle: string,
  excludeAbs: string
): Promise<WikilinkRewrite[]> {
  const filePaths = scanMarkdownFiles(docsDir);
  const rewrites: WikilinkRewrite[] = [];

  for (const fp of filePaths) {
    if (path.resolve(fp) === path.resolve(excludeAbs)) continue;
    const content = await fs.readFile(fp, "utf-8");
    let changes = 0;
    const next = content.replace(WIKILINK_RE, (whole, inner: string) => {
      const pipeIdx = inner.indexOf("|");
      const target = (pipeIdx === -1 ? inner : inner.slice(0, pipeIdx)).trim();
      const display = pipeIdx === -1 ? "" : inner.slice(pipeIdx + 1);
      const ref = resolveWikilink(target, oldIndex);
      if (!ref || ref.slug !== targetSlug) return whole;
      changes++;
      return display ? `[[${newTitle}|${display}]]` : `[[${newTitle}]]`;
    });
    if (next !== content) {
      await fs.writeFile(fp, next, "utf-8");
      rewrites.push({
        path: path.relative(docsDir, fp).split(path.sep).join("/"),
        changes,
      });
    }
  }
  return rewrites;
}
