import type { ActivityAdapter } from "@/lib/server/adapters/contracts";
import {
  appendActivityEvent,
  listActivityEvents,
} from "@/lib/server/activity-log-store";

export const localActivityAdapter: ActivityAdapter = {
  listEvents(limit) {
    return listActivityEvents(limit);
  },
  appendEvent(input) {
    return appendActivityEvent(input);
  },
};
