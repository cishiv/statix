import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  toSlug,
  toTitleCase,
  parsePage,
  buildNavTree,
  buildContent,
} from "./build-content.ts";
import type { Page } from "../src/types.ts";

describe("toSlug", () => {
  const docsDir = "/project/docs";

  it("converts a regular file path to a slug", () => {
    const result: string = toSlug("/project/docs/installation.md", docsDir);
    expect(result).toBe("/installation");
  });

  it("converts a nested file path to a slug", () => {
    const result: string = toSlug(
      "/project/docs/getting-started/installation.md",
      docsDir
    );
    expect(result).toBe("/getting-started/installation");
  });

  it("converts root index.md to /", () => {
    const result: string = toSlug("/project/docs/index.md", docsDir);
    expect(result).toBe("/");
  });

  it("converts a directory index.md to the directory path", () => {
    const result: string = toSlug(
      "/project/docs/getting-started/index.md",
      docsDir
    );
    expect(result).toBe("/getting-started");
  });

  it("converts deeply nested files", () => {
    const result: string = toSlug(
      "/project/docs/a/b/c/deep.md",
      docsDir
    );
    expect(result).toBe("/a/b/c/deep");
  });
});

describe("toTitleCase", () => {
  it("converts kebab-case to title case", () => {
    const result: string = toTitleCase("getting-started");
    expect(result).toBe("Getting Started");
  });

  it("handles single word", () => {
    const result: string = toTitleCase("installation");
    expect(result).toBe("Installation");
  });

  it("handles multi-word kebab", () => {
    const result: string = toTitleCase("my-cool-feature");
    expect(result).toBe("My Cool Feature");
  });

  it("handles already capitalized words", () => {
    const result: string = toTitleCase("API");
    expect(result).toBe("API");
  });
});

describe("parsePage", () => {
  const docsDir = "/project/docs";

  it("extracts frontmatter title, order, and renders HTML", () => {
    const content = `---
title: Installation Guide
order: 2
---

# Install

Run \`npm install\`.
`;
    const result: Page = parsePage(
      content,
      "/project/docs/installation.md",
      docsDir
    );

    expect(result.slug).toBe("/installation");
    expect(result.title).toBe("Installation Guide");
    expect(result.order).toBe(2);
    expect(result.hidden).toBe(false);
    expect(result.html).toContain("<h1>Install</h1>");
    expect(result.html).toContain("<code>npm install</code>");
  });

  it("falls back to title case of filename when title is missing", () => {
    const content = `---
order: 1
---

Some content.
`;
    const result: Page = parsePage(
      content,
      "/project/docs/my-guide.md",
      docsDir
    );

    expect(result.title).toBe("My Guide");
  });

  it("falls back to directory name for index files without title", () => {
    const content = `# Hello`;
    const result: Page = parsePage(
      content,
      "/project/docs/getting-started/index.md",
      docsDir
    );

    expect(result.title).toBe("Getting Started");
  });

  it("defaults order to Infinity when not specified", () => {
    const content = `---
title: Test
---

Content.
`;
    const result: Page = parsePage(
      content,
      "/project/docs/test.md",
      docsDir
    );

    expect(result.order).toBe(Infinity);
  });

  it("parses hidden flag", () => {
    const content = `---
title: Secret
hidden: true
---

Hidden page.
`;
    const result: Page = parsePage(
      content,
      "/project/docs/secret.md",
      docsDir
    );

    expect(result.hidden).toBe(true);
  });

  it("renders code blocks with syntax highlighting", () => {
    const content = `---
title: Code
---

\`\`\`javascript
const x = 1;
\`\`\`
`;
    const result: Page = parsePage(
      content,
      "/project/docs/code.md",
      docsDir
    );

    expect(result.html).toContain("hljs");
  });
});

