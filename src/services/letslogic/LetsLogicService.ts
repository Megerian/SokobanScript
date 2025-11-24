import { Puzzle } from "../../Sokoban/domainObjects/Puzzle"
import { Collection } from "../../Sokoban/domainObjects/Collection"
import { LetsLogicClient } from "./LetsLogicClient"
import { Settings } from "../../app/Settings"
import { Snapshot } from "../../Sokoban/domainObjects/Snapshot"
import { Solution } from "../../Sokoban/domainObjects/Solution"
import { DataStorage } from "../../storage/DataStorage"
import { Messages } from "../../gui/Messages"

export interface LetslogicProgressCallbacks {
    /**
     * Called once when a submission run starts.
     * Typical implementation: open a modal and show the given title.
     */
    openModal: (title: string) => void

    /**
     * Updates the "status line" of the progress UI.
     * Should overwrite the previous status, not append.
     */
    setStatus: (status: string) => void

    /**
     * Appends a new line to the log area of the progress UI.
     */
    appendLine: (line: string) => void

    /**
     * Optional callback for the end of a submission run.
     * Typical implementation: show a final status text in the progress UI.
     */
    finish?: (finalStatus: string) => void
}

/**
 * Encapsulates all Letslogic-related functionality:
 *  - reading the API key from Settings
 *  - creating and caching the LetsLogicClient
 *  - determining "best" solutions (by moves / pushes)
 *  - submitting solutions of a single puzzle or a whole collection
 *  - recording submitted solutions in DataStorage
 *  - user feedback via Messages (fallback) or progress callbacks (preferred)
 *
 * The actual HTTP requests are performed by LetsLogicClient, which now talks
 * directly to the Letslogic HTTPS API (no PHP proxy required anymore).
 */
export class LetslogicService {

    private client: LetsLogicClient | null = null

    /** Helper for debug logging, reusing LetsLogicClient.DEBUG. */
    private debug(...args: unknown[]): void {
        if (LetsLogicClient.DEBUG) {
            console.log("[LetslogicService]", ...args)
        }
    }

    // ---------------------------------------------------------------------
    // Client / API key
    // ---------------------------------------------------------------------

    /**
     * Returns the trimmed Letslogic API key from Settings or null if missing/empty.
     *
     * Supports a "magic word" prefix: if the key starts with "debug:" (case-insensitive),
     * LetsLogicClient.DEBUG is enabled and the remaining part is used as the real key.
     */
    private getApiKeyFromSettings(): string | null {
        const raw = Settings.letslogicApiKey
        if (!raw) return null

        const trimmed = raw.trim()
        if (trimmed.length === 0) return null

        const DEBUG_PREFIX = "debug:"

        if (trimmed.toLowerCase().startsWith(DEBUG_PREFIX)) {
            // Magic word activates debug mode:
            LetsLogicClient.DEBUG = true

            const realKey = trimmed.substring(DEBUG_PREFIX.length).trim()
            return realKey.length > 0 ? realKey : null
        }

        // Normal case: no debug prefix
        return trimmed
    }

    /**
     * Returns a LetsLogicClient instance based on the API key in Settings.
     * If no valid key is configured, an error message is shown and `null` is returned.
     */
    private getClientOrShowError(): LetsLogicClient | null {
        const key = this.getApiKeyFromSettings()
        if (!key) {
            Messages.showErrorMessage(
                "Letslogic API key missing",
                "Please set your Letslogic API key first via the settings menu."
            )
            return null
        }

        if (!this.client) {
            this.debug("Creating new LetsLogicClient with key from settings")
            this.client = new LetsLogicClient(key)
        }

        return this.client
    }

    // ---------------------------------------------------------------------
    // Core submission logic (single puzzle)
    // ---------------------------------------------------------------------

