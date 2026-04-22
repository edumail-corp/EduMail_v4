import type { LanguagePreference, TimeFormatPreference } from "@/lib/user-preferences";

export type ActivityAction =
  | "case_created"
  | "email_approved"
  | "email_send_failed"
  | "assignment_updated"
  | "draft_saved"
  | "note_saved"
  | "inbox_sync_completed"
  | "inbox_sync_failed"
  | "document_uploaded"
  | "document_deleted"
  | "staff_member_added"
  | "staff_member_updated"
  | "staff_member_removed";
export type ActivityFilter = "All" | ActivityAction;

export type ActivityEvent = {
  id: string;
  timestamp: string;
  action: ActivityAction;
  entityType: "email" | "document" | "staff" | "inbox";
  entityId: string;
  title: string;
  description: string;
  href?: string;
};

export type ActivityEventCreateInput = Omit<ActivityEvent, "id" | "timestamp"> & {
  timestamp?: string;
};

export const activityActionMeta: Record<
  ActivityAction,
  {
    label: string;
    classes: string;
  }
> = {
  case_created: {
    label: "Case Created",
    classes: "border-blue-200 bg-blue-100 text-blue-800",
  },
  email_approved: {
    label: "Reply Sent",
    classes: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  email_send_failed: {
    label: "Reply Send Failed",
    classes: "border-rose-200 bg-rose-100 text-rose-800",
  },
  assignment_updated: {
    label: "Assigned",
    classes: "border-cyan-200 bg-cyan-100 text-cyan-800",
  },
  draft_saved: {
    label: "Draft Saved",
    classes: "border-amber-200 bg-amber-100 text-amber-800",
  },
  note_saved: {
    label: "Note Saved",
    classes: "border-violet-200 bg-violet-100 text-violet-800",
  },
  inbox_sync_completed: {
    label: "Inbox Synced",
    classes: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  inbox_sync_failed: {
    label: "Inbox Sync Failed",
    classes: "border-rose-200 bg-rose-100 text-rose-800",
  },
  document_uploaded: {
    label: "Document Added",
    classes: "border-blue-200 bg-blue-100 text-blue-800",
  },
  document_deleted: {
    label: "Document Removed",
    classes: "border-rose-200 bg-rose-100 text-rose-800",
  },
  staff_member_added: {
    label: "Staff Added",
    classes: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  staff_member_updated: {
    label: "Staff Updated",
    classes: "border-cyan-200 bg-cyan-100 text-cyan-800",
  },
  staff_member_removed: {
    label: "Staff Removed",
    classes: "border-rose-200 bg-rose-100 text-rose-800",
  },
};

export const activityFilters = [
  "All",
  "case_created",
  "email_approved",
  "email_send_failed",
  "assignment_updated",
  "draft_saved",
  "note_saved",
  "inbox_sync_completed",
  "inbox_sync_failed",
  "document_uploaded",
  "document_deleted",
  "staff_member_added",
  "staff_member_updated",
  "staff_member_removed",
] as const satisfies readonly ActivityFilter[];

export function isActivityFilter(value: string): value is ActivityFilter {
  return activityFilters.includes(value as ActivityFilter);
}

export function getActivityActionLabel(
  action: ActivityAction,
  language: LanguagePreference = "English"
) {
  if (language === "Polish") {
    const polishLabels: Record<ActivityAction, string> = {
      case_created: "Utworzono sprawę",
      email_approved: "Wysłano odpowiedź",
      email_send_failed: "Błąd wysyłki odpowiedzi",
      assignment_updated: "Zmieniono właściciela",
      draft_saved: "Zapisano szkic",
      note_saved: "Zapisano notatkę",
      inbox_sync_completed: "Zsynchronizowano skrzynkę",
      inbox_sync_failed: "Błąd synchronizacji skrzynki",
      document_uploaded: "Dodano dokument",
      document_deleted: "Usunięto dokument",
      staff_member_added: "Dodano pracownika",
      staff_member_updated: "Zmieniono pracownika",
      staff_member_removed: "Usunięto pracownika",
    };

    return polishLabels[action];
  }

  return activityActionMeta[action].label;
}

export function getActivityFilterLabel(
  filter: ActivityFilter,
  language: LanguagePreference = "English"
) {
  if (filter === "All") {
    return language === "Polish" ? "Cała aktywność" : "All Activity";
  }

  return getActivityActionLabel(filter, language);
}

export function getInitialActivityEvents() {
  return [
    {
      id: "ACT-1001",
      timestamp: "2026-04-18T08:10:00.000Z",
      action: "document_uploaded",
      entityType: "document",
      entityId: "DOC-1",
      title: "International admissions guidance refreshed",
      description:
        "Updated policy guidance is available to support language-proof and scholarship-timing replies.",
      href: "/dashboard/knowledge-base?document=International%20Admissions%20Guidance%202026.pdf",
    },
    {
      id: "ACT-1002",
      timestamp: "2026-04-19T09:12:00.000Z",
      action: "case_created",
      entityType: "email",
      entityId: "EM-1001",
      title: "International admissions case entered the queue",
      description:
        "A new applicant question was captured and prepared for admissions review.",
      href: "/dashboard/inbox?emailId=EM-1001",
    },
    {
      id: "ACT-1003",
      timestamp: "2026-04-19T09:20:00.000Z",
      action: "assignment_updated",
      entityType: "email",
      entityId: "EM-1001",
      title: "International admissions case assigned to Ava Patel",
      description:
        "Ownership is set so the team can move from intake to reply review without delay.",
      href: "/dashboard/inbox?emailId=EM-1001",
    },
    {
      id: "ACT-1004",
      timestamp: "2026-04-19T12:18:00.000Z",
      action: "email_approved",
      entityType: "email",
      entityId: "EM-1002",
      title: "Finance team approved a tuition-plan reply",
      description:
        "The response guided the student to the payment-plan portal and clarified late-fee expectations.",
      href: "/dashboard/inbox?emailId=EM-1002",
    },
    {
      id: "ACT-1005",
      timestamp: "2026-04-20T08:14:00.000Z",
      action: "note_saved",
      entityType: "email",
      entityId: "EM-1003",
      title: "Registrar exception flagged for manual review",
      description:
        "The team recorded an identity-verification note before replying on the transcript request.",
      href: "/dashboard/inbox?emailId=EM-1003",
    },
    {
      id: "ACT-1006",
      timestamp: "2026-04-20T14:41:00.000Z",
      action: "draft_saved",
      entityType: "email",
      entityId: "EM-1004",
      title: "Academic records draft prepared for a faculty request",
      description:
        "The suggested reply explains the approval path without over-promising a timeline.",
      href: "/dashboard/inbox?emailId=EM-1004",
    },
    {
      id: "ACT-1007",
      timestamp: "2026-04-21T07:40:00.000Z",
      action: "inbox_sync_completed",
      entityType: "inbox",
      entityId: "INBOX-DAILY-001",
      title: "Morning inbox review completed",
      description:
        "New student inquiries were added to the Admissions, Finance, and Registrar queues for the team to review.",
      href: "/dashboard/inbox",
    },
  ] as ActivityEvent[];
}

export function formatActivityTimestamp(
  iso: string,
  options?: Readonly<{
    locale?: string;
    timeFormat?: TimeFormatPreference;
  }>
) {
  return new Date(iso).toLocaleString(options?.locale, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12:
      options?.timeFormat === undefined
        ? undefined
        : options.timeFormat === "12h",
  });
}
