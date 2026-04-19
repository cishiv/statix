export type Page = {
  slug: string;
  title: string;
  order: number;
  hidden: boolean;
  html: string;
  date: string | null;
  updated: string | null;
  outbound: string[];
  inbound: string[];
};

export type NavNode = {
  slug: string;
  title: string;
  order: number;
  hidden: boolean;
  children: NavNode[];
};

export type ContentData = {
  nav: NavNode[];
  pages: Record<string, Page>;
};

export type GraphNode = {
  id: string;
  title: string;
  group: string;
  hidden: boolean;
};

export type GraphEdge = {
  source: string;
  target: string;
};

export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
