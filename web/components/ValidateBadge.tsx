import type { ValidationResult } from "@/lib/api";

const GRADE_COLORS = {
  Excellent: { bar: "#22c55e", text: "text-[#22c55e]" },
  Good:      { bar: "#3b82f6", text: "text-[#3b82f6]" },
  Basic:     { bar: "#f59e0b", text: "text-[#f59e0b]" },
  Poor:      { bar: "#ef4444", text: "text-[#ef4444]" },
};

export function ValidateBadge({ result }: { result: ValidationResult }) {
  const grade = result.grade as keyof typeof GRADE_COLORS;
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS.Poor;

  return (
    <div className="bg-[#111] border border-[#222] rounded-lg p-6 space-y-5">
      {/* Score */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#555] uppercase tracking-wider mb-1">Score</p>
          <p className={`text-4xl font-bold font-mono ${colors.text}`}>{result.score}</p>
          <p className="text-sm text-[#888]">{result.grade} · {result.response_ms}ms</p>
        </div>
        <div className="text-right">
          <span className={`text-lg font-semibold ${result.passed ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {result.passed ? "✓ PASS" : "✗ FAIL"}
          </span>
          {result.capability_count > 0 && (
            <p className="text-sm text-[#888]">{result.capability_count} capabilities</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#222] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${result.score}%`, backgroundColor: colors.bar }}
        />
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div>
          <p className="text-xs text-[#ef4444] uppercase tracking-wider mb-2">✗ Errors ({result.errors.length})</p>
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-sm text-[#ef4444] flex gap-2">
                <code className="text-xs text-[#555] shrink-0">{e.field}</code>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div>
          <p className="text-xs text-[#f59e0b] uppercase tracking-wider mb-2">⚠ Warnings ({result.warnings.length})</p>
          <ul className="space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-sm text-[#f59e0b]/80 flex gap-2">
                <code className="text-xs text-[#555] shrink-0">{w.field}</code>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Passes */}
      {result.passes.length > 0 && (
        <div>
          <p className="text-xs text-[#22c55e] uppercase tracking-wider mb-2">✓ Passes ({result.passes.length})</p>
          <ul className="space-y-1">
            {result.passes.map((p, i) => (
              <li key={i} className="text-sm text-[#22c55e]/70 flex gap-2">
                <code className="text-xs text-[#555] shrink-0">{p.field}</code>
                <span>{p.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
