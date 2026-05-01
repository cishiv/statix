import { useEffect, useRef, useState } from "preact/hooks";
import { fetchPreview } from "../api.ts";

const DEBOUNCE_MS = 200;

type PreviewProps = {
  body: string;
  path: string;
};

export function Preview(props: PreviewProps) {
  const [html, setHtml] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchPreview(props.body, props.path)
        .then(setHtml)
        .catch(() => {
          /* leave previous render visible on transient errors */
        });
    }, DEBOUNCE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [props.body, props.path]);

  return (
    <div
      class="preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
