export type DocsPageMeta = {
  title: string;
  description: string;
  section: string;
  order: number;
  href: string;
  toc?: Array<{ id: string; title: string }>;
};

type DocsModule = {
  default: React.ComponentType;
  metadata: DocsPageMeta;
};

type DocsEntry = {
  slug: string[];
  load: () => Promise<DocsModule>;
};

const docsEntries: DocsEntry[] = [
  { slug: [], load: () => import("@/content/docs/index.mdx") },
  { slug: ["quick-start"], load: () => import("@/content/docs/quick-start.mdx") },
  { slug: ["spec"], load: () => import("@/content/docs/spec.mdx") },
  { slug: ["validation"], load: () => import("@/content/docs/validation.mdx") },
  { slug: ["mcp-server"], load: () => import("@/content/docs/mcp-server.mdx") },
  { slug: ["skill"], load: () => import("@/content/docs/skill.mdx") },
  { slug: ["concepts"], load: () => import("@/content/docs/concepts.mdx") },
  { slug: ["roadmap"], load: () => import("@/content/docs/roadmap.mdx") },
];

function normalizeSlug(slug?: string[]) {
  return slug?.filter(Boolean) ?? [];
}

function sameSlug(a: string[], b: string[]) {
  return a.length === b.length && a.every((segment, index) => segment === b[index]);
}

export async function getAllDocsPages() {
  const pages = await Promise.all(
    docsEntries.map(async (entry) => {
      const mod = await entry.load();
      return {
        slug: entry.slug,
        ...mod,
      };
    }),
  );

  return pages.sort((a, b) => a.metadata.order - b.metadata.order);
}

export async function getDocsPage(slug?: string[]) {
  const target = normalizeSlug(slug);
  const entry = docsEntries.find((item) => sameSlug(item.slug, target));
  if (!entry) return null;

  const mod = await entry.load();
  return {
    slug: entry.slug,
    ...mod,
  };
}

export async function getDocsNavigation() {
  const pages = await getAllDocsPages();
  const sections = new Map<string, Array<{ title: string; href: string }>>();

  for (const page of pages) {
    const items = sections.get(page.metadata.section) ?? [];
    items.push({ title: page.metadata.title, href: page.metadata.href });
    sections.set(page.metadata.section, items);
  }

  return Array.from(sections.entries()).map(([title, items]) => ({ title, items }));
}

export async function getDocsNeighbors(slug?: string[]) {
  const pages = await getAllDocsPages();
  const target = normalizeSlug(slug);
  const index = pages.findIndex((page) => sameSlug(page.slug, target));

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: pages[index - 1]
      ? {
          title: pages[index - 1].metadata.title,
          href: pages[index - 1].metadata.href,
        }
      : null,
    next: pages[index + 1]
      ? {
          title: pages[index + 1].metadata.title,
          href: pages[index + 1].metadata.href,
        }
      : null,
  };
}
