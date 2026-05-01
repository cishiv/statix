import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderPreview } from "./preview.ts";

describe("renderPreview", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(
      process.cwd(),
      ".test-preview-" + Math.random().toString(36).slice(2)
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

  it("renders markdown body to html", async () => {
    write("intro.md", "x");
    const html = await renderPreview(
      "---\ntitle: Intro\n---\n\n# Hello\n\nbody.",
      "intro.md",
      tmpDir
    );
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<p>body.</p>");
  });

  it("resolves wikilinks against on-disk docs", async () => {
    write("foo.md", "---\ntitle: Foo\n---\n");
    const html = await renderPreview(
      "---\ntitle: Bar\n---\n\nSee [[Foo]].",
      "bar.md",
      tmpDir
    );
    expect(html).toContain('class="wikilink"');
    expect(html).toContain('href="/foo"');
  });

  it("marks unresolved wikilinks as broken", async () => {
    const html = await renderPreview(
      "---\ntitle: Bar\n---\n\n[[Nope]]",
      "bar.md",
      tmpDir
    );
    expect(html).toContain('class="wikilink-broken"');
  });

  it("uses just-edited title for the previewed doc", async () => {
    write("foo.md", "---\ntitle: OldTitle\n---\n\nx");
    write("ref.md", "---\ntitle: Ref\n---\n\nSee [[NewTitle]].");
    const html = await renderPreview(
      "---\ntitle: Ref\n---\n\nSee [[NewTitle]].",
      "ref.md",
      tmpDir
    );
    expect(html).toContain('class="wikilink-broken"');

    fs.writeFileSync(
      path.join(tmpDir, "foo.md"),
      "---\ntitle: NewTitle\n---\n\nx"
    );
    const html2 = await renderPreview(
      "---\ntitle: Ref\n---\n\nSee [[NewTitle]].",
      "ref.md",
      tmpDir
    );
    expect(html2).toContain('href="/foo"');
  });
});
