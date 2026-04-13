import type { EmailCategory, EmailStatus } from "@/lib/email-data";
import {
  translateEmailCategory,
  translateEmailStatus,
} from "@/lib/email-data";
import {
  emailCategoryClasses,
  emailStatusClasses,
} from "@/lib/dashboard";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";

export function EmailStatusBadge({
  status,
}: Readonly<{
  status: EmailStatus;
}>) {
  const { preferences } = useUserPreferences();

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${emailStatusClasses[status]}`}
    >
      {translateEmailStatus(status, preferences.language)}
    </span>
  );
}

export function EmailCategoryBadge({
  category,
}: Readonly<{
  category: EmailCategory;
}>) {
  const { preferences } = useUserPreferences();

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${emailCategoryClasses[category]}`}
    >
      {translateEmailCategory(category, preferences.language)}
    </span>
  );
}