    /**
     * Submits only the best solutions (by moves and by pushes) of the given puzzle to Letslogic,
     * taking into account previously submitted solutions for the current API key and Letslogic ID.
     *
     * The candidate set is:
     *  - best solution by moves
     *  - best solution by pushes
     * (if they are different LURD strings they are treated as two candidates)
     *
     * A candidate is only submitted if it improves upon the best already submitted
     * solution (by moves and/or pushes) for the same puzzle and API key.
     *
     * Optional progress callbacks can be used to visualize what is happening:
     *  - progress.appendLine(...) is called for detailed log messages
     *  - progress.setStatus(...) may be updated by the caller, typically per puzzle
     */
    private async submitBestSolutionsForPuzzle(
        client: LetsLogicClient,
        apiKey: string,
        puzzle: Puzzle,
        progress?: LetslogicProgressCallbacks
    ): Promise<{ submittedSuccess: number; submittedError: number; skipped: number; errorMessages: string[] }> {

        const letslogicId = puzzle.letsLogicID
        const solutions   = Array.from(puzzle.solutions.values())

        this.debug("submitBestSolutionsForPuzzle called", {
            letslogicId,
            solutionCount: solutions.length,
            puzzleTitle: puzzle.title
        })

        progress?.appendLine(
            `Puzzle ${letslogicId} – "${puzzle.title}", local solutions: ${solutions.length}`
        )

        // No valid ID or no solutions => nothing to submit.
        if (!letslogicId || letslogicId <= 0 || solutions.length === 0) {
            this.debug("No valid letslogicId or no solutions; nothing to submit.")
            progress?.appendLine("  -> No valid Letslogic ID or no solutions; nothing to submit.")
            return { submittedSuccess: 0, submittedError: 0, skipped: 0, errorMessages: [] }
        }

        // Determine best-by-push and best-by-move.
        let bestByPush: Solution | null = null
        let bestByMove: Solution | null = null

        if (solutions.length > 0) {
            const sortedByPush = [...solutions].sort(Snapshot.compareByPushQuality)
            const sortedByMove = [...solutions].sort(Snapshot.compareByMoveQuality)

            bestByPush = sortedByPush[0]
            bestByMove = sortedByMove[0]
        }

        this.debug("Best solutions determined", {
            bestByPush: bestByPush
                ? { moves: bestByPush.moveCount, pushes: bestByPush.pushCount }
                : null,
            bestByMove: bestByMove
                ? { moves: bestByMove.moveCount, pushes: bestByMove.pushCount }
                : null
        })

        if (!bestByPush && !bestByMove) {
            this.debug("No bestByPush or bestByMove, returning.")
            progress?.appendLine("  -> No best solution by moves/pushes, nothing to submit.")
            return { submittedSuccess: 0, submittedError: 0, skipped: 0, errorMessages: [] }
        }

        // Load already submitted solutions for this (apiKey, letslogicId).
        const alreadySubmitted = await DataStorage.loadSubmittedLetslogicSolutions(apiKey, letslogicId)

        const submittedMoveCounts = alreadySubmitted.map(s => s.moveCount)
        const submittedPushCounts = alreadySubmitted.map(s => s.pushCount)

        const bestSubmittedMoves  =
            submittedMoveCounts.length > 0 ? Math.min(...submittedMoveCounts) : Number.POSITIVE_INFINITY
        const bestSubmittedPushes =
            submittedPushCounts.length > 0 ? Math.min(...submittedPushCounts) : Number.POSITIVE_INFINITY

        this.debug("Already submitted stats", {
            count: alreadySubmitted.length,
            bestSubmittedMoves,
            bestSubmittedPushes
        })

        progress?.appendLine(
            `  Already submitted: count=${alreadySubmitted.length}, ` +
            `best moves=${bestSubmittedMoves === Number.POSITIVE_INFINITY ? "-" : bestSubmittedMoves}, ` +
            `best pushes=${bestSubmittedPushes === Number.POSITIVE_INFINITY ? "-" : bestSubmittedPushes}`
        )

        type Reason = "moves" | "pushes" | "both"
        const candidates = new Map<string, { solution: Solution; reason: Reason }>()

        // Candidate: best by moves.
        if (bestByMove) {
            const isBetterMoves = bestByMove.moveCount < bestSubmittedMoves
            this.debug("Check candidate 'bestByMove'", {
                moves: bestByMove.moveCount,
                pushes: bestByMove.pushCount,
                isBetterMoves
            })
            progress?.appendLine(
                `  Best-by-moves candidate: moves=${bestByMove.moveCount}, pushes=${bestByMove.pushCount}, ` +
                `better than already submitted moves: ${isBetterMoves}`
            )
            if (isBetterMoves) {
                candidates.set(bestByMove.lurd, { solution: bestByMove, reason: "moves" })
            }
        }

        // Candidate: best by pushes.
        if (bestByPush) {
            const isBetterPushes = bestByPush.pushCount < bestSubmittedPushes
            this.debug("Check candidate 'bestByPush'", {
                moves: bestByPush.moveCount,
                pushes: bestByPush.pushCount,
                isBetterPushes
            })
            progress?.appendLine(
                `  Best-by-pushes candidate: moves=${bestByPush.moveCount}, pushes=${bestByPush.pushCount}, ` +
                `better than already submitted pushes: ${isBetterPushes}`
            )
            if (isBetterPushes) {
                const existing = candidates.get(bestByPush.lurd)
                if (existing) {
                    // Same solution is also best by pushes => mark as both.
                    existing.reason = existing.reason === "moves" ? "both" : existing.reason
                } else {
                    candidates.set(bestByPush.lurd, { solution: bestByPush, reason: "pushes" })
                }
            }
        }

        let submittedSuccess = 0
        let submittedError   = 0
        let skipped          = 0
        const errorMessages: string[] = []

        const candidateInfos = Array.from(candidates.values()).map(c => ({
            moves:  c.solution.moveCount,
            pushes: c.solution.pushCount,
            reason: c.reason
        }))

        this.debug("Candidates to submit", {
            candidateCount: candidates.size,
            candidates: candidateInfos
        })

        if (candidates.size > 0) {
            progress?.appendLine(
                `  Candidates to submit: ${candidates.size} ` +
                candidateInfos
                    .map(c => `[moves=${c.moves}, pushes=${c.pushes}, reason=${c.reason}]`)
                    .join(", ")
            )
        }

        // If none of the locally best solutions is better than already submitted ones.
        if (candidates.size === 0) {
            const locallyBestCount = (bestByMove ? 1 : 0) + (bestByPush ? 1 : 0)
            const distinctLocalBest =
                locallyBestCount === 2 && bestByMove && bestByPush && bestByMove.lurd === bestByPush.lurd
                    ? 1
                    : locallyBestCount

            skipped = distinctLocalBest
            this.debug("No candidate better than already submitted ones", { skipped })
            progress?.appendLine(
                `  -> No locally best solution better than already submitted ones; skipped ${skipped}.`
            )
            return { submittedSuccess, submittedError, skipped, errorMessages }
        }

        // Submit each distinct candidate at most once.
        for (const { solution, reason } of candidates.values()) {
            this.debug("Submitting candidate to Letslogic", {
                letslogicId,
                moves: solution.moveCount,
                pushes: solution.pushCount,
                reason
            })

            progress?.appendLine(
                `  Sending solution (moves=${solution.moveCount}, pushes=${solution.pushCount}, reason=${reason})...`
            )

            const answer = await client.submitSolution(letslogicId, solution.lurd)

            this.debug("Letslogic answer for candidate", answer)

            if (answer && !answer.error) {
                submittedSuccess++
                await DataStorage.storeSubmittedLetslogicSolution(
                    apiKey,
                    letslogicId,
                    solution.moveCount,
                    solution.pushCount
                )
                this.debug("Stored submitted solution locally", {
                    letslogicId,
                    moves: solution.moveCount,
                    pushes: solution.pushCount
                })

                const blue  = answer.blue
                    ? `blue: moves=${answer.blue.moves}, pushes=${answer.blue.pushes}, rank=${answer.blue.rank}, points=${answer.blue.points}`
                    : ""
                const green = answer.green
                    ? `green: moves=${answer.green.moves}, pushes=${answer.green.pushes}, rank=${answer.green.rank}, points=${answer.green.points}`
                    : ""
                const extra = [blue, green].filter(Boolean).join(" | ")

                progress?.appendLine(
                    `    -> OK: ${answer.result ?? "success"}${extra ? " [" + extra + "]" : ""}`
                )
            } else {
                submittedError++

                const detail =
                    answer
                        ? (answer.error ?? JSON.stringify(answer))
                        : "No response from Letslogic (null or undefined)."

                const message =
                    `Puzzle ${letslogicId}: error submitting solution ` +
                    `(moves=${solution.moveCount}, pushes=${solution.pushCount}).\n` +
                    `Letslogic answered: ${detail}`

                errorMessages.push(message)

                console.warn(
                    "Letslogic error for puzzle",
                    letslogicId,
                    "solution", solution.lurd,
                    "=>", answer
                )

                progress?.appendLine(
                    `    -> ERROR: ${detail}`
                )
            }
        }

        // How many locally best solutions did we *not* submit?
        const locallyBestCount = (bestByMove ? 1 : 0) + (bestByPush ? 1 : 0)
        const distinctLocalBest =
            locallyBestCount === 2 && bestByMove && bestByPush && bestByMove.lurd === bestByPush.lurd
                ? 1
                : locallyBestCount

        skipped = distinctLocalBest - candidates.size

        this.debug("Submission summary for puzzle", {
            letslogicId,
            submittedSuccess,
            submittedError,
            skipped
        })

        progress?.appendLine(
            `  Summary for puzzle ${letslogicId}: ` +
            `${submittedSuccess} submitted, ${submittedError} errors, ${skipped} skipped.`
        )

        return { submittedSuccess, submittedError, skipped, errorMessages }
    }

