/**
 * 압축된 시나리오 기준 JSON Patch를 전체 시나리오에 적용하기 위한 경로 매핑 유틸리티
 */

import type { CompressionMapping } from '@/app/(route)/editor/utils/scenarioCompressor'
import type { RendererConfigV2 } from '@/app/shared/motiontext'
import type { JsonPatch } from './jsonPatch'

export class PatchMapper {
  /**
   * 압축된 시나리오 기준 JSON Patch를 전체 시나리오 기준으로 변환
   */
  static mapCompressedPatchesToFull(
    patches: JsonPatch[],
    mapping: CompressionMapping,
    fullScenario: RendererConfigV2
  ): JsonPatch[] {
    return patches.map((patch) => {
      const mappedPath = this.mapCompressedPathToFull(
        patch.path,
        mapping,
        fullScenario
      )

      return {
        ...patch,
        path: mappedPath,
      }
    })
  }

  /**
   * 압축된 경로를 전체 시나리오 경로로 변환
   * 예: "/cues/0/root/children/0/style" -> "/cues/5/root/children/3/style"
   */
  private static mapCompressedPathToFull(
    compressedPath: string,
    mapping: CompressionMapping,
    fullScenario: RendererConfigV2
  ): string {
    // JSON Pointer 경로 파싱
    const pathParts = compressedPath.split('/').filter((part) => part !== '')

    // cues 경로가 아니면 그대로 반환
    if (pathParts.length === 0 || pathParts[0] !== 'cues') {
      return compressedPath
    }

    // /cues/{compressedIndex}/... 형태 파싱
    if (pathParts.length < 2) {
      return compressedPath
    }

    const compressedCueIndex = parseInt(pathParts[1], 10)
    if (isNaN(compressedCueIndex)) {
      return compressedPath
    }

    // 압축된 cue 인덱스 -> cue ID 매핑
    const cueId = mapping.cues.get(compressedCueIndex)
    if (!cueId) {
      console.warn(
        `Compressed cue index ${compressedCueIndex} not found in mapping`
      )
      return compressedPath
    }

    // 전체 시나리오에서 해당 cue ID의 실제 인덱스 찾기
    const fullCueIndex = fullScenario.cues.findIndex((cue) => cue.id === cueId)
    if (fullCueIndex === -1) {
      console.warn(`Cue ID ${cueId} not found in full scenario`)
      return compressedPath
    }

    // 새로운 경로 구성 시작
    const newPathParts = ['', 'cues', fullCueIndex.toString()]

    // children 경로 처리
    if (
      pathParts.length >= 5 &&
      pathParts[2] === 'root' &&
      pathParts[3] === 'children'
    ) {
      const compressedChildIndex = parseInt(pathParts[4], 10)

      if (!isNaN(compressedChildIndex)) {
        // 압축된 child 인덱스 -> word ID 매핑
        const childMapping = mapping.children.get(cueId)
        const wordId = childMapping?.get(compressedChildIndex)

        if (wordId) {
          // 전체 시나리오에서 해당 word ID의 실제 인덱스 찾기
          const fullCue = fullScenario.cues[fullCueIndex]
          const fullChildIndex = fullCue.root.children?.findIndex(
            (child) => child.id === wordId
          )

          if (fullChildIndex !== undefined && fullChildIndex !== -1) {
            newPathParts.push('root', 'children', fullChildIndex.toString())

            // 나머지 경로 추가 (style, color 등)
            if (pathParts.length > 5) {
              newPathParts.push(...pathParts.slice(5))
            }
          } else {
            console.warn(
              `Word ID ${wordId} not found in full scenario cue ${cueId}`
            )
            return compressedPath
          }
        } else {
          console.warn(
            `Compressed child index ${compressedChildIndex} not found in mapping for cue ${cueId}`
          )
          return compressedPath
        }
      } else {
        // children 인덱스가 숫자가 아닌 경우, 나머지 경로 그대로 추가
        newPathParts.push(...pathParts.slice(2))
      }
    } else {
      // children이 아닌 경우, 나머지 경로 그대로 추가
      newPathParts.push(...pathParts.slice(2))
    }

    const result = newPathParts.join('/')
    console.log(`📍 Path mapping: ${compressedPath} -> ${result}`)

    return result
  }
}
