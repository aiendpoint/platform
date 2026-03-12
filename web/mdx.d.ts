declare module "*.mdx" {
  import type { ComponentType } from "react";

  const MDXComponent: ComponentType;
  export const metadata: {
    title: string;
    description: string;
    section: string;
    order: number;
    href: string;
    toc?: Array<{ id: string; title: string }>;
  };
  export default MDXComponent;
}
