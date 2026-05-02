import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { safeJoin } from "../path-safety.ts";

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"];

export type SaveImageResult =
  | { ok: true; markdown: string; savedPath: string }
  | { ok: false; status: number; error: string };

export async function saveImage(
  docsDir: string,
  docPath: string,
  filename: string,
  data: ArrayBuffer
): Promise<SaveImageResult> {
  if (!docPath.endsWith(".md")) {
    return { ok: false, status: 400, error: "docPath must end in .md" };
  }
  const docAbs = safeJoin(docsDir, docPath);
  if (!docAbs) return { ok: false, status: 400, error: "invalid docPath" };

  const cleanName = path.basename(filename);
  if (!cleanName || cleanName.startsWith(".")) {
    return { ok: false, status: 400, error: "invalid filename" };
  }
  const ext = path.extname(cleanName).toLowerCase();
  if (!IMAGE_EXTS.includes(ext)) {
    return { ok: false, status: 400, error: `unsupported image type: ${ext}` };
  }

  const docDir = path.dirname(docAbs);
  let target = path.join(docDir, cleanName);
  if (existsSync(target)) {
    const stem = cleanName.slice(0, cleanName.length - ext.length);
    let i = 1;
    while (existsSync((target = path.join(docDir, `${stem}-${i}${ext}`)))) {
      i++;
    }
  }

  await fs.mkdir(docDir, { recursive: true });
  await fs.writeFile(target, Buffer.from(data));

  const savedRel = path
    .relative(docsDir, target)
    .split(path.sep)
    .join("/");
  const finalName = path.basename(target);
  const altText = finalName.slice(0, finalName.length - ext.length);

  return {
    ok: true,
    markdown: `![${altText}](${finalName})`,
    savedPath: savedRel,
  };
}
