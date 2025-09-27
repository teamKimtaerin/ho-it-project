import type { RendererConfigV2 } from '@/app/shared/motiontext'
import { computeTimeOffsetSeconds } from '@/app/shared/motiontext'
import { videoSegmentManager } from '@/utils/video/segmentManager'
import type { StateCreator } from 'zustand'
import {
  buildInitialScenarioFromClips,
  type NodeIndexEntry,
} from '../../utils/initialScenario'

export interface ScenarioSlice {
  currentScenario: RendererConfigV2 | null
  nodeIndex: Record<string, NodeIndexEntry>
  scenarioVersion: number

  // Build initial scenario from clips
  buildInitialScenario: (
    clips: import('../../types').ClipItem[],
    opts?: Parameters<typeof buildInitialScenarioFromClips>[1]
  ) => RendererConfigV2

  // Update hooks (per word)
  updateWordBaseTime: (
    wordId: string,
    startAbsSec: number,
    endAbsSec: number
  ) => void
  refreshWordPluginChain: (wordId: string) => void

  // Update caption default style and/or boxStyle
  updateCaptionDefaultStyle: (updates: {
    style?: Record<string, unknown>
    boxStyle?: Record<string, unknown>
  }) => void

  // Update group node style and/or boxStyle for specific clip
  updateGroupNodeStyle: (
    clipId: string,
    updates: {
      style?: Record<string, unknown>
      boxStyle?: Record<string, unknown>
    }
  ) => void

  // Update word text in scenario
  updateWordTextInScenario: (wordId: string, newText: string) => void

  // Update scenario from clips (for real-time updates)
  updateScenarioFromClips: () => void

  // Set scenario from arbitrary JSON (editor apply)
  setScenarioFromJson: (config: RendererConfigV2) => void

  // Clear scenario (for reset)
  clearScenario: () => void
}

