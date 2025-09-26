import React, { useRef, useCallback, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Word } from '../../types'
import { useEditorStore } from '../../store'

interface ClipWordProps {
  word: Word
  clipId: string
  onWordClick: (wordId: string, isCenter: boolean) => void
  onWordEdit: (clipId: string, wordId: string, newText: string) => void
  isStickerDropTarget?: boolean
  isStickerHovered?: boolean
}

export default function ClipWord({
  word,
  clipId,
  onWordClick,
  onWordEdit,
  isStickerDropTarget = false,
  isStickerHovered = false,
}: ClipWordProps) {
  const wordRef = useRef<HTMLDivElement>(null)
  const editableRef = useRef<HTMLSpanElement>(null)
  const lastClickTimeRef = useRef(0)
  const clickCountRef = useRef(0)
  const clickResetTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [editingText, setEditingText] = useState(word.text)
  const [isComposing, setIsComposing] = useState(false)

  const {
    focusedWordId,
    focusedClipId,
    groupedWordIds,
    draggedWordId,
    dropTargetWordId,
    dropPosition,
    canDragWord,
    editingWordId,
    editingClipId,
    startInlineEdit,
    endInlineEdit,
    multiSelectedWordIds,
    selectWordRange,
    toggleMultiSelectWord,
    clearMultiSelection,
    setLastSelectedWord,
    playingWordId,
    playingClipId,
    setSelectedWordId,
  } = useEditorStore()

  const isFocused = focusedWordId === word.id && focusedClipId === clipId
  const isInGroup = groupedWordIds.has(word.id)
  const isMultiSelected = multiSelectedWordIds.has(word.id)
  const isDraggable = canDragWord(word.id)
  const isBeingDragged = draggedWordId === word.id
  const isDropTarget = dropTargetWordId === word.id
  const isEditing = editingWordId === word.id && editingClipId === clipId
  const isPlaying = playingWordId === word.id
  const isInPlayingClip = playingClipId === clipId
  const isOtherClipPlaying = playingClipId !== null && playingClipId !== clipId

  // Setup drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `${clipId}-${word.id}`,
    disabled: !isDraggable,
    data: {
      type: 'word',
      wordId: word.id,
      clipId: clipId,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    position: 'relative' as const,
  }

  // Handle click with double-click detection and multi-selection
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()

      if (isEditing) return // Ignore clicks while editing

      const currentTime = Date.now()
      const timeDiff = currentTime - lastClickTimeRef.current

      // Check for modifier keys
      const isShiftClick = e.shiftKey
      const isCtrlOrCmdClick = e.ctrlKey || e.metaKey

      // Track clicks for double-click detection
      if (timeDiff < 500) {
        clickCountRef.current++
      } else {
        clickCountRef.current = 1
      }

      // Clear any existing timeout
      if (clickResetTimeoutRef.current) {
        clearTimeout(clickResetTimeoutRef.current)
        clickResetTimeoutRef.current = null
      }

      if (clickCountRef.current >= 2 && !isShiftClick && !isCtrlOrCmdClick) {
        // Double-click detected -> enter inline text edit immediately
        startInlineEdit(clipId, word.id)
        setEditingText(word.text)
        clickCountRef.current = 0 // Reset counter after entering edit mode
        lastClickTimeRef.current = currentTime
        return // Prevent single-click logic from running
      } else if (isShiftClick) {
        // Shift+click for range selection
        setSelectedWordId(null) // Clear single selection when entering multi-select mode
        selectWordRange(clipId, word.id)
      } else if (isCtrlOrCmdClick) {
        // Ctrl/Cmd+click for toggle selection
        setSelectedWordId(null) // Clear single selection when entering multi-select mode
        toggleMultiSelectWord(clipId, word.id)
      } else {
        // Single click - handle selection
        if (!wordRef.current) return
        const rect = wordRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const width = rect.width
        const centerThreshold = width * 0.3
        const isCenter = x > centerThreshold && x < width - centerThreshold

        // Clear multi-selection on normal click
        clearMultiSelection()
        // Set as last selected for future range selection
        setLastSelectedWord(clipId, word.id)
        // Sync selectedWordId for AnimationAssetSidebar
        setSelectedWordId(word.id)

        // Seek video player to word start time
        const videoPlayer = (
          window as {
            videoPlayer?: {
              seekTo: (time: number) => void
              pauseAutoWordSelection?: () => void
            }
          }
        ).videoPlayer
        if (videoPlayer) {
          videoPlayer.seekTo(word.start)
          // Pause auto word selection for a few seconds when user manually selects a word
          if (videoPlayer.pauseAutoWordSelection) {
            videoPlayer.pauseAutoWordSelection()
          }
        }

        // Single click just focuses the word, double-click will edit
        onWordClick(word.id, isCenter)
      }

      // Set timeout to reset click counter if no second click comes
      clickResetTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0
      }, 500)

      lastClickTimeRef.current = currentTime
    },
    [
      word.id,
      word.text,
      word.start,
      isEditing,
      clipId,
      onWordClick,
      startInlineEdit,
      selectWordRange,
      toggleMultiSelectWord,
      clearMultiSelection,
      setLastSelectedWord,
      setSelectedWordId,
    ]
  )

  // Handle inline editing
  const handleInlineEditSave = useCallback(() => {
    // Don't trim if the user intentionally wants a space
    const textToSave = editingText === ' ' ? ' ' : editingText.trim()
    // Allow saving even if it's empty or just a space, as long as it's different
    if (textToSave !== word.text) {
      // Ensure at least a space if completely empty (to maintain word structure)
      const finalText = textToSave || ' '
      onWordEdit(clipId, word.id, finalText)

      // Update scenario to reflect the text change
      try {
        const store = useEditorStore.getState() as any
        store.updateWordTextInScenario?.(word.id, finalText)
      } catch (error) {
        console.error('Failed to update scenario:', error)
      }
    }
    endInlineEdit()
  }, [editingText, word.text, clipId, word.id, onWordEdit, endInlineEdit])

  const handleInlineEditCancel = useCallback(() => {
    setEditingText(word.text)
    endInlineEdit()
  }, [word.text, endInlineEdit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Stop propagation to prevent video player from handling arrow keys
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        e.stopPropagation()
      }

      if (e.key === 'Escape') {
        handleInlineEditCancel()
      } else if (e.key === 'Enter' && !isComposing) {
        e.preventDefault()
        handleInlineEditSave()
      }
    },
    [handleInlineEditCancel, handleInlineEditSave, isComposing]
  )

  // Focus and set initial text when entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      // Set the initial text content
      editableRef.current.textContent = editingText
      editableRef.current.focus()

      // Move cursor to end after setting text
      const range = document.createRange()
      const sel = window.getSelection()
      if (editableRef.current.firstChild) {
        range.setStartAfter(
          editableRef.current.lastChild || editableRef.current.firstChild
        )
        range.collapse(true)
      } else {
        range.selectNodeContents(editableRef.current)
        range.collapse(false)
      }
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isEditing]) // Don't include editingText to avoid re-running on every keystroke

  // Determine visual state classes
  const getWordClasses = () => {
    const classes = [
      'relative',
      'inline-block',
      'px-2',
      'py-1',
      'text-sm',
      'rounded',
      'transition-all',
      'duration-200',
    ]

    if (!isEditing) {
      classes.push('cursor-pointer', 'select-none')
    }

    if (isEditing) {
      classes.push('bg-yel', 'text-black')
    } else if (isPlaying) {
      // Currently playing word - highlighted with animated gradient
      classes.push(
        'bg-gradient-to-r',
        'from-blue-400',
        'via-blue-500',
        'to-blue-600',
        'text-white',
        'shadow-md',
        'ring-2',
        'ring-purple-300',
        'ring-opacity-50',
        'transform',
        'scale-105',
        'transition-all',
        'duration-300',
        'animate-pulse'
      )
    } else if (isFocused) {
      classes.push('bg-black', 'text-white')
    } else if (isMultiSelected) {
      classes.push('bg-blue-600', 'text-white')
    } else if (isInGroup) {
      classes.push('bg-black', 'text-white')
    } else {
      classes.push(
        'bg-white',
        'border',
        'border-gray-500',
        'hover:border-black',
        'hover:bg-gray-500',
        'text-black',
        'font-bold'
      )

      // Dim words when other clips are playing
      if (isOtherClipPlaying) {
        classes.push('opacity-40')
      } else if (isInPlayingClip && !isPlaying) {
        // Slightly dim non-playing words in the same clip
        classes.push('opacity-70')
      }
    }

    if (isBeingDragged && !isEditing) {
      classes.push('opacity-50', 'cursor-grabbing')
    } else if (isDraggable && !isEditing) {
      classes.push('cursor-grab')
    }

    // Drop zone visual feedback for sticker attachment
    if (isStickerDropTarget && !isEditing) {
      classes.push('transition-all', 'duration-200')
      if (isStickerHovered) {
        classes.push(
          'ring-2',
          'ring-purple-400',
          'ring-opacity-60',
          'bg-purple-50',
          'border-purple-300',
          'shadow-md',
          'scale-105'
        )
      } else {
        classes.push(
          'ring-1',
          'ring-purple-200',
          'ring-opacity-40',
          'bg-purple-25'
        )
      }
    }

    return classes.join(' ')
  }

  // Drag handlers that work with focus state (disabled during editing)
  const dragListeners =
    isDraggable && !isEditing
      ? {
          ...listeners,
          onMouseDown: (e: React.MouseEvent) => {
            // Allow drag only if word is focused/grouped and not editing
            if (isDraggable && listeners?.onMouseDown) {
              listeners.onMouseDown(e as React.MouseEvent<HTMLElement>)
            }
          },
        }
      : {}

  return (
    <div
      ref={(node) => {
        wordRef.current = node
        if (!isEditing) setNodeRef(node) // Only set drag ref when not editing
      }}
      className={getWordClasses()}
      style={!isEditing ? style : undefined}
      onClick={handleClick}
      data-word-id={word.id}
      data-clip-id={clipId}
      title={
        !isEditing
          ? `${word.text} (${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s)`
          : undefined
      }
      {...(!isEditing ? attributes : {})}
      {...(!isEditing ? dragListeners : {})}
    >
      {/* Drop indicator before word */}
      {isDropTarget && dropPosition === 'before' && !isEditing && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-500 -translate-x-1 animate-pulse" />
      )}

      {isEditing ? (
        <span
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          className="outline-none min-w-[20px] inline-block"
          onInput={(e) => {
            // Use textContent instead of innerHTML to preserve cursor position
            const text = e.currentTarget.textContent || ''
            setEditingText(text)
          }}
          onBlur={() => {
            if (!isComposing) {
              handleInlineEditSave()
            }
          }}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => {
            setIsComposing(false)
          }}
          style={{ minWidth: '1ch' }}
        />
      ) : (
        <span className="flex items-center gap-1">{word.text}</span>
      )}

      {/* Drop indicator after word */}
      {isDropTarget && dropPosition === 'after' && !isEditing && (
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-purple-500 translate-x-1 animate-pulse" />
      )}
    </div>
  )
}
