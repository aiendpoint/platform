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
        <div className="rounded-2xl border border-[#1e1e1e] bg-[#0f0f10] p-4">
          <div className="mb-4 border-b border-[#1c1c1c] pb-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#5c5c5c]">Docs</p>
            <p className="mt-2 text-sm text-[#8f8f8f]">
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
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#5c5c5c]">
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
                            ? "bg-[#16181d] text-[#f3f4f6]"
                            : "text-[#8b8b8b] hover:bg-[#121212] hover:text-[#d6d6d6]"
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
        <div className="mb-10 border-b border-[#1f1f1f] pb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#20232b] bg-[#0e1522] px-3 py-1 text-xs text-[#89a9e6]">
            Docs
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[#f5f5f5]">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#8f8f8f]">{description}</p>
        </div>

        <article className="docs-prose">{children}</article>

        <div className="mt-14 grid gap-4 border-t border-[#1f1f1f] pt-8 sm:grid-cols-2">
          {prev ? <NeighborCard label="Previous" {...prev} /> : <div />}
          {next ? <NeighborCard label="Next" {...next} alignRight /> : <div />}
        </div>
      </div>

      <aside className="hidden w-56 shrink-0 self-start xl:sticky xl:top-24 xl:block">
        {toc.length > 0 ? (
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#0f0f10] p-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-[#5c5c5c]">On this page</p>
            <nav className="space-y-2">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-sm text-[#7e7e7e] transition-colors hover:text-[#d6d6d6]"
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
      className={`rounded-2xl border border-line bg-[#101010] p-4 transition-colors hover:border-[#2b2b2b] hover:bg-[#121212] ${
        alignRight ? "text-left sm:text-right" : "text-left"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-[#5c5c5c]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[#e8e8e8]">{title}</p>
    </Link>
  );
}
