/**
 * Audio waveform extraction utilities using Web Audio API
 */

export interface WaveformData {
  peaks: number[]
  sampleRate: number
  duration: number
}

/**
 * Extract AudioBuffer from video/audio file
 */
export async function extractAudioBuffer(file: File): Promise<AudioBuffer> {
  try {
    const audioContext = new AudioContext()
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Close the context to free resources
    await audioContext.close()

    return audioBuffer
  } catch (error) {
    console.error('Failed to extract audio buffer:', error)
    throw new Error(
      `Audio extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract AudioBuffer from video URL (blob URL)
 */
export async function extractAudioBufferFromUrl(
  videoUrl: string
): Promise<AudioBuffer> {
  try {
    const response = await fetch(videoUrl)
    const arrayBuffer = await response.arrayBuffer()

    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Close the context to free resources
    await audioContext.close()

    return audioBuffer
  } catch (error) {
    console.error('Failed to extract audio buffer from URL:', error)
    throw new Error(
      `Audio extraction from URL failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate waveform peaks from AudioBuffer
 * @param audioBuffer - The audio buffer to process
 * @param samplesPerSecond - Number of samples per second for peaks (default: 100)
 * @returns Array of peak values normalized to 0-1
 */
export function generateWaveformPeaks(
  audioBuffer: AudioBuffer,
  samplesPerSecond: number = 100
): WaveformData {
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration
  const totalSamples = Math.floor(duration * samplesPerSecond)
  const samplesPerPeak = Math.floor(sampleRate / samplesPerSecond)

  // Get the first channel (mono) or mix down stereo to mono
  const channelData = audioBuffer.getChannelData(0)
  const peaks: number[] = []

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
    duration,
  }
}

/**
 * Extract peaks for a specific time segment
 * @param waveformData - The complete waveform data
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @returns Array of peak values for the specified segment
 */
export function getSegmentPeaks(
  waveformData: WaveformData,
  startTime: number,
  endTime: number
): number[] {
  const { peaks, sampleRate } = waveformData

  const startIndex = Math.floor(startTime * sampleRate)
  const endIndex = Math.floor(endTime * sampleRate)

  const segmentPeaks = peaks.slice(
    Math.max(0, startIndex),
    Math.min(peaks.length, endIndex)
  )

  // Ensure we have at least some data
  if (segmentPeaks.length === 0) {
    return [0.1] // Return minimal peak to avoid empty waveform
  }

  return segmentPeaks
}

/**
 * Apply smoothing to waveform peaks for better visual appearance
 * @param peaks - Array of peak values
 * @param radius - Smoothing radius (default: 2)
 * @returns Smoothed peaks array
 */
export function smoothWaveformPeaks(
  peaks: number[],
  radius: number = 2
): number[] {
  if (peaks.length <= radius * 2) {
    return [...peaks]
  }

  const smoothed = [...peaks]

  for (let i = radius; i < peaks.length - radius; i++) {
    let sum = 0
    let count = 0

    for (let j = -radius; j <= radius; j++) {
      sum += peaks[i + j]
      count++
    }

    smoothed[i] = sum / count
  }

  return smoothed
}

/**
 * Generate fallback waveform data for when audio extraction fails
 * @param duration - Duration in seconds
 * @param samplesPerSecond - Samples per second
 * @returns Fallback waveform data
 */
export function generateFallbackWaveform(
  duration: number,
  samplesPerSecond: number = 100
): WaveformData {
  const totalSamples = Math.floor(duration * samplesPerSecond)
  const peaks: number[] = []

  // Generate a simple sine wave pattern as fallback
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples
    const value =
      0.3 + 0.4 * Math.sin(t * Math.PI * 8) + 0.2 * Math.sin(t * Math.PI * 20)
    peaks.push(Math.max(0, Math.min(1, value)))
  }

  return {
    peaks,
    sampleRate: samplesPerSecond,
    duration,
  }
}
