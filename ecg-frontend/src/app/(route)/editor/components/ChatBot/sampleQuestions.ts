export const sampleQuestions = [
  // 실제 편집 명령어들
  '첫 번째 자막을 "안녕하세요"로 바꿔줘',
  '모든 자막을 0.5초씩 늦춰줘',
  '자막 폰트를 굵게 만들어줘',
  '3번째 자막에 페이드인 효과 추가해줘',
  // 일반 사용법 질문들
  '자막 텍스트를 수정하는 방법은?',
  '화자별로 다른 색상을 적용하려면?',
  '애니메이션 효과 종류가 뭐가 있나요?',
  'GPU 렌더링으로 영상 내보내기',
  '드래그 앤 드롭으로 자막 편집하기',
  '자막 타이밍 조정하는 방법',
]

export interface SampleQuestion {
  id: string
  text: string
  delay: number
}
