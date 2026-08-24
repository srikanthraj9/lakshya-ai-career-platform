/**
 * Centralized, User-Scoped Browser Storage Utilities for Lakshya AI
 *
 * Ensures all user-specific client storage is partitioned strictly by `userId`
 * using the key format `lakshya:${userId}:${key}` to prevent cross-user data leakage.
 */

const STORAGE_PREFIX = "lakshya";

/**
 * Returns the namespaced storage key for a specific user.
 */
export function getUserStorageKey(userId: string, key: string): string {
  if (!userId || typeof userId !== "string") {
    throw new Error(`[userStorage] Invalid userId provided for key '${key}'`);
  }
  return `${STORAGE_PREFIX}:${userId}:${key}`;
}

/**
 * Retrieves a parsed value from user-scoped storage.
 */
export function getUserStorage<T>(userId: string | undefined | null, key: string, defaultValue: T | null = null): T | null {
  if (!userId) return defaultValue;

  try {
    const namespacedKey = getUserStorageKey(userId, key);
    const raw = localStorage.getItem(namespacedKey);
    if (raw === null || raw === undefined) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[userStorage] Failed to read key '${key}' for user '${userId}':`, error);
    return defaultValue;
  }
}

/**
 * Saves a value to user-scoped storage.
 */
export function setUserStorage<T>(userId: string | undefined | null, key: string, value: T): boolean {
  if (!userId) return false;

  try {
    const namespacedKey = getUserStorageKey(userId, key);
    localStorage.setItem(namespacedKey, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[userStorage] Failed to write key '${key}' for user '${userId}':`, error);
    return false;
  }
}

/**
 * Removes a specific key from user-scoped storage.
 */
export function removeUserStorage(userId: string | undefined | null, key: string): void {
  if (!userId) return;

  try {
    const namespacedKey = getUserStorageKey(userId, key);
    localStorage.removeItem(namespacedKey);
  } catch (error) {
    console.warn(`[userStorage] Failed to remove key '${key}' for user '${userId}':`, error);
  }
}

/**
 * Purges all storage keys belonging to a specific user.
 */
export function clearLakshyaUserStorage(userId: string | undefined | null): void {
  if (!userId) return;

  try {
    const userPrefix = `${STORAGE_PREFIX}:${userId}:`;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(userPrefix)) {
        keysToRemove.push(storageKey);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (error) {
    console.warn(`[userStorage] Failed to clear storage for user '${userId}':`, error);
  }
}

/**
 * Legacy unscoped keys that must be purged permanently upon auth changes.
 */
const LEGACY_UNSCOPED_KEYS = [
  "resumeId",
  "lakshya:target_role",
  "lakshya:career-activities",
  "lakshya:career-notifications",
  "lakshya:interview-meta",
  "lakshya:persistence-version",
  "lakshya_user",
  "lakshya_user_profile",
  "lakshya:activities",
];

/**
 * Purges all legacy un-scoped storage keys from browser localStorage.
 */
export function purgeLegacyUnscopedStorage(): void {
  try {
    // 1. Remove known exact legacy keys
    LEGACY_UNSCOPED_KEYS.forEach((k) => localStorage.removeItem(k));

    // 2. Remove legacy wildcard keys (e.g. roadmap-progress:*, lakshya:activities*)
    const wildcardKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey) {
        if (
          storageKey.startsWith("roadmap-progress:") ||
          (storageKey.startsWith("lakshya:") && !storageKey.split(":")[2]) // unscoped lakshya:*
        ) {
          wildcardKeysToRemove.push(storageKey);
        }
      }
    }

    wildcardKeysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (error) {
    console.warn("[userStorage] Failed to purge legacy unscoped storage:", error);
  }
}
