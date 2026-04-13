import type { MailboxAdapter } from "@/lib/server/adapters/contracts";
import {
  createStaffEmail,
  listStaffEmails,
  updateStaffEmail,
} from "@/lib/server/email-store";

export const localMailboxAdapter: MailboxAdapter = {
  listEmails(filter, assignmentFilter, departmentFilter) {
    return listStaffEmails(filter, assignmentFilter, departmentFilter);
  },
  updateEmail(id, updates) {
    return updateStaffEmail(id, updates);
  },
  createEmail(input) {
    return createStaffEmail(input);
  },
};
