/**
 * 클립 ID 생성 유틸리티
 * 중복되지 않는 짧은 ID를 생성합니다.
 */

// 전역 카운터 (모듈 레벨에서 관리)
let mergedIdCounter = 0
let splitIdCounter = 0

/**
 * 현재 시간의 마지막 6자리와 카운터를 조합하여 고유한 ID 생성
 */
function generateShortTimestamp(): string {
  return Date.now().toString().slice(-6)
}

/**
 * 병합된 클립용 고유 ID 생성
 * 형식: merged_123456_1
 */
export function generateMergedClipId(): string {
  const timestamp = generateShortTimestamp()
  const counter = ++mergedIdCounter
  return `merged_${timestamp}_${counter}`
}

/**
 * 분할된 클립용 고유 ID 생성
 * 형식: originalId_split_1_123456_1
 */
export function generateSplitClipId(
  originalId: string,
  splitIndex: number
): string {
  const timestamp = generateShortTimestamp()
  const counter = ++splitIdCounter
  return `${originalId}_split_${splitIndex}_${timestamp}_${counter}`
}

/**
 * 카운터 초기화 (테스트용)
 */
export function resetCounters(): void {
  mergedIdCounter = 0
  splitIdCounter = 0
}
