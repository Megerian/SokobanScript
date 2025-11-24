import localforage from "localforage"
import { Snapshot } from "../Sokoban/domainObjects/Snapshot"
import { Solution } from "../Sokoban/domainObjects/Solution"
import { Metrics } from "../Sokoban/domainObjects/Metrics"
import { Board } from "../board/Board"

interface StoredSnapshotDTO {
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

export class DataStorage {

    static exportDatabaseContentToFile() {
        const myJson = JSON.stringify("test")
        const element = document.createElement("a")
        element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(myJson))
        element.setAttribute("download", "Sokoban data.json")
        element.style.display = "none"
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    /**
     * Configure the localforage storage.
     */
    static init() {
        localforage.config({
            name:        "Sokoban Typescript",
            description: "DataStorage for Sokoban Typescript"
        })
    }

    /**
     * Returns the storage key for all snapshots/solutions belonging to the given board.
     * Identical boards (same layout string) share the same key and therefore
     * the same snapshots and solutions.
     */
    private static getSnapshotStorageKey(board: Board): string {
        const boardString = board.getBoardAsString()
        const hash = DataStorage.hashString(boardString)
        return `snapshots:${hash}`
    }

    /**
     * Returns the storage key for Letslogic submissions for the given API key and Letslogic ID.
     * We hash the API key for the key string, but the plain key is still stored in the value.
     */
    private static getLetslogicStorageKey(apiKey: string, letslogicId: number): string {
        const apiKeyHash = DataStorage.hashString(apiKey)
        return `letslogic:${apiKeyHash}:${letslogicId}`
    }

    /**
     * Simple deterministic hash function for strings.
     * Not cryptographically secure, but fine for keying.
     */
    private static hashString(value: string): string {
        let hash = 0
        for (let i = 0; i < value.length; i++) {
            const chr = value.charCodeAt(i)
            hash = ((hash << 5) - hash) + chr
            hash |= 0 // Convert to 32bit integer
        }
        return hash.toString(16)
    }

    /**
     * Stores a snapshot or solution for the given board.
     * If an entry with the same LURD and type already exists, it is not added again.
     *
     * ➜ Perfect for auto-save:
     *    duplicate solutions are silently ignored,
     *    there is no UI message here.
     */
    static async storeSnapshot(board: Board, snapshot: Snapshot | Solution): Promise<void> {
        const key = this.getSnapshotStorageKey(board)

        const existing = (await localforage.getItem<StoredSnapshotDTO[]>(key)) ?? []

        const isSolution = snapshot instanceof Solution

        // Duplicate check (LURD + isSolution)
        if (existing.some(s => s.lurd === snapshot.lurd && s.isSolution === isSolution)) {
            return // Already stored – do nothing.
        }

        existing.push({
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

        await localforage.setItem(key, existing)
    }

    /** Convenience wrapper for storing a solution explicitly. */
    static async storeSolution(board: Board, solution: Solution): Promise<void> {
        return this.storeSnapshot(board, solution)
    }

    /**
     * Loads all snapshots and solutions that have been stored for the given board.
     * Any identical board (same getBoardAsString()) will share these entries.
     */
    static async loadSnapshotsAndSolutions(board: Board): Promise<(Snapshot | Solution)[]> {
        const key = this.getSnapshotStorageKey(board)
        const stored = (await localforage.getItem<StoredSnapshotDTO[]>(key)) ?? []

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
     */
    static async deleteSnapshot(board: Board, snapshot: Snapshot | Solution): Promise<void> {
        const key = this.getSnapshotStorageKey(board)
        const existing = (await localforage.getItem<StoredSnapshotDTO[]>(key)) ?? []

        const isSolution = snapshot instanceof Solution

        const filtered = existing.filter(s =>
            !(s.lurd === snapshot.lurd && s.isSolution === isSolution)
        )

        await localforage.setItem(key, filtered)
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

        const key = this.getSnapshotStorageKey(board)
        const existing = (await localforage.getItem<StoredSnapshotDTO[]>(key)) ?? []

        for (const snapshot of snapshots) {
            const isSolution = snapshot instanceof Solution

            // Duplicate check (LURD + isSolution)
            if (existing.some(s => s.lurd === snapshot.lurd && s.isSolution === isSolution)) {
                continue
            }

            existing.push({
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

        await localforage.setItem(key, existing)
    }
}
