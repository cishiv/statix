import path from "node:path";

/**
 * Joins a relative path under a root directory and confirms it stays inside.
 * Returns the absolute path on success, null on escape attempt or invalid
 * input. Pure — no filesystem access (symlinks not followed).
 */
export function safeJoin(root: string, rel: string): string | null {
  if (typeof rel !== "string" || rel === "") return null;
  if (path.isAbsolute(rel)) return null;

  const absRoot = path.resolve(root);
  const resolved = path.resolve(absRoot, rel);

  if (resolved === absRoot) return resolved;
  const rootWithSep = absRoot + path.sep;
  if (!resolved.startsWith(rootWithSep)) return null;

  return resolved;
}
