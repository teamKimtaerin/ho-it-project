/**
 * Audio Data Mapper
 *
 * Maps raw audio analysis data (real.json format) to standardized template-compatible format.
 * Provides helper functions for common audio analysis computations.
 */

import {
  AudioAnalysisData,
  AudioSegment,
  AudioWord,
} from '../types/template.types'

export interface RawAudioData {
  metadata?: unknown
  speakers?: unknown
  segments: Array<{
    start_time: number
    end_time: number
    duration: number
    speaker?: {
      speaker_id: string
      confidence: number
      gender?: string
      age_group?: string
    }
    emotion?: {
      emotion: string
      confidence: number
      probabilities: Record<string, number>
    }
    acoustic_features?: {
      spectral_centroid: number
      spectral_rolloff: number
      zero_crossing_rate: number
      energy: number
      pitch_mean: number
      pitch_std: number
      mfcc_mean: number[]
    }
    text: string
    words: Array<{
      word: string
      start: number
      end: number
      confidence: number
      volume_db?: number
      pitch_hz?: number
      harmonics_ratio?: number
      spectral_centroid?: number
    }>
  }>
  volume_statistics?: unknown
  pitch_statistics?: unknown
  harmonics_statistics?: unknown
  spectral_statistics?: unknown
}

export interface AudioStatistics {
  volume: {
    global_min_db: number
    global_max_db: number
    global_mean_db: number
    baseline_db: number
    whisper_threshold_db: number
    loud_threshold_db: number
    dynamic_range_db: number
  }
  pitch: {
    global_min_hz: number
    global_max_hz: number
    global_mean_hz: number
    baseline_range: { min_hz: number; max_hz: number }
    dynamic_range_hz: number
    median_hz: number
  }
  harmonics: {
    global_min_ratio: number
    global_max_ratio: number
    global_mean_ratio: number
    baseline_ratio: number
  }
  spectral: {
    global_min_hz: number
    global_max_hz: number
    global_mean_hz: number
    baseline_hz: number
    brightness_score: number
  }
  timing: {
    total_duration: number
    speech_duration: number
    silence_duration: number
    speech_ratio: number
    average_word_duration: number
    words_per_minute: number
  }
  emotion: {
    dominant_emotion: string
    emotion_distribution: Record<string, number>
    emotional_intensity_avg: number
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Template system will be rewritten - temporarily disable any types
export class AudioDataMapper {
  /**
   * Convert raw audio data to standardized format
   */
  static mapToStandardFormat(rawData: RawAudioData): AudioAnalysisData {
    // Compute enhanced statistics
    const statistics = this.computeEnhancedStatistics(rawData)

    return {
      metadata: {
        filename:
          ((rawData.metadata as Record<string, unknown>)?.filename as string) ||
          'unknown',
        duration:
          ((rawData.metadata as Record<string, unknown>)?.duration as number) ||
          statistics.timing.total_duration,
        total_segments: rawData.segments?.length || 0,
        unique_speakers:
          ((rawData.metadata as Record<string, unknown>)
            ?.unique_speakers as number) || this.countUniqueSpeakers(rawData),
        dominant_emotion:
          ((rawData.metadata as Record<string, unknown>)
            ?.dominant_emotion as string) ||
          statistics.emotion.dominant_emotion,
        avg_confidence:
          ((rawData.metadata as Record<string, unknown>)
            ?.avg_confidence as number) ||
          this.computeAverageConfidence(rawData),
      },
      speakers:
        (rawData.speakers as Record<
          string,
          {
            total_duration: number
            segment_count: number
            avg_confidence: number
            emotions: string[]
          }
        >) || this.computeSpeakerStats(rawData),
      segments: rawData.segments.map(this.mapSegment),
      volume_statistics: statistics.volume,
      pitch_statistics: statistics.pitch,
      harmonics_statistics: statistics.harmonics,
      spectral_statistics: statistics.spectral,
    }
  }

  /**
   * Map individual segment
   */
  private static mapSegment(
    rawSegment: RawAudioData['segments'][0]
  ): AudioSegment {
    return {
      start_time: rawSegment.start_time,
      end_time: rawSegment.end_time,
      duration: rawSegment.duration,
      speaker: {
        speaker_id: rawSegment.speaker?.speaker_id || 'UNKNOWN',
        confidence: rawSegment.speaker?.confidence || 0,
        gender: rawSegment.speaker?.gender || undefined,
        age_group: rawSegment.speaker?.age_group || undefined,
      },
      emotion: {
        emotion: rawSegment.emotion?.emotion || 'neutral',
        confidence: rawSegment.emotion?.confidence || 0,
        probabilities: rawSegment.emotion?.probabilities || { neutral: 1.0 },
      },
      acoustic_features: {
        spectral_centroid: rawSegment.acoustic_features?.spectral_centroid || 0,
        spectral_rolloff: rawSegment.acoustic_features?.spectral_rolloff || 0,
        zero_crossing_rate:
          rawSegment.acoustic_features?.zero_crossing_rate || 0,
        energy: rawSegment.acoustic_features?.energy || 0,
        pitch_mean: rawSegment.acoustic_features?.pitch_mean || 0,
        pitch_std: rawSegment.acoustic_features?.pitch_std || 0,
        mfcc_mean: rawSegment.acoustic_features?.mfcc_mean || [],
      },
      text: rawSegment.text,
      words: rawSegment.words.map(this.mapWord),
    }
  }

  /**
   * Map individual word
   */
  private static mapWord(
    rawWord: RawAudioData['segments'][0]['words'][0]
  ): AudioWord {
    return {
      word: rawWord.word,
      start: rawWord.start,
      end: rawWord.end,
      confidence: rawWord.confidence,
      volume_db: rawWord.volume_db || -30, // Default to moderate volume
      pitch_hz: rawWord.pitch_hz || 440, // Default to A4
      harmonics_ratio: rawWord.harmonics_ratio || 1.0,
      spectral_centroid: rawWord.spectral_centroid || 1000,
    }
  }

  /**
   * Compute enhanced statistics from raw data
   */
  static computeEnhancedStatistics(rawData: RawAudioData): AudioStatistics {
    const allWords = rawData.segments.flatMap((s) => s.words)
    const volumeValues = allWords
      .map((w) => w.volume_db || -30)
      .filter((v) => v !== null)
    const pitchValues = allWords
      .map((w) => w.pitch_hz || 440)
      .filter((v) => v !== null)
    const spectralValues = allWords
      .map((w) => w.spectral_centroid || 1000)
      .filter((v) => v !== null)

    // Volume statistics
    const volumeStats = {
      global_min_db: Math.min(...volumeValues),
      global_max_db: Math.max(...volumeValues),
      global_mean_db: this.mean(volumeValues),
      baseline_db: this.percentile(volumeValues, 50), // Median as baseline
      whisper_threshold_db: this.percentile(volumeValues, 25),
      loud_threshold_db: this.percentile(volumeValues, 75),
      dynamic_range_db: Math.max(...volumeValues) - Math.min(...volumeValues),
    }

    // Pitch statistics
    const pitchStats = {
      global_min_hz: Math.min(...pitchValues),
      global_max_hz: Math.max(...pitchValues),
      global_mean_hz: this.mean(pitchValues),
      baseline_range: {
        min_hz: this.percentile(pitchValues, 25),
        max_hz: this.percentile(pitchValues, 75),
      },
      dynamic_range_hz: Math.max(...pitchValues) - Math.min(...pitchValues),
      median_hz: this.percentile(pitchValues, 50),
    }

    // Harmonics statistics
    const harmonicsValues = allWords.map((w) => w.harmonics_ratio || 1.0)
    const harmonicsStats = {
      global_min_ratio: Math.min(...harmonicsValues),
      global_max_ratio: Math.max(...harmonicsValues),
      global_mean_ratio: this.mean(harmonicsValues),
      baseline_ratio: this.percentile(harmonicsValues, 50),
    }

    // Spectral statistics
    const spectralStats = {
      global_min_hz: Math.min(...spectralValues),
      global_max_hz: Math.max(...spectralValues),
      global_mean_hz: this.mean(spectralValues),
      baseline_hz: this.percentile(spectralValues, 50),
      brightness_score: this.mean(spectralValues) / 2000, // Normalized brightness
    }

    // Timing statistics
    const totalDuration =
      ((rawData.metadata as Record<string, unknown>)?.duration as number) ||
      Math.max(...rawData.segments.map((s) => s.end_time))
    const speechDuration = rawData.segments.reduce(
      (sum, s) => sum + s.duration,
      0
    )
    const wordDurations = allWords.map((w) => w.end - w.start)

    const timingStats = {
      total_duration: totalDuration,
      speech_duration: speechDuration,
      silence_duration: totalDuration - speechDuration,
      speech_ratio: speechDuration / totalDuration,
      average_word_duration: this.mean(wordDurations),
      words_per_minute: (allWords.length / totalDuration) * 60,
    }

    // Emotion statistics
    const emotionCounts: Record<string, number> = {}
    let totalEmotionConfidence = 0
    let emotionSampleCount = 0

    rawData.segments.forEach((segment) => {
      if (segment.emotion) {
        const emotion = segment.emotion.emotion
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
        totalEmotionConfidence += segment.emotion.confidence
        emotionSampleCount++
      }
    })

    const dominantEmotion = Object.entries(emotionCounts).reduce(
      (max, [emotion, count]) => (count > max[1] ? [emotion, count] : max),
      ['neutral', 0]
    )[0]

    const emotionStats = {
      dominant_emotion: dominantEmotion,
      emotion_distribution: this.normalizeDistribution(emotionCounts),
      emotional_intensity_avg:
        emotionSampleCount > 0
          ? totalEmotionConfidence / emotionSampleCount
          : 0,
    }

    return {
      volume: volumeStats,
      pitch: pitchStats,
      harmonics: harmonicsStats,
      spectral: spectralStats,
      timing: timingStats,
      emotion: emotionStats,
    }
  }

  /**
   * Get field value from audio analysis data using dot notation
   */
  static getFieldValue(data: AudioAnalysisData, fieldPath: string): unknown {
    const path = fieldPath.split('.')
    let current: unknown = data

    for (const key of path) {
      if (current === null || current === undefined) {
        return undefined
      }
      current = (current as Record<string, unknown>)[key]
    }

    return current
  }

  /**
   * Calculate derived metrics for template conditions
   */
  static calculateDerivedMetrics(
    data: AudioAnalysisData
  ): Record<string, number> {
    return {
      // Volume-based metrics
      volume_loudness_threshold:
        data.volume_statistics.baseline_db +
        (data.volume_statistics.global_max_db -
          data.volume_statistics.baseline_db) *
          0.7,

      volume_whisper_threshold:
        data.volume_statistics.baseline_db +
        (data.volume_statistics.baseline_db -
          data.volume_statistics.global_min_db) *
          0.3,

      // Pitch-based metrics
      pitch_high_threshold:
        data.pitch_statistics.baseline_range.max_hz +
        (data.pitch_statistics.global_max_hz -
          data.pitch_statistics.baseline_range.max_hz) *
          0.5,

      pitch_low_threshold:
        data.pitch_statistics.baseline_range.min_hz -
        (data.pitch_statistics.baseline_range.min_hz -
          data.pitch_statistics.global_min_hz) *
          0.5,

      // Energy-based metrics (if available)
      energy_threshold: 0.05, // Default energy threshold for dynamic content

      // Spectral brightness
      spectral_brightness_threshold: data.spectral_statistics.baseline_hz * 1.2,

      // Combined metrics
      emphasis_score: this.calculateEmphasisScore(data),
      clarity_score: this.calculateClarityScore(data),
      dynamic_range_score: this.calculateDynamicRangeScore(data),
    }
  }

  /**
   * Calculate emphasis score based on volume and pitch dynamics
   */
  private static calculateEmphasisScore(data: AudioAnalysisData): number {
    const volumeRange =
      data.volume_statistics.global_max_db -
      data.volume_statistics.global_min_db
    const pitchRange =
      data.pitch_statistics.global_max_hz - data.pitch_statistics.global_min_hz

    // Normalize to 0-1 scale
    const normalizedVolumeRange = Math.min(volumeRange / 30, 1) // 30dB is high dynamic range
    const normalizedPitchRange = Math.min(pitchRange / 1000, 1) // 1000Hz is high pitch range

    return (normalizedVolumeRange + normalizedPitchRange) / 2
  }

  /**
   * Calculate clarity score based on spectral characteristics
   */
  private static calculateClarityScore(data: AudioAnalysisData): number {
    const spectralCentroid = data.spectral_statistics.global_mean_hz
    const brightness = spectralCentroid / 4000 // Normalized to typical speech range

    return Math.min(brightness, 1)
  }

  /**
   * Calculate dynamic range score
   */
  private static calculateDynamicRangeScore(data: AudioAnalysisData): number {
    const volumeDynamics =
      (data.volume_statistics.global_max_db -
        data.volume_statistics.global_min_db) /
      40
    const pitchDynamics =
      (data.pitch_statistics.global_max_hz -
        data.pitch_statistics.global_min_hz) /
      2000

    return Math.min((volumeDynamics + pitchDynamics) / 2, 1)
  }

  // Statistical helper functions
  private static mean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private static percentile(values: number[], p: number): number {
    const sorted = values.sort((a, b) => a - b)
    const index = (p / 100) * (sorted.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)

    if (lower === upper) {
      return sorted[lower]
    }

    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower)
  }

  private static normalizeDistribution(
    counts: Record<string, number>
  ): Record<string, number> {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    const normalized: Record<string, number> = {}

    for (const [key, count] of Object.entries(counts)) {
      normalized[key] = count / total
    }

    return normalized
  }

  private static countUniqueSpeakers(rawData: RawAudioData): number {
    const speakers = new Set()
    rawData.segments.forEach((segment) => {
      if (segment.speaker?.speaker_id) {
        speakers.add(segment.speaker.speaker_id)
      }
    })
    return speakers.size
  }

  private static computeAverageConfidence(rawData: RawAudioData): number {
    const allWords = rawData.segments.flatMap((s) => s.words)
    const confidences = allWords.map((w) => w.confidence).filter((c) => c > 0)
    return confidences.length > 0 ? this.mean(confidences) : 0
  }

  private static computeSpeakerStats(
    rawData: RawAudioData
  ): Record<string, any> {
    const speakerStats: Record<string, any> = {}

    rawData.segments.forEach((segment) => {
      const speakerId = segment.speaker?.speaker_id || 'UNKNOWN'

      if (!speakerStats[speakerId]) {
        speakerStats[speakerId] = {
          total_duration: 0,
          segment_count: 0,
          avg_confidence: 0,
          emotions: new Set(),
        }
      }

      speakerStats[speakerId].total_duration += segment.duration
      speakerStats[speakerId].segment_count += 1
      speakerStats[speakerId].avg_confidence = segment.speaker?.confidence || 0

      if (segment.emotion?.emotion) {
        speakerStats[speakerId].emotions.add(segment.emotion.emotion)
      }
    })

    // Convert sets to arrays
    Object.values(speakerStats).forEach((stats: any) => {
      stats.emotions = Array.from(stats.emotions)
    })

    return speakerStats
  }
}
