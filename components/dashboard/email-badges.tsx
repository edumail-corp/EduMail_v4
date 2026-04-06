import type { EmailCategory, EmailStatus } from "@/lib/email-data";
import {
  emailCategoryClasses,
  emailStatusClasses,
} from "@/lib/dashboard";

export function EmailStatusBadge({
  status,
}: Readonly<{
  status: EmailStatus;
}>) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${emailStatusClasses[status]}`}
    >
      {status}
    </span>
  );
}

export function EmailCategoryBadge({
  category,
}: Readonly<{
  category: EmailCategory;
}>) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${emailCategoryClasses[category]}`}
    >
      {category}
    </span>
  );
}
