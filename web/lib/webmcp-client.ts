/**
 * Minimal client-side WebMCP registration helper.
 *
 * The WebMCP API surface is still evolving across runtimes (Chrome flag,
 * ChatGPT browser), so we detect every known entry point and register through
 * the first one that works. Keep this defensive until the standard settles.
 */

export interface WebMcpToolResult {
  content: Array<{ type: "text"; text: string }>;
}

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown> | undefined) => Promise<WebMcpToolResult>;
}

type AnyFn = (...args: unknown[]) => unknown;

function surfaces(): Array<Record<string, AnyFn>> {
  if (typeof window === "undefined") return [];
  const candidates = [
    (navigator as unknown as Record<string, unknown>).modelContext,
    (document as unknown as Record<string, unknown>).modelContext,
    (window as unknown as Record<string, unknown>).modelContext,
    (window as unknown as Record<string, unknown>).agent,
  ];
  return candidates.filter((c): c is Record<string, AnyFn> => c != null);
}

export function webMcpAvailable(): boolean {
  return surfaces().length > 0;
}

/**
 * Registers tools via the first available WebMCP surface.
 * Returns a cleanup function (safe to call multiple times).
 */
export function registerWebMcpTools(tools: WebMcpTool[]): () => void {
  const abort = new AbortController();
  const unregisters: Array<() => void> = [];
  let cleaned = false;

  (async () => {
    for (const mc of surfaces()) {
      try {
        if (typeof mc.registerTool === "function") {
          for (const tool of tools) {
            const result = await mc.registerTool(tool, { signal: abort.signal });
            if (result && typeof (result as { unregister?: unknown }).unregister === "function") {
              unregisters.push(() => (result as { unregister: () => void }).unregister());
            } else if (typeof result === "function") {
              unregisters.push(result as () => void);
            }
          }
          return;
        }
        if (typeof mc.provideContext === "function") {
          await mc.provideContext({ tools });
          return;
        }
      } catch (e) {
        console.debug("[webmcp] registration failed on one surface, trying next:", e);
      }
    }
  })();

  return () => {
    if (cleaned) return;
    cleaned = true;
    abort.abort();
    for (const un of unregisters) {
      try {
        un();
      } catch {
        /* best effort */
      }
    }
  };
}
