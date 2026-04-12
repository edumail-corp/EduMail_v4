import { redirect } from "next/navigation";

export default async function EscalationsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ emailId?: string | string[] }>;
}>) {
  const { emailId: rawId } = await searchParams;
  const emailId = Array.isArray(rawId) ? rawId[0] : rawId;
  const params = new URLSearchParams();
  params.set("view", "escalations");
  if (emailId) {
    params.set("emailId", emailId);
  }
  redirect(`/dashboard/inbox?${params.toString()}`);
}
