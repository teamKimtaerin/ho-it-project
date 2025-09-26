/**
 * Hook for generating waveform data from uploaded videos
 */

import { useCallback } from 'react'
import { useEditorStore } from '@/app/(route)/editor/store'
import {
  extractAudioBuffer,
  extractAudioBufferFromUrl,
  generateWaveformPeaks,
  generateFallbackWaveform,
  WaveformData,
} from '@/utils/audio/waveformExtractor'

export function useWaveformGeneration() {
  const {
    setAudioBuffer,
    setGlobalWaveformData,
    setWaveformLoading,
    setWaveformError,
    clearWaveformData,
    videoDuration,
  } = useEditorStore()

  /**
   * Generate waveform data from uploaded file
   */
  const generateWaveformFromFile = useCallback(
    async (file: File): Promise<WaveformData | null> => {
      try {
        setWaveformLoading(true)
        setWaveformError(null)

        console.log('🎵 Starting waveform generation from file:', file.name)

        // Extract audio buffer from file
        const audioBuffer = await extractAudioBuffer(file)
        setAudioBuffer(audioBuffer)

        // Generate waveform peaks (100 samples per second for good resolution)
        const waveformData = generateWaveformPeaks(audioBuffer, 100)
        setGlobalWaveformData(waveformData)

        console.log('✅ Waveform generated successfully:', {
          duration: waveformData.duration,
          peaksCount: waveformData.peaks.length,
          sampleRate: waveformData.sampleRate,
        })

        return waveformData
      } catch (error) {
        console.error('❌ Failed to generate waveform from file:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        setWaveformError(`Failed to generate waveform: ${errorMessage}`)

        // Generate fallback waveform if we have video duration
        if (videoDuration) {
          console.log(
            '🔄 Generating fallback waveform with duration:',
            videoDuration
          )
          const fallbackData = generateFallbackWaveform(videoDuration, 100)
          setGlobalWaveformData(fallbackData)
          return fallbackData
        }

        return null
      } finally {
        setWaveformLoading(false)
      }
    },
    [
      setAudioBuffer,
      setGlobalWaveformData,
      setWaveformLoading,
      setWaveformError,
      videoDuration,
    ]
  )

  /**
   * Generate waveform data from video URL (blob URL)
   */
  const generateWaveformFromUrl = useCallback(
    async (videoUrl: string): Promise<WaveformData | null> => {
      try {
        setWaveformLoading(true)
        setWaveformError(null)

        console.log('🎵 Starting waveform generation from URL:', videoUrl)

        // Extract audio buffer from URL
        const audioBuffer = await extractAudioBufferFromUrl(videoUrl)
        setAudioBuffer(audioBuffer)

        // Generate waveform peaks (100 samples per second for good resolution)
        const waveformData = generateWaveformPeaks(audioBuffer, 100)
        setGlobalWaveformData(waveformData)

        console.log('✅ Waveform generated successfully from URL:', {
          duration: waveformData.duration,
          peaksCount: waveformData.peaks.length,
          sampleRate: waveformData.sampleRate,
        })

        return waveformData
      } catch (error) {
        console.error('❌ Failed to generate waveform from URL:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        setWaveformError(`Failed to generate waveform: ${errorMessage}`)

        // Generate fallback waveform if we have video duration
        if (videoDuration) {
          console.log(
            '🔄 Generating fallback waveform with duration:',
            videoDuration
          )
          const fallbackData = generateFallbackWaveform(videoDuration, 100)
          setGlobalWaveformData(fallbackData)
          return fallbackData
        }

        return null
      } finally {
        setWaveformLoading(false)
      }
    },
    [
      setAudioBuffer,
      setGlobalWaveformData,
      setWaveformLoading,
      setWaveformError,
      videoDuration,
    ]
  )

  /**
   * Clear all waveform data
   */
  const clearWaveform = useCallback(() => {
    console.log('🧹 Clearing waveform data')
    clearWaveformData()
  }, [clearWaveformData])

  /**
   * Generate waveform data automatically based on input type
   */
  const generateWaveform = useCallback(
    async (input: File | string): Promise<WaveformData | null> => {
      if (input instanceof File) {
        return generateWaveformFromFile(input)
      } else {
        return generateWaveformFromUrl(input)
      }
    },
    [generateWaveformFromFile, generateWaveformFromUrl]
  )

  return {
    generateWaveform,
    generateWaveformFromFile,
    generateWaveformFromUrl,
    clearWaveform,
  }
}
