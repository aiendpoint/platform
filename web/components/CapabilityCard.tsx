import type { Capability } from "@/lib/api";

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  POST:   "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
  PUT:    "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  PATCH:  "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  DELETE: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
};

function parseParam(raw: string) {
  const [typePart, ...rest] = raw.split(",").map((s) => s.trim());
  const required = raw.includes("required");
  const desc = rest.filter((s) => !s.match(/^(required|optional|default|max)/i)).join(", ").replace(/^—\s*/, "");
  return { type: typePart, required, desc };
}

export function CapabilityCard({ cap }: { cap: Capability }) {
  const methodCls = METHOD_COLORS[cap.method] ?? "bg-[#888]/10 text-[#888] border-[#888]/20";
  const params = Object.entries(cap.params ?? {});

  return (
    <div className="bg-[#111] border border-[#222] rounded-lg p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-xs font-mono font-bold border px-2 py-0.5 rounded ${methodCls}`}>
          {cap.method}
        </span>
        <code className="text-sm text-[#e5e5e5] font-mono">{cap.endpoint}</code>
      </div>

      <p className="text-sm text-[#888] mb-4">{cap.description}</p>

      {params.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-[#555] uppercase tracking-wider mb-2">Parameters</p>
          <div className="space-y-1">
            {params.map(([name, raw]) => {
              const { type, required, desc } = parseParam(raw);
              return (
                <div key={name} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <code className="font-mono text-[#3b82f6]">{name}</code>
                  <span className="text-[#555] text-xs">{type}</span>
                  {required
                    ? <span className="text-[#ef4444] text-xs">required</span>
                    : <span className="text-[#555] text-xs">optional</span>
                  }
                  {desc && <span className="text-[#666] text-xs">— {desc}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cap.returns && (
        <div>
          <p className="text-xs text-[#555] uppercase tracking-wider mb-1">Returns</p>
          <code className="text-xs text-[#888] font-mono">{cap.returns}</code>
        </div>
      )}
    </div>
  );
}
