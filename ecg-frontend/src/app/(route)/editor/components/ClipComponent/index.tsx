'use client'

import React, { useState } from 'react'
import { ClipComponentProps } from './types'
import ClipCheckbox from './ClipCheckbox'
import ClipSpeaker from './ClipSpeaker'
import ClipStickerButton from './ClipStickerButton'
import ClipWords from './ClipWords'
import ClipText from './ClipText'
import ExpandedClipWaveform from './ExpandedClipWaveform'
import { useClipDragAndDrop } from '../../hooks/useClipDragAndDrop'
import { useClipStyles } from '../../hooks/useClipStyles'
import { useEditorStore } from '../../store'

export default function ClipComponent({
  clip,
  index,
  isSelected,
  isChecked = false,
  isMultiSelected = false,
  enableDragAndDrop = false,
  speakers = [],
  speakerColors,
  onSelect,
  onCheck,
  onWordEdit,
  onSpeakerChange,
  onBatchSpeakerChange,
  onOpenSpeakerManagement,
  onAddSpeaker,
  onRenameSpeaker,
  onStickerDeleteRequest,
}: ClipComponentProps) {
  const [isHovered, setIsHovered] = useState(false)
  const {
    expandedClipId,
    focusedWordId,
    updateClipFullText,
    updateClipFullTextAdvanced,
  } = useEditorStore()
  const isExpanded = expandedClipId === clip.id

  const { dragProps, isDragging } = useClipDragAndDrop(
    clip.id,
    enableDragAndDrop && !isExpanded // Disable drag when expanded
  )
  const { containerClassName, sidebarClassName, contentClassName } =
    useClipStyles({
      isSelected,
      isChecked,
      isMultiSelected,
      isHovered,
      isDragging,
    })

  const handleSidebarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Check if the click was on the checkbox area
    const target = e.target as HTMLElement
    const isCheckboxClick = target.closest('.clip-checkbox') !== null

    if (isCheckboxClick && onCheck) {
      // Handle checkbox toggle
      onCheck(clip.id, !isChecked)
    } else {
      // Handle clip selection (clicking on sidebar but not checkbox)
      onSelect(clip.id)
    }
  }

  return (
    <div
      {...dragProps}
      className={`sortable-clip ${containerClassName}`}
      data-clip-id={clip.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex">
        {/* Left sidebar - extends when expanded */}
        <div
          className={`${sidebarClassName} ${isExpanded ? 'self-stretch' : ''} cursor-pointer`}
          onClick={handleSidebarClick}
        >
          {/* 넘버링 표시 */}
          <div className="flex flex-col items-center pt-1 px-1">
            <span className="text-xs text-gray-600 font-mono font-bold mb-1">
              #{index}
            </span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <ClipCheckbox
                clipId={clip.id}
                isChecked={isChecked}
                onCheck={onCheck}
              />
            </div>
          </div>
          {isExpanded && <div className="flex-1" />}
        </div>

        {/* Right content area */}
        <div className="flex-1 flex flex-col">
          {/* Main content */}
          <div className={contentClassName}>
            {/* Upper section */}
            <div className="p-3">
              <div className="grid grid-cols-[180px_1fr] gap-3 items-start">
                <div className="flex flex-col gap-2 pl-4 py-1 flex-shrink-0">
                  <div className="h-8 flex items-center">
                    <ClipSpeaker
                      clipId={clip.id}
                      speaker={clip.speaker}
                      speakers={speakers}
                      speakerColors={speakerColors}
                      onSpeakerChange={onSpeakerChange}
                      onBatchSpeakerChange={onBatchSpeakerChange}
                      onOpenSpeakerManagement={onOpenSpeakerManagement}
                      onAddSpeaker={onAddSpeaker}
                      onRenameSpeaker={onRenameSpeaker}
                    />
                  </div>
                  <div className="flex items-start">
                    <ClipStickerButton
                      clipId={clip.id}
                      stickers={clip.stickers || []}
                    />
                  </div>
                </div>
                <div className="overflow-visible min-w-0 flex items-start">
                  <ClipWords
                    clipId={clip.id}
                    words={clip.words}
                    stickers={clip.stickers || []}
                    onWordEdit={onWordEdit}
                    onStickerDeleteRequest={onStickerDeleteRequest}
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#383842]" />

            {/* Lower section */}
            <ClipText
              clipId={clip.id}
              fullText={clip.fullText}
              onFullTextEdit={updateClipFullText}
              onFullTextEditAdvanced={updateClipFullTextAdvanced}
            />
          </div>

          {/* Expanded Waveform Editor - positioned beside sidebar */}
          {isExpanded && (
            <ExpandedClipWaveform
              words={clip.words}
              focusedWordId={focusedWordId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Re-export types for convenience
export type { ClipItem, ClipComponentProps } from './types'
