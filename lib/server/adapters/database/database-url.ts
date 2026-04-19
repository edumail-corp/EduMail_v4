import path from "node:path";
import { getWritableDataPath } from "@/lib/server/storage-path";

export type SupportedDatabaseUrl =
  | {
      driver: "sqlite";
      resolvedPath: string;
      sourceValue: string;
    }
  | null;

function normalizeSQLitePath(rawPath: string) {
  const trimmedPath = rawPath.trim();

  if (!trimmedPath) {
    return null;
  }

  return path.isAbsolute(trimmedPath)
    ? trimmedPath
    : getWritableDataPath(trimmedPath);
}

function parseFileUrl(value: string) {
  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol !== "file:") {
      return null;
    }

    if (!parsedUrl.pathname) {
      return null;
    }

    return parsedUrl.pathname;
  } catch {
    return null;
  }
}

function parseSQLiteUrl(value: string) {
  if (!value.startsWith("sqlite:")) {
    return null;
  }

  const rawPath = value.slice("sqlite:".length).replace(/^\/\//, "");
  return rawPath.length > 0 ? rawPath : null;
}

export function parseDatabaseUrl(value: string | undefined): SupportedDatabaseUrl {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  const sqlitePath = parseSQLiteUrl(normalizedValue) ?? parseFileUrl(normalizedValue);

  if (sqlitePath) {
    const resolvedPath = normalizeSQLitePath(sqlitePath);

    if (!resolvedPath) {
      return null;
    }

    return {
      driver: "sqlite",
      resolvedPath,
      sourceValue: normalizedValue,
    };
  }

  if (normalizedValue.includes("://") || /^[a-z]+:/i.test(normalizedValue)) {
    return null;
  }

  const resolvedPath = normalizeSQLitePath(normalizedValue);

  if (!resolvedPath) {
    return null;
  }

  return {
    driver: "sqlite",
    resolvedPath,
    sourceValue: normalizedValue,
  };
}

export function getConfiguredDatabaseUrl() {
  return parseDatabaseUrl(process.env.EDUMAILAI_DATABASE_URL);
}

export function hasSupportedConfiguredDatabaseUrl() {
  return getConfiguredDatabaseUrl() !== null;
}
