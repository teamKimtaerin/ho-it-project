/**
 * 선택된 클립만 포함하는 압축된 시나리오 생성 유틸리티
 */

import type { RendererConfigV2 } from '@/app/shared/motiontext'
import type { ClipItem } from '../types'

/**
 * 압축 매핑 정보
 */
export interface CompressionMapping {
  // 압축된 cue 인덱스 -> 원본 cue ID
  cues: Map<number, string>
  // cue ID -> (압축된 children 인덱스 -> 원본 word ID)
  children: Map<string, Map<number, string>>
}

/**
 * 압축 결과와 매핑 정보
 */
export interface CompressionResult {
  scenario: RendererConfigV2
  mapping: CompressionMapping
}

/**
 * 선택된 클립 ID들을 기반으로 시나리오를 압축
 * tracks, stage, define 등은 그대로 유지하고 cues만 필터링
 */
export function compressScenarioWithSelectedCues(
  scenario: RendererConfigV2,
  selectedClipIds: Set<string>,
  clips: ClipItem[]
): CompressionResult {
  if (selectedClipIds.size === 0) {
    // 선택된 클립이 없으면 전체 시나리오 반환
    return {
      scenario,
      mapping: {
        cues: new Map(),
        children: new Map(),
      },
    }
  }

  // 선택된 클립들의 cue ID 추출 (cue-${clip.id} 형태)
  const selectedCueIds = new Set<string>()

  Array.from(selectedClipIds).forEach((clipId) => {
    const clip = clips.find((c) => c.id === clipId)
    if (clip) {
      selectedCueIds.add(`cue-${clip.id}`)
    }
  })

  // 매핑 정보 생성 (clip-based compression은 간단함)
  const mapping: CompressionMapping = {
    cues: new Map(),
    children: new Map(),
  }

  // cues 필터링 - 선택된 cue만 포함
  const filteredCues = scenario.cues.filter((cue, originalIndex) => {
    const isIncluded = selectedCueIds.has(cue.id)
    if (isIncluded) {
      // 매핑 정보 저장: 압축된 인덱스 -> 원본 cue ID
      const compressedIndex = mapping.cues.size
      mapping.cues.set(compressedIndex, cue.id)
      mapping.children.set(cue.id, new Map())

      // children 매핑 정보도 저장 (전체 children 포함)
      cue.root.children?.forEach((child, childIndex) => {
        mapping.children.get(cue.id)!.set(childIndex, child.id)
      })
    }
    return isIncluded
  })

  return {
    scenario: {
      ...scenario,
      cues: filteredCues,
    },
    mapping,
  }
}

/**
 * 선택된 워드들을 기반으로 시나리오를 압축 (매핑 정보 포함)
 */
export function compressScenarioWithSelectedWords(
  scenario: RendererConfigV2,
  selectedWordIds: Set<string>,
  clips: ClipItem[]
): CompressionResult {
  console.log('📝 compressScenarioWithSelectedWords:', {
    selectedWordIdsArray: Array.from(selectedWordIds),
    selectedWordIdsSize: selectedWordIds.size,
  })

  if (selectedWordIds.size === 0) {
    console.log('❌ No selected words - returning original scenario')
    return {
      scenario,
      mapping: {
        cues: new Map(),
        children: new Map(),
      },
    }
  }

  // 선택된 워드들이 포함된 클립들의 cue ID 추출
  const selectedCueIds = new Set<string>()

  clips.forEach((clip) => {
    console.log(
      `🔍 Checking clip ${clip.id} with ${clip.words.length} words:`,
      clip.words.map((w) => ({ id: w.id, text: w.text }))
    )

    const hasSelectedWord = clip.words.some((word) => {
      const isSelected = selectedWordIds.has(word.id)
      console.log(
        `  Word "${word.text}" (${word.id}): ${isSelected ? '✅ SELECTED' : '❌ not selected'}`
      )
      return isSelected
    })

    if (hasSelectedWord) {
      const cueId = `cue-${clip.id}`
      selectedCueIds.add(cueId)
      console.log(`✅ Added cue: ${cueId}`)
    }
  })

  console.log('🎯 Selected cue IDs:', Array.from(selectedCueIds))

  // 매핑 정보 생성
  const mapping: CompressionMapping = {
    cues: new Map(),
    children: new Map(),
  }

  // cues 필터링 및 children 필터링
  const filteredCues = scenario.cues
    .filter((cue) => {
      const isIncluded = selectedCueIds.has(cue.id)
      console.log(
        `Cue ${cue.id}: ${isIncluded ? '✅ INCLUDED' : '❌ excluded'}`
      )
      return isIncluded
    })
    .map((cue, compressedCueIndex) => {
      // 매핑 정보 저장: 압축된 인덱스 -> 원본 cue ID
      mapping.cues.set(compressedCueIndex, cue.id)
      mapping.children.set(cue.id, new Map())

      // 해당 cue의 children 중에서 선택된 단어만 필터링
      const originalChildrenCount = cue.root.children?.length || 0
      const filteredChildren = cue.root.children?.filter((child) => {
        // child.id를 selectedWordIds와 비교
        const isSelectedWord = selectedWordIds.has(child.id)
        console.log(
          `  Child "${child.text}" (${child.id}): ${isSelectedWord ? '✅ SELECTED' : '❌ filtered out'}`
        )
        return isSelectedWord
      })

      // children 매핑 정보 저장
      filteredChildren?.forEach((child, compressedChildIndex) => {
        mapping.children.get(cue.id)!.set(compressedChildIndex, child.id)
      })

      const filteredChildrenCount = filteredChildren?.length || 0
      console.log(
        `🔧 Cue ${cue.id}: filtered children ${filteredChildrenCount}/${originalChildrenCount}`
      )

      return {
        ...cue,
        root: {
          ...cue.root,
          children: filteredChildren,
        },
      }
    })

  console.log(
    `📊 Final compression result: ${filteredCues.length}/${scenario.cues.length} cues with filtered children`
  )

  return {
    scenario: {
      ...scenario,
      cues: filteredCues,
    },
    mapping,
  }
}

/**
 * 클립 또는 워드 선택에 따라 적절한 압축 방식 선택
 */
export function compressScenarioBySelection(
  scenario: RendererConfigV2,
  selectedClipIds: Set<string>,
  selectedWordIds: Set<string>,
  clips: ClipItem[]
): CompressionResult {
  console.log('🗜️ compressScenarioBySelection called:', {
    selectedClipIds: Array.from(selectedClipIds),
    selectedWordIds: Array.from(selectedWordIds),
    clipsCount: clips.length,
    totalCues: scenario.cues.length,
  })

  // 클립 선택이 우선순위
  if (selectedClipIds.size > 0) {
    console.log('📋 Using clip-based compression')
    return compressScenarioWithSelectedCues(scenario, selectedClipIds, clips)
  }

  // 워드 선택이 있는 경우
  if (selectedWordIds.size > 0) {
    console.log('📝 Using word-based compression')
    return compressScenarioWithSelectedWords(scenario, selectedWordIds, clips)
  }

  // 선택이 없으면 전체 시나리오 반환
  console.log('❌ No selection - returning full scenario')
  return {
    scenario,
    mapping: {
      cues: new Map(),
      children: new Map(),
    },
  }
}
