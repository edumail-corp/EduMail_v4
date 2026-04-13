import { NextResponse } from "next/server";
import {
  isEmailCategory,
  isDepartmentFilter,
  isValidEmailAddress,
  minimumEmailBodyLength,
  minimumEmailSubjectLength,
  minimumSenderNameLength,
  defaultStaffAssignmentFilter,
  isEmailFilter,
  isEmailPriority,
  isStaffAssignmentFilter,
  type DepartmentFilter,
  type EmailFilter,
  type StaffEmailCreateInput,
  type StaffAssignmentFilter,
} from "@/lib/email-data";
import {
  isLanguagePreference,
} from "@/lib/user-preferences";
import {
  createMailboxEmail,
  listMailboxEmails,
} from "@/lib/server/services/mailbox-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isEmailCreatePayload(value: unknown): value is StaffEmailCreateInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StaffEmailCreateInput>;

  return (
    typeof candidate.senderName === "string" &&
    candidate.senderName.trim().length >= minimumSenderNameLength &&
    typeof candidate.senderEmail === "string" &&
    isValidEmailAddress(candidate.senderEmail) &&
    typeof candidate.subject === "string" &&
    candidate.subject.trim().length >= minimumEmailSubjectLength &&
    typeof candidate.body === "string" &&
    candidate.body.trim().length >= minimumEmailBodyLength &&
    typeof candidate.category === "string" &&
    isEmailCategory(candidate.category) &&
    typeof candidate.priority === "string" &&
    isEmailPriority(candidate.priority)
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterParam = searchParams.get("filter");
  const assigneeParam = searchParams.get("assignee");
  const departmentParam = searchParams.get("department");

  if (filterParam !== null && !isEmailFilter(filterParam)) {
    return NextResponse.json(
      { error: "Invalid email filter." },
      { status: 400 }
    );
  }

  if (assigneeParam !== null && !isStaffAssignmentFilter(assigneeParam)) {
    return NextResponse.json(
      { error: "Invalid ownership filter." },
      { status: 400 }
    );
  }

  if (departmentParam !== null && !isDepartmentFilter(departmentParam)) {
    return NextResponse.json(
      { error: "Invalid department filter." },
      { status: 400 }
    );
  }

  const filter: EmailFilter = filterParam ?? "All";
  const assignmentFilter: StaffAssignmentFilter =
    assigneeParam ?? defaultStaffAssignmentFilter;
  const departmentFilter: DepartmentFilter = departmentParam ?? "All";
  const emails = await listMailboxEmails(
    filter,
    assignmentFilter,
    departmentFilter
  );

  return NextResponse.json({ emails });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!isEmailCreatePayload(payload)) {
    return NextResponse.json(
      {
        error: `Fill out all required fields. Name must be at least ${minimumSenderNameLength} characters, subject at least ${minimumEmailSubjectLength}, and message body at least ${minimumEmailBodyLength}.`,
      },
      { status: 400 }
    );
  }

  const email = await createMailboxEmail({
    senderName: payload.senderName.trim(),
    senderEmail: payload.senderEmail.trim(),
    subject: payload.subject.trim(),
    body: payload.body.trim(),
    category: payload.category,
    priority: payload.priority,
  },
  (() => {
    const requestedLanguage = (payload as { language?: unknown })?.language;

    return isLanguagePreference(requestedLanguage)
      ? requestedLanguage
      : "English";
  })());

  return NextResponse.json({ email }, { status: 201 });
}
