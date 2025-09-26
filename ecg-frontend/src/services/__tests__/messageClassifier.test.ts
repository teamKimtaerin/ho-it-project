import MessageClassifier from '../messageClassifier'

describe('MessageClassifier', () => {
  describe('classifyMessage', () => {
    test('자막 편집 명령어를 올바르게 분류', () => {
      const testCases = [
        {
          message: '3번째 자막을 "안녕하세요"로 바꿔줘',
          expected: {
            isSubtitleRelated: true,
            actionType: 'edit',
            targetClip: 3,
            newText: '안녕하세요',
          },
        },
        {
          message: '모든 자막을 0.5초씩 늦춰줘',
          expected: {
            isSubtitleRelated: true,
            actionType: 'timing',
            timeAdjustment: 0.5,
          },
        },
        {
          message: '자막 폰트를 굵게 만들어줘',
          expected: {
            isSubtitleRelated: true,
            actionType: 'style',
            styleProperty: 'fontWeight',
          },
        },
        {
          message: '페이드인 효과를 추가해줘',
          expected: {
            isSubtitleRelated: true,
            actionType: 'animation',
            animationType: 'fade',
          },
        },
        {
          message: '오늘 날씨가 어때?',
          expected: {
            isSubtitleRelated: false,
            actionType: 'none',
          },
        },
      ]

      testCases.forEach(({ message, expected }) => {
        const result = MessageClassifier.classifyMessage(message)

        expect(result.isSubtitleRelated).toBe(expected.isSubtitleRelated)
        expect(result.actionType).toBe(expected.actionType)

        if (expected.targetClip) {
          expect(result.extractedDetails?.targetClip).toBe(expected.targetClip)
        }

        if (expected.newText) {
          expect(result.extractedDetails?.newText).toBe(expected.newText)
        }

        if (expected.timeAdjustment) {
          expect(result.extractedDetails?.timeAdjustment).toBe(
            expected.timeAdjustment
          )
        }

        if (expected.styleProperty) {
          expect(result.extractedDetails?.styleProperty).toBe(
            expected.styleProperty
          )
        }

        if (expected.animationType) {
          expect(result.extractedDetails?.animationType).toBe(
            expected.animationType
          )
        }
      })
    })

    test('신뢰도 점수가 적절히 계산됨', () => {
      const highConfidenceMessage = '3번째 자막을 "안녕하세요"로 수정해줘'
      const lowConfidenceMessage = '자막'

      const highResult = MessageClassifier.classifyMessage(
        highConfidenceMessage
      )
      const lowResult = MessageClassifier.classifyMessage(lowConfidenceMessage)

      expect(highResult.confidence).toBeGreaterThan(lowResult.confidence)
      expect(highResult.confidence).toBeGreaterThan(0.5)
      expect(lowResult.confidence).toBeLessThan(0.5)
    })
  })
})

// 개발용 테스트 실행 함수
export function runMessageClassifierTests() {
  console.log('=== MessageClassifier 테스트 ===')

  const testMessages = [
    '첫 번째 자막을 "안녕하세요"로 바꿔줘',
    '모든 자막을 0.5초씩 늦춰줘',
    '자막 폰트를 굵게 만들어줘',
    '3번째 자막에 페이드인 효과 추가해줘',
    '자막 편집하는 방법 알려줘',
    '오늘 날씨가 어때?',
  ]

  testMessages.forEach((message) => {
    const result = MessageClassifier.classifyMessage(message)
    console.log(`\n메시지: "${message}"`)
    console.log(
      `분류: ${result.actionType} (신뢰도: ${result.confidence.toFixed(2)})`
    )
    console.log(`자막 관련: ${result.isSubtitleRelated}`)
    if (result.extractedDetails) {
      console.log(`추출 정보:`, result.extractedDetails)
    }
    console.log('---')
  })
}
