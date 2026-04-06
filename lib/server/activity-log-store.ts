import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getInitialActivityEvents,
  type ActivityEvent,
  type ActivityEventCreateInput,
} from "@/lib/activity-log";

const activityLogPath = path.join(process.cwd(), "data", "activity-log.json");

async function writeActivityEvents(events: ActivityEvent[]) {
  await writeFile(activityLogPath, `${JSON.stringify(events, null, 2)}\n`, "utf8");
}

async function ensureActivityLog() {
  await mkdir(path.dirname(activityLogPath), { recursive: true });

  try {
    await readFile(activityLogPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    await writeActivityEvents(getInitialActivityEvents());
  }
}

async function readActivityEvents() {
  await ensureActivityLog();
  const fileContents = await readFile(activityLogPath, "utf8");
  return JSON.parse(fileContents) as ActivityEvent[];
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
