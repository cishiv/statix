import { useEffect, useState } from "preact/hooks";
import { Tree } from "./components/Tree.tsx";
import { Editor } from "./components/Editor.tsx";
import {
  deleteDoc,
  fetchDoc,
  fetchLinks,
  fetchTree,
  moveDoc,
  saveDoc,
  type DocSummary,
  type LinkEntry,
} from "./api.ts";

const NEW_DOC_TEMPLATE = "---\ntitle: New Doc\n---\n\n";

export function App() {
  const [tree, setTree] = useState<DocSummary[]>([]);
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [body, setBody] = useState<string>("");
  const [savedBody, setSavedBody] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const dirty = body !== savedBody;

  const reload = async (): Promise<void> => {
    const [t, l] = await Promise.all([fetchTree(), fetchLinks()]);
    setTree(t);
    setLinks(l);
  };

  useEffect(() => {
    reload().catch((e: unknown) => setError(toMessage(e)));
  }, []);

  useEffect(() => {
    if (!selected) {
      setBody("");
      setSavedBody("");
      return;
    }
    fetchDoc(selected)
      .then((b) => {
        setBody(b);
        setSavedBody(b);
      })
      .catch((e: unknown) => setError(toMessage(e)));
  }, [selected]);

  const handleSave = async (): Promise<void> => {
    if (!selected) return;
    try {
      await saveDoc(selected, body);
      setSavedBody(body);
      await reload();
    } catch (e) {
      setError(toMessage(e));
    }
  };

  const handleCreate = async (): Promise<void> => {
    const raw = window.prompt("New doc path (e.g. notes/intro.md):");
    const newPath = raw?.trim();
    if (!newPath) return;
    if (!newPath.endsWith(".md")) {
      setError("path must end in .md");
      return;
    }
    try {
      await saveDoc(newPath, NEW_DOC_TEMPLATE);
      await reload();
      setSelected(newPath);
    } catch (e) {
      setError(toMessage(e));
    }
  };

  const handleDelete = async (path: string): Promise<void> => {
    if (!window.confirm(`Delete ${path}?`)) return;
    try {
      await deleteDoc(path);
      if (selected === path) setSelected(null);
      await reload();
    } catch (e) {
      setError(toMessage(e));
    }
  };

  const handleRename = async (from: string): Promise<void> => {
    const raw = window.prompt(`Rename / move ${from} to:`, from);
    const to = raw?.trim();
    if (!to || to === from) return;
    if (!to.endsWith(".md")) {
      setError("path must end in .md");
      return;
    }
    try {
      await moveDoc(from, to);
      if (selected === from) setSelected(to);
      await reload();
    } catch (e) {
      setError(toMessage(e));
    }
  };

  return (
    <div class="cms-shell">
      <div class="cms-main">
        <aside class="cms-pane cms-tree-pane">
          <Tree
            docs={tree}
            selected={selected}
            onSelect={setSelected}
            onCreate={handleCreate}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </aside>
        <section class="cms-pane cms-editor-pane">
          {selected ? (
            <div class="editor-host">
              <div class="editor-bar">
                <span class="editor-path">
                  {selected}
                  {dirty ? " ●" : ""}
                </span>
                <button
                  class="editor-save"
                  onClick={handleSave}
                  disabled={!dirty}
                >
                  save
                </button>
              </div>
              <Editor value={body} onChange={setBody} links={links} />
            </div>
          ) : (
            <div class="cms-empty">Select a doc to edit</div>
          )}
        </section>
        <section class="cms-pane">
          <div class="cms-empty">Preview (slice 9)</div>
        </section>
      </div>
      {error && (
        <div class="error-toast" onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  );
}

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
