import { useEffect } from "preact/hooks";

type ContentProps = {
  html: string;
  title: string;
  onNavigate: (slug: string) => void;
};

function findInternalLinkHref(target: EventTarget | null): string | null {
  let node = target as HTMLElement | null;
  while (node && node.tagName !== "A") {
    node = node.parentElement;
  }
  if (!node) return null;
  const anchor = node as HTMLAnchorElement;
  const href = anchor.getAttribute("href");
  if (!href) return null;
  if (anchor.target === "_blank") return null;
  if (/^[a-z]+:\/\//i.test(href)) return null;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  if (href.startsWith("#")) return null;
  if (!href.startsWith("/")) return null;
  return href.replace(/\/$/, "") || "/";
}

export function Content({ html, title, onNavigate }: ContentProps): preact.JSX.Element {
  useEffect(() => {
    document.title = `${title} — Statix`;
  }, [title]);

  const handleClick = (e: MouseEvent): void => {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const slug = findInternalLinkHref(e.target);
    if (!slug) return;
    e.preventDefault();
    onNavigate(slug);
  };

  return (
    <article
      key={title}
      class="content fade-in-up"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
