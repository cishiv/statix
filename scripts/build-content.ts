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
import type { ContentData, Graph, GraphEdge, GraphNode, NavNode, Page } from "../src/types.ts";
import { wikilinkPlugin, type WikilinkEnv } from "./markdown-wikilink.ts";
import { buildPageIndex, type PageRef } from "./wikilink-resolver.ts";

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

md.use(wikilinkPlugin);

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

type PageMeta = {
  slug: string;
  title: string;
  order: number;
  hidden: boolean;
  date: string | null;
  updated: string | null;
  group: string | null;
  hideInGraph: boolean;
  filename: string;
  filePath: string;
  body: string;
};

function filenameFor(filePath: string): string {
  const base = path.basename(filePath, ".md");
  if (base === "index") return path.basename(path.dirname(filePath));
  return base;
}

export function parsePage(content: string, filePath: string, docsDir: string): Page {
  const meta = parsePageMeta(content, filePath, docsDir);
  const env: WikilinkEnv = {
    index: buildPageIndex([]),
    outbound: new Set<string>(),
    broken: [],
  };
  const html = renderPageHtml(meta, docsDir, env);
  return {
    slug: meta.slug,
    title: meta.title,
    order: meta.order,
    hidden: meta.hidden,
    date: meta.date,
    updated: meta.updated,
    html,
    outbound: [],
    inbound: [],
  };
}

export function parsePageMeta(
  content: string,
  filePath: string,
  docsDir: string
): PageMeta {
  const { data: frontmatter, content: body } = matter(content);
  const slug = toSlug(filePath, docsDir);
  const filename = filenameFor(filePath);
  const title: string =
    (frontmatter.title as string) ??
    (path.basename(filePath, ".md") === "index"
      ? toTitleCase(path.basename(path.dirname(filePath)))
      : toTitleCase(path.basename(filePath, ".md")));
  const order: number =
    typeof frontmatter.order === "number" ? frontmatter.order : Infinity;
  const hidden: boolean = frontmatter.hidden === true;
  const date = normalizeDate(frontmatter.date);
  const updated = normalizeDate(frontmatter.updated);
  const group = typeof frontmatter.group === "string" ? frontmatter.group : null;
  const hideInGraph = frontmatter.hide_in_graph === true;

  return { slug, title, order, hidden, date, updated, group, hideInGraph, filename, filePath, body };
}

function renderPageHtml(
  meta: PageMeta,
  docsDir: string,
  wikilinkEnv: WikilinkEnv
): string {
  const env = {
    pageDir: path.dirname(meta.filePath),
    docsDir,
    ...wikilinkEnv,
  };
  const body_html: string = md.render(meta.body, env);
  const dateline = renderDateline(meta.date, meta.updated);
  return dateline ? insertAfterFirstH1(body_html, dateline) : body_html;
}

