import { randomUUID } from "node:crypto";
import type { ActivityAdapter } from "@/lib/server/adapters/contracts";
import {
  buildActivityEventRecord,
  listActivityEventRecords,
  type ActivityEventRecord,
} from "@/lib/server/activity-event-store";
import {
  getSQLiteCount,
  runSQLiteTransaction,
  type SQLiteDatabaseAccess,
  withSQLiteDatabase,
} from "@/lib/server/adapters/sqlite/sqlite-database";

type SQLiteActivityRow = {
  id: string;
  timestamp: string;
  action: ActivityEventRecord["action"];
  entity_type: ActivityEventRecord["entityType"];
  entity_id: string;
  title: string;
  description: string;
  href: string | null;
};

function toActivityEventRecord(row: SQLiteActivityRow): ActivityEventRecord {
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

function insertActivityEventRecord(
  row: ActivityEventRecord,
  execute: (record: ActivityEventRecord) => void
) {
  execute(row);
}

type SQLiteActivityAdapterOptions = {
  databaseAccess?: SQLiteDatabaseAccess;
};

export function createSQLiteActivityAdapter(
  options?: SQLiteActivityAdapterOptions
): ActivityAdapter {
  let hasBootstrapped = false;
  let bootstrapPromise: Promise<void> | null = null;
  const withDatabase = options?.databaseAccess?.withDatabase ?? withSQLiteDatabase;

  async function ensureBootstrapped() {
    if (hasBootstrapped) {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = withDatabase(async (database) => {
      if (getSQLiteCount(database, "activity_events") === 0) {
        const seedEvents = await listActivityEventRecords();
        const insertStatement = database.prepare(`
          INSERT INTO activity_events (
            id,
            timestamp,
            action,
            entity_type,
            entity_id,
            title,
            description,
            href
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        runSQLiteTransaction(database, () => {
          for (const event of seedEvents) {
            insertActivityEventRecord(event, (record) => {
              insertStatement.run(
                record.id,
                record.timestamp,
                record.action,
                record.entityType,
                record.entityId,
                record.title,
                record.description,
                record.href ?? null
              );
            });
          }
        });
      }

      hasBootstrapped = true;
    }).finally(() => {
      bootstrapPromise = null;
    });

    return bootstrapPromise;
  }

  return {
    async listEvents(limit) {
      await ensureBootstrapped();

      return withDatabase((database) => {
        if (typeof limit === "number") {
          const rows = database
            .prepare(`
              SELECT id, timestamp, action, entity_type, entity_id, title, description, href
              FROM activity_events
              ORDER BY timestamp DESC
              LIMIT ?
            `)
            .all(limit) as SQLiteActivityRow[];

          return rows.map(toActivityEventRecord);
        }

        const rows = database
          .prepare(`
            SELECT id, timestamp, action, entity_type, entity_id, title, description, href
            FROM activity_events
            ORDER BY timestamp DESC
          `)
          .all() as SQLiteActivityRow[];

        return rows.map(toActivityEventRecord);
      });
    },
    async appendEvent(input) {
      await ensureBootstrapped();

      return withDatabase((database) => {
        const nextEvent = buildActivityEventRecord(
          `ACT-${randomUUID().slice(0, 8)}`,
          input
        );

        database
          .prepare(`
            INSERT INTO activity_events (
              id,
              timestamp,
              action,
              entity_type,
              entity_id,
              title,
              description,
              href
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            nextEvent.id,
            nextEvent.timestamp,
            nextEvent.action,
            nextEvent.entityType,
            nextEvent.entityId,
            nextEvent.title,
            nextEvent.description,
            nextEvent.href ?? null
          );

        return nextEvent;
      });
    },
  };
}
