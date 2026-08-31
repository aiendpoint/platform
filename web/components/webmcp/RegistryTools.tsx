"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getService, getServices } from "@/lib/api";
import { registerWebMcpTools, type WebMcpTool, type WebMcpToolResult } from "@/lib/webmcp-client";

const CATEGORIES = [
  "productivity", "ecommerce", "finance", "news", "weather", "maps",
  "search", "data", "communication", "calendar", "storage", "media",
  "health", "education", "travel", "food", "government", "developer",
] as const;

function textResult(payload: unknown): WebMcpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

/**
 * Registers the AIEndpoint registry's WebMCP tools on every page.
 * Each tool both returns data to the agent AND navigates the visible UI,
 * so the human and the agent always share the same on-screen state.
 */
export function RegistryTools() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  // Last find_services results, so select_service can serve community
  // entries (which the registry detail API doesn't cover) from the set the
  // agent just saw.
  const lastResultsRef = useRef(new Map<string, Record<string, unknown>>());

  useEffect(() => {
    const findServices: WebMcpTool = {
      name: "find_services",
      description:
        "Search the AIEndpoint registry for AI-ready web services (services exposing a /.well-known/ai capability manifest). " +
        "Returns matching services with their live URLs and capability summaries, and updates the results the user sees on this page. " +
        "Use this to discover WHICH website can do a job before navigating to it.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keywords matched against service names and descriptions, e.g. 'weather' or 'currency'",
          },
          category: {
            type: "string",
            enum: [...CATEGORIES],
            description: "Filter by service category from the AIEndpoint spec vocabulary",
          },
          auth_type: {
            type: "string",
            enum: ["none", "apikey", "bearer", "oauth2"],
            description: "Filter by required authentication. Use 'none' for services an agent can call without credentials",
          },
          limit: { type: "integer", description: "Max results (default 12, max 50)" },
        },
      },
      execute: async (input) => {
        const query = typeof input?.query === "string" ? input.query : undefined;
        const category = typeof input?.category === "string" ? input.category : undefined;
        const authType = typeof input?.auth_type === "string" ? input.auth_type : undefined;
        const limit = Math.min(50, Math.max(1, Number(input?.limit) || 12));

        const res = await getServices({
          q: query,
          category,
          auth_type: authType,
          sort: "score",
          limit,
        });

        // Mirror the search in the visible UI
        const sp = new URLSearchParams();
        if (query) sp.set("q", query);
        if (category) sp.set("category", category);
        if (authType) sp.set("auth_type", authType);
        sp.set("sort", "score");
        routerRef.current.push(`/services${sp.size ? `?${sp}` : ""}`);

        const items = res.services.map((s) => ({
          service_id: s.id,
          name: s.name,
          description: s.description,
          url: s.url,
          ai_manifest: s.ai_url,
          categories: s.categories,
          auth: s.auth_type,
          verified: s.is_verified,
          score: s.score,
          source: s.source ?? "owner",
        }));
        lastResultsRef.current = new Map(items.map((i) => [i.service_id, i]));

        return textResult({
          total: res.total,
          showing: items.length,
          services: items,
          note:
            "The user's page now shows these results. Call select_service with a service_id to open its detail view, " +
            "or navigate to a service's url to use its own on-page WebMCP tools.",
        });
      },
    };

    const selectService: WebMcpTool = {
      name: "select_service",
      description:
        "Open one service from the AIEndpoint registry in the visible detail view (capabilities, auth, live URL) " +
        "and return its full capability list. Use a service_id returned by find_services.",
      inputSchema: {
        type: "object",
        properties: {
          service_id: {
            type: "string",
            description: "The service_id from a find_services result",
          },
        },
        required: ["service_id"],
      },
      execute: async (input) => {
        const id = typeof input?.service_id === "string" ? input.service_id : "";
        if (!id) {
          return textResult({ error: "service_id is required. Call find_services first." });
        }

        let s;
        try {
          s = await getService(id);
        } catch {
          // Community-generated entries exist only in the list API; serve
          // them from the last find_services result set. The detail PAGE
          // still renders them, so navigation below works either way.
          const cached = lastResultsRef.current.get(id);
          if (!cached) {
            return textResult({
              error: `No service found for service_id '${id}'. Call find_services first and use one of its service_id values.`,
            });
          }
          routerRef.current.push(`/services/${id}`);
          return textResult({
            ...cached,
            capabilities_note:
              "Community-generated entry: the full capability list is on the page now shown to the user, and in the service's own /.well-known/ai manifest.",
            note:
              "The user's page now shows this service. Visit the service's url in the browser to use its own on-page WebMCP tools.",
          });
        }

        // Show the human the same detail view
        routerRef.current.push(`/services/${s.id}`);

        return textResult({
          service_id: s.id,
          name: s.name,
          description: s.description,
          url: s.url,
          ai_manifest: s.ai_url,
          categories: s.categories,
          auth: { type: s.auth_type, docs: s.auth_docs_url },
          verified: s.is_verified,
          score: s.score,
          capabilities: s.capabilities.map((c) => ({
            id: c.capability_id,
            description: c.description,
            method: c.method,
            endpoint: c.endpoint,
            params: c.params,
            returns: c.returns,
          })),
          note:
            "The user's page now shows this service. Its detail view is open with an 'Open service' link. " +
            "Visit the service's url in the browser to use its own on-page WebMCP tools.",
        });
      },
    };

    return registerWebMcpTools([findServices, selectService]);
  }, []);

  return null;
}
