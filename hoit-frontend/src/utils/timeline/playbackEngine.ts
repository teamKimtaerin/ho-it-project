/**
 * 재생 엔진 - 타임라인 재생 및 비디오 동기화 처리
 */

import {
  TimelineClip,
  // TrackType, // Unused import
} from '@/app/(route)/editor/store/slices/timelineSlice'
import { timelineEngine } from './timelineEngine'
import { ClipItem } from '@/app/(route)/editor/components/ClipComponent/types'

export interface PlaybackState {
  currentTime: number
  isPlaying: boolean
  activeClips: TimelineClip[]
  videoSourceTime: number
  currentSourceClip: ClipItem | null
}

export interface PlaybackSegment {
  startTime: number
  endTime: number
  sourceClipId: string
  sourceStartTime: number
  sourceEndTime: number
}

export class PlaybackEngine {
  private clips: TimelineClip[] = []
  private originalClips: ClipItem[] = []
  private isSequentialMode: boolean = true
  private clipOrder: string[] = []
  private playbackState: PlaybackState = {
    currentTime: 0,
    isPlaying: false,
    activeClips: [],
    videoSourceTime: 0,
    currentSourceClip: null,
  }

  private timeUpdateCallbacks: Array<(state: PlaybackState) => void> = []
  private videoPlayer: HTMLVideoElement | null = null

  /**
   * 재생 엔진 초기화 (연속 재생 모드 지원)
   */
  initialize(
    timelineClips: TimelineClip[],
    originalClips: ClipItem[],
    isSequentialMode: boolean = true,
    clipOrder?: string[]
  ): void {
    this.clips = timelineClips
    this.originalClips = originalClips
    this.isSequentialMode = isSequentialMode
    this.clipOrder = clipOrder || timelineClips.map((clip) => clip.id)
    console.log('PlaybackEngine initialized:', {
      clips: timelineClips.length,
      mode: isSequentialMode ? 'Sequential' : 'Timeline',
      order: this.clipOrder.length,
    })
  }

  /**
   * 연속 재생 모드 설정
   */
  setSequentialMode(isSequential: boolean, clipOrder?: string[]): void {
    this.isSequentialMode = isSequential
    if (clipOrder) {
      this.clipOrder = clipOrder
    }
    console.log(
      `PlaybackEngine mode changed to: ${isSequential ? 'Sequential' : 'Timeline'}`
    )
  }

  /**
   * 클립 순서 업데이트
   */
  updateClipOrder(newOrder: string[]): void {
    this.clipOrder = newOrder
    console.log('PlaybackEngine clip order updated:', newOrder.length, 'clips')
  }

  /**
   * 비디오 플레이어 레퍼런스 설정
   */
  setVideoPlayer(player: HTMLVideoElement): void {
    this.videoPlayer = player
  }

  /**
   * 시간 업데이트 콜백 등록
   */
  onTimeUpdate(callback: (state: PlaybackState) => void): void {
    this.timeUpdateCallbacks.push(callback)
  }

  /**
   * 시간 업데이트 콜백 제거
   */
  removeTimeUpdateCallback(callback: (state: PlaybackState) => void): void {
    const index = this.timeUpdateCallbacks.indexOf(callback)
    if (index > -1) {
      this.timeUpdateCallbacks.splice(index, 1)
    }
  }

  /**
   * 현재 재생 위치 설정 및 동기화 (연속 재생 모드 지원)
   */
  setCurrentTime(timelineTime: number): void {
    this.playbackState.currentTime = timelineTime

    // 연속 재생 모드와 일반 모드에 따라 다르게 처리
    const activeClips = this.isSequentialMode
      ? this.getSequentialActiveClips(timelineTime)
      : timelineEngine.getActiveClipsAtTime(this.clips, timelineTime)

    this.playbackState.activeClips = activeClips

    // 비디오 클립이 있다면 소스 시간으로 매핑
    const videoClip =
      activeClips.find((clip) => clip.track === 'video') ||
      activeClips.find((clip) => clip.track === 'subtitle') // 자막 클립도 비디오 동기화에 사용

    if (videoClip) {
      const mapping = this.isSequentialMode
        ? this.mapSequentialTimelineToSource(videoClip, timelineTime)
        : timelineEngine.mapTimelineToSource(videoClip, timelineTime)

      if (mapping.isValid) {
        this.playbackState.videoSourceTime = mapping.sourceTime

        // 해당 원본 클립 찾기
        const sourceClip =
          this.originalClips.find((clip) => clip.id === mapping.sourceClipId) ||
          null
        this.playbackState.currentSourceClip = sourceClip

        // 비디오 플레이어 동기화
        if (this.videoPlayer) {
          const actualVideoTime = this.calculateActualVideoTime(
            sourceClip,
            mapping.sourceTime
          )
          if (Math.abs(this.videoPlayer.currentTime - actualVideoTime) > 0.1) {
            this.videoPlayer.currentTime = actualVideoTime
          }
        }
      }
    } else {
      // 활성 클립이 없을 때
      this.playbackState.videoSourceTime = 0
      this.playbackState.currentSourceClip = null
    }

    // 콜백 호출
    this.notifyTimeUpdate()
  }

