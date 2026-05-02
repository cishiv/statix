import { useEffect, useState } from "preact/hooks";
import type { DocSummary } from "../api.ts";
import { fetchSearch } from "../api.ts";

type TreeProps = {
  docs: DocSummary[];
  selected: string | null;
  onSelect: (path: string) => void;
  onCreate: () => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
};

export function Tree(props: TreeProps) {
  const [query, setQuery] = useState("");
  const [bodyHits, setBodyHits] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (query.trim() === "") {
      setBodyHits(new Map());
      return;
    }
    const handle = setTimeout(() => {
      fetchSearch(query)
        .then((hits) =>
          setBodyHits(new Map(hits.map((h) => [h.path, h.snippet])))
        )
        .catch(() => setBodyHits(new Map()));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const q = query.trim().toLowerCase();
  const visible =
    q === ""
      ? props.docs
      : props.docs.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.path.toLowerCase().includes(q) ||
            bodyHits.has(d.path)
        );

  return (
    <div class="tree">
      <div class="tree-header">
        <span class="tree-title">docs</span>
        <button class="tree-new" onClick={props.onCreate}>
          + new
        </button>
      </div>
      <div class="tree-search-wrap">
        <input
          class="tree-search"
          type="search"
          placeholder="filter…"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
      </div>
      <ul class="tree-list">
        {visible.map((d) => (
          <li
            key={d.path}
            class={
              d.path === props.selected
                ? "tree-item tree-item-active"
                : "tree-item"
            }
          >
            <button
              class="tree-select"
              onClick={() => props.onSelect(d.path)}
            >
              <span class="tree-doc-title">{d.title}</span>
              <span class="tree-doc-path">{d.path}</span>
              {bodyHits.has(d.path) && (
                <span class="tree-doc-snippet">{bodyHits.get(d.path)}</span>
              )}
            </button>
            <div class="tree-actions">
              <button
                class="tree-action"
                onClick={() => props.onRename(d.path)}
                title="rename / move"
              >
                ⇅
              </button>
              <button
                class="tree-action"
                onClick={() => props.onDelete(d.path)}
                title="delete"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
