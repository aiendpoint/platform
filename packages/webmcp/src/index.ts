/**
 * @aiendpoint/webmcp
 *
 * Promotes a site's AIEndpoint discovery manifest (/.well-known/ai) into live
 * WebMCP tools. Tool names, descriptions and input schemas are derived from
 * the manifest's capabilities; execution stays in explicit per-capability
 * handlers supplied by the page, so nothing is invoked that the site did not
 * consciously wire up.
 *
 * The WebMCP API surface is still evolving across runtimes (Chrome flag,
 * ChatGPT browser), so registration probes every known entry point and uses
 * the first one that works.
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

export type CapabilityHandler = (input: Record<string, unknown>) => Promise<unknown>;

export interface RegisterOptions {
  /** Manifest location. Default: "/.well-known/ai" (falls back to "/ai" on 404). */
  specUrl?: string;
  /** Explicit executor per capability id. Capabilities without a handler are skipped. */
  handlers: Record<string, CapabilityHandler>;
  /** Called once registration settles, with the final status. */
  onStatus?: (status: RegistrationStatus) => void;
}

export interface RegistrationStatus {
  /** A WebMCP API surface exists in this browser. */
  available: boolean;
  /** Tools were accepted by the browser. */
  registered: boolean;
  /** Names of the registered tools. */
  tools: string[];
  /** service.name from the manifest, when it loaded. */
  service: string | null;
  error?: string;
}

interface ManifestCapability {
  id: string;
  description: string;
  endpoint: string;
  method: string;
  params?: Record<string, string>;
}

interface Manifest {
  aiendpoint: string;
  service?: { name?: string };
  capabilities?: ManifestCapability[];
}

type AnyFn = (...args: unknown[]) => unknown;

function surfaces(): Array<Record<string, AnyFn>> {
  if (typeof window === "undefined") return [];
  const candidates = [
    // Chrome deprecates navigator.modelContext in favor of document.modelContext
    (document as unknown as Record<string, unknown>).modelContext,
    (navigator as unknown as Record<string, unknown>).modelContext,
    (window as unknown as Record<string, unknown>).modelContext,
    (window as unknown as Record<string, unknown>).agent,
  ];
  return candidates.filter((c): c is Record<string, AnyFn> => c != null);
}

/** True when this browser exposes any known WebMCP entry point. */
export function webMcpAvailable(): boolean {
  return surfaces().length > 0;
}

const PARAM_TYPES = ["string", "integer", "number", "boolean", "array"];

/**
 * Parses the spec's compact parameter notation:
 *   "string, required -- city name"          (draft-01 form)
 *   "city name (string, required)"           (legacy v1 form)
 * → { type, required, description }.
 */
export function parseParamDescription(desc: string): {
  type: string;
  required: boolean;
  description: string;
} {
  const text = String(desc ?? "");
  let head = text;
  let description = text;

  const dashSplit = text.split(/--|—/);
  const legacyMatch = /^(.*)\(([^()]*)\)\s*$/.exec(text);
  if (dashSplit.length > 1) {
    head = dashSplit[0];
    description = dashSplit.slice(1).join("--").trim() || text;
  } else if (legacyMatch) {
    head = legacyMatch[2];
    description = legacyMatch[1].trim() || text;
  }

  const out = { type: "string", required: false, description };
  for (const raw of head.split(",")) {
    const token = raw.trim().toLowerCase();
    if (PARAM_TYPES.includes(token)) out.type = token;
    if (token === "required") out.required = true;
  }
  return out;
}

function toInputSchema(params: Record<string, string> | undefined): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [name, desc] of Object.entries(params ?? {})) {
    const p = parseParamDescription(desc);
    properties[name] = { type: p.type, description: p.description };
    if (p.required) required.push(name);
  }
  const schema: Record<string, unknown> = { type: "object", properties };
  if (required.length) schema.required = required;
  return schema;
}

function toTool(
  capability: ManifestCapability,
  handler: CapabilityHandler,
  serviceName: string
): WebMcpTool {
  return {
    name: capability.id,
    description: `${capability.description} (${serviceName}, via AIEndpoint /.well-known/ai manifest)`,
    inputSchema: toInputSchema(capability.params),
    execute: async (input) => {
      const result = await handler(input ?? {});
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  };
}

// provideContext replaces the page's whole tool set on every call, so keep
// one union of all tools registered through this module and always provide
// that union - independent callers would otherwise clobber each other.
const activeTools = new Map<string, WebMcpTool>();
let provideQueue: Promise<void> = Promise.resolve();

function provideUnion(mc: Record<string, AnyFn>): Promise<void> {
  provideQueue = provideQueue.then(async () => {
    await mc.provideContext({ tools: [...activeTools.values()] });
  });
  return provideQueue;
}

/**
 * Low-level registration: pushes ready-made tools through the first working
 * WebMCP surface. Returns a cleanup function (safe to call multiple times).
 */
export function registerWebMcpTools(
  tools: WebMcpTool[],
  onDone?: (registered: boolean) => void
): () => void {
  const abort = new AbortController();
  const unregisters: Array<() => void> = [];
  let providedVia: Record<string, AnyFn> | null = null;
  let cleaned = false;

  for (const tool of tools) activeTools.set(tool.name, tool);

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
          onDone?.(true);
          return;
        }
        if (typeof mc.provideContext === "function") {
          providedVia = mc;
          await provideUnion(mc);
          onDone?.(true);
          return;
        }
      } catch (e) {
        console.debug("[aiendpoint-webmcp] surface failed, trying next:", e);
      }
    }
    onDone?.(false);
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

/**
 * High-level entry point: load the manifest, derive tool definitions from its
 * capabilities, and register the ones that have an explicit handler.
 */
export async function registerAiEndpointTools(
  options: RegisterOptions
): Promise<RegistrationStatus & { cleanup: () => void }> {
  const specUrl = options.specUrl ?? "/.well-known/ai";
  const handlers = options.handlers ?? {};
  const status: RegistrationStatus = {
    available: webMcpAvailable(),
    registered: false,
    tools: [],
    service: null,
  };
  let cleanup = () => {};

  if (!status.available) {
    options.onStatus?.(status);
    return { ...status, cleanup };
  }

  try {
    let res = await fetch(specUrl, { headers: { accept: "application/json" } });
    if (res.status === 404 && specUrl === "/.well-known/ai") {
      res = await fetch("/ai", { headers: { accept: "application/json" } });
    }
    if (!res.ok) throw new Error(`manifest fetch failed: HTTP ${res.status}`);
    const manifest = (await res.json()) as Manifest;
    status.service = manifest.service?.name ?? null;

    const tools: WebMcpTool[] = [];
    for (const cap of manifest.capabilities ?? []) {
      const handler = handlers[cap.id];
      if (handler) tools.push(toTool(cap, handler, status.service ?? "service"));
    }

    const registered = await new Promise<boolean>((resolve) => {
      cleanup = registerWebMcpTools(tools, resolve);
    });
    status.registered = registered;
    status.tools = tools.map((t) => t.name);
  } catch (e) {
    status.error = e instanceof Error ? e.message : String(e);
    console.debug("[aiendpoint-webmcp] registration failed:", e);
  }

  options.onStatus?.(status);
  return { ...status, cleanup };
}
