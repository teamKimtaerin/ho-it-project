/**
 * Hook for managing animation parameters with debouncing and error handling
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useEditorStore } from '../store'
import {
  determineTargetWordId,
  getExistingTrackParams,
  createParameterDebounce,
} from '../utils/animationHelpers'

interface UseAnimationParamsOptions {
  wordId?: string
  assetId?: string
  debounceMs?: number
  enableRealTimeUpdates?: boolean
}

interface UseAnimationParamsResult {
  params: Record<string, unknown>
  isLoading: boolean
  error: string | null
  updateParams: (newParams: Record<string, unknown>) => Promise<void>
  updateParam: (key: string, value: unknown) => void
  resetParams: () => void
}

export const useAnimationParams = ({
  wordId: propWordId,
  assetId: propAssetId,
  debounceMs = 200,
  enableRealTimeUpdates = true,
}: UseAnimationParamsOptions = {}): UseAnimationParamsResult => {
  const store = useEditorStore()
  const [params, setParams] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine target word and asset
  const wordId = propWordId || determineTargetWordId(store)
  const assetId = propAssetId

  // Load existing parameters
  useEffect(() => {
    if (!wordId || !assetId) {
      setParams({})
      return
    }

    try {
      const existingParams = getExistingTrackParams(store, wordId, assetId)
      setParams(existingParams)
      setError(null)
    } catch (err) {
      console.error('Failed to load existing params:', err)
      setError('Failed to load existing parameters')
    }
  }, [wordId, assetId, store])

  // Debounced update function
  const debouncedUpdate = useMemo(
    () =>
      createParameterDebounce(
        async (
          targetWordId: string,
          targetAssetId: string,
          newParams: Record<string, unknown>
        ) => {
          try {
            setIsLoading(true)
            setError(null)

            // Call store action to update parameters
            const storeActions = useEditorStore.getState() as {
              updateAnimationTrackParams?: (
                wordId: string,
                assetId: string,
                params: Record<string, unknown>
              ) => void
            }
            storeActions.updateAnimationTrackParams?.(
              targetWordId,
              targetAssetId,
              newParams
            )

            console.log(`Updated animation params for word "${targetWordId}"`)
          } catch (err) {
            console.error('Failed to update animation params:', err)
            setError(
              err instanceof Error ? err.message : 'Failed to update parameters'
            )
            throw err
          } finally {
            setIsLoading(false)
          }
        },
        debounceMs
      ),
    [debounceMs]
  )

  // Update multiple parameters at once
  const updateParams = useCallback(
    async (newParams: Record<string, unknown>) => {
      if (!wordId || !assetId) {
        throw new Error(
          'No word or asset selected for animation parameter update'
        )
      }

      setParams(newParams)

      if (enableRealTimeUpdates) {
        await debouncedUpdate(wordId, assetId, newParams)
      }
    },
    [wordId, assetId, debouncedUpdate, enableRealTimeUpdates]
  )

  // Update a single parameter (for real-time UI updates)
  const updateParam = useCallback(
    (key: string, value: unknown) => {
      const newParams = { ...params, [key]: value }
      setParams(newParams)

      if (enableRealTimeUpdates && wordId && assetId) {
        void debouncedUpdate(wordId, assetId, newParams)
      }
    },
    [params, wordId, assetId, debouncedUpdate, enableRealTimeUpdates]
  )

  // Reset parameters to existing track values
  const resetParams = useCallback(() => {
    if (!wordId || !assetId) return

    try {
      const existingParams = getExistingTrackParams(store, wordId, assetId)
      setParams(existingParams)
      setError(null)
    } catch (err) {
      console.error('Failed to reset params:', err)
      setError('Failed to reset parameters')
    }
  }, [wordId, assetId, store])

  return {
    params,
    isLoading,
    error,
    updateParams,
    updateParam,
    resetParams,
  }
}

/**
 * Hook for managing animation track operations
 */
export const useAnimationTracks = (wordId?: string) => {
  const store = useEditorStore()
  const targetWordId = wordId || determineTargetWordId(store)

  const addTrack = useCallback(
    async (
      assetId: string,
      assetName: string,
      pluginKey?: string,
      initialParams?: Record<string, unknown>
    ) => {
      if (!targetWordId) {
        throw new Error('No word selected for animation track')
      }

      const storeActions = useEditorStore.getState() as {
        addAnimationTrackAsync?: (
          wordId: string,
          assetId: string,
          assetName: string,
          wordTiming?: { start: number; end: number },
          pluginKey?: string
        ) => Promise<void>
      }
      await storeActions.addAnimationTrackAsync?.(
        targetWordId,
        assetId,
        assetName,
        undefined, // Use word timing
        pluginKey
      )

      // Apply initial parameters if provided
      if (initialParams && Object.keys(initialParams).length > 0) {
        const storeActionsWithParams = useEditorStore.getState() as {
          updateAnimationTrackParams?: (
            wordId: string,
            assetId: string,
            params: Record<string, unknown>
          ) => void
        }
        storeActionsWithParams.updateAnimationTrackParams?.(
          targetWordId,
          assetId,
          initialParams
        )
      }
    },
    [targetWordId]
  )

  const removeTrack = useCallback(
    (assetId: string) => {
      if (!targetWordId) return

      const storeActions = useEditorStore.getState() as {
        removeAnimationTrack?: (wordId: string, assetId: string) => void
      }
      storeActions.removeAnimationTrack?.(targetWordId, assetId)
    },
    [targetWordId]
  )

  const updateTrackTiming = useCallback(
    (assetId: string, start: number, end: number) => {
      if (!targetWordId) return

      const storeActions = useEditorStore.getState() as {
        updateAnimationTrackTiming?: (
          wordId: string,
          assetId: string,
          start: number,
          end: number
        ) => void
      }
      storeActions.updateAnimationTrackTiming?.(
        targetWordId,
        assetId,
        start,
        end
      )
    },
    [targetWordId]
  )

  const tracks = targetWordId
    ? store.wordAnimationTracks?.get(targetWordId) || []
    : []

  return {
    tracks,
    addTrack,
    removeTrack,
    updateTrackTiming,
    canAddTrack: tracks.length < 3,
    targetWordId,
  }
}
