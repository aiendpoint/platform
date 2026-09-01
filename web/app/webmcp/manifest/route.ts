import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * WebMCP discovery manifest, served at /.well-known/webmcp via rewrite
 * (App Router cannot route dot-folders). Mirrors the tools the site
 * registers imperatively through document.modelContext.
 */
export function GET() {
  return NextResponse.json({
    name: "AIEndpoint Registry",
    description:
      "Service discovery for the agentic web: search AI-ready services (sites publishing a /.well-known/ai capability manifest) before navigating.",
    version: "1.0",
    tools: [
      {
        name: "find_services",
        description:
          "Search the AIEndpoint registry for AI-ready web services by keyword, category, auth type, or WebMCP support. Results render on the visible page.",
        annotations: { readOnlyHint: true },
      },
      {
        name: "select_service",
        description:
          "Open one registry service in the visible detail view and return its full capability list.",
        annotations: { readOnlyHint: true },
      },
    ],
    links: {
      ai_manifest: "https://www.aiendpoint.dev/.well-known/ai",
      docs: "https://www.aiendpoint.dev/docs/webmcp",
    },
  });
}
