import type { InsertedText } from '../types/textInsertion'
import type { RendererConfigV2 } from '@/app/shared/motiontext'
import { videoSegmentManager } from '@/utils/video/segmentManager'

/**
 * Convert percentage position to relative position (0-1 range)
 */
function percentageToRelative(percentage: number): number {
  return percentage / 100
}

/**
 * Apply segment time mapping similar to initialScenario.ts
 */
function toAdjustedOrOriginalTime(sec: number): number {
  const mapped = videoSegmentManager.mapToAdjustedTime(sec)
  return mapped == null || Number.isNaN(mapped) ? sec : mapped
}

/**
 * Convert TextStyle to MotionText style format
 */
function textStyleToMotionTextStyle(style: InsertedText['style']) {
  return {
    fontSizeRel: style.fontSize / 1000, // Convert px to relative size
    fontFamily: style.fontFamily,
    color: style.color,
    backgroundColor: style.backgroundColor,
    fontWeight: style.fontWeight === 'bold' ? 'bold' : 'normal',
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    textShadow: style.textShadow,
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
    padding: style.padding ? `${style.padding}px` : undefined,
    opacity: style.opacity,
  }
}

/**
 * Convert TextAnimation to MotionText plugin chain
 */
function textAnimationToPluginChain(animation?: InsertedText['animation']) {
  if (!animation || !animation.plugin) {
    return []
  }

  // spin 플러그인에 대한 기본 파라미터 보장
  const defaultParams =
    animation.plugin === 'spin@2.0.0'
      ? {
          fullTurns: 0.5, // 기본값: 1/2 회전
          ...animation.parameters,
        }
      : animation.parameters || {}

  return [
    {
      name: animation.plugin,
      params: defaultParams,
    },
  ]
}

/**
 * Convert InsertedText to V2 Cue format
 */
export function insertedTextToCue(
  insertedText: InsertedText
): RendererConfigV2['cues'][number] {
  const adjStartTime = toAdjustedOrOriginalTime(insertedText.startTime)
  const adjEndTime = toAdjustedOrOriginalTime(insertedText.endTime)

  if (
    !Number.isFinite(adjStartTime) ||
    !Number.isFinite(adjEndTime) ||
    adjEndTime <= adjStartTime
  ) {
    throw new Error(
      `Invalid time range for InsertedText ${insertedText.id}: ${adjStartTime} - ${adjEndTime}`
    )
  }

  // Convert position from percentage to relative coordinates
  const relativePosition = {
    x: percentageToRelative(insertedText.position.x),
    y: percentageToRelative(insertedText.position.y),
  }

  // Create text node with plugin chain
  const textNode = {
    id: `text-node-${insertedText.id}`,
    eType: 'text' as const,
    text: insertedText.content,
    baseTime: [adjStartTime, adjEndTime] as [number, number],
    style: textStyleToMotionTextStyle(insertedText.style),
    pluginChain: textAnimationToPluginChain(insertedText.animation),
  }

  // Create cue with text-prefixed ID for identification
  const cue = {
    id: `text-${insertedText.id}`,
    track: 'caption', // Use same track as subtitles
    domLifetime: [adjStartTime, adjEndTime] as [number, number],
    root: {
      id: `text-group-${insertedText.id}`,
      eType: 'group' as const,
      displayTime: [adjStartTime, adjEndTime] as [number, number],
      layout: {
        anchor: 'tc', // Top-center anchor for flexible positioning
        position: relativePosition,
        safeAreaClamp: false, // Allow free positioning
      },
      children: [textNode],
    },
  }

  return cue
}

/**
 * Extract InsertedText ID from cue ID
 */
export function extractInsertedTextId(cueId: string): string | null {
  const match = cueId.match(/^text-(.+)$/)
  return match ? match[1] : null
}

/**
 * Check if a cue represents an inserted text
 */
export function isInsertedTextCue(
  cue: RendererConfigV2['cues'][number]
): boolean {
  return cue.id.startsWith('text-')
}

/**
 * Convert multiple InsertedText objects to cues
 */
export function insertedTextsToCues(
  insertedTexts: InsertedText[]
): RendererConfigV2['cues'] {
  return insertedTexts
    .filter((text) => text.content.trim().length > 0) // Only convert non-empty texts
    .map(insertedTextToCue)
    .filter((cue) => cue !== null) // Filter out any failed conversions
}
