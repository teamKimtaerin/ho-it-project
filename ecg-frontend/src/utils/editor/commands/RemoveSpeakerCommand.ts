import { EditorCommand } from '../EditorHistory'
import { ClipItem } from '@/app/(route)/editor/types'

export class RemoveSpeakerCommand implements EditorCommand {
  description: string
  private clips: ClipItem[]
  private speakerToRemove: string
  private previousClips: ClipItem[]
  private previousSpeakers: string[]
  private setClips: (clips: ClipItem[]) => void
  private setSpeakers: (speakers: string[]) => void
  private speakers: string[]

  constructor(
    clips: ClipItem[],
    speakers: string[],
    speakerToRemove: string,
    setClips: (clips: ClipItem[]) => void,
    setSpeakers: (speakers: string[]) => void
  ) {
    this.clips = clips
    this.speakers = speakers
    this.speakerToRemove = speakerToRemove
    this.previousClips = [...clips]
    this.previousSpeakers = [...speakers]
    this.setClips = setClips
    this.setSpeakers = setSpeakers
    this.description = `Remove speaker: ${speakerToRemove}`
  }

  execute(): void {
    // Remove from speakers list
    const newSpeakers = this.previousSpeakers.filter(
      (s) => s !== this.speakerToRemove
    )
    this.setSpeakers(newSpeakers)

    // Update all clips that use this speaker
    const updatedClips = this.previousClips.map((clip) =>
      clip.speaker === this.speakerToRemove ? { ...clip, speaker: '' } : clip
    )
    this.setClips(updatedClips)

    // Update internal state for potential redo
    this.clips = updatedClips
    this.speakers = newSpeakers
  }

  undo(): void {
    // Restore previous speakers list
    this.setSpeakers(this.previousSpeakers)

    // Restore previous clips
    this.setClips(this.previousClips)
  }
}
