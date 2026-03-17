"use client";

import { useState } from "react";

export interface PmTab {
  id: string;
  label: string;
  content: string;
}

interface PackageManagerTabsProps {
  tabs: PmTab[];
}

export function PackageManagerTabs({ tabs }: PackageManagerTabsProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  const current = tabs.find((t) => t.id === active);

  async function handleCopy() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-line">
      {/* Tab bar */}
      <div className="flex items-center border-b border-line bg-code">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`relative px-4 py-2.5 text-xs font-mono transition-colors ${
                active === tab.id
                  ? "text-fg"
                  : "text-subtle hover:text-muted"
              }`}
            >
              {active === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-link" />
              )}
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="ml-auto px-4 py-2.5 text-xs text-subtle transition-colors hover:text-fg"
          aria-label="Copy to clipboard"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      {/* Code block */}
      <pre className="m-0 overflow-x-auto bg-code p-4 text-sm text-[#c9c9c9]">
        <code>{current?.content ?? ""}</code>
      </pre>
    </div>
  );
}
