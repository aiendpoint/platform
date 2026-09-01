import type { Metadata } from "next";
import { PingTool } from "@/components/webmcp/PingTool";

export const metadata: Metadata = {
  title: "WebMCP Smoke Test — AIEndpoint",
  description: "Minimal WebMCP tool registration test page for the AIEndpoint registry.",
  robots: { index: false },
};

export default function WebMcpPingPage() {
  return <PingTool />;
}
