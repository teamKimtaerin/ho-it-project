import { ClipStyleState } from '../types'

export function useClipStyles({
  isSelected,
  isChecked = false,
  isMultiSelected = false,
  // isHovered, // TODO: Implement hover-specific styles
  isDragging = false,
}: ClipStyleState) {
  const getContainerClassName = () => {
    const baseClasses = 'rounded-lg cursor-pointer shadow-sm hover:shadow-md'

    let borderClasses = 'border border-gray-200' // 기본 테두리
    const stateClasses = ['bg-white'] // 기본 배경색 (흰색)

    if (isChecked || isMultiSelected) {
      // 체크박스 선택된 상태 - 검은색 테두리
      borderClasses = 'border-2 border-black'
      stateClasses.push('bg-gray-50')
    }

    if (isSelected) {
      // 클릭/포커스 상태 - 전체 클립 아이템에 강한 검은색 테두리
      borderClasses = 'border-2 border-black'
      stateClasses.push('bg-gray-50')
    } else if (!isDragging && !isChecked && !isMultiSelected) {
      stateClasses.push('hover:bg-gray-50 hover:border-gray-300')
    }

    return `${baseClasses} ${borderClasses} ${stateClasses.join(' ')}`
  }

  const getSidebarClassName = () => {
    const baseClasses =
      'w-16 flex flex-col items-center justify-between bg-gray-100 rounded-l-lg border-r border-gray-200 relative min-h-[64px] py-2 gap-2'
    const hoverClasses = 'hover:bg-gray-200 hover:shadow-sm'

    return `${baseClasses} ${hoverClasses}`
  }

  const getContentClassName = () => {
    return 'flex-1 flex flex-col'
  }

  return {
    containerClassName: getContainerClassName(),
    sidebarClassName: getSidebarClassName(),
    contentClassName: getContentClassName(),
  }
}
