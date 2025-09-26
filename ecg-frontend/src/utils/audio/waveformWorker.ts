/**
 * Web Worker for audio waveform generation to avoid blocking the main thread
 */

import { generateWaveformPeaks, WaveformData } from './waveformExtractor'

// Worker message types
interface GenerateWaveformMessage {
  type: 'GENERATE_WAVEFORM'
  audioBuffer: AudioBuffer
  samplesPerSecond?: number
}

interface WorkerResponse {
  type: 'WAVEFORM_GENERATED' | 'WAVEFORM_ERROR'
  data?: WaveformData
  error?: string
}

// Handle messages from main thread
self.onmessage = async function (e: MessageEvent<GenerateWaveformMessage>) {
  const { type, audioBuffer, samplesPerSecond = 100 } = e.data

  if (type === 'GENERATE_WAVEFORM') {
    try {
      console.log('🔧 Worker: Starting waveform generation...')

      // Generate waveform in worker thread
      const waveformData = generateWaveformPeaks(audioBuffer, samplesPerSecond)

      console.log('✅ Worker: Waveform generation completed', {
        duration: waveformData.duration,
        peaksCount: waveformData.peaks.length,
        sampleRate: waveformData.sampleRate,
      })

      // Send result back to main thread
      const response: WorkerResponse = {
        type: 'WAVEFORM_GENERATED',
        data: waveformData,
      }

      self.postMessage(response)
    } catch (error) {
      console.error('❌ Worker: Waveform generation failed:', error)

      const response: WorkerResponse = {
        type: 'WAVEFORM_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      }

      self.postMessage(response)
    }
  }
}

export {} // Make this a module