  /**
   * 연속 재생 모드에서 활성 클립 찾기
   */
  private getSequentialActiveClips(timelineTime: number): TimelineClip[] {
    // clipOrder에 따라 정렬된 클립들에서 현재 시간에 해당하는 클립 찾기
    const orderedClips = this.clipOrder
      .map((id) => this.clips.find((clip) => clip.id === id))
      .filter(Boolean) as TimelineClip[]

    return orderedClips.filter((clip) => {
      return (
        timelineTime >= clip.startTime &&
        timelineTime < clip.startTime + clip.duration &&
        clip.enabled
      )
    })
  }

  /**
   * 연속 재생 모드에서 타임라인 시간을 소스 시간으로 매핑
   */
  private mapSequentialTimelineToSource(
    clip: TimelineClip,
    timelineTime: number
  ): { isValid: boolean; sourceTime: number; sourceClipId: string } {
    // 클립 내에서의 상대 시간 계산
    const relativeTime = timelineTime - clip.startTime

    // inPoint와 outPoint 사이로 매핑
    const sourceTime = clip.inPoint + relativeTime

    return {
      isValid: sourceTime >= clip.inPoint && sourceTime <= clip.outPoint,
      sourceTime,
      sourceClipId: clip.sourceClipId,
    }
  }

  /**
   * 원본 클립의 상대 시간을 실제 비디오 시간으로 변환
   */
  private calculateActualVideoTime(
    sourceClip: ClipItem | null,
    sourceTime: number
  ): number {
    if (!sourceClip || !sourceClip.words || sourceClip.words.length === 0) {
      return sourceTime
    }

    // 클립의 첫 번째 단어 시작 시간을 기준으로 계산
    const firstWordStart = sourceClip.words[0].start
    const actualTime = firstWordStart + sourceTime

    return actualTime
  }

  /**
   * 재생 시작
   */
  play(): void {
    this.playbackState.isPlaying = true

    if (this.videoPlayer && this.playbackState.currentSourceClip) {
      this.videoPlayer.play().catch((error) => {
        console.warn('Failed to start video playback:', error)
      })
    }

    this.notifyTimeUpdate()
  }

  /**
   * 재생 일시정지
   */
  pause(): void {
    this.playbackState.isPlaying = false

    if (this.videoPlayer) {
      this.videoPlayer.pause()
    }

    this.notifyTimeUpdate()
  }

  /**
   * 재생 정지
   */
  stop(): void {
    this.playbackState.isPlaying = false
    this.setCurrentTime(0)

    if (this.videoPlayer) {
      this.videoPlayer.pause()
      this.videoPlayer.currentTime = 0
    }
  }

  /**
   * 특정 시간으로 시크
   */
  seekTo(timelineTime: number): void {
    this.setCurrentTime(timelineTime)
  }

  /**
   * 구간 재생
   */
  playSegment(startTime: number, endTime: number): void {
    this.setCurrentTime(startTime)
    this.play()

    // 구간 끝에서 자동 정지
    const checkEndTime = () => {
      if (this.playbackState.currentTime >= endTime) {
        this.pause()
        return
      }

      if (this.playbackState.isPlaying) {
        requestAnimationFrame(checkEndTime)
      }
    }

    requestAnimationFrame(checkEndTime)
  }

  /**
   * 다음 클립으로 이동 (연속 재생 모드 지원)
   */
  nextClip(): boolean {
    if (this.isSequentialMode) {
      return this.nextSequentialClip()
    } else {
      return this.nextTimelineClip()
    }
  }

