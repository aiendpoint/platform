import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    aiendpoint: "1.0",
    service: {
      name: "AIEndpoint Registry",
      description:
        "Discover and register AI-ready services that implement the /ai standard. Search by capability, category, or keyword.",
      language: ["en"],
      category: ["developer", "data", "search"],
    },
    capabilities: [
      {
        id: "search_services",
        description: "Search the registry for AI-ready services",
        endpoint: "/api/services",
        method: "GET",
        params: {
          q: "search keyword (string, optional)",
          category:
            "filter by category (string, optional) — productivity, ecommerce, finance, news, weather, ...",
          auth_type:
            "filter by auth type (string, optional) — none, apikey, oauth2, bearer",
          verified: "only verified services (boolean, optional)",
          page: "page number (integer, optional, default: 1)",
          limit: "results per page (integer, optional, default: 20, max: 100)",
        },
        returns:
          "{ total, page, limit, services[]: { id, name, description, url, ai_url, categories, auth_type, is_verified } }",
      },
      {
        id: "get_service",
        description: "Get full details for a registered service including all capabilities",
        endpoint: "/api/services/:id",
        method: "GET",
        params: {
          id: "service UUID (string, required, path param)",
        },
        returns:
          "service object with capabilities[], token_hints, rate_limits, raw_spec",
      },
      {
        id: "validate_service",
        description: "Validate any URL's /ai endpoint and get a compliance score (0–100)",
        endpoint: "/api/validate",
        method: "GET",
        params: {
          url: "service base URL to validate (string, required)",
        },
        returns:
          "{ passed, score, grade, capability_count, errors[], warnings[], passes[], response_ms }",
      },
      {
        id: "register_service",
        description: "Register a new service in the registry. Fetches and validates /ai automatically.",
        endpoint: "/api/services",
        method: "POST",
        params: {
          url: "service base URL (string, required)",
          owner_email: "owner contact email (string, optional)",
        },
        returns:
          "{ id, name, url, is_verified, validation: { score, grade, warnings[] } }",
      },
      {
        id: "list_categories",
        description: "List all service categories with their registered service counts",
        endpoint: "/api/categories",
        method: "GET",
        params: {},
        returns: "{ categories[]: { id, label, count } }",
      },
    ],
    auth: {
      type: "none",
      docs: "https://github.com/aiendpoint/platform",
    },
    meta: {
      last_updated: "2026-03-13",
      spec_url: "https://aiendpoint.dev/ai",
      github: "https://github.com/aiendpoint/platform",
    },
  });
}
