import { useState } from "preact/hooks";
import type { NavNode } from "../types.ts";

type SidebarProps = {
  nav: NavNode[];
  currentSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (slug: string) => void;
  onOpenGraph: () => void;
};

type NavTreeProps = {
  nodes: NavNode[];
  depth: number;
  currentSlug: string;
  onNavigate: (slug: string) => void;
};

function isAncestor(nodeSlug: string, currentSlug: string): boolean {
  if (nodeSlug === "/") return true;
  return currentSlug.startsWith(nodeSlug + "/") || currentSlug === nodeSlug;
}

function NavTree({ nodes, depth, currentSlug, onNavigate }: NavTreeProps): preact.JSX.Element {
  if (depth >= 3) return <></>;

  return (
    <ul class={`nav-list nav-depth-${depth}`}>
      {nodes.map((node) => (
        <NavItem
          key={node.slug}
          node={node}
          depth={depth}
          currentSlug={currentSlug}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );
}

type NavItemProps = {
  node: NavNode;
  depth: number;
  currentSlug: string;
  onNavigate: (slug: string) => void;
};

function NavItem({ node, depth, currentSlug, onNavigate }: NavItemProps): preact.JSX.Element {
  const hasChildren = node.children.length > 0;
  const isActive = currentSlug === node.slug;
  const isExpanded = isAncestor(node.slug, currentSlug);
  const [manualOpen, setManualOpen] = useState<boolean>(isExpanded);

  const open = manualOpen || isExpanded;

  const handleClick = (e: Event): void => {
    e.preventDefault();
    if (hasChildren) {
      setManualOpen((prev) => !prev);
    }
    onNavigate(node.slug);
  };

  return (
    <li class="nav-item">
      <a
        href={node.slug}
        class={`nav-link ${isActive ? "nav-active" : ""}`}
        aria-current={isActive ? "page" : undefined}
        onClick={handleClick}
      >
        {hasChildren && (
          <svg
            class={`nav-chevron ${open ? "nav-chevron-open" : ""}`}
            viewBox="0 0 10 10"
            width="10"
            height="10"
            aria-hidden="true"
          >
            <path d="M3.5 2 L6.5 5 L3.5 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        )}
        {node.title}
      </a>
      {hasChildren && open && (
        <NavTree
          nodes={node.children}
          depth={depth + 1}
          currentSlug={currentSlug}
          onNavigate={onNavigate}
        />
      )}
    </li>
  );
}

export function Sidebar({ nav, currentSlug, isOpen, onNavigate, onOpenGraph }: SidebarProps): preact.JSX.Element {
  return (
    <nav class={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div class="sidebar-content">
        <div class="sidebar-header">
          <a href="/" class="sidebar-logo" onClick={(e) => { e.preventDefault(); onNavigate("/"); }}>
            Statix
          </a>
        </div>
        <NavTree nodes={nav} depth={0} currentSlug={currentSlug} onNavigate={onNavigate} />
        <div class="sidebar-footer">
          <button class="graph-button" type="button" onClick={onOpenGraph} aria-label="Open graph">
            <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" class="graph-button-icon">
              <circle cx="4" cy="10" r="2.2" />
              <circle cx="16" cy="4" r="2.2" />
              <circle cx="16" cy="16" r="2.2" />
              <line x1="4" y1="10" x2="16" y2="4" />
              <line x1="4" y1="10" x2="16" y2="16" />
            </svg>
            Graph
          </button>
        </div>
      </div>
    </nav>
  );
}
