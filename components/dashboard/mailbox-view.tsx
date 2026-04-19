"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
} from "@/components/dashboard/dashboard-chrome";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import {
  departmentFilterOptions,
  getStaffAssignmentFilters,
  getEmailAssignmentRecommendation,
  filterEmailsByDepartment,
  defaultStaffAssignmentFilter,
  defaultStaffAssignmentSelection,
  filterEmails,
  filterEmailsByAssignment,
  getEmailDepartment,
  getStaffAssigneeOptions,
  getDepartmentFilterLabel,
  getStaffAssignmentFilterLabel,
  getInitialSelectedEmailId,
  getSelectedEmail,
  isDepartmentFilter,
  isStaffAssignmentFilter,
  summarizeMailboxOperations,
  type DepartmentFilter,
  type EmailFilter,
  type StaffAssignmentFilter,
  type StaffAssignmentSelectValue,
  type StaffEmail,
} from "@/lib/email-data";
import { workloadPressureClasses } from "@/lib/dashboard";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { EmailDetailPanel } from "@/components/dashboard/email-detail-panel";
import { EmailList } from "@/components/dashboard/email-list";
import { InboxEmailDetailPanel } from "@/components/dashboard/inbox-email-detail-panel";
import { InboxEmailList } from "@/components/dashboard/inbox-email-list";

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
  staffAssigneeOptions = [],
  interfaceMode = "workflow",
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  metaSuffix: string;
  listTitle: string;
  listDescription: string;
  emptyMessage: string;
  filter: EmailFilter;
  staffAssigneeOptions?: readonly string[];
  interfaceMode?: "email" | "workflow";
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { preferences, sendDesktopNotification } = useUserPreferences();
  const isPolish = preferences.language === "Polish";
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
  const resolvedStaffAssigneeOptions = getStaffAssigneeOptions(staffAssigneeOptions);
  const resolvedStaffAssignmentFilters = getStaffAssignmentFilters(
    resolvedStaffAssigneeOptions
  );
  const requestedEmailId = searchParams.get("emailId") ?? "";
  const requestedAssigneeParam = searchParams.get("assignee");
  const requestedDepartmentParam = searchParams.get("department");
  const assignmentFilter: StaffAssignmentFilter =
    requestedAssigneeParam &&
    isStaffAssignmentFilter(requestedAssigneeParam, resolvedStaffAssigneeOptions)
      ? requestedAssigneeParam
      : defaultStaffAssignmentFilter;
  const departmentFilter: DepartmentFilter =
    requestedDepartmentParam && isDepartmentFilter(requestedDepartmentParam)
      ? requestedDepartmentParam
      : "All";
  const queueEmails = applyMailboxFilters(emails);
  const visibleEmails = queueEmails.filter((email) =>
    matchesMailboxSearch(email, normalizedSearchQuery)
  );
  const operationsSnapshot = summarizeMailboxOperations(
    queueEmails,
    resolvedStaffAssigneeOptions
  );
  const selectedEmail = getSelectedEmail(visibleEmails, selectedId);
  const selectedAssignmentRecommendation = selectedEmail
    ? getEmailAssignmentRecommendation(
        selectedEmail,
        operationsSnapshot,
        preferences.language
      )
    : null;
  const selectedDepartmentSummary = selectedEmail
    ? operationsSnapshot.departmentSummaries.find(
        (summary) => summary.department === getEmailDepartment(selectedEmail)
      ) ?? null
    : null;
  const assignmentLabel = getStaffAssignmentFilterLabel(
    assignmentFilter,
    preferences.language
  );
  const departmentLabel = getDepartmentFilterLabel(
    departmentFilter,
    preferences.language
  );
  const isEmailMode = interfaceMode === "email";
  const meta = isLoading
    ? isPolish
      ? "Ładowanie wiadomości..."
      : "Loading messages..."
    : assignmentFilter === defaultStaffAssignmentFilter && departmentFilter === "All"
      ? `${queueEmails.length} ${metaSuffix}`
      : isPolish
        ? `${queueEmails.length} ${metaSuffix} dla ${assignmentLabel} w ${departmentLabel}`
        : `${queueEmails.length} ${metaSuffix} for ${assignmentLabel} in ${departmentLabel}`;

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

  function buildResetMailboxFiltersHref() {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    nextSearchParams.delete("assignee");
    nextSearchParams.delete("department");
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

        try {
          const response = await fetch(
          `/api/emails?filter=${encodeURIComponent(filter)}`,
           {
             cache: "no-store",
           }
         );
        const data = (await response.json()) as
          | MailboxEmailsResponse
          | MailboxErrorResponse;

        if (!response.ok || !("emails" in data)) {
          throw new Error(
            getMailboxErrorMessage(data) ??
              (isPolish
                ? "Nie udało się załadować skrzynki."
                : "Unable to load the mailbox.")
          );
        }

        setEmails(data.emails);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : isPolish
              ? "Nie udało się załadować skrzynki."
              : "Unable to load the mailbox."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadEmails();
  }, [filter, isPolish]);

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

  useEffect(() => {
    if (!preferences.sendConfirmations) {
      setActionMessage(null);
    }
  }, [preferences.sendConfirmations]);

  function publishActionFeedback(title: string, message: string) {
    if (preferences.sendConfirmations) {
      setActionMessage(message);
    }

    sendDesktopNotification(title, message);
  }

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
          getMailboxErrorMessage(data) ??
            (isPolish
              ? "Nie udało się zaktualizować wiadomości."
              : "Unable to update the message.")
        );
      }

      setEmails((currentEmails) =>
        currentEmails.map((email) =>
          email.id === data.email.id ? data.email : email
        )
      );
      publishActionFeedback(
        isPolish ? "Odpowiedź zatwierdzona" : "Reply approved",
        isPolish
          ? `"${data.email.subject}" przeniesiono do Wysłanych.`
          : `"${data.email.subject}" moved to Auto-sent.`
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : isPolish
            ? "Nie udało się zaktualizować wiadomości."
            : "Unable to update the message."
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
          getMailboxErrorMessage(data) ??
            (isPolish
              ? "Nie udało się zaktualizować właściciela wiadomości."
              : "Unable to update the message owner.")
        );
      }

      setEmails((currentEmails) =>
        currentEmails.map((email) =>
          email.id === data.email.id ? data.email : email
        )
      );
      publishActionFeedback(
        isPolish ? "Właściciel zaktualizowany" : "Owner updated",
        data.email.assignee
          ? isPolish
            ? `"${data.email.subject}" jest teraz przypisana do ${data.email.assignee}.`
            : `"${data.email.subject}" is now assigned to ${data.email.assignee}.`
          : isPolish
            ? `Własność została wyczyszczona dla "${data.email.subject}".`
            : `Ownership cleared for "${data.email.subject}".`
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : isPolish
            ? "Nie udało się zaktualizować właściciela wiadomości."
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
      setActionError(
        isPolish
          ? "Napisz odpowiedź przed zapisaniem szkicu."
          : "Write a response before saving the draft."
      );
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
          getMailboxErrorMessage(data) ??
            (isPolish
              ? "Nie udało się zapisać szkicu."
              : "Unable to save the draft.")
        );
      }

      setEmails((currentEmails) =>
        currentEmails.map((email) =>
          email.id === data.email.id ? data.email : email
        )
      );
      setIsEditingDraft(false);
      publishActionFeedback(
        isPolish ? "Odpowiedź zapisana" : "Reply saved",
        selectedEmail.status === "Escalated"
          ? isPolish
            ? `"${data.email.subject}" ma teraz zapisany szkic i wróciła do Szkicu.`
            : `"${data.email.subject}" now has a saved draft and moved to Draft.`
          : isPolish
            ? `Szkic dla "${data.email.subject}" został zapisany.`
            : `Draft for "${data.email.subject}" was saved.`
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : isPolish
            ? "Nie udało się zapisać szkicu."
            : "Unable to save the draft."
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
          getMailboxErrorMessage(data) ??
            (isPolish
              ? "Nie udało się zapisać notatki wewnętrznej."
              : "Unable to save the internal note.")
        );
      }

      setEmails((currentEmails) =>
        currentEmails.map((email) =>
          email.id === data.email.id ? data.email : email
        )
      );
      setIsEditingNote(false);
      publishActionFeedback(
        isPolish ? "Notatka zaktualizowana" : "Note updated",
        data.email.staffNote
          ? isPolish
            ? `Notatka wewnętrzna dla "${data.email.subject}" została zapisana.`
            : `Internal note saved for "${data.email.subject}".`
          : isPolish
            ? `Notatka wewnętrzna dla "${data.email.subject}" została wyczyszczona.`
            : `Internal note cleared for "${data.email.subject}".`
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : isPolish
            ? "Nie udało się zapisać notatki wewnętrznej."
            : "Unable to save the internal note."
      );
    } finally {
      setIsSavingNote(false);
    }
  }

  const resolvedEmptyMessage =
    normalizedSearchQuery.length > 0
      ? isPolish
        ? "Żadne wiadomości nie pasują do bieżącego wyszukiwania."
        : "No messages match the current search."
      : assignmentFilter !== defaultStaffAssignmentFilter || departmentFilter !== "All"
        ? isPolish
          ? "Żadne wiadomości nie pasują do wybranych filtrów kolejki."
          : "No messages match the selected queue filters."
        : emptyMessage;
  const showHiddenQueueFiltersNotice =
    isEmailMode &&
    (assignmentFilter !== defaultStaffAssignmentFilter || departmentFilter !== "All");
  const compactMeta = isLoading
    ? isPolish
      ? "Ładowanie wiadomości..."
      : "Loading messages..."
    : normalizedSearchQuery.length > 0
      ? isPolish
        ? `${visibleEmails.length} z ${queueEmails.length} widocznych`
        : `${visibleEmails.length} of ${queueEmails.length} shown`
      : isPolish
        ? `${queueEmails.length} wiadomości`
        : `${queueEmails.length} messages`;

  return (
    <>
      <DashboardTopBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={
          isEmailMode
            ? isPolish
              ? "Szukaj poczty po nadawcy, temacie, źródle lub odpowiedzi..."
              : "Search mail by sender, subject, source, or reply..."
            : isPolish
              ? "Szukaj zgłoszeń, właścicieli, dokumentów źródłowych lub tekstu szkicu..."
              : "Search inquiries, owners, source docs, or draft text..."
        }
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

      {isEmailMode ? (
        <>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1E2340] md:text-[2.6rem]">
                {title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                {isPolish
                  ? "Otwórz wiadomość, aby przejrzeć oryginalne zapytanie i sugerowaną odpowiedź."
                  : "Open a message to review the original inquiry and the suggested reply."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/80 bg-white/82 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-[0_14px_36px_rgba(140,153,179,0.16)]">
                {compactMeta}
              </span>
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
                {isPolish ? "Wyczyść wyszukiwanie" : "Clear Search"}
              </button>
            </div>
          </div>

          {showHiddenQueueFiltersNotice ? (
            <div className="mb-4 rounded-[24px] border border-[#DCE1FF] bg-[#F5F6FF] px-4 py-3 text-sm text-slate-600 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
              {isPolish
                ? `Pokazujemy przefiltrowany wycinek skrzynki dla ${assignmentLabel} w ${departmentLabel}. `
                : `Showing a filtered inbox slice for ${assignmentLabel} in ${departmentLabel}. `}
              <Link
                href={buildResetMailboxFiltersHref()}
                scroll={false}
                className="font-semibold text-[#4F57E8] transition hover:text-[#3139D2]"
              >
                {isPolish ? "Pokaż pełną skrzynkę" : "Show full inbox"}
              </Link>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.92fr)_minmax(0,1.08fr)]">
            <InboxEmailList
              emails={visibleEmails}
              selectedId={selectedEmail?.id ?? ""}
              onSelect={setSelectedId}
              emptyActionHref="/dashboard/compose"
              emptyActionLabel={isPolish ? "Utwórz nową sprawę" : "Compose New Case"}
              emptyMessage={resolvedEmptyMessage}
            />
            <InboxEmailDetailPanel
              email={selectedEmail}
              assignmentRecommendation={selectedAssignmentRecommendation}
              onApprove={handleApprove}
              isApproving={approvingId === selectedEmail?.id}
              assigneeValue={assigneeValue}
              staffAssigneeOptions={resolvedStaffAssigneeOptions}
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
      ) : (
        <>
          <DashboardPageHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            meta={meta}
          />

          <section className={`${dashboardPanelClassName} mb-4 px-5 py-5 md:px-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {isPolish ? "Filtry kolejki" : "Queue Filters"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isPolish
                    ? "Przeglądaj właściwy wycinek kolejki, łącząc filtry właścicieli ze wspólnym wyszukiwaniem skrzynki."
                    : "Review the right slice of the queue by combining owner filters with the shared mailbox search."}
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
                {isPolish ? "Wyczyść wyszukiwanie" : "Clear Search"}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {resolvedStaffAssignmentFilters.map((ownerFilter) => {
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
                    {getStaffAssignmentFilterLabel(ownerFilter, preferences.language)}
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
                    {getDepartmentFilterLabel(
                      nextDepartmentFilter,
                      preferences.language
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/75 bg-white/62 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {isPolish ? "Widok właściciela" : "Owner View"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {assignmentLabel}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/75 bg-white/62 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {isPolish ? "Fokus działu" : "Department Focus"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {departmentLabel}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/75 bg-white/62 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {isPolish ? "Widoczne sprawy" : "Visible Cases"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {visibleEmails.length}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              {assignmentFilter === defaultStaffAssignmentFilter && departmentFilter === "All"
                ? isPolish
                  ? "Pokazujemy każdego właściciela we wszystkich działach bieżącej kolejki."
                  : "Showing every owner across every department in the current queue."
                : assignmentFilter === "Unassigned" && departmentFilter === "All"
                  ? isPolish
                    ? "Pokazujemy tylko wiadomości, które nadal potrzebują właściciela, niezależnie od działu."
                    : "Showing only messages that still need an owner, regardless of department."
                  : assignmentFilter === defaultStaffAssignmentFilter
                    ? isPolish
                      ? `Pokazujemy wszystkich właścicieli w przepływie ${departmentLabel}.`
                      : `Showing every owner inside the ${departmentLabel} workflow.`
                    : isPolish
                      ? `Pokazujemy wiadomości ${departmentLabel}, które są obecnie własnością ${assignmentLabel}.`
                      : `Showing ${departmentLabel} messages currently owned by ${assignmentLabel}.`}
            </p>
          </section>

          <section className="mb-4 grid gap-4 2xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
            <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Queue Operations
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
                    Department pressure and approval load
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    This snapshot follows the current queue filters so team leads can spot which department needs coverage, which cases are approval-ready, and where human review is still piling up.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/80 bg-white/68 px-4 py-3 text-sm text-slate-500">
                  {normalizedSearchQuery.length > 0
                    ? `Search is showing ${visibleEmails.length} of ${queueEmails.length} filtered cases.`
                    : `Showing ${queueEmails.length} filtered cases in this queue slice.`}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Active queue
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                    {operationsSnapshot.activeCount}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Cases still waiting on review, routing, or approval.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Approval-ready
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                    {operationsSnapshot.approvalReadyCount}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Cases that can move into final human approval now.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Weak support
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                    {operationsSnapshot.weakSupportCount}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Cases still needing stronger citations or routing confidence.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/80 bg-white/64 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Ownership gaps
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
                    {operationsSnapshot.unassignedCount}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Unassigned active cases still waiting for a department owner.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 xl:grid-cols-2">
                {operationsSnapshot.departmentSummaries.some(
                  (summary) => summary.totalCount > 0
                ) ? (
                  operationsSnapshot.departmentSummaries
                    .filter((summary) => summary.totalCount > 0)
                    .map((summary) => (
                      <div
                        key={summary.department}
                        className="rounded-[24px] border border-white/80 bg-white/64 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold tracking-tight text-[#1E2340]">
                              {summary.department}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {summary.activeCount} active • {summary.ownerCoverageRate}% owned
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${workloadPressureClasses[summary.pressure]}`}
                          >
                            {summary.pressure}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                          <div className="rounded-[18px] border border-white/75 bg-white/82 px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Ready
                            </p>
                            <p className="mt-2 text-xl font-semibold text-[#1E2340]">
                              {summary.approvalReadyCount}
                            </p>
                          </div>
                          <div className="rounded-[18px] border border-white/75 bg-white/82 px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Weak
                            </p>
                            <p className="mt-2 text-xl font-semibold text-[#1E2340]">
                              {summary.weakSupportCount}
                            </p>
                          </div>
                          <div className="rounded-[18px] border border-white/75 bg-white/82 px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Unassigned
                            </p>
                            <p className="mt-2 text-xl font-semibold text-[#1E2340]">
                              {summary.unassignedCount}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-500">
                          {summary.lightestOwner
                            ? `${summary.lightestOwner} is the lightest visible owner in this department right now.`
                            : "No department owner is available in the current queue slice yet."}
                        </p>
                      </div>
                    ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/80 bg-white/54 px-5 py-8 text-sm text-slate-500 xl:col-span-2">
                    Department pressure cards will appear here once this queue slice has live cases.
                  </div>
                )}
              </div>
            </article>

            <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Owner Balance
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
                Owner load and rebalance guidance
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Use this to decide whether the next case should stay with the current owner or move to the lightest teammate in the department rotation.
              </p>

              <div className="mt-5 space-y-3">
                {operationsSnapshot.ownerSummaries.map((summary) => (
                  <div
                    key={summary.owner}
                    className="rounded-[24px] border border-white/80 bg-white/64 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold tracking-tight text-[#1E2340]">
                          {summary.owner}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {summary.activeCount} active • {summary.departments.join(", ") || "No live load yet"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${workloadPressureClasses[summary.pressure]}`}
                      >
                        {summary.pressure}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-[18px] border border-white/75 bg-white/82 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Ready
                        </p>
                        <p className="mt-2 text-xl font-semibold text-[#1E2340]">
                          {summary.approvalReadyCount}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-white/75 bg-white/82 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Weak
                        </p>
                        <p className="mt-2 text-xl font-semibold text-[#1E2340]">
                          {summary.weakSupportCount}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-white/75 bg-white/82 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Escalated
                        </p>
                        <p className="mt-2 text-xl font-semibold text-[#1E2340]">
                          {summary.escalatedCount}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      {summary.pressure === "Overloaded"
                        ? "Route the next case away from this owner unless continuity is more important than load balancing."
                        : summary.pressure === "Busy"
                          ? "This owner can keep working the queue, but new cases should be balanced carefully."
                          : "This owner is a safe candidate for the next handoff in their department rotation."}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(380px,0.94fr)_minmax(0,1.06fr)]">
            <EmailList
              title={listTitle}
              description={listDescription}
              emails={visibleEmails}
              operationsSnapshot={operationsSnapshot}
              selectedId={selectedEmail?.id ?? ""}
              onSelect={setSelectedId}
              emptyActionHref="/dashboard/compose"
              emptyActionLabel="Compose New Case"
              emptyMessage={resolvedEmptyMessage}
            />
            <EmailDetailPanel
              email={selectedEmail}
              assignmentRecommendation={selectedAssignmentRecommendation}
              departmentSummary={selectedDepartmentSummary}
              onApprove={handleApprove}
              isApproving={approvingId === selectedEmail?.id}
              assigneeValue={assigneeValue}
              staffAssigneeOptions={resolvedStaffAssigneeOptions}
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
      )}
    </>
  );
}
