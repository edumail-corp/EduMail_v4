import {
  getInitialActivityEvents,
  type ActivityEvent,
  type ActivityEventCreateInput,
} from "@/lib/activity-log";
import {
  readJsonFileIfExists,
  readJsonFileWithFallback,
  writeJsonFileAtomically,
} from "@/lib/server/json-file-store";
import { getWritableDataPath } from "@/lib/server/storage-path";

const activityEventStorePath = getWritableDataPath("activity-events.json");
const legacyActivityLogPath = getWritableDataPath("activity-log.json");

export type ActivityEventRecord = ActivityEvent;

export type ActivityEventReadOptions = {
  bootstrapFromLegacy?: boolean;
};

export async function listActivityEventRecords(
  options?: ActivityEventReadOptions
) {
  const storedEvents = await readJsonFileIfExists<ActivityEventRecord[]>(
    activityEventStorePath
  );

  if (storedEvents) {
    return storedEvents.map((event) => ({ ...event }));
  }

  if (options?.bootstrapFromLegacy === false) {
    return [];
  }

  return readJsonFileWithFallback<ActivityEventRecord[]>(legacyActivityLogPath, {
    fallback: getInitialActivityEvents,
  });
}

export async function writeActivityEventRecords(records: ActivityEventRecord[]) {
  await writeJsonFileAtomically(activityEventStorePath, records);
}

export function buildActivityEventRecord(
  id: string,
  input: ActivityEventCreateInput
): ActivityEventRecord {
  return {
    id,
    timestamp: input.timestamp ?? new Date().toISOString(),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    description: input.description,
    href: input.href,
  };
}
