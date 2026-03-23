import type { Metadata } from "next";
import { ConvertForm } from "@/components/ConvertForm";

export const metadata: Metadata = {
  title: "Convert — AIEndpoint",
  description: "Convert existing OpenAPI specs or webpages into the /ai endpoint format. Auto-generate AI-ready service descriptions.",
  alternates: { canonical: "/convert" },
};

export default function ConvertPage() {
  return <ConvertForm />;
}
