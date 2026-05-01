import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { moveDoc } from "./move.ts";

describe("moveDoc with wikilink fixup", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(
      process.cwd(),
      ".test-move-" + Math.random().toString(36).slice(2)
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

  const read = (rel: string): string =>
    fs.readFileSync(path.join(tmpDir, rel), "utf-8");

  it("renames the file", async () => {
    write("foo.md", "---\ntitle: Foo\n---\nx");
    const result = await moveDoc(
      tmpDir,
      path.join(tmpDir, "foo.md"),
      path.join(tmpDir, "bar.md")
    );
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "foo.md"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, "bar.md"))).toBe(true);
  });

  it("creates parent directories on rename", async () => {
    write("foo.md", "---\ntitle: Foo\n---\nx");
    const result = await moveDoc(
      tmpDir,
      path.join(tmpDir, "foo.md"),
      path.join(tmpDir, "subdir", "nested", "bar.md")
    );
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "subdir", "nested", "bar.md"))).toBe(
      true
    );
  });

  it("rewrites filename-style incoming wikilinks", async () => {
    write("foo.md", "---\ntitle: Foo\n---\n# Foo\n");
    write("ref.md", "---\ntitle: Ref\n---\nSee [[foo]] here.\n");
    const result = await moveDoc(
      tmpDir,
      path.join(tmpDir, "foo.md"),
      path.join(tmpDir, "bar.md")
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rewrites).toHaveLength(1);
    expect(read("ref.md")).toContain("[[Foo]]");
    expect(read("ref.md")).not.toContain("[[foo]]");
  });

  it("preserves wikilinks that already match by title", async () => {
    write("foo.md", "---\ntitle: Foo\n---\n# Foo\n");
    write("ref.md", "---\ntitle: Ref\n---\nSee [[Foo]] here.\n");
    const result = await moveDoc(
      tmpDir,
      path.join(tmpDir, "foo.md"),
      path.join(tmpDir, "subdir", "bar.md")
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rewrites).toHaveLength(0);
    expect(read("ref.md")).toContain("[[Foo]]");
  });

  it("preserves pipe aliases on rewrite", async () => {
    write("foo.md", "---\ntitle: Foo\n---\n");
    write(
      "ref.md",
      "---\ntitle: Ref\n---\nSee [[foo|the foo guide]] today."
    );
    const result = await moveDoc(
      tmpDir,
      path.join(tmpDir, "foo.md"),
      path.join(tmpDir, "bar.md")
    );
    expect(result.ok).toBe(true);
    expect(read("ref.md")).toContain("[[Foo|the foo guide]]");
  });

  it("does not modify the moved file's own contents", async () => {
    write(
      "foo.md",
      "---\ntitle: Foo\n---\nI am [[Foo]] referring to myself."
    );
    const result = await moveDoc(
      tmpDir,
      path.join(tmpDir, "foo.md"),
      path.join(tmpDir, "bar.md")
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rewrites).toHaveLength(0);
    expect(read("bar.md")).toContain("[[Foo]]");
  });

  it("rewrites slug-style incoming wikilinks", async () => {
    write("guides/foo.md", "---\ntitle: Foo\n---\n");
    write("ref.md", "---\ntitle: Ref\n---\nSee [[guides/foo]] now.");
    const result = await moveDoc(
      tmpDir,
      path.join(tmpDir, "guides", "foo.md"),
      path.join(tmpDir, "notes", "foo.md")
    );
    expect(result.ok).toBe(true);
    expect(read("ref.md")).toContain("[[Foo]]");
    expect(read("ref.md")).not.toContain("[[guides/foo]]");
  });

  it("returns error when source does not exist", async () => {
    const result = await moveDoc(
      tmpDir,
      path.join(tmpDir, "missing.md"),
      path.join(tmpDir, "bar.md")
    );
    expect(result.ok).toBe(false);
  });

  it("returns error when destination already exists", async () => {
    write("foo.md", "x");
    write("bar.md", "y");
    const result = await moveDoc(
      tmpDir,
      path.join(tmpDir, "foo.md"),
      path.join(tmpDir, "bar.md")
    );
    expect(result.ok).toBe(false);
  });
});
