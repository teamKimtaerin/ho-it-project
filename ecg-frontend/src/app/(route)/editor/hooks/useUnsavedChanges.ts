import { useEffect, useState } from 'react'

export function useUnsavedChanges(hasChanges: boolean) {
  const [originalTitle] = useState(
    typeof document !== 'undefined' ? document.title : ''
  )

  useEffect(() => {
    if (typeof document === 'undefined') return

    // Update document title with indicator
    if (hasChanges) {
      document.title = `● ${originalTitle}`
    } else {
      document.title = originalTitle
    }

    // Add beforeunload event listener
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue =
          '저장되지 않은 변경사항이 있습니다. 정말로 나가시겠습니까?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Restore original title when component unmounts
      document.title = originalTitle
    }
  }, [hasChanges, originalTitle])

  return hasChanges
}
