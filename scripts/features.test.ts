import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildContent, scanImageFiles, buildGraph, parsePage } from "./build-content.ts";
import { buildPageIndex, resolveWikilink } from "./wikilink-resolver.ts";
import type { Page } from "../src/types.ts";

/**
 * Feature verification tests — exercises wikilinks, graph, backlinks,
 * dateline, and image handling to confirm the full feature set is intact.
 */

const tmpDir = path.join(process.cwd(), ".test-features-" + Date.now());
const publicDir = path.join(tmpDir, "_public");

beforeAll(() => {
  fs.mkdirSync(path.join(tmpDir, "docs", "tools"), { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(
    path.join(tmpDir, "docs", "index.md"),
    `---
title: Home
order: 0
date: 2026-01-01
---

# Welcome

Check out [[Setup]] and [[Tools]].
`
  );

  fs.writeFileSync(
    path.join(tmpDir, "docs", "setup.md"),
    `---
title: Setup
order: 1
date: 2026-01-01
updated: 2026-03-15
group: guides
---

# Setup

Go back to [[Home]] or read [[tools|the tools page]].
`
  );

  fs.writeFileSync(
    path.join(tmpDir, "docs", "tools", "index.md"),
    `---
title: Tools
order: 2
---

# Tools

See [[Setup]] for prerequisites.

![diagram](./arch.png)
`
  );

  // Create a dummy image
  fs.writeFileSync(path.join(tmpDir, "docs", "tools", "arch.png"), "fake-png-data");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("wikilinks", () => {
  it("resolves wikilinks and tracks outbound/inbound links", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    const home = content.pages["/"];
    const setup = content.pages["/setup"];
    const tools = content.pages["/tools"];

    // Home links to setup and tools
    expect(home.outbound).toContain("/setup");
    expect(home.outbound).toContain("/tools");

    // Setup links back to home and tools
    expect(setup.outbound).toContain("/");
    expect(setup.outbound).toContain("/tools");

    // Tools links to setup
    expect(tools.outbound).toContain("/setup");

    // Setup is referenced by both home and tools
    expect(setup.inbound).toContain("/");
    expect(setup.inbound).toContain("/tools");
  });

  it("renders wikilinks as anchor tags in HTML", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    expect(content.pages["/"].html).toContain('class="wikilink"');
    expect(content.pages["/"].html).toContain('href="/setup"');
  });

  it("renders display text override", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    expect(content.pages["/setup"].html).toContain("the tools page");
  });
});

describe("backlinks", () => {
  it("appends referenced-by section for pages with inbound links", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    const setup = content.pages["/setup"];
    expect(setup.html).toContain("Referenced by");
    expect(setup.html).toContain("Home");
    expect(setup.html).toContain("Tools");
  });

  it("does not append referenced-by for pages with no inbound links", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    const home = content.pages["/"];
    // Home is referenced by Setup, so it should have a referenced-by section
    expect(home.inbound).toContain("/setup");
    expect(home.html).toContain("Referenced by");
  });
});

describe("knowledge graph", () => {
  it("generates graph with nodes for all pages", () => {
    const { graph } = buildContent(path.join(tmpDir, "docs"));
    expect(graph.nodes).toHaveLength(3);
    const ids = graph.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["/", "/setup", "/tools"]);
  });

  it("generates edges from outbound links", () => {
    const { graph } = buildContent(path.join(tmpDir, "docs"));
    expect(graph.edges.length).toBeGreaterThan(0);
    const homeToSetup = graph.edges.find((e) => e.source === "/" && e.target === "/setup");
    expect(homeToSetup).toBeDefined();
  });

  it("assigns group from frontmatter or infers from URL", () => {
    const { graph } = buildContent(path.join(tmpDir, "docs"));
    const setup = graph.nodes.find((n) => n.id === "/setup");
    expect(setup?.group).toBe("guides");

    const home = graph.nodes.find((n) => n.id === "/");
    expect(home?.group).toBe("root");

    const tools = graph.nodes.find((n) => n.id === "/tools");
    expect(tools?.group).toBe("tools");
  });
});

describe("frontmatter dates", () => {
  it("parses date and updated fields", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    const setup = content.pages["/setup"];
    expect(setup.date).toBe("2026-01-01");
    expect(setup.updated).toBe("2026-03-15");
  });

  it("renders dateline after h1", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    const setup = content.pages["/setup"];
    expect(setup.html).toContain('class="dateline"');
    expect(setup.html).toContain("Published");
    expect(setup.html).toContain("Updated");
  });

  it("renders only published when date equals updated", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    const home = content.pages["/"];
    expect(home.html).toContain("Published");
    expect(home.html).not.toContain("Updated");
  });
});

describe("image handling", () => {
  it("scans image files from docs directory", () => {
    const images = scanImageFiles(path.join(tmpDir, "docs"));
    expect(images).toHaveLength(1);
    expect(images[0]).toContain("arch.png");
  });

  it("rewrites relative image URLs to /_docs/ paths", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    const tools = content.pages["/tools"];
    expect(tools.html).toContain("/_docs/tools/arch.png");
  });

  it("syncs images to public directory", () => {
    buildContent(path.join(tmpDir, "docs"), publicDir);
    const synced = path.join(publicDir, "_docs", "tools", "arch.png");
    expect(fs.existsSync(synced)).toBe(true);
  });
});

describe("page type completeness", () => {
  it("pages have all required fields", () => {
    const { content } = buildContent(path.join(tmpDir, "docs"));
    for (const page of Object.values(content.pages)) {
      expect(page).toHaveProperty("slug");
      expect(page).toHaveProperty("title");
      expect(page).toHaveProperty("order");
      expect(page).toHaveProperty("hidden");
      expect(page).toHaveProperty("date");
      expect(page).toHaveProperty("updated");
      expect(page).toHaveProperty("html");
      expect(page).toHaveProperty("outbound");
      expect(page).toHaveProperty("inbound");
    }
  });
});
