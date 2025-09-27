import React, { useRef, useEffect, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useEditorStore } from '../../store'
import { IoClose, IoPlay, IoPause } from 'react-icons/io5'

interface WordDetailEditorProps {
  wordId: string
  clipId: string
}

// Load audio data from real.json
async function loadAudioData(wordId: string) {
  try {
    const response = await fetch('/real.json')
    const data = await response.json()

    // Find word data from all segments
    for (const segment of data.segments) {
      const wordData = segment.words?.find(
        (w: { word: string; id: string }) =>
          w.word === wordId || w.id === wordId
      )
      if (wordData) {
        return {
          volume_db: wordData.volume_db,
          pitch_hz: wordData.pitch_hz,
          start: wordData.start,
          end: wordData.end,
        }
      }
    }

    // Generate sample data for all words
    interface WordData {
      volume_db?: number
      pitch_hz?: number
    }
    const allWords: WordData[] = []
    data.segments.forEach((segment: { words?: WordData[] }) => {
      if (segment.words) {
        allWords.push(...segment.words)
      }
    })

    // Create an array of volume data for visualization
    const volumeData = allWords.map((w) => w.volume_db || -20)

    return {
      volume_db: volumeData,
      pitch_hz: allWords.map((w) => w.pitch_hz || 1000),
      start: 0,
      end: data.metadata?.duration || 10,
    }
  } catch (error) {
    console.error('Failed to load audio data:', error)
    return null
  }
}

