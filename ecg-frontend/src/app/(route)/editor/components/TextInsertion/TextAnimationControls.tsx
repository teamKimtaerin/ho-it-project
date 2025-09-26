'use client'

import React from 'react'
import { useEditorStore } from '../../store'
import {
  ROTATION_PRESETS,
  type RotationPreset,
} from '../../types/textInsertion'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'

interface TextAnimationControlsProps {
  textId: string
  className?: string
}

export default function TextAnimationControls({
  textId,
  className = '',
}: TextAnimationControlsProps) {
  const { insertedTexts, toggleRotationAnimation, setAnimationPreset } =
    useEditorStore()

  const currentText = insertedTexts.find((text) => text.id === textId)
  if (!currentText) return null

  const hasRotationAnimation = currentText.animation?.plugin === 'spin@2.0.0'

  const presetOptions = Object.keys(ROTATION_PRESETS).map((key) => ({
    value: key,
    label: getPresetLabel(key as RotationPreset),
  }))

  const currentPreset = findCurrentPreset(
    currentText.animation?.plugin || '',
    currentText.animation?.parameters || {}
  )

  function getPresetLabel(preset: RotationPreset): string {
    switch (preset) {
      case 'NONE':
        return '애니메이션 없음'
      case 'SUBTLE':
        return '부드러운 회전'
      case 'DYNAMIC':
        return '역동적 회전'
      case 'FLIP_3D':
        return '3D 뒤집기'
      default:
        return preset
    }
  }

  function findCurrentPreset(
    plugin: string,
    parameters: Record<string, unknown>
  ): RotationPreset {
    if (!plugin) return 'NONE'

    // 파라미터 비교를 통해 현재 프리셋 찾기
    for (const [key, preset] of Object.entries(ROTATION_PRESETS)) {
      if (preset.plugin === plugin) {
        // fullTurns 파라미터 비교
        const fullTurns = parameters.fullTurns as number | undefined
        const presetFullTurns =
          'fullTurns' in preset.parameters
            ? (preset.parameters.fullTurns as number)
            : undefined

        if (
          fullTurns !== undefined &&
          presetFullTurns !== undefined &&
          Math.abs(fullTurns - presetFullTurns) < 0.1
        ) {
          return key as RotationPreset
        }
      }
    }

    return plugin === 'spin@2.0.0' ? 'SUBTLE' : 'NONE'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 애니메이션 토글 버튼 */}
      <Button
        variant={hasRotationAnimation ? 'primary' : 'secondary'}
        onClick={() => toggleRotationAnimation(textId)}
        className="min-w-[100px] text-sm px-3 py-1"
      >
        {hasRotationAnimation ? '🎭 회전 ON' : '⭕ 회전 OFF'}
      </Button>

      {/* 프리셋 선택 드롭다운 */}
      <Dropdown
        value={currentPreset}
        options={presetOptions}
        onChange={(value: string) =>
          setAnimationPreset(textId, value as RotationPreset)
        }
        placeholder="프리셋 선택"
        className="min-w-[120px]"
      />

      {/* 현재 설정 표시 */}
      {hasRotationAnimation && (
        <div className="text-xs text-gray-500 ml-2">
          {((currentText.animation?.parameters?.fullTurns as number) || 0) *
            360}
          ° 회전
        </div>
      )}
    </div>
  )
}