  /**
   * 이전 클립으로 이동 (연속 재생 모드 지원)
   */
  previousClip(): boolean {
    if (this.isSequentialMode) {
      return this.previousSequentialClip()
    } else {
      return this.previousTimelineClip()
    }
  }

  /**
   * 연속 재생 모드에서 다음 클립으로 이동
   */
  private nextSequentialClip(): boolean {
    const currentTime = this.playbackState.currentTime

    // 현재 활성 클립 찾기
    const currentClip = this.getSequentialActiveClips(currentTime)[0]
    if (!currentClip) {
      // 현재 클립이 없으면 첫 번째 클립으로
      const firstClip = this.clipOrder
        .map((id) => this.clips.find((clip) => clip.id === id))
        .filter(Boolean)[0] as TimelineClip | undefined

      if (firstClip) {
        this.setCurrentTime(firstClip.startTime)
        return true
      }
      return false
    }

    // 순서상 다음 클립 찾기
    const currentIndex = this.clipOrder.indexOf(currentClip.id)
    if (currentIndex !== -1 && currentIndex < this.clipOrder.length - 1) {
      const nextClipId = this.clipOrder[currentIndex + 1]
      const nextClip = this.clips.find((clip) => clip.id === nextClipId)

      if (nextClip && nextClip.enabled) {
        this.setCurrentTime(nextClip.startTime)
        return true
      }
    }

    return false
  }

  /**
   * 연속 재생 모드에서 이전 클립으로 이동
   */
  private previousSequentialClip(): boolean {
    const currentTime = this.playbackState.currentTime

    // 현재 활성 클립 찾기
    const currentClip = this.getSequentialActiveClips(currentTime)[0]
    if (!currentClip) {
      return false
    }

    // 순서상 이전 클립 찾기
    const currentIndex = this.clipOrder.indexOf(currentClip.id)
    if (currentIndex > 0) {
      const prevClipId = this.clipOrder[currentIndex - 1]
      const prevClip = this.clips.find((clip) => clip.id === prevClipId)

      if (prevClip && prevClip.enabled) {
        this.setCurrentTime(prevClip.startTime)
        return true
      }
    }

    return false
  }

  /**
   * 일반 타임라인 모드에서 다음 클립으로 이동
   */
  private nextTimelineClip(): boolean {
    const currentTime = this.playbackState.currentTime
    const nextClip = this.clips
      .filter((clip) => clip.startTime > currentTime)
      .sort((a, b) => a.startTime - b.startTime)[0]

    if (nextClip) {
      this.setCurrentTime(nextClip.startTime)
      return true
    }

    return false
  }

  /**
   * 일반 타임라인 모드에서 이전 클립으로 이동
   */
  private previousTimelineClip(): boolean {
    const currentTime = this.playbackState.currentTime
    const prevClip = this.clips
      .filter((clip) => clip.startTime < currentTime)
      .sort((a, b) => b.startTime - a.startTime)[0]

    if (prevClip) {
      this.setCurrentTime(prevClip.startTime)
      return true
    }

    return false
  }

  /**
   * 클립 경계로 스냅
   */
  snapToClipBoundary(timelineTime: number, tolerance: number = 0.5): number {
    let closestTime = timelineTime
    let minDistance = tolerance

    // 모든 클립의 시작과 끝 시간을 검사
    for (const clip of this.clips) {
      const startDistance = Math.abs(timelineTime - clip.startTime)
      const endDistance = Math.abs(
        timelineTime - (clip.startTime + clip.duration)
      )

      if (startDistance < minDistance) {
        minDistance = startDistance
        closestTime = clip.startTime
      }

      if (endDistance < minDistance) {
        minDistance = endDistance
        closestTime = clip.startTime + clip.duration
      }
    }

    return closestTime
  }

  /**
   * 현재 활성 자막 클립들 가져오기
   */
  getActiveSubtitleClips(): TimelineClip[] {
    return this.playbackState.activeClips.filter(
      (clip) => clip.track === 'subtitle'
    )
  }

  /**
   * 현재 활성 비디오 클립 가져오기
   */
  getActiveVideoClip(): TimelineClip | null {
    const videoClips = this.playbackState.activeClips.filter(
      (clip) => clip.track === 'video'
    )
    return videoClips.length > 0 ? videoClips[0] : null
  }

