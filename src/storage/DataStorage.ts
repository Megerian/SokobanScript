import localforage from "localforage"
import { Snapshot } from "../Sokoban/domainObjects/Snapshot"
import { Solution } from "../Sokoban/domainObjects/Solution"
import { Metrics } from "../Sokoban/domainObjects/Metrics"
import { Board } from "../board/Board"

/**
 * DTO for a cached Letslogic collection, stored in localforage.
 * The collection is identified by its Letslogic collection id.
 */
export interface StoredLetslogicCollectionDTO {
    id: number
    title: string
    author: string
    puzzles: Array<{
        boardString: string
        title: string
        author: string
        letsLogicID: number
        puzzleNumber: number
    }>
}

/**
 * DTO for a snapshot/solution stored in localforage.
 */
export interface StoredSnapshotDTO {
    lurd: string
    name: string
    notes: string
    isSolution: boolean
    moveCount: number
    pushCount: number
    boxLineCount: number
    boxChangeCount: number
    pushingSessionCount: number
    playerLineCount: number
}

/**
 * Container for all snapshots/solutions belonging to a specific board.
 *
 * Storage format:
 *  - boardString: normalized layout of the board (so we can reconstruct/export later)
 *  - snapshots:  list of snapshot/solution DTOs
 *
 * All boards that produce the same normalized board string share one entry.
 */
export interface StoredBoardSnapshotsDTO {
    boardString: string
    snapshots: StoredSnapshotDTO[]
}

/**
 * DTO for Letslogic submissions.
 * One entry represents a solution that has been successfully submitted
 * for a specific (apiKey, letslogicId) pair.
 */
interface StoredSubmittedSolutionDTO {
    apiKey: string
    letslogicId: number
    moveCount: number
    pushCount: number
}

/**
 * DataStorage is a small persistence layer on top of localforage.
 *
 * Responsibilities:
 *  - store/load/delete snapshots and solutions per board
 *  - export all stored boards with their snapshots/solutions
 *  - track which solutions have already been submitted to Letslogic
 *
 * Board identity
 * --------------
 * A board is identified by its normalized board string
 * (getBoardAsString() with trailing whitespace removed).
 *
 * The normalized board string is:
 *  - used as part of the storage key (URL-encoded)
 *  - stored again inside the value (boardString) for export and sanity.
 */
export class DataStorage {

    /**
     * Configure the localforage storage.
     */
    static init(): void {
        localforage.config({
            name:        "Sokoban Typescript",
            description: "DataStorage for Sokoban Typescript"
        })
    }

    // -------------------------------------------------------------------------
    // Key helpers
    // -------------------------------------------------------------------------

    /**
     * Returns the normalized board string for a board:
     *  - uses Board.getBoardAsString()
     *  - removes trailing whitespace, but keeps internal spaces and newlines
     *
     * This must be stable: equal boards must produce equal normalized strings.
     */
    private static getNormalizedBoardString(board: Board): string {
        const raw = board.getBoardAsString()
        // Remove trailing whitespace (spaces, tabs, newlines) to avoid
        // accidental differences caused by formatting.
        return raw.replace(/\s+$/u, "")
    }

    /**
     * Returns the storage key for all snapshots/solutions belonging to the given board.
     *
     * We use the *normalized* board string and URL-encode it so the key is
     * debugging-friendly but safe for localforage/IndexedDB.
     *
     * Example:
     *   "####\n#.@#\n####"
     * becomes
     *   snapshots:%23%23%23%23%0A%23.%40%23%0A%23%23%23%23
     */
    private static getSnapshotStorageKey(board: Board): string {
        const normalizedBoard = this.getNormalizedBoardString(board)
        const encoded = encodeURIComponent(normalizedBoard)
        return `snapshots:${encoded}`
    }

    /**
     * Returns the storage key for Letslogic submissions for the given API key
     * and Letslogic ID.
     *
     * We do not expose the raw apiKey in the key to make debugging cleaner,
     * but this is not a security feature.
     */
    private static getLetslogicStorageKey(apiKey: string, letslogicId: number): string {
        const apiKeyHash = this.simpleHashString(apiKey)
        return `letslogic:${apiKeyHash}:${letslogicId}`
    }

