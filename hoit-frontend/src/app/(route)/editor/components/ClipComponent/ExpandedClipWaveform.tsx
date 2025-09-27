import React, { useRef, useEffect, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useEditorStore } from '../../store'
import { IoPlay, IoPause, IoArrowUndo, IoArrowRedo } from 'react-icons/io5'
import { Word } from './types'
import { createParameterDebounce } from '../../utils/animationHelpers'
import {
  getSegmentPeaks,
  smoothWaveformPeaks,
  WaveformData,
} from '@/utils/audio/waveformExtractor'

interface ExpandedClipWaveformProps {
  words: Word[]
  focusedWordId: string | null
}

// Gaussian smoothing filter for smooth waveform
function gaussianSmooth(data: number[], radius: number = 3): number[] {
  if (data.length === 0) return data

  const smoothed = [...data]
  const weights: number[] = []

  // Generate Gaussian weights
  for (let i = -radius; i <= radius; i++) {
    weights.push(Math.exp(-(i * i) / (2 * radius * radius)))
  }

  // Normalize weights
  const sum = weights.reduce((a, b) => a + b, 0)
  weights.forEach((w, i) => (weights[i] = w / sum))

  // Apply smoothing
  for (let i = radius; i < data.length - radius; i++) {
    let value = 0
    for (let j = -radius; j <= radius; j++) {
      value += data[i + j] * weights[j + radius]
    }
    smoothed[i] = value
  }

  return smoothed
}

// Extract real waveform data for a specific time range from global waveform
function extractRangeWaveformData(
  startTime: number,
  endTime: number,
  globalWaveformData: WaveformData | null // WaveformData from store
): number[] {
  try {
    if (
      !globalWaveformData ||
      !globalWaveformData.peaks ||
      globalWaveformData.peaks.length === 0
    ) {
      console.warn('No global waveform data available, generating fallback')
      // Generate fallback waveform data with smooth transitions
      const duration = endTime - startTime
      const totalSamples = Math.max(100, Math.ceil(duration * 100)) // 100 samples per second
      const fallbackData = Array.from({ length: totalSamples }, (_, i) => {
        const t = i / totalSamples
        return (
          0.3 +
          0.4 * Math.sin(t * Math.PI * 8) +
          0.2 * Math.sin(t * Math.PI * 20)
        )
      })
      return gaussianSmooth(fallbackData)
    }

    // Extract segment from global waveform data
    const segmentPeaks = getSegmentPeaks(globalWaveformData, startTime, endTime)

    // Apply smoothing for better visual appearance
    const smoothedPeaks = smoothWaveformPeaks(segmentPeaks, 2)

    console.log('🎵 Extracted real waveform segment:', {
      startTime,
      endTime,
      duration: endTime - startTime,
      originalPeaksCount: globalWaveformData.peaks.length,
      extractedPeaksCount: segmentPeaks.length,
      smoothedPeaksCount: smoothedPeaks.length,
    })

    return smoothedPeaks
  } catch (error) {
    console.error('Failed to extract waveform segment:', error)
    // Generate fallback waveform data with smooth transitions
    const duration = endTime - startTime
    const totalSamples = Math.max(100, Math.ceil(duration * 100))
    const fallbackData = Array.from({ length: totalSamples }, (_, i) => {
      const t = i / totalSamples
      return (
        0.3 + 0.4 * Math.sin(t * Math.PI * 8) + 0.2 * Math.sin(t * Math.PI * 20)
      )
    })
    return gaussianSmooth(fallbackData)
  }
}

