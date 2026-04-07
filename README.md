## EduMailAI

EduMailAI is a Next.js prototype for a university staff workflow tool. The app helps operations teams triage inbound emails, review AI-generated draft responses, and manage the policy documents that support those replies.

## What’s in the prototype

- Staff dashboard shell with shared navigation and layout
- Manual compose flow for creating new local cases
- Inbox, Draft Queue, and Escalations review flows
- AI draft detail view with confidence indicators, ownership routing, and staff notes
- Activity log for approvals, assignments, draft saves, note updates, and document changes
- Downloadable JSON export of the local activity trail
- Knowledge Base document library with locally persisted PDF and DOCX uploads plus download support
- Settings surface for integration readiness, future data model, and manual setup tracking

## App Routes

- `/` - product landing page
- `/dashboard` - workspace overview
- `/dashboard/activity` - workflow activity timeline
- `/dashboard/compose` - create a new local mailbox case
- `/dashboard/inbox` - full message queue
- `/dashboard/drafts` - draft-review queue
- `/dashboard/escalations` - escalation queue
- `/dashboard/knowledge-base` - knowledge document management
- `/dashboard/settings` - local readiness, provider status, and setup checklist
- `/api/activity/export` - download the persisted local activity log as JSON

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

## Verification

Use these commands to verify the project locally:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify
```

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4

## Current Notes

- The message, activity, and document data persist locally using JSON files plus uploaded files in the project workspace.
- This is still a local prototype, so there is no real authentication, database, or external email integration yet.
- The current product focus is stabilizing the local review workflow, grounding surfaces, and oversight dashboard before swapping in real providers.
- The next implementation phase is formalizing swappable adapters for persistence, inbox ingestion, storage, and AI providers without changing the current workflow shape.
