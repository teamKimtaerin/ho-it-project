import { arrayMove as dndKitArrayMove } from '@dnd-kit/sortable'

export const removeAtIndex = <T>(array: T[], index: number): T[] => {
  return [...array.slice(0, index), ...array.slice(index + 1)]
}

export const insertAtIndex = <T>(array: T[], index: number, item: T): T[] => {
  return [...array.slice(0, index), item, ...array.slice(index)]
}

export const arrayMove = <T>(
  array: T[],
  oldIndex: number,
  newIndex: number
): T[] => {
  return dndKitArrayMove(array, oldIndex, newIndex)
}