  /**
   * 재생 세그먼트 목록 생성 (내보내기용)
   */
  generatePlaybackSegments(): PlaybackSegment[] {
    const segments: PlaybackSegment[] = []

    // 비디오/자막 클립들을 시간순으로 정렬
    const sortedClips = [...this.clips].sort(
      (a, b) => a.startTime - b.startTime
    )

    for (const clip of sortedClips) {
      if (!clip.enabled) continue

      const mapping = timelineEngine.mapTimelineToSource(clip, clip.startTime)
      if (!mapping.isValid) continue

      const segment: PlaybackSegment = {
        startTime: clip.startTime,
        endTime: clip.startTime + clip.duration,
        sourceClipId: clip.sourceClipId,
        sourceStartTime: mapping.sourceTime,
        sourceEndTime: mapping.sourceTime + clip.duration,
      }

      segments.push(segment)
    }

    return segments
  }

  /**
   * 현재 재생 상태 가져오기
   */
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState }
  }

  /**
   * 클립 업데이트 (연속 재생 모드 지원)
   */
  updateClips(newClips: TimelineClip[], newOrder?: string[]): void {
    this.clips = newClips
    if (newOrder) {
      this.clipOrder = newOrder
    }

    // 현재 시간에서 다시 계산
    this.setCurrentTime(this.playbackState.currentTime)
  }

  /**
   * 연속 재생 모드에서 자동으로 다음 클립으로 전환 (seamless transition)
   */
  checkAutoTransition(): boolean {
    if (!this.isSequentialMode || !this.playbackState.isPlaying) {
      return false
    }

    const currentTime = this.playbackState.currentTime
    const currentClip = this.getSequentialActiveClips(currentTime)[0]

    // 현재 클립이 끝나면 자동으로 다음 클립으로
    if (
      currentClip &&
      currentTime >= currentClip.startTime + currentClip.duration - 0.1
    ) {
      return this.nextSequentialClip()
    }

    return false
  }

  /**
   * 연속 재생 모드 상태 확인
   */
  getSequentialModeInfo(): {
    isSequentialMode: boolean
    clipOrder: string[]
    currentClipIndex: number
    totalClips: number
  } {
    const currentTime = this.playbackState.currentTime
    const currentClip = this.getSequentialActiveClips(currentTime)[0]
    const currentClipIndex = currentClip
      ? this.clipOrder.indexOf(currentClip.id)
      : -1

    return {
      isSequentialMode: this.isSequentialMode,
      clipOrder: [...this.clipOrder],
      currentClipIndex,
      totalClips: this.clipOrder.length,
    }
  }

  /**
   * 비디오 시간에서 타임라인 시간으로 역변환
   */
  videoTimeToTimelineTime(videoTime: number): number | null {
    // 현재 활성 클립이 있다면 그것을 기준으로 계산
    if (this.playbackState.currentSourceClip) {
      const sourceClip = this.playbackState.currentSourceClip
      const firstWordStart =
        sourceClip.words.length > 0 ? sourceClip.words[0].start : 0

      // 비디오 시간을 소스 클립의 상대 시간으로 변환
      const relativeSourceTime = videoTime - firstWordStart

      // 해당 소스 시간에 대응하는 타임라인 클립 찾기
      const timelineClip = this.clips.find(
        (clip) =>
          clip.sourceClipId === sourceClip.id &&
          relativeSourceTime >= clip.inPoint &&
          relativeSourceTime <= clip.outPoint
      )

      if (timelineClip) {
        const clipRelativeTime = relativeSourceTime - timelineClip.inPoint
        return timelineClip.startTime + clipRelativeTime
      }
    }

    return null
  }

  /**
   * 시간 업데이트 알림
   */
  private notifyTimeUpdate(): void {
    const state = this.getPlaybackState()
    this.timeUpdateCallbacks.forEach((callback) => {
      try {
        callback(state)
      } catch (error) {
        console.error('Error in time update callback:', error)
      }
    })
  }

  /**
   * 리소스 정리
   */
  cleanup(): void {
    this.timeUpdateCallbacks.length = 0
    this.videoPlayer = null
    this.clips = []
    this.originalClips = []
  }
}

// 싱글톤 인스턴스
export const playbackEngine = new PlaybackEngine()
