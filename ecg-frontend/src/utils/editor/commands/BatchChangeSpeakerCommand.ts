import { EditorCommand } from '../EditorHistory'
import { ClipItem } from '@/app/(route)/editor/types'

export class BatchChangeSpeakerCommand implements EditorCommand {
  description: string
  private clips: ClipItem[]
  private clipIds: string[]
  private newSpeaker: string
  private previousClips: ClipItem[]
  private previousSpeakers: string[]
  private setClips: (clips: ClipItem[]) => void
  private setSpeakers: (speakers: string[]) => void
  private speakers: string[]

  constructor(
    clips: ClipItem[],
    speakers: string[],
    clipIds: string[], // IDs of clips to update
    newSpeaker: string,
    setClips: (clips: ClipItem[]) => void,
    setSpeakers: (speakers: string[]) => void
  ) {
    this.clips = clips
    this.speakers = speakers
    this.clipIds = clipIds
    this.newSpeaker = newSpeaker
    this.previousClips = [...clips]
    this.previousSpeakers = [...speakers]
    this.setClips = setClips
    this.setSpeakers = setSpeakers
    this.description = `Apply speaker "${newSpeaker}" to ${clipIds.length} clips`
  }

  execute(): void {
    // Update multiple clips with new speaker
    const updatedClips = this.clips.map((clip) =>
      this.clipIds.includes(clip.id)
        ? { ...clip, speaker: this.newSpeaker }
        : clip
    )
    this.setClips(updatedClips)

    // Add new speaker to the list if it doesn't exist
    if (this.newSpeaker && !this.speakers.includes(this.newSpeaker)) {
      const newSpeakers = [...this.speakers, this.newSpeaker]
      this.setSpeakers(newSpeakers)
      this.speakers = newSpeakers
    }

    // Update internal state for potential redo
    this.clips = updatedClips
  }

  undo(): void {
    // Restore previous clips
    this.setClips(this.previousClips)

    // Restore previous speakers list
    this.setSpeakers(this.previousSpeakers)
  }
}
