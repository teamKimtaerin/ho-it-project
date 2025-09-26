import { google, youtube_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import {
  YouTubeUploadRequest,
  UploadProgress,
} from '@/app/(route)/editor/components/Export/ExportTypes'

export class YouTubeApiUploader {
  private oauth2Client: OAuth2Client
  private youtube: youtube_v3.Youtube
  private progressCallback?: (progress: UploadProgress) => void

  constructor(
    accessToken: string,
    refreshToken?: string,
    progressCallback?: (progress: UploadProgress) => void
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/youtube/callback`
    )

    // 토큰 설정
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    // YouTube API 클라이언트 초기화
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    })

    this.progressCallback = progressCallback
  }

  /**
   * JWT 토큰에서 Google 토큰 추출
   */
  static extractTokensFromJWT(jwtToken: string): {
    google_access_token: string
    google_refresh_token?: string
    sessionId?: string
    expires_at?: number
  } | null {
    try {
      const jwtSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
      const decoded = jwt.verify(jwtToken, jwtSecret) as {
        google_access_token: string
        google_refresh_token?: string
        sessionId?: string
        expires_at?: number
      }

      return {
        google_access_token: decoded.google_access_token,
        google_refresh_token: decoded.google_refresh_token,
        sessionId: decoded.sessionId,
        expires_at: decoded.expires_at,
      }
    } catch (error) {
      console.error('JWT 토큰 파싱 오류:', error)
      return null
    }
  }

  /**
   * 비디오 업로드
   */
  async uploadVideo(
    request: YouTubeUploadRequest & { videoPath: string }
  ): Promise<{
    success: boolean
    videoUrl?: string
    videoId?: string
    error?: string
  }> {
    try {
      this.updateProgress({
        status: 'initializing',
        progress: 0,
        message: 'YouTube 업로드 초기화 중...',
      })

      // 파일 존재 확인
      if (!fs.existsSync(request.videoPath)) {
        throw new Error(`비디오 파일을 찾을 수 없습니다: ${request.videoPath}`)
      }

      // 파일 크기 확인
      const stats = fs.statSync(request.videoPath)
      const fileSizeInMB = stats.size / (1024 * 1024)

      this.updateProgress({
        status: 'uploading',
        progress: 5,
        message: `비디오 파일 (${fileSizeInMB.toFixed(1)}MB) 업로드 시작...`,
      })

      // 비디오 메타데이터 설정
      const videoMetadata = {
        snippet: {
          title: request.title,
          description: request.description,
          categoryId: '22', // People & Blogs
          defaultLanguage: 'ko',
          defaultAudioLanguage: 'ko',
        },
        status: {
          privacyStatus: request.privacy as 'private' | 'public' | 'unlisted',
        },
      }

      // 파일 스트림 생성
      const fileStream = fs.createReadStream(request.videoPath)

      this.updateProgress({
        status: 'uploading',
        progress: 10,
        message: 'YouTube API에 업로드 중...',
      })

      // YouTube API 업로드 요청
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: videoMetadata,
        media: {
          body: fileStream,
        },
      })

      if (!response.data.id) {
        throw new Error('YouTube API에서 비디오 ID를 반환하지 않았습니다')
      }

      const videoId = response.data.id
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

      this.updateProgress({
        status: 'completed',
        progress: 100,
        message: `업로드 완료! 비디오 URL: ${videoUrl}`,
      })

      return {
        success: true,
        videoId,
        videoUrl,
      }
    } catch (error) {
      console.error('YouTube 업로드 오류:', error)

      this.updateProgress({
        status: 'error',
        progress: 0,
        message: `업로드 실패: ${error}`,
        error: String(error),
      })

      return {
        success: false,
        error: String(error),
      }
    }
  }

  /**
   * 채널 정보 가져오기
   */
  async getChannelInfo(): Promise<{
    success: boolean
    channel?: {
      id: string
      title: string
      thumbnailUrl?: string
    }
    error?: string
  }> {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet'],
        mine: true,
      })

      const channel = response.data.items?.[0]
      if (!channel) {
        throw new Error('채널 정보를 찾을 수 없습니다')
      }

      return {
        success: true,
        channel: {
          id: channel.id!,
          title: channel.snippet?.title || 'Unknown Channel',
          thumbnailUrl: channel.snippet?.thumbnails?.default?.url || undefined,
        },
      }
    } catch (error) {
      console.error('채널 정보 조회 오류:', error)
      return {
        success: false,
        error: String(error),
      }
    }
  }

  /**
   * 업로드 진행 상황 업데이트
   */
  private updateProgress(progress: UploadProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress)
    }
  }

  /**
   * 토큰 갱신
   */
  async refreshTokens(): Promise<boolean> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      this.oauth2Client.setCredentials(credentials)
      return true
    } catch (error) {
      console.error('토큰 갱신 오류:', error)
      return false
    }
  }
}
