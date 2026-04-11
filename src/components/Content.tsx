import { useEffect } from "preact/hooks";

type ContentProps = {
  html: string;
  title: string;
};

export function Content({ html, title }: ContentProps): preact.JSX.Element {
  useEffect(() => {
    document.title = `${title} — Statix`;
  }, [title]);

  return (
    <article class="content" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
