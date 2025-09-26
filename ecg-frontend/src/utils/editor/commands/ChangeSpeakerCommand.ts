import { EditorCommand } from '../EditorHistory'
import { ClipItem } from '@/app/(route)/editor/types'

export class ChangeSpeakerCommand implements EditorCommand {
  description: string
  private clips: ClipItem[]
  private clipId: string
  private newSpeaker: string
  private previousSpeaker: string
  private previousSpeakers: string[]
  private setClips: (clips: ClipItem[]) => void
  private setSpeakers: (speakers: string[]) => void
  private speakers: string[]

  constructor(
    clips: ClipItem[],
    speakers: string[],
    clipId: string,
    newSpeaker: string,
    setClips: (clips: ClipItem[]) => void,
    setSpeakers: (speakers: string[]) => void
  ) {
    this.clips = clips
    this.speakers = speakers
    this.clipId = clipId
    this.newSpeaker = newSpeaker
    const targetClip = clips.find((c) => c.id === clipId)
    this.previousSpeaker = targetClip?.speaker || ''
    this.previousSpeakers = [...speakers]
    this.setClips = setClips
    this.setSpeakers = setSpeakers
    this.description = `Change speaker from ${this.previousSpeaker} to ${newSpeaker}`
  }

  execute(): void {
    // Update the clip with new speaker
    const updatedClips = this.clips.map((clip) =>
      clip.id === this.clipId ? { ...clip, speaker: this.newSpeaker } : clip
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
    // Restore previous speaker for the clip
    const updatedClips = this.clips.map((clip) =>
      clip.id === this.clipId
        ? { ...clip, speaker: this.previousSpeaker }
        : clip
    )
    this.setClips(updatedClips)

    // Restore previous speakers list
    this.setSpeakers(this.previousSpeakers)
  }
}
