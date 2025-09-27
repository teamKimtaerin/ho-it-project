import { StateCreator } from 'zustand'
import { SelectionBox } from '../../types'

export interface SelectionSlice {
  // Selection state (체크박스용 - 다중 선택)
  selectedClipIds: Set<string>
  setSelectedClipIds: (ids: Set<string>) => void
  toggleClipSelection: (clipId: string, multiSelect: boolean) => void
  clearSelection: () => void
  addToSelection: (clipIds: string[]) => void

  // Active clip state (포커스용 - 단일 선택)
  activeClipId: string | null
  setActiveClipId: (clipId: string | null) => void

  // Selection box state
  isSelecting: boolean
  setIsSelecting: (selecting: boolean) => void
  selectionBox: SelectionBox
  setSelectionBox: (box: SelectionBox) => void

  // Group selection state (press and drag)
  isGroupSelecting: boolean
  groupSelectionStartClipId: string | null
  startClipGroupSelection: (clipId: string) => void
  endClipGroupSelection: () => void
  addToClipGroupSelection: (clipId: string) => void
}

export const createSelectionSlice: StateCreator<SelectionSlice> = (
  set,
  get
) => ({
  // Selection state (체크박스용)
  selectedClipIds: new Set<string>(),

  setSelectedClipIds: (ids) => set({ selectedClipIds: ids }),

  toggleClipSelection: (clipId, multiSelect) => {
    set((state) => {
      const newSet = new Set(state.selectedClipIds)

      if (multiSelect) {
        // Toggle selection for multi-select
        if (newSet.has(clipId)) {
          newSet.delete(clipId)
        } else {
          newSet.add(clipId)
        }
      } else {
        // Single select - clear others
        newSet.clear()
        newSet.add(clipId)
      }

      return { selectedClipIds: newSet }
    })
  },

  clearSelection: () => set({ selectedClipIds: new Set<string>() }),

  addToSelection: (clipIds) => {
    set((state) => {
      const newSet = new Set(state.selectedClipIds)
      clipIds.forEach((id) => newSet.add(id))
      return { selectedClipIds: newSet }
    })
  },

  // Active clip state (포커스용)
  activeClipId: null,

  setActiveClipId: (clipId) => set({ activeClipId: clipId }),

  // Selection box state
  isSelecting: false,
  setIsSelecting: (selecting) => set({ isSelecting: selecting }),

  selectionBox: {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  },

  setSelectionBox: (box) => set({ selectionBox: box }),

  // Group selection state (press and drag)
  isGroupSelecting: false,
  groupSelectionStartClipId: null,

  startClipGroupSelection: (clipId) => {
    console.log(
      '[SelectionSlice] Starting clip group selection with clip:',
      clipId
    )
    const currentState = get()
    const newSet = new Set(currentState.selectedClipIds)
    newSet.add(clipId)
    console.log('[SelectionSlice] New selected clips:', Array.from(newSet))
    set({
      isGroupSelecting: true,
      groupSelectionStartClipId: clipId,
      selectedClipIds: newSet,
    })
  },

  endClipGroupSelection: () => {
    console.log('[SelectionSlice] Ending clip group selection')
    set({
      isGroupSelecting: false,
      groupSelectionStartClipId: null,
    })
  },

  addToClipGroupSelection: (clipId) => {
    const currentState = get()
    if (!currentState.isGroupSelecting) {
      console.log('[SelectionSlice] Not in clip group selection mode, skipping')
      return
    }

    const newSet = new Set(currentState.selectedClipIds)
    newSet.add(clipId)
    console.log(
      '[SelectionSlice] Added clip to selection:',
      clipId,
      'Total selected:',
      Array.from(newSet)
    )
    set({ selectedClipIds: newSet })
  },
})
