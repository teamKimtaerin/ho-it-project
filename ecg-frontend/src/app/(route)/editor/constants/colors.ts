/**
 * 에디터에서 자주 사용하는 색상 정의
 * 재사용성과 일관성을 위한 중앙 색상 관리
 */

// 에디터 전용 색상 상수 (랜딩 페이지 테마와 통일)
export const EDITOR_COLORS = {
  // 클립 컴포넌트 색상
  clip: {
    background: '#FFFFFF', // 메인 배경색 (흰색)
    sidebar: '#F9FAFB', // 사이드바 색상 (연한 회색)
    text: '#000000', // 메인 텍스트 (검은색)
    textSecondary: '#6B7280', // 보조 텍스트 (중간 회색)
    accent: '#000000', // 강조색 (검은색)
    divider: '#E5E7EB', // 구분선 (연한 회색)
    hover: '#F3F4F6', // 호버 상태 색상
  },

  // 툴바 색상
  toolbar: {
    // 공통 툴바
    base: {
      background: 'bg-gray-100',
      backgroundRaw: 'rgba(243, 244, 246, 1)',
      border: 'border-b border-gray-300',
      divider: 'bg-gray-300',
      text: 'text-black',
      textHover: 'text-gray-800',
      hover: 'hover:bg-gray-200',
      iconColor: 'text-black',
      iconHover: 'text-gray-800',
    },
    // 편집 툴바
    edit: {
      background: 'bg-gray-100',
      backgroundRaw: 'rgba(243, 244, 246, 1)',
      border: 'border-b border-gray-300',
      divider: 'bg-gray-300',
      text: 'text-black',
      textHover: 'text-gray-800',
      hover: 'hover:bg-gray-200',
      iconColor: 'text-black',
      iconHover: 'text-gray-800',
    },
    // 고급 편집 페이지용 어두운 툴바
    dark: {
      background: 'bg-black',
      backgroundRaw: 'rgba(0, 0, 0, 1)',
      border: 'border-b border-gray-700',
      divider: 'bg-gray-600',
      text: 'text-white',
      textHover: 'text-gray-200',
      hover: 'hover:bg-gray-700',
      iconColor: 'text-white',
      iconHover: 'text-gray-200',
    },
    // 기타 툴바 변형
    transparent: {
      background: 'bg-transparent',
      border: 'border-b border-gray-700/50',
      divider: 'bg-gray-600',
      text: 'text-black',
      textHover: 'text-gray-800',
      hover: 'hover:bg-gray-100',
      iconColor: 'text-black',
      iconHover: 'text-gray-800',
    },
  },

  // 드롭다운 색상
  dropdown: {
    background: 'bg-white',
    backgroundRaw: 'rgba(255, 255, 255, 1)',
    border: 'border border-gray-200',
    hover: 'hover:bg-gray-50',
    selected: 'bg-gray-100',
    text: 'text-gray-700',
    textSecondary: 'text-gray-500',
    shadow: 'shadow-lg',
    // 어두운 드롭다운 (Format Toolbar용)
    dark: {
      background: 'bg-slate-800',
      backgroundRaw: 'rgba(30, 41, 59, 0.95)',
      border: 'border border-slate-600',
      hover: 'hover:bg-slate-700',
      selected: 'bg-slate-600',
      text: 'text-white',
      textSecondary: 'text-slate-300',
      shadow: 'shadow-2xl',
    },
  },

  // 선택 상태 색상
  selection: {
    checkbox: '#000000',
    focus: '#000000',
    multi: '#000000',
    hover: '#F3F4F6',
    ring: 'ring-2 ring-black',
    ringFocus: 'ring-4 ring-black/20',
  },

  // 버튼 상태 색상
  button: {
    primary: 'bg-black hover:bg-gray-800',
    secondary: 'bg-gray-100 hover:bg-gray-200',
    accent: 'bg-black hover:bg-gray-800',
    active: 'bg-black border-black text-white',
    inactive: 'border-gray-300 text-gray-500 hover:bg-gray-50',
    disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed',
    hover: 'hover:bg-gray-50',
  },

  // 텍스트 서식 색상 팔레트
  textFormat: {
    palette: [
      '#FFFFFF',
      '#000000',
      '#FF0000',
      '#00FF00',
      '#0000FF',
      '#FFFF00',
      '#FF00FF',
      '#00FFFF',
      '#FFA500',
      '#800080',
      '#FFC0CB',
      '#A52A2A',
      '#808080',
      '#90EE90',
      '#FFB6C1',
      '#8B4513',
      '#2E8B57',
      '#4682B4',
      '#D2691E',
      '#9ACD32',
    ],
  },

  // 배경 색상
  background: {
    editor: 'bg-gray-50',
    panel: 'bg-white/95',
    modal: 'bg-black/50',
    overlay: 'bg-black/70',
  },
} as const

// 색상 타입 정의
export type EditorColorKey = keyof typeof EDITOR_COLORS
export type ToolbarVariant = keyof typeof EDITOR_COLORS.toolbar

// Tailwind 클래스 조합 헬퍼 함수들
export const getToolbarClasses = (variant: ToolbarVariant = 'base') => {
  const colors = EDITOR_COLORS.toolbar[variant]
  return `${colors.background} backdrop-blur-sm ${colors.border}`
}

export const getButtonClasses = (
  state: 'primary' | 'secondary' | 'accent' | 'disabled'
) => {
  return EDITOR_COLORS.button[state]
}

export const getDropdownClasses = () => {
  const dropdown = EDITOR_COLORS.dropdown
  return `${dropdown.background} ${dropdown.border} ${dropdown.shadow} backdrop-blur-sm`
}

// 색상 유틸리티 함수
export const getClipColorStyle = (
  property: 'background' | 'text' | 'border'
) => {
  switch (property) {
    case 'background':
      return { backgroundColor: EDITOR_COLORS.clip.background }
    case 'text':
      return { color: EDITOR_COLORS.clip.text }
    case 'border':
      return { borderColor: EDITOR_COLORS.clip.divider }
    default:
      return {}
  }
}

// 동적 색상 생성 함수 (투명도 조절)
export const withOpacity = (hexColor: string, opacity: number): string => {
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// 색상 대비 확인 함수 (접근성)
export const hasGoodContrast = (bg: string, text: string): boolean => {
  // 간단한 대비 체크 (실제로는 WCAG 기준 사용 권장)
  const isDarkBg =
    bg.includes('black') || bg.includes('slate-8') || bg.includes('gray-9')
  const isLightText =
    text.includes('white') ||
    text.includes('slate-3') ||
    text.includes('gray-2')
  return isDarkBg !== isLightText
}