    // ---------------------------------------------------------------------
    // Public API – single puzzle
    // ---------------------------------------------------------------------

    /**
     * Submits the best solutions of a single puzzle to Letslogic and shows user feedback.
     *
     * If progress callbacks are provided, a caller (e.g. GUI) can visualize
     * the sending process in a modal dialog or similar.
     * Message popups are only used as fallback when no progress callbacks are given.
     */
    async submitCurrentPuzzle(
        puzzle: Puzzle,
        progress?: LetslogicProgressCallbacks
    ): Promise<void> {
        const client = this.getClientOrShowError()
        if (!client) return

        const apiKey = this.getApiKeyFromSettings()
        if (!apiKey) return

        const letslogicId = puzzle.letsLogicID
        if (!letslogicId || letslogicId <= 0) {
            Messages.showErrorMessage(
                "Letslogic",
                "The current puzzle is not linked to a Letslogic puzzle ID.\n" +
                "Please assign a valid Letslogic ID to this puzzle first."
            )
            return
        }

        const solutions = Array.from(puzzle.solutions.values())
        if (solutions.length === 0) {
            Messages.showWarningMessage(
                "Letslogic",
                "There are no saved solutions for the current puzzle to submit."
            )
            return
        }

        this.debug("submitCurrentPuzzle called", {
            letslogicId,
            title: puzzle.title,
            solutionCount: solutions.length
        })

        progress?.openModal("Submitting solutions to Letslogic (current puzzle)")
        progress?.setStatus(`Submitting puzzle ${letslogicId} – "${puzzle.title}"...`)
        progress?.appendLine(
            `Starting submission for puzzle ${letslogicId} – "${puzzle.title}".`
        )

        const { submittedSuccess, submittedError, skipped, errorMessages } =
            await this.submitBestSolutionsForPuzzle(client, apiKey, puzzle, progress)

        let finalStatus: string

        if (submittedSuccess > 0 && submittedError === 0) {
            const skippedText = skipped > 0
                ? ` (${skipped} locally best solution(s) were not better than already submitted ones and were skipped.)`
                : ""
            finalStatus =
                `Successfully submitted ${submittedSuccess} best solution(s) of the current puzzle to Letslogic.${skippedText}`

            if (!progress) {
                Messages.showSuccessMessage(
                    "Letslogic",
                    finalStatus
                )
            }
        } else if (submittedSuccess > 0 && submittedError > 0) {
            const detailText = errorMessages.length > 0
                ? "\n\nDetails:\n" + errorMessages.join("\n\n")
                : ""

            finalStatus =
                `${submittedSuccess} best solution(s) were submitted successfully, ` +
                `${submittedError} submissions failed.`

            if (!progress) {
                Messages.showWarningMessage(
                    "Letslogic",
                    finalStatus + detailText
                )
            }
        } else if (submittedSuccess === 0 && submittedError > 0) {
            // Only errors, nothing submitted successfully.
            const detailText = errorMessages.length > 0
                ? errorMessages.join("\n\n")
                : "No further error details available."

            finalStatus = "All submission attempts for the locally best solution(s) failed."

            if (!progress) {
                Messages.showErrorMessage(
                    "Letslogic",
                    finalStatus + "\n\n" + detailText
                )
            }
        } else {
            // No candidate was better than already submitted ones.
            finalStatus =
                "No solution was submitted because all locally best solutions were not better " +
                "than those already submitted for this puzzle and API key."

            if (!progress) {
                Messages.showWarningMessage(
                    "Letslogic",
                    finalStatus
                )
            }
        }

        progress?.setStatus(finalStatus)
        progress?.appendLine("")
        progress?.appendLine("Done.")
        progress?.finish?.(finalStatus)
    }

