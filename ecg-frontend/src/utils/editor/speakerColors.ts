import chroma from 'chroma-js'

// 화자별 고유 색상 생성을 위한 공유 유틸리티
export const SPEAKER_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#F97316', // orange
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#EC4899', // pink
  '#6366F1', // indigo
]

/**
 * SpeakerManagementSidebar와 동일한 색상환 색상 생성
 * HSV 색상 공간에서 12개 색상 (30도씩)
 */
export const generateSpeakerWheelColors = (): string[] => {
  const colors: string[] = []
  const saturation = 0.8
  const value = 0.9

  // 12개 색상으로 색상환 생성 (30도씩)
  for (let i = 0; i < 12; i++) {
    const hue = (i * 30) % 360
    const chromaColor = chroma.hsv(hue, saturation, value)
    colors.push(chromaColor.hex())
  }

  return colors
}

// 색상환 색상 배열 (캐시됨)
export const SPEAKER_WHEEL_COLORS = generateSpeakerWheelColors()

/**
 * 화자 인덱스 기반으로 색상환에서 색상 할당
 * @param index - 화자 인덱스 (0부터 시작)
 * @returns 색상환 색상 (hex)
 */
export const getSpeakerColorByIndex = (index: number): string => {
  return SPEAKER_WHEEL_COLORS[index % SPEAKER_WHEEL_COLORS.length]
}

/**
 * 화자 이름을 기반으로 고유한 색상을 생성합니다.
 * 이미 설정된 색상이 있으면 우선 사용합니다.
 *
 * @param speakerName - 화자 이름
 * @param speakerColors - 이미 설정된 화자별 색상 매핑
 * @returns 화자의 색상 (hex)
 */
export const getSpeakerColor = (
  speakerName: string,
  speakerColors: Record<string, string> = {}
): string => {
  if (!speakerName) return '#6B7280' // 기본 회색

  // 이미 설정된 색상이 있으면 사용
  if (speakerColors[speakerName]) {
    return speakerColors[speakerName]
  }

  // 화자 이름을 기반으로 해시 생성하여 색상 선택
  let hash = 0
  for (let i = 0; i < speakerName.length; i++) {
    hash = speakerName.charCodeAt(i) + ((hash << 5) - hash)
  }

  return SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length]
}
