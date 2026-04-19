import {
  filterEmails,
  filterEmailsByAssignment,
  filterEmailsByDepartment,
  getEmailWorkflowHref,
  type DepartmentFilter,
  type EmailFilter,
  type StaffAssignmentFilter,
  type StaffEmail,
} from "@/lib/email-data";
import type {
  ActivityAdapter,
  MailboxAdapter,
} from "@/lib/server/adapters/contracts";
import {
  fromStaffEmail,
  listMailboxCaseRecords,
  toStaffEmail,
  writeMailboxCaseRecords,
} from "@/lib/server/mailbox-record-store";
import {
  buildFallbackRoutingDecision,
  createNextEmailId,
  getEmailActivityDescription,
  synchronizeDraftThreadEntry,
  synchronizeOperationalFields,
} from "@/lib/server/local-mailbox-operations";

type LocalMailboxAdapterDependencies = {
  activityAdapter: ActivityAdapter;
};

type RecordBackedMailboxAdapterOptions = {
  bootstrapFromLegacy?: boolean;
  fallback?: "seeded" | "empty";
};

function filterVisibleEmails(
  emails: StaffEmail[],
  filter: EmailFilter = "All",
  assignmentFilter: StaffAssignmentFilter = "All",
  departmentFilter: DepartmentFilter = "All"
) {
  return filterEmailsByDepartment(
    filterEmailsByAssignment(filterEmails(emails, filter), assignmentFilter),
    departmentFilter
  );
}

function createRecordBackedMailboxAdapter(
  {
    activityAdapter,
  }: LocalMailboxAdapterDependencies,
  options?: RecordBackedMailboxAdapterOptions
): MailboxAdapter {
  return {
    async listEmails(filter, assignmentFilter, departmentFilter) {
      const records = await listMailboxCaseRecords(options);
      const emails = records.map(toStaffEmail);
      return filterVisibleEmails(emails, filter, assignmentFilter, departmentFilter);
    },
    async updateEmail(id, updates) {
      const records = await listMailboxCaseRecords(options);
      const emails = records.map(toStaffEmail);
      const emailIndex = emails.findIndex((email) => email.id === id);

      if (emailIndex === -1) {
        return null;
      }

      const previousEmail = emails[emailIndex];
      const nextTimestamp = new Date().toISOString();
      const nextEmailBeforeThreadSync: StaffEmail = {
        ...previousEmail,
        ...updates,
        lastUpdatedAt: nextTimestamp,
      };
      const nextEmail: StaffEmail = {
        ...nextEmailBeforeThreadSync,
        threadHistory: synchronizeDraftThreadEntry(
          nextEmailBeforeThreadSync,
          nextTimestamp,
          previousEmail
        ),
      };
      const synchronizedNextEmail = synchronizeOperationalFields(nextEmail);
      const nextEmails = [...emails];
      nextEmails[emailIndex] = synchronizedNextEmail;

      await writeMailboxCaseRecords(nextEmails.map(fromStaffEmail));

      const activity = getEmailActivityDescription(
        previousEmail,
        synchronizedNextEmail
      );

      if (activity) {
        await activityAdapter.appendEvent({
          action: activity.action,
          entityType: "email",
          entityId: synchronizedNextEmail.id,
          title: synchronizedNextEmail.subject,
          description: activity.description,
          href: activity.href,
        });
      }

      return synchronizedNextEmail;
    },
    async createEmail(input) {
      const records = await listMailboxCaseRecords(options);
      const emails = records.map(toStaffEmail);
      const timestamp = new Date().toISOString();
      const nextEmailBeforeThreadSync: StaffEmail = {
        ...input,
        id: createNextEmailId(emails),
        receivedAt: timestamp,
        lastUpdatedAt: timestamp,
      };
      const nextEmail: StaffEmail = {
        ...nextEmailBeforeThreadSync,
        threadHistory: synchronizeDraftThreadEntry(nextEmailBeforeThreadSync, timestamp),
      };
      const synchronizedNextEmail = synchronizeOperationalFields(nextEmail);
      const routingDecision =
        synchronizedNextEmail.routingDecision ??
        buildFallbackRoutingDecision(synchronizedNextEmail);

      await writeMailboxCaseRecords([
        fromStaffEmail(synchronizedNextEmail),
        ...emails.map(fromStaffEmail),
      ]);

      await activityAdapter.appendEvent({
        action: "case_created",
        entityType: "email",
        entityId: synchronizedNextEmail.id,
        title: synchronizedNextEmail.subject,
        description:
          synchronizedNextEmail.status === "Escalated"
            ? `Created a new case, suggested ${synchronizedNextEmail.department}, recommended ${routingDecision.suggestedAssignees.join(", ")}, and flagged it for manual review in the inbox.`
            : `Created a new case, suggested ${synchronizedNextEmail.department}, recommended ${routingDecision.suggestedAssignees.join(", ")}, and added it to the review queue.`,
        href: getEmailWorkflowHref(synchronizedNextEmail),
      });

      return synchronizedNextEmail;
    },
  };
}

export function createLocalMailboxAdapter({
  activityAdapter,
}: LocalMailboxAdapterDependencies): MailboxAdapter {
  return createRecordBackedMailboxAdapter(
    { activityAdapter },
    {
      bootstrapFromLegacy: true,
      fallback: "seeded",
    }
  );
}

export function createJsonFileMailboxAdapter({
  activityAdapter,
}: LocalMailboxAdapterDependencies): MailboxAdapter {
  return createRecordBackedMailboxAdapter(
    { activityAdapter },
    {
      bootstrapFromLegacy: false,
      fallback: "empty",
    }
  );
}
