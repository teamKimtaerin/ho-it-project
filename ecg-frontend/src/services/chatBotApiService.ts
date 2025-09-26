import { ChatMessage } from '@/app/(route)/editor/types/chatBot'
import type { RendererConfigV2 } from '@/app/shared/motiontext'

export interface ChatBotApiRequest {
  prompt: string
  conversation_history?: ChatMessage[]
  scenario_data?: RendererConfigV2
  use_langchain?: boolean
}

export interface ChatBotApiResponse {
  completion: string
  stop_reason: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
  processing_time_ms?: number
  error?: string
  details?: string

  // 시나리오 편집 관련 필드
  edit_result?: {
    type:
      | 'text_edit'
      | 'style_edit'
      | 'animation_request'
      | 'info_request'
      | 'error'
    success: boolean
    explanation: string
    error?: string
  }
  json_patches?: Array<{
    op: 'replace' | 'add' | 'remove'
    path: string
    value?: unknown
  }>
  has_scenario_edits?: boolean
}

export default class ChatBotApiService {
  // 전체 응답 데이터를 반환하는 새로운 메서드
  async sendMessageWithFullResponse(
    message: string,
    conversationHistory: ChatMessage[] = [],
    scenarioData?: RendererConfigV2,
    debugInfo?: {
      selectedClipsCount: number
      selectedWordsCount: number
      originalCuesCount?: number
    }
  ): Promise<ChatBotApiResponse> {
    try {
      const request: ChatBotApiRequest = {
        prompt: message,
        conversation_history: conversationHistory,
        scenario_data: scenarioData,
        use_langchain: true,
      }

      // REQUEST_TEST 모드 확인
      const isRequestTestMode = process.env.NEXT_PUBLIC_REQUEST_TEST === 'true'

      if (isRequestTestMode) {
        // 디버깅용 정보 생성
        const requestSize = JSON.stringify(request).length
        const scenarioSize = scenarioData
          ? JSON.stringify(scenarioData).length
          : 0

        const debugResponse = `🔍 [REQUEST TEST MODE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 Request Details:
• Prompt: "${message}"
• Selected Clips: ${debugInfo?.selectedClipsCount || 0}개
• Selected Words: ${debugInfo?.selectedWordsCount || 0}개
• Scenario Cues: ${scenarioData?.cues?.length || 0}${debugInfo?.originalCuesCount ? `/${debugInfo.originalCuesCount} (압축됨)` : ''}
• Conversation History: ${conversationHistory.length} messages
• LangChain: enabled

📊 Request Size:
• Total: ~${(requestSize / 1024).toFixed(1)} KB
• Scenario: ~${(scenarioSize / 1024).toFixed(1)} KB

📝 Raw Request:
\`\`\`json
${JSON.stringify(request, null, 2)}
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        // 짧은 지연으로 실제 API 호출 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Mock 응답 반환
        return {
          completion: debugResponse,
          stop_reason: 'test_mode',
          has_scenario_edits: false,
          json_patches: [],
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ho-it.site'
      const response = await fetch(`${apiUrl}/api/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail?.error || errorData.detail || 'API 호출 실패'
        )
      }

      const data: ChatBotApiResponse = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return data
    } catch (error) {
      console.error('ChatBot API 메시지 전송 실패:', error)
      throw new Error(
        error instanceof Error
          ? error.message
          : '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      )
    }
  }
}