    // ---------------------------------------------------------------------
    // Public API – whole collection
    // ---------------------------------------------------------------------

    /**
     * Submits the best solutions of all puzzles in the given collection to Letslogic.
     *
     * Only puzzles that:
     *  - have a valid Letslogic ID and
     *  - have at least one saved solution
     * are considered. For each of these puzzles only the locally best solutions
     * (by moves/pushes) are submitted, using the same rules as for a single puzzle.
     *
     * Optional progress callbacks are invoked for each puzzle, so the caller
     * can present a live log of the entire submission run.
     * Message popups are only used as fallback when no progress callbacks are given.
     */
    async submitCurrentCollection(
        collection: Collection | null,
        progress?: LetslogicProgressCallbacks
    ): Promise<void> {
        const client = this.getClientOrShowError()
        if (!client) return

        const apiKey = this.getApiKeyFromSettings()
        if (!apiKey) return

        if (!collection) {
            Messages.showErrorMessage(
                "Letslogic",
                "There is no active collection. Please select a collection first."
            )
            return
        }

        this.debug("submitCurrentCollection called", {
            collectionTitle: collection.title,
            puzzleCount: collection.puzzles.length
        })

        progress?.openModal("Submitting solutions to Letslogic (collection)")
        progress?.setStatus(`Submitting solutions of collection "${collection.title}"...`)
        progress?.appendLine(
            `Collection "${collection.title}" – puzzles: ${collection.puzzles.length}`
        )

        let totalPuzzlesWithSolutions = 0
        let submittedSuccessTotal     = 0
        let submittedErrorTotal       = 0
        let skippedTotal              = 0
        let puzzlesWithoutId          = 0
        const allErrorMessages: string[] = []

        for (const puzzle of collection.puzzles) {

            const letslogicId = puzzle.letsLogicID
            if (!letslogicId || letslogicId <= 0) {
                puzzlesWithoutId++
                this.debug("Skipping puzzle without Letslogic ID", { title: puzzle.title })
                progress?.appendLine(
                    `\n--- Skipping puzzle "${puzzle.title}" (no Letslogic ID) ---`
                )
                continue
            }

            const solutions = Array.from(puzzle.solutions.values())
            if (solutions.length === 0) {
                this.debug("Skipping puzzle without solutions", { letslogicId, title: puzzle.title })
                progress?.appendLine(
                    `\n--- Skipping puzzle ${letslogicId} – "${puzzle.title}" (no solutions) ---`
                )
                continue
            }

            totalPuzzlesWithSolutions++

            this.debug("Submitting best solutions for puzzle in collection", {
                letslogicId,
                title: puzzle.title,
                solutionCount: solutions.length
            })

            progress?.appendLine(
                `\n--- Puzzle ${letslogicId} – "${puzzle.title}" ---`
            )
            progress?.setStatus(
                `Submitting puzzle ${letslogicId} – "${puzzle.title}"...`
            )

            const { submittedSuccess, submittedError, skipped, errorMessages } =
                await this.submitBestSolutionsForPuzzle(client, apiKey, puzzle, progress)

            submittedSuccessTotal += submittedSuccess
            submittedErrorTotal   += submittedError
            skippedTotal          += skipped

            if (errorMessages.length > 0) {
                allErrorMessages.push(...errorMessages)
            }

            progress?.appendLine(
                `  => Puzzle summary: ${submittedSuccess} submitted, ${submittedError} errors, ${skipped} skipped.`
            )
        }

        this.debug("Collection submission summary", {
            totalPuzzlesWithSolutions,
            submittedSuccessTotal,
            submittedErrorTotal,
            skippedTotal,
            puzzlesWithoutId
        })

        let finalStatus: string

        if (totalPuzzlesWithSolutions === 0) {
            finalStatus = "There are no saved solutions in the current collection to submit."

            if (!progress) {
                Messages.showWarningMessage(
                    "Letslogic",
                    finalStatus
                )
            }

            progress?.setStatus(finalStatus)
            progress?.appendLine("")
            progress?.appendLine("Done.")
            progress?.finish?.(finalStatus)
            return
        }

        if (submittedSuccessTotal > 0 && submittedErrorTotal === 0) {
            const skippedText = skippedTotal > 0
                ? ` ${skippedTotal} locally best solution(s) were not better than already submitted ones and were skipped.`
                : ""
            const noIdText = puzzlesWithoutId > 0
                ? `\nNote: ${puzzlesWithoutId} puzzle(s) had no Letslogic ID and were skipped.`
                : ""

            finalStatus =
                `Successfully submitted ${submittedSuccessTotal} best solution(s) from the current collection to Letslogic.` +
                skippedText +
                noIdText

            if (!progress) {
                Messages.showSuccessMessage(
                    "Letslogic",
                    finalStatus
                )
            }
        } else if (submittedSuccessTotal > 0 && submittedErrorTotal > 0) {
            const baseText =
                `${submittedSuccessTotal} best solution(s) submitted successfully, ` +
                `${submittedErrorTotal} submissions failed.`

            const noIdText = puzzlesWithoutId > 0
                ? `\nNote: ${puzzlesWithoutId} puzzle(s) had no Letslogic ID and were skipped.`
                : ""

            const detailText = allErrorMessages.length > 0
                ? "\n\nDetails:\n" + allErrorMessages.join("\n\n")
                : ""

            finalStatus = baseText + noIdText

            if (!progress) {
                Messages.showWarningMessage(
                    "Letslogic",
                    finalStatus + detailText
                )
            }
        } else if (submittedSuccessTotal === 0 && submittedErrorTotal > 0) {
            // Only errors across the entire collection.
            const noIdText = puzzlesWithoutId > 0
                ? `\nNote: ${puzzlesWithoutId} puzzle(s) had no Letslogic ID and were skipped.`
                : ""

            const detailText = allErrorMessages.length > 0
                ? "\n\nDetails:\n" + allErrorMessages.join("\n\n")
                : ""

            finalStatus =
                "All submission attempts for locally best solutions in this collection failed." +
                noIdText

            if (!progress) {
                Messages.showErrorMessage(
                    "Letslogic",
                    finalStatus + detailText
                )
            }
        } else {
            // No candidate in the whole collection was better than already submitted ones.
            const noIdText = puzzlesWithoutId > 0
                ? `\nNote: ${puzzlesWithoutId} puzzle(s) had no Letslogic ID and were skipped.`
                : ""

            finalStatus =
                "No solution was submitted because all locally best solutions were not better " +
                "than those already submitted for this API key and their Letslogic IDs." +
                noIdText

            if (!progress) {
                Messages.showWarningMessage(
                    "Letslogic",
                    finalStatus
                )
            }
        }

        progress?.setStatus(finalStatus)
        progress?.appendLine("")
        progress?.appendLine("Done.")
        progress?.finish?.(finalStatus)
    }
}
