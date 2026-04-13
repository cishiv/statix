import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import markdownIt from "markdown-it";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import python from "highlight.js/lib/languages/python";
import type { ContentData, NavNode, Page } from "../src/types.ts";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);

const md = markdownIt({
  html: true,
  linkify: true,
  highlight: (str: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(str, { language: lang }).value;
    }
    return "";
  },
});

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"];
const PUBLIC_ASSET_ROOT = "/_docs";

function isRelativeUrl(url: string): boolean {
  if (!url) return false;
  if (/^[a-z]+:\/\//i.test(url)) return false;
  if (url.startsWith("//")) return false;
  if (url.startsWith("/")) return false;
  if (url.startsWith("data:")) return false;
  if (url.startsWith("#")) return false;
  return true;
}

function resolveImageUrl(src: string, pageDir: string, docsDir: string): string {
  if (!isRelativeUrl(src)) return src;
  const absolute = path.resolve(pageDir, src);
  const relative = path.relative(docsDir, absolute);
  if (relative.startsWith("..")) return src;
  return PUBLIC_ASSET_ROOT + "/" + relative.split(path.sep).join("/");
}

const defaultImageRenderer =
  md.renderer.rules.image ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const srcIndex = token.attrIndex("src");
  if (srcIndex >= 0 && env?.pageDir && env?.docsDir) {
    const src = token.attrs![srcIndex][1];
    token.attrs![srcIndex][1] = resolveImageUrl(src, env.pageDir, env.docsDir);
  }
  return defaultImageRenderer(tokens, idx, options, env, self);
};

export function scanImageFiles(docsDir: string): string[] {
  const results: string[] = [];
  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  };
  walk(docsDir);
  return results;
}

export function syncImages(docsDir: string, publicDir: string): number {
  const targetRoot = path.join(publicDir, "_docs");
  if (fs.existsSync(targetRoot)) {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
  const files = scanImageFiles(docsDir);
  for (const file of files) {
    const relative = path.relative(docsDir, file);
    const dest = path.join(targetRoot, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
  return files.length;
}

export function toSlug(filePath: string, docsDir: string): string {
  const relative = path.relative(docsDir, filePath);
  const withoutExt = relative.replace(/\.md$/, "");
  const normalized = withoutExt.split(path.sep).join("/");

  if (normalized === "index") return "/";
  if (normalized.endsWith("/index")) return "/" + normalized.slice(0, -6);

  return "/" + normalized;
}

export function toTitleCase(kebab: string): string {
  return kebab
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function scanMarkdownFiles(docsDir: string): string[] {
  const results: string[] = [];

  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  };

  walk(docsDir);
  return results.sort();
}

export function parsePage(
  content: string,
  filePath: string,
  docsDir: string
): Page {
  const { data: frontmatter, content: body } = matter(content);
  const slug = toSlug(filePath, docsDir);
  const filename = path.basename(filePath, ".md");
  const title: string =
    (frontmatter.title as string) ??
    (filename === "index" ? toTitleCase(path.basename(path.dirname(filePath))) : toTitleCase(filename));
  const order: number =
    typeof frontmatter.order === "number" ? frontmatter.order : Infinity;
  const hidden: boolean = frontmatter.hidden === true;
  const date = normalizeDate(frontmatter.date);
  const updated = normalizeDate(frontmatter.updated);
  const body_html: string = md.render(body, { pageDir: path.dirname(filePath), docsDir });
  const dateline = renderDateline(date, updated);
  const html = dateline ? insertAfterFirstH1(body_html, dateline) : body_html;

  return { slug, title, order, hidden, html, date, updated };
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function insertAfterFirstH1(html: string, dateline: string): string {
  const match = html.match(/<\/h1>/);
  if (!match || match.index === undefined) return dateline + html;
  const cut = match.index + match[0].length;
  return html.slice(0, cut) + dateline + html.slice(cut);
}

function renderDateline(date: string | null, updated: string | null): string {
  if (!date && !updated) return "";
  const parts: string[] = [];
  if (date) parts.push(`Published ${formatDate(date)}`);
  if (updated && updated !== date) parts.push(`Updated ${formatDate(updated)}`);
  if (parts.length === 0) return "";
  return `<p class="dateline">${parts.join(" · ")}</p>`;
}

export function buildNavTree(pages: Page[]): NavNode[] {
  const visiblePages = pages.filter((p) => !p.hidden);

  const root: NavNode = {
    slug: "",
    title: "",
    order: 0,
    hidden: false,
    children: [],
  };

  for (const page of visiblePages) {
    const segments = page.slug === "/" ? [] : page.slug.slice(1).split("/");
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const partialSlug = "/" + segments.slice(0, i + 1).join("/");
      const isLeaf = i === segments.length - 1;

      let child = current.children.find((c) => c.slug === partialSlug);

      if (!child) {
        child = {
          slug: partialSlug,
          title: isLeaf ? page.title : toTitleCase(segment),
          order: isLeaf ? page.order : Infinity,
          hidden: false,
          children: [],
        };
        current.children.push(child);
      }

      if (isLeaf) {
        child.title = page.title;
        child.order = page.order;
      }

      current = child;
    }

    if (page.slug === "/") {
      root.slug = "/";
      root.title = page.title;
      root.order = page.order;
    }
  }

  const sortNodes = (nodes: NavNode[]): NavNode[] => {
    for (const node of nodes) {
      node.children = sortNodes(node.children);
    }
    return nodes.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title);
    });
  };

  sortNodes(root.children);

  return root.children;
}

export function buildContent(docsDir: string, publicDir?: string): ContentData {
  const resolvedDir = path.resolve(docsDir);
  if (publicDir) {
    syncImages(resolvedDir, path.resolve(publicDir));
  }
  const filePaths = scanMarkdownFiles(resolvedDir);
  const pages: Page[] = filePaths.map((fp) => {
    const content = fs.readFileSync(fp, "utf-8");
    return parsePage(content, fp, resolvedDir);
  });

  const nav = buildNavTree(pages);
  const pagesMap: Record<string, Page> = {};
  for (const page of pages) {
    pagesMap[page.slug] = page;
  }

  return { nav, pages: pagesMap };
}

function main(): void {
  const docsDir = path.resolve("docs");
  if (!fs.existsSync(docsDir)) {
    console.error("Error: docs/ directory not found");
    process.exit(1);
  }

  const contentData = buildContent("docs", "public");
  const outPath = path.resolve("src/content.json");
  fs.writeFileSync(outPath, JSON.stringify(contentData, null, 2));
  console.log(`Built content.json (${Object.keys(contentData.pages).length} pages)`);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]).replace(/\.ts$/, "") ===
    path.resolve(import.meta.url.replace("file://", "")).replace(/\.ts$/, "");

if (isDirectRun) {
  main();
}
