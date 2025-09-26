import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ClipSlice, createClipSlice } from './slices/clipSlice'
import { SelectionSlice, createSelectionSlice } from './slices/selectionSlice'
import { UISlice, createUISlice } from './slices/uiSlice'
import { SaveSlice, createSaveSlice } from './slices/saveSlice'
import { MediaSlice, createMediaSlice } from './slices/mediaSlice'
import { WordSlice, createWordSlice } from './slices/wordSlice'
import { ScenarioSlice, createScenarioSlice } from './slices/scenarioSlice'
import { IndexSlice, createIndexSlice } from './slices/indexSlice'
import {
  TextInsertionSlice,
  createTextInsertionSlice,
} from './slices/textInsertionSlice'
import { TimelineSlice, createTimelineSlice } from './slices/timelineSlice'

// Combine all slices into a single store type
export type EditorStore = ClipSlice &
  SelectionSlice &
  UISlice &
  SaveSlice &
  MediaSlice &
  WordSlice &
  ScenarioSlice &
  IndexSlice &
  TextInsertionSlice &
  TimelineSlice

// Create the store with all slices
export const useEditorStore = create<EditorStore>()(
  devtools(
    (...a) => ({
      ...createClipSlice(...a),
      ...createSelectionSlice(...a),
      ...createUISlice(...a),
      ...createSaveSlice(...a),
      ...createMediaSlice(...a),
      ...createWordSlice(...a),
      ...createScenarioSlice(...a),
      ...createIndexSlice(...a),
      ...createTextInsertionSlice(...a),
      ...createTimelineSlice(...a),
    }),
    {
      name: 'editor-store',
    }
  )
)
