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

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
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
              className={`relative cursor-pointer px-4 py-2.5 text-xs font-mono transition-colors ${
                active === tab.id ? "text-fg" : "text-subtle hover:text-muted"
              }`}
            >
              {active === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-link" />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="ml-auto cursor-pointer px-3 py-2.5 text-subtle transition-colors hover:text-fg"
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
          <span className="relative flex h-4 w-4 items-center justify-center">
            <IconClipboard
              className={`copy-icon absolute ${
                copied ? "scale-75 opacity-0" : "scale-100 opacity-100"
              }`}
            />
            <IconCheck
              className={`copy-icon absolute text-success ${
                copied ? "scale-100 opacity-100" : "scale-75 opacity-0"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Code block */}
      <pre className="m-0 overflow-x-auto bg-code p-4 text-sm text-[#c9c9c9]">
        <code>{current?.content ?? ""}</code>
      </pre>
    </div>
  );
}
