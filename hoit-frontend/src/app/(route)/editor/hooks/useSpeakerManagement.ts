import { useState } from 'react'

export function useSpeakerManagement(initialSpeakers: string[] = []) {
  const [speakers, setSpeakers] = useState(initialSpeakers)

  const addSpeaker = (newSpeaker: string) => {
    if (newSpeaker && !speakers.includes(newSpeaker)) {
      setSpeakers([...speakers, newSpeaker])
    }
  }

  const removeSpeaker = (speakerToRemove: string) => {
    setSpeakers(speakers.filter((speaker) => speaker !== speakerToRemove))
  }

  return {
    speakers,
    addSpeaker,
    removeSpeaker,
  }
}