export default function ExpandedClipWaveform({
  words,
  focusedWordId,
}: ExpandedClipWaveformProps) {
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [peaks, setPeaks] = useState<number[]>([])

  const {
    expandedWordId,
    wordTimingAdjustments,
    wordAnimationIntensity,
    wordAnimationTracks,
    updateWordTiming,
    updateAnimationIntensity,
    updateAnimationTrackTiming,
    updateAnimationTrackTimingImmediate,
    undoWordTiming,
    redoWordTiming,
    setHasUnsavedChanges,
    playSegment,
    stopSegmentPlayback,
    isPlaying: isVideoPlaying,
    updateWordBaseTime,
    refreshWordPluginChain,
    globalWaveformData,
  } = useEditorStore()

  // Debounced update functions for high-frequency events (except animation track timing)
  const debouncedUpdateWordTiming = useCallback(
    createParameterDebounce(updateWordTiming, 100),
    [updateWordTiming]
  )

  const debouncedUpdateAnimationIntensity = useCallback(
    createParameterDebounce(updateAnimationIntensity, 100),
    [updateAnimationIntensity]
  )

  // Find the focused word
  const focusedWord = words.find(
    (w) => w.id === (focusedWordId || expandedWordId)
  )

  // Local state for dragging - track for each word
  const [draggedWordId, setDraggedWordId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<string | null>(null)

  // Local state for animation track visual positions during drag
  const [localAnimationPositions, setLocalAnimationPositions] = useState<
    Map<string, { start: number; end: number }>
  >(new Map())

  // Calculate focused word range (3 words: previous + current + next)
  const { displayWords, rangeStart, rangeEnd, rangeDuration } =
    React.useMemo(() => {
      if (!focusedWord) {
        return {
          displayWords: words,
          rangeStart: words.length > 0 ? words[0].start : 0,
          rangeEnd: words.length > 0 ? words[words.length - 1].end : 0,
          rangeDuration:
            words.length > 0 ? words[words.length - 1].end - words[0].start : 0,
        }
      }

      const focusedIndex = words.findIndex((w) => w.id === focusedWord.id)
      if (focusedIndex === -1) {
        return {
          displayWords: words,
          rangeStart: words.length > 0 ? words[0].start : 0,
          rangeEnd: words.length > 0 ? words[words.length - 1].end : 0,
          rangeDuration:
            words.length > 0 ? words[words.length - 1].end - words[0].start : 0,
        }
      }

      // Get 3 previous + current + 3 next words (7 words total for better context)
      const CONTEXT_WORDS = 3 // 각 방향으로 보여줄 단어 개수
      const currentWord = words[focusedIndex]

      // 이전 3개 단어 가져오기
      const prevWords = []
      for (let i = CONTEXT_WORDS; i >= 1; i--) {
        const idx = focusedIndex - i
        if (idx >= 0) {
          prevWords.push(words[idx])
        }
      }

      // 다음 3개 단어 가져오기
      const nextWords = []
      for (let i = 1; i <= CONTEXT_WORDS; i++) {
        const idx = focusedIndex + i
        if (idx < words.length) {
          nextWords.push(words[idx])
        }
      }

      // 전체 displayWords 배열 구성
      const displayWords = [...prevWords, currentWord, ...nextWords]

      // 시간 범위 계산
      let start = displayWords[0].start
      let end = displayWords[displayWords.length - 1].end
      const paddingTime = 1.0 // 1 second padding

      // 단어가 부족한 경우 패딩 추가
      if (prevWords.length < CONTEXT_WORDS) {
        start = Math.max(0, currentWord.start - paddingTime)
      }
      if (nextWords.length < CONTEXT_WORDS) {
        end = currentWord.end + paddingTime
      }

      return {
        displayWords,
        rangeStart: start,
        rangeEnd: end,
        rangeDuration: end - start,
      }
    }, [focusedWord, words])

  // Load audio data for the focused range from global waveform data
  useEffect(() => {
    console.log('🎵 Loading waveform data for range:', {
      rangeStart,
      rangeEnd,
      globalWaveformData: !!globalWaveformData,
    })

    const data = extractRangeWaveformData(
      rangeStart,
      rangeEnd,
      globalWaveformData
    )
    setPeaks(data)

    console.log('🎵 Waveform peaks loaded:', {
      peaksCount: data.length,
      rangeStart,
      rangeEnd,
    })
  }, [rangeStart, rangeEnd, globalWaveformData])

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || peaks.length === 0) return

    // Create WaveSurfer instance
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#9CA3AF',
      progressColor: '#3B82F6',
      cursorColor: '#EF4444',
      barWidth: 2,
      barRadius: 3,
      height: 120,
      normalize: true,
      backend: 'WebAudio',
      interact: false,
    })

    // Load peaks data - WaveSurfer expects array of arrays for stereo
    ws.load('', [peaks], rangeDuration)

    wavesurferRef.current = ws

    // Cleanup
    return () => {
      ws.destroy()
    }
  }, [peaks, rangeDuration])

  // Handle play/pause with video player sync
  const togglePlayback = useCallback(() => {
    if (!focusedWord) return

    const timing = wordTimingAdjustments.get(focusedWord.id) || {
      start: focusedWord.start,
      end: focusedWord.end,
    }

    if (isVideoPlaying) {
      stopSegmentPlayback()
      setIsPlaying(false)
    } else {
      playSegment(timing.start, timing.end)
      setIsPlaying(true)
    }
  }, [
    focusedWord,
    isVideoPlaying,
    wordTimingAdjustments,
    playSegment,
    stopSegmentPlayback,
  ])

  // Calculate bar positions (0-1 scale) relative to focused range
  const getBarPosition = useCallback(
    (time: number) => {
      if (rangeDuration === 0) return 0
      const position = (time - rangeStart) / rangeDuration
      return Math.max(0, Math.min(1, position))
    },
    [rangeStart, rangeDuration]
  )

  // Handle drag start for word bars
  const handleDragStart = useCallback(
    (wordId: string, barType: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDraggedWordId(wordId)
      setDragType(barType)
      setIsDragging(true)
    },
    []
  )

  // Handle drag move
  useEffect(() => {
    if (!isDragging || !draggedWordId || !dragType || !waveformRef.current)
      return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = waveformRef.current!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const position = Math.max(0, Math.min(1, x / rect.width))
      const time = rangeStart + position * rangeDuration

      const word = words.find((w) => w.id === draggedWordId)
      if (!word) return

      const currentTiming = wordTimingAdjustments.get(draggedWordId) || {
        start: word.start,
        end: word.end,
      }

      const currentIntensity = wordAnimationIntensity.get(draggedWordId) || {
        min: 0.3,
        max: 0.7,
      }

      if (dragType === 'timing-start') {
        const newStart = Math.min(time, currentTiming.end - 0.01)
        debouncedUpdateWordTiming(draggedWordId, newStart, currentTiming.end)
        setHasUnsavedChanges(true)
      } else if (dragType === 'timing-end') {
        const newEnd = Math.max(time, currentTiming.start + 0.01)
        debouncedUpdateWordTiming(draggedWordId, currentTiming.start, newEnd)
        setHasUnsavedChanges(true)
      } else if (dragType === 'animation-min') {
        const newMin = Math.min(position, currentIntensity.max - 0.05)
        debouncedUpdateAnimationIntensity(
          draggedWordId,
          newMin,
          currentIntensity.max
        )
        setHasUnsavedChanges(true)
      } else if (dragType === 'animation-max') {
        const newMax = Math.max(position, currentIntensity.min + 0.05)
        debouncedUpdateAnimationIntensity(
          draggedWordId,
          currentIntensity.min,
          newMax
        )
        setHasUnsavedChanges(true)
      } else if (dragType.startsWith('track-')) {
        // Handle animation track bars - store positions locally during drag
        const [, assetId, barType] = dragType.split('-')
        const tracks = wordAnimationTracks.get(draggedWordId) || []
        const track = tracks.find((t) => t.assetId === assetId)

        if (track) {
          const trackKey = `${draggedWordId}-${assetId}`
          const currentLocal =
            localAnimationPositions.get(trackKey) || track.timing

          let newStart = currentLocal.start
          let newEnd = currentLocal.end

          if (barType === 'start') {
            newStart = Math.min(time, currentLocal.end - 0.01)
          } else if (barType === 'end') {
            newEnd = Math.max(time, currentLocal.start + 0.01)
          } else if (barType === 'move') {
            // Move the entire track to follow mouse position
            const duration = currentLocal.end - currentLocal.start
            const newStartPos =
              rangeStart + position * rangeDuration - duration / 2

            // Constrain within range bounds
            newStart = Math.max(
              rangeStart,
              Math.min(newStartPos, rangeEnd - duration)
            )
            newEnd = newStart + duration
          }

          // Store position locally for visual feedback
          setLocalAnimationPositions((prev) =>
            new Map(prev).set(trackKey, { start: newStart, end: newEnd })
          )
          setHasUnsavedChanges(true)
        }
      }
    }

    const handleMouseUp = () => {
      // Apply animation track position changes to store if we were dragging a track
      if (draggedWordId && dragType && dragType.startsWith('track-')) {
        const [, assetId] = dragType.split('-')
        const trackKey = `${draggedWordId}-${assetId}`
        const localPosition = localAnimationPositions.get(trackKey)

        if (localPosition) {
          // Apply the final position to the store immediately (no debounce)
          updateAnimationTrackTimingImmediate(
            draggedWordId,
            assetId,
            localPosition.start,
            localPosition.end
          )
        }
      }

      // Clear drag state and local positions
      setIsDragging(false)
      setDraggedWordId(null)
      setDragType(null)
      setLocalAnimationPositions(new Map())
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    isDragging,
    draggedWordId,
    dragType,
    words,
    rangeStart,
    rangeDuration,
    rangeEnd,
    wordTimingAdjustments,
    wordAnimationIntensity,
    wordAnimationTracks,
    localAnimationPositions,
    updateWordTiming,
    updateAnimationIntensity,
    updateAnimationTrackTimingImmediate,
    setHasUnsavedChanges,
    refreshWordPluginChain,
    updateWordBaseTime,
  ])

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    if (focusedWord) {
      undoWordTiming(focusedWord.id)

      // Get the timing after undo and sync to scenario
      const timing = wordTimingAdjustments.get(focusedWord.id) || {
        start: focusedWord.start,
        end: focusedWord.end,
      }

      // Use updateWordTiming to ensure proper scenario sync
      updateWordTiming(focusedWord.id, timing.start, timing.end)
      setHasUnsavedChanges(true)
    }
  }, [
    focusedWord,
    undoWordTiming,
    updateWordTiming,
    wordTimingAdjustments,
    setHasUnsavedChanges,
  ])

  const handleRedo = useCallback(() => {
    if (focusedWord) {
      redoWordTiming(focusedWord.id)

      // Get the timing after redo and sync to scenario
      const timing = wordTimingAdjustments.get(focusedWord.id) || {
        start: focusedWord.start,
        end: focusedWord.end,
      }

      // Use updateWordTiming to ensure proper scenario sync
      updateWordTiming(focusedWord.id, timing.start, timing.end)
      setHasUnsavedChanges(true)
    }
  }, [
    focusedWord,
    redoWordTiming,
    updateWordTiming,
    wordTimingAdjustments,
    setHasUnsavedChanges,
  ])

  // Sync playback state with video player
  useEffect(() => {
    setIsPlaying(isVideoPlaying)
  }, [isVideoPlaying])

  return (
    <div className="w-full bg-white border-t border-gray-300 animate-in slide-in-from-top duration-200">
      {/* Waveform Container */}
      <div className="relative bg-gray-50 mx-4 my-3 rounded-lg p-4 pt-8 border border-gray-200">
        {/* Red center line */}
        <div
          className="absolute left-0 right-0 top-1/2 h-px bg-red-500 opacity-60 pointer-events-none z-10"
          style={{ transform: 'translateY(-50%)' }}
        />

        {/* Waveform */}
        <div ref={waveformRef} className="relative" />

        {/* Dark overlay outside selected word timing */}
        {focusedWord &&
          (() => {
            const timing = wordTimingAdjustments.get(focusedWord.id) || {
              start: focusedWord.start,
              end: focusedWord.end,
            }
            return (
              <>
                {/* Left overlay (before start) */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-black/70 pointer-events-none z-20"
                  style={{
                    width: `${getBarPosition(timing.start) * 100}%`,
                  }}
                />
                {/* Right overlay (after end) */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-black/70 pointer-events-none z-20"
                  style={{
                    width: `${(1 - getBarPosition(timing.end)) * 100}%`,
                  }}
                />
              </>
            )
          })()}

        {/* Word boundaries - vertical lines for each word in focused range */}
        {displayWords.map((word) => {
          const startPos = getBarPosition(word.start)
          const isSelected = word.id === focusedWord?.id

          return (
            <div
              key={word.id}
              className={`absolute top-0 bottom-0 pointer-events-none ${
                isSelected ? 'bg-blue-500/10' : ''
              }`}
              style={{
                left: `${startPos * 100}%`,
                width: `${(getBarPosition(word.end) - startPos) * 100}%`,
              }}
            >
              {/* Word boundary line */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-px ${
                  isSelected ? 'bg-blue-400' : 'bg-gray-600'
                } opacity-50`}
              />
              {/* Word label */}
              <div
                className={`absolute -top-7 left-0 text-xs whitespace-nowrap ${
                  isSelected ? 'text-blue-600 font-semibold' : 'text-gray-600'
                }`}
              >
                {word.text}
              </div>
            </div>
          )
        })}

        {/* Draggable bars ONLY for focused word */}
        {focusedWord &&
          (() => {
            const timing = wordTimingAdjustments.get(focusedWord.id) || {
              start: focusedWord.start,
              end: focusedWord.end,
            }

            const timingStartPos = getBarPosition(timing.start)
            const timingEndPos = getBarPosition(timing.end)

            return (
              <React.Fragment key={focusedWord.id}>
                {/* Timing Bars (Blue for focused word) - Top */}
                <div
                  className="absolute top-0 w-2 cursor-ew-resize transition-colors z-30 bg-blue-500 hover:bg-blue-400 border border-blue-600 rounded-sm"
                  style={{
                    left: `${timingStartPos * 100}%`,
                    transform: 'translateX(-50%)',
                    height: '40%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                  onMouseDown={(e) =>
                    handleDragStart(focusedWord.id, 'timing-start', e)
                  }
                  title={`${focusedWord.text} 시작: ${timing.start.toFixed(2)}s`}
                ></div>

                <div
                  className="absolute top-0 w-2 cursor-ew-resize transition-colors z-30 bg-blue-500 hover:bg-blue-400 border border-blue-600 rounded-sm"
                  style={{
                    left: `${timingEndPos * 100}%`,
                    transform: 'translateX(-50%)',
                    height: '40%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                  onMouseDown={(e) =>
                    handleDragStart(focusedWord.id, 'timing-end', e)
                  }
                  title={`${focusedWord.text} 종료: ${timing.end.toFixed(2)}s`}
                ></div>

                {/* Animation Track Rectangles - Multiple tracks per word (max 3) */}
                {(() => {
                  const tracks = wordAnimationTracks.get(focusedWord.id) || []
                  const trackColors = {
                    blue: {
                      base: 'bg-blue-500',
                      hover: 'bg-blue-400',
                      label: 'bg-blue-600',
                      text: 'text-white',
                    },
                    green: {
                      base: 'bg-green-500',
                      hover: 'bg-green-400',
                      label: 'bg-green-600',
                      text: 'text-white',
                    },
                    purple: {
                      base: 'bg-purple-500',
                      hover: 'bg-purple-400',
                      label: 'bg-purple-600',
                      text: 'text-white',
                    },
                  }

                  return tracks.map((track, trackIndex) => {
                    const colors = trackColors[track.color]
                    const topOffset = 50 + trackIndex * 15 // Position below red line with more space

                    // Use local positions during drag for visual feedback
                    const trackKey = `${focusedWord.id}-${track.assetId}`
                    const localPosition = localAnimationPositions.get(trackKey)
                    const effectiveTiming = localPosition || track.timing

                    const startPos = getBarPosition(effectiveTiming.start)
                    const endPos = getBarPosition(effectiveTiming.end)
                    const width = (endPos - startPos) * 100

                    return (
                      <React.Fragment
                        key={`${focusedWord.id}-${track.assetId}`}
                      >
                        {/* Track timing rectangle with draggable borders and moveable center */}
                        <div
                          className={`absolute transition-colors z-30 ${colors.base} hover:${colors.hover} border border-gray-300 rounded-md shadow-lg overflow-hidden group`}
                          style={{
                            left: `${startPos * 100}%`,
                            width: `${width}%`,
                            top: `${topOffset}%`,
                            height: '25px',
                          }}
                        >
                          {/* Left border handle (start) */}
                          <div
                            className="absolute left-0 top-0 w-1 h-full cursor-ew-resize bg-black/50 hover:bg-white transition-all z-50"
                            onMouseDown={(e) =>
                              handleDragStart(
                                focusedWord.id,
                                `track-${track.assetId}-start`,
                                e
                              )
                            }
                            title={`${track.assetName} 시작: ${effectiveTiming.start.toFixed(2)}s`}
                          />

                          {/* Right border handle (end) */}
                          <div
                            className="absolute right-0 top-0 w-1 h-full cursor-ew-resize bg-black/50 hover:bg-white transition-all z-50"
                            onMouseDown={(e) =>
                              handleDragStart(
                                focusedWord.id,
                                `track-${track.assetId}-end`,
                                e
                              )
                            }
                            title={`${track.assetName} 종료: ${effectiveTiming.end.toFixed(2)}s`}
                          />

                          {/* Center area for moving entire track */}
                          <div
                            className="absolute left-1 right-1 top-0 h-full cursor-move hover:bg-black/10 transition-all z-40"
                            onMouseDown={(e) =>
                              handleDragStart(
                                focusedWord.id,
                                `track-${track.assetId}-move`,
                                e
                              )
                            }
                            title={`${track.assetName} 이동: ${effectiveTiming.start.toFixed(2)}s - ${effectiveTiming.end.toFixed(2)}s`}
                          />

                          {/* Animation name inside rectangle */}
                          <div
                            className={`absolute inset-1 flex items-center justify-center ${colors.text} text-xs font-medium pointer-events-none z-45 truncate`}
                          >
                            {track.assetName}
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })
                })()}
              </React.Fragment>
            )
          })()}
      </div>

      {/* Controls and Info */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Playback Control */}
          <button
            onClick={togglePlayback}
            className="p-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
            title={isPlaying ? '일시정지' : '재생'}
            disabled={!focusedWord}
          >
            {isPlaying ? (
              <IoPause size={18} className="text-gray-700" />
            ) : (
              <IoPlay size={18} className="text-gray-700" />
            )}
          </button>

          {/* Undo Button */}
          <button
            onClick={handleUndo}
            className="p-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
            title="되돌리기"
            disabled={!focusedWord}
          >
            <IoArrowUndo size={18} className="text-gray-700" />
          </button>

          {/* Redo Button */}
          <button
            onClick={handleRedo}
            className="p-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
            title="다시 실행"
            disabled={!focusedWord}
          >
            <IoArrowRedo size={18} className="text-gray-700" />
          </button>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-sm border border-blue-600"></div>
              <span>타이밍</span>
            </div>
            {focusedWord &&
              (() => {
                const tracks = wordAnimationTracks.get(focusedWord.id) || []
                if (tracks.length === 0) {
                  return (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">애니메이션 없음</span>
                    </div>
                  )
                }
                return tracks.map((track) => (
                  <div key={track.assetId} className="flex items-center gap-1">
                    <div
                      className={`w-3 h-3 rounded-sm ${
                        track.color === 'blue'
                          ? 'bg-blue-500'
                          : track.color === 'green'
                            ? 'bg-green-500'
                            : 'bg-purple-500'
                      }`}
                    ></div>
                    <span>{track.assetName}</span>
                  </div>
                ))
              })()}
          </div>
        </div>

        {/* Selected Word Info */}
        {focusedWord && (
          <div className="text-xs text-gray-600">
            선택된 단어:{' '}
            <span className="text-black font-medium">{focusedWord.text}</span>
            {(() => {
              const tracks = wordAnimationTracks.get(focusedWord.id) || []
              if (tracks.length > 0) {
                return (
                  <span className="ml-2">({tracks.length}/3 애니메이션)</span>
                )
              }
              return null
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
