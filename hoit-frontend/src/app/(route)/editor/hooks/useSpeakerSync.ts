import { useEffect, useCallback } from 'react'
import { useEditorStore } from '../store'
import {
  extractSpeakersFromClips,
  normalizeSpeakerList,
  ensureMinimumSpeakers,
  analyzeSpeakerUsage,
} from '@/utils/speaker/speakerUtils'
import { getSpeakerColorByIndex } from '@/utils/editor/speakerColors'

/**
 * 클립 변경 시 화자 목록을 자동으로 동기화하는 훅
 */
export const useSpeakerSync = () => {
  const { clips, speakers, speakerColors, setSpeakers, setSpeakerColors } =
    useEditorStore()

  // 화자 목록 동기화 함수
  const syncSpeakers = useCallback(() => {
    try {
      // 1. 현재 클립에서 사용된 화자 추출
      const clipsBasedSpeakers = extractSpeakersFromClips(clips)

      // 2. 기존 Store의 화자와 클립 기반 화자 병합
      const allSpeakers = [...speakers, ...clipsBasedSpeakers]
      const { speakers: normalizedSpeakers } = normalizeSpeakerList(allSpeakers)

      // 3. 최소 1명의 화자 보장
      const finalSpeakers = ensureMinimumSpeakers(normalizedSpeakers)

      // 4. 기존 화자와 변경사항이 있는지 확인
      const hasChanged =
        finalSpeakers.length !== speakers.length ||
        finalSpeakers.some((speaker) => !speakers.includes(speaker))

      if (hasChanged) {
        // 5. 새로운 화자에 대해서만 색상 할당 (기존 색상 유지)
        const newColors = { ...speakerColors }
        finalSpeakers.forEach((speaker, index) => {
          if (!newColors[speaker]) {
            // 기존에 색상이 없는 새로운 화자에게만 색상 할당
            newColors[speaker] = getSpeakerColorByIndex(index)
          }
        })

        // 6. 더 이상 사용되지 않는 화자의 색상 제거
        const unusedSpeakers = Object.keys(newColors).filter(
          (speaker) => !finalSpeakers.includes(speaker)
        )
        unusedSpeakers.forEach((speaker) => {
          delete newColors[speaker]
        })

        // 7. Store 업데이트
        setSpeakers(finalSpeakers)
        setSpeakerColors(newColors)

        console.log('🔄 [useSpeakerSync] Synchronized speakers:', {
          before: speakers,
          after: finalSpeakers,
          clipsBasedSpeakers,
          colors: newColors,
        })
      }
    } catch (error) {
      console.error('❌ [useSpeakerSync] Failed to sync speakers:', error)
    }
  }, [clips, speakers, speakerColors, setSpeakers, setSpeakerColors])

  // 클립이 변경될 때마다 화자 동기화 실행
  useEffect(() => {
    // 클립이 있을 때만 동기화 (초기 로딩 시 빈 배열 무시)
    if (clips.length > 0) {
      syncSpeakers()
    }
  }, [clips, syncSpeakers])

  // 화자 사용 통계 분석 함수
  const getSpeakerStats = useCallback(() => {
    return analyzeSpeakerUsage(clips)
  }, [clips])

  // 사용되지 않는 화자 찾기
  const getUnusedSpeakers = useCallback(() => {
    const clipsBasedSpeakers = extractSpeakersFromClips(clips)
    return speakers.filter((speaker) => !clipsBasedSpeakers.includes(speaker))
  }, [clips, speakers])

  // 화자가 없는 클립 개수
  const getUnassignedClipsCount = useCallback(() => {
    return clips.filter(
      (clip) =>
        !clip.speaker ||
        clip.speaker.trim() === '' ||
        clip.speaker === 'Unknown'
    ).length
  }, [clips])

  // 수동 동기화 함수 (필요시 외부에서 호출)
  const manualSync = useCallback(() => {
    syncSpeakers()
  }, [syncSpeakers])

  return {
    syncSpeakers: manualSync,
    getSpeakerStats,
    getUnusedSpeakers,
    getUnassignedClipsCount,
  }
}
