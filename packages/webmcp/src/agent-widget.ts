/**
 * In-page demo agent for WebMCP-enabled sites.
 *
 * A small floating chat panel: the user types natural language, the widget
 * reads the page's registered WebMCP tools via document.modelContext,
 * hands them to an OpenAI model as function definitions, and executes the
 * tool calls the model requests through executeTool - so the page UI reacts
 * exactly as it would for any other in-browser agent.
 *
 * The API key is entered by the user at runtime and kept in localStorage
 * only; it never appears in code or leaves the browser except to OpenAI.
 */

type AnyRecord = Record<string, unknown>;

const KEY_STORAGE = "aiendpoint_agent_openai_key";
const MODEL_STORAGE = "aiendpoint_agent_model";
const DEFAULT_MODEL = "gpt-4o";
const WIDGET_ID = "aiendpoint-agent-widget";
const MAX_TOOL_ROUNDS = 4;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

function getModelContext(): AnyRecord | null {
  if (typeof document === "undefined") return null;
  return ((document as unknown as AnyRecord).modelContext as AnyRecord) ?? null;
}

function parseSchema(raw: unknown): AnyRecord {
  if (raw && typeof raw === "object") return raw as AnyRecord;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as AnyRecord;
    } catch {
      /* fall through */
    }
  }
  return { type: "object", properties: {} };
}

function storage(key: string, value?: string): string {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key) ?? "";
  } catch {
    return value ?? "";
  }
}

const SYSTEM_PROMPT =
  "You are an in-page agent embedded in this website. The page registers WebMCP tools; " +
  "they are provided to you as functions. STRONGLY prefer calling these tools over answering " +
  "from general knowledge - they operate the very page the user is looking at, and the UI " +
  "updates when you call them. After tools run, summarize the outcome in one or two short " +
  "sentences. If the user's request matches no tool, say so briefly.";

export function attachAgentWidget(options?: { model?: string }): void {
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
    <button class="aw-fab">✨ Agent</button>
    <div class="aw-panel">
      <div class="aw-head">
        <span>Page Agent<small>via WebMCP tools</small></span>
        <span>
          <button class="aw-gear" style="background:none;border:none;color:#888;cursor:pointer;font-size:14px">⚙</button>
          <button class="aw-close">✕</button>
        </span>
      </div>
      <div class="aw-msgs"></div>
      <div class="aw-setup" style="display:none">
        <input class="aw-key" type="password" placeholder="OpenAI API key (sk-...)" />
        <input class="aw-model" type="text" />
        <small>Stored in this browser's localStorage only. Sent only to api.openai.com.</small>
        <div class="aw-inrow" style="border:none;padding:0"><button class="aw-save" style="flex:1;padding:9px">Save</button></div>
      </div>
      <div class="aw-inrow">
        <input class="aw-q" type="text" placeholder="Ask the page… e.g. find a weather service" />
        <button class="aw-send">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const panel = $(".aw-panel");
  const msgs = $(".aw-msgs");
  const setup = $<HTMLDivElement>(".aw-setup");
  const inrow = $(".aw-inrow:not([style])") ?? $(".aw-inrow");
  const qInput = $<HTMLInputElement>(".aw-q");
  const sendBtn = $<HTMLButtonElement>(".aw-send");
  const keyInput = $<HTMLInputElement>(".aw-key");
  const modelInput = $<HTMLInputElement>(".aw-model");

  modelInput.value = storage(MODEL_STORAGE) || options?.model || DEFAULT_MODEL;

  function refreshMode() {
    const hasKey = !!storage(KEY_STORAGE);
    setup.style.display = hasKey ? "none" : "flex";
    (inrow as HTMLElement).style.display = hasKey ? "flex" : "none";
  }

  function addMsg(cls: string, text: string): HTMLDivElement {
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
      addMsg("agent", "Hi! I can operate this page through its WebMCP tools. Try: \"find me a weather service that needs no authentication\".");
    }
    qInput.focus();
  });
  $(".aw-close").addEventListener("click", () => panel.classList.remove("open"));
  $(".aw-gear").addEventListener("click", () => {
    keyInput.value = storage(KEY_STORAGE);
    modelInput.value = storage(MODEL_STORAGE) || DEFAULT_MODEL;
    setup.style.display = "flex";
  });
  $(".aw-save").addEventListener("click", () => {
    if (keyInput.value.trim()) storage(KEY_STORAGE, keyInput.value.trim());
    if (modelInput.value.trim()) storage(MODEL_STORAGE, modelInput.value.trim());
    refreshMode();
    qInput.focus();
  });

  const history: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  let busy = false;

  async function run() {
    const text = qInput.value.trim();
    if (!text || busy) return;
    qInput.value = "";
    addMsg("user", text);
    history.push({ role: "user", content: text });
    busy = true;
    sendBtn.disabled = true;
    const thinking = addMsg("agent", "…");

    try {
      const mc = getModelContext();
      if (!mc || typeof mc.getTools !== "function" || typeof mc.executeTool !== "function") {
        throw new Error("WebMCP is not available in this browser (document.modelContext missing).");
      }
      const registered = (await (mc.getTools as () => Promise<AnyRecord[]>)()) ?? [];
      const toolDefs = registered.map((t) => ({
        type: "function" as const,
        function: {
          name: String(t.name),
          description: String(t.description ?? ""),
          parameters: parseSchema(t.inputSchema),
        },
      }));
      const toolNames = toolDefs.map((t) => t.function.name);
      addMsg("tool", `📋 ${toolNames.length} page tool(s): ${toolNames.join(", ") || "(none)"}`);
      history[0].content =
        SYSTEM_PROMPT +
        (toolNames.length
          ? ` The tools available on this page RIGHT NOW are: ${toolNames.join(", ")}. Use them.`
          : "");

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${storage(KEY_STORAGE)}`,
          },
          body: JSON.stringify({
            model: storage(MODEL_STORAGE) || DEFAULT_MODEL,
            messages: history,
            tools: toolDefs.length ? toolDefs : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
        }
        const data = (await res.json()) as {
          choices: Array<{ message: ChatMessage }>;
        };
        const msg = data.choices[0].message;
        history.push(msg);

        if (msg.tool_calls?.length) {
          for (const call of msg.tool_calls) {
            const name = call.function.name;
            addMsg("tool", `🔧 ${name}(${call.function.arguments})`);
            const toolObj = registered.find((t) => t.name === name);
            let resultText: string;
            try {
              if (!toolObj) throw new Error(`tool "${name}" not registered`);
              const result = await (mc.executeTool as (t: unknown, input: string) => Promise<unknown>)(
                toolObj,
                call.function.arguments || "{}"
              );
              resultText = JSON.stringify(result).slice(0, 6000);
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
