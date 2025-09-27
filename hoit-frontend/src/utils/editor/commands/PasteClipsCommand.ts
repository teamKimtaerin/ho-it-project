import { ClipItem } from '@/app/(route)/editor/types'

/**
 * 클립 붙여넣기 Command 클래스
 * - 클립보드에 있는 클립들을 현재 클립 리스트에 추가
 * - 새로운 고유 ID 생성으로 중복 방지
 */
import { EditorCommand } from '../EditorHistory'

export class PasteClipsCommand implements EditorCommand {
  private originalClips: ClipItem[]
  private clipboardClips: ClipItem[]
  private pastedClips: ClipItem[]
  private setClips: (clips: ClipItem[]) => void

  constructor(
    clips: ClipItem[],
    clipboardClips: ClipItem[],
    setClips: (clips: ClipItem[]) => void
  ) {
    this.originalClips = [...clips]
    this.clipboardClips = clipboardClips
    this.setClips = setClips

    // 붙여넣을 클립들에 새로운 ID 생성
    this.pastedClips = clipboardClips.map((clip) => ({
      ...clip,
      id: `${clip.id}_paste_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      words: clip.words.map((word) => ({ ...word })),
    }))
  }

  execute(): void {
    if (this.clipboardClips.length === 0) return

    // 기존 클립들에 붙여넣은 클립들 추가
    const newClips = [...this.originalClips, ...this.pastedClips]
    this.setClips(newClips)
  }

  undo(): void {
    // 원본 상태로 복원
    this.setClips([...this.originalClips])
  }

  get description(): string {
    return `클립 ${this.clipboardClips.length}개 붙여넣기`
  }
}
