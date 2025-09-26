import { ClipItem } from '@/app/(route)/editor/types'
import { EditorCommand } from '../EditorHistory'

export class DeleteClipCommand implements EditorCommand {
  private originalClips: ClipItem[]
  private updatedClips: ClipItem[]
  private clipId: string
  private setClips: (clips: ClipItem[]) => void
  public description: string

  constructor(
    clips: ClipItem[],
    clipId: string,
    setClips: (clips: ClipItem[]) => void
  ) {
    this.originalClips = [...clips]
    this.clipId = clipId
    this.setClips = setClips
    this.updatedClips = []

    // 삭제할 클립의 제목으로 설명 생성
    const targetClip = clips.find((clip) => clip.id === clipId)
    const clipTitle = targetClip ? targetClip.subtitle : '클립'
    this.description = `클립 삭제: "${clipTitle}"`
  }

  execute(): void {
    try {
      // 대상 클립 제거
      this.updatedClips = this.originalClips.filter(
        (clip) => clip.id !== this.clipId
      )

      // 넘버링 재정렬
      const reorderedClips = this.updatedClips.map((clip, index) => ({
        ...clip,
        timeline: (index + 1).toString(), // 1부터 시작하는 넘버링
      }))

      this.updatedClips = reorderedClips
      this.setClips(this.updatedClips)
    } catch (error) {
      console.error('클립 삭제 실행 중 오류:', error)
      throw error
    }
  }

  undo(): void {
    this.setClips(this.originalClips)
  }
}
