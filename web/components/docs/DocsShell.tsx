import Link from "next/link";

type NavGroup = {
  title: string;
  items: Array<{ title: string; href: string }>;
};

type NeighborLink = {
  title: string;
  href: string;
} | null;

export function DocsShell({
  title,
  description,
  navigation,
  currentPath,
  toc,
  prev,
  next,
  children,
}: {
  title: string;
  description: string;
  navigation: NavGroup[];
  currentPath: string;
  toc: Array<{ id: string; title: string }>;
  prev: NeighborLink;
  next: NeighborLink;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] gap-12 px-6 py-10 lg:px-8">
      <aside className="hidden w-64 shrink-0 self-start lg:sticky lg:top-24 lg:block">
        <div className="rounded-2xl border border-line-faint bg-docs-panel p-4">
          <div className="mb-4 border-b border-line-faint pb-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-label">Docs</p>
            <p className="mt-2 text-sm text-ghost">
              {/* AIEndpoint
              <br /> */}
              spec, validator
              <br />
              and integration guides.
            </p>
          </div>
          <nav className="space-y-5">
            {navigation.map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-label">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = item.href === currentPath;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-docs-active text-fg"
                            : "text-ghost hover:bg-inset hover:text-dim"
                        }`}
                      >
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-10 border-b border-line-faint pb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-docs-badge-border bg-docs-badge-bg px-3 py-1 text-xs text-docs-badge-text">
            Docs
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-fg">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ghost">{description}</p>
        </div>

        <article className="docs-prose">{children}</article>

        <div className="mt-14 grid gap-4 border-t border-line-faint pt-8 sm:grid-cols-2">
          {prev ? <NeighborCard label="Previous" {...prev} /> : <div />}
          {next ? <NeighborCard label="Next" {...next} alignRight /> : <div />}
        </div>
      </div>

      <aside className="hidden w-56 shrink-0 self-start xl:sticky xl:top-24 xl:block">
        {toc.length > 0 ? (
          <div className="rounded-2xl border border-line-faint bg-docs-panel p-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-label">On this page</p>
            <nav className="space-y-2">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-sm text-subtle transition-colors hover:text-dim"
                >
                  {item.title}
                </a>
              ))}
            </nav>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function NeighborCard({
  label,
  title,
  href,
  alignRight = false,
}: {
  label: string;
  title: string;
  href: string;
  alignRight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border border-line bg-docs-panel p-4 transition-colors hover:border-line-dim hover:bg-inset ${
        alignRight ? "text-left sm:text-right" : "text-left"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-label">{label}</p>
      <p className="mt-2 text-sm font-medium text-fg">{title}</p>
    </Link>
  );
}
