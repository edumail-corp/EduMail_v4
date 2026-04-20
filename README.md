## EduMailAI

EduMailAI is a Next.js prototype for a university staff workflow tool. The app helps operations teams triage inbound emails, review AI-generated draft responses, and manage the policy documents that support those replies.

## What’s in the prototype

- Staff dashboard shell with shared navigation and layout
- Manual compose flow for creating new local cases
- Microsoft Graph-backed inbox sync for importing real mailbox messages when configured
- Microsoft Graph-backed outbound send for approved replies when configured, with local fallback preserved
- Inbox with a single standard mailbox view; escalated cases still appear there without a separate sub-view
- AI draft detail view with confidence indicators, routing context, generated reply support, and staff notes
- Workflow events still append behind the scenes for audit/export needs
- Downloadable JSON export of the audit trail
- Knowledge Base document library with adapter-backed PDF and DOCX uploads, download support, and visible storage details for uploaded files
- Admin surface focused on staff directory plus data footprint and storage locations
- Settings surface limited to simple personal preferences such as language, appearance, and notifications

## App Routes

- `/` - product landing page
- `/dashboard` - workspace overview
- `/dashboard/compose` - create a new local mailbox case
- `/dashboard/inbox` - full message queue
- `/dashboard/drafts` - redirects to `/dashboard/inbox` (preserves `emailId` when present)
- `/dashboard/escalations` - redirects to `/dashboard/inbox` (preserves `emailId` when present)
- `/dashboard/activity` - redirects to `/dashboard`
- `/dashboard/admin` - staff directory plus storage footprint and locations
- `/dashboard/knowledge-base` - knowledge document management
- `/dashboard/settings` - personal language, appearance, and notification preferences
- `/api/activity/export` - download the persisted audit trail as JSON
- `/api/inbox/sync` - trigger a live inbox sync for the configured mailbox provider
- `/api/emails/[id]/send` - send an approved reply through the configured outbound provider

## Local Development

From the project directory, install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` with your browser to see the app.

If Turbopack behaves oddly in your environment, you can use the webpack fallback:

```bash
npm run dev:webpack
```

For staff login, configure Supabase Auth with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EDUMAILAI_AUTH_PROVIDER=supabase_auth`

Set the Supabase Auth redirect URL to `/auth/callback` for your local and deployed origins, then enable Google, Microsoft Azure/Entra ID, and email magic link in the Supabase dashboard.

If you need to keep the prototype usable before external auth is fully wired, keep local developer access enabled in non-production or set:

- `EDUMAILAI_ENABLE_DEV_ACCESS=1`
  Optional override. Built-in staff access now turns on automatically whenever Supabase auth is not configured, so the app stays reachable during setup.

That exposes a local-only sign-in path on `/sign-in` using the current staff directory.

## Microsoft Graph Mail Setup

To enable real inbox sync and outbound send for a shared mailbox, set:

- `EDUMAILAI_INBOX_PROVIDER=microsoft_graph`
- `EDUMAILAI_OUTBOUND_PROVIDER=microsoft_graph`
- `EDUMAILAI_MICROSOFT_TENANT_ID`
- `EDUMAILAI_MICROSOFT_CLIENT_ID`
- `EDUMAILAI_MICROSOFT_CLIENT_SECRET`
- `EDUMAILAI_MICROSOFT_MAILBOX_USER`

Recommended Microsoft Entra app configuration:

- Use application permissions for `Mail.Read` and `Mail.Send`
- Grant admin consent for those permissions
- Point `EDUMAILAI_MICROSOFT_MAILBOX_USER` at the shared mailbox email or user id you want EduMailAI to read and send from
- Optional: set `EDUMAILAI_MICROSOFT_SYNC_BATCH_SIZE` to control how many recent messages each sync import attempts

## Verification

Use these commands to verify the project locally:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify:adapter-modes
```

Note: the production build uses `next/font` with Geist, so it may need network access the first time the build fetches the font files.

`npm run verify:knowledge-base` exercises the real upload, list, download, and delete flow through the current adapter stack. The adapter-mode variant also repeats that workflow against `json_file`, `sqlite`, and the generic `database` mode on an isolated temporary writable root. When `EDUMAILAI_DATABASE_URL` is already configured, the `database` pass uses that live target instead of the SQLite fallback while still forcing knowledge-base file storage to local temp paths for cleanup.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4

## Current Notes

- The message, activity, and document data can now persist through `local`, `json_file`, `sqlite`, or the generic `database` adapter mode for mailbox, activity, and knowledge-base metadata.
- The `database` adapter is driven by `EDUMAILAI_DATABASE_URL` and now supports both SQLite/file paths and PostgreSQL-compatible connection strings such as Supabase.
- On first boot against an empty Postgres database, EduMailAI seeds mailbox, activity, and knowledge-base metadata from the current local JSON/SQLite sources so the workflow can move over without route or page changes.
- Knowledge-base binaries can now persist through the file-storage adapter as either local files or Supabase Storage objects, and uploaded cards surface the active provider plus object path in the UI.
- The current production-ready persistence split is: mailbox/activity/knowledge-base metadata through the database adapter, and knowledge-base binaries through the file-storage adapter.
- Supabase Auth now protects `/dashboard` plus the current API routes, using the static staff directory as the allowlist and role map for the first rollout.
- The current sign-in surface supports Google SSO, Microsoft SSO through Supabase's Azure provider, and email magic link as the fallback path for approved staff accounts.
- A local developer-access option is available on the sign-in page so the workspace stays reachable while external auth setup is still incomplete.
- Workspace membership can now move behind `EDUMAILAI_WORKSPACE_SETTINGS_ADAPTER=database`, seeding the current staff directory into SQLite or PostgreSQL/Supabase on first boot so auth and the admin surface share one persisted roster.
- When workspace membership uses the database-backed settings adapter, `/dashboard/admin` can now add and update staff members directly against that shared roster.
- Live inbox sync and outbound reply delivery are now available through Microsoft Graph when the mailbox credentials are configured, while local manual intake and local auto-sent fallback remain available for unfinished environments.
- This is still a human-in-the-loop prototype, and the AI drafting layer remains local/demo rather than production-backed.
- The current product focus is keeping the operator workflow stable while hardening auth, persistence, mailbox operations, storage transparency, and adapter parity.
