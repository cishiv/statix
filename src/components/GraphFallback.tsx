import type { Graph } from "../types.ts";

type GraphFallbackProps = {
  graph: Graph;
  onNavigate: (slug: string) => void;
};

export function GraphFallback({ graph, onNavigate }: GraphFallbackProps): preact.JSX.Element {
  const visible = graph.nodes.filter((n) => !n.hidden);
  const outboundBySource = new Map<string, number>();
  const inboundByTarget = new Map<string, number>();
  for (const e of graph.edges) {
    outboundBySource.set(e.source, (outboundBySource.get(e.source) ?? 0) + 1);
    inboundByTarget.set(e.target, (inboundByTarget.get(e.target) ?? 0) + 1);
  }

  const groups = new Map<string, typeof visible>();
  for (const n of visible) {
    const list = groups.get(n.group) ?? [];
    list.push(n);
    groups.set(n.group, list);
  }
  const groupOrder = Array.from(groups.keys()).sort();

  return (
    <div class="graph-fallback">
      {groupOrder.map((group) => (
        <section key={group} class="graph-fallback-section">
          <h3>{group}</h3>
          <ul>
            {(groups.get(group) ?? [])
              .slice()
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((n) => {
                const inCount = inboundByTarget.get(n.id) ?? 0;
                const outCount = outboundBySource.get(n.id) ?? 0;
                return (
                  <li key={n.id}>
                    <a
                      href={n.id}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(n.id);
                      }}
                    >
                      {n.title}
                    </a>
                    <span class="graph-fallback-meta">
                      {inCount} in · {outCount} out
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
