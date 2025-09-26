import type { RendererConfigV2 } from '@/app/shared/motiontext'
import type { ClipItem, Word } from '@/app/(route)/editor/types'

export interface ScenarioEditRequest {
  type: 'scenario_edit'
  explanation: string
  changes: {
    clips?: Array<{
      id: string
      updates: Partial<ClipItem> & {
        words?: Array<Partial<Word> & { id: string }>
      }
    }>
    scenario?: Partial<RendererConfigV2>
  }
}

export interface ParsedEditResponse {
  isEdit: boolean
  explanation: string
  clipChanges?: ScenarioEditRequest['changes']['clips']
  scenarioChanges?: ScenarioEditRequest['changes']['scenario']
  originalText?: string
}

export class ScenarioEditParser {
  static parseAIResponse(aiResponse: string): ParsedEditResponse {
    // 1. JSON 블록 추출 시도
    const jsonMatch = this.extractJsonFromResponse(aiResponse)

    if (!jsonMatch) {
      // JSON이 없으면 일반 텍스트 응답
      return {
        isEdit: false,
        explanation: aiResponse,
        originalText: aiResponse,
      }
    }

    try {
      // 2. JSON 파싱
      const parsedJson = JSON.parse(jsonMatch) as ScenarioEditRequest

      // 3. 유효성 검증
      if (!this.validateEditRequest(parsedJson)) {
        throw new Error('Invalid edit request format')
      }

      // 4. 성공적으로 파싱됨
      return {
        isEdit: true,
        explanation: parsedJson.explanation,
        clipChanges: parsedJson.changes.clips,
        scenarioChanges: parsedJson.changes.scenario,
        originalText: aiResponse,
      }
    } catch (error) {
      console.error('JSON 파싱 실패:', error)

      // 파싱 실패 시 일반 텍스트로 처리
      return {
        isEdit: false,
        explanation: aiResponse,
        originalText: aiResponse,
      }
    }
  }

  private static extractJsonFromResponse(response: string): string | null {
    // 다양한 JSON 블록 패턴 시도
    const patterns = [
      // ```json ... ``` 블록
      /```json\s*([\s\S]*?)\s*```/i,
      // ``` ... ``` 블록 (json 키워드 없이)
      /```\s*([\s\S]*?)\s*```/,
      // { ... } 객체 (멀티라인)
      /(\{[\s\S]*\})/,
    ]

    for (const pattern of patterns) {
      const match = response.match(pattern)
      if (match && match[1]) {
        const jsonStr = match[1].trim()

        // 간단한 JSON 유효성 체크
        if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
          return jsonStr
        }
      }
    }

    return null
  }

  private static validateEditRequest(data: any): data is ScenarioEditRequest {
    // 기본 구조 검증
    if (typeof data !== 'object' || !data) return false
    if (data.type !== 'scenario_edit') return false
    if (typeof data.explanation !== 'string') return false
    if (typeof data.changes !== 'object' || !data.changes) return false

    // clips 배열 검증 (있다면)
    if (data.changes.clips) {
      if (!Array.isArray(data.changes.clips)) return false

      for (const clip of data.changes.clips) {
        if (typeof clip !== 'object' || !clip) return false
        if (typeof clip.id !== 'string') return false
        if (typeof clip.updates !== 'object' || !clip.updates) return false
      }
    }

    // scenario 객체 검증 (있다면)
    if (data.changes.scenario) {
      if (typeof data.changes.scenario !== 'object' || !data.changes.scenario)
        return false
    }

    return true
  }

  // 클립 변경사항 적용
  static applyClipChanges(
    originalClips: ClipItem[],
    clipChanges: ScenarioEditRequest['changes']['clips']
  ): ClipItem[] {
    if (!clipChanges || clipChanges.length === 0) {
      return originalClips
    }

    return originalClips.map((clip) => {
      const change = clipChanges.find((c) => c.id === clip.id)
      if (!change) return clip

      const updatedClip = { ...clip, ...change.updates }

      // words 배열 개별 처리
      if (change.updates.words) {
        updatedClip.words = clip.words.map((word) => {
          const wordUpdate = change.updates.words?.find((w) => w.id === word.id)
          return wordUpdate ? { ...word, ...wordUpdate } : word
        })
      }

      return updatedClip
    })
  }

  // 시나리오 변경사항 적용 (깊은 병합)
  static applyScenarioChanges(
    originalScenario: RendererConfigV2,
    scenarioChanges: ScenarioEditRequest['changes']['scenario']
  ): RendererConfigV2 {
    if (!scenarioChanges) {
      return originalScenario
    }

    // 깊은 복사 후 병합
    const updatedScenario = JSON.parse(
      JSON.stringify(originalScenario)
    ) as RendererConfigV2

    // tracks 병합
    if (scenarioChanges.tracks) {
      scenarioChanges.tracks.forEach((trackChange) => {
        const existingTrack = updatedScenario.tracks.find(
          (t) => t.id === trackChange.id
        )
        if (existingTrack) {
          Object.assign(existingTrack, trackChange)
        }
      })
    }

    // cues 병합
    if (scenarioChanges.cues) {
      scenarioChanges.cues.forEach((cueChange) => {
        const existingCue = updatedScenario.cues.find(
          (c) => c.id === cueChange.id
        )
        if (existingCue) {
          Object.assign(existingCue, cueChange)
        }
      })
    }

    // 기타 최상위 속성들 병합
    Object.keys(scenarioChanges).forEach((key) => {
      if (key !== 'tracks' && key !== 'cues') {
        ;(updatedScenario as any)[key] = (scenarioChanges as any)[key]
      }
    })

    return updatedScenario
  }

  // 테스트용 메서드
  static testParsing() {
    console.log('=== ScenarioEditParser 테스트 ===')

    const testResponses = [
      // JSON 편집 응답
      `네, 첫 번째 자막을 수정하겠습니다.

\`\`\`json
{
  "type": "scenario_edit",
  "explanation": "첫 번째 자막을 '안녕하세요'로 변경했습니다.",
  "changes": {
    "clips": [
      {
        "id": "clip_0",
        "updates": {
          "fullText": "안녕하세요",
          "subtitle": "안녕하세요"
        }
      }
    ]
  }
}
\`\`\``,

      // 일반 텍스트 응답
      '자막을 편집하는 방법을 알려드리겠습니다. 먼저 클립을 선택하고...',

      // 잘못된 JSON
      '```json\n{ "invalid": json } \n```',
    ]

    testResponses.forEach((response, index) => {
      console.log(`\n--- 테스트 ${index + 1} ---`)
      console.log('입력:', response.substring(0, 50) + '...')

      const result = this.parseAIResponse(response)
      console.log('결과:', {
        isEdit: result.isEdit,
        explanation: result.explanation?.substring(0, 50) + '...',
        hasClipChanges: !!result.clipChanges,
        hasScenarioChanges: !!result.scenarioChanges,
      })
    })
  }
}

export default ScenarioEditParser
