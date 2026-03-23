import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register — AIEndpoint",
  description: "Register your web service in the AIEndpoint registry. We validate your /ai endpoint and add it to the directory.",
  alternates: { canonical: "/register" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
