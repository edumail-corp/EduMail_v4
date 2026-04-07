import type {
  CaseApprovalState,
  EmailCategory,
  EmailPriority,
  EmailStatus,
  GroundingStrength,
  WorkloadPressure,
} from "@/lib/email-data";

export const dashboardNavItems = [
  { label: "Dashboard", shortLabel: "Home", href: "/dashboard", icon: "overview" },
  { label: "Inbox", shortLabel: "All", href: "/dashboard/inbox", icon: "inbox" },
  { label: "Draft Queue", shortLabel: "Review", href: "/dashboard/drafts", icon: "drafts" },
  { label: "Escalations", shortLabel: "Urgent", href: "/dashboard/escalations", icon: "escalations" },
  {
    label: "Knowledge Base",
    shortLabel: "Docs",
    href: "/dashboard/knowledge-base",
    icon: "knowledge",
  },
  {
    label: "Activity Log",
    shortLabel: "Log",
    href: "/dashboard/activity",
    icon: "activity",
  },
  {
    label: "Settings",
    shortLabel: "Config",
    href: "/dashboard/settings",
    icon: "settings",
  },
] as const;

export const dashboardCurrentUser = {
  name: "Admin User",
  role: "Prototype Owner",
  email: "admin@edumailai.local",
} as const;

export const emailStatusClasses: Record<EmailStatus, string> = {
  Draft: "border-transparent bg-[#EEF0FF] text-[#555CF0]",
  "Auto-sent": "border-transparent bg-[#E9FBF1] text-[#0C8A53]",
  Escalated: "border-transparent bg-[#FFE9EE] text-[#D43D63]",
};

export const emailCategoryClasses: Record<EmailCategory, string> = {
  Admissions: "bg-[#EDF2FF] text-[#5266E8]",
  Finance: "bg-[#EEF6FF] text-[#3974E8]",
  Registrar: "bg-[#ECFAFF] text-[#0F8BA8]",
  Academic: "bg-[#F1F8FF] text-[#2F79B7]",
};

export const emailPriorityClasses: Record<EmailPriority, string> = {
  Low: "border-transparent bg-slate-100 text-slate-600",
  Medium: "border-transparent bg-[#FFF4DF] text-[#B97411]",
  High: "border-transparent bg-[#FFE9EE] text-[#D43D63]",
};

export const approvalStateClasses: Record<CaseApprovalState, string> = {
  "Awaiting Draft": "bg-slate-100 text-slate-600",
  "Needs Review": "bg-[#EEF0FF] text-[#555CF0]",
  Approved: "bg-[#E9FBF1] text-[#0C8A53]",
  Escalated: "bg-[#FFE9EE] text-[#D43D63]",
};

export const groundingStrengthClasses: Record<GroundingStrength, string> = {
  Strong: "bg-[#E9FBF1] text-[#0C8A53]",
  Moderate: "bg-[#FFF3D9] text-[#B67100]",
  Weak: "bg-[#FFE9EE] text-[#D43D63]",
};

export const workloadPressureClasses: Record<WorkloadPressure, string> = {
  Balanced: "bg-[#E9FBF1] text-[#0C8A53]",
  Busy: "bg-[#FFF3D9] text-[#B67100]",
  Overloaded: "bg-[#FFE9EE] text-[#D43D63]",
};

export function formatEmailDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEmailDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
