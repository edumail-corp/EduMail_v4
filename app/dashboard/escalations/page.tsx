import { redirect } from "next/navigation";

export default async function EscalationsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ emailId?: string | string[] }>;
}>) {
  const { emailId: rawId } = await searchParams;
  const emailId = Array.isArray(rawId) ? rawId[0] : rawId;
  const params = new URLSearchParams();
  if (emailId) {
    params.set("emailId", emailId);
  }
  const queryString = params.toString();
  redirect(queryString.length > 0 ? `/dashboard/inbox?${queryString}` : "/dashboard/inbox");
}
