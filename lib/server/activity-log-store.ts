import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  getInitialActivityEvents,
  type ActivityEvent,
  type ActivityEventCreateInput,
} from "@/lib/activity-log";
import {
  readJsonFileWithFallback,
  writeJsonFileAtomically,
} from "@/lib/server/json-file-store";

const activityLogPath = path.join(process.cwd(), "data", "activity-log.json");

async function writeActivityEvents(events: ActivityEvent[]) {
  await writeJsonFileAtomically(activityLogPath, events);
}

async function readActivityEvents() {
  return readJsonFileWithFallback<ActivityEvent[]>(activityLogPath, {
    fallback: getInitialActivityEvents,
  });
}

export async function listActivityEvents(limit?: number) {
  const events = await readActivityEvents();
  const sortedEvents = [...events].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );

  return typeof limit === "number" ? sortedEvents.slice(0, limit) : sortedEvents;
}

export async function appendActivityEvent(input: ActivityEventCreateInput) {
  const events = await readActivityEvents();

  const nextEvent: ActivityEvent = {
    id: `ACT-${randomUUID().slice(0, 8)}`,
    timestamp: input.timestamp ?? new Date().toISOString(),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    description: input.description,
    href: input.href,
  };

  await writeActivityEvents([nextEvent, ...events]);

  return nextEvent;
}
