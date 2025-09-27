import { ClipItem, SelectionBox } from '@/app/(route)/editor/types'

/**
 * Check if a clip element intersects with a selection box
 */
export function isClipInSelectionBox(
  clipElement: HTMLElement,
  containerElement: HTMLElement,
  selectionBox: SelectionBox
): boolean {
  const clipRect = clipElement.getBoundingClientRect()
  const containerRect = containerElement.getBoundingClientRect()

  const clipTop = clipRect.top - containerRect.top
  const clipBottom = clipRect.bottom - containerRect.top
  const clipLeft = clipRect.left - containerRect.left
  const clipRight = clipRect.right - containerRect.left

  const selLeft = Math.min(selectionBox.startX, selectionBox.endX)
  const selRight = Math.max(selectionBox.startX, selectionBox.endX)
  const selTop = Math.min(selectionBox.startY, selectionBox.endY)
  const selBottom = Math.max(selectionBox.startY, selectionBox.endY)

  return (
    clipRight > selLeft &&
    clipLeft < selRight &&
    clipBottom > selTop &&
    clipTop < selBottom
  )
}

/**
 * Get all clip IDs that are within the selection box
 */
export function getClipsInSelectionBox(
  containerElement: HTMLElement,
  selectionBox: SelectionBox
): string[] {
  const clipElements = containerElement.querySelectorAll('[data-clip-id]')
  const selected: string[] = []

  clipElements.forEach((element) => {
    if (
      isClipInSelectionBox(
        element as HTMLElement,
        containerElement,
        selectionBox
      )
    ) {
      const clipId = element.getAttribute('data-clip-id')
      if (clipId) selected.push(clipId)
    }
  })

  return selected
}

/**
 * Update a specific word in a clip
 */
export function updateClipWord(
  clip: ClipItem,
  wordId: string,
  newText: string
): ClipItem {
  const updatedWords = clip.words.map((word) =>
    word.id === wordId ? { ...word, text: newText } : word
  )

  const fullText = updatedWords.map((word) => word.text).join(' ')

  return {
    ...clip,
    words: updatedWords,
    fullText,
  }
}
