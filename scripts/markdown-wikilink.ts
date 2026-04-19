import type MarkdownIt from "markdown-it";
import type { PageIndex, PageRef } from "./wikilink-resolver.ts";
import { resolveWikilink } from "./wikilink-resolver.ts";

export type WikilinkEnv = {
  index: PageIndex;
  outbound: Set<string>;
  broken: { target: string }[];
};

export function wikilinkPlugin(md: MarkdownIt): void {
  md.inline.ruler.before("link", "wikilink", (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x5b /* [ */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x5b /* [ */) return false;

    const end = state.src.indexOf("]]", start + 2);
    if (end === -1) return false;

    const inner = state.src.slice(start + 2, end);
    if (!inner || inner.includes("[") || inner.includes("\n")) return false;

    if (silent) {
      state.pos = end + 2;
      return true;
    }

    const pipeIdx = inner.indexOf("|");
    const target = (pipeIdx === -1 ? inner : inner.slice(0, pipeIdx)).trim();
    const display = pipeIdx === -1 ? "" : inner.slice(pipeIdx + 1).trim();

    const env = state.env as Partial<WikilinkEnv>;
    const resolved: PageRef | null = env.index ? resolveWikilink(target, env.index) : null;

    if (resolved) {
      env.outbound?.add(resolved.slug);
      const openToken = state.push("link_open", "a", 1);
      openToken.attrs = [
        ["href", resolved.slug],
        ["class", "wikilink"],
      ];
      const text = state.push("text", "", 0);
      text.content = display || resolved.title;
      state.push("link_close", "a", -1);
    } else {
      env.broken?.push({ target });
      const openToken = state.push("html_inline", "", 0);
      const safeTitle = target.replace(/"/g, "&quot;");
      openToken.content = `<span class="wikilink-broken" title="No page matches [[${safeTitle}]]">`;
      const text = state.push("text", "", 0);
      text.content = display || target;
      const closeToken = state.push("html_inline", "", 0);
      closeToken.content = `</span>`;
    }

    state.pos = end + 2;
    return true;
  });
}
