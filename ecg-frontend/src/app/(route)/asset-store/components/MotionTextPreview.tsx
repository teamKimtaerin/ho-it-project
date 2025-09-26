/**
 * Motion Text Renderer 미리보기 컴포넌트 (with react-moveable)
 * 검정 배경 비디오 위에 애니메이션 자막을 렌더링하여 무한 루프 재생
 */

'use client'

import { type BaseComponentProps } from '@/lib/utils'
import { clsx } from 'clsx'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Moveable, { OnDrag, OnResize, OnRotate } from 'react-moveable'
import { useMotionTextRenderer } from '../hooks/useMotionTextRenderer'
import {
  generateLoopedScenarioV2,
  getDefaultParameters,
  loadPluginManifest,
  validateAndNormalizeParams,
  type PluginManifest,
  type PreviewSettings,
} from '../utils/scenarioGenerator'

interface MotionTextPreviewProps extends BaseComponentProps {
  manifestFile: string
  pluginKey?: string // Full plugin key like "typewriter@2.0.0"
  text?: string
  onParameterChange?: (params: Record<string, unknown>) => void
  onManifestLoad?: (manifest: PluginManifest) => void
  onError?: (error: string) => void
  onTextChange?: (newText: string) => void
}

export const MotionTextPreview = React.forwardRef<
  { updateParameters: (params: Record<string, unknown>) => void },
  MotionTextPreviewProps
