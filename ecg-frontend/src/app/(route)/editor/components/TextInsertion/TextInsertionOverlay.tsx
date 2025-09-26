'use client'

import React, { useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useEditorStore } from '../../store'
import MovableAnimatedText from './MovableAnimatedText'
import { useMotionTextRenderer } from '@/app/shared/motiontext'
import type { InsertedText } from '../../types/textInsertion'

interface TextInsertionOverlayProps {
  videoContainerRef: React.RefObject<HTMLDivElement | null>
  currentTime: number
  onTextClick?: (textId: string) => void
  onTextDoubleClick?: (textId: string) => void
}

export default function TextInsertionOverlay({
  videoContainerRef,
  currentTime,
  onTextClick,
  onTextDoubleClick,
}: TextInsertionOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const motionTextRef = useRef<HTMLDivElement>(null)

  // MotionText renderer hook for unified rendering
  const { containerRef, renderer, initializeRenderer, loadScenario, seek } =
    useMotionTextRenderer({
      autoPlay: false, // We control playback manually
      loop: false,
      onError: (error: Error) => {
        console.error('MotionText unified rendering error:', error)
        // Fallback to individual rendering on error
        if (isScenarioMode) {
          toggleScenarioMode()
        }
      },
    })

  // Get text insertion state from store
  const {
    selectedTextId,
    selectText,
    updateText,
    getActiveTexts,
    currentScenario,
    isScenarioMode,
    initializeScenario,
    toggleScenarioMode,
    // Get clips for unified scenario generation
    clips,
  } = useEditorStore()

  // Get currently active texts (for individual rendering mode)
  const activeTexts = getActiveTexts(currentTime)

  // Initialize scenario on mount with actual clips data
  useEffect(() => {
    if (!currentScenario && clips) {
      console.log('🎬 Initializing unified scenario with clips:', clips.length)
      initializeScenario(clips)
    }
  }, [currentScenario, initializeScenario, clips])

  // Auto-enable scenario mode when scenario is ready (disabled for editing)
  // useEffect(() => {
  //   if (currentScenario && !isScenarioMode) {
  //     toggleScenarioMode()
  //   }
  // }, [currentScenario, isScenarioMode, toggleScenarioMode])

  // Initialize MotionText renderer when container is ready
  useEffect(() => {
    if (motionTextRef.current && !renderer) {
      // Set the containerRef to our motionTextRef
      if (containerRef.current !== motionTextRef.current) {
        containerRef.current = motionTextRef.current
      }
      initializeRenderer()
    }
  }, [renderer, initializeRenderer, containerRef])

  // Update scenario in MotionText renderer
  useEffect(() => {
    if (renderer && currentScenario && isScenarioMode) {
      loadScenario(currentScenario)
    }
  }, [currentScenario, isScenarioMode, loadScenario, renderer])

  // Update current time in MotionText renderer
  useEffect(() => {
    if (renderer && isScenarioMode) {
      seek(currentTime)
    }
  }, [currentTime, isScenarioMode, seek, renderer])

  // Handle video container click (no longer used for text insertion)
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      console.log('🎬 VIDEO CONTAINER CLICKED:', {
        target: e.target,
        currentTarget: e.currentTarget,
        isDirectClick: e.target === e.currentTarget,
        targetTagName: (e.target as HTMLElement).tagName,
        targetClassName: (e.target as HTMLElement).className,
      })

      // Only handle clicks on the container itself, not on child elements
      if (e.target === e.currentTarget) {
        console.log('🔄 Clearing text selection (clicked on empty area)')
        selectText(null)
      } else {
        console.log('👆 Click on child element, ignoring')
      }
    },
    [selectText]
  )

  // Handle text selection - switch to edit mode for interaction
  const handleTextSelect = useCallback(
    (textId: string) => {
      console.log('📝 handleTextSelect called:', {
        textId,
        currentSelectedTextId: selectedTextId,
        currentMode: isScenarioMode ? 'scenario' : 'individual',
      })

      // Switch to individual rendering mode for editing
      if (isScenarioMode) {
        console.log('🔄 Switching to individual mode for text editing')
        toggleScenarioMode()
      }

      selectText(textId)
      onTextClick?.(textId)
    },
    [
      selectText,
      onTextClick,
      selectedTextId,
      isScenarioMode,
      toggleScenarioMode,
    ]
  )

  // Handle text double-click for editing
  const handleTextDoubleClick = useCallback(
    (textId: string) => {
      // Ensure we're in individual mode for editing
      if (isScenarioMode) {
        toggleScenarioMode()
      }
      onTextDoubleClick?.(textId)
    },
    [onTextDoubleClick, isScenarioMode, toggleScenarioMode]
  )

  // Auto-switch to scenario mode when no text is selected (playback mode) - DISABLED FOR EDITING
  // useEffect(() => {
  //   if (!selectedTextId && !isScenarioMode && currentScenario) {
  //     const switchTimer = setTimeout(() => {
  //       console.log('🎬 Auto-switching to scenario mode (no selection)')
  //       toggleScenarioMode()
  //     }, 500) // Small delay to avoid rapid switching
  //
  //     return () => clearTimeout(switchTimer)
  //   }
  // }, [selectedTextId, isScenarioMode, currentScenario, toggleScenarioMode])

  // Handle text updates from MovableAnimatedText
  const handleTextUpdate = useCallback(
    (textId: string, updates: Partial<InsertedText>) => {
      updateText(textId, updates)
    },
    [updateText]
  )

  // Don't render anything if no container
  if (!videoContainerRef.current) {
    return null
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-auto cursor-default"
      onClick={handleContainerClick}
      style={{ zIndex: 20 }}
    >
      {/* Hybrid Rendering System */}
      {isScenarioMode && currentScenario ? (
        // Unified Scenario Rendering (fixes flickering)
        <>
          <div
            ref={motionTextRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 21 }}
          />

          {/* Invisible clickable areas for text selection in scenario mode */}
          {activeTexts.map((text) => (
            <div
              key={`clickable-${text.id}`}
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: `${text.position.x}%`,
                top: `${text.position.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '120px', // Approximate clickable area
                height: '40px',
                zIndex: 22,
                // Debug: border: '1px dashed rgba(255,0,0,0.3)'
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleTextSelect(text.id)
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                handleTextDoubleClick(text.id)
              }}
              title={`Click to edit: ${text.content}`}
            />
          ))}
        </>
      ) : (
        // Individual Text Rendering (for editing mode)
        activeTexts.map((text) => (
          <MovableAnimatedText
            key={text.id}
            text={text}
            isSelected={text.isSelected || false}
            isVisible={true} // activeTexts already filtered by time
            videoContainerRef={videoContainerRef}
            onUpdate={(updates) => handleTextUpdate(text.id, updates)}
            onSelect={() => handleTextSelect(text.id)}
            onDoubleClick={() => handleTextDoubleClick(text.id)}
          />
        ))
      )}

      {/* Mode Toggle Controls */}
      <div className="absolute top-2 right-2 flex gap-2 pointer-events-auto z-30">
        <button
          onClick={() => toggleScenarioMode()}
          className={`px-3 py-1 text-xs rounded ${
            isScenarioMode
              ? 'bg-green-600 text-white'
              : 'bg-purple-600 text-white'
          }`}
          title={
            isScenarioMode ? 'Switch to Edit Mode' : 'Switch to Playback Mode'
          }
        >
          {isScenarioMode ? '🎬 Playback' : '✏️ Edit'}
        </button>
      </div>
    </div>,
    videoContainerRef.current
  )
}
