/**
 * 비디오 파일에서 썸네일을 생성하는 유틸리티 함수들
 */

export interface VideoThumbnailOptions {
  width?: number
  height?: number
  timeInSeconds?: number
  quality?: number
}

export interface VideoMetadata {
  duration?: number
  size?: number
  width?: number
  height?: number
  fps?: number
}

export interface VideoThumbnailWithMetadata {
  thumbnailUrl: string
  metadata: VideoMetadata
}

/**
 * 비디오 파일에서 썸네일을 생성합니다 (1초 지점 고정 캡처)
 * @param file 비디오 파일
 * @param options 썸네일 생성 옵션
 * @returns Promise<string> 썸네일 이미지의 Blob URL
 */
export const generateVideoThumbnail = async (
  file: File,
  options: VideoThumbnailOptions = {}
): Promise<string> => {
  const { width = 320, height = 180, quality = 0.8 } = options

  console.log('🎬 Starting thumbnail generation:', {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    options,
  })

  return new Promise((resolve, reject) => {
    // 비디오가 아닌 경우 빈 문자열 반환 (UI에서 처리)
    if (!file.type.startsWith('video/')) {
      console.log('📄 Not a video file, returning empty string')
      resolve('')
      return
    }

    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      console.error('❌ Canvas context not available')
      reject(new Error('Canvas context not available'))
      return
    }

    let videoUrl: string | null = null
    let hasResolved = false

    // 정리 함수
    const cleanup = () => {
      console.log('🧹 Cleaning up resources')
      clearTimeout(fallbackTimeoutId)
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
        videoUrl = null
      }
      video.src = ''
      video.removeAttribute('src')
      video.load()
    }

    // 안전한 resolve/reject 함수 (중복 호출 방지)
    const safeResolve = (result: string) => {
      if (!hasResolved) {
        hasResolved = true
        resolve(result)
      }
    }

    const safeReject = (error: Error) => {
      if (!hasResolved) {
        hasResolved = true
        reject(error)
      }
    }

    // 타임아웃 설정 (15초로 증가)
    const timeoutId = setTimeout(() => {
      console.error('⏰ Thumbnail generation timeout')
      cleanup()
      safeReject(new Error('Thumbnail generation timeout'))
    }, 15000)

    // 캡처 함수
    const captureFrame = () => {
      try {
        console.log(
          '📸 Attempting to capture frame at',
          video.currentTime,
          'seconds'
        )

        // Canvas 크기 설정
        canvas.width = width
        canvas.height = height

        // 비디오 상태 확인
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error('Video dimensions are zero')
        }

        if (video.readyState < 2) {
          throw new Error('Video not ready for capture')
        }

        console.log(
          '📹 Video dimensions:',
          video.videoWidth,
          'x',
          video.videoHeight
        )
        console.log('🎨 Canvas dimensions:', width, 'x', height)

        // 비디오 프레임을 canvas에 그리기
        ctx.drawImage(video, 0, 0, width, height)

        console.log('✅ Frame drawn to canvas successfully')

        // Canvas를 Blob으로 변환
        canvas.toBlob(
          (blob) => {
            clearTimeout(timeoutId)

            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob)
              console.log('🎉 Thumbnail generated successfully:', thumbnailUrl)
              cleanup()
              safeResolve(thumbnailUrl)
            } else {
              console.error('❌ Failed to create blob from canvas')
              cleanup()
              safeReject(new Error('Failed to create thumbnail blob'))
            }
          },
          'image/jpeg',
          quality
        )
      } catch (error) {
        clearTimeout(timeoutId)
        cleanup()
        console.error('❌ Error capturing frame:', error)
        safeReject(error as Error)
      }
    }

    // 비디오 설정
    video.muted = true
    video.preload = 'metadata'
    video.setAttribute('playsinline', 'true')
    video.crossOrigin = 'anonymous'

    // 이벤트 리스너들
    video.addEventListener('loadstart', () => {
      console.log('🔄 Video loading started')
    })

    video.addEventListener('loadedmetadata', () => {
      console.log('📊 Metadata loaded:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
      })

      // 1초 지점으로 고정 (비디오가 1초보다 짧으면 중간 지점)
      const seekTime = Math.min(1.0, video.duration * 0.5)
      console.log(`⏭️ Seeking to ${seekTime}s`)
      video.currentTime = seekTime
    })

    video.addEventListener('loadeddata', () => {
      console.log('📁 Video data loaded, readyState:', video.readyState)
    })

    video.addEventListener('canplay', () => {
      console.log('▶️ Video can start playing')
    })

    video.addEventListener('canplaythrough', () => {
      console.log('🎬 Video can play through without buffering')
    })

    video.addEventListener('seeked', () => {
      console.log('🎯 Seeked to:', video.currentTime, 'seconds')
      captureFrame()
    })

    video.addEventListener('seeking', () => {
      console.log('🔍 Seeking to:', video.currentTime, 'seconds')
    })

    video.addEventListener('error', (e) => {
      clearTimeout(timeoutId)
      cleanup()
      console.error('❌ Video error:', e, video.error)
      safeReject(
        new Error(
          `Failed to load video: ${video.error?.message || 'Unknown error'}`
        )
      )
    })

    // Fallback: 만약 seeked 이벤트가 발생하지 않으면 일정 시간 후 시도
    let fallbackTimeoutId: NodeJS.Timeout

    // 비디오 파일 로드
    try {
      videoUrl = URL.createObjectURL(file)
      console.log('🔗 Created video URL:', videoUrl)
      video.src = videoUrl

      // Fallback 타이머 설정
      fallbackTimeoutId = setTimeout(() => {
        if (!hasResolved && video.readyState >= 2) {
          console.log(
            '⚠️ Seeked event did not fire, attempting fallback capture'
          )
          captureFrame()
        }
      }, 5000)
    } catch (error) {
      clearTimeout(timeoutId)
      cleanup()
      console.error('❌ Failed to create video URL:', error)
      safeReject(new Error('Failed to create video URL'))
    }
  })
}

