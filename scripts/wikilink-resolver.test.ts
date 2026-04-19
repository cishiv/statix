import { describe, it, expect } from "vitest";
import {
  normalizeKey,
  buildPageIndex,
  resolveWikilink,
  type PageRef,
} from "./wikilink-resolver.ts";

const pages: PageRef[] = [
  { slug: "/", title: "Home", filename: "index" },
  { slug: "/workflow/the-review-loop", title: "The Review Loop", filename: "the-review-loop" },
  { slug: "/workflow/prompting-notes", title: "Prompting Notes", filename: "prompting-notes" },
  { slug: "/tools/skill-scaffolder", title: "Skill Scaffolder", filename: "skill-scaffolder" },
  { slug: "/tools/hook-inspector", title: "Hook Inspector", filename: "hook-inspector" },
];

describe("normalizeKey", () => {
  it("lowercases", () => {
    expect(normalizeKey("The Review Loop")).toBe("the-review-loop");
  });
  it("converts whitespace and underscores to hyphens", () => {
    expect(normalizeKey("hook_inspector tool")).toBe("hook-inspector-tool");
  });
  it("collapses repeated hyphens and trims", () => {
    expect(normalizeKey("--foo--bar--")).toBe("foo-bar");
  });
});

describe("resolveWikilink", () => {
  const index = buildPageIndex(pages);

  it("resolves by filename", () => {
    expect(resolveWikilink("the-review-loop", index)?.slug).toBe("/workflow/the-review-loop");
  });

  it("resolves case-insensitively", () => {
    expect(resolveWikilink("THE-REVIEW-LOOP", index)?.slug).toBe("/workflow/the-review-loop");
  });

  it("treats spaces and hyphens interchangeably", () => {
    expect(resolveWikilink("the review loop", index)?.slug).toBe("/workflow/the-review-loop");
  });

  it("resolves by title", () => {
    expect(resolveWikilink("Skill Scaffolder", index)?.slug).toBe("/tools/skill-scaffolder");
  });

  it("resolves explicit paths", () => {
    expect(resolveWikilink("workflow/the-review-loop", index)?.slug).toBe("/workflow/the-review-loop");
  });

  it("resolves paths with leading slash", () => {
    expect(resolveWikilink("/tools/hook-inspector", index)?.slug).toBe("/tools/hook-inspector");
  });

  it("returns null for unknown targets", () => {
    expect(resolveWikilink("nonexistent-page", index)).toBeNull();
  });

  it("returns null for empty targets", () => {
    expect(resolveWikilink("   ", index)).toBeNull();
  });

  it("prefers filename match when title would also match another page", () => {
    const ambiguous: PageRef[] = [
      { slug: "/a/duplicate", title: "Shared", filename: "duplicate" },
      { slug: "/b/shared", title: "Something Else", filename: "shared" },
    ];
    const idx = buildPageIndex(ambiguous);
    expect(resolveWikilink("shared", idx)?.slug).toBe("/b/shared");
  });
});
