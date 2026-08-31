/**
 * Minimal client-side WebMCP registration helper.
 *
 * The WebMCP API surface is still evolving across runtimes (Chrome flag,
 * ChatGPT browser), so we detect every known entry point and register through
 * the first one that works. Keep this defensive until the standard settles.
 *
 * provideContext replaces the page's whole tool set on every call, so this
 * module keeps one union of all tools registered anywhere on the page and
 * always provides that union - independent components (layout tools, page
 * tools) would otherwise clobber each other.
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

// Union of every tool currently registered on this page (across components).
const activeTools = new Map<string, WebMcpTool>();
let provideQueue: Promise<void> = Promise.resolve();

function provideUnion(mc: Record<string, AnyFn>): Promise<void> {
  // Serialize provideContext calls so concurrent mounts/unmounts don't race.
  provideQueue = provideQueue.then(async () => {
    await mc.provideContext({ tools: [...activeTools.values()] });
  });
  return provideQueue;
}

export interface RegisterCallbacks {
  /** Diagnostic log line (used by the smoke-test page). */
  onEvent?: (message: string) => void;
  /** Registration settled: the method that worked, or null if none did. */
  onRegistered?: (via: string | null) => void;
}

/**
 * Registers tools via the first available WebMCP surface.
 * Returns a cleanup function (safe to call multiple times).
 */
export function registerWebMcpTools(tools: WebMcpTool[], callbacks?: RegisterCallbacks): () => void {
  const abort = new AbortController();
  const unregisters: Array<() => void> = [];
  let providedVia: Record<string, AnyFn> | null = null;
  let cleaned = false;

  for (const tool of tools) activeTools.set(tool.name, tool);

  (async () => {
    for (const [index, mc] of surfaces().entries()) {
      try {
        if (typeof mc.registerTool === "function") {
          for (const tool of tools) {
            const result = await mc.registerTool(tool, { signal: abort.signal });
            callbacks?.onEvent?.(`registerTool("${tool.name}") on surface #${index} -> ${String(result)}`);
            if (result && typeof (result as { unregister?: unknown }).unregister === "function") {
              unregisters.push(() => (result as { unregister: () => void }).unregister());
            } else if (typeof result === "function") {
              unregisters.push(result as () => void);
            }
          }
          callbacks?.onRegistered?.("registerTool");
          return;
        }
        if (typeof mc.provideContext === "function") {
          providedVia = mc;
          await provideUnion(mc);
          callbacks?.onEvent?.(`provideContext on surface #${index} with ${activeTools.size} tool(s)`);
          callbacks?.onRegistered?.("provideContext");
          return;
        }
        callbacks?.onEvent?.(`surface #${index} has neither registerTool nor provideContext - skipped`);
      } catch (e) {
        callbacks?.onEvent?.(`surface #${index} failed: ${e instanceof Error ? e.message : String(e)}`);
        console.debug("[webmcp] registration failed on one surface, trying next:", e);
      }
    }
    callbacks?.onRegistered?.(null);
  })();

  return () => {
    if (cleaned) return;
    cleaned = true;
    abort.abort();
    for (const tool of tools) activeTools.delete(tool.name);
    for (const un of unregisters) {
      try {
        un();
      } catch {
        /* best effort */
      }
    }
    if (providedVia) {
      void provideUnion(providedVia).catch(() => {});
    }
  };
}
