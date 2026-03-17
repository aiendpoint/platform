import type { Capability } from "@/lib/api";

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-success/10 text-success border-success/20",
  POST:   "bg-accent/10 text-accent border-accent/20",
  PUT:    "bg-warning/10 text-warning border-warning/20",
  PATCH:  "bg-warning/10 text-warning border-warning/20",
  DELETE: "bg-error/10 text-error border-error/20",
};

function parseParam(raw: string) {
  const [typePart, ...rest] = raw.split(",").map((s) => s.trim());
  const required = raw.includes("required");
  const desc = rest.filter((s) => !s.match(/^(required|optional|default|max)/i)).join(", ").replace(/^—\s*/, "");
  return { type: typePart, required, desc };
}

export function CapabilityCard({ cap }: { cap: Capability }) {
  const methodCls = METHOD_COLORS[cap.method] ?? "bg-muted/10 text-muted border-muted/20";
  const params = Object.entries(cap.params ?? {});

  return (
    <div className="bg-canvas border border-line rounded-lg p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-xs font-mono font-bold border px-2 py-0.5 rounded ${methodCls}`}>
          {cap.method}
        </span>
        <code className="text-sm text-fg font-mono">{cap.endpoint}</code>
      </div>

      <p className="text-sm text-muted mb-4">{cap.description}</p>

      {params.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-subtle uppercase tracking-wider mb-2">Parameters</p>
          <div className="space-y-1">
            {params.map(([name, raw]) => {
              const { type, required, desc } = parseParam(raw);
              return (
                <div key={name} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <code className="font-mono text-accent">{name}</code>
                  <span className="text-subtle text-xs">{type}</span>
                  {required
                    ? <span className="text-error text-xs">required</span>
                    : <span className="text-subtle text-xs">optional</span>
                  }
                  {desc && <span className="text-ghost text-xs">— {desc}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cap.returns && (
        <div>
          <p className="text-xs text-subtle uppercase tracking-wider mb-1">Returns</p>
          <code className="text-xs text-muted font-mono">{cap.returns}</code>
        </div>
      )}
    </div>
  );
}
