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
    attachAgentWidget: () => attachAgentWidget,
    parseParamDescription: () => parseParamDescription,
    registerAiEndpointTools: () => registerAiEndpointTools,
    registerWebMcpTools: () => registerWebMcpTools,
    webMcpAvailable: () => webMcpAvailable
  });

  // src/agent-widget.ts
  var KEY_STORAGE = "aiendpoint_agent_openai_key";
  var MODEL_STORAGE = "aiendpoint_agent_model";
  var DEFAULT_MODEL = "gpt-4o-mini";
  var WIDGET_ID = "aiendpoint-agent-widget";
  var MAX_TOOL_ROUNDS = 4;
  function getModelContext() {
    if (typeof document === "undefined") return null;
    return document.modelContext ?? null;
  }
  function parseSchema(raw) {
    if (raw && typeof raw === "object") return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
      }
    }
    return { type: "object", properties: {} };
  }
  function storage(key, value) {
    try {
      if (value !== void 0) localStorage.setItem(key, value);
      return localStorage.getItem(key) ?? "";
    } catch {
      return value ?? "";
    }
  }
  var SYSTEM_PROMPT = "You are an in-page agent embedded in this website. The page registers WebMCP tools; they are provided to you as functions. STRONGLY prefer calling these tools over answering from general knowledge - they operate the very page the user is looking at, and the UI updates when you call them. After tools run, summarize the outcome in one or two short sentences. If the user's request matches no tool, say so briefly.";
  function attachAgentWidget(options) {
    if (typeof document === "undefined" || document.getElementById(WIDGET_ID)) return;
    const root = document.createElement("div");
    root.id = WIDGET_ID;
    root.innerHTML = `
    <style>
      #${WIDGET_ID} * { box-sizing: border-box; margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
      #${WIDGET_ID} .aw-fab {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
        background: #fafafa; color: #0a0a0a; border: none; border-radius: 999px;
        padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,.4);
      }
      #${WIDGET_ID} .aw-panel {
        position: fixed; right: 20px; bottom: 72px; z-index: 2147483000;
        width: 360px; max-width: calc(100vw - 40px); height: 480px; max-height: 70vh;
        background: #111; color: #fafafa; border: 1px solid #2a2a2a; border-radius: 14px;
        display: none; flex-direction: column; overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,.5); font-size: 13px;
      }
      #${WIDGET_ID} .aw-panel.open { display: flex; }
      #${WIDGET_ID} .aw-head {
        padding: 10px 14px; border-bottom: 1px solid #2a2a2a; display: flex;
        align-items: center; justify-content: space-between; font-weight: 600;
      }
      #${WIDGET_ID} .aw-head small { color: #888; font-weight: 400; margin-left: 6px; }
      #${WIDGET_ID} .aw-close { background: none; border: none; color: #888; cursor: pointer; font-size: 16px; }
      #${WIDGET_ID} .aw-msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
      #${WIDGET_ID} .aw-m { max-width: 90%; padding: 8px 11px; border-radius: 10px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
      #${WIDGET_ID} .aw-m.user { align-self: flex-end; background: #fafafa; color: #0a0a0a; }
      #${WIDGET_ID} .aw-m.agent { align-self: flex-start; background: #1d1d1d; border: 1px solid #2a2a2a; }
      #${WIDGET_ID} .aw-m.tool { align-self: flex-start; background: rgba(74,222,128,.08); border: 1px solid rgba(74,222,128,.25); color: #4ade80; font-family: ui-monospace, monospace; font-size: 11.5px; }
      #${WIDGET_ID} .aw-m.err { align-self: flex-start; background: rgba(248,113,113,.08); border: 1px solid rgba(248,113,113,.3); color: #f87171; }
      #${WIDGET_ID} .aw-inrow { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #2a2a2a; }
      #${WIDGET_ID} .aw-inrow input {
        flex: 1; background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 8px;
        color: #fafafa; padding: 9px 11px; font-size: 13px; outline: none;
      }
      #${WIDGET_ID} .aw-inrow button {
        background: #fafafa; color: #0a0a0a; border: none; border-radius: 8px;
        padding: 0 14px; font-weight: 600; cursor: pointer;
      }
      #${WIDGET_ID} .aw-inrow button:disabled { opacity: .4; }
      #${WIDGET_ID} .aw-setup { padding: 14px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #2a2a2a; }
      #${WIDGET_ID} .aw-setup input {
        background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 8px;
        color: #fafafa; padding: 9px 11px; font-size: 12px; outline: none;
      }
      #${WIDGET_ID} .aw-setup small { color: #777; line-height: 1.4; }
    </style>
    <button class="aw-fab">\u2728 Agent</button>
    <div class="aw-panel">
      <div class="aw-head">
        <span>Page Agent<small>via WebMCP tools</small></span>
        <button class="aw-close">\u2715</button>
      </div>
      <div class="aw-msgs"></div>
      <div class="aw-setup" style="display:none">
        <input class="aw-key" type="password" placeholder="OpenAI API key (sk-...)" />
        <input class="aw-model" type="text" />
        <small>Stored in this browser's localStorage only. Sent only to api.openai.com.</small>
        <div class="aw-inrow" style="border:none;padding:0"><button class="aw-save" style="flex:1;padding:9px">Save</button></div>
      </div>
      <div class="aw-inrow">
        <input class="aw-q" type="text" placeholder="Ask the page\u2026 e.g. find a weather service" />
        <button class="aw-send">Send</button>
      </div>
    </div>
  `;
    document.body.appendChild(root);
    const $ = (sel) => root.querySelector(sel);
    const panel = $(".aw-panel");
    const msgs = $(".aw-msgs");
    const setup = $(".aw-setup");
    const inrow = $(".aw-inrow:not([style])") ?? $(".aw-inrow");
    const qInput = $(".aw-q");
    const sendBtn = $(".aw-send");
    const keyInput = $(".aw-key");
    const modelInput = $(".aw-model");
    modelInput.value = storage(MODEL_STORAGE) || options?.model || DEFAULT_MODEL;
    function refreshMode() {
      const hasKey = !!storage(KEY_STORAGE);
      setup.style.display = hasKey ? "none" : "flex";
      inrow.style.display = hasKey ? "flex" : "none";
    }
    function addMsg(cls, text) {
      const el = document.createElement("div");
      el.className = `aw-m ${cls}`;
      el.textContent = text;
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }
    $(".aw-fab").addEventListener("click", () => {
      panel.classList.toggle("open");
      refreshMode();
      if (msgs.childElementCount === 0) {
        addMsg("agent", 'Hi! I can operate this page through its WebMCP tools. Try: "find me a weather service that needs no authentication".');
      }
      qInput.focus();
    });
    $(".aw-close").addEventListener("click", () => panel.classList.remove("open"));
    $(".aw-save").addEventListener("click", () => {
      if (keyInput.value.trim()) storage(KEY_STORAGE, keyInput.value.trim());
      if (modelInput.value.trim()) storage(MODEL_STORAGE, modelInput.value.trim());
      refreshMode();
      qInput.focus();
    });
    const history = [{ role: "system", content: SYSTEM_PROMPT }];
    let busy = false;
    async function run() {
      const text = qInput.value.trim();
      if (!text || busy) return;
      qInput.value = "";
      addMsg("user", text);
      history.push({ role: "user", content: text });
      busy = true;
      sendBtn.disabled = true;
      const thinking = addMsg("agent", "\u2026");
      try {
        const mc = getModelContext();
        if (!mc || typeof mc.getTools !== "function" || typeof mc.executeTool !== "function") {
          throw new Error("WebMCP is not available in this browser (document.modelContext missing).");
        }
        const registered = await mc.getTools() ?? [];
        const toolDefs = registered.map((t) => ({
          type: "function",
          function: {
            name: String(t.name),
            description: String(t.description ?? ""),
            parameters: parseSchema(t.inputSchema)
          }
        }));
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${storage(KEY_STORAGE)}`
            },
            body: JSON.stringify({
              model: storage(MODEL_STORAGE) || DEFAULT_MODEL,
              messages: history,
              tools: toolDefs.length ? toolDefs : void 0
            })
          });
          if (!res.ok) {
            const body = await res.text();
            throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
          }
          const data = await res.json();
          const msg = data.choices[0].message;
          history.push(msg);
          if (msg.tool_calls?.length) {
            for (const call of msg.tool_calls) {
              const name = call.function.name;
              addMsg("tool", `\u{1F527} ${name}(${call.function.arguments})`);
              const toolObj = registered.find((t) => t.name === name);
              let resultText;
              try {
                if (!toolObj) throw new Error(`tool "${name}" not registered`);
                const result = await mc.executeTool(
                  toolObj,
                  call.function.arguments || "{}"
                );
                resultText = JSON.stringify(result).slice(0, 6e3);
              } catch (e) {
                resultText = `Error: ${e instanceof Error ? e.message : String(e)}`;
              }
              history.push({ role: "tool", content: resultText, tool_call_id: call.id });
            }
            continue;
          }
          thinking.textContent = msg.content ?? "(no reply)";
          return;
        }
        thinking.textContent = "Stopped after too many tool rounds.";
      } catch (e) {
        thinking.className = "aw-m err";
        thinking.textContent = e instanceof Error ? e.message : String(e);
      } finally {
        busy = false;
        sendBtn.disabled = false;
        msgs.scrollTop = msgs.scrollHeight;
      }
    }
    sendBtn.addEventListener("click", run);
    qInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") run();
    });
  }

  // src/index.ts
  function surfaces() {
    if (typeof window === "undefined") return [];
    const candidates = [
      // Chrome deprecates navigator.modelContext in favor of document.modelContext
      document.modelContext,
      navigator.modelContext,
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
  function normalizeInput(raw) {
    if (raw == null) return {};
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    }
    return typeof raw === "object" ? raw : {};
  }
  function toTool(capability, handler, serviceName) {
    return {
      name: capability.id,
      description: `${capability.description} (${serviceName}, via AIEndpoint /.well-known/ai manifest)`,
      inputSchema: toInputSchema(capability.params),
      execute: async (input) => {
        const result = await handler(normalizeInput(input));
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
    };
  }
  var activeTools = /* @__PURE__ */ new Map();
  var provideQueue = Promise.resolve();
  function provideUnion(mc) {
    provideQueue = provideQueue.then(async () => {
      await mc.provideContext({ tools: [...activeTools.values()] });
    });
    return provideQueue;
  }
  function registerWebMcpTools(tools, onDone) {
    const abort = new AbortController();
    const unregisters = [];
    let providedVia = null;
    let cleaned = false;
    for (const tool of tools) activeTools.set(tool.name, tool);
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
        }
      }
      if (providedVia) {
        void provideUnion(providedVia).catch(() => {
        });
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
