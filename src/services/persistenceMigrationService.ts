import { sessionService } from "./sessionService";
import { telemetryService } from "./telemetryService";
import { purgeLegacyUnscopedStorage } from "@/lib/userStorage";

class PersistenceMigrationService {
  private isMigrating = false;

  /**
   * Safe migration lifecycle handler:
   * Permanently purges unsafe legacy un-scoped localStorage keys upon authentication
   * to guarantee that previous users' unverified browser data cannot contaminate the current user's database.
   */
  public async runMigrationIfAuthenticated(): Promise<boolean> {
    if (this.isMigrating) return false;

    const token = sessionService.getToken();
    if (!token) return false;

    this.isMigrating = true;
    try {
      // Purge unsafe un-scoped legacy data to ensure zero cross-user leakage
      purgeLegacyUnscopedStorage();
      telemetryService.log("MIGRATION_EVENT", "Legacy storage verification completed safely.");
      return true;
    } catch (error) {
      telemetryService.error("MIGRATION_EVENT", "Migration check failed safely", {
        error: String(error),
      });
      return false;
    } finally {
      this.isMigrating = false;
    }
  }
}

export const persistenceMigrationService = new PersistenceMigrationService();
