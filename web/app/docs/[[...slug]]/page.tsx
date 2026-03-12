import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsShell } from "@/components/docs/DocsShell";
import { getDocsNavigation, getDocsNeighbors, getDocsPage } from "@/lib/docs";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export async function generateStaticParams() {
  return [
    {},
    { slug: ["quick-start"] },
    { slug: ["spec"] },
    { slug: ["validation"] },
    { slug: ["mcp-server"] },
    { slug: ["skill"] },
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getDocsPage(slug);

  if (!page) {
    return {};
  }

  return {
    title: `${page.metadata.title} | AIEndpoint Docs`,
    description: page.metadata.description,
  };
}

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getDocsPage(slug);

  if (!page) {
    notFound();
  }

  const navigation = await getDocsNavigation();
  const neighbors = await getDocsNeighbors(slug);
  const Content = page.default;

  return (
    <DocsShell
      title={page.metadata.title}
      description={page.metadata.description}
      navigation={navigation}
      currentPath={page.metadata.href}
      toc={page.metadata.toc ?? []}
      prev={neighbors.prev}
      next={neighbors.next}
    >
      <Content />
    </DocsShell>
  );
}
