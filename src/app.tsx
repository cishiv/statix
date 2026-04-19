import { useState, useEffect, useCallback } from "preact/hooks";
import contentData from "./content.json";
import graphData from "./graph.json";
import { Sidebar } from "./components/Sidebar.tsx";
import { Content } from "./components/Content.tsx";
import { MobileHeader } from "./components/MobileHeader.tsx";
import { GraphOverlay } from "./components/GraphOverlay.tsx";
import type { ContentData, Graph } from "./types.ts";

const data = contentData as ContentData;
const graph = graphData as Graph;

function getSlugFromPath(pathname: string): string {
  const slug = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  return slug || "/";
}

export function App(): preact.JSX.Element {
  const [currentSlug, setCurrentSlug] = useState<string>(
    getSlugFromPath(window.location.pathname)
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [graphOpen, setGraphOpen] = useState<boolean>(false);

  const navigate = useCallback((slug: string): void => {
    window.history.pushState(null, "", slug === "/" ? "/" : slug);
    setCurrentSlug(slug);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onPopState = (): void => {
      setCurrentSlug(getSlugFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const currentPage = data.pages[currentSlug];
  const title = currentPage?.title ?? "Not Found";
  const html = currentPage?.html ?? "<h1>Page Not Found</h1><p>The requested page does not exist.</p>";

  return (
    <div class="layout">
      <Sidebar
        nav={data.nav}
        currentSlug={currentSlug}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigate}
        onOpenGraph={() => setGraphOpen(true)}
      />
      <div class="main">
        <MobileHeader
          title={title}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <Content html={html} title={title} onNavigate={navigate} />
      </div>
      {sidebarOpen && (
        <div class="backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      {graphOpen && (
        <GraphOverlay
          graph={graph}
          currentSlug={currentSlug}
          onNavigate={navigate}
          onClose={() => setGraphOpen(false)}
        />
      )}
    </div>
  );
}
