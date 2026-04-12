import { redirect } from "next/navigation";

export default async function DraftsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ emailId?: string | string[] }>;
}>) {
  const { emailId: rawId } = await searchParams;
  const emailId = Array.isArray(rawId) ? rawId[0] : rawId;
  const query = emailId ? `?emailId=${encodeURIComponent(emailId)}` : "";
  redirect(`/dashboard/inbox${query}`);
}
