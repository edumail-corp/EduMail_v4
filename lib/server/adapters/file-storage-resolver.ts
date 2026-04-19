import type {
  FileStorageAdapter,
  FileStorageProviderId,
} from "@/lib/server/adapters/contracts";

export function dedupeFileStorageAdapters(
  primaryAdapter: FileStorageAdapter,
  additionalAdapters: readonly FileStorageAdapter[] = []
) {
  const adaptersByProvider = new Map<FileStorageProviderId, FileStorageAdapter>();

  for (const adapter of [primaryAdapter, ...additionalAdapters]) {
    adaptersByProvider.set(adapter.providerId, adapter);
  }

  return [...adaptersByProvider.values()];
}

export function resolveFileStorageAdapter(
  adapters: readonly FileStorageAdapter[],
  providerId: FileStorageProviderId | null | undefined,
  fallbackAdapter: FileStorageAdapter
) {
  if (!providerId) {
    return fallbackAdapter;
  }

  return (
    adapters.find((adapter) => adapter.providerId === providerId) ?? fallbackAdapter
  );
}
