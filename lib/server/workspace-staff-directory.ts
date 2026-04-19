import { randomUUID } from "node:crypto";
import { getConfiguredDatabaseUrl } from "@/lib/server/adapters/database/database-url";
import {
  createPostgresDatabaseAccess,
  getPostgresCount,
  runPostgresTransaction,
  type PostgresDatabaseAccess,
} from "@/lib/server/adapters/postgres/postgres-database";
import { getConfiguredAdapterBinding } from "@/lib/server/adapters/provider-config";
import {
  createSQLiteDatabaseAccess,
  getSQLiteCount,
  runSQLiteTransaction,
  type SQLiteDatabaseAccess,
} from "@/lib/server/adapters/sqlite/sqlite-database";
import type {
  WorkspaceRole,
  WorkspaceStaffDirectorySource,
  WorkspaceStaffUser,
  WorkspaceUserStatus,
} from "@/lib/workspace-config";
import { workspaceStaffDirectory } from "@/lib/workspace-config";

type WorkspaceStaffRow = {
  id: string;
  name: string;
  email: string;
  role: WorkspaceStaffUser["role"];
  status: WorkspaceStaffUser["status"];
};

type WorkspaceStaffDirectoryData = {
  staffDirectory: WorkspaceStaffUser[];
  source: WorkspaceStaffDirectorySource;
};

type WorkspaceStaffMutationInput = {
  name: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceUserStatus;
};

const sqliteBootstrappedPaths = new Set<string>();
const sqliteBootstrapPromises = new Map<string, Promise<void>>();
const postgresBootstrappedConnections = new Set<string>();
const postgresBootstrapPromises = new Map<string, Promise<void>>();
const supportedWorkspaceRoles = [
  "operations_admin",
  "triage_specialist",
  "knowledge_manager",
] as const;
const supportedWorkspaceUserStatuses = ["active", "pending"] as const;

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

function normalizeStaffName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return supportedWorkspaceRoles.includes(value as WorkspaceRole);
}

function isWorkspaceUserStatus(value: string): value is WorkspaceUserStatus {
  return supportedWorkspaceUserStatuses.includes(value as WorkspaceUserStatus);
}

function cloneStaticWorkspaceStaffDirectory() {
  return workspaceStaffDirectory.map((staffUser) => ({ ...staffUser }));
}

function sortWorkspaceStaffDirectory(staffDirectory: readonly WorkspaceStaffUser[]) {
  return [...staffDirectory].sort(
    (left, right) => left.id.localeCompare(right.id) || left.name.localeCompare(right.name)
  );
}

function toWorkspaceStaffUser(row: WorkspaceStaffRow): WorkspaceStaffUser {
  return {
    id: row.id,
    name: row.name,
    email: normalizeEmailAddress(row.email),
    role: row.role,
    status: row.status,
  };
}

