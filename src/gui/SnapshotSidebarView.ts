// SnapshotSidebarView.ts
import { Snapshot } from "../Sokoban/domainObjects/Snapshot"
import { Solution } from "../Sokoban/domainObjects/Solution"

export interface SnapshotSidebarCallbacks {
    onSetSnapshot(snapshot: Snapshot): void
    onCopySnapshot(snapshot: Snapshot): void
    onDeleteSnapshot(snapshot: Snapshot): void
}

export class SnapshotSidebarView {

    private showSolutions = true
    private showSnapshots = true
    private isDeleteSnapshotMode = false

    private contextMenuSnapshot: Snapshot | null = null

    constructor(
        private readonly snapshotList: HTMLDivElement,
        private readonly snapshotSidebar: HTMLDivElement,
        private readonly deleteSnapshotButton: HTMLButtonElement,
        private readonly filterSolutionsButton: HTMLButtonElement,
        private readonly filterSnapshotsButton: HTMLButtonElement,
        private readonly contextMenu: HTMLDivElement | null,
        private readonly callbacks: SnapshotSidebarCallbacks
    ) {
        this.initFilterButtons()
        this.initContextMenuGlobalListeners()
    }

    /** Removes all snapshot/solution items from the sidebar list. */
    clear(): void {
        const items = this.snapshotList.querySelectorAll(".item")
        items.forEach(item => item.remove())
    }

    /**
     * Rebuilds the sidebar list from ordered solutions and snapshots.
     * "orderedSolutions" should already contain the best solutions at the front.
     */
    renderSnapshotList(
        orderedSolutions: Solution[],
        snapshots: Snapshot[],
        bestByPush: Snapshot | null,
        bestByMove: Snapshot | null
    ): void {
        this.clear()

        const isBestPush = (s: Snapshot) =>
            bestByPush != null && s.uniqueID === bestByPush.uniqueID
        const isBestMove = (s: Snapshot) =>
            bestByMove != null && s.uniqueID === bestByMove.uniqueID

        // 1) All solutions (with best markers)
        for (const solution of orderedSolutions) {
            this.addSnapshotListItem(
                solution,
                isBestPush(solution),
                isBestMove(solution)
            )
        }

        // 2) All snapshots
        for (const snapshot of snapshots) {
            this.addSnapshotListItem(snapshot, false, false)
        }

        this.applySnapshotFilters()
    }

    /** Toggles delete mode for snapshots/solutions. */
    toggleDeleteMode(): void {
        this.isDeleteSnapshotMode = !this.isDeleteSnapshotMode

        if (this.isDeleteSnapshotMode) {
            this.snapshotSidebar.classList.add("delete-mode")
            this.deleteSnapshotButton.classList.add("red")
            this.deleteSnapshotButton.innerHTML = '<i class="check icon"></i> Done deleting'
        } else {
            this.snapshotSidebar.classList.remove("delete-mode")
            this.deleteSnapshotButton.classList.remove("red")
            this.deleteSnapshotButton.innerHTML = '<i class="trash icon"></i> Delete snapshots'
        }
    }

    /** Toggles visibility of solution items in the snapshot list. */
    toggleSolutionFilter(): void {
        this.showSolutions = !this.showSolutions
        this.updateFilterButtonState(this.filterSolutionsButton, this.showSolutions)
        this.applySnapshotFilters()
    }

    /** Toggles visibility of snapshot items in the snapshot list. */
    toggleSnapshotFilter(): void {
        this.showSnapshots = !this.showSnapshots
        this.updateFilterButtonState(this.filterSnapshotsButton, this.showSnapshots)
        this.applySnapshotFilters()
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    private addSnapshotListItem(
        snapshot: Snapshot,
        isBestByPush: boolean,
        isBestByMove: boolean
    ): void {

        const isSolution = snapshot instanceof Solution
        const cssClass   = isSolution ? "solution" : "snapshot"

        const snapshotItem = document.createElement("div")
        snapshotItem.classList.add("item", cssClass)
        snapshotItem.id = "snapshot" + snapshot.uniqueID

        if (isSolution && (isBestByPush || isBestByMove)) {
            snapshotItem.classList.add("best-solution")
        }

        // Icon
        const icon = document.createElement("i")
        icon.classList.add(isSolution ? "star" : "camera", "icon")
        if (isSolution && (isBestByPush || isBestByMove)) {
            icon.classList.add("yellow")
        }

        // Content
        const contentDiv = document.createElement("div")
        contentDiv.classList.add("content")

        const headerDiv = document.createElement("div")
        headerDiv.classList.add("header")

        if (isSolution) {
            if (isBestByPush && isBestByMove) {
                headerDiv.innerText = "Best solution (moves & pushes)"
            } else if (isBestByPush) {
                headerDiv.innerText = "Best solution (pushes)"
            } else if (isBestByMove) {
                headerDiv.innerText = "Best solution (moves)"
            } else {
                headerDiv.innerText = "Solution"
            }
        } else {
            headerDiv.innerText = "Snapshot"
        }

        const descriptionDiv = document.createElement("div")
        descriptionDiv.classList.add("description")
        descriptionDiv.innerText = `${snapshot.moveCount} moves / ${snapshot.pushCount} pushes`

        contentDiv.appendChild(headerDiv)
        contentDiv.appendChild(descriptionDiv)

        // Delete icon
        const deleteIcon = document.createElement("i")
        deleteIcon.classList.add("close", "icon", "snapshot-delete-icon")
        deleteIcon.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation()
            this.callbacks.onDeleteSnapshot(snapshot)
        })

