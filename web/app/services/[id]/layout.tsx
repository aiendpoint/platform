import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Detail — AIEndpoint",
  description: "View service capabilities, endpoints, authentication, and compliance details.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