    /**
     * Simple deterministic hash function for strings.
     * Not cryptographically secure, but sufficient for keying Letslogic entries.
     */
    private static simpleHashString(value: string): string {
        let hash = 0
        for (let i = 0; i < value.length; i++) {
            const chr = value.charCodeAt(i)
            hash = ((hash << 5) - hash) + chr
            hash |= 0 // Convert to 32-bit integer
        }
        return hash.toString(16)
    }

    // -------------------------------------------------------------------------
    // Internal helpers for board + snapshot container
    // -------------------------------------------------------------------------

    /**
     * Loads the StoredBoardSnapshotsDTO for the given board.
     *
     * Behavior:
     *  - If nothing is stored yet, returns an empty DTO with the current boardString.
     *  - If the stored value is an array<StoredSnapshotDTO>, wraps it into a DTO
     *    (legacy format support).
     *  - If the stored value is already a StoredBoardSnapshotsDTO, returns it
     *    with defensive defaults.
     */
    private static async loadBoardSnapshotsEntry(board: Board): Promise<StoredBoardSnapshotsDTO> {
        const key = this.getSnapshotStorageKey(board)
        const normalizedBoardString = this.getNormalizedBoardString(board)

        const raw = await localforage.getItem<StoredSnapshotDTO[] | StoredBoardSnapshotsDTO>(key)

        // Nothing stored yet -> empty container with current boardString.
        if (!raw) {
            return {
                boardString: normalizedBoardString,
                snapshots:   []
            }
        }

        // Legacy format: plain array of snapshots (no boardString in the value).
        if (Array.isArray(raw)) {
            return {
                boardString: normalizedBoardString,
                snapshots:   raw
            }
        }

        // Expected format: StoredBoardSnapshotsDTO.
        const dto = raw as StoredBoardSnapshotsDTO

        // Be defensive: ensure boardString and snapshots exist.
        const boardString = typeof dto.boardString === "string" && dto.boardString.length > 0
            ? dto.boardString
            : normalizedBoardString

        const snapshots = Array.isArray(dto.snapshots) ? dto.snapshots : []

        return {
            boardString,
            snapshots
        }
    }

    /**
     * Stores the given StoredBoardSnapshotsDTO for the given board.
     * Ensures that boardString is populated and normalized before writing.
     */
    private static async saveBoardSnapshotsEntry(
        board: Board,
        entry: StoredBoardSnapshotsDTO
    ): Promise<void> {

        const key = this.getSnapshotStorageKey(board)
        const normalizedBoardString = this.getNormalizedBoardString(board)

        if (!entry.boardString || entry.boardString.length === 0) {
            entry.boardString = normalizedBoardString
        } else {
            // Keep the stored boardString but also normalize trailing whitespace
            entry.boardString = entry.boardString.replace(/\s+$/u, "")
        }

        await localforage.setItem(key, entry)
    }

    // -------------------------------------------------------------------------
    // Loading all boards with snapshots (for export)
    // -------------------------------------------------------------------------

    /**
     * Loads all StoredBoardSnapshotsDTO entries that are currently stored in localforage.
     *
     * Any entry that does not contain a valid boardString and a snapshots array
     * is simply skipped and not processed further.
     *
     * This method does not rely on the exact key format; it only inspects values.
     */
    static async loadAllBoardsWithSnapshots(): Promise<StoredBoardSnapshotsDTO[]> {
        const result: StoredBoardSnapshotsDTO[] = []

        await localforage.iterate<unknown, void>((value, key) => {

            // We are only interested in snapshot entries
            if (typeof key !== "string" || !key.startsWith("snapshots:")) {
                return
            }

            if (!value || typeof value !== "object") {
                return
            }

            const dto = value as Partial<StoredBoardSnapshotsDTO>

            if (typeof dto.boardString !== "string" || !Array.isArray(dto.snapshots)) {
                // Entry has no usable board information -> ignore it.
                return
            }

            result.push({
                boardString: dto.boardString,
                snapshots:   dto.snapshots.slice() // shallow copy for safety
            })
        })

        return result
    }

