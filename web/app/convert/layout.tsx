import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Convert — AIEndpoint",
  description: "Convert existing OpenAPI specs or webpages into the /ai endpoint format. Auto-generate AI-ready service descriptions.",
  alternates: { canonical: "/convert" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
