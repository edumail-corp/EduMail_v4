"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import {
  departmentFilterOptions,
  filterEmailsByDepartment,
  defaultStaffAssignmentFilter,
  defaultStaffAssignmentSelection,
  filterEmails,
  filterEmailsByAssignment,
  getDepartmentFilterLabel,
  getStaffAssignmentFilterLabel,
  getInitialSelectedEmailId,
  getSelectedEmail,
  isDepartmentFilter,
  isStaffAssignmentFilter,
  staffAssignmentFilters,
  type DepartmentFilter,
  type EmailFilter,
  type StaffAssignmentFilter,
  type StaffAssignmentSelectValue,
  type StaffEmail,
} from "@/lib/email-data";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { EmailDetailPanel } from "@/components/dashboard/email-detail-panel";
import { EmailList } from "@/components/dashboard/email-list";

type MailboxEmailsResponse = {
  emails: StaffEmail[];
};

type MailboxEmailResponse = {
  email: StaffEmail;
};

type MailboxErrorResponse = {
  error?: string;
};

function getMailboxErrorMessage(data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    const error = data.error;

    if (typeof error === "string" && error.length > 0) {
      return error;
    }
  }

  return null;
}

function matchesMailboxSearch(email: StaffEmail, query: string) {
  if (query.length === 0) {
    return true;
  }

  const searchableText = [
    email.sender,
    email.subject,
    email.body,
    email.category,
    email.department ?? "",
    email.source ?? "",
    email.aiDraft ?? "",
    email.assignee ?? "",
    email.staffNote ?? "",
    email.routingDecision?.reason ?? "",
    email.routingDecision?.signals.join(" ") ?? "",
    email.routingDecision?.suggestedAssignees.join(" ") ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

export function MailboxView({
  eyebrow,
  title,
  description,
  metaSuffix,
  listTitle,
  listDescription,
  emptyMessage,
  filter,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  metaSuffix: string;
  listTitle: string;
  listDescription: string;
  emptyMessage: string;
  filter: EmailFilter;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [emails, setEmails] = useState<StaffEmail[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [assigneeValue, setAssigneeValue] = useState<StaffAssignmentSelectValue>(
    defaultStaffAssignmentSelection
  );
  const [isSavingAssignee, setIsSavingAssignee] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const visibleEmails = emails.filter((email) =>
    matchesMailboxSearch(email, normalizedSearchQuery)
  );
  const requestedEmailId = searchParams.get("emailId") ?? "";
  const requestedAssigneeParam = searchParams.get("assignee");
  const requestedDepartmentParam = searchParams.get("department");
  const assignmentFilter: StaffAssignmentFilter =
    requestedAssigneeParam && isStaffAssignmentFilter(requestedAssigneeParam)
      ? requestedAssigneeParam
      : defaultStaffAssignmentFilter;
  const departmentFilter: DepartmentFilter =
    requestedDepartmentParam && isDepartmentFilter(requestedDepartmentParam)
      ? requestedDepartmentParam
      : "All";
  const selectedEmail = getSelectedEmail(visibleEmails, selectedId);
  const assignmentLabel = getStaffAssignmentFilterLabel(assignmentFilter);
  const departmentLabel = getDepartmentFilterLabel(departmentFilter);
  const meta = isLoading
    ? "Loading messages..."
    : assignmentFilter === defaultStaffAssignmentFilter && departmentFilter === "All"
      ? `${emails.length} ${metaSuffix}`
      : `${emails.length} ${metaSuffix} for ${assignmentLabel} in ${departmentLabel}`;

  function applyMailboxFilters(nextEmails: StaffEmail[]) {
    return filterEmailsByDepartment(
      filterEmailsByAssignment(filterEmails(nextEmails, filter), assignmentFilter),
      departmentFilter
    );
  }

  function buildOwnershipFilterHref(nextFilter: StaffAssignmentFilter) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextFilter === defaultStaffAssignmentFilter) {
      nextSearchParams.delete("assignee");
    } else {
      nextSearchParams.set("assignee", nextFilter);
    }

    nextSearchParams.delete("emailId");

    const queryString = nextSearchParams.toString();

    return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
  }

  function buildDepartmentFilterHref(nextFilter: DepartmentFilter) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextFilter === "All") {
      nextSearchParams.delete("department");
    } else {
      nextSearchParams.set("department", nextFilter);
    }

    nextSearchParams.delete("emailId");

    const queryString = nextSearchParams.toString();

    return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
  }

  useEffect(() => {
    async function loadEmails() {
      setIsLoading(true);
      setLoadError(null);
      setActionError(null);
      setActionMessage(null);
      setSearchQuery("");

        try {
          const response = await fetch(
          `/api/emails?filter=${encodeURIComponent(filter)}&assignee=${encodeURIComponent(assignmentFilter)}&department=${encodeURIComponent(departmentFilter)}`,
           {
             cache: "no-store",
           }
         );
        const data = (await response.json()) as
          | MailboxEmailsResponse
          | MailboxErrorResponse;

        if (!response.ok || !("emails" in data)) {
          throw new Error(
            getMailboxErrorMessage(data) ?? "Unable to load the mailbox."
          );
        }

        setEmails(data.emails);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Unable to load the mailbox."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadEmails();
  }, [assignmentFilter, departmentFilter, filter]);

  useEffect(() => {
    setSelectedId((currentId) => {
      if (visibleEmails.length === 0) {
        return "";
      }

      if (requestedEmailId.length > 0) {
        const requestedEmail = visibleEmails.find(
          (email) => email.id === requestedEmailId
        );

        if (requestedEmail) {
          return requestedEmail.id;
        }
      }

      return visibleEmails.some((email) => email.id === currentId)
        ? currentId
        : getInitialSelectedEmailId(visibleEmails);
    });
  }, [requestedEmailId, visibleEmails]);

  useEffect(() => {
    setIsEditingDraft(false);
    setIsEditingNote(false);
  }, [selectedEmail?.id]);

  useEffect(() => {
    if (!isEditingDraft) {
      setDraftValue(selectedEmail?.aiDraft ?? "");
    }
  }, [isEditingDraft, selectedEmail?.aiDraft]);

  useEffect(() => {
    setAssigneeValue(
      selectedEmail?.assignee ?? defaultStaffAssignmentSelection
    );
  }, [selectedEmail?.assignee]);

  useEffect(() => {
    if (!isEditingNote) {
      setNoteValue(selectedEmail?.staffNote ?? "");
    }
  }, [isEditingNote, selectedEmail?.staffNote]);

  async function handleApprove() {
    if (!selectedEmail || !selectedEmail.aiDraft || selectedEmail.status === "Auto-sent") {
      return;
    }

    setApprovingId(selectedEmail.id);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/emails/${selectedEmail.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "Auto-sent",
        }),
      });

      const data = (await response.json()) as
        | MailboxEmailResponse
        | MailboxErrorResponse;

      if (!response.ok || !("email" in data)) {
        throw new Error(
          getMailboxErrorMessage(data) ?? "Unable to update the message."
        );
      }

      setEmails((currentEmails) => {
        const nextEmails = currentEmails.map((email) =>
          email.id === data.email.id ? data.email : email
        );

        return applyMailboxFilters(nextEmails);
      });
      setActionMessage(`"${data.email.subject}" moved to Auto-sent.`);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update the message."
      );
    } finally {
      setApprovingId(null);
    }
  }

  async function handleSaveAssignee() {
    if (!selectedEmail) {
      return;
    }

    const nextAssignee =
      assigneeValue === defaultStaffAssignmentSelection ? null : assigneeValue;

    if (nextAssignee === selectedEmail.assignee) {
      return;
    }

    setIsSavingAssignee(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/emails/${selectedEmail.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignee: nextAssignee,
        }),
      });

      const data = (await response.json()) as
        | MailboxEmailResponse
        | MailboxErrorResponse;

      if (!response.ok || !("email" in data)) {
        throw new Error(
          getMailboxErrorMessage(data) ?? "Unable to update the message owner."
        );
      }

      setEmails((currentEmails) =>
        applyMailboxFilters(
          currentEmails.map((email) =>
            email.id === data.email.id ? data.email : email
          )
        )
      );
      setActionMessage(
        data.email.assignee
          ? `"${data.email.subject}" is now assigned to ${data.email.assignee}.`
          : `Ownership cleared for "${data.email.subject}".`
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update the message owner."
      );
    } finally {
      setIsSavingAssignee(false);
    }
  }

  function handleStartEditing() {
    if (!selectedEmail || selectedEmail.status === "Auto-sent") {
      return;
    }

    setIsEditingNote(false);
    setDraftValue(selectedEmail.aiDraft ?? "");
    setActionError(null);
    setActionMessage(null);
    setIsEditingDraft(true);
  }

  function handleCancelEditing() {
    setDraftValue(selectedEmail?.aiDraft ?? "");
    setIsEditingDraft(false);
  }

  async function handleSaveDraft() {
    if (!selectedEmail || selectedEmail.status === "Auto-sent") {
      return;
    }

    const nextDraft = draftValue.trim();

    if (nextDraft.length === 0) {
      setActionError("Write a response before saving the draft.");
      return;
    }

    setIsSavingDraft(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/emails/${selectedEmail.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aiDraft: nextDraft,
          status: selectedEmail.status === "Escalated" ? "Draft" : selectedEmail.status,
        }),
      });

      const data = (await response.json()) as
        | MailboxEmailResponse
        | MailboxErrorResponse;

      if (!response.ok || !("email" in data)) {
        throw new Error(
          getMailboxErrorMessage(data) ?? "Unable to save the draft."
        );
      }

      setEmails((currentEmails) => {
        const nextEmails = currentEmails.map((email) =>
          email.id === data.email.id ? data.email : email
        );

        return applyMailboxFilters(nextEmails);
      });
      setIsEditingDraft(false);
      setActionMessage(
        selectedEmail.status === "Escalated"
          ? `"${data.email.subject}" now has a saved draft and moved to Draft.`
          : `Draft for "${data.email.subject}" was saved.`
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to save the draft."
      );
    } finally {
      setIsSavingDraft(false);
    }
  }

  function handleStartEditingNote() {
    if (!selectedEmail) {
      return;
    }

    setIsEditingDraft(false);
    setNoteValue(selectedEmail.staffNote ?? "");
    setActionError(null);
    setActionMessage(null);
    setIsEditingNote(true);
  }

  function handleCancelEditingNote() {
    setNoteValue(selectedEmail?.staffNote ?? "");
    setIsEditingNote(false);
  }

  async function handleSaveNote() {
    if (!selectedEmail) {
      return;
    }

    if (noteValue.trim() === (selectedEmail.staffNote ?? "")) {
      setIsEditingNote(false);
      return;
    }

    setIsSavingNote(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/emails/${selectedEmail.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffNote: noteValue,
        }),
      });

      const data = (await response.json()) as
        | MailboxEmailResponse
        | MailboxErrorResponse;

      if (!response.ok || !("email" in data)) {
        throw new Error(
          getMailboxErrorMessage(data) ?? "Unable to save the internal note."
        );
      }

      setEmails((currentEmails) =>
        currentEmails.map((email) =>
          email.id === data.email.id ? data.email : email
        )
      );
      setIsEditingNote(false);
      setActionMessage(
        data.email.staffNote
          ? `Internal note saved for "${data.email.subject}".`
          : `Internal note cleared for "${data.email.subject}".`
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to save the internal note."
      );
    } finally {
      setIsSavingNote(false);
    }
  }

  return (
    <>
      <DashboardTopBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search inquiries, owners, source docs, or draft text..."
      />

      <DashboardPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        meta={meta}
      />

      {loadError ? (
        <div className="mb-4 rounded-[24px] border border-[#FFD2DA] bg-[#FFF1F4] px-4 py-3 text-sm text-[#B4375C] shadow-[0_14px_36px_rgba(141,153,179,0.12)]">
          {loadError}
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 rounded-[24px] border border-[#FFD2DA] bg-[#FFF1F4] px-4 py-3 text-sm text-[#B4375C] shadow-[0_14px_36px_rgba(141,153,179,0.12)]">
          {actionError}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="mb-4 rounded-[24px] border border-[#C7F0D6] bg-[#F0FBF4] px-4 py-3 text-sm text-[#19754C] shadow-[0_14px_36px_rgba(141,153,179,0.12)]">
          {actionMessage}
        </div>
      ) : null}

      <section className={`${dashboardPanelClassName} mb-4 px-5 py-5 md:px-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Queue Filters
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review the right slice of the queue by combining owner filters with the shared mailbox search.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSearchQuery("")}
            disabled={searchQuery.length === 0}
            className={
              searchQuery.length > 0
                ? dashboardGhostButtonClassName
                : "inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400"
            }
          >
            Clear Search
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {staffAssignmentFilters.map((ownerFilter) => {
            const isActive = ownerFilter === assignmentFilter;

            return (
              <Link
                key={ownerFilter}
                href={buildOwnershipFilterHref(ownerFilter)}
                scroll={false}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#5C61FF] text-white shadow-[0_16px_34px_rgba(92,97,255,0.24)]"
                    : "border border-white/80 bg-white/70 text-slate-500 hover:bg-white hover:text-[#4F57E8]"
                }`}
              >
                {getStaffAssignmentFilterLabel(ownerFilter)}
              </Link>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {departmentFilterOptions.map((nextDepartmentFilter) => {
            const isActive = nextDepartmentFilter === departmentFilter;

            return (
              <Link
                key={nextDepartmentFilter}
                href={buildDepartmentFilterHref(nextDepartmentFilter)}
                scroll={false}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#EEF0FF] text-[#4F57E8] shadow-[0_14px_32px_rgba(111,118,255,0.16)]"
                    : "border border-white/80 bg-white/70 text-slate-500 hover:bg-white hover:text-[#4F57E8]"
                }`}
              >
                {getDepartmentFilterLabel(nextDepartmentFilter)}
              </Link>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/75 bg-white/62 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Owner View
            </p>
            <p className="mt-2 text-lg font-semibold text-[#1E2340]">
              {assignmentLabel}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/75 bg-white/62 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Department Focus
            </p>
            <p className="mt-2 text-lg font-semibold text-[#1E2340]">
              {departmentLabel}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/75 bg-white/62 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Visible Cases
            </p>
            <p className="mt-2 text-lg font-semibold text-[#1E2340]">
              {visibleEmails.length}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          {assignmentFilter === defaultStaffAssignmentFilter && departmentFilter === "All"
            ? "Showing every owner across every department in the current queue."
            : assignmentFilter === "Unassigned" && departmentFilter === "All"
              ? "Showing only messages that still need an owner, regardless of department."
              : assignmentFilter === defaultStaffAssignmentFilter
                ? `Showing every owner inside the ${departmentLabel} workflow.`
                : `Showing ${departmentLabel} messages currently owned by ${assignmentLabel}.`}
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(380px,0.94fr)_minmax(0,1.06fr)]">
        <EmailList
          title={listTitle}
          description={listDescription}
          emails={visibleEmails}
          selectedId={selectedEmail?.id ?? ""}
          onSelect={setSelectedId}
          emptyActionHref="/dashboard/compose"
          emptyActionLabel="Compose New Case"
          emptyMessage={
            normalizedSearchQuery.length > 0
              ? "No messages match the current search."
              : assignmentFilter !== defaultStaffAssignmentFilter || departmentFilter !== "All"
                ? "No messages match the selected queue filters."
                : emptyMessage
          }
        />
        <EmailDetailPanel
          email={selectedEmail}
          onApprove={handleApprove}
          isApproving={approvingId === selectedEmail?.id}
          assigneeValue={assigneeValue}
          onAssigneeChange={setAssigneeValue}
          onSaveAssignee={handleSaveAssignee}
          isSavingAssignee={isSavingAssignee}
          isEditingDraft={isEditingDraft}
          draftValue={draftValue}
          onDraftChange={setDraftValue}
          onStartEditing={handleStartEditing}
          onCancelEditing={handleCancelEditing}
          onSaveDraft={handleSaveDraft}
          isSavingDraft={isSavingDraft}
          isEditingNote={isEditingNote}
          noteValue={noteValue}
          onNoteChange={setNoteValue}
          onStartEditingNote={handleStartEditingNote}
          onCancelEditingNote={handleCancelEditingNote}
          onSaveNote={handleSaveNote}
          isSavingNote={isSavingNote}
        />
      </div>
    </>
  );
}
