import path from "node:path";

export type PageRef = {
  slug: string;
  filename: string;
  title: string;
};

export type PageIndex = {
  bySlug: Map<string, PageRef>;
  byKey: Map<string, PageRef[]>;
};

export function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function filenameFromSlug(slug: string): string {
  if (slug === "/") return "index";
  return slug.split("/").filter(Boolean).pop() ?? "index";
}

export function buildPageIndex(refs: PageRef[]): PageIndex {
  const bySlug = new Map<string, PageRef>();
  const byKey = new Map<string, PageRef[]>();

  const push = (key: string, ref: PageRef): void => {
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.includes(ref)) existing.push(ref);
    } else {
      byKey.set(key, [ref]);
    }
  };

  for (const ref of refs) {
    bySlug.set(ref.slug, ref);
    push(normalizeKey(ref.filename), ref);
    push(normalizeKey(ref.title), ref);
    push(normalizeKey(ref.slug), ref);
  }

  return { bySlug, byKey };
}

export function resolveWikilink(target: string, index: PageIndex): PageRef | null {
  const trimmed = target.trim();
  if (!trimmed) return null;

  if (trimmed.includes("/")) {
    const slug = "/" + trimmed.replace(/^\/+|\/+$/g, "");
    const viaSlug = index.bySlug.get(slug);
    if (viaSlug) return viaSlug;
  }

  const matches = index.byKey.get(normalizeKey(trimmed));
  if (!matches || matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  const key = normalizeKey(trimmed);
  const filenameMatch = matches.find((m) => normalizeKey(m.filename) === key);
  if (filenameMatch) return filenameMatch;
  return [...matches].sort((a, b) => a.slug.localeCompare(b.slug))[0];
}

export function refFromFilePath(slug: string, title: string, filePath: string): PageRef {
  const filename = filePath
    ? path.basename(filePath, ".md") === "index"
      ? path.basename(path.dirname(filePath))
      : path.basename(filePath, ".md")
    : filenameFromSlug(slug);
  return { slug, title, filename };
}