    // -------------------------------------------------------------------------
    // Snapshots / solutions storage
    // -------------------------------------------------------------------------

    /**
     * Stores a snapshot or solution for the given board.
     * If an entry with the same LURD and type already exists, it is not added again.
     *
     * ➜ Perfect for auto-save:
     *    duplicate solutions are silently ignored,
     *    there is no UI message here.
     */
    static async storeSnapshot(board: Board, snapshot: Snapshot | Solution): Promise<void> {
        const entry = await this.loadBoardSnapshotsEntry(board)
        const isSolution = snapshot instanceof Solution

        // Duplicate check (LURD + isSolution)
        if (entry.snapshots.some(s => s.lurd === snapshot.lurd && s.isSolution === isSolution)) {
            return // Already stored – do nothing.
        }

        entry.snapshots.push({
            lurd: snapshot.lurd,
            name: snapshot.name,
            notes: snapshot.notes,
            isSolution,
            moveCount: snapshot.moveCount,
            pushCount: snapshot.pushCount,
            boxLineCount: snapshot.boxLineCount,
            boxChangeCount: snapshot.boxChangeCount,
            pushingSessionCount: snapshot.pushingSessionCount,
            playerLineCount: snapshot.playerLineCount
        })

        await this.saveBoardSnapshotsEntry(board, entry)
    }

    /** Convenience wrapper for storing a solution explicitly. */
    static async storeSolution(board: Board, solution: Solution): Promise<void> {
        return this.storeSnapshot(board, solution)
    }

    /**
     * Loads all snapshots and solutions that have been stored for the given board.
     * Any identical board (same normalized getBoardAsString()) will share these entries.
     */
    static async loadSnapshotsAndSolutions(board: Board): Promise<(Snapshot | Solution)[]> {
        const entry = await this.loadBoardSnapshotsEntry(board)
        const stored = entry.snapshots

        return stored.map(dto => {
            const metrics = new Metrics()
            metrics.moveCount           = dto.moveCount
            metrics.pushCount           = dto.pushCount
            metrics.boxLineCount        = dto.boxLineCount
            metrics.boxChangeCount      = dto.boxChangeCount
            metrics.pushingSessionCount = dto.pushingSessionCount
            metrics.playerLineCount     = dto.playerLineCount

            const snap = dto.isSolution
                ? new Solution(dto.lurd, metrics)
                : new Snapshot(dto.lurd, metrics)

            snap.name  = dto.name
            snap.notes = dto.notes
            return snap
        })
    }

    /**
     * Deletes a snapshot or solution from storage for the given board.
     * Matching is done by (lurd, isSolution).
     */
    static async deleteSnapshot(board: Board, snapshot: Snapshot | Solution): Promise<void> {
        const entry = await this.loadBoardSnapshotsEntry(board)
        const isSolution = snapshot instanceof Solution

        entry.snapshots = entry.snapshots.filter(s =>
            !(s.lurd === snapshot.lurd && s.isSolution === isSolution)
        )

        await this.saveBoardSnapshotsEntry(board, entry)
    }

    /**
     * Stores multiple snapshots/solutions for the given board in a single
     * read-modify-write operation.
     *
     * This avoids race conditions that can occur when calling storeSnapshot
     * many times in parallel for the same board.
     */
    static async storeSnapshotsBulk(board: Board, snapshots: (Snapshot | Solution)[]): Promise<void> {
        if (snapshots.length === 0) {
            return
        }

        const entry = await this.loadBoardSnapshotsEntry(board)

        for (const snapshot of snapshots) {
            const isSolution = snapshot instanceof Solution

            // Duplicate check (LURD + isSolution)
            if (entry.snapshots.some(s => s.lurd === snapshot.lurd && s.isSolution === isSolution)) {
                continue
            }

            entry.snapshots.push({
                lurd: snapshot.lurd,
                name: snapshot.name,
                notes: snapshot.notes,
                isSolution,
                moveCount: snapshot.moveCount,
                pushCount: snapshot.pushCount,
                boxLineCount: snapshot.boxLineCount,
                boxChangeCount: snapshot.boxChangeCount,
                pushingSessionCount: snapshot.pushingSessionCount,
                playerLineCount: snapshot.playerLineCount
            })
        }

        await this.saveBoardSnapshotsEntry(board, entry)
    }

