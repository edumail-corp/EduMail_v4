"use client";

import Link from "next/link";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";

export default function Home() {
  const { preferences } = useUserPreferences();
  const isPolish = preferences.language === "Polish";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(120,129,255,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(179,221,255,0.26),_transparent_30%),linear-gradient(180deg,#f3f5fc_0%,#f6f8fd_42%,#f7f8fd_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.72fr)]">
          <section className="rounded-[36px] border border-white/75 bg-white/82 p-8 shadow-[0_24px_80px_rgba(137,152,181,0.18)] backdrop-blur-xl md:p-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#4F57E8] shadow-[0_12px_30px_rgba(142,155,182,0.12)]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#EEF0FF] text-[#5C61FF]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </span>
              {isPolish ? "Operacje uczelni" : "University Operations"}
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              {isPolish
                ? "Pomagaj zespołom obsługi studentów odpowiadać szybciej, pewniej i bardziej spójnie."
                : "Help student services teams answer faster, more confidently, and more consistently."}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              {isPolish
                ? "EduMailAI daje zespołom uczelni jedno miejsce do przeglądania wiadomości studentów, sprawdzania odpowiedzi wspieranych przez AI i utrzymywania polityk uczelni zawsze pod ręką."
                : "EduMailAI gives university teams one place to review student email, check AI-assisted replies, and keep institutional guidance close at hand."}
            </p>

            <div className="mt-8">
              <Link
                href="/sign-in"
                className="inline-flex items-center rounded-full bg-[#5C61FF] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(92,97,255,0.26)] transition hover:bg-[#4E54F6]"
              >
                {isPolish ? "Zaloguj zespół" : "Sign In to Staff Workspace"}
              </Link>
            </div>
          </section>

          <aside className="rounded-[36px] border border-white/75 bg-white/82 p-6 text-slate-900 shadow-[0_24px_80px_rgba(137,152,181,0.18)] backdrop-blur-xl md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {isPolish ? "Aktualny prototyp" : "Current Prototype"}
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#1E2340]">
              {isPolish ? "Co produkt już obejmuje" : "What the product already covers"}
            </h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-white/75 bg-white/66 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.1)]">
                <p className="text-sm font-semibold text-[#1E2340]">
                  {isPolish
                    ? "Triage skrzynki i własność spraw"
                    : "Inbox triage and case ownership"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isPolish
                    ? "Przeglądaj przychodzące wiadomości, przypisuj właścicieli i szybko przechodź od zapytania studenta do gotowej odpowiedzi."
                    : "Review incoming messages, assign ownership, and move quickly from student inquiry to ready-to-review response."}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/75 bg-white/66 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.1)]">
                <p className="text-sm font-semibold text-[#1E2340]">
                  {isPolish
                    ? "Odpowiedzi oparte na źródłach"
                    : "Grounded reply review"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isPolish
                    ? "Sprawdzaj sugerowane odpowiedzi, źródła cytowań i notatki zespołu przed podjęciem ostatecznej decyzji przez człowieka."
                    : "Review suggested replies, source citations, and team notes before a human makes the final call."}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/75 bg-white/66 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.1)]">
                <p className="text-sm font-semibold text-[#1E2340]">
                  {isPolish
                    ? "Polityki, role i widoczność operacyjna"
                    : "Policies, roles, and operational visibility"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isPolish
                    ? "Utrzymuj bibliotekę dokumentów, kontroluj dostęp zespołu i obserwuj najważniejsze działania w jednym miejscu."
                    : "Keep a document library, manage staff access, and review the most important workspace activity in one place."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
