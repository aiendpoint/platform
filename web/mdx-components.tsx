import Link from "next/link";

function Pre(props: React.ComponentProps<"pre">) {
  return (
    <pre
      {...props}
      className="overflow-x-auto rounded-2xl border border-[#222] bg-[#0d0d0d] p-4 text-sm text-[#c9c9c9]"
    />
  );
}

function Code(props: React.ComponentProps<"code">) {
  return (
    <code
      {...props}
      className="rounded bg-[#131313] px-1.5 py-0.5 font-mono text-[0.92em] text-[#d7d7d7]"
    />
  );
}

function Table(props: React.ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table {...props} className="w-full border-collapse text-left text-sm text-[#b5b5b5]" />
    </div>
  );
}

function A(props: React.ComponentProps<"a">) {
  const href = props.href ?? "";

  if (href.startsWith("/")) {
    return (
      <Link
        href={href}
        className="text-[#77a8ff] underline decoration-[#2d4d8d] underline-offset-4"
        {...props}
      />
    );
  }

  return (
    <a
      {...props}
      className="text-[#77a8ff] underline decoration-[#2d4d8d] underline-offset-4"
      target="_blank"
      rel="noreferrer"
    />
  );
}

type MdxComponentsMap = Record<string, React.ComponentType<any>>;

export function useMDXComponents(components: MdxComponentsMap): MdxComponentsMap {
  return {
    pre: Pre,
    code: Code,
    table: Table,
    a: A,
    ...components,
  };
}
