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
  const html: string = md.render(body);

  return { slug, title, order, hidden, html };
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

export function buildContent(docsDir: string): ContentData {
  const resolvedDir = path.resolve(docsDir);
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

  const contentData = buildContent("docs");
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