function appendReferencedBy(html: string, inbound: Page[]): string {
  if (inbound.length === 0) return html;
  const items = inbound
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((p) => `  <li><a class="wikilink" href="${p.slug}">${escapeHtml(p.title)}</a></li>`)
    .join("\n");
  return (
    html +
    `\n<section class="referenced-by">\n<h2>Referenced by</h2>\n<ul>\n${items}\n</ul>\n</section>`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function inferGroup(slug: string): string {
  if (slug === "/") return "root";
  const first = slug.slice(1).split("/")[0];
  return first || "root";
}

export function buildGraph(pages: Page[], metas: Map<string, PageMeta>): Graph {
  const nodes: GraphNode[] = pages.map((p) => {
    const meta = metas.get(p.slug);
    return {
      id: p.slug,
      title: p.title,
      group: meta?.group ?? inferGroup(p.slug),
      hidden: meta?.hideInGraph === true,
    };
  });
  const edges: GraphEdge[] = [];
  for (const p of pages) {
    for (const target of p.outbound) {
      edges.push({ source: p.slug, target });
    }
  }
  return { nodes, edges };
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

  const homePage = visiblePages.find((p) => p.slug === "/");
  if (homePage) {
    return [
      {
        slug: "/",
        title: homePage.title,
        order: homePage.order,
        hidden: false,
        children: [],
      },
      ...root.children,
    ];
  }

  return root.children;
}

export type BuildOutput = { content: ContentData; graph: Graph };

export function buildContent(docsDir: string, publicDir?: string): BuildOutput {
  const resolvedDir = path.resolve(docsDir);
  if (publicDir) {
    syncImages(resolvedDir, path.resolve(publicDir));
  }
  const filePaths = scanMarkdownFiles(resolvedDir);

  const metas: PageMeta[] = filePaths.map((fp) => {
    const content = fs.readFileSync(fp, "utf-8");
    return parsePageMeta(content, fp, resolvedDir);
  });

  const refs: PageRef[] = metas.map((m) => ({
    slug: m.slug,
    title: m.title,
    filename: m.filename,
  }));
  const index = buildPageIndex(refs);

  const renderedBodies = new Map<string, string>();
  const outboundMap = new Map<string, Set<string>>();
  const brokenLinks: { from: string; target: string }[] = [];

  for (const meta of metas) {
    const env: WikilinkEnv = {
      index,
      outbound: new Set<string>(),
      broken: [],
    };
    const html = renderPageHtml(meta, resolvedDir, env);
    renderedBodies.set(meta.slug, html);
    outboundMap.set(meta.slug, env.outbound);
    for (const b of env.broken) {
      brokenLinks.push({ from: meta.slug, target: b.target });
    }
  }

  const inboundMap = new Map<string, Set<string>>();
  for (const meta of metas) inboundMap.set(meta.slug, new Set<string>());
  for (const [from, targets] of outboundMap) {
    for (const target of targets) {
      if (from === target) continue;
      inboundMap.get(target)?.add(from);
    }
  }

  const pages: Page[] = metas.map((meta) => {
    const outbound = Array.from(outboundMap.get(meta.slug) ?? []).sort();
    const inbound = Array.from(inboundMap.get(meta.slug) ?? []).sort();
    const baseHtml = renderedBodies.get(meta.slug) ?? "";
    return {
      slug: meta.slug,
      title: meta.title,
      order: meta.order,
      hidden: meta.hidden,
      date: meta.date,
      updated: meta.updated,
      outbound,
      inbound,
      html: baseHtml,
    };
  });

  const pagesBySlug = new Map(pages.map((p) => [p.slug, p]));
  for (const page of pages) {
    const inboundPages = page.inbound
      .map((s) => pagesBySlug.get(s))
      .filter((p): p is Page => !!p && !p.hidden);
    page.html = appendReferencedBy(page.html, inboundPages);
  }

  if (brokenLinks.length > 0) {
    const byFrom = new Map<string, string[]>();
    for (const b of brokenLinks) {
      const list = byFrom.get(b.from) ?? [];
      list.push(b.target);
      byFrom.set(b.from, list);
    }
    console.warn(`\n[wikilink] ${brokenLinks.length} broken reference(s):`);
    for (const [from, targets] of byFrom) {
      console.warn(`  ${from}: ${targets.map((t) => `[[${t}]]`).join(", ")}`);
    }
  }

  const metasMap = new Map(metas.map((m) => [m.slug, m]));
  const graph = buildGraph(pages, metasMap);

  const nav = buildNavTree(pages);
  const pagesMap: Record<string, Page> = {};
  for (const page of pages) {
    pagesMap[page.slug] = page;
  }

  return { content: { nav, pages: pagesMap }, graph };
}

function main(): void {
  const docsDir = path.resolve("docs");
  if (!fs.existsSync(docsDir)) {
    console.error("Error: docs/ directory not found");
    process.exit(1);
  }

  const { content, graph } = buildContent("docs", "public");
  fs.writeFileSync(path.resolve("src/content.json"), JSON.stringify(content, null, 2));
  fs.writeFileSync(path.resolve("src/graph.json"), JSON.stringify(graph, null, 2));
  console.log(
    `Built content.json (${Object.keys(content.pages).length} pages) + graph.json (${graph.nodes.length} nodes, ${graph.edges.length} edges)`
  );
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]).replace(/\.ts$/, "") ===
    path.resolve(import.meta.url.replace("file://", "")).replace(/\.ts$/, "");

if (isDirectRun) {
  main();
}
