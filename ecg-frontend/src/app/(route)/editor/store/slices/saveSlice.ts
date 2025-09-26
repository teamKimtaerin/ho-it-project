import { StateCreator } from 'zustand'

export interface SaveSlice {
  // State
  hasUnsavedChanges: boolean
  lastSavedAt: Date | null
  isSaving: boolean

  // Actions
  setHasUnsavedChanges: (hasChanges: boolean) => void
  markAsSaved: () => void
  setSaving: (isSaving: boolean) => void
}

export const createSaveSlice: StateCreator<SaveSlice> = (set) => ({
  // Initial state
  hasUnsavedChanges: false,
  lastSavedAt: null,
  isSaving: false,

  // Actions
  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

  markAsSaved: () =>
    set({
      hasUnsavedChanges: false,
      lastSavedAt: new Date(),
      isSaving: false,
    }),

  setSaving: (isSaving) => set({ isSaving }),
})