describe("buildNavTree", () => {
  it("builds a flat list of pages into a tree", () => {
    const pages: Page[] = [
      { slug: "/alpha", title: "Alpha", order: Infinity, hidden: false, html: "" },
      { slug: "/beta", title: "Beta", order: Infinity, hidden: false, html: "" },
    ];

    const result = buildNavTree(pages);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Alpha");
    expect(result[1].title).toBe("Beta");
  });

  it("sorts by order first, then alphabetically", () => {
    const pages: Page[] = [
      { slug: "/zebra", title: "Zebra", order: 1, hidden: false, html: "" },
      { slug: "/apple", title: "Apple", order: 2, hidden: false, html: "" },
      { slug: "/mango", title: "Mango", order: 1, hidden: false, html: "" },
    ];

    const result = buildNavTree(pages);

    expect(result[0].title).toBe("Mango");
    expect(result[1].title).toBe("Zebra");
    expect(result[2].title).toBe("Apple");
  });

  it("excludes hidden pages from the tree", () => {
    const pages: Page[] = [
      { slug: "/visible", title: "Visible", order: 1, hidden: false, html: "" },
      { slug: "/hidden", title: "Hidden", order: 2, hidden: true, html: "" },
    ];

    const result = buildNavTree(pages);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Visible");
  });

  it("nests pages under directory nodes", () => {
    const pages: Page[] = [
      { slug: "/guides", title: "Guides", order: 1, hidden: false, html: "" },
      {
        slug: "/guides/auth",
        title: "Authentication",
        order: 1,
        hidden: false,
        html: "",
      },
      {
        slug: "/guides/deploy",
        title: "Deployment",
        order: 2,
        hidden: false,
        html: "",
      },
    ];

    const result = buildNavTree(pages);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Guides");
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children[0].title).toBe("Authentication");
    expect(result[0].children[1].title).toBe("Deployment");
  });

  it("creates intermediate directory nodes when index is missing", () => {
    const pages: Page[] = [
      {
        slug: "/guides/auth",
        title: "Authentication",
        order: 1,
        hidden: false,
        html: "",
      },
    ];

    const result = buildNavTree(pages);

    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("/guides");
    expect(result[0].title).toBe("Guides");
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].title).toBe("Authentication");
  });

  it("uses index page metadata for directory nodes", () => {
    const pages: Page[] = [
      { slug: "/guides", title: "My Guides", order: 5, hidden: false, html: "" },
      {
        slug: "/guides/auth",
        title: "Auth",
        order: 1,
        hidden: false,
        html: "",
      },
    ];

    const result = buildNavTree(pages);

    expect(result[0].title).toBe("My Guides");
    expect(result[0].order).toBe(5);
  });
});

describe("buildContent", () => {
  const tmpDir = path.join(process.cwd(), ".test-docs-" + Date.now());

  beforeAll(() => {
    fs.mkdirSync(path.join(tmpDir, "guides"), { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, "index.md"),
      `---
title: Home
order: 0
---

# Welcome
`
    );

    fs.writeFileSync(
      path.join(tmpDir, "guides", "auth.md"),
      `---
title: Authentication
order: 1
---

# Auth Guide
`
    );

    fs.writeFileSync(
      path.join(tmpDir, "guides", "deploy.md"),
      `---
title: Deployment
order: 2
hidden: true
---

# Deploy Guide
`
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("produces correct ContentData from a docs directory", () => {
    const { content } = buildContent(tmpDir);

    expect(Object.keys(content.pages)).toHaveLength(3);
    expect(content.pages["/"]).toBeDefined();
    expect(content.pages["/"].title).toBe("Home");
    expect(content.pages["/guides/auth"]).toBeDefined();
    expect(content.pages["/guides/deploy"]).toBeDefined();
    expect(content.pages["/guides/deploy"].hidden).toBe(true);
  });

  it("excludes hidden pages from nav but keeps them in pages map", () => {
    const { content } = buildContent(tmpDir);

    const guidesNav = content.nav.find((n) => n.slug === "/guides");
    expect(guidesNav).toBeDefined();
    expect(guidesNav!.children).toHaveLength(1);
    expect(guidesNav!.children[0].title).toBe("Authentication");

    expect(content.pages["/guides/deploy"]).toBeDefined();
  });
});
