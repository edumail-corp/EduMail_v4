import { randomUUID } from "node:crypto";
import type { ActivityAdapter } from "@/lib/server/adapters/contracts";
import {
  buildActivityEventRecord,
  listActivityEventRecords,
  writeActivityEventRecords,
} from "@/lib/server/activity-event-store";

type RecordBackedActivityAdapterOptions = {
  bootstrapFromLegacy?: boolean;
};

function createRecordBackedActivityAdapter(
  options?: RecordBackedActivityAdapterOptions
): ActivityAdapter {
  return {
    async listEvents(limit) {
      const events = await listActivityEventRecords(options);
      const sortedEvents = [...events].sort(
        (left, right) =>
          new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
      );

      return typeof limit === "number" ? sortedEvents.slice(0, limit) : sortedEvents;
    },
    async appendEvent(input) {
      const events = await listActivityEventRecords(options);
      const nextEvent = buildActivityEventRecord(
        `ACT-${randomUUID().slice(0, 8)}`,
        input
      );

      await writeActivityEventRecords([nextEvent, ...events]);

      return nextEvent;
    },
  };
}

export function createLocalActivityAdapter(): ActivityAdapter {
  return createRecordBackedActivityAdapter({
    bootstrapFromLegacy: true,
  });
}

export function createJsonFileActivityAdapter(): ActivityAdapter {
  return createRecordBackedActivityAdapter({
    bootstrapFromLegacy: false,
  });
}
