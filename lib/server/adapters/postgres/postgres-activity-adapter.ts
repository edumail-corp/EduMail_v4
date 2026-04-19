import { randomUUID } from "node:crypto";
import type { ActivityAdapter } from "@/lib/server/adapters/contracts";
import {
  buildActivityEventRecord,
  type ActivityEventRecord,
} from "@/lib/server/activity-event-store";
import {
  getPostgresCount,
  runPostgresTransaction,
  type PostgresDatabaseAccess,
} from "@/lib/server/adapters/postgres/postgres-database";
import { loadBootstrapActivityRecords } from "@/lib/server/adapters/postgres/postgres-bootstrap";

type PostgresActivityRow = {
  id: string;
  timestamp: string;
  action: ActivityEventRecord["action"];
  entity_type: ActivityEventRecord["entityType"];
  entity_id: string;
  title: string;
  description: string;
  href: string | null;
};

type PostgresActivityAdapterOptions = {
  databaseAccess: PostgresDatabaseAccess;
};

function toActivityEventRecord(row: PostgresActivityRow): ActivityEventRecord {
  return {
    id: row.id,
    timestamp: row.timestamp,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    description: row.description,
    href: row.href ?? undefined,
  };
}

export function createPostgresActivityAdapter({
  databaseAccess,
}: PostgresActivityAdapterOptions): ActivityAdapter {
  let hasBootstrapped = false;
  let bootstrapPromise: Promise<void> | null = null;

  async function ensureBootstrapped() {
    if (hasBootstrapped) {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = databaseAccess
      .withClient(async (client) => {
        if ((await getPostgresCount(client, "activity_events")) === 0) {
          const seedEvents = await loadBootstrapActivityRecords();

          await runPostgresTransaction(client, async () => {
            for (const event of seedEvents) {
              await client.query(
                `
                  INSERT INTO activity_events (
                    id,
                    timestamp,
                    action,
                    entity_type,
                    entity_id,
                    title,
                    description,
                    href
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `,
                [
                  event.id,
                  event.timestamp,
                  event.action,
                  event.entityType,
                  event.entityId,
                  event.title,
                  event.description,
                  event.href ?? null,
                ]
              );
            }
          });
        }

        hasBootstrapped = true;
      })
      .finally(() => {
        bootstrapPromise = null;
      });

    return bootstrapPromise;
  }

  return {
    async listEvents(limit) {
      await ensureBootstrapped();

      const rows =
        typeof limit === "number"
          ? await databaseAccess.query<PostgresActivityRow>(
              `
                SELECT id, timestamp, action, entity_type, entity_id, title, description, href
                FROM activity_events
                ORDER BY timestamp DESC
                LIMIT $1
              `,
              [limit]
            )
          : await databaseAccess.query<PostgresActivityRow>(
              `
                SELECT id, timestamp, action, entity_type, entity_id, title, description, href
                FROM activity_events
                ORDER BY timestamp DESC
              `
            );

      return rows.map(toActivityEventRecord);
    },
    async appendEvent(input) {
      await ensureBootstrapped();

      const nextEvent = buildActivityEventRecord(
        `ACT-${randomUUID().slice(0, 8)}`,
        input
      );

      await databaseAccess.query(
        `
          INSERT INTO activity_events (
            id,
            timestamp,
            action,
            entity_type,
            entity_id,
            title,
            description,
            href
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          nextEvent.id,
          nextEvent.timestamp,
          nextEvent.action,
          nextEvent.entityType,
          nextEvent.entityId,
          nextEvent.title,
          nextEvent.description,
          nextEvent.href ?? null,
        ]
      );

      return nextEvent;
    },
  };
}