    // -------------------------------------------------------------------------
    // Letslogic – submitted solutions storage
    // -------------------------------------------------------------------------

    /**
     * Loads all previously submitted solutions for the given (apiKey, letslogicId) pair.
     */
    static async loadSubmittedLetslogicSolutions(
        apiKey: string,
        letslogicId: number
    ): Promise<StoredSubmittedSolutionDTO[]> {

        const key = this.getLetslogicStorageKey(apiKey, letslogicId)
        const stored = (await localforage.getItem<StoredSubmittedSolutionDTO[]>(key)) ?? []
        return stored
    }

    /**
     * Stores a successfully submitted solution for the given (apiKey, letslogicId) pair.
     * The plain apiKey and letslogicId are stored in the DTO, as requested.
     */
    static async storeSubmittedLetslogicSolution(
        apiKey: string,
        letslogicId: number,
        moveCount: number,
        pushCount: number
    ): Promise<void> {

        const key = this.getLetslogicStorageKey(apiKey, letslogicId)
        const existing = (await localforage.getItem<StoredSubmittedSolutionDTO[]>(key)) ?? []

        existing.push({
            apiKey,
            letslogicId,
            moveCount,
            pushCount
        })

        await localforage.setItem(key, existing)
    }

    // -------------------------------------------------------------------------
    // Letslogic – cached collections (imported from Letslogic)
    // -------------------------------------------------------------------------

    // ---- Keys for cached Letslogic collections ----
    private static readonly LETSLOGIC_COLLECTION_INDEX_KEY = "ll:collections:index"
    private static letslogicCollectionKey(id: number): string { return `ll:collection:${id}` }

    /** Stores/overwrites a Letslogic collection and keeps the id in the index. */
    static async storeLetslogicCollection(id: number, dto: StoredLetslogicCollectionDTO): Promise<void> {
        if (!Number.isFinite(id) || id <= 0) return
        dto.id = id
        await localforage.setItem(this.letslogicCollectionKey(id), dto)

        const index = (await localforage.getItem<number[]>(this.LETSLOGIC_COLLECTION_INDEX_KEY)) ?? []
        if (!index.includes(id)) {
            index.push(id)
            await localforage.setItem(this.LETSLOGIC_COLLECTION_INDEX_KEY, index)
        }
    }

    /** Loads a single cached Letslogic collection by id. */
    static async loadLetslogicCollection(id: number): Promise<StoredLetslogicCollectionDTO | null> {
        if (!Number.isFinite(id) || id <= 0) return null
        const dto = await localforage.getItem<StoredLetslogicCollectionDTO>(this.letslogicCollectionKey(id))
        return dto ?? null
    }

    /** Loads all cached Letslogic collections (by iterating index). */
    static async loadAllLetslogicCollections(): Promise<StoredLetslogicCollectionDTO[]> {
        const index = (await localforage.getItem<number[]>(this.LETSLOGIC_COLLECTION_INDEX_KEY)) ?? []
        const results: StoredLetslogicCollectionDTO[] = []
        for (const id of index) {
            const dto = await localforage.getItem<StoredLetslogicCollectionDTO>(this.letslogicCollectionKey(id))
            if (dto && typeof dto.title === "string" && Array.isArray(dto.puzzles)) {
                results.push(dto)
            }
        }
        return results
    }

    /** Deletes a cached Letslogic collection by id and updates the index. */
    static async deleteLetslogicCollection(id: number): Promise<void> {
        if (!Number.isFinite(id) || id <= 0) return
        await localforage.removeItem(this.letslogicCollectionKey(id))
        const index = (await localforage.getItem<number[]>(this.LETSLOGIC_COLLECTION_INDEX_KEY)) ?? []
        const next = index.filter(x => x !== id)
        if (next.length !== index.length) {
            await localforage.setItem(this.LETSLOGIC_COLLECTION_INDEX_KEY, next)
        }
    }
}
