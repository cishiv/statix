import { describe, it, expect } from "vitest";
import { parsePorcelain } from "./git.ts";

describe("parsePorcelain", () => {
  it("returns empty for empty input", () => {
    expect(parsePorcelain("")).toEqual([]);
  });

  it("parses a modified entry", () => {
    expect(parsePorcelain(" M docs/foo.md\0")).toEqual([
      { path: "docs/foo.md", index: " ", worktree: "M" },
    ]);
  });

  it("parses an untracked entry", () => {
    expect(parsePorcelain("?? docs/new.md\0")).toEqual([
      { path: "docs/new.md", index: "?", worktree: "?" },
    ]);
  });

  it("parses a staged-and-modified entry", () => {
    expect(parsePorcelain("MM docs/foo.md\0")).toEqual([
      { path: "docs/foo.md", index: "M", worktree: "M" },
    ]);
  });

  it("parses multiple entries", () => {
    const input = " M docs/foo.md\0?? docs/new.md\0A  docs/bar.md\0";
    const entries = parsePorcelain(input);
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.path)).toEqual([
      "docs/foo.md",
      "docs/new.md",
      "docs/bar.md",
    ]);
  });

  it("skips the second NUL field for renames", () => {
    const input = "R  docs/new.md\0docs/old.md\0?? docs/x.md\0";
    const entries = parsePorcelain(input);
    expect(entries).toHaveLength(2);
    expect(entries[0].path).toBe("docs/new.md");
    expect(entries[1].path).toBe("docs/x.md");
  });

  it("handles paths with spaces", () => {
    expect(parsePorcelain(" M docs/with spaces.md\0")).toEqual([
      { path: "docs/with spaces.md", index: " ", worktree: "M" },
    ]);
  });
});
