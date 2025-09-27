import ChatBotApiService, { ChatBotApiResponse } from './chatBotApiService'
import MessageClassifier from './messageClassifier'
import { ChatMessage } from '@/app/(route)/editor/types/chatBot'
import type { RendererConfigV2 } from '@/app/shared/motiontext'
import type { ClipItem } from '@/app/(route)/editor/types'

export interface ChatBotConfig {
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export interface ScenarioEditResponse {
  hasScenarioChanges: boolean
  updatedScenario?: RendererConfigV2
  updatedClips?: ClipItem[]
  explanation: string
  success: boolean
  errorMessage?: string
}

export default class ScenarioAwareChatBotService {
  private chatBotApiService: ChatBotApiService

  constructor() {
    // API 기반 서비스로 변경, config는 더 이상 필요하지 않음
    this.chatBotApiService = new ChatBotApiService()
  }

  // 전체 응답 데이터를 반환하는 메서드 (JSON Patch 처리용)
  async sendMessageWithFullResponse(
    message: string,
    conversationHistory: ChatMessage[] = [],
    currentScenario?: RendererConfigV2,
    debugInfo?: {
      selectedClipsCount: number
      selectedWordsCount: number
      originalCuesCount?: number
    }
  ): Promise<ChatBotApiResponse> {
    try {
      const response = await this.chatBotApiService.sendMessageWithFullResponse(
        message,
        conversationHistory,
        currentScenario,
        debugInfo
      )
      return response
    } catch (error) {
      console.error('ChatBot 메시지 전송 실패:', error)
      throw new Error(
        '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      )
    }
  }

  // 시나리오 편집 전용 메서드 (향후 확장용)
  async requestScenarioEdit(
    message: string,
    _currentScenario: RendererConfigV2,
    _currentClips: ClipItem[]
  ): Promise<ScenarioEditResponse> {
    try {
      const classification = MessageClassifier.classifyMessage(message)

      if (!classification.isSubtitleRelated) {
        return {
          hasScenarioChanges: false,
          explanation: '자막 편집과 관련된 요청이 아닙니다.',
          success: false,
        }
      }

      // 실제 편집 로직은 향후 구현
      // 현재는 분석만 수행
      return {
        hasScenarioChanges: false,
        explanation: `${classification.actionType} 작업으로 분류되었습니다. 구체적인 편집 기능은 곧 추가될 예정입니다.`,
        success: true,
      }
    } catch (error) {
      return {
        hasScenarioChanges: false,
        explanation: '편집 요청 처리 중 오류가 발생했습니다.',
        success: false,
        errorMessage:
          error instanceof Error ? error.message : '알 수 없는 오류',
      }
    }
  }
}