function createWorkspaceStaffUserId() {
  return `USR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function validateWorkspaceStaffMutationInput(
  input: WorkspaceStaffMutationInput
) {
  const name = normalizeStaffName(input.name);
  const email = normalizeEmailAddress(input.email);

  if (!name) {
    throw new Error("A staff name is required.");
  }

  if (!email || !email.includes("@")) {
    throw new Error("A valid staff email is required.");
  }

  if (!isWorkspaceRole(input.role)) {
    throw new Error("A supported staff role is required.");
  }

  if (!isWorkspaceUserStatus(input.status)) {
    throw new Error("A supported staff status is required.");
  }

  return {
    name,
    email,
    role: input.role,
    status: input.status,
  } satisfies WorkspaceStaffMutationInput;
}

function getRequiredConfiguredWorkspaceStaffDatabase() {
  const binding = getConfiguredAdapterBinding("workspace-settings");
  const configuredDatabase = getConfiguredDatabaseUrl();

  if (binding.activeProvider !== "database" || !configuredDatabase) {
    throw new Error(
      "Workspace membership editing requires EDUMAILAI_WORKSPACE_SETTINGS_ADAPTER=database."
    );
  }

  return configuredDatabase;
}

async function ensureSQLiteWorkspaceStaffDirectory(
  databaseAccess: SQLiteDatabaseAccess
) {
  const bootstrapKey = databaseAccess.databasePath;

  if (sqliteBootstrappedPaths.has(bootstrapKey)) {
    return;
  }

  const existingPromise = sqliteBootstrapPromises.get(bootstrapKey);

  if (existingPromise) {
    return existingPromise;
  }

  const bootstrapPromise = databaseAccess
    .withDatabase((database) => {
      if (getSQLiteCount(database, "workspace_staff_users") === 0) {
        const insertStatement = database.prepare(`
          INSERT INTO workspace_staff_users (id, name, email, role, status)
          VALUES (?, ?, ?, ?, ?)
        `);

        runSQLiteTransaction(database, () => {
          for (const staffUser of cloneStaticWorkspaceStaffDirectory()) {
            insertStatement.run(
              staffUser.id,
              staffUser.name,
              staffUser.email,
              staffUser.role,
              staffUser.status
            );
          }
        });
      }

      sqliteBootstrappedPaths.add(bootstrapKey);
    })
    .finally(() => {
      sqliteBootstrapPromises.delete(bootstrapKey);
    });

  sqliteBootstrapPromises.set(bootstrapKey, bootstrapPromise);
  return bootstrapPromise;
}

async function ensurePostgresWorkspaceStaffDirectory(
  databaseAccess: PostgresDatabaseAccess
) {
  const bootstrapKey = databaseAccess.connectionString;

  if (postgresBootstrappedConnections.has(bootstrapKey)) {
    return;
  }

  const existingPromise = postgresBootstrapPromises.get(bootstrapKey);

  if (existingPromise) {
    return existingPromise;
  }

  const bootstrapPromise = databaseAccess
    .withClient(async (client) => {
      if ((await getPostgresCount(client, "workspace_staff_users")) === 0) {
        await runPostgresTransaction(client, async () => {
          for (const staffUser of cloneStaticWorkspaceStaffDirectory()) {
            await client.query(
              `
                INSERT INTO workspace_staff_users (id, name, email, role, status)
                VALUES ($1, $2, $3, $4, $5)
              `,
              [
                staffUser.id,
                staffUser.name,
                staffUser.email,
                staffUser.role,
                staffUser.status,
              ]
            );
          }
        });
      }

      postgresBootstrappedConnections.add(bootstrapKey);
    })
    .finally(() => {
      postgresBootstrapPromises.delete(bootstrapKey);
    });

  postgresBootstrapPromises.set(bootstrapKey, bootstrapPromise);
  return bootstrapPromise;
}

async function listSQLiteWorkspaceStaffDirectory(
  databaseAccess: SQLiteDatabaseAccess
) {
  await ensureSQLiteWorkspaceStaffDirectory(databaseAccess);

  return databaseAccess.withDatabase((database) => {
    const rows = database
      .prepare(`
        SELECT id, name, email, role, status
        FROM workspace_staff_users
        ORDER BY id ASC
      `)
      .all() as WorkspaceStaffRow[];

    return rows.map(toWorkspaceStaffUser);
  });
}

async function listPostgresWorkspaceStaffDirectory(
  databaseAccess: PostgresDatabaseAccess
) {
  await ensurePostgresWorkspaceStaffDirectory(databaseAccess);

  const rows = await databaseAccess.query<WorkspaceStaffRow>(
    `
      SELECT id, name, email, role, status
      FROM workspace_staff_users
      ORDER BY id ASC
    `
  );

  return rows.map(toWorkspaceStaffUser);
}

async function insertSQLiteWorkspaceStaffUser(
  databaseAccess: SQLiteDatabaseAccess,
  input: WorkspaceStaffMutationInput
) {
  await ensureSQLiteWorkspaceStaffDirectory(databaseAccess);
  const validatedInput = validateWorkspaceStaffMutationInput(input);
  const userId = createWorkspaceStaffUserId();

  return databaseAccess.withDatabase((database) => {
    database
      .prepare(`
        INSERT INTO workspace_staff_users (id, name, email, role, status)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        userId,
        validatedInput.name,
        validatedInput.email,
        validatedInput.role,
        validatedInput.status
      );

    return {
      id: userId,
      ...validatedInput,
    } satisfies WorkspaceStaffUser;
  });
}