        // Right-click context menu
        snapshotItem.addEventListener("contextmenu", (event: MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()

            this.contextMenuSnapshot = snapshot
            this.openSnapshotContextMenu(event.clientX, event.clientY)
        })

        // Double click = load on board
        snapshotItem.addEventListener("dblclick", () => {
            this.callbacks.onSetSnapshot(snapshot)
        })

        snapshotItem.appendChild(icon)
        snapshotItem.appendChild(contentDiv)
        snapshotItem.appendChild(deleteIcon)

        this.snapshotList.appendChild(snapshotItem)

        ;(($("#" + snapshotItem.id) as any)).transition("jiggle", "0.5s")
    }

    private applySnapshotFilters(): void {
        const items = this.snapshotList.querySelectorAll(".item.solution, .item.snapshot") as NodeListOf<HTMLElement>

        items.forEach(item => {
            if (item.classList.contains("solution")) {
                item.style.display = this.showSolutions ? "" : "none"
            } else if (item.classList.contains("snapshot")) {
                item.style.display = this.showSnapshots ? "" : "none"
            }
        })
    }

    private updateFilterButtonState(button: HTMLButtonElement, active: boolean): void {
        if (active) {
            button.classList.add("primary", "active")
            button.classList.remove("basic")
        } else {
            button.classList.remove("primary", "active")
            button.classList.add("basic")
        }
    }

    // ---------------------------------------------------------------------
    // Context menu handling
    // ---------------------------------------------------------------------

    private openSnapshotContextMenu(x: number, y: number): void {
        if (!this.contextMenu) return

        this.updateContextMenuLabels()

        this.contextMenu.style.display = "block"
        this.contextMenu.style.left = `${x}px`
        this.contextMenu.style.top  = `${y}px`

        const rect = this.contextMenu.getBoundingClientRect()

        let left = rect.left
        let top  = rect.top

        if (rect.right > window.innerWidth) {
            left = Math.max(0, window.innerWidth - rect.width - 8)
        }
        if (rect.bottom > window.innerHeight) {
            top = Math.max(0, window.innerHeight - rect.height - 8)
        }

        this.contextMenu.style.left = `${left}px`
        this.contextMenu.style.top  = `${top}px`
    }

    private closeSnapshotContextMenu(): void {
        if (!this.contextMenu) return
        this.contextMenu.style.display = "none"
        this.contextMenuSnapshot = null
    }

    private updateContextMenuLabels(): void {
        if (!this.contextMenuSnapshot) return

        const isSolution = this.contextMenuSnapshot instanceof Solution

        const setItem    = document.getElementById("contextSetSnapshot")
        const copyItem   = document.getElementById("contextCopySnapshot")
        const deleteItem = document.getElementById("contextDeleteSnapshot")

        if (setItem) {
            setItem.innerHTML = `<i class="play icon"></i> ${
                isSolution ? "Load solution on board" : "Load snapshot on board"
            }`
        }
        if (copyItem) {
            copyItem.innerHTML = `<i class="copy icon"></i> ${
                isSolution ? "Copy solution to clipboard" : "Copy snapshot to clipboard"
            }`
        }
        if (deleteItem) {
            deleteItem.innerHTML = `<i class="trash icon"></i> ${
                isSolution ? "Delete solution" : "Delete snapshot"
            }`
        }
    }

    private initFilterButtons(): void {
        this.filterSolutionsButton.addEventListener("click", () => this.toggleSolutionFilter())
        this.filterSnapshotsButton.addEventListener("click", () => this.toggleSnapshotFilter())
        this.deleteSnapshotButton.addEventListener("click", () => this.toggleDeleteMode())
    }

    private initContextMenuGlobalListeners(): void {
        document.addEventListener("click", () => this.closeSnapshotContextMenu())
        document.addEventListener("scroll", () => this.closeSnapshotContextMenu(), true)
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                this.closeSnapshotContextMenu()
            }
        })

        document.getElementById("contextSetSnapshot")?.addEventListener("click", (e: Event) => {
            e.stopPropagation()
            if (this.contextMenuSnapshot) {
                this.callbacks.onSetSnapshot(this.contextMenuSnapshot)
            }
            this.closeSnapshotContextMenu()
        })

        document.getElementById("contextCopySnapshot")?.addEventListener("click", (e: Event) => {
            e.stopPropagation()
            if (this.contextMenuSnapshot) {
                this.callbacks.onCopySnapshot(this.contextMenuSnapshot)
            }
            this.closeSnapshotContextMenu()
        })

        document.getElementById("contextDeleteSnapshot")?.addEventListener("click", (e: Event) => {
            e.stopPropagation()
            if (this.contextMenuSnapshot) {
                this.callbacks.onDeleteSnapshot(this.contextMenuSnapshot)
            }
            this.closeSnapshotContextMenu()
        })
    }
}
