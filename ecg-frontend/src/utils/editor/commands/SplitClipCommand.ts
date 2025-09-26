import { ClipItem } from '@/app/(route)/editor/types'
import { splitSelectedClip } from '../clipSplitter'
import { EditorCommand } from '../EditorHistory'

export class SplitClipCommand implements EditorCommand {
  private originalClips: ClipItem[]
  private splitClips: ClipItem[]
  private clipId: string
  private setClips: (clips: ClipItem[]) => void
  public description: string
  private firstSplitClipId: string | null = null

  constructor(
    clips: ClipItem[],
    clipId: string,
    setClips: (clips: ClipItem[]) => void
  ) {
    this.originalClips = [...clips]
    this.clipId = clipId
    this.setClips = setClips
    this.splitClips = []

    // 나눌 클립의 제목으로 설명 생성
    const targetClip = clips.find((clip) => clip.id === clipId)
    const clipTitle = targetClip ? targetClip.subtitle : '클립'
    this.description = `클립 나누기: "${clipTitle}"`
  }

  execute(): void {
    try {
      // 원본 클립의 인덱스 찾기
      const originalIndex = this.originalClips.findIndex(
        (clip) => clip.id === this.clipId
      )

      this.splitClips = splitSelectedClip(this.originalClips, this.clipId)
      this.setClips(this.splitClips)

      // 분할된 첫 번째 클립의 ID 저장 (원본 클립이 있던 위치의 첫 번째 클립)
      if (originalIndex !== -1 && this.splitClips.length > originalIndex) {
        this.firstSplitClipId = this.splitClips[originalIndex].id
      }
    } catch (error) {
      console.error('클립 나누기 실행 중 오류:', error)
      throw error
    }
  }

  undo(): void {
    this.setClips(this.originalClips)
  }

  getFirstSplitClipId(): string | null {
    return this.firstSplitClipId
  }
}
