import { ClipItem } from '@/app/(route)/editor/types'

/**
 * 클립 복사하기 Command 클래스
 * - 선택된 클립들을 클립보드에 복사 (원본은 그대로 유지)
 * - 실제로는 상태 변경이 없어서 Undo/Redo가 필요 없음
 */
export class CopyClipsCommand {
  private clipsToCopy: ClipItem[]
  private setClipboard: (clips: ClipItem[]) => void

  constructor(
    clips: ClipItem[],
    clipIds: string[],
    setClipboard: (clips: ClipItem[]) => void
  ) {
    this.clipsToCopy = clips.filter((clip) => clipIds.includes(clip.id))
    this.setClipboard = setClipboard
  }

  execute(): void {
    // 클립보드에 복사 (딥 카피로 독립적인 복사본 생성)
    const copiedClips = this.clipsToCopy.map((clip) => ({
      ...clip,
      id: `${clip.id}_copy_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      words: clip.words.map((word) => ({ ...word })),
    }))

    this.setClipboard(copiedClips)
  }

  undo(): void {
    // 복사 작업은 원본을 변경하지 않으므로 undo가 불필요
  }

  getDescription(): string {
    return `클립 ${this.clipsToCopy.length}개 복사하기`
  }
}
