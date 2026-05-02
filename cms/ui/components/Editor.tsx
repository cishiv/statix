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
  onUploadImage?: (file: File) => Promise<string>;
};

export function Editor(props: EditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(props.onChange);
  const linksRef = useRef(props.links);
  const onUploadImageRef = useRef(props.onUploadImage);

  onChangeRef.current = props.onChange;
  linksRef.current = props.links;
  onUploadImageRef.current = props.onUploadImage;

  const handleDrop = async (e: DragEvent): Promise<void> => {
    if (!e.dataTransfer || !onUploadImageRef.current) return;
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length === 0) return;
    e.preventDefault();
    const view = viewRef.current;
    if (!view) return;
    for (const file of files) {
      const md = await onUploadImageRef.current(file);
      if (!md) continue;
      const pos = view.state.selection.main.head;
      view.dispatch({
        changes: { from: pos, insert: md },
        selection: { anchor: pos + md.length },
      });
    }
  };

  const handleDragOver = (e: DragEvent): void => {
    if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
  };

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

  return (
    <div
      class="cm-host"
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    />
  );
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
