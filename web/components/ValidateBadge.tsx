import type { ValidationResult, TokenEfficiency } from "@/lib/api";

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

      {/* Token Efficiency */}
      {result.token_efficiency && (
        <TokenEfficiencyPanel te={result.token_efficiency} />
      )}
    </div>
  );
}

function TokenEfficiencyPanel({ te }: { te: TokenEfficiency }) {
  const scoreColor = te.score >= 12 ? "text-[#22c55e]" : te.score >= 8 ? "text-[#3b82f6]" : "text-[#f59e0b]";
  const barColor   = te.score >= 12 ? "#22c55e"        : te.score >= 8 ? "#3b82f6"        : "#f59e0b";

  const checks = [
    {
      label: "Spec size",
      value: `~${te.spec_token_estimate.toLocaleString()} tokens`,
      ok: te.spec_token_estimate <= 2000,
      hint: te.spec_token_estimate > 2000 ? "Consider trimming verbose descriptions" : undefined,
    },
    {
      label: "service.description",
      value: `${te.description_length} chars`,
      ok: te.description_length >= 20 && te.description_length <= 150,
      hint: te.description_length > 150 ? "Aim for ≤ 150 chars" : te.description_length < 20 ? "Too short — add more context" : undefined,
    },
    {
      label: "token_hints",
      value: te.has_token_hints ? "present" : "missing",
      ok: te.has_token_hints,
      hint: !te.has_token_hints ? 'Add "token_hints" with compact_mode, field_filtering' : undefined,
    },
    {
      label: "Capability descriptions",
      value: `avg ${te.avg_capability_description} chars`,
      ok: te.avg_capability_description >= 10 && te.avg_capability_description <= 100,
      hint: te.avg_capability_description > 100 ? "Aim for ≤ 100 chars avg" : undefined,
    },
    {
      label: "Returns specificity",
      value: te.capability_count > 0
        ? `${te.returns_specific_count}/${te.capability_count} specific`
        : "n/a",
      ok: te.capability_count === 0 || te.returns_specific_count / te.capability_count >= 0.5,
      hint: te.capability_count > 0 && te.returns_specific_count / te.capability_count < 0.5
        ? 'Add field names: "items[] with id, name, price"'
        : undefined,
    },
  ];

  return (
    <div className="border-t border-[#1a1a1a] pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#888] uppercase tracking-wider">Token Efficiency</p>
        <span className={`text-sm font-mono font-bold ${scoreColor}`}>{te.score}<span className="text-[#444] text-xs">/15</span></span>
      </div>
      <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full"
          style={{ width: `${(te.score / 15) * 100}%`, backgroundColor: barColor }}
        />
      </div>
      <ul className="space-y-2">
        {checks.map(({ label, value, ok, hint }) => (
          <li key={label} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 shrink-0 ${ok ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>{ok ? "✓" : "⚠"}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[#555]">{label}: </span>
              <span className={ok ? "text-[#888]" : "text-[#f59e0b]/80"}>{value}</span>
              {hint && <p className="text-[#444] mt-0.5">{hint}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
