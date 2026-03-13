"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/services", label: "Services" },
  { href: "/convert",  label: "Convert" },
  { href: "/validate", label: "Validate" },
  { href: "/docs",     label: "Docs" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-[#222] bg-background backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-mono font-bold text-[#e5e5e5] hover:text-white transition-colors">
          aiendpoint<span className="text-[#3b82f6]">.dev</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                path.startsWith(href)
                  ? "bg-[#1a1a1a] text-[#e5e5e5]"
                  : "text-[#888] hover:text-[#e5e5e5]"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/register"
            className="ml-2 px-3 py-1.5 rounded text-sm bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors"
          >
            Register →
          </Link>
        </nav>
      </div>
    </header>
  );
}
