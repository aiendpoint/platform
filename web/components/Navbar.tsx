"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/why",      label: "Why" },
  { href: "/services", label: "Services" },
  { href: "/convert",  label: "Convert" },
  { href: "/validate", label: "Validate" },
  { href: "/docs",     label: "Docs" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-mono font-bold text-fg hover:text-white transition-colors">
          aiendpoint<span className="text-accent">.dev</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                path.startsWith(href)
                  ? "bg-surface text-fg"
                  : "text-muted hover:text-fg"
              }`}
            >
              {label}
            </Link>
          ))}
          <a
            href="https://github.com/aiendpoint/platform"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 p-1.5 rounded text-subtle hover:text-fg transition-colors"
            aria-label="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <Link
            href="/register"
            className="ml-2 px-3 py-1.5 rounded text-sm bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            Register →
          </Link>
        </nav>
      </div>
    </header>
  );
}
