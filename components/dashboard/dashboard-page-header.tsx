import type { ReactNode } from "react";

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description: string;
  meta?: string;
  actions?: ReactNode;
}>) {
  return (
    <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#1E2340] md:text-[3.2rem]">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-500">
          {description}
        </p>
      </div>

      {meta || actions ? (
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          {meta ? (
            <span className="rounded-full border border-white/80 bg-white/82 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[0_14px_36px_rgba(140,153,179,0.16)]">
              {meta}
            </span>
          ) : null}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
