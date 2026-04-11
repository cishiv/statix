export type Page = {
  slug: string;
  title: string;
  order: number;
  hidden: boolean;
  html: string;
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