export const createScenarioSlice: StateCreator<ScenarioSlice> = (set, get) => ({
  currentScenario: null,
  nodeIndex: {},
  scenarioVersion: 0,

  buildInitialScenario: (clips, opts) => {
    // Get insertedTexts from TextInsertionSlice and wordAnimationTracks from WordSlice
    const fullState = get() as any
    const insertedTexts = fullState.insertedTexts || []
    const wordAnimationTracks = fullState.wordAnimationTracks
    const speakerColors = fullState.speakerColors || {}

    // Merge insertedTexts, wordAnimationTracks, and speakerColors into options
    const mergedOpts = {
      ...opts,
      insertedTexts,
      wordAnimationTracks,
      speakerColors,
    }

    const { config, index } = buildInitialScenarioFromClips(clips, mergedOpts)
    set({
      currentScenario: config,
      nodeIndex: index,
      scenarioVersion: (get().scenarioVersion || 0) + 1,
    })
    return config
  },

  updateWordBaseTime: (wordId, startAbsSec, endAbsSec) => {
    let { currentScenario, nodeIndex } = get()
    if (!currentScenario) {
      // Lazily build a scenario so baseTime updates can apply even if overlay hasn't initialized
      try {
        const anyGet = get() as unknown as {
          clips?: import('../../types').ClipItem[]
          deletedClipIds?: Set<string>
          buildInitialScenario?: ScenarioSlice['buildInitialScenario']
          insertedTexts?: any[]
        }
        const clipsAll = anyGet.clips || []
        const deleted = anyGet.deletedClipIds || new Set<string>()
        const activeClips = clipsAll.filter((c) => !deleted.has(c.id))
        anyGet.buildInitialScenario?.(activeClips)
        // Refresh local refs
        currentScenario = get().currentScenario
        nodeIndex = get().nodeIndex
      } catch {
        // If we cannot build, skip
      }
    }
    if (!currentScenario) return
    // wordId already has the word- prefix from clips, use it directly
    const entry = nodeIndex[wordId]
    if (!entry) return
    const cue = currentScenario.cues[entry.cueIndex]
    const childIdx = entry.path[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node: any = cue?.root?.children?.[childIdx]
    if (!node) return
    const sAdj =
      videoSegmentManager.mapToAdjustedTime(startAbsSec) ?? startAbsSec
    const eAdj = videoSegmentManager.mapToAdjustedTime(endAbsSec) ?? endAbsSec
    node.baseTime = [Number(sAdj), Number(eAdj)]
    // When baseTime changes, offsets must be recomputed for tracks
    get().refreshWordPluginChain(wordId)
  },

  refreshWordPluginChain: (wordId) => {
    const state = get() as ScenarioSlice & {
      wordAnimationTracks: Map<
        string,
        Array<{
          assetId: string
          assetName: string
          pluginKey?: string
          params?: Record<string, unknown>
          timing: { start: number; end: number }
        }>
      >
    }
    let { currentScenario, nodeIndex } = state
    const { wordAnimationTracks } = state
    if (!currentScenario) {
      // Lazily build initial scenario if missing so pluginChain updates don't get dropped
      try {
        const anyGet = get() as unknown as {
          clips?: import('../../types').ClipItem[]
          deletedClipIds?: Set<string>
          buildInitialScenario?: ScenarioSlice['buildInitialScenario']
          insertedTexts?: any[]
        }
        const clipsAll = anyGet.clips || []
        const deleted = anyGet.deletedClipIds || new Set<string>()
        const activeClips = clipsAll.filter((c) => !deleted.has(c.id))
        anyGet.buildInitialScenario?.(activeClips)
        currentScenario = get().currentScenario
        nodeIndex = get().nodeIndex
      } catch {
        // If building fails, we cannot proceed
      }
    }
    if (!currentScenario) return
    // wordId already has the word- prefix from clips, use it directly
    const entry = nodeIndex[wordId]
    if (!entry) return
    const cue = currentScenario.cues[entry.cueIndex]
    const childIdx = entry.path[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node: any = cue?.root?.children?.[childIdx]
    if (!node) return
    const baseTime: [number, number] = node.baseTime ||
      cue.root.displayTime || [0, 0]
    const tracks = wordAnimationTracks?.get(wordId) || []
    const pluginChain = tracks.map((t) => {
      const name =
        (t.pluginKey || t.assetName || '').split('@')[0] || t.assetName
      const startAdj =
        videoSegmentManager.mapToAdjustedTime(t.timing.start) ?? t.timing.start
      const endAdj =
        videoSegmentManager.mapToAdjustedTime(t.timing.end) ?? t.timing.end
      const { timeOffset } = computeTimeOffsetSeconds(
        baseTime,
        startAdj,
        endAdj
      )
      return {
        name,
        params: t.params || {},
        timeOffset, // seconds relative to baseTime[0]
      }
    })
    // Create a deep copy of the scenario to ensure state changes are detected
    const updatedScenario = { ...currentScenario }
    updatedScenario.cues = [...currentScenario.cues]
    updatedScenario.cues[entry.cueIndex] = {
      ...cue,
      root: {
        ...cue.root,
        children: [...(cue.root.children || [])],
      },
    }

    // Create a new node object with updated pluginChain and style
    const updatedNode = {
      ...node,
      pluginChain,
      style: {
        ...(node.style || {}),
        opacity: pluginChain.length > 0 ? 1 : (node.style?.opacity ?? 0),
      },
    }

    // Replace the specific node in the children array
    const targetCue = updatedScenario.cues[entry.cueIndex]
    if (targetCue?.root?.children) {
      targetCue.root.children[childIdx] = updatedNode
    }

    set({
      currentScenario: updatedScenario,
      scenarioVersion: (get().scenarioVersion || 0) + 1,
    })
  },

  updateCaptionDefaultStyle: (updates) => {
    let { currentScenario } = get()

    // Lazily build scenario if it doesn't exist
    if (!currentScenario) {
      try {
        const anyGet = get() as unknown as {
          clips?: import('../../types').ClipItem[]
          deletedClipIds?: Set<string>
          buildInitialScenario?: ScenarioSlice['buildInitialScenario']
          insertedTexts?: any[]
        }
        const clipsAll = anyGet.clips || []
        const deleted = anyGet.deletedClipIds || new Set<string>()
        const activeClips = clipsAll.filter((c) => !deleted.has(c.id))
        anyGet.buildInitialScenario?.(activeClips)
        currentScenario = get().currentScenario
      } catch {
        return // Cannot proceed without scenario
      }
    }

    if (!currentScenario?.tracks) return

    // Find caption track and update its defaultStyle and/or defaultBoxStyle
    const captionTrackIndex = currentScenario.tracks.findIndex(
      (track) => track.id === 'caption' || track.type === 'subtitle'
    )

    if (captionTrackIndex === -1) return

    const updatedScenario = { ...currentScenario }
    updatedScenario.tracks = [...currentScenario.tracks]

    // Also update cues to clear individual styles when applying global format
    if (currentScenario.cues) {
      updatedScenario.cues = currentScenario.cues.map((cue) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const root = (cue as any).root
        if (!root) return cue

        // Clear individual styles when applying global format
        const updatedRoot = { ...root }
        // Always clear individual styles when any global style update is applied
        if (updates.style !== undefined) {
          updatedRoot.style = undefined
        }
        if (updates.boxStyle !== undefined) {
          updatedRoot.boxStyle = undefined
        }

        return {
          ...cue,
          root: updatedRoot,
        }
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedTrack: any = {
      ...currentScenario.tracks[captionTrackIndex],
    }

    // Update defaultStyle if provided
    if (updates.style) {
      updatedTrack.defaultStyle = {
        ...(currentScenario.tracks[captionTrackIndex].defaultStyle || {}),
        ...updates.style,
      }
    }

    // Update defaultBoxStyle if provided
    if (updates.boxStyle) {
      updatedTrack.defaultBoxStyle = {
        ...(updatedTrack.defaultBoxStyle || {}),
        ...updates.boxStyle,
      }
    }

    updatedScenario.tracks[captionTrackIndex] = updatedTrack

    set({
      currentScenario: updatedScenario,
      scenarioVersion: (get().scenarioVersion || 0) + 1,
    })
  },

  updateGroupNodeStyle: (clipId, updates) => {
    console.log('updateGroupNodeStyle called with:', { clipId, updates })
    let { currentScenario } = get()

    // Lazily build scenario if it doesn't exist
    if (!currentScenario) {
      try {
        const anyGet = get() as unknown as {
          clips?: import('../../types').ClipItem[]
          deletedClipIds?: Set<string>
          buildInitialScenario?: ScenarioSlice['buildInitialScenario']
          insertedTexts?: any[]
        }
        const clipsAll = anyGet.clips || []
        const deleted = anyGet.deletedClipIds || new Set<string>()
        const activeClips = clipsAll.filter((c) => !deleted.has(c.id))
        anyGet.buildInitialScenario?.(activeClips)
        currentScenario = get().currentScenario
      } catch {
        return // Cannot proceed without scenario
      }
    }

    if (!currentScenario?.cues) {
      return
    }

    // The group node ID is created as `clip-${clipId}` in initialScenario.ts
    // Since clipId is already in format "clip-X", the final ID becomes "clip-clip-X"
    const groupNodeId = `clip-${clipId}`
    console.log('Looking for group node with ID:', groupNodeId)

    // Debug: Log all existing group node IDs
    const existingGroupIds = currentScenario.cues
      .map((cue) => (cue as { root?: { id?: string } }).root?.id)
      .filter(Boolean)
    console.log('Existing group node IDs:', existingGroupIds)

    let found = false
    const updatedCues = currentScenario.cues.map((cue, cueIndex) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const root = (cue as any).root
      if (!root || root.id !== groupNodeId) return cue

      found = true
      console.log('Found matching group node:', root.id)

      // Create completely new objects to ensure deep immutability
      let newStyle: Record<string, unknown> | null = null
      let newBoxStyle: Record<string, unknown> | null = null

      // Handle style updates (text styles) - apply even if style is undefined or empty
      if (updates.style !== undefined) {
        // Convert string reference to object if needed
        let currentStyle = root.style || {}
        if (typeof currentStyle === 'string') {
          // For now, start with empty object for string references
          currentStyle = {}
        }

        newStyle = {
          ...currentStyle,
          ...updates.style,
        }
        console.log('Applied style updates:', newStyle)
      } else {
        // Preserve existing style if no updates
        newStyle = root.style ? { ...root.style } : null
      }

      // Handle boxStyle updates (container styles) - apply even if boxStyle is undefined or empty
      if (updates.boxStyle !== undefined) {
        let currentBoxStyle = root.boxStyle || {}
        if (typeof currentBoxStyle === 'string') {
          // For now, start with empty object for string references
          currentBoxStyle = {}
        }

        newBoxStyle = {
          ...currentBoxStyle,
          ...updates.boxStyle,
        }
        console.log('Applied boxStyle updates:', newBoxStyle)
      } else {
        // Preserve existing boxStyle if no updates
        newBoxStyle = root.boxStyle ? { ...root.boxStyle } : null
      }

      // Create completely new root object
      const updatedRoot = {
        ...root,
        ...(newStyle !== null && { style: newStyle }),
        ...(newBoxStyle !== null && { boxStyle: newBoxStyle }),
      }

      // Create completely new cue object
      const updatedCue = {
        ...cue,
        root: updatedRoot,
      }

      console.log(`Updated cue ${cueIndex} root:`, updatedRoot)
      return updatedCue
    })

    if (!found) {
      console.warn(
        `Group node for clip ${clipId} not found. Available IDs:`,
        existingGroupIds
      )
      return
    }

    // Create completely new scenario object to ensure reference change
    const newScenario = {
      ...currentScenario,
      cues: updatedCues,
    }

    set({
      currentScenario: newScenario,
      scenarioVersion: (get().scenarioVersion || 0) + 1,
    })
  },

  updateWordTextInScenario: (wordId, newText) => {
    let { currentScenario, nodeIndex } = get()

    // Lazily build scenario if it doesn't exist
    if (!currentScenario) {
      try {
        const anyGet = get() as unknown as {
          clips?: import('../../types').ClipItem[]
          deletedClipIds?: Set<string>
          buildInitialScenario?: ScenarioSlice['buildInitialScenario']
          insertedTexts?: any[]
        }
        const clipsAll = anyGet.clips || []
        const deleted = anyGet.deletedClipIds || new Set<string>()
        const activeClips = clipsAll.filter((c) => !deleted.has(c.id))
        anyGet.buildInitialScenario?.(activeClips)
        // Refresh local refs
        currentScenario = get().currentScenario
        nodeIndex = get().nodeIndex
      } catch {
        return // Cannot proceed without scenario
      }
    }

    if (!currentScenario || !currentScenario.cues) return

    // Find the word node in the scenario
    const entry = nodeIndex[wordId]
    if (!entry) {
      console.warn(`Word node not found in scenario index: ${wordId}`)
      return
    }

    const cue = currentScenario.cues[entry.cueIndex]
    const childIdx = entry.path[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node: any = cue?.root?.children?.[childIdx]

    if (!node) {
      console.warn(`Word node not found in cue children: ${wordId}`)
      return
    }

    // Update the word text (use 'text' field, not 'content')
    node.text = newText

    // Deep clone the cues array to ensure React detects the change
    const updatedCues = [...currentScenario.cues]
    updatedCues[entry.cueIndex] = {
      ...cue,
      root: {
        ...cue.root,
        children: cue.root.children ? [...cue.root.children] : [],
      },
    }

    // Create new scenario object to trigger re-render
    set({
      currentScenario: { ...currentScenario, cues: updatedCues },
      scenarioVersion: (get().scenarioVersion || 0) + 1,
    })
  },

  setScenarioFromJson: (config) => {
    // Rebuild a minimal index for children by id under each cue root
    const index: Record<string, NodeIndexEntry> = {}
    config.cues?.forEach((cue, cueIndex) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const children = (cue as any)?.root?.children as Array<any> | undefined
      if (Array.isArray(children)) {
        children.forEach((child, childIdx) => {
          if (child && typeof child.id === 'string') {
            index[child.id] = { cueIndex, path: [childIdx] }
          }
        })
      }
    })
    set({
      currentScenario: config,
      nodeIndex: index,
      scenarioVersion: (get().scenarioVersion || 0) + 1,
    })
  },

  updateScenarioFromClips: () => {
    // Get current clips from clipSlice
    const fullState = get() as any
    const clips = fullState.clips || []

    if (clips.length === 0) return

    // Rebuild scenario from current clips with their current state
    const newScenario = get().buildInitialScenario(clips)

    // Update current scenario and increment version for reactivity
    set({
      currentScenario: newScenario,
      scenarioVersion: (get().scenarioVersion || 0) + 1,
    })
  },

  clearScenario: () => {
    set({
      currentScenario: null,
      nodeIndex: {},
      scenarioVersion: 0,
    })
  },
})
