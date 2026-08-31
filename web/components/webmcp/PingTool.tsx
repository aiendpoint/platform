"use client";

import { useEffect, useState } from "react";
import { registerWebMcpTools, type WebMcpTool } from "@/lib/webmcp-client";

type LogLine = { at: string; text: string };

type Surface = {
  path: string;
  obj: unknown;
  methods: string[];
};

function now(): string {
  return new Date().toISOString().slice(11, 23);
}

function detectSurfaces(): Surface[] {
  const candidates: Array<[string, unknown]> = [
    ["navigator.modelContext", (navigator as unknown as Record<string, unknown>).modelContext],
    ["document.modelContext", (document as unknown as Record<string, unknown>).modelContext],
    ["window.modelContext", (window as unknown as Record<string, unknown>).modelContext],
    ["window.agent", (window as unknown as Record<string, unknown>).agent],
  ];
  return candidates
    .filter(([, obj]) => obj != null)
    .map(([path, obj]) => {
      const methods: string[] = [];
      const record = obj as Record<string, unknown>;
      // Own + prototype function props — the API surface is what we're here to discover
      const seen = new Set<string>();
      let cur: object | null = record;
      while (cur && cur !== Object.prototype) {
        for (const key of Object.getOwnPropertyNames(cur)) {
          if (seen.has(key) || key === "constructor") continue;
          seen.add(key);
          try {
            if (typeof record[key] === "function") methods.push(key);
          } catch {
            /* getter may throw */
          }
        }
        cur = Object.getPrototypeOf(cur);
      }
      return { path, obj, methods: methods.sort() };
    });
}

export function PingTool() {
  const [surfaces, setSurfaces] = useState<Surface[] | null>(null);
  const [registeredVia, setRegisteredVia] = useState<string | null>(null);
  const [callCount, setCallCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  useEffect(() => {
    // Fresh state per (re)mount - Strict Mode runs register/cleanup/register,
    // and the UI must reflect the registration that is actually live.
    setLogs([]);
    setRegisteredVia(null);

    const log = (text: string) => setLogs((prev) => [...prev, { at: now(), text }]);

    const tool: WebMcpTool = {
      name: "ping",
      description:
        "Health-check tool for the AIEndpoint WebMCP smoke test. Echoes the message back and increments the on-page call counter.",
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string", description: "Any text to echo back" },
        },
      },
      execute: async (input) => {
        const msg = typeof input?.message === "string" ? input.message : "(no message)";
        setCallCount((c) => c + 1);
        setLastMessage(msg);
        log(`ping called with message: ${JSON.stringify(msg)}`);
        return {
          content: [{ type: "text" as const, text: `pong: ${msg} (served by aiendpoint.dev)` }],
        };
      },
    };

    const found = detectSurfaces();
    setSurfaces(found);
    if (found.length === 0) {
      log("No WebMCP API surface found on this browser.");
      return;
    }
    for (const s of found) {
      log(`Found ${s.path} with methods: [${s.methods.join(", ")}]`);
    }

    // Register through the shared helper so ping joins the page-wide tool
    // union instead of clobbering tools registered by other components.
    return registerWebMcpTools([tool], {
      onEvent: log,
      onRegistered: (via) => setRegisteredVia(via),
    });
  }, []);

  const supported = surfaces === null ? null : surfaces.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-fg mb-2">WebMCP Smoke Test</h1>
      <p className="text-muted mb-8">
        Registers a single <code className="text-muted bg-canvas border border-line px-1.5 py-0.5 rounded text-xs">ping</code>{" "}
        tool and shows exactly what the browser exposes. Ask your in-browser agent to call{" "}
        <code className="text-muted bg-canvas border border-line px-1.5 py-0.5 rounded text-xs">ping</code> with any message.
      </p>

      {supported === false && (
        <div className="border border-line rounded-lg p-4 mb-6 text-sm text-muted">
          <p className="text-fg font-medium mb-1">WebMCP not detected in this browser</p>
          <p>
            Use Chrome 149+ with{" "}
            <code className="bg-canvas border border-line px-1.5 py-0.5 rounded text-xs">
              chrome://flags/#enable-webmcp-testing
            </code>{" "}
            enabled, or the ChatGPT desktop app browser, then reload this page.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-line rounded-lg p-4">
          <p className="text-xs text-faint uppercase tracking-wide mb-1">Tool calls received</p>
          <p className="text-4xl font-bold text-fg tabular-nums">{callCount}</p>
          {lastMessage !== null && (
            <p className="text-xs text-muted mt-2 break-all">last message: {lastMessage}</p>
          )}
        </div>
        <div className="border border-line rounded-lg p-4">
          <p className="text-xs text-faint uppercase tracking-wide mb-1">Registration</p>
          <p className="text-sm text-fg font-mono break-all">
            {registeredVia ?? (supported === false ? "unavailable" : "pending…")}
          </p>
        </div>
      </div>

      {surfaces !== null && surfaces.length > 0 && (
        <div className="border border-line rounded-lg p-4 mb-6">
          <p className="text-xs text-faint uppercase tracking-wide mb-2">Detected API surfaces</p>
          <ul className="text-sm text-muted font-mono space-y-1">
            {surfaces.map((s) => (
              <li key={s.path}>
                {s.path} — [{s.methods.join(", ")}]
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border border-line rounded-lg p-4">
        <p className="text-xs text-faint uppercase tracking-wide mb-2">Log</p>
        {logs.length === 0 ? (
          <p className="text-sm text-faint">Waiting…</p>
        ) : (
          <ul className="text-xs text-muted font-mono space-y-1">
            {logs.map((l, i) => (
              <li key={i}>
                <span className="text-faint">{l.at}</span> {l.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
