'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Dropdown from '../ui/Dropdown'

interface ClipItem {
  id: string
  timeline: string
  speaker: string
  subtitle: string
  fullText: string
  duration: string
  thumbnail: string
  words: Array<{
    id: string
    text: string
    start: number
    end: number
    isEditable: boolean
    confidence?: number
  }>
}

interface SortableClipComponentProps {
  clip: ClipItem
  isSelected: boolean
  isMultiSelected: boolean
  onSelect: (clipId: string, multiSelect: boolean) => void
  onWordEdit: (clipId: string, wordId: string, newText: string) => void
  isDragging?: boolean
}

const SortableClipComponent: React.FC<SortableClipComponentProps> = ({
  clip,
  isSelected,
  isMultiSelected,
  onSelect,
  onWordEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: clip.id,
    data: {
      clip,
      isMultiSelected,
    },
    animateLayoutChanges: () => false, // Disable automatic animations
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSortableDragging ? 'none' : transition,
    opacity: isSortableDragging ? 0.3 : 1,
  }

  const handleClick = (e: React.MouseEvent) => {
    // Check if Ctrl/Cmd is pressed for multi-select
    const multiSelect = e.ctrlKey || e.metaKey
    onSelect(clip.id, multiSelect)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-clip-id={clip.id}
      className={`sortable-clip bg-gray-200 rounded-lg cursor-move ${
        isMultiSelected
          ? 'ring-2 ring-blue-500 bg-blue-100'
          : isSelected
            ? 'ring-2 ring-blue-400'
            : 'hover:bg-gray-300'
      } ${!isSortableDragging ? 'transition-colors' : ''}`}
      onClick={handleClick}
    >
      <div className="flex">
        {/* Left side: Timeline - spans full height */}
        <div className="w-16 flex flex-col bg-gray-300 rounded-l-lg border-r border-gray-400">
          <div className="flex-1 flex items-center justify-center py-3">
            <span className="text-xs text-gray-600 font-mono">
              {clip.timeline}
            </span>
          </div>
        </div>

        {/* Right side content */}
        <div className="flex-1 flex flex-col">
          {/* Upper section: Speaker and Word buttons */}
          <div className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center flex-1 pl-4">
                <Dropdown
                  value={clip.speaker}
                  options={[
                    { value: 'Speaker 1', label: 'Speaker 1' },
                    { value: 'Speaker 2', label: 'Speaker 2' },
                    { value: 'Speaker 3', label: 'Speaker 3' },
                  ]}
                  size="small"
                  className="text-sm flex-shrink-0"
                />

                {/* 50px gap before word buttons */}
                <div className="w-12"></div>

                {/* Word buttons */}
                <div className="flex flex-wrap gap-1">
                  {clip.words.map((word) => (
                    <button
                      key={word.id}
                      className="bg-white border border-gray-300 hover:border-gray-400 rounded px-2 py-1 text-sm text-gray-800 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onWordEdit(clip.id, word.id, word.text)
                      }}
                    >
                      {word.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-1 flex-shrink-0">
                <button className="w-6 h-6 bg-gray-400 hover:bg-gray-500 rounded flex items-center justify-center text-xs text-white transition-colors cursor-pointer">
                  ▶
                </button>
                <button className="w-6 h-6 bg-gray-400 hover:bg-gray-500 rounded flex items-center justify-center text-xs text-white transition-colors cursor-pointer">
                  ⏸
                </button>
                <button className="w-6 h-6 bg-gray-400 hover:bg-gray-500 rounded flex items-center justify-center text-xs text-white transition-colors cursor-pointer">
                  ⏹
                </button>
              </div>
            </div>
          </div>

          {/* Divider line - only in right section */}
          <div className="border-t border-gray-400"></div>

          {/* Lower section: Full text display */}
          <div className="p-3">
            <div className="text-sm text-gray-800 text-center">
              {clip.fullText}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SortableClipComponent
