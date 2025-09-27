import type { StateCreator } from 'zustand'
import {
  type TextInsertionSlice,
  type InsertedText,
  type TextPosition,
  type TextStyle,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TEXT_ANIMATION,
  ROTATION_PRESETS,
  type RotationPreset,
  type TextAnimation,
  createInsertedText,
  isTextActiveAtTime,
} from '../../types/textInsertion'
import {
  ScenarioManager,
  type ScenarioUpdateListener,
} from '../../utils/ScenarioManager'
import type { RendererConfigV2 } from '@/app/shared/motiontext'

export type { TextInsertionSlice }

// Create a global ScenarioManager instance for the slice
let scenarioManager: ScenarioManager | null = null

// Track update state to prevent infinite loops
let isUpdating = false

// Infinite loop detection for development
const updateCallTracker = new Map<string, number>()
const lastUpdateTimes = new Map<string, number>()
const MAX_UPDATES_PER_SECOND = 10
const DETECTION_WINDOW = 1000 // 1 second

function detectInfiniteLoop(textId: string): boolean {
  const now = Date.now()
  const key = textId

  // Reset counter if more than 1 second has passed
  const lastTime = lastUpdateTimes.get(key) || 0
  if (now - lastTime > DETECTION_WINDOW) {
    updateCallTracker.set(key, 0)
  }

  // Increment counter
  const count = (updateCallTracker.get(key) || 0) + 1
  updateCallTracker.set(key, count)
  lastUpdateTimes.set(key, now)

  if (count > MAX_UPDATES_PER_SECOND) {
    console.error(
      `🚨 INFINITE LOOP DETECTED for text ${textId}: ${count} updates in ${DETECTION_WINDOW}ms`
    )
    console.trace('Update call stack:')
    return true
  }

  return false
}

// Deep comparison utility for InsertedText updates
function hasActualChanges(
  original: InsertedText,
  updates: Partial<InsertedText>
): boolean {
  // Check if any of the update values are actually different
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'updatedAt') continue // Always allow timestamp updates

    const originalValue = (original as any)[key]

    // Deep comparison for objects (like animation, style, position)
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof originalValue === 'object' &&
      originalValue !== null
    ) {
      if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
        return true
      }
    } else if (value !== originalValue) {
      return true
    }
  }
  return false
}

export const createTextInsertionSlice: StateCreator<
  TextInsertionSlice,
  [],
  [],
  TextInsertionSlice