export default function WordDetailEditor({
  wordId,
  clipId,
}: WordDetailEditorProps) {
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<{
    volume_db: number | number[]
    pitch_hz: number | number[]
    start: number
    end: number
  } | null>(null)

  const {
    clips,
    closeWordDetailEditor,
    updateWordTiming,
    updateAnimationIntensity,
    wordTimingAdjustments,
    wordAnimationIntensity,
    setHasUnsavedChanges,
  } = useEditorStore()

  // Find the clip and word
  const clip = clips.find((c) => c.id === clipId)
  const word = clip?.words.find((w) => w.id === wordId)

  // Get current adjustments or default values
  const timingAdjustment = wordTimingAdjustments.get(wordId) || {
    start: word?.start || 0,
    end: word?.end || 0,
  }

  const animationIntensity = wordAnimationIntensity.get(wordId) || {
    min: 0.3,
    max: 0.7,
  }

  // Local state for dragging
  const [localTiming, setLocalTiming] = useState(timingAdjustment)
  const [localIntensity, setLocalIntensity] = useState(animationIntensity)

  // Load audio data
  useEffect(() => {
    loadAudioData(wordId).then((data) => {
      if (data) {
        setAudioData(data)
      }
    })
  }, [wordId])

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !word) return

    // Create WaveSurfer instance
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4D4D59',
      progressColor: '#00B4D8',
      cursorColor: '#FF006E',
      barWidth: 2,
      barRadius: 3,
      height: 100,
      normalize: true,
      backend: 'WebAudio',
      interact: false,
    })

    // Use audio data if available
    if (audioData?.volume_db) {
      // Normalize volume data to 0-1 range
      const minDb = -40
      const maxDb = 0
      const peaks = Array.isArray(audioData.volume_db)
        ? audioData.volume_db.map((db: number) => {
            const normalized = (db - minDb) / (maxDb - minDb)
            return Math.max(0, Math.min(1, normalized))
          })
        : Array(100)
            .fill(0)
            .map(() => Math.random() * 0.8 + 0.2)

      ws.load('', [peaks])
    } else {
      // Generate mock data for testing
      const duration = word.end - word.start
      const sampleRate = 100
      const peaks = Array.from(
        { length: Math.round(duration * sampleRate) },
        () => Math.random() * 0.8 + 0.2
      )
      ws.load('', [peaks], duration)
    }

    wavesurferRef.current = ws

    // Cleanup
    return () => {
      ws.destroy()
    }
  }, [word, audioData])

  // Handle play/pause
  const togglePlayback = useCallback(() => {
    if (!wavesurferRef.current) return

    if (isPlaying) {
      wavesurferRef.current.pause()
    } else {
      wavesurferRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  // Calculate bar positions (0-1 scale)
  const getBarPosition = useCallback(
    (time: number) => {
      if (!word) return 0
      const duration = word.end - word.start
      const position = (time - word.start) / duration
      return Math.max(0, Math.min(1, position))
    },
    [word]
  )

  // Handle drag start
  const handleDragStart = useCallback((barId: string, e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(barId)
  }, [])

  // Handle drag move
  useEffect(() => {
    if (!isDragging || !word || !waveformRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = waveformRef.current!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const position = Math.max(0, Math.min(1, x / rect.width))
      const duration = word.end - word.start
      const time = word.start + position * duration

      if (isDragging === 'timing-start') {
        const newStart = Math.min(time, localTiming.end - 0.1)
        setLocalTiming((prev) => ({ ...prev, start: newStart }))
        // Don't save to history during drag, only update local state
      } else if (isDragging === 'timing-end') {
        const newEnd = Math.max(time, localTiming.start + 0.1)
        setLocalTiming((prev) => ({ ...prev, end: newEnd }))
        // Don't save to history during drag, only update local state
      } else if (isDragging === 'animation-min') {
        const newMin = Math.min(position, localIntensity.max - 0.05)
        setLocalIntensity((prev) => ({ ...prev, min: newMin }))
        // Don't save to history during drag, only update local state
      } else if (isDragging === 'animation-max') {
        const newMax = Math.max(position, localIntensity.min + 0.05)
        setLocalIntensity((prev) => ({ ...prev, max: newMax }))
        // Don't save to history during drag, only update local state
      }
    }

    const handleMouseUp = () => {
      // Save to history only when drag ends
      if (isDragging === 'timing-start' || isDragging === 'timing-end') {
        updateWordTiming(wordId, localTiming.start, localTiming.end)
        setHasUnsavedChanges(true)
      } else if (
        isDragging === 'animation-min' ||
        isDragging === 'animation-max'
      ) {
        updateAnimationIntensity(wordId, localIntensity.min, localIntensity.max)
        setHasUnsavedChanges(true)
      }
      setIsDragging(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    isDragging,
    word,
    wordId,
    localTiming,
    localIntensity,
    updateWordTiming,
    updateAnimationIntensity,
    setHasUnsavedChanges,
  ])

  if (!word) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#2A2A33] rounded-lg shadow-2xl w-[700px] max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#383842]">
          <h3 className="text-lg font-semibold text-[#F2F2F2]">
            단어 상세 편집: {`"${word.text}"`}
          </h3>
          <button
            onClick={closeWordDetailEditor}
            className="p-1 hover:bg-[#383842] rounded transition-colors"
          >
            <IoClose size={20} className="text-[#9999A6]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Word Text Display */}
          <div className="mb-6 text-center">
            <div className="text-3xl font-bold text-[#F2F2F2] mb-2">
              {word.text}
            </div>
            <div className="text-sm text-[#9999A6]">
              {localTiming.start.toFixed(2)}s - {localTiming.end.toFixed(2)}s
            </div>
          </div>

          {/* Waveform Container */}
          <div className="relative bg-[#1A1A22] rounded-lg p-4 mb-6">
            {/* Red center line */}
            <div
              className="absolute left-0 right-0 top-1/2 h-px bg-red-500 opacity-50 pointer-events-none z-10"
              style={{ transform: 'translateY(-50%)' }}
            />

            {/* Waveform */}
            <div ref={waveformRef} className="relative" />

            {/* Timing Bars (White) - Top */}
            <div
              className="absolute top-0 w-1 bg-white cursor-ew-resize hover:bg-gray-300 transition-colors"
              style={{
                left: `${getBarPosition(localTiming.start) * 100}%`,
                transform: 'translateX(-50%)',
                height: '50%',
              }}
              onMouseDown={(e) => handleDragStart('timing-start', e)}
              title="시작 시간"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {localTiming.start.toFixed(2)}초
              </div>
            </div>

            <div
              className="absolute top-0 w-1 bg-white cursor-ew-resize hover:bg-gray-300 transition-colors"
              style={{
                left: `${getBarPosition(localTiming.end) * 100}%`,
                transform: 'translateX(-50%)',
                height: '50%',
              }}
              onMouseDown={(e) => handleDragStart('timing-end', e)}
              title="종료 시간"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {localTiming.end.toFixed(2)}초
              </div>
            </div>

            {/* Animation Intensity Bars (Cyan) - Bottom */}
            <div
              className="absolute bottom-0 w-1 bg-cyan-400 cursor-ew-resize hover:bg-cyan-300 transition-colors"
              style={{
                left: `${localIntensity.min * 100}%`,
                transform: 'translateX(-50%)',
                height: '50%',
              }}
              onMouseDown={(e) => handleDragStart('animation-min', e)}
              title="최소 강도"
            >
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {(localIntensity.min * 100).toFixed(0)}%
              </div>
            </div>

            <div
              className="absolute bottom-0 w-1 bg-cyan-400 cursor-ew-resize hover:bg-cyan-300 transition-colors"
              style={{
                left: `${localIntensity.max * 100}%`,
                transform: 'translateX(-50%)',
                height: '50%',
              }}
              onMouseDown={(e) => handleDragStart('animation-max', e)}
              title="최대 강도"
            >
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {(localIntensity.max * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Animation Track Labels */}
          <div className="flex items-center justify-between text-xs text-[#9999A6] mb-6 mt-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-sm"></div>
                <span>타이밍 (위쪽)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-sm"></div>
                <span>애니메이션 강도 (아래쪽)</span>
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={togglePlayback}
              className="p-3 bg-[#383842] hover:bg-[#4D4D59] rounded-full transition-colors"
            >
              {isPlaying ? (
                <IoPause size={24} className="text-[#F2F2F2]" />
              ) : (
                <IoPlay size={24} className="text-[#F2F2F2]" />
              )}
            </button>
          </div>

          {/* Animation Track Selection */}
          <div className="space-y-2">
            <label className="text-sm text-[#9999A6]">애니메이션 트랙</label>
            <div className="grid grid-cols-2 gap-2">
              <button className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors">
                UP
              </button>
              <button className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors">
                POP
              </button>
            </div>
          </div>

          {/* Auto-save notice */}
          <div className="mt-4 text-xs text-[#9999A6] text-center">
            변경사항은 자동으로 저장됩니다
          </div>
        </div>
      </div>
    </div>
  )
}
