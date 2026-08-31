"use strict";
var AIEndpointWebMCP = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    parseParamDescription: () => parseParamDescription,
    registerAiEndpointTools: () => registerAiEndpointTools,
    registerWebMcpTools: () => registerWebMcpTools,
    webMcpAvailable: () => webMcpAvailable
  });
  function surfaces() {
    if (typeof window === "undefined") return [];
    const candidates = [
      navigator.modelContext,
      document.modelContext,
      window.modelContext,
      window.agent
    ];
    return candidates.filter((c) => c != null);
  }
  function webMcpAvailable() {
    return surfaces().length > 0;
  }
  var PARAM_TYPES = ["string", "integer", "number", "boolean", "array"];
  function parseParamDescription(desc) {
    const text = String(desc ?? "");
    const [head, ...rest] = text.split(/--|—/);
    const tail = rest.join("--").trim();
    const out = { type: "string", required: false, description: tail || text };
    for (const raw of head.split(",")) {
      const token = raw.trim().toLowerCase();
      if (PARAM_TYPES.includes(token)) out.type = token;
      if (token === "required") out.required = true;
    }
    return out;
  }
  function toInputSchema(params) {
    const properties = {};
    const required = [];
    for (const [name, desc] of Object.entries(params ?? {})) {
      const p = parseParamDescription(desc);
      properties[name] = { type: p.type, description: p.description };
      if (p.required) required.push(name);
    }
    const schema = { type: "object", properties };
    if (required.length) schema.required = required;
    return schema;
  }
  function toTool(capability, handler, serviceName) {
    return {
      name: capability.id,
      description: `${capability.description} (${serviceName}, via AIEndpoint /.well-known/ai manifest)`,
      inputSchema: toInputSchema(capability.params),
      execute: async (input) => {
        const result = await handler(input ?? {});
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
    };
  }
  function registerWebMcpTools(tools, onDone) {
    const abort = new AbortController();
    const unregisters = [];
    let cleaned = false;
    (async () => {
      for (const mc of surfaces()) {
        try {
          if (typeof mc.registerTool === "function") {
            for (const tool of tools) {
              const result = await mc.registerTool(tool, { signal: abort.signal });
              if (result && typeof result.unregister === "function") {
                unregisters.push(() => result.unregister());
              } else if (typeof result === "function") {
                unregisters.push(result);
              }
            }
            onDone?.(true);
            return;
          }
          if (typeof mc.provideContext === "function") {
            await mc.provideContext({ tools });
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
      for (const un of unregisters) {
        try {
          un();
        } catch {
        }
      }
    };
  }
  async function registerAiEndpointTools(options) {
    const specUrl = options.specUrl ?? "/.well-known/ai";
    const handlers = options.handlers ?? {};
    const status = {
      available: webMcpAvailable(),
      registered: false,
      tools: [],
      service: null
    };
    let cleanup = () => {
    };
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
      const manifest = await res.json();
      status.service = manifest.service?.name ?? null;
      const tools = [];
      for (const cap of manifest.capabilities ?? []) {
        const handler = handlers[cap.id];
        if (handler) tools.push(toTool(cap, handler, status.service ?? "service"));
      }
      const registered = await new Promise((resolve) => {
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
  return __toCommonJS(index_exports);
})();
window.AIEndpointWebMCP=AIEndpointWebMCP;
