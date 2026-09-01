"use client";

import Script from "next/script";

declare global {
  interface Window {
    AIEndpointWebMCP?: { attachAgentWidget?: () => void };
  }
}

/**
 * Loads the @aiendpoint/webmcp IIFE bundle and attaches the in-page
 * natural-language agent that drives this site's WebMCP tools.
 */
export function AgentWidget() {
  return (
    <Script
      src="/aiendpoint-webmcp.iife.js"
      strategy="afterInteractive"
      onLoad={() => window.AIEndpointWebMCP?.attachAgentWidget?.()}
    />
  );
}
