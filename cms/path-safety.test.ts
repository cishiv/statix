import { describe, it, expect } from "vitest";
import { safeJoin } from "./path-safety.ts";

describe("safeJoin", () => {
  const root = "/project/docs";

  it("joins a simple file", () => {
    expect(safeJoin(root, "intro.md")).toBe("/project/docs/intro.md");
  });

  it("joins a nested file", () => {
    expect(safeJoin(root, "guides/intro.md")).toBe(
      "/project/docs/guides/intro.md"
    );
  });

  it("normalises . segments", () => {
    expect(safeJoin(root, "guides/./intro.md")).toBe(
      "/project/docs/guides/intro.md"
    );
  });

  it("normalises trailing slash on root", () => {
    expect(safeJoin("/project/docs/", "intro.md")).toBe(
      "/project/docs/intro.md"
    );
  });

  it("rejects empty input", () => {
    expect(safeJoin(root, "")).toBeNull();
  });

  it("rejects absolute paths", () => {
    expect(safeJoin(root, "/etc/passwd")).toBeNull();
  });

  it("rejects parent traversal", () => {
    expect(safeJoin(root, "../etc/passwd")).toBeNull();
  });

  it("rejects deep parent traversal", () => {
    expect(safeJoin(root, "../../etc/passwd")).toBeNull();
  });

  it("rejects mid-path traversal that escapes", () => {
    expect(safeJoin(root, "guides/../../etc/passwd")).toBeNull();
  });

  it("allows mid-path traversal that stays inside", () => {
    expect(safeJoin(root, "guides/../intro.md")).toBe(
      "/project/docs/intro.md"
    );
  });

  it("rejects sibling-of-root that shares a prefix", () => {
    expect(safeJoin("/project/docs", "../docs-evil/x.md")).toBeNull();
  });

  it("returns root itself for '.'", () => {
    expect(safeJoin(root, ".")).toBe("/project/docs");
  });

  it("treats null and undefined as invalid", () => {
    expect(safeJoin(root, null as unknown as string)).toBeNull();
    expect(safeJoin(root, undefined as unknown as string)).toBeNull();
  });
});
