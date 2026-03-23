import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validate — AIEndpoint",
  description: "Check if your service correctly implements the /ai endpoint standard. Get a compliance score from 0 to 100.",
  alternates: { canonical: "/validate" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
