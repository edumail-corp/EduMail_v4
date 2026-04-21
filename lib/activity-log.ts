import type { LanguagePreference, TimeFormatPreference } from "@/lib/user-preferences";

export type ActivityAction =
  | "case_created"
  | "email_approved"
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
  return [] as ActivityEvent[];
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