>(
  (
    {
      manifestFile,
      pluginKey,
      text = 'SAMPLE TEXT',
      onParameterChange,
      onManifestLoad,
      onError,
      onTextChange,
      className,
    },
    ref
  ) => {
    // State
    const [manifest, setManifest] = useState<PluginManifest | null>(null)
    const [extractedPluginKey, setExtractedPluginKey] = useState<string | null>(
      null
    )
    const [parameters, setParameters] = useState<Record<string, unknown>>({})
    const [position, setPosition] = useState({ x: 136, y: 152 }) // 초기값은 512x384 기준 중앙 (계산 후 조정됨)
    const [size, setSize] = useState({ width: 240, height: 80 })
    const [showControls, setShowControls] = useState(false)
    const [rotationDeg, setRotationDeg] = useState(0)
    const [isInteracting, setIsInteracting] = useState(false)
    const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [moveableTarget, setMoveableTarget] = useState<HTMLElement | null>(
      null
    )
    const [isDragging, setIsDragging] = useState(false) // Flag to prevent updates during interaction
    const [showSimpleText, setShowSimpleText] = useState(false) // Show simple text during drag for performance
    const [isEditingText, setIsEditingText] = useState(false) // Text editing mode
    const [editingText, setEditingText] = useState(text) // Temporary text during editing

    // Refs
    const stageRef = useRef<HTMLDivElement>(null)
    const stageSizeRef = useRef<{ width: number; height: number }>({
      width: 512,
      height: 384,
    })
    const textBoxRef = useRef<HTMLDivElement>(null)
    const firstLoadDoneRef = useRef(false)
    const updateTimerRef = useRef<number | null>(null)
    const hasScaledFromInitialRef = useRef(false)
    const editInputRef = useRef<HTMLInputElement>(null)

    // Stable error handler to avoid re-creating callbacks each render
    const onRendererError = useCallback(
      (err: Error) => {
        console.error('Motion Text Renderer Error:', err)
        onError?.(err.message)
      },
      [onError]
    )

    // Motion Text Renderer Hook
    const {
      containerRef,
      videoRef,
      isLoading,
      // isPlaying,
      error,
      status,
      loadScenario,
      initializeRenderer,
      play,
      pause,
    } = useMotionTextRenderer({
      autoPlay: true,
      loop: true,
      onError: onRendererError,
    })

    /**
     * 플러그인 manifest 로드
     */
    useEffect(() => {
      const loadManifest = async () => {
        try {
          // Use provided pluginKey or extract from manifestFile path
          const pluginName =
            pluginKey || manifestFile.split('/').slice(-2, -1)[0] // '/plugin/rotation@1.0.0/manifest.json' -> 'rotation@1.0.0'
          setExtractedPluginKey(pluginName)

          const serverBase = (
            process.env.NEXT_PUBLIC_MOTIONTEXT_PLUGIN_ORIGIN ||
            'http://localhost:80'
          ).replace(/\/$/, '')
          const loadedManifest = await loadPluginManifest(pluginName, {
            mode: 'server',
            serverBase,
          })
          setManifest(loadedManifest)

          // 상위 컴포넌트에 manifest 전달
          if (onManifestLoad) {
            onManifestLoad(loadedManifest)
          }

          // 기본 파라미터 설정
          const defaultParams = getDefaultParameters(loadedManifest)
          setParameters(defaultParams)

          if (onParameterChange) {
            onParameterChange(defaultParams)
          }

          // Plugin loading is handled by motiontext-renderer
        } catch (error) {
          console.error('Failed to load manifest:', error)
          if (onError) {
            onError('플러그인 설정을 불러올 수 없습니다')
          }
        }
      }

      if (manifestFile) {
        loadManifest()
      }
    }, [manifestFile, pluginKey, onError, onParameterChange, onManifestLoad])

    /**
     * 렌더러 초기화
     */
    useEffect(() => {
      if (containerRef.current && videoRef.current) {
        initializeRenderer()
      }
    }, [containerRef, videoRef, initializeRenderer]) // Include required dependencies

    /**
     * 시나리오 업데이트 및 로드
     */
    const updateScenario = useCallback(async () => {
      if (!manifest) return

      try {
        console.log(
          '[MotionTextPreview] updateScenario called for plugin:',
          manifest.name
        )
        // Debug: compare drag-box visual center vs scenario input center
        const STAGE_W = stageSizeRef.current.width
        const STAGE_H = stageSizeRef.current.height

        // 현재 드래그 박스의 중앙 위치 계산
        const boxCenterX = position.x + size.width / 2
        const boxCenterY = position.y + size.height / 2

        const boxCenter = {
          x: boxCenterX,
          y: boxCenterY,
        }
        const normalizedCenter = {
          x: Math.max(0, Math.min(1, boxCenter.x / STAGE_W)),
          y: Math.max(0, Math.min(1, boxCenter.y / STAGE_H)),
        }

        const validatedParams = validateAndNormalizeParams(parameters, manifest)

        // Calculate proportional font size based on box dimensions
        const avgDimension = (size.width + size.height) / 2
        const fontSizeRel = Math.max(
          0.03,
          Math.min(0.15, (avgDimension / stageSizeRef.current.width) * 0.15)
        )

        const settings: PreviewSettings = {
          text,
          position: {
            x: boxCenterX - size.width / 2, // 중앙 기준으로 top-left 계산
            y: boxCenterY - size.height / 2,
          },
          size,
          pluginParams: validatedParams,
          rotationDeg,
          fontSizeRel,
        }

        // Convert current stage space to generator's 512x384 base for normalization
        const baseW = 512
        const baseH = 384
        const scaleX = baseW / stageSizeRef.current.width
        const scaleY = baseH / stageSizeRef.current.height

        // 중앙 위치를 기준으로 변환
        const centerXInBase = boxCenterX * scaleX
        const centerYInBase = boxCenterY * scaleY
        const scaledWidth = settings.size.width * scaleX
        const scaledHeight = settings.size.height * scaleY

        const settingsForGenerator = {
          ...settings,
          position: {
            x: centerXInBase - scaledWidth / 2, // 512x384 기준 중앙 위치에서 top-left 계산
            y: centerYInBase - scaledHeight / 2,
          },
          size: {
            width: scaledWidth,
            height: scaledHeight,
          },
        }

        // Debug logging after all variables are calculated
        console.log('[PosCompare] DragBox center (px):', {
          x: boxCenterX,
          y: boxCenterY,
        })
        console.log('[PosCompare] Current stage size:', {
          width: STAGE_W,
          height: STAGE_H,
        })
        console.log('[PosCompare] Center in base (512x384):', {
          x: centerXInBase,
          y: centerYInBase,
        })
        console.log(
          '[PosCompare] Final position for generator:',
          settingsForGenerator.position
        )
        console.log('[PosCompare] Box TL/Size/Rot:', {
          tl: position,
          size,
          rotationDeg,
        })

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const scenario = generateLoopedScenarioV2(
          extractedPluginKey || manifest.name, // Use plugin key with version
          settingsForGenerator as any,
          3
        ) as any
        await loadScenario(scenario as any, {
          silent: firstLoadDoneRef.current,
        })
        /* eslint-enable @typescript-eslint/no-explicit-any */
        console.log('[MotionTextPreview] Scenario loaded successfully')
        // Attempt to probe DOM to estimate rendered group/text center (best-effort)
        setTimeout(() => {
          const cont = containerRef.current
          if (!cont) return
          const rect = cont.getBoundingClientRect()
          // Heuristic: find the first element that carries effects root or text
          const textEl = cont.querySelector(
            '[data-mtx-effects-root], .typewriter-effect, .scalepop-text, .slideup-text, .fade-in-stagger-text, .elastic-bounce-text, .glitch-container, .rotation-container, .magnetic-text'
          ) as HTMLElement | null
          if (textEl) {
            const r = textEl.getBoundingClientRect()
            const center = {
              x: r.left + r.width / 2 - rect.left,
              y: r.top + r.height / 2 - rect.top,
            }
            console.log(
              '[PosCompare] Rendered text center (px, approx):',
              center
            )
          } else {
            console.log(
              '[PosCompare] Rendered text element not found for center probe'
            )
          }
        }, 150)

        // 처음 로드할 때만 자동으로 재생 시작 (컨트롤이 열려있지 않은 상태)
        if (!firstLoadDoneRef.current && !showControls) {
          play()
        }
        firstLoadDoneRef.current = true
      } catch (error) {
        console.error('Failed to update scenario:', error)
        if (onError) {
          onError('애니메이션을 업데이트할 수 없습니다')
        }
      }
    }, [
      manifest,
      parameters,
      text,
      position,
      size,
      rotationDeg,
      loadScenario,
      onError,
      containerRef,
      play,
      showControls,
      extractedPluginKey,
    ])

    /**
     * 파라미터, 위치, 크기, 회전 변경 시 시나리오 업데이트 (드래그 중이 아닐 때만)
     */
    useEffect(() => {
      // 드래그 중이면 업데이트 중지
      if (isDragging) {
        return
      }

      if (updateTimerRef.current) {
        window.clearTimeout(updateTimerRef.current)
        updateTimerRef.current = null
      }
      // 드래그가 아닌 경우에만 업데이트 (예: 파라미터 변경)
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
    }, [
      manifest,
      parameters,
      position,
      size,
      rotationDeg,
      isDragging,
      updateScenario,
    ]) // Include updateScenario dependency

    /**
     * 텍스트 변경은 별도로 더 긴 디바운스 적용 (드래그 중이 아닐 때만)
     */
    useEffect(() => {
      // 드래그 중이면 텍스트 업데이트도 중지
      if (isDragging) {
        return
      }

      const textUpdateTimerRef = window.setTimeout(() => {
        void updateScenario()
      }, 200)
      return () => {
        window.clearTimeout(textUpdateTimerRef)
      }
    }, [text, isDragging, updateScenario]) // Include updateScenario dependency

    /**
     * editingText를 text와 동기화
     */
    useEffect(() => {
      if (!isEditingText) {
        setEditingText(text)
      }
    }, [text, isEditingText])

    // Shallow compare helper to avoid useless updates
    const shallowEqual = (
      a: Record<string, unknown>,
      b: Record<string, unknown>
    ) => {
      const ak = Object.keys(a)
      const bk = Object.keys(b)
      if (ak.length !== bk.length) return false
      for (const k of ak) {
        if (a[k] !== b[k]) return false
      }
      return true
    }

    // Expose imperative API for parent to push parameter updates
    React.useImperativeHandle(
      ref,
      () => ({
        updateParameters: (next: Record<string, unknown>) => {
          setParameters((prev) => (shallowEqual(prev, next) ? prev : next))
        },
      }),
      []
    )

    /**
     * 컨테이너 크기 관찰하여 반응형 처리
     */
    useEffect(() => {
      const el = stageRef.current
      if (!el) return

      const ro = new ResizeObserver((entries) => {
        const entry = entries[0]
        const cr = entry.contentRect
        const newW = Math.max(1, cr.width)
        const newH = Math.max(1, cr.height)

        const prev = stageSizeRef.current
        // 비율 유지해서 좌표/사이즈 스케일링
        if (prev.width !== newW || prev.height !== newH) {
          const scaleX = newW / prev.width
          const scaleY = newH / prev.height

          stageSizeRef.current = { width: newW, height: newH }

          // 최초 측정 시에도 스케일링하여 초기 640x360 값을 화면 크기에 맞춤
          setPosition((p) => ({ x: p.x * scaleX, y: p.y * scaleY }))
          setSize((s) => ({
            width: s.width * scaleX,
            height: s.height * scaleY,
          }))
        }
      })

      ro.observe(el)
      // 초기 값 보정 (마운트 직후 값 확보)
      const rect = el.getBoundingClientRect()
      stageSizeRef.current = {
        width: rect.width || 512,
        height: rect.height || 384,
      }
      if (!hasScaledFromInitialRef.current) {
        // 초기 512x384 기준값을 실제 크기로 스케일 1회 적용
        const scaleX = stageSizeRef.current.width / 512
        const scaleY = stageSizeRef.current.height / 384

        // 크기를 먼저 스케일링
        const scaledWidth = 240 * scaleX
        const scaledHeight = 80 * scaleY

        // 중앙 정렬을 위한 위치 계산
        const centerX = (stageSizeRef.current.width - scaledWidth) / 2
        const centerY = (stageSizeRef.current.height - scaledHeight) / 2

        setPosition({ x: centerX, y: centerY })
        setSize({ width: scaledWidth, height: scaledHeight })
        hasScaledFromInitialRef.current = true
      }

      return () => {
        ro.disconnect()
      }
    }, [])

    /**
     * 컨트롤 숨기기 타이머 설정 및 애니메이션 재개
     */
    const scheduleHideControls = useCallback(() => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false)
        setIsInteracting(false)
        play() // 컨트롤 숨길 때 애니메이션 재개
      }, 2000) // 2초 후 자동 숨김
    }, [play])

    /**
     * 프리뷰 영역 클릭 시 컨트롤 표시 및 애니메이션 일시정지
     */
    const handlePreviewClick = useCallback(
      (e: React.MouseEvent) => {
        // 드래그 박스 외부 클릭 시
        if (!(e.target as HTMLElement).closest('.drag-box')) {
          if (!showControls) {
            pause() // 컨트롤 열 때 애니메이션 일시정지
          }
          setShowControls(true)
          scheduleHideControls()
        }
      },
      [scheduleHideControls, pause, showControls]
    )

    /**
     * 더블클릭 시 텍스트 편집 모드 시작
     */
    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsEditingText(true)
        setShowControls(true)
        pause() // 편집 중 애니메이션 일시정지
        // 다음 틱에서 input에 포커스
        setTimeout(() => {
          editInputRef.current?.focus()
          editInputRef.current?.select()
        }, 0)
      },
      [pause]
    )

    /**
     * 텍스트 편집 완료
     */
    const handleEditComplete = useCallback(() => {
      setIsEditingText(false)
      if (onTextChange && editingText !== text) {
        onTextChange(editingText)
      }
      scheduleHideControls()
    }, [editingText, text, onTextChange, scheduleHideControls])

    /**
     * 텍스트 편집 취소
     */
    const handleEditCancel = useCallback(() => {
      setIsEditingText(false)
      setEditingText(text) // 원래 텍스트로 복원
      scheduleHideControls()
    }, [text, scheduleHideControls])

    /**
     * 편집 input 키 이벤트 처리
     */
    const handleEditKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          handleEditComplete()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          handleEditCancel()
        }
      },
      [handleEditComplete, handleEditCancel]
    )

    /**
     * Moveable 드래그 이벤트 처리 (위치 정확한 계산)
     */
    const handleDrag = useCallback(
      (e: OnDrag) => {
        // Moveable이 제공하는 절대 좌표를 그대로 사용하고,
        // transform 기반 이동은 사용하지 않는다 (이중 적용 방지)
        const stageW = stageSizeRef.current.width
        const stageH = stageSizeRef.current.height
        const newX = Math.max(0, Math.min(stageW - size.width, e.left))
        const newY = Math.max(0, Math.min(stageH - size.height, e.top))

        setPosition({ x: newX, y: newY })
        // e.target.style.transform 는 설정하지 않는다. (left/top만 반영)
      },
      [size]
    )

    /**
     * Moveable 리사이즈 이벤트 처리
     */
    const handleResize = useCallback((e: OnResize) => {
      const stageW = stageSizeRef.current.width
      const stageH = stageSizeRef.current.height
      const newWidth = Math.max(100, Math.min(stageW, e.width))
      const newHeight = Math.max(60, Math.min(stageH, e.height))

      // Moveable이 계산한 절대 좌표 사용 (top-left 이동 포함)
      // transform 을 적용하지 않고 상태로만 반영해 싱크를 유지한다.
      const newLeft = Math.max(0, Math.min(stageW - newWidth, e.drag.left))
      const newTop = Math.max(0, Math.min(stageH - newHeight, e.drag.top))

      setSize({ width: newWidth, height: newHeight })
      setPosition({ x: newLeft, y: newTop })

      // DOM 즉시 반영을 위해 크기만 직접 설정 (transform은 설정하지 않음)
      e.target.style.width = `${newWidth}px`
      e.target.style.height = `${newHeight}px`
    }, [])

    /**
     * Moveable 회전 이벤트 처리
     */
    const handleRotate = useCallback((e: OnRotate) => {
      // 회전만 상태로 관리하고 transform 기반 이동은 적용하지 않음
      setRotationDeg(e.rotate)
    }, [])

    /**
     * Moveable 조작 종료 시 - 시나리오 업데이트 실행 및 애니메이션 재개
     */
    const handleMoveableEnd = useCallback(() => {
      setIsInteracting(false)
      setIsDragging(false)
      setShowSimpleText(false) // 단순 텍스트 표시 종료
      scheduleHideControls()
      // Debug snapshot at drag end
      const dragEndBoxCenter = {
        x: position.x + size.width / 2,
        y: position.y + size.height / 2,
      }
      console.log(
        '[PosCompare][DragEnd] boxCenter(px)=',
        dragEndBoxCenter,
        'TL/Size/Rot=',
        {
          tl: position,
          size,
          rotationDeg,
        }
      )
      // 조작 완료 후에만 시나리오 업데이트
      void updateScenario()
      play() // 드래그 완료 시 애니메이션 재개
    }, [
      scheduleHideControls,
      updateScenario,
      play,
      position,
      size,
      rotationDeg,
    ])

    /**
     * Moveable 조작 시작 시 - 초기 위치 저장 및 애니메이션 일시정지
     */
    const handleMoveableStart = useCallback(() => {
      setIsInteracting(true)
      setIsDragging(true)
      setShowControls(true)
      setShowSimpleText(true) // 단순 텍스트 표시 시작
      pause() // 드래그 시작 시 애니메이션 일시정지
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }
    }, [pause])

    /**
     * 텍스트 박스 ref 설정
     */
    useEffect(() => {
      if (textBoxRef.current) {
        setMoveableTarget(textBoxRef.current)
      }
    }, [showControls])

    /**
     * 파라미터 변경 핸들러 (외부에서 호출)
     */
    const updateParameters = useCallback(
      (newParams: Record<string, unknown>) => {
        setParameters((prev) => ({ ...prev, ...newParams }))
      },
      []
    )

    // 외부에서 접근할 수 있도록 useImperativeHandle로 함수 노출
    React.useImperativeHandle(
      ref,
      () => ({
        updateParameters,
      }),
      [updateParameters]
    )

    return (
      <div
        className={clsx(
          'relative bg-black rounded-lg overflow-visible cursor-pointer w-128 h-96',
          className
        )}
        onClick={handlePreviewClick}
        onDoubleClick={handleDoubleClick}
        ref={stageRef}
      >
        {/* 검정 배경 */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 to-black">
          {/* Hidden video element for renderer attachment (sizing/ticking) */}
          <video
            ref={videoRef}
            className="w-full h-full absolute inset-0"
            style={{ opacity: 0 }}
            muted
            playsInline
          />
        </div>

        {/* Motion Text Renderer 컨테이너 - visibility로 드래그 중 숨김 */}
        <div
          ref={containerRef}
          className="absolute inset-0 pointer-events-none"
          style={{ visibility: isDragging ? 'hidden' : 'visible' }}
        />

        {/* 드래그 중 단순 텍스트 표시 (성능 최적화) */}
        {showSimpleText && (
          <div
            className="absolute flex items-center justify-center text-white font-sans"
            style={{
              left: 0,
              top: 0,
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
              transform: `translate3d(${position.x}px, ${position.y}px, 0) rotate(${rotationDeg}deg)`,
              transformOrigin: 'center center',
              pointerEvents: 'none',
              zIndex: 10,
              willChange: 'transform',
              textAlign: 'center',
            }}
          >
            {text}
          </div>
        )}

        {/* 텍스트 편집 Input (편집 모드일 때) */}
        {isEditingText && (
          <div
            className="absolute z-20 flex items-center justify-center"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${size.width}px`,
              height: `${size.height}px`,
              transform: `rotate(${rotationDeg}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <input
              ref={editInputRef}
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={handleEditComplete}
              className="w-full h-full bg-transparent text-white text-center border-2 border-blue-400 rounded focus:outline-none focus:border-blue-300"
              style={{
                fontSize: `${(() => {
                  const avg = (size.width + size.height) / 2
                  const fontSizeRel = Math.max(
                    0.03,
                    Math.min(0.15, (avg / stageSizeRef.current.width) * 0.15)
                  )
                  return fontSizeRel * stageSizeRef.current.height
                })()}px`,
                fontFamily: 'inherit',
              }}
            />
          </div>
        )}

        {/* 드래그 가능한 텍스트 박스 (편집용 - 컨트롤 표시 시에만) */}
        {showControls && !isEditingText && (
          <div
            ref={textBoxRef}
            className={clsx(
              'drag-box absolute border-2 border-dashed cursor-move',
              'bg-blue-500/10 backdrop-blur-sm',
              !isInteracting && 'animate-pulse'
            )}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${size.width}px`,
              height: `${size.height}px`,
              transform: `rotate(${rotationDeg}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* 위치 표시 (편집 중일 때) */}
            {isInteracting && (
              <div className="absolute -top-6 left-0 text-xs text-blue-400 bg-gray-900/90 px-2 py-1 rounded">
                {Math.round(position.x)}, {Math.round(position.y)} •{' '}
                {Math.round(size.width)}×{Math.round(size.height)} •{' '}
                {Math.round(rotationDeg)}°
              </div>
            )}
          </div>
        )}

        {/* React Moveable 컴포넌트 */}
        {showControls && !isEditingText && moveableTarget && (
          <Moveable
            target={moveableTarget}
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

        {/* 도움말 텍스트 (컨트롤 미표시 시) */}
        {!showControls && !isLoading && !error && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 animate-pulse">
            화면을 클릭하여 위치 조정
          </div>
        )}

        {/* 로딩/상태 표시 */}
        {(isLoading || error) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            {isLoading && (
              <div className="text-white text-center">
                <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                <div className="text-sm">{status}</div>
              </div>
            )}
            {error && (
              <div className="text-red-400 text-center text-sm">
                오류: {error}
              </div>
            )}
          </div>
        )}

        {/* Moveable 컨트롤 스타일 */}
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
      </div>
    )
  }
)

MotionTextPreview.displayName = 'MotionTextPreview'
