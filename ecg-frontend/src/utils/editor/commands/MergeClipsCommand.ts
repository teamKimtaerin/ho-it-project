import { ClipItem } from '@/app/(route)/editor/components/ClipComponent'
import { mergeSelectedClips } from '../clipMerger'
import { EditorCommand } from '../EditorHistory'

export class MergeClipsCommand implements EditorCommand {
  private originalClips: ClipItem[]
  private mergedClips: ClipItem[]
  private selectedIds: string[]
  private checkedIds: string[]
  private setClips: (clips: ClipItem[]) => void
  public description: string
  private mergedClipId: string | null = null

  constructor(
    clips: ClipItem[],
    selectedIds: string[],
    checkedIds: string[],
    setClips: (clips: ClipItem[]) => void
  ) {
    this.originalClips = [...clips]
    this.selectedIds = [...selectedIds]
    this.checkedIds = [...checkedIds]
    this.setClips = setClips
    this.mergedClips = []
    this.description = '클립 합치기'
  }

  execute(): void {
    try {
      this.mergedClips = mergeSelectedClips(
        this.originalClips,
        this.selectedIds,
        this.checkedIds
      )

      // 합쳐진 클립의 ID 찾기
      const allSelectedIds = Array.from(
        new Set([...this.selectedIds, ...this.checkedIds])
      )
      const firstSelectedIndex = Math.min(
        ...allSelectedIds
          .map((id) => this.originalClips.findIndex((clip) => clip.id === id))
          .filter((index) => index !== -1)
      )

      // 합쳐진 클립은 firstSelectedIndex 위치에 있음
      if (
        firstSelectedIndex !== -1 &&
        this.mergedClips.length > firstSelectedIndex
      ) {
        this.mergedClipId = this.mergedClips[firstSelectedIndex].id
      }

      this.setClips(this.mergedClips)
    } catch (error) {
      console.error('클립 합치기 실행 중 오류:', error)
      throw error
    }
  }

  getMergedClipId(): string | null {
    return this.mergedClipId
  }

  undo(): void {
    this.setClips(this.originalClips)
  }
}
