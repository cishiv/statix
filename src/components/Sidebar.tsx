import { useState } from "preact/hooks";
import type { NavNode } from "../types.ts";

type SidebarProps = {
  nav: NavNode[];
  currentSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (slug: string) => void;
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
          <span class={`nav-chevron ${open ? "nav-chevron-open" : ""}`}>
            &#9656;
          </span>
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

export function Sidebar({ nav, currentSlug, isOpen, onNavigate }: SidebarProps): preact.JSX.Element {
  return (
    <nav class={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div class="sidebar-content">
        <div class="sidebar-header">
          <a href="/" class="sidebar-logo" onClick={(e) => { e.preventDefault(); onNavigate("/"); }}>
            Statix
          </a>
        </div>
        <NavTree nodes={nav} depth={0} currentSlug={currentSlug} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}
