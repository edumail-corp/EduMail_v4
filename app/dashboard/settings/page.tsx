import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  dashboardPanelClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import {
  workspaceRoleLabels,
  type WorkspaceProviderStatus,
} from "@/lib/workspace-config";
import { getWorkspaceSettingsSnapshot } from "@/lib/server/services/workspace-settings-service";

const integrationStatusClasses: Record<WorkspaceProviderStatus, string> = {
  local: "border-transparent bg-[#E9FBF1] text-[#0C8A53]",
  manual_required: "border-transparent bg-[#FFF4DF] text-[#B97411]",
  planned: "border-transparent bg-[#EEF0FF] text-[#555CF0]",
};

const integrationStatusLabels: Record<WorkspaceProviderStatus, string> = {
  local: "Local Adapter",
  manual_required: "Manual Work Needed",
  planned: "Planned",
};

const staffStatusClasses = {
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
} as const;

const staffStatusLabels = {
  active: "Active",
  pending: "Pending",
} as const;

export default async function SettingsPage() {
  const snapshot = await getWorkspaceSettingsSnapshot();

  return (
    <>
      <DashboardTopBar label="Workspace Readiness" />

      <DashboardPageHeader
        eyebrow="Readiness and Setup"
        title="Workspace Settings"
        description="Track which parts of the product are still local adapters, what manual work is needed before real integrations, and which core entities we expect to persist later."
        meta={`${snapshot.integrations.length} integration tracks`}
      />

      <section className="mb-4 grid gap-4 md:grid-cols-3">
        <div className={`${dashboardPanelClassName} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Local Adapters
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-[#1E2340]">
            {snapshot.integrationCounts.local}
          </p>
        </div>
        <div className={`${dashboardPanelClassName} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Manual Decisions
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-[#1E2340]">
            {snapshot.integrationCounts.manualRequired}
          </p>
        </div>
        <div className={`${dashboardPanelClassName} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Planned Tracks
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-[#1E2340]">
            {snapshot.integrationCounts.planned}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Integrations
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
                Provider Readiness
              </h3>
            </div>

            <div className="mt-5 space-y-3">
              {snapshot.integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {integration.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {integration.summary}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${integrationStatusClasses[integration.status]}`}
                    >
                      {integrationStatusLabels[integration.status]}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    Next step: {integration.nextStep}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Future Domain
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
                Planned Persistent Model
              </h3>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {snapshot.futureDomainModel.map((entity) => (
                <div
                  key={entity.id}
                  className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {entity.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {entity.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Current MVP Scope
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
                Department and Workflow Shape
              </h3>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {snapshot.operatingDepartments.map((department) => (
                <span
                  key={department}
                  className="rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-sm font-semibold text-[#4F57E8]"
                >
                  {department}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {snapshot.workflowStages.map((stage) => (
                <div
                  key={stage.id}
                  className="rounded-[22px] border border-white/75 bg-white/62 px-4 py-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {stage.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {stage.description}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Staff Roles
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
                Current Demo Directory
              </h3>
            </div>

            <div className="mt-5 space-y-3">
              {snapshot.staffDirectory.map((user) => (
                <div
                  key={user.id}
                  className="rounded-[22px] border border-white/75 bg-white/62 px-4 py-3 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {user.name}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${staffStatusClasses[user.status]}`}
                      >
                        {staffStatusLabels[user.status]}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {workspaceRoleLabels[user.role]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Manual Work
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
                What Still Needs Your Setup
              </h3>
            </div>

            <div className="mt-5 space-y-3">
              {snapshot.manualWorkItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-[#FFE7B3] bg-[#FFF8E5] px-4 py-3 shadow-[0_14px_32px_rgba(141,153,179,0.1)]"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
