'use client'

import React, { useState, useCallback } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import ClipComponent, { ClipItem } from './ClipComponent'
import DropIndicator from './DropIndicator'
import { useEditorStore } from '../store'

interface SubtitleEditListProps {
  clips: ClipItem[]
  selectedClipIds: Set<string>
  activeClipId?: string | null
  speakers?: string[]
  speakerColors?: Record<string, string>
  onClipSelect: (clipId: string) => void
  onClipCheck?: (clipId: string, checked: boolean) => void
  onWordEdit: (clipId: string, wordId: string, newText: string) => void
  onSpeakerChange?: (clipId: string, newSpeaker: string) => void
  onBatchSpeakerChange?: (clipIds: string[], newSpeaker: string) => void
  onOpenSpeakerManagement?: () => void
  onAddSpeaker?: (name: string) => void
  onRenameSpeaker?: (oldName: string, newName: string) => void
  onEmptySpaceClick?: () => void
}

export default function SubtitleEditList({
  clips,
  selectedClipIds,
  activeClipId,
  speakers = [],
  speakerColors,
  onClipSelect,
  onClipCheck,
  onWordEdit,
  onSpeakerChange,
  onBatchSpeakerChange,
  onOpenSpeakerManagement,
  onAddSpeaker,
  onRenameSpeaker,
  onEmptySpaceClick,
}: SubtitleEditListProps) {
  const { overId, activeId, deleteText, setClips } = useEditorStore()

  // Sticker deletion modal state
  const [stickerToDelete, setStickerToDelete] = useState<{
    id: string
    text: string
    clipId: string
  } | null>(null)

  // Handle sticker deletion request
  const handleStickerDeleteRequest = useCallback(
    (stickerId: string, stickerText: string) => {
      // Find which clip contains this sticker
      const clipWithSticker = clips.find((clip) =>
        clip.stickers?.some((s) => s.id === stickerId)
      )

      if (clipWithSticker) {
        setStickerToDelete({
          id: stickerId,
          text: stickerText,
          clipId: clipWithSticker.id,
        })
      }
    },
    [clips]
  )

  // Confirm sticker deletion
  const confirmStickerDeletion = useCallback(() => {
    if (!stickerToDelete) return

    // Find the sticker to delete
    const clip = clips.find((c) => c.id === stickerToDelete.clipId)
    const sticker = clip?.stickers?.find((s) => s.id === stickerToDelete.id)

    if (!sticker) return

    // Find corresponding inserted text using originalInsertedTextId
    if (sticker.originalInsertedTextId && deleteText) {
      deleteText(sticker.originalInsertedTextId)
      console.log(`🗑️ Deleted inserted text: ${stickerToDelete.text}`)
    }

    // Remove sticker from clip
    const updatedClips = clips.map((clip) => {
      if (clip.id === stickerToDelete.clipId) {
        return {
          ...clip,
          stickers: (clip.stickers || []).filter(
            (s) => s.id !== stickerToDelete.id
          ),
        }
      }
      return clip
    })

    setClips(updatedClips)
    console.log(`🗑️ Deleted sticker: ${stickerToDelete.text}`)

    // Close dialog
    setStickerToDelete(null)
  }, [stickerToDelete, clips, deleteText, setClips])

  // Cancel sticker deletion
  const cancelStickerDeletion = useCallback(() => {
    setStickerToDelete(null)
  }, [])

  // 빈 공간 클릭 핸들러
  const handleEmptySpaceClick = (e: React.MouseEvent) => {
    // 클릭된 대상이 현재 div(배경)인 경우에만 처리
    if (e.target === e.currentTarget && onEmptySpaceClick) {
      onEmptySpaceClick()
    }
  }

  // 드래그 중인 클립의 현재 인덱스 찾기
  const draggedIndex = clips.findIndex((clip) => clip.id === activeId)
  const overIndex = clips.findIndex((clip) => clip.id === overId)

  return (
    <div
      className="w-[800px] bg-gray-50 p-4 cursor-pointer"
      onClick={handleEmptySpaceClick}
    >
      <SortableContext
        items={clips.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {clips.map((clip, index) => (
            <React.Fragment key={clip.id}>
              {/* 드롭 인디케이터 - 현재 위치 위에 표시 */}
              <DropIndicator
                isActive={
                  activeId !== null &&
                  overId === clip.id &&
                  draggedIndex !== -1 &&
                  overIndex !== -1 &&
                  draggedIndex > overIndex
                }
              />

              <ClipComponent
                clip={clip}
                index={index + 1} // 인덱스는 1부터 시작
                isSelected={activeClipId === clip.id} // 포커스 상태
                isChecked={selectedClipIds.has(clip.id)} // 체크박스 상태 (분리됨)
                isMultiSelected={selectedClipIds.has(clip.id)}
                enableDragAndDrop={true} // 모든 클립 드래그 가능
                speakers={speakers}
                speakerColors={speakerColors}
                onSelect={onClipSelect}
                onCheck={onClipCheck}
                onWordEdit={onWordEdit}
                onSpeakerChange={onSpeakerChange}
                onBatchSpeakerChange={onBatchSpeakerChange}
                onOpenSpeakerManagement={onOpenSpeakerManagement}
                onAddSpeaker={onAddSpeaker}
                onRenameSpeaker={onRenameSpeaker}
                onStickerDeleteRequest={handleStickerDeleteRequest}
              />

              {/* 드롭 인디케이터 - 현재 위치 아래에 표시 */}
              <DropIndicator
                isActive={
                  activeId !== null &&
                  overId === clip.id &&
                  draggedIndex !== -1 &&
                  overIndex !== -1 &&
                  draggedIndex < overIndex
                }
              />
            </React.Fragment>
          ))}
        </div>
      </SortableContext>

      {/* Sticker Deletion Confirmation Modal */}
      {stickerToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-gray-200 rounded-lg p-6 max-w-md mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-500 mb-3">
              삽입 텍스트 삭제
            </h3>
            <p className="text-gray-500 mb-4">
              &ldquo;
              <span className="font-medium text-purple-700">
                {stickerToDelete.text}
              </span>
              &rdquo; 를 삭제하시겠습니까?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelStickerDeletion}
                className="px-4 py-2 text-gray-600 hover:text-white font-medium bg-gray-200 hover:bg-gray-600 rounded transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={confirmStickerDeletion}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700 font-medium transition-colors cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
