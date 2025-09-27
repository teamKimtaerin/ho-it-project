/**
 * Optimized hook for generating waveform data using Web Workers
 */

import { useCallback, useRef } from 'react'
import { useEditorStore } from '@/app/(route)/editor/store'
import {
  extractAudioBuffer,
  extractAudioBufferFromUrl,
  generateFallbackWaveform,
  WaveformData,
} from '@/utils/audio/waveformExtractor'

interface WorkerMessage {
  type: 'GENERATE_WAVEFORM'
  audioBuffer: AudioBuffer
  samplesPerSecond?: number
}

interface WorkerResponse {
  type: 'WAVEFORM_GENERATED' | 'WAVEFORM_ERROR'
  data?: WaveformData
  error?: string
}

export function useWaveformGenerationOptimized() {
  const {
    setAudioBuffer,
    setGlobalWaveformData,
    setWaveformLoading,
    setWaveformError,
    clearWaveformData,
    videoDuration,
  } = useEditorStore()

  const workerRef = useRef<Worker | null>(null)

  /**
   * Initialize Web Worker for waveform generation
   */
  const initializeWorker = useCallback(() => {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, falling back to main thread')
      return null
    }

    try {
      // Create worker from blob to avoid external file dependency
      const workerCode = `
        // Worker code for waveform generation
        function generateWaveformPeaks(audioBuffer, samplesPerSecond = 100) {
          const sampleRate = audioBuffer.sampleRate
          const duration = audioBuffer.duration
          const totalSamples = Math.floor(duration * samplesPerSecond)
          const samplesPerPeak = Math.floor(sampleRate / samplesPerSecond)

          // Get the first channel (mono) or mix down stereo to mono
          const channelData = audioBuffer.getChannelData(0)
          const peaks = []

          for (let i = 0; i < totalSamples; i++) {
            const start = i * samplesPerPeak
            const end = Math.min(start + samplesPerPeak, channelData.length)

            let max = 0
            for (let j = start; j < end; j++) {
              const sample = Math.abs(channelData[j])
              if (sample > max) {
                max = sample
              }
            }

            peaks.push(max)
          }

          // Normalize peaks to 0-1 range
          const maxPeak = Math.max(...peaks)
          if (maxPeak > 0) {
            for (let i = 0; i < peaks.length; i++) {
              peaks[i] = peaks[i] / maxPeak
            }
          }

          return {
            peaks,
            sampleRate: samplesPerSecond,
            duration
          }
        }

        self.onmessage = function(e) {
          const { type, audioBuffer, samplesPerSecond = 100 } = e.data

          if (type === 'GENERATE_WAVEFORM') {
            try {
              console.log('🔧 Worker: Starting waveform generation...')

              const waveformData = generateWaveformPeaks(audioBuffer, samplesPerSecond)

              console.log('✅ Worker: Waveform generation completed', {
                duration: waveformData.duration,
                peaksCount: waveformData.peaks.length,
                sampleRate: waveformData.sampleRate
              })

              self.postMessage({
                type: 'WAVEFORM_GENERATED',
                data: waveformData
              })
            } catch (error) {
              console.error('❌ Worker: Waveform generation failed:', error)

              self.postMessage({
                type: 'WAVEFORM_ERROR',
                error: error.message || 'Unknown error'
              })
            }
          }
        }
      `

      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const worker = new Worker(URL.createObjectURL(blob))

      console.log('✅ Web Worker initialized for waveform generation')
      return worker
    } catch (error) {
      console.error('❌ Failed to initialize Web Worker:', error)
      return null
    }
  }, [])

  /**
   * Generate waveform using Web Worker (or fallback to main thread)
   */
  const generateWaveformWithWorker = useCallback(
    async (audioBuffer: AudioBuffer): Promise<WaveformData | null> => {
      return new Promise((resolve, reject) => {
        // Try to use Web Worker first
        if (!workerRef.current) {
          workerRef.current = initializeWorker()
        }

        if (workerRef.current) {
          // Use Web Worker
          const handleMessage = (e: MessageEvent<WorkerResponse>) => {
            const { type, data, error } = e.data

            workerRef.current?.removeEventListener('message', handleMessage)

            if (type === 'WAVEFORM_GENERATED' && data) {
              resolve(data)
            } else if (type === 'WAVEFORM_ERROR') {
              reject(new Error(error || 'Worker error'))
            }
          }

          workerRef.current.addEventListener('message', handleMessage)

          const message: WorkerMessage = {
            type: 'GENERATE_WAVEFORM',
            audioBuffer,
            samplesPerSecond: 100,
          }

          workerRef.current.postMessage(message)
        } else {
          // Fallback to main thread
          console.warn(
            'Using main thread for waveform generation (no worker available)'
          )

          try {
            // Import and use the main thread function
            import('@/utils/audio/waveformExtractor')
              .then(({ generateWaveformPeaks }) => {
                const result = generateWaveformPeaks(audioBuffer, 100)
                resolve(result)
              })
              .catch(reject)
          } catch (error) {
            reject(error)
          }
        }
      })
    },
    [initializeWorker]
  )

  /**
   * Generate waveform data from uploaded file (optimized version)
   */
  const generateWaveformFromFile = useCallback(
    async (file: File): Promise<WaveformData | null> => {
      try {
        setWaveformLoading(true)
        setWaveformError(null)

        console.log(
          '🎵 Starting optimized waveform generation from file:',
          file.name
        )

        // Extract audio buffer from file
        const audioBuffer = await extractAudioBuffer(file)
        setAudioBuffer(audioBuffer)

        // Generate waveform using Web Worker
        const waveformData = await generateWaveformWithWorker(audioBuffer)

        if (waveformData) {
          setGlobalWaveformData(waveformData)

          console.log('✅ Optimized waveform generated successfully:', {
            duration: waveformData.duration,
            peaksCount: waveformData.peaks.length,
            sampleRate: waveformData.sampleRate,
          })

          return waveformData
        } else {
          throw new Error('Failed to generate waveform data')
        }
      } catch (error) {
        console.error(
          '❌ Failed to generate optimized waveform from file:',
          error
        )
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
      generateWaveformWithWorker,
      setAudioBuffer,
      setGlobalWaveformData,
      setWaveformLoading,
      setWaveformError,
      videoDuration,
    ]
  )

  /**
   * Generate waveform data from video URL (optimized version)
   */
  const generateWaveformFromUrl = useCallback(
    async (videoUrl: string): Promise<WaveformData | null> => {
      try {
        setWaveformLoading(true)
        setWaveformError(null)

        console.log(
          '🎵 Starting optimized waveform generation from URL:',
          videoUrl
        )

        // Extract audio buffer from URL
        const audioBuffer = await extractAudioBufferFromUrl(videoUrl)
        setAudioBuffer(audioBuffer)

        // Generate waveform using Web Worker
        const waveformData = await generateWaveformWithWorker(audioBuffer)

        if (waveformData) {
          setGlobalWaveformData(waveformData)

          console.log(
            '✅ Optimized waveform generated successfully from URL:',
            {
              duration: waveformData.duration,
              peaksCount: waveformData.peaks.length,
              sampleRate: waveformData.sampleRate,
            }
          )

          return waveformData
        } else {
          throw new Error('Failed to generate waveform data')
        }
      } catch (error) {
        console.error(
          '❌ Failed to generate optimized waveform from URL:',
          error
        )
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
      generateWaveformWithWorker,
      setAudioBuffer,
      setGlobalWaveformData,
      setWaveformLoading,
      setWaveformError,
      videoDuration,
    ]
  )

  /**
   * Clear all waveform data and cleanup worker
   */
  const clearWaveform = useCallback(() => {
    console.log('🧹 Clearing optimized waveform data')

    // Cleanup worker
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
      console.log('🔧 Web Worker terminated')
    }

    clearWaveformData()
  }, [clearWaveformData])

  /**
   * Generate waveform data automatically based on input type (optimized)
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
