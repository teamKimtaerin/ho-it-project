'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { mediaStorage } from '@/utils/storage/mediaStorage'
import { log } from '@/utils/logger'
import { VIDEO_PLAYER_CONSTANTS } from '@/lib/utils/constants'
import { videoSegmentManager } from '@/utils/video/segmentManager'
// import {
//   findCurrentWord,
//   shouldUpdateWordSelection,
// } from '@/utils/video/currentWordFinder' // Currently unused
// import API_CONFIG from '@/config/api.config' // Currently unused

interface VideoPlayerProps {
  className?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  className = '',
  onTimeUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [isDraggingVolume, setIsDraggingVolume] = useState(false)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null)

  // Track last word selection update time to throttle updates
  // const lastWordUpdateTimeRef = useRef(0) // Currently unused
  // Track when user manually selects a word to pause auto selection
  // const manualSelectionPauseUntilRef = useRef(0) // Currently unused

  // Get media state from store
  const {
    mediaId,
    videoUrl,
    videoName,
    storedMediaId,
    setVideoLoading,
    setVideoError,
    restoreMediaFromStorage,
    clips,
    deletedClipIds,
    // setFocusedWord, // Currently unused
    // setActiveClipId, // Currently unused
    // setPlayingWord, // Currently unused
    // clearPlayingWord, // Currently unused
  } = useEditorStore()

  // Load video from IndexedDB or URL - 우선순위: Blob URL > S3 URL > IndexedDB
  useEffect(() => {
    const loadVideo = async () => {
      // First check if we have a video URL from store
      if (videoUrl) {
        const isBlobUrl = videoUrl.startsWith('blob:')
        const isHttpUrl = videoUrl.startsWith('http')

        log(
          'VideoPlayer.tsx',
          `🎯 Video URL detected: ${isBlobUrl ? 'Blob URL' : isHttpUrl ? 'HTTP URL' : 'Unknown'} - ${videoUrl}`
        )
        console.log('🎬 VideoPlayer: Setting video src to:', {
          url: videoUrl,
          type: isBlobUrl ? 'Blob URL (Local)' : 'HTTP/S3 URL',
          immediate: isBlobUrl
            ? 'YES - Instant playback!'
            : 'Loading from network...',
        })

        // Blob URL 유효성 검사 (선택적 - 성능 최적화)
        if (isBlobUrl) {
          // Blob URL은 일반적으로 즉시 유효하므로 바로 설정
          setVideoSrc(videoUrl)
          console.log('⚡ VideoPlayer: Blob URL set for immediate playback!')
        } else {
          // HTTP URL인 경우 그대로 사용
          setVideoSrc(videoUrl)
          console.log(
            '🌐 VideoPlayer: HTTP/S3 URL set, loading from network...'
          )
        }
        return
      }

      // Check if we have a media ID from store (fallback)
      if (mediaId) {
        log(
          'VideoPlayer.tsx',
          `⏳ No direct URL available, loading from IndexedDB with mediaId: ${mediaId}`
        )
        setVideoLoading(true)

        try {
          const blobUrl = await mediaStorage.getMediaUrl(mediaId)
          if (blobUrl) {
            log(
              'VideoPlayer.tsx',
              `✅ Video loaded from IndexedDB: ${videoName || 'unknown'}`
            )
            console.log(
              '💾 VideoPlayer: Setting video src from IndexedDB:',
              blobUrl
            )
            setVideoSrc(blobUrl)
          } else {
            setVideoError('Failed to load video from storage')
            console.error('❌ VideoPlayer: Failed to load video from storage')
          }
        } catch (error) {
          console.error('Failed to load video:', error)
          setVideoError('Failed to load video')
        } finally {
          setVideoLoading(false)
        }
        return
      }

      // No video available - show empty player
      log(
        'VideoPlayer.tsx',
        '📹 No media found, showing empty player - waiting for upload'
      )
      console.warn(
        '⚠️ VideoPlayer: No videoUrl or mediaId available - please upload a video'
      )
      setVideoSrc(null)
    }

    loadVideo()
  }, [mediaId, videoUrl, videoName, setVideoLoading, setVideoError])

  // 비디오 상태 체크를 위한 useEffect
  useEffect(() => {
    const video = videoRef.current

    // 비디오 소스가 변경되면 이전 캐시 클리어
    if (video) {
      // 이전 비디오 완전 정지 및 초기화
      video.pause()
      video.removeAttribute('src')
      video.load() // 강제로 비디오 리로드
      console.log('🧹 Cleared previous video source')
    }

    if (video && videoSrc) {
      // URL 유효성 검증
      console.log('🎬 Attempting to load video:', {
        url: videoSrc,
        isValidUrl: videoSrc.startsWith('http') || videoSrc.startsWith('blob:'),
        urlLength: videoSrc.length,
      })

      // S3 Presigned URL 만료 체크
      if (videoSrc.includes('Expires=')) {
        try {
          const expires = new URL(videoSrc).searchParams.get('Expires')
          if (expires && parseInt(expires) * 1000 < Date.now()) {
            console.error('⚠️ Video URL has expired!')
            setVideoError('Video URL has expired. Please re-upload.')
            return
          }
        } catch (error) {
          console.error('Error checking URL expiration:', error)
        }
      }

      // 새 소스 설정
      video.src = videoSrc
      video.load()
      console.log('✅ Set new video source:', videoSrc)

      console.log('🎬 VideoPlayer State:', {
        videoSrc,
        videoUrl,
        mediaId,
        videoName,
        readyState: video.readyState,
        currentSrc: video.currentSrc || video.src,
      })

      // 비디오가 이미 로드된 경우 즉시 duration 설정
      if (video.readyState >= 1 && video.duration) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Video already loaded, setting duration:', video.duration)
        }
        setDuration(video.duration)
      }

      // 비디오 이벤트 리스너들
      const handleLoadStart = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Video load start')
        }
      }
      const handleCanPlay = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Video can play')
        }
      }
      const handleError = async (e: Event) => {
        const video = e.target as HTMLVideoElement
        let errorMessage = 'Video playback error'
        let shouldAttemptRestore = false

        if (video.error) {
          switch (video.error.code) {
            case 1: // MEDIA_ERR_ABORTED
              errorMessage = 'Video loading aborted'
              break
            case 2: // MEDIA_ERR_NETWORK
              errorMessage = 'Network error while loading video'
              // blob URL이 무효화된 경우 복원 시도
              if (videoSrc?.startsWith('blob:') && storedMediaId) {
                shouldAttemptRestore = true
                errorMessage = 'Blob URL expired - attempting to restore...'
              }
              break
            case 3: // MEDIA_ERR_DECODE
              errorMessage = 'Video decoding error'
              break
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
              errorMessage = 'Video format not supported or no valid source'
              // blob URL이 무효화된 경우 복원 시도
              if (videoSrc?.startsWith('blob:') && storedMediaId) {
                shouldAttemptRestore = true
                errorMessage = 'Invalid blob URL - attempting to restore...'
              }
              console.error('Video URL:', videoSrc)
              console.error('Supported formats: MP4, WebM, OGG')
              break
          }
        }

        console.error('Video error details:', {
          code: video.error?.code,
          message: video.error?.message,
          videoSrc,
          videoUrl,
          storedMediaId,
          willAttemptRestore: shouldAttemptRestore,
        })

        // blob URL 오류 시 자동 복원 시도
        if (shouldAttemptRestore) {
          log(
            'VideoPlayer.tsx',
            '🔄 Attempting to restore video from IndexedDB...'
          )
          try {
            setVideoError('비디오 복원 중...')
            await restoreMediaFromStorage(storedMediaId!)
            log('VideoPlayer.tsx', '✅ Video restored successfully')
          } catch (restoreError) {
            log(
              'VideoPlayer.tsx',
              `❌ Failed to restore video: ${restoreError}`
            )
            setVideoError('비디오 복원에 실패했습니다. 새로 업로드해주세요.')
          }
        } else {
          setVideoError(errorMessage)
        }
      }

      video.addEventListener('loadstart', handleLoadStart)
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('error', handleError)

      return () => {
        video.removeEventListener('loadstart', handleLoadStart)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('error', handleError)
      }
    }
  }, [
    videoSrc,
    videoUrl,
    mediaId,
    videoName,
    storedMediaId,
    setVideoError,
    restoreMediaFromStorage,
  ])

  // 재생/일시정지 토글
  const togglePlay = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause()
          setIsPlaying(false)
        } else {
          await videoRef.current.play()
          setIsPlaying(true)
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('재생 중 오류 발생:', error)
        }
        setIsPlaying(false)
      }
    }
  }

  // 10초 뒤로
  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        videoRef.current.currentTime - VIDEO_PLAYER_CONSTANTS.SKIP_TIME_SECONDS
      )
    }
  }

  // 10초 앞으로
  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        duration,
        videoRef.current.currentTime + VIDEO_PLAYER_CONSTANTS.SKIP_TIME_SECONDS
      )
    }
  }

  // 재생 속도 변경
  const changePlaybackRate = () => {
    const rates = VIDEO_PLAYER_CONSTANTS.PLAYBACK_RATES
    const currentIndex = rates.indexOf(playbackRate as (typeof rates)[number])
    const nextRate = rates[(currentIndex + 1) % rates.length]
    setPlaybackRate(nextRate)
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate
    }
  }

  // 볼륨 변경 (부드러운 조절을 위한 최적화)
  const changeVolume = useCallback(
    (newVolume: number) => {
      // NaN, Infinity, -Infinity 체크
      if (!Number.isFinite(newVolume)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Invalid volume value:', newVolume)
        }
        return
      }

      const clampedVolume = Math.max(0, Math.min(1, newVolume))

      // 추가 안전성 체크
      if (!Number.isFinite(clampedVolume)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Clamped volume is not finite:', clampedVolume)
        }
        return
      }

      setVolume(clampedVolume)
      if (videoRef.current) {
        videoRef.current.volume = clampedVolume
      }
      if (clampedVolume === 0 && !isMuted) {
        setIsMuted(true)
      } else if (clampedVolume > 0 && isMuted) {
        setIsMuted(false)
      }
    },
    [isMuted]
  )

  // 음소거 토글
  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        // 음소거 해제 시 이전 볼륨으로 복원
        const restoreVolume = Number.isFinite(volume) && volume > 0 ? volume : 1
        videoRef.current.volume = restoreVolume
        videoRef.current.muted = false
        setIsMuted(false)
        // 상태도 동기화
        if (volume !== restoreVolume) {
          setVolume(restoreVolume)
        }
      } else {
        // 음소거 시
        videoRef.current.volume = 0
        videoRef.current.muted = true
        setIsMuted(true)
      }
    }
  }

  // 진행바 클릭 시 시간 이동
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickPosition = (e.clientX - rect.left) / rect.width
      const newTime = clickPosition * duration
      if (process.env.NODE_ENV === 'development') {
        console.log(
          'Progress click:',
          clickPosition,
          'New time:',
          newTime,
          'Duration:',
          duration
        )
      }
      videoRef.current.currentTime = newTime
    }
  }

  // 시간 업데이트 및 자막 동기화
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime
      const newDuration = videoRef.current.duration

      setCurrentTime(newTime)
      if (newDuration && !isNaN(newDuration)) {
        setDuration(newDuration)
      }

      // Notify parent component of time update
      onTimeUpdate?.(newTime, newDuration || 0)

      // Auto-select current word during playback (temporarily disabled for debugging)
      // TODO: Re-enable after fixing video playback issues
      /*
      if (
        isPlaying && 
        clips.length > 0 &&
        newTime > manualSelectionPauseUntilRef.current &&
        shouldUpdateWordSelection(newTime, lastWordUpdateTimeRef.current)
      ) {
        try {
          const currentWordInfo = findCurrentWord(newTime, clips)
          if (currentWordInfo) {
            setPlayingWord(currentWordInfo.clipId, currentWordInfo.wordId)
            
            const currentFocusedWordId = useEditorStore.getState().focusedWordId
            const currentFocusedClipId = useEditorStore.getState().focusedClipId
            
            if (
              currentFocusedWordId !== currentWordInfo.wordId ||
              currentFocusedClipId !== currentWordInfo.clipId
            ) {
              setFocusedWord(currentWordInfo.clipId, currentWordInfo.wordId)
              setActiveClipId(currentWordInfo.clipId)
            }
          } else {
            clearPlayingWord()
          }
          lastWordUpdateTimeRef.current = newTime
        } catch (error) {
          console.warn('Word synchronization error:', error)
        }
      } else if (!isPlaying) {
        clearPlayingWord()
      }
      */

      // Update subtitles based on current time
      if (clips.length > 0) {
        const subtitle = videoSegmentManager.getActiveSubtitles(newTime, clips)
        if (subtitle) {
          setCurrentSubtitle(subtitle.text)
        } else {
          setCurrentSubtitle(null)
        }

        // Check if we should skip deleted segments
        const skipInfo = videoSegmentManager.shouldSkipSegment(newTime)
        if (skipInfo.skip && skipInfo.skipTo !== undefined) {
          videoRef.current.currentTime = skipInfo.skipTo
        }
      }
    }
  }

  // 메타데이터 로드 및 세그먼트 매니저 초기화
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration
      if (process.env.NODE_ENV === 'development') {
        console.log('Metadata loaded, duration:', videoDuration)
      }
      if (videoDuration && !isNaN(videoDuration)) {
        setDuration(videoDuration)

        // Initialize segment manager when we have clips
        if (clips.length > 0) {
          videoSegmentManager.initialize(clips, videoDuration)
        }
      }
    }
  }

  // 시간 포맷팅 함수
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / VIDEO_PLAYER_CONSTANTS.SECONDS_PER_MINUTE)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Update segment manager when clips change
  useEffect(() => {
    if (clips.length > 0 && duration > 0) {
      videoSegmentManager.initialize(clips, duration)
    }
  }, [clips, duration])

  // Handle deleted clips
  useEffect(() => {
    if (deletedClipIds) {
      // Clear all deletions first
      videoSegmentManager.clearDeletions()

      // Mark deleted clips
      deletedClipIds.forEach((clipId) => {
        videoSegmentManager.deleteClip(clipId)
      })
    }
  }, [deletedClipIds])

  return (
    <div
      className={`flex-1 bg-slate-800/80 backdrop-blur-sm border border-slate-600/40 rounded-lg mx-2 my-4 shadow-xl ${className}`}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Video Screen */}
        <div className="relative aspect-video rounded-lg mb-4 flex-shrink-0 bg-black">
          <video
            ref={videoRef}
            key={videoSrc || 'empty-video'} // Force component recreation when videoSrc changes
            className="w-full h-full rounded-lg"
            crossOrigin="anonymous"
            playsInline
            controls={false}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            {videoSrc && (
              <>
                <source src={videoSrc} type="video/mp4" />
                <source src={videoSrc} type="video/webm" />
              </>
            )}
            비디오를 지원하지 않는 브라우저입니다.
          </video>

          {/* Subtitle Overlay */}
          {currentSubtitle && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded text-base max-w-[80%] text-center">
              {currentSubtitle}
            </div>
          )}
        </div>

        {/* Progress Bar - 가상 타임라인 모드에서 비활성화 */}
        <div className="relative mb-4 opacity-50 pointer-events-none">
          <div className="w-full h-2 bg-slate-700 rounded-full shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-slate-400 to-gray-400 rounded-full shadow-sm transition-all duration-150"
              style={{
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Virtual Timeline 모드 알림 */}
        <div className="bg-purple-600 text-white text-xs px-3 py-2 rounded-lg mb-2 text-center">
          🎬 가상 타임라인 모드: 하단 Virtual Timeline Controller를 사용하세요
        </div>

        {/* Player Controls - 가상 타임라인 모드에서 비활성화 */}
        <div className="flex items-center justify-center space-x-3 mb-3 opacity-50 pointer-events-none">
          <div className="bg-gradient-to-r from-slate-600 to-gray-600 rounded-lg p-2 flex items-center space-x-3 shadow-md">
            <button
              onClick={skipBackward}
              className="text-white hover:text-slate-300 transition-colors"
              title={`${VIDEO_PLAYER_CONSTANTS.SKIP_TIME_SECONDS}초 뒤로`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={togglePlay}
              className="text-white hover:text-slate-300 transition-colors"
              title={isPlaying ? '일시정지' : '재생'}
            >
              {isPlaying ? (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={skipForward}
              className="text-white hover:text-slate-300 transition-colors"
              title={`${VIDEO_PLAYER_CONSTANTS.SKIP_TIME_SECONDS}초 앞으로`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
              </svg>
            </button>

            <button
              onClick={changePlaybackRate}
              className="text-white hover:text-slate-300 transition-colors text-sm font-bold px-2"
              title="재생 속도 변경"
            >
              {playbackRate}x
            </button>

            <div className="relative flex items-center">
              <button
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="text-white hover:text-slate-300 transition-colors"
                title={isMuted ? '음소거 해제' : '음소거'}
              >
                {isMuted || volume === 0 ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : volume > 0.5 ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                  </svg>
                )}
              </button>

              {/* Volume Slider */}
              {showVolumeSlider && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl z-50"
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-xs text-slate-300 font-medium">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </div>
                    <div
                      className="h-20 w-6 flex items-center justify-center cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setIsDraggingVolume(true)

                        const sliderTrack =
                          e.currentTarget.querySelector('.w-1\\.5')
                        if (
                          !sliderTrack ||
                          !(sliderTrack instanceof HTMLElement)
                        )
                          return

                        const updateVolume = (clientY: number) => {
                          const rect = sliderTrack.getBoundingClientRect()

                          // 안전성 체크
                          if (!rect || rect.height === 0) return

                          const y = Math.max(
                            0,
                            Math.min(rect.height, rect.bottom - clientY)
                          )
                          const newVolume = y / rect.height

                          // 추가 검증
                          if (Number.isFinite(newVolume)) {
                            changeVolume(newVolume)
                          }
                        }

                        // 초기 클릭 위치에서 볼륨 설정
                        updateVolume(e.clientY)

                        const handleMouseMove = (e: MouseEvent) => {
                          e.preventDefault()
                          updateVolume(e.clientY)
                        }

                        const handleMouseUp = () => {
                          setIsDraggingVolume(false)
                          document.removeEventListener(
                            'mousemove',
                            handleMouseMove
                          )
                          document.removeEventListener('mouseup', handleMouseUp)
                        }

                        document.addEventListener('mousemove', handleMouseMove)
                        document.addEventListener('mouseup', handleMouseUp)
                      }}
                    >
                      {/* Volume Track */}
                      <div className="h-20 w-1.5 bg-slate-600 rounded-full relative">
                        {/* Volume Fill */}
                        <div
                          className={`absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-300 to-gray-400 rounded-full ${
                            isDraggingVolume
                              ? ''
                              : 'transition-all duration-100'
                          }`}
                          style={{ height: `${(isMuted ? 0 : volume) * 100}%` }}
                        />
                        {/* Volume Handle */}
                        <div
                          className={`absolute w-3 h-3 bg-white border border-slate-400 rounded-full shadow-sm cursor-grab transform -translate-x-1/2 -translate-y-1/2 ${
                            isDraggingVolume
                              ? 'scale-125 shadow-lg border-slate-300'
                              : 'hover:scale-110 transition-transform'
                          } active:cursor-grabbing`}
                          style={{
                            bottom: `${(isMuted ? 0 : volume) * 100}%`,
                            left: '50%',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer
