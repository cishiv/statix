import { useEffect, useState } from "preact/hooks";
import { GraphCanvas } from "./GraphCanvas.tsx";
import { GraphFallback } from "./GraphFallback.tsx";
import type { Graph } from "../types.ts";

type GraphOverlayProps = {
  graph: Graph;
  currentSlug: string;
  onClose: () => void;
  onNavigate: (slug: string) => void;
};

const MOBILE_BREAKPOINT = 640;

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );
  useEffect(() => {
    const onResize = (): void => setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

export function GraphOverlay({ graph, currentSlug, onClose, onNavigate }: GraphOverlayProps): preact.JSX.Element {
  const mobile = useIsMobile();

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleNavigate = (slug: string): void => {
    onNavigate(slug);
    onClose();
  };

  return (
    <div class="graph-overlay" onClick={onClose}>
      <div class="graph-overlay-inner" onClick={(e) => e.stopPropagation()}>
        <div class="graph-overlay-header">
          <span class="graph-overlay-title">Graph</span>
          <button class="graph-overlay-close" type="button" onClick={onClose} aria-label="Close graph">×</button>
        </div>
        <div class="graph-overlay-body">
          {mobile ? (
            <GraphFallback graph={graph} onNavigate={handleNavigate} />
          ) : (
            <GraphCanvas graph={graph} currentSlug={currentSlug} onNavigate={handleNavigate} />
          )}
        </div>
      </div>
    </div>
  );
}