async function insertPostgresWorkspaceStaffUser(
  databaseAccess: PostgresDatabaseAccess,
  input: WorkspaceStaffMutationInput
) {
  await ensurePostgresWorkspaceStaffDirectory(databaseAccess);
  const validatedInput = validateWorkspaceStaffMutationInput(input);
  const userId = createWorkspaceStaffUserId();

  await databaseAccess.query(
    `
      INSERT INTO workspace_staff_users (id, name, email, role, status)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      userId,
      validatedInput.name,
      validatedInput.email,
      validatedInput.role,
      validatedInput.status,
    ]
  );

  return {
    id: userId,
    ...validatedInput,
  } satisfies WorkspaceStaffUser;
}

async function updateSQLiteWorkspaceStaffUser(
  databaseAccess: SQLiteDatabaseAccess,
  userId: string,
  input: WorkspaceStaffMutationInput
) {
  await ensureSQLiteWorkspaceStaffDirectory(databaseAccess);
  const validatedInput = validateWorkspaceStaffMutationInput(input);

  return databaseAccess.withDatabase((database) => {
    const result = database
      .prepare(`
        UPDATE workspace_staff_users
        SET name = ?, email = ?, role = ?, status = ?
        WHERE id = ?
      `)
      .run(
        validatedInput.name,
        validatedInput.email,
        validatedInput.role,
        validatedInput.status,
        userId
      ) as {
      changes?: number | bigint;
    };

    if (Number(result.changes ?? 0) === 0) {
      throw new Error("The selected staff member was not found.");
    }

    return {
      id: userId,
      ...validatedInput,
    } satisfies WorkspaceStaffUser;
  });
}

async function updatePostgresWorkspaceStaffUser(
  databaseAccess: PostgresDatabaseAccess,
  userId: string,
  input: WorkspaceStaffMutationInput
) {
  await ensurePostgresWorkspaceStaffDirectory(databaseAccess);
  const validatedInput = validateWorkspaceStaffMutationInput(input);
  const rows = await databaseAccess.query<WorkspaceStaffRow>(
    `
      UPDATE workspace_staff_users
      SET name = $2, email = $3, role = $4, status = $5
      WHERE id = $1
      RETURNING id, name, email, role, status
    `,
    [
      userId,
      validatedInput.name,
      validatedInput.email,
      validatedInput.role,
      validatedInput.status,
    ]
  );

  const updatedUser = rows[0];

  if (!updatedUser) {
    throw new Error("The selected staff member was not found.");
  }

  return toWorkspaceStaffUser(updatedUser);
}

export async function getWorkspaceStaffDirectoryData(): Promise<WorkspaceStaffDirectoryData> {
  const binding = getConfiguredAdapterBinding("workspace-settings");

  if (binding.activeProvider !== "database") {
    return {
      staffDirectory: sortWorkspaceStaffDirectory(cloneStaticWorkspaceStaffDirectory()),
      source: "static",
    };
  }

  const configuredDatabase = getConfiguredDatabaseUrl();

  if (!configuredDatabase) {
    return {
      staffDirectory: sortWorkspaceStaffDirectory(cloneStaticWorkspaceStaffDirectory()),
      source: "static",
    };
  }

  if (configuredDatabase.driver === "postgres") {
    const databaseAccess = createPostgresDatabaseAccess(
      configuredDatabase.connectionString
    );

    return {
      staffDirectory: sortWorkspaceStaffDirectory(
        await listPostgresWorkspaceStaffDirectory(databaseAccess)
      ),
      source: "database",
    };
  }

  const databaseAccess = createSQLiteDatabaseAccess(configuredDatabase.resolvedPath);

  return {
    staffDirectory: sortWorkspaceStaffDirectory(
      await listSQLiteWorkspaceStaffDirectory(databaseAccess)
    ),
    source: "database",
  };
}

export async function listWorkspaceStaffDirectory() {
  return (await getWorkspaceStaffDirectoryData()).staffDirectory;
}

export async function listActiveWorkspaceStaffAssignees() {
  return (await listWorkspaceStaffDirectory())
    .filter((staffUser) => staffUser.status === "active")
    .map((staffUser) => staffUser.name);
}

export async function findWorkspaceStaffUserByEmail(email: string) {
  const normalizedEmail = normalizeEmailAddress(email);

  return (
    (await listWorkspaceStaffDirectory()).find(
      (staffUser) => normalizeEmailAddress(staffUser.email) === normalizedEmail
    ) ?? null
  );
}

export async function createWorkspaceStaffUser(input: WorkspaceStaffMutationInput) {
  const configuredDatabase = getRequiredConfiguredWorkspaceStaffDatabase();

  if (configuredDatabase.driver === "postgres") {
    return insertPostgresWorkspaceStaffUser(
      createPostgresDatabaseAccess(configuredDatabase.connectionString),
      input
    );
  }

  return insertSQLiteWorkspaceStaffUser(
    createSQLiteDatabaseAccess(configuredDatabase.resolvedPath),
    input
  );
}

export async function updateWorkspaceStaffUser(
  userId: string,
  input: WorkspaceStaffMutationInput
) {
  const configuredDatabase = getRequiredConfiguredWorkspaceStaffDatabase();

  if (!userId.trim()) {
    throw new Error("A staff member id is required.");
  }

  if (configuredDatabase.driver === "postgres") {
    return updatePostgresWorkspaceStaffUser(
      createPostgresDatabaseAccess(configuredDatabase.connectionString),
      userId.trim(),
      input
    );
  }

  return updateSQLiteWorkspaceStaffUser(
    createSQLiteDatabaseAccess(configuredDatabase.resolvedPath),
    userId.trim(),
    input
  );
}
