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
    <div className="my-4 overflow-hidden rounded-2xl border border-[#222]">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[#222] bg-[#0a0a0a]">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`relative px-4 py-2.5 text-xs font-mono transition-colors ${
                active === tab.id
                  ? "text-[#e5e5e5]"
                  : "text-[#555] hover:text-[#999]"
              }`}
            >
              {active === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-[#77a8ff]" />
              )}
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="ml-auto px-4 py-2.5 text-xs text-[#555] transition-colors hover:text-[#e5e5e5]"
          aria-label="Copy to clipboard"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      {/* Code block */}
      <pre className="m-0 overflow-x-auto bg-[#0d0d0d] p-4 text-sm text-[#c9c9c9]">
        <code>{current?.content ?? ""}</code>
      </pre>
    </div>
  );
}
