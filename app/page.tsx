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
                ? "Obsługuj zgłoszenia szybciej, odpowiadaj pewnie i trzymaj polityki zawsze pod ręką."
                : "Triage faster, answer with confidence, and keep policy context close."}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              {isPolish
                ? "EduMailAI to przestrzeń pracy dla zespołu uczelni do przeglądania przychodzących emaili studentów, sprawdzania szkiców generowanych przez AI i zarządzania dokumentami wiedzy, od których zależą odpowiedzi."
                : "EduMailAI is a staff-facing workspace for reviewing inbound student emails, checking AI-generated drafts, and managing the knowledge documents those replies depend on."}
            </p>

            <div className="mt-8">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full bg-[#5C61FF] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(92,97,255,0.26)] transition hover:bg-[#4E54F6]"
              >
                {isPolish ? "Otwórz panel zespołu" : "Open Staff Dashboard"}
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
                    ? "Przegląd skrzynki, routing i ręczne przyjęcie"
                    : "Inbox Review, Routing, and Manual Intake"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isPolish
                    ? "Przeglądaj przychodzące wiadomości, twórz nowe lokalne sprawy, przypisuj właścicieli i porównuj wstępne szkice odpowiedzi przed zatwierdzeniem."
                    : "Browse incoming messages, create new local cases, assign ownership, and compare seeded draft responses before anything is approved."}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/75 bg-white/66 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.1)]">
                <p className="text-sm font-semibold text-[#1E2340]">
                  {isPolish
                    ? "Szkice, eskalacje i notatki"
                    : "Draft, Escalation, and Notes Workflow"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isPolish
                    ? "Oddzielaj sprawy wymagające zwykłego przeglądu od tych, które potrzebują głębszej interwencji człowieka, zachowując notatki zespołu przy każdej sprawie."
                    : "Separate what needs review from what needs deeper human intervention, while keeping internal staff notes attached to each case."}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/75 bg-white/66 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.1)]">
                <p className="text-sm font-semibold text-[#1E2340]">
                  {isPolish
                    ? "Baza wiedzy, aktywność i ustawienia"
                    : "Knowledge Base, Activity, and Settings"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isPolish
                    ? "Przesyłaj lokalne pliki PDF i DOCX, przeglądaj zapisany dziennik aktywności i śledź, które integracje nadal wymagają prawdziwej konfiguracji."
                    : "Upload local PDF and DOCX files, review a persisted activity log, and track which integrations still need real setup."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
