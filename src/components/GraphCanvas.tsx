import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
} from "d3-force";
import type { Graph } from "../types.ts";

type GraphCanvasProps = {
  graph: Graph;
  currentSlug: string;
  onNavigate: (slug: string) => void;
};

type SimNode = {
  id: string;
  title: string;
  group: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

type SimEdge = {
  source: SimNode;
  target: SimNode;
};

type Viewport = { w: number; h: number };

const GROUP_COLORS: Record<string, string> = {
  root: "var(--color-text-secondary)",
  workflow: "#7aa2f7",
  tools: "#b48ead",
};

function colorFor(group: string): string {
  return GROUP_COLORS[group] ?? "var(--color-text-secondary)";
}

export function GraphCanvas({ graph, currentSlug, onNavigate }: GraphCanvasProps): preact.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ w: 800, h: 600 });
  const [zoom, setZoom] = useState<{ k: number; x: number; y: number }>({ k: 1, x: 0, y: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [, setTick] = useState<number>(0);

  const visibleNodes = useMemo(() => graph.nodes.filter((n) => !n.hidden), [graph]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [graph, visibleIds]
  );

  const simState = useRef<{ nodes: SimNode[]; edges: SimEdge[] }>({ nodes: [], edges: [] });

  useEffect(() => {
    if (!svgRef.current) return;
    const { width, height } = svgRef.current.getBoundingClientRect();
    setViewport({ w: width || 800, h: height || 600 });
    const resize = (): void => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      setViewport({ w: rect.width || 800, h: rect.height || 600 });
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const nodes: SimNode[] = visibleNodes.map((n) => ({
      id: n.id,
      title: n.title,
      group: n.group,
      x: viewport.w / 2 + (Math.random() - 0.5) * 40,
      y: viewport.h / 2 + (Math.random() - 0.5) * 40,
    }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edges: SimEdge[] = visibleEdges
      .map((e) => {
        const s = byId.get(e.source);
        const t = byId.get(e.target);
        return s && t ? { source: s, target: t } : null;
      })
      .filter((e): e is SimEdge => !!e);

    simState.current = { nodes, edges };

    const sim = forceSimulation(nodes as unknown as { x: number; y: number }[])
      .force(
        "link",
        forceLink(edges as unknown as { source: SimNode; target: SimNode }[])
          .id((d) => (d as SimNode).id)
          .distance(90)
          .strength(0.5)
      )
      .force("charge", forceManyBody().strength(-220))
      .force("center", forceCenter(viewport.w / 2, viewport.h / 2))
      .force("collide", forceCollide(28))
      .alphaMin(0.02)
      .on("tick", () => {
        setTick((t) => t + 1);
      });

    return () => {
      sim.stop();
    };
  }, [visibleNodes, visibleEdges, viewport.w, viewport.h]);

  const handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setZoom((z) => {
      const k = Math.max(0.25, Math.min(4, z.k * factor));
      const x = mx - (mx - z.x) * (k / z.k);
      const y = my - (my - z.y) * (k / z.k);
      return { k, x, y };
    });
  };

  const panState = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number }>({
    active: false, sx: 0, sy: 0, ox: 0, oy: 0,
  });

  const handlePanStart = (e: PointerEvent): void => {
    if (e.target !== svgRef.current) return;
    panState.current = { active: true, sx: e.clientX, sy: e.clientY, ox: zoom.x, oy: zoom.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const handlePanMove = (e: PointerEvent): void => {
    if (!panState.current.active) return;
    setZoom((z) => ({ ...z, x: panState.current.ox + (e.clientX - panState.current.sx), y: panState.current.oy + (e.clientY - panState.current.sy) }));
  };
  const handlePanEnd = (): void => {
    panState.current.active = false;
  };

  const dragState = useRef<{ node: SimNode | null }>({ node: null });

  const handleNodePointerDown = (e: PointerEvent, node: SimNode): void => {
    e.stopPropagation();
    dragState.current.node = node;
    node.fx = node.x;
    node.fy = node.y;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const handleNodePointerMove = (e: PointerEvent): void => {
    const node = dragState.current.node;
    if (!node) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - zoom.x) / zoom.k;
    const y = (e.clientY - rect.top - zoom.y) / zoom.k;
    node.fx = x;
    node.fy = y;
    setTick((t) => t + 1);
  };
  const handleNodePointerUp = (_e: PointerEvent, node: SimNode): void => {
    dragState.current.node = null;
    node.fx = null;
    node.fy = null;
  };

  const { nodes: simNodes, edges: simEdges } = simState.current;

  const neighborIds = useMemo(() => {
    if (!hoverId) return null;
    const set = new Set<string>([hoverId]);
    for (const e of simEdges) {
      if (e.source.id === hoverId) set.add(e.target.id);
      if (e.target.id === hoverId) set.add(e.source.id);
    }
    return set;
  }, [hoverId, simEdges]);

  return (
    <svg
      ref={svgRef}
      class="graph-canvas"
      onWheel={handleWheel as unknown as (e: Event) => void}
      onPointerDown={handlePanStart as unknown as (e: PointerEvent) => void}
      onPointerMove={handlePanMove as unknown as (e: PointerEvent) => void}
      onPointerUp={handlePanEnd}
      onPointerCancel={handlePanEnd}
    >
      <g transform={`translate(${zoom.x},${zoom.y}) scale(${zoom.k})`}>
        {simEdges.map((e, i) => {
          const dim = neighborIds && !(neighborIds.has(e.source.id) && neighborIds.has(e.target.id));
          return (
            <line
              key={i}
              x1={e.source.x}
              y1={e.source.y}
              x2={e.target.x}
              y2={e.target.y}
              class={`graph-edge ${dim ? "graph-dim" : ""}`}
            />
          );
        })}
        {simNodes.map((n) => {
          const isCurrent = n.id === currentSlug;
          const dim = neighborIds && !neighborIds.has(n.id);
          return (
            <g
              key={n.id}
              class={`graph-node ${dim ? "graph-dim" : ""} ${isCurrent ? "graph-current" : ""}`}
              transform={`translate(${n.x},${n.y})`}
              onMouseEnter={() => setHoverId(n.id)}
              onMouseLeave={() => setHoverId(null)}
              onPointerDown={(e: PointerEvent) => handleNodePointerDown(e, n)}
              onPointerMove={handleNodePointerMove as unknown as (e: PointerEvent) => void}
              onPointerUp={(e: PointerEvent) => handleNodePointerUp(e, n)}
              onClick={() => {
                if (dragState.current.node) return;
                onNavigate(n.id);
              }}
            >
              <circle r={isCurrent ? 8 : 6} style={{ fill: colorFor(n.group) }} />
              <text class="graph-label" y={20}>{n.title}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
