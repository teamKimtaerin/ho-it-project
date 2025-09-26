/**
 * 사용자 메시지가 자막 편집 관련인지 판단하는 분류기
 */

export interface MessageClassification {
  isSubtitleRelated: boolean
  actionType: 'edit' | 'timing' | 'style' | 'animation' | 'general' | 'none'
  confidence: number
  extractedDetails?: {
    targetClip?: string | number
    targetWord?: string | number
    newText?: string
    timeAdjustment?: number
    styleProperty?: string
    animationType?: string
  }
}

export class MessageClassifier {
  // 자막 편집 관련 키워드들
  private static readonly SUBTITLE_KEYWORDS = [
    // 기본 편집
    '자막',
    '텍스트',
    '글자',
    '문자',
    '대사',
    '내용',
    // 편집 동작
    '수정',
    '바꿔',
    '변경',
    '고쳐',
    '편집',
    '삭제',
    '지워',
    '추가',
    '넣어',
    // 위치/순서
    '번째',
    '첫번째',
    '두번째',
    '세번째',
    '마지막',
    '처음',
    '끝',
    // 타이밍
    '시간',
    '타이밍',
    '늦춰',
    '빠르게',
    '느리게',
    '초',
    '분',
    '싱크',
    // 스타일
    '폰트',
    '크기',
    '색깔',
    '색상',
    '굵게',
    '기울임',
    '밑줄',
    // 애니메이션
    '애니메이션',
    '효과',
    '페이드',
    '바운스',
    '슬라이드',
    '확대',
    '축소',
  ]

  // 편집 타입별 키워드
  private static readonly ACTION_KEYWORDS = {
    edit: ['수정', '바꿔', '변경', '고쳐', '편집', '내용', '텍스트'],
    timing: ['시간', '타이밍', '늦춰', '빠르게', '느리게', '초', '분', '싱크'],
    style: ['폰트', '크기', '색깔', '색상', '굵게', '기울임', '밑줄', '스타일'],
    animation: [
      '애니메이션',
      '효과',
      '페이드',
      '바운스',
      '슬라이드',
      '확대',
      '축소',
    ],
    general: ['도움', '사용법', '방법', '어떻게', '가능', '설명'],
  }

  static classifyMessage(message: string): MessageClassification {
    const normalizedMessage = message.toLowerCase().trim()

    // 1. 자막 관련 키워드 체크
    const subtitleKeywordCount = this.SUBTITLE_KEYWORDS.filter((keyword) =>
      normalizedMessage.includes(keyword)
    ).length

    const isSubtitleRelated = subtitleKeywordCount > 0

    if (!isSubtitleRelated) {
      return {
        isSubtitleRelated: false,
        actionType: 'none',
        confidence: 0,
      }
    }

    // 2. 액션 타입 분류
    let bestActionType: MessageClassification['actionType'] = 'general'
    let maxScore = 0

    for (const [actionType, keywords] of Object.entries(this.ACTION_KEYWORDS)) {
      const score = keywords.filter((keyword) =>
        normalizedMessage.includes(keyword)
      ).length

      if (score > maxScore) {
        maxScore = score
        bestActionType = actionType as MessageClassification['actionType']
      }
    }

    // 3. 세부 정보 추출
    const extractedDetails = this.extractDetails(
      normalizedMessage,
      bestActionType
    )

    // 4. 신뢰도 계산 (키워드 수 + 구체성)
    const confidence = Math.min(
      (subtitleKeywordCount + maxScore) * 0.2 + (extractedDetails ? 0.3 : 0),
      1.0
    )

    return {
      isSubtitleRelated: true,
      actionType: bestActionType,
      confidence,
      extractedDetails,
    }
  }

  private static extractDetails(
    message: string,
    actionType: MessageClassification['actionType']
  ): MessageClassification['extractedDetails'] | undefined {
    const details: MessageClassification['extractedDetails'] = {}

    // 번째/순서 추출
    const clipMatch = message.match(/(\d+)\s*번째|첫\s*번째|마지막/)
    if (clipMatch) {
      if (clipMatch[0].includes('첫')) {
        details.targetClip = 1
      } else if (clipMatch[0].includes('마지막')) {
        details.targetClip = 'last'
      } else if (clipMatch[1]) {
        details.targetClip = parseInt(clipMatch[1])
      }
    }

    // 새 텍스트 추출 (따옴표 안의 내용)
    const textMatch = message.match(
      /['"`]([^'"`]+)['"`]|로\s+바꿔|을\s+바꿔|를\s+바꿔/
    )
    if (textMatch && textMatch[1]) {
      details.newText = textMatch[1]
    }

    // 시간 조정 추출
    const timeMatch = message.match(/(\d+(?:\.\d+)?)\s*초/)
    if (timeMatch && actionType === 'timing') {
      details.timeAdjustment = parseFloat(timeMatch[1])
    }

    // 스타일 속성 추출
    if (actionType === 'style') {
      if (message.includes('굵게')) details.styleProperty = 'fontWeight'
      if (message.includes('기울임')) details.styleProperty = 'fontStyle'
      if (message.includes('색깔') || message.includes('색상'))
        details.styleProperty = 'color'
      if (message.includes('크기')) details.styleProperty = 'fontSize'
    }

    // 애니메이션 타입 추출
    if (actionType === 'animation') {
      if (message.includes('페이드')) details.animationType = 'fade'
      if (message.includes('바운스')) details.animationType = 'bounce'
      if (message.includes('슬라이드')) details.animationType = 'slide'
    }

    return Object.keys(details).length > 0 ? details : undefined
  }

  // 테스트용 메서드들
  static testClassifications() {
    const testMessages = [
      "3번째 자막을 '안녕하세요'로 바꿧어줘",
      '모든 자막을 0.5초씩 늦춰줘',
      '자막 폰트를 굵게 만들어줘',
      '페이드인 효과를 추가해줘',
      '자막 편집하는 방법 알려줘',
      '오늘 날씨가 어때?',
    ]

    console.log('=== Message Classification Test ===')
    testMessages.forEach((message) => {
      const result = this.classifyMessage(message)
      console.log(`메시지: "${message}"`)
      console.log(`결과:`, result)
      console.log('---')
    })
  }
}

export default MessageClassifier
