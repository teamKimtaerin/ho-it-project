'use client'

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import Moveable, { OnDrag, OnResize, OnRotate } from 'react-moveable'
import { useMotionTextRenderer } from '@/app/shared/motiontext'
import type { RendererConfigV2 } from '@/app/shared/motiontext'
import {
  generateLoopedScenarioV2,
  loadPluginManifest,
  getDefaultParameters,
  validateAndNormalizeParams,
  type PluginManifest,
  type PreviewSettings,
} from '@/app/shared/motiontext'
import type { InsertedText } from '../../types/textInsertion'

interface MovableAnimatedTextProps {
  text: InsertedText
  isSelected: boolean
  isVisible: boolean
  videoContainerRef: React.RefObject<HTMLDivElement | null>
  onUpdate: (updates: Partial<InsertedText>) => void
  onSelect: () => void
  onDoubleClick: () => void
}

export interface MovableAnimatedTextRef {
  updateAnimation: (animationConfig: RendererConfigV2) => void
}

const MovableAnimatedText = forwardRef<
  MovableAnimatedTextRef,
  MovableAnimatedTextProps
>(
  (
    { text, isSelected, isVisible, videoContainerRef, onUpdate, onSelect },
    ref
  ) => {
    const textRef = useRef<HTMLDivElement>(null)

    const [isDragging, setIsDragging] = useState(false)
    const [isInteracting, setIsInteracting] = useState(false)
    const [showSimpleText, setShowSimpleText] = useState(false)
    const [, setCurrentConfig] = useState<RendererConfigV2 | null>(null)
    const [manifest, setManifest] = useState<PluginManifest | null>(null)
    const [position, setPosition] = useState<{ x: number; y: number } | null>(
      null
    )
    const [size, setSize] = useState({ width: 240, height: 80 })
    const [rotationDeg, setRotationDeg] = useState(0)

    // Stage size management (640x360 base)
    const stageSizeRef = useRef<{ width: number; height: number }>({
      width: 640,
      height: 360,
    })
    const updateTimerRef = useRef<number | null>(null)
    const firstLoadDoneRef = useRef(false)

    // Use motion text renderer hook
    const {
      containerRef: motionContainerRef,
      loadScenario,
      play,
      pause,
    } = useMotionTextRenderer({
      autoPlay: true,
      loop: true,
    })

    /**
     * Load plugin manifest
     */
    useEffect(() => {
      const loadManifest = async () => {
        if (!text.animation?.plugin) return

        try {
          const pluginName = text.animation.plugin
          const serverBase = (
            process.env.NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN ||
            'http://localhost:3300'
          ).replace(/\/$/, '')
          const loadedManifest = await loadPluginManifest(pluginName, {
            mode: 'server',
            serverBase,
          })
          setManifest(loadedManifest)
        } catch (error) {
          console.error('Failed to load manifest:', error)
        }
      }

      loadManifest()
    }, [text.animation?.plugin])

    /**
     * Update scenario with proper coordinate normalization
     */
    const updateScenario = useCallback(async () => {
      if (!manifest || isDragging || !position) return

      try {
        const STAGE_W = stageSizeRef.current.width
        const STAGE_H = stageSizeRef.current.height

        // Calculate proportional font size based on box dimensions
        const avgDimension = (size.width + size.height) / 2
        const fontSizeRel = Math.max(
          0.03,
          Math.min(0.15, (avgDimension / STAGE_W) * 0.15)
        )

        const validatedParams = text.animation?.parameters
          ? validateAndNormalizeParams(text.animation.parameters, manifest)
          : getDefaultParameters(manifest)

        // Use top-left position directly (same as Moveable target positioning)
        const settings: PreviewSettings = {
          text: text.content,
          position: { x: position.x, y: position.y },
          size,
          pluginParams: validatedParams,
          rotationDeg,
          fontSizeRel,
        }

        // Convert current stage space to generator's 512x384 base for normalization
        const baseW = 512
        const baseH = 384
        const scaleX = baseW / STAGE_W
        const scaleY = baseH / STAGE_H
        const settingsForGenerator = {
          ...settings,
          position: {
            x: settings.position.x * scaleX,
            y: settings.position.y * scaleY,
          },
          size: {
            width: settings.size.width * scaleX,
            height: settings.size.height * scaleY,
          },
        }

        const scenario = generateLoopedScenarioV2(
          manifest.name,
          settingsForGenerator as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          Math.max(1, text.endTime - text.startTime)
        ) as any // eslint-disable-line @typescript-eslint/no-explicit-any

        setCurrentConfig(scenario as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await loadScenario(scenario as any, {
          silent: firstLoadDoneRef.current,
        })

        // Auto-play on first load
        if (!firstLoadDoneRef.current && !isSelected) {
          play()
        }
        firstLoadDoneRef.current = true
      } catch (error) {
        console.error('Failed to update scenario:', error)
      }
    }, [
      manifest,
      text,
      position,
      size,
      rotationDeg,
      isDragging,
      loadScenario,
      play,
      isSelected,
    ])

    /**
     * Debounced scenario update (except during drag)
     */
    useEffect(() => {
      if (isDragging) return

      if (updateTimerRef.current) {
        window.clearTimeout(updateTimerRef.current)
        updateTimerRef.current = null
      }

      const delay = 50
      updateTimerRef.current = window.setTimeout(() => {
        void updateScenario()
      }, delay)

      return () => {
        if (updateTimerRef.current) {
          window.clearTimeout(updateTimerRef.current)
          updateTimerRef.current = null
        }
      }
    }, [manifest, position, size, rotationDeg, isDragging, updateScenario])

    /**
     * Text content change (separate debounce)
     */
    useEffect(() => {
      if (isDragging) return

      const textUpdateTimerRef = window.setTimeout(() => {
        void updateScenario()
      }, 200)

      return () => {
        window.clearTimeout(textUpdateTimerRef)
      }
    }, [text.content, isDragging, updateScenario])

    // Update animation config (exposed API)
    const updateAnimation = useCallback(
      (animationConfig: RendererConfigV2) => {
        setCurrentConfig(animationConfig as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        loadScenario(animationConfig as any, { silent: true }) // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      [loadScenario]
    )

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        updateAnimation,
      }),
      [updateAnimation]
    )

    /**
     * Moveable drag handler with precise coordinate calculation
     */
    const handleDrag = useCallback(
      (e: OnDrag) => {
        const stageW = stageSizeRef.current.width
        const stageH = stageSizeRef.current.height
        const newX = Math.max(0, Math.min(stageW - size.width, e.left))
        const newY = Math.max(0, Math.min(stageH - size.height, e.top))

        setPosition({ x: newX, y: newY })
      },
      [size]
    )

    /**
     * Moveable resize handler
     */
    const handleResize = useCallback((e: OnResize) => {
      const stageW = stageSizeRef.current.width
      const stageH = stageSizeRef.current.height
      const newWidth = Math.max(100, Math.min(stageW, e.width))
      const newHeight = Math.max(60, Math.min(stageH, e.height))

      const newLeft = Math.max(0, Math.min(stageW - newWidth, e.drag.left))
      const newTop = Math.max(0, Math.min(stageH - newHeight, e.drag.top))

      setSize({ width: newWidth, height: newHeight })
      setPosition({ x: newLeft, y: newTop })

      // DOM immediate reflection
      e.target.style.width = `${newWidth}px`
      e.target.style.height = `${newHeight}px`
    }, [])

    /**
     * Moveable rotate handler
     */
    const handleRotate = useCallback((e: OnRotate) => {
      setRotationDeg(e.rotate)
    }, [])

    /**
     * Moveable interaction start
     */
    const handleMoveableStart = useCallback(() => {
      setIsInteracting(true)
      setIsDragging(true)
      setShowSimpleText(true) // Show simple text during drag for performance
      pause() // Pause animation during interaction
    }, [pause])

    /**
     * Moveable interaction end - update scenario and sync with store
     */
    const handleMoveableEnd = useCallback(() => {
      setIsInteracting(false)
      setIsDragging(false)
      setShowSimpleText(false)

      // Convert top-left position back to percentage for store update (using center point for consistency)
      if (videoContainerRef.current && position) {
        const container = videoContainerRef.current
        const rect = container.getBoundingClientRect()
        const centerX = position.x + size.width / 2
        const centerY = position.y + size.height / 2
        const percentX = (centerX / rect.width) * 100
        const percentY = (centerY / rect.height) * 100

        onUpdate({
          position: {
            x: Math.max(0, Math.min(100, percentX)),
            y: Math.max(0, Math.min(100, percentY)),
          },
        })
      }

      // Update scenario after drag ends and resume animation
      void updateScenario()
      play()
    }, [position, size, videoContainerRef, onUpdate, updateScenario, play])

    /**
     * Initialize position - simple center-based calculation
     */
    useEffect(() => {
      if (!videoContainerRef.current) return

      const container = videoContainerRef.current
      const rect = container.getBoundingClientRect()

      // Simple center-based position calculation
      const centerX = (text.position.x / 100) * rect.width
      const centerY = (text.position.y / 100) * rect.height
      const topLeftX = centerX - size.width / 2
      const topLeftY = centerY - size.height / 2

      setPosition({ x: topLeftX, y: topLeftY })
      stageSizeRef.current = { width: rect.width, height: rect.height }

      // Simple ResizeObserver for container changes
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0]
        const cr = entry.contentRect
        const newW = Math.max(1, cr.width)
        const newH = Math.max(1, cr.height)

        const prev = stageSizeRef.current
        if (prev.width !== newW || prev.height !== newH) {
          const scaleX = newW / prev.width
          const scaleY = newH / prev.height

          stageSizeRef.current = { width: newW, height: newH }
          setPosition((p) => (p ? { x: p.x * scaleX, y: p.y * scaleY } : null))
          setSize((s) => ({
            width: s.width * scaleX,
            height: s.height * scaleY,
          }))
        }
      })

      ro.observe(container)
      return () => ro.disconnect()
    }, [text.position, videoContainerRef, size.width, size.height])

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        console.log('🎯 TEXT BOX CLICKED:', {
          textId: text.id,
          textContent: text.content,
          isSelected,
          isDragging,
          target: e.target,
          currentTarget: e.currentTarget,
        })

        e.preventDefault()
        e.stopPropagation()

        // Pause virtual timeline when text is clicked
        const virtualPlayerController = (
          window as {
            virtualPlayerController?: {
              pause?: () => void
            }
          }
        ).virtualPlayerController

        if (virtualPlayerController) {
          console.log('⏸️ Pausing virtual timeline for text selection')
          virtualPlayerController.pause?.()
        } else {
          // Fallback to regular video player if virtual timeline not available
          const videoPlayer = (
            window as { videoPlayer?: { pause: () => void } }
          ).videoPlayer
          if (videoPlayer) {
            videoPlayer.pause()
          }
        }

        console.log('✅ Selecting text:', text.content)
        onSelect()
      },
      [isSelected, isDragging, onSelect, text.id, text.content]
    )

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // Disable double click functionality
    }, [])

    // Force Moveable to update when selection changes
    useEffect(() => {
      if (isSelected && textRef.current) {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          // Force rerender by triggering a state update
          setSize((prev) => ({ ...prev }))
        }, 10)
        return () => clearTimeout(timer)
      }
    }, [isSelected])

    if (!isVisible || !position) {
      return null
    }

    return (
      <>
        {/* Motion Text Renderer container - hidden during drag */}
        <div
          ref={motionContainerRef}
          className="absolute pointer-events-none"
          style={{
            visibility: isDragging || !manifest ? 'hidden' : 'visible',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
          }}
        />

        {/* Simple text - always visible for clicking, hidden only when MotionText is active */}
        {(showSimpleText || isDragging || !manifest) && (
          <div
            className="absolute flex items-center justify-center text-white font-sans cursor-pointer"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${size.width}px`,
              height: `${size.height}px`,
              fontSize: `${(() => {
                const avg = (size.width + size.height) / 2
                const fontSizeRel = Math.max(
                  0.03,
                  Math.min(0.15, (avg / stageSizeRef.current.width) * 0.15)
                )
                return fontSizeRel * stageSizeRef.current.height
              })()}px`,
              transform: `rotate(${rotationDeg}deg)`,
              transformOrigin: 'center center',
              pointerEvents: 'auto', // Always allow clicks
              zIndex: 10,
              willChange: 'transform',
              textAlign: 'center',
              color: text.style.color,
              fontFamily: text.style.fontFamily,
              fontWeight: text.style.fontWeight,
            }}
          >
            {text.content}
          </div>
        )}

        {/* Invisible moveable target - positioned exactly like MotionText */}
        <div
          ref={textRef}
          className="absolute pointer-events-auto"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            transform: `rotate(${rotationDeg}deg)`,
            transformOrigin: 'center center',
            backgroundColor: isSelected
              ? 'rgba(59, 130, 246, 0.1)'
              : 'transparent',
            border: isSelected
              ? isDragging
                ? '2px dashed rgba(59, 130, 246, 0.8)'
                : '1px solid rgba(59, 130, 246, 0.5)'
              : 'none',
            zIndex: 30,
            // Always visible for clicking, but only show visual feedback when selected
          }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {/* Position indicator during interaction */}
          {isInteracting && (
            <div className="absolute -top-6 left-0 text-xs text-blue-400 bg-gray-900/90 px-2 py-1 rounded whitespace-nowrap">
              {Math.round(position.x)}, {Math.round(position.y)} •{' '}
              {Math.round(size.width)}×{Math.round(size.height)} •{' '}
              {Math.round(rotationDeg)}°
            </div>
          )}
        </div>

        {/* React Moveable component - perfectly aligned with MotionText */}
        {isSelected && textRef.current && (
          <Moveable
            target={textRef.current}
            container={videoContainerRef.current}
            draggable={true}
            resizable={true}
            rotatable={true}
            throttleDrag={0}
            throttleResize={0}
            throttleRotate={0}
            origin={false}
            edge={false}
            renderDirections={['nw', 'ne', 'sw', 'se']}
            rotationPosition={'top'}
            bounds={{
              left: 0,
              top: 0,
              right: stageSizeRef.current.width,
              bottom: stageSizeRef.current.height,
            }}
            onDragStart={handleMoveableStart}
            onDrag={handleDrag}
            onDragEnd={handleMoveableEnd}
            onResizeStart={handleMoveableStart}
            onResize={handleResize}
            onResizeEnd={handleMoveableEnd}
            onRotateStart={handleMoveableStart}
            onRotate={handleRotate}
            onRotateEnd={handleMoveableEnd}
            className="moveable-control"
          />
        )}

        {/* Moveable control styles */}
        <style jsx global>{`
          .moveable-control .moveable-line {
            background: #3b82f6 !important;
          }
          .moveable-control .moveable-control {
            background: #3b82f6 !important;
            border: 2px solid #ffffff !important;
          }
          .moveable-control .moveable-rotation {
            background: #10b981 !important;
            border: 2px solid #ffffff !important;
          }
          .moveable-control .moveable-direction {
            background: #3b82f6 !important;
            border: 2px solid #ffffff !important;
          }
        `}</style>
      </>
    )
  }
)

MovableAnimatedText.displayName = 'MovableAnimatedText'

export default MovableAnimatedText