/**
 * 생성된 썸네일 URL을 정리합니다
 * @param thumbnailUrl Blob URL
 */
export const revokeThumbnailUrl = (thumbnailUrl: string) => {
  if (thumbnailUrl.startsWith('blob:')) {
    URL.revokeObjectURL(thumbnailUrl)
  }
}

/**
 * 오디오 파일인지 확인합니다
 * @param file 파일
 * @returns boolean
 */
export const isAudioFile = (file: File): boolean => {
  return file.type.startsWith('audio/')
}

/**
 * 비디오 파일인지 확인합니다
 * @param file 파일
 * @returns boolean
 */
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/')
}

/**
 * 비디오 파일에서 메타데이터를 추출합니다
 * @param file 비디오 파일
 * @returns Promise<VideoMetadata>
 */
export const extractVideoMetadata = async (
  file: File
): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('video/')) {
      resolve({
        duration: 0,
        size: file.size,
        width: 0,
        height: 0,
        fps: 0,
      })
      return
    }

    const video = document.createElement('video')
    let videoUrl: string | null = null
    let hasResolved = false

    const cleanup = () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
        videoUrl = null
      }
      video.src = ''
      video.removeAttribute('src')
      video.load()
    }

    const safeResolve = (metadata: VideoMetadata) => {
      if (!hasResolved) {
        hasResolved = true
        cleanup()
        resolve(metadata)
      }
    }

    const safeReject = (error: Error) => {
      if (!hasResolved) {
        hasResolved = true
        cleanup()
        reject(error)
      }
    }

    // 타임아웃 설정
    const timeoutId = setTimeout(() => {
      safeReject(new Error('Video metadata extraction timeout'))
    }, 10000)

    video.addEventListener('loadedmetadata', () => {
      clearTimeout(timeoutId)

      const metadata: VideoMetadata = {
        duration: video.duration,
        size: file.size,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30, // 기본값 (정확한 FPS는 복잡한 계산이 필요)
      }

      safeResolve(metadata)
    })

    video.addEventListener('error', () => {
      clearTimeout(timeoutId)
      safeReject(new Error('Failed to load video for metadata extraction'))
    })

    try {
      video.muted = true
      video.preload = 'metadata'
      videoUrl = URL.createObjectURL(file)
      video.src = videoUrl
    } catch (error) {
      clearTimeout(timeoutId)
      safeReject(new Error('Failed to create video URL'))
    }
  })
}

/**
 * 비디오 파일에서 썸네일과 메타데이터를 함께 생성합니다
 * @param file 비디오 파일
 * @param options 썸네일 생성 옵션
 * @returns Promise<VideoThumbnailWithMetadata>
 */
export const generateVideoThumbnailWithMetadata = async (
  file: File,
  options: VideoThumbnailOptions = {}
): Promise<VideoThumbnailWithMetadata> => {
  if (!file.type.startsWith('video/')) {
    return {
      thumbnailUrl: '',
      metadata: {
        duration: 0,
        size: file.size,
        width: 0,
        height: 0,
        fps: 0,
      },
    }
  }

  // 썸네일과 메타데이터를 병렬로 생성
  const [thumbnailUrl, metadata] = await Promise.all([
    generateVideoThumbnail(file, options),
    extractVideoMetadata(file),
  ])

  return {
    thumbnailUrl,
    metadata,
  }
}
