import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { searchBodies } from "./search.ts";

describe("searchBodies", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(
      process.cwd(),
      ".test-search-" + Math.random().toString(36).slice(2)
    );
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const write = (rel: string, content: string): void => {
    const abs = path.join(tmpDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  };

  it("returns empty for empty query", async () => {
    write("a.md", "---\ntitle: A\n---\nhello");
    expect(await searchBodies(tmpDir, "")).toEqual([]);
    expect(await searchBodies(tmpDir, "   ")).toEqual([]);
  });

  it("matches body content case-insensitively", async () => {
    write("guides/auth.md", "---\ntitle: Authentication\n---\n\nLet's discuss OAuth2 flows.");
    write("guides/intro.md", "---\ntitle: Intro\n---\n\nWelcome to the docs.");
    const hits = await searchBodies(tmpDir, "OAUTH");
    expect(hits).toHaveLength(1);
    expect(hits[0].path).toBe("guides/auth.md");
    expect(hits[0].title).toBe("Authentication");
  });

  it("ignores frontmatter when matching", async () => {
    write(
      "a.md",
      "---\ntitle: Has the word match in frontmatter\n---\n\nbody only"
    );
    const hits = await searchBodies(tmpDir, "match");
    expect(hits).toHaveLength(0);
  });

  it("returns a snippet around the match", async () => {
    write(
      "long.md",
      "---\ntitle: L\n---\n\n" +
        "lorem ipsum ".repeat(20) +
        "secret-token-here " +
        "dolor sit amet ".repeat(20)
    );
    const hits = await searchBodies(tmpDir, "secret-token");
    expect(hits).toHaveLength(1);
    expect(hits[0].snippet).toContain("secret-token-here");
    expect(hits[0].snippet.startsWith("…")).toBe(true);
    expect(hits[0].snippet.endsWith("…")).toBe(true);
  });

  it("returns hits across nested directories", async () => {
    write("a/b/c.md", "---\ntitle: ABC\n---\nfindme");
    write("d.md", "---\ntitle: D\n---\nfindme");
    const hits = await searchBodies(tmpDir, "findme");
    expect(hits.map((h) => h.path).sort()).toEqual(["a/b/c.md", "d.md"]);
  });

  it("collapses whitespace in the snippet", async () => {
    write(
      "ws.md",
      "---\ntitle: W\n---\n\nLine one\n\nLine two contains MATCH inside"
    );
    const hits = await searchBodies(tmpDir, "match");
    expect(hits[0].snippet).not.toContain("\n");
    expect(hits[0].snippet).not.toMatch(/  +/);
  });
});