> = (set, get) => ({
  // Initial state
  insertedTexts: [],
  selectedTextId: null,
  defaultStyle: DEFAULT_TEXT_STYLE,
  clipboard: [],
  // Scenario management state
  currentScenario: null,
  isScenarioMode: false, // Start in individual mode for editing

  // Text creation at center
  addTextAtCenter: (currentTime: number) => {
    const newText: InsertedText = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      content: '텍스트를 입력하세요',
      position: { x: 50, y: 50 }, // Center position (50%, 50%)
      startTime: currentTime,
      endTime: currentTime + 3, // Default 3 seconds duration
      style: get().defaultStyle,
      animation: DEFAULT_TEXT_ANIMATION, // 기본 회전 애니메이션 적용
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isSelected: true, // Auto-select the new text
      isEditing: false,
    }

    set((state) => {
      const newInsertedTexts = [
        ...state.insertedTexts.map((text) => ({ ...text, isSelected: false })), // Deselect others
        newText, // Add new selected text
      ]

      // Update scenario manager if initialized (always sync)
      if (scenarioManager) {
        scenarioManager.updateInsertedText(newText)
      }

      return {
        ...state,
        insertedTexts: newInsertedTexts,
        selectedTextId: newText.id,
      }
    })

    // 스티커 생성을 위해 clipSlice의 insertStickersIntoClips 호출
    try {
      const currentState = get()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clipSlice = currentState as any
      if (clipSlice.insertStickersIntoClips) {
        console.log(
          '📌 Triggering sticker creation for center text:',
          newText.id
        )
        clipSlice.insertStickersIntoClips([newText])
      }
    } catch (error) {
      console.error('Failed to create stickers for center text:', error)
    }
  },

  // Text CRUD operations
  addText: (textData) => {
    const newText: InsertedText = {
      ...textData,
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      animation: textData.animation || DEFAULT_TEXT_ANIMATION, // 기본 애니메이션 적용
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    set((state) => ({
      ...state,
      insertedTexts: [...state.insertedTexts, newText],
      selectedTextId: newText.id,
    }))

    // 스티커 생성을 위해 clipSlice의 insertStickersIntoClips 호출
    try {
      const currentState = get()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clipSlice = currentState as any
      if (clipSlice.insertStickersIntoClips) {
        console.log(
          '📌 Triggering sticker creation for new inserted text:',
          newText.id
        )
        clipSlice.insertStickersIntoClips([newText])
      }
    } catch (error) {
      console.error('Failed to create stickers for new text:', error)
    }
  },

  updateText: (id: string, updates: Partial<InsertedText>) => {
    // Detect infinite loops in development
    if (process.env.NODE_ENV === 'development' && detectInfiniteLoop(id)) {
      console.error('🛑 Stopping update to prevent infinite loop')
      return
    }

    // Prevent infinite loops
    if (isUpdating) {
      console.warn(
        '🔄 UpdateText called during update, skipping to prevent infinite loop'
      )
      return
    }

    const currentState = get()
    const originalText = currentState.insertedTexts.find(
      (text) => text.id === id
    )

    if (!originalText) {
      console.warn('🚨 UpdateText: Text not found:', id)
      return
    }

    // Check if there are actual changes to prevent unnecessary updates
    if (!hasActualChanges(originalText, updates)) {
      console.log('📝 No actual changes detected, skipping update for:', id)
      return
    }

    console.log('✅ Updating InsertedText:', id, 'with changes:', updates)

    // Set update flag
    isUpdating = true

    try {
      set((state) => {
        const updatedTexts = state.insertedTexts.map((text) =>
          text.id === id ? { ...text, ...updates, updatedAt: Date.now() } : text
        )

        // Update scenario manager if initialized (debounced)
        if (scenarioManager) {
          const updatedText = updatedTexts.find((text) => text.id === id)
          if (updatedText) {
            // Use setTimeout to debounce scenario updates
            setTimeout(() => {
              if (scenarioManager) {
                scenarioManager.updateInsertedText(updatedText)
              }
            }, 0)
          }
        }

        return {
          ...state,
          insertedTexts: updatedTexts,
        }
      })

      // REMOVED: Sync with ClipSlice stickers to break the circular dependency
      // The stickers will be updated through the scenario generation process instead
    } finally {
      // Reset update flag after a brief delay
      setTimeout(() => {
        isUpdating = false
      }, 10)
    }
  },

  deleteText: (id: string) => {
    set((state) => {
      // Update scenario manager if initialized (always sync)
      if (scenarioManager) {
        scenarioManager.removeInsertedText(id)
      }

      return {
        ...state,
        insertedTexts: state.insertedTexts.filter((text) => text.id !== id),
        selectedTextId:
          state.selectedTextId === id ? null : state.selectedTextId,
      }
    })

    // REMOVED: Sync with ClipSlice stickers to break the circular dependency
    // The stickers will be updated through the scenario generation process instead
  },

  duplicateText: (id: string) => {
    const { insertedTexts } = get()
    const originalText = insertedTexts.find((text) => text.id === id)

    if (originalText) {
      const duplicatedText: InsertedText = {
        ...originalText,
        id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        position: {
          x: Math.min(95, originalText.position.x + 5),
          y: Math.min(95, originalText.position.y + 5),
        },
        startTime: originalText.startTime + 1,
        endTime: originalText.endTime + 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSelected: false,
        isEditing: false,
      }

      set((state) => ({
        ...state,
        insertedTexts: [...state.insertedTexts, duplicatedText],
        selectedTextId: duplicatedText.id,
      }))
    }
  },

  // Selection management
  selectText: (id: string | null) => {
    console.log('🔧 selectText called:', {
      id,
      currentSelectedId: get().selectedTextId,
      textsCount: get().insertedTexts.length,
    })

    set((state) => {
      const newState = {
        ...state,
        selectedTextId: id,
        // Don't auto-open panel when text is selected
        insertedTexts: state.insertedTexts.map((text) => ({
          ...text,
          isSelected: text.id === id,
        })),
      }

      console.log('✅ selectText state updated:', {
        newSelectedId: newState.selectedTextId,
        selectedTextObject: newState.insertedTexts.find((t) => t.isSelected),
      })

      return newState
    })
  },

  clearSelection: () => {
    set((state) => ({
      ...state,
      selectedTextId: null,
      insertedTexts: state.insertedTexts.map((text) => ({
        ...text,
        isSelected: false,
      })),
    }))
  },

  // Style management
  updateDefaultStyle: (style: Partial<TextStyle>) => {
    set((state) => ({
      ...state,
      defaultStyle: { ...state.defaultStyle, ...style },
    }))
  },

  applyStyleToSelected: (style: Partial<TextStyle>) => {
    const { selectedTextId } = get()
    if (!selectedTextId) return

    set((state) => ({
      ...state,
      insertedTexts: state.insertedTexts.map((text) =>
        text.id === selectedTextId
          ? {
              ...text,
              style: { ...text.style, ...style },
              updatedAt: Date.now(),
            }
          : text
      ),
    }))
  },

  // Clipboard operations
  copyText: (id: string) => {
    const { insertedTexts } = get()
    const textToCopy = insertedTexts.find((text) => text.id === id)

    if (textToCopy) {
      set((state) => ({
        ...state,
        clipboard: [textToCopy],
      }))
    }
  },

  cutText: (id: string) => {
    const { copyText, deleteText } = get()
    copyText(id)
    deleteText(id)
  },

  pasteText: (position: TextPosition, currentTime: number) => {
    const { clipboard, addText } = get()

    if (clipboard.length > 0) {
      const textToPaste = clipboard[0]
      const pastedText = createInsertedText(
        textToPaste.content,
        position,
        currentTime,
        currentTime + (textToPaste.endTime - textToPaste.startTime),
        textToPaste.style,
        textToPaste.animation
      )

      addText(pastedText)
    }
  },

  // Batch operations
  deleteSelectedTexts: () => {
    const { selectedTextId, deleteText } = get()
    if (selectedTextId) {
      deleteText(selectedTextId)
    }
  },

  moveTexts: (ids: string[], deltaPosition: TextPosition) => {
    set((state) => ({
      ...state,
      insertedTexts: state.insertedTexts.map((text) =>
        ids.includes(text.id)
          ? {
              ...text,
              position: {
                x: Math.max(
                  0,
                  Math.min(100, text.position.x + deltaPosition.x)
                ),
                y: Math.max(
                  0,
                  Math.min(100, text.position.y + deltaPosition.y)
                ),
              },
              updatedAt: Date.now(),
            }
          : text
      ),
    }))
  },

  // Time management
  getActiveTexts: (currentTime: number) => {
    const { insertedTexts } = get()
    return insertedTexts.filter((text) => isTextActiveAtTime(text, currentTime))
  },

  updateTextTiming: (id: string, startTime: number, endTime: number) => {
    set((state) => {
      const updatedTexts = state.insertedTexts.map((text) =>
        text.id === id
          ? {
              ...text,
              startTime: Math.max(0, startTime),
              endTime: Math.max(startTime + 0.1, endTime),
              updatedAt: Date.now(),
            }
          : text
      )

      // Update scenario manager if initialized (always sync)
      if (scenarioManager) {
        const updatedText = updatedTexts.find((text) => text.id === id)
        if (updatedText) {
          scenarioManager.updateInsertedText(updatedText)
        }
      }

      return {
        ...state,
        insertedTexts: updatedTexts,
      }
    })
  },

  // Scenario management methods
  initializeScenario: (clips = []) => {
    const { insertedTexts } = get()

    // Create new scenario manager if not exists
    if (!scenarioManager) {
      scenarioManager = new ScenarioManager({
        autoUpdate: true,
        includeInsertedTexts: true,
      })
    }

    // Initialize with current data
    const scenario = scenarioManager.initialize(clips, insertedTexts)

    // Set up listener to update store when scenario changes
    scenarioManager.addUpdateListener((updatedScenario: RendererConfigV2) => {
      set((state) => ({
        ...state,
        currentScenario: updatedScenario,
      }))
    })

    set((state) => ({
      ...state,
      currentScenario: scenario,
    }))
  },

  toggleScenarioMode: () => {
    set((state) => ({
      ...state,
      isScenarioMode: !state.isScenarioMode,
    }))
  },

  updateScenario: (scenario: RendererConfigV2) => {
    set((state) => ({
      ...state,
      currentScenario: scenario,
    }))
  },

  addScenarioUpdateListener: (listener: ScenarioUpdateListener) => {
    if (!scenarioManager) {
      throw new Error(
        'ScenarioManager not initialized. Call initializeScenario() first.'
      )
    }
    return scenarioManager.addUpdateListener(listener)
  },

  // Animation management methods
  toggleRotationAnimation: (id: string) => {
    const { updateText } = get()
    const currentText = get().insertedTexts.find((text) => text.id === id)
    if (!currentText) return

    const isSpinActive = currentText.animation?.plugin === 'spin@2.0.0'
    const newAnimation = isSpinActive
      ? ROTATION_PRESETS.NONE
      : ROTATION_PRESETS.SUBTLE

    updateText(id, { animation: newAnimation })
  },

  setAnimationPreset: (id: string, preset: RotationPreset) => {
    const { updateText } = get()
    updateText(id, { animation: ROTATION_PRESETS[preset] })
  },

  updateTextAnimation: (id: string, animation: TextAnimation) => {
    const { updateText } = get()
    updateText(id, { animation })
  },
})
