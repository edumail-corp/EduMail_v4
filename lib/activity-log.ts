export type ActivityAction =
  | "case_created"
  | "email_approved"
  | "assignment_updated"
  | "draft_saved"
  | "note_saved"
  | "document_uploaded"
  | "document_deleted";
export type ActivityFilter = "All" | ActivityAction;

export type ActivityEvent = {
  id: string;
  timestamp: string;
  action: ActivityAction;
  entityType: "email" | "document";
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
    label: "Approved",
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
  document_uploaded: {
    label: "Document Added",
    classes: "border-blue-200 bg-blue-100 text-blue-800",
  },
  document_deleted: {
    label: "Document Removed",
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
  "document_uploaded",
  "document_deleted",
] as const satisfies readonly ActivityFilter[];

export function isActivityFilter(value: string): value is ActivityFilter {
  return activityFilters.includes(value as ActivityFilter);
}

export function getActivityFilterLabel(filter: ActivityFilter) {
  return filter === "All" ? "All Activity" : activityActionMeta[filter].label;
}

export function getInitialActivityEvents() {
  return [] as ActivityEvent[];
}

export function formatActivityTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
