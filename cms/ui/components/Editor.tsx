import { useEffect, useRef } from "preact/hooks";
import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import type { LinkEntry } from "../api.ts";

type EditorProps = {
  value: string;
  onChange: (next: string) => void;
  links: LinkEntry[];
};

export function Editor(props: EditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(props.onChange);
  const linksRef = useRef(props.links);

  onChangeRef.current = props.onChange;
  linksRef.current = props.links;

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      doc: props.value,
      parent: containerRef.current,
      extensions: [
        basicSetup,
        markdown(),
        autocompletion({ override: [wikilinkSource(linksRef)] }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== props.value) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: props.value,
        },
      });
    }
  }, [props.value]);

  return <div class="cm-host" ref={containerRef} />;
}

function wikilinkSource(linksRef: { current: LinkEntry[] }) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/\[\[[^\]|\n]*$/);
    if (!before) return null;
    if (before.from === before.to && !context.explicit) return null;
    return {
      from: before.from + 2,
      to: before.to,
      options: linksRef.current.map((l) => ({
        label: l.title,
        detail: l.slug,
        apply: `${l.title}]]`,
      })),
    };
  };
}
