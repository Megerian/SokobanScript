// services/storage/StoragePersistenceService.ts

/**
 * Encapsulates usage of the StorageManager API
 * (navigator.storage.persist / persisted) to increase the chance that
 * localForage / IndexedDB data is not automatically evicted by the browser.
 *
 * The method ensurePersistentStorage() is idempotent and safe to call
 * on every app startup.
 */

export type StoragePersistenceStatus =
    | "already-persisted"
    | "granted"
    | "denied"
    | "unsupported"
    | "error"

export class StoragePersistenceService {

    /**
     * Tries to enable persistent storage for this origin.
     *
     * Returns:
     *  - "already-persisted"  → origin was already persisted
     *  - "granted"            → persistent storage has just been granted
     *  - "denied"             → browser/user did not grant persistence
     *  - "unsupported"        → API is not available in this browser
     *  - "error"              → unexpected error (see console)
     */
    static async ensurePersistentStorage(): Promise<StoragePersistenceStatus> {
        try {
            const nav: any = navigator

            // Feature detection
            if (!nav.storage ||
                typeof nav.storage.persisted !== "function" ||
                typeof nav.storage.persist !== "function") {
                console.info("[StoragePersistence] StorageManager API not supported.")
                return "unsupported"
            }

            // Check if storage is already persisted for this origin
            const isPersisted: boolean = await nav.storage.persisted()
            if (isPersisted) {
                console.info("[StoragePersistence] Storage is already persisted.")
                return "already-persisted"
            }

            // Request persistent storage
            const granted: boolean = await nav.storage.persist()
            if (granted) {
                console.info("[StoragePersistence] Persistent storage granted.")
                return "granted"
            } else {
                console.info("[StoragePersistence] Persistent storage NOT granted.")
                return "denied"
            }

        } catch (error) {
            console.error("[StoragePersistence] Error while requesting persistent storage:", error)
            return "error"
        }
    }
}