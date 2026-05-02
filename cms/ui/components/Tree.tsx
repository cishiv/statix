import { useState } from "preact/hooks";
import type { DocSummary } from "../api.ts";

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

  const visible =
    query.trim() === ""
      ? props.docs
      : props.docs.filter((d) => {
          const q = query.toLowerCase();
          return (
            d.title.toLowerCase().includes(q) ||
            d.path.toLowerCase().includes(q)
          );
        });

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
