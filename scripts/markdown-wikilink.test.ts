import { describe, it, expect } from "vitest";
import markdownIt from "markdown-it";
import { wikilinkPlugin } from "./markdown-wikilink.ts";
import { buildPageIndex, type PageRef } from "./wikilink-resolver.ts";

const pages: PageRef[] = [
  { slug: "/workflow/the-review-loop", title: "The Review Loop", filename: "the-review-loop" },
  { slug: "/tools/hook-inspector", title: "Hook Inspector", filename: "hook-inspector" },
];

function render(src: string): { html: string; outbound: Set<string>; broken: { target: string }[] } {
  const md = markdownIt({ html: true }).use(wikilinkPlugin);
  const env = { index: buildPageIndex(pages), outbound: new Set<string>(), broken: [] };
  const html = md.render(src, env);
  return { html, outbound: env.outbound, broken: env.broken };
}

describe("wikilink plugin", () => {
  it("renders a basic wikilink as an anchor with wikilink class", () => {
    const { html, outbound } = render("see [[the-review-loop]] for context");
    expect(html).toContain('href="/workflow/the-review-loop"');
    expect(html).toContain('class="wikilink"');
    expect(html).toContain(">The Review Loop<");
    expect(outbound.has("/workflow/the-review-loop")).toBe(true);
  });

  it("supports a display-text override", () => {
    const { html } = render("see [[the-review-loop|my loop]] ok");
    expect(html).toContain(">my loop<");
  });

  it("renders broken links as styled spans", () => {
    const { html, broken } = render("this [[does-not-exist]] is broken");
    expect(html).toContain('class="wikilink-broken"');
    expect(html).toContain(">does-not-exist<");
    expect(broken.map((b) => b.target)).toEqual(["does-not-exist"]);
  });

  it("does not rewrite wikilinks inside fenced code", () => {
    const { html, outbound } = render("```\n[[the-review-loop]]\n```\n");
    expect(html).not.toContain("wikilink");
    expect(outbound.size).toBe(0);
  });

  it("resolves by title with case-insensitive spaces", () => {
    const { html } = render("ref [[The Review Loop]] here");
    expect(html).toContain('href="/workflow/the-review-loop"');
  });
});
