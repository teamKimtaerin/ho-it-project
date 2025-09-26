'use client'

import { clsx } from 'clsx'
import {
  logComponentWarning,
  TRANSITIONS,
  type BaseComponentProps,
} from '@/lib/utils'
import { AssetMetadata, SchemaProperty } from '@/types/asset-store'
import React, { useCallback, useEffect, useRef, useState } from 'react'

// GSAP 타입 선언
interface GSAPTimeline {
  to: (
    target: string | Element | HTMLElement | Record<string, unknown>,
    vars: Record<string, unknown>,
    position?: string | number
  ) => GSAPTimeline
  set: (
    target: string | Element | HTMLElement | Record<string, unknown>,
    vars: Record<string, unknown>,
    position?: string | number
  ) => GSAPTimeline
  from: (
    target: string | Element | HTMLElement | Record<string, unknown>,
    vars: Record<string, unknown>,
    position?: string | number
  ) => GSAPTimeline
  fromTo: (
    target: string | Element | HTMLElement | Record<string, unknown>,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>,
    position?: string | number
  ) => GSAPTimeline
  call: (
    callback: () => void,
    params?: unknown[],
    scope?: unknown,
    position?: string | number
  ) => GSAPTimeline
  duration: {
    (): number
    (value: number): GSAPTimeline
  }
}

interface GSAP {
  set: (
    target: string | Element | HTMLElement | Record<string, unknown>,
    vars: Record<string, unknown>
  ) => void
  to: (
    target: string | Element | HTMLElement | Record<string, unknown>,
    vars: Record<string, unknown>
  ) => void
  from: (
    target: string | Element | HTMLElement | Record<string, unknown>,
    vars: Record<string, unknown>
  ) => void
  fromTo: (
    target: string | Element | HTMLElement | Record<string, unknown>,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>
  ) => void
  timeline: (options?: Record<string, unknown>) => GSAPTimeline
  killTweensOf: (target: string | HTMLElement) => void
}

declare global {
  interface Window {
    gsap: GSAP
  }
}

// GSAP 텍스트 에디터 Props 타입
interface GSAPTextEditorProps extends BaseComponentProps {
  onAddToCart?: () => void
  manifestFile?: string
}

// 회전 방향 타입
type RotationDirection = 'left' | 'right'

// 동적 속성 값 타입
interface PropertyValues {
  [key: string]: string | number | boolean
}

// 리사이즈 핸들 타입
type ResizeHandle = 'top-right' | 'bottom-left' | null

// GSAP 텍스트 에디터 컴포넌트
export const GSAPTextEditor: React.FC<GSAPTextEditorProps> = ({
  onAddToCart,
  manifestFile,
  className,
}) => {
  const [text, setText] = useState('안녕하세요!')
  const [rotationDirection, setRotationDirection] =
    useState<RotationDirection>('right')
  const [assetConfig, setAssetConfig] = useState<AssetMetadata | null>(null)
  const [propertyValues, setPropertyValues] = useState<PropertyValues>({})
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null)

  // 통합된 컨테이너 상태
  const [containerPosition, setContainerPosition] = useState({ x: 150, y: 100 })
  const [containerSize, setContainerSize] = useState({
    width: 400,
    height: 120,
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const previewAreaRef = useRef<HTMLDivElement>(null)

  // config 파일 로드
  useEffect(() => {
    const loadConfig = async () => {
      if (!manifestFile) return

      try {
        const response = await fetch(manifestFile)
        const config: AssetMetadata = await response.json()
        setAssetConfig(config)

        // 기본값으로 propertyValues 초기화
        const defaultValues: PropertyValues = {}
        Object.entries(config.schema).forEach(([key, property]) => {
          defaultValues[key] = property.default
        })
        setPropertyValues(defaultValues)

        // rotationDirection 기본값 설정
        if (
          defaultValues.rotationDirection &&
          typeof defaultValues.rotationDirection === 'string'
        ) {
          setRotationDirection(
            defaultValues.rotationDirection as RotationDirection
          )
        }
      } catch (error) {
        console.error('Config file load error:', error)
      }
    }

    loadConfig()
  }, [manifestFile])

  // 검증 로직
  useEffect(() => {
    if (!text.trim()) {
      logComponentWarning('GSAPTextEditor', 'Text should not be empty')
    }
  }, [text])

  // 에디터 컨테이너 클래스
  const editorClasses = clsx(
    // 기본 스타일
    'gsap-editor',
    'min-h-[70vh]',
    'p-6',

    // 배경 및 색상
    'bg-white',
    'text-black',

    // 폰트
    'font-sans',

    // 트랜지션
    TRANSITIONS.normal,

    className
  )

  // 메인 컨테이너 클래스
  const mainContainerClasses = clsx(
    // 레이아웃
    'grid',
    'grid-cols-1',
    'lg:grid-cols-[2fr_1fr]',
    'gap-8',
    'items-start',

    // 스타일링
    'bg-white',
    'border',
    'border-gray-200',
    'rounded-xl',
    'p-8'
  )

  // 프리뷰 영역 클래스
  const previewAreaClasses = clsx(
    // 레이아웃
    'flex',
    'items-center',
    'justify-center',
    'relative',
    'overflow-hidden',

    // 크기
    'min-h-[400px]',
    'h-[60vh]',

    // 스타일링
    'bg-black',
    'border-2',
    'border-gray-800',
    'rounded-xl'
  )

  // 컨트롤 영역 클래스
  const controlAreaClasses = clsx(
    // 레이아웃
    'flex',
    'flex-col',
    'gap-5',

    // 스크롤
    'max-h-[60vh]',
    'overflow-y-auto',
    'pr-2'
  )

  useEffect(() => {
    // GSAP 라이브러리 로드
    if (typeof window !== 'undefined' && !window.gsap) {
      const script = document.createElement('script')
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
      script.onload = () => {
        console.log('GSAP loaded')
      }
      document.head.appendChild(script)
    }
  }, [])

  // 컨테이너 드래그 핸들러
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (isResizing) return

    setIsDragging(true)
    const previewRect = previewAreaRef.current?.getBoundingClientRect()
    if (!previewRect) return

    setDragStart({
      x: e.clientX - previewRect.left - containerPosition.x,
      y: e.clientY - previewRect.top - containerPosition.y,
    })
    e.preventDefault()
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !previewAreaRef.current) return

      const previewRect = previewAreaRef.current.getBoundingClientRect()
      const newX = e.clientX - previewRect.left - dragStart.x
      const newY = e.clientY - previewRect.top - dragStart.y

      const maxX = previewRect.width - containerSize.width
      const maxY = previewRect.height - containerSize.height

      const clampedX = Math.max(0, Math.min(newX, maxX))
      const clampedY = Math.max(0, Math.min(newY, maxY))

      setContainerPosition({ x: clampedX, y: clampedY })
    },
    [isDragging, dragStart, containerSize]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 리사이즈 핸들러
  const handleResizeStart = (
    e: React.MouseEvent,
    handle: 'top-right' | 'bottom-left'
  ) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    setResizeHandle(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeHandle) return

      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y

      setContainerSize((prevSize) => {
        let newWidth = prevSize.width
        let newHeight = prevSize.height

        if (resizeHandle === 'top-right') {
          newWidth = Math.max(200, Math.min(600, prevSize.width + deltaX))
          newHeight = Math.max(80, Math.min(300, prevSize.height - deltaY))
        } else if (resizeHandle === 'bottom-left') {
          newWidth = Math.max(200, Math.min(600, prevSize.width - deltaX))
          newHeight = Math.max(80, Math.min(300, prevSize.height + deltaY))
        }

        return { width: newWidth, height: newHeight }
      })

      setDragStart({ x: e.clientX, y: e.clientY })
    },
    [isResizing, resizeHandle, dragStart]
  )

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart, handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, dragStart, resizeHandle, handleResizeMove, handleResizeEnd])

  // 텍스트 분리 및 애니메이션 함수들
  const splitTextIntoWords = (element: HTMLElement, text: string) => {
    if (!element) return

    element.innerHTML = ''
    element.className = 'demo-text'

    if (!text.trim()) {
      element.textContent = '안녕하세요!'
      return
    }

    const words = text.split(' ')
    words.forEach((word, wordIndex) => {
      const wordSpan = document.createElement('span')
      wordSpan.className = 'word'
      wordSpan.style.display = 'inline-block'
      wordSpan.style.marginRight = '0.3em'

      for (let i = 0; i < word.length; i++) {
        const char = word.charAt(i)
        const charSpan = document.createElement('span')
        charSpan.className = 'char'
        charSpan.textContent = char
        charSpan.style.display = 'inline-block'
        wordSpan.appendChild(charSpan)
      }

      element.appendChild(wordSpan)
      if (wordIndex < words.length - 1) {
        element.appendChild(document.createTextNode(' '))
      }
    })
  }

  const rotationEffect = useCallback(
    (words: NodeListOf<Element>) => {
      if (!window.gsap) return

      // config에서 값 가져오거나 기본값 사용
      const rotationAngle =
        typeof propertyValues.rotationAngle === 'number'
          ? propertyValues.rotationAngle
          : 180
      const speed =
        typeof propertyValues.rotationSpeed === 'number'
          ? propertyValues.rotationSpeed
          : 1
      const duration =
        (typeof propertyValues.animationDuration === 'number'
          ? propertyValues.animationDuration
          : 2) / speed
      const stagger =
        typeof propertyValues.staggerDelay === 'number'
          ? propertyValues.staggerDelay
          : 0.3
      const direction = propertyValues.rotationDirection || rotationDirection
      const enableGradient = propertyValues.enableGradient || false

      const finalAngle = direction === 'right' ? rotationAngle : -rotationAngle

      words.forEach((word, index) => {
        // 그라데이션 효과 적용
        if (enableGradient) {
          ;(word as HTMLElement).style.background =
            'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)'
          ;(word as HTMLElement).style.backgroundClip = 'text'
          ;(word as HTMLElement).style.webkitBackgroundClip = 'text'
          ;(word as HTMLElement).style.webkitTextFillColor = 'transparent'
          ;(word as HTMLElement).style.backgroundSize = '200% 200%'
        } else {
          ;(word as HTMLElement).style.background = 'none'
          ;(word as HTMLElement).style.color = '#fff'
        }

        window.gsap.set(word as HTMLElement, {
          scale: 0,
          rotation: finalAngle,
          transformOrigin: 'center center',
        })

        window.gsap.to(word as HTMLElement, {
          scale: 1,
          rotation: 0,
          duration: duration,
          delay: index * stagger,
          ease: 'power2.out',
        })

        // 그라데이션 애니메이션
        if (enableGradient) {
          window.gsap.to(word as HTMLElement, {
            backgroundPosition: '200% 200%',
            duration: duration * 2,
            delay: index * stagger,
            repeat: -1,
            yoyo: true,
            ease: 'none',
          })
        }
      })
    },
    [propertyValues, rotationDirection]
  )

  const typeWriterEffect = useCallback(() => {
    if (!window.gsap || !textRef.current) return

    const textElement = textRef.current
    const originalText = text

    // config에서 값 가져오거나 기본값 사용
    const typingSpeed =
      typeof propertyValues.typingSpeed === 'number'
        ? propertyValues.typingSpeed
        : 0.1
    const startDelay =
      typeof propertyValues.startDelay === 'number'
        ? propertyValues.startDelay
        : 0.5
    const showCursor =
      typeof propertyValues.showCursor === 'boolean'
        ? propertyValues.showCursor
        : true
    const cursorBlinkSpeed =
      typeof propertyValues.cursorBlinkSpeed === 'number'
        ? propertyValues.cursorBlinkSpeed
        : 0.8
    const randomSpeed =
      typeof propertyValues.randomSpeed === 'boolean'
        ? propertyValues.randomSpeed
        : false

    // 기존 내용 초기화
    textElement.innerHTML = ''
    textElement.className = 'typewriter-text'

    // 텍스트 컨테이너 생성
    const textContainer = document.createElement('span')
    textContainer.className = 'typed-text'
    textElement.appendChild(textContainer)

    // 커서 생성
    let cursorElement = null
    if (showCursor) {
      cursorElement = document.createElement('span')
      cursorElement.className = 'typewriter-cursor'
      cursorElement.textContent = '|'
      cursorElement.style.display = 'inline-block'
      cursorElement.style.color = '#fff'
      textElement.appendChild(cursorElement)

      // 커서 깜빡임 애니메이션
      window.gsap.to(cursorElement, {
        opacity: 0,
        duration: cursorBlinkSpeed,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut',
      })
    }

    // 타이핑 애니메이션 타임라인
    const timeline = window.gsap.timeline()

    // 시작 지연
    if (startDelay > 0) {
      timeline.to({}, { duration: startDelay })
    }

    // 각 글자별 타이핑 애니메이션
    for (let i = 0; i <= originalText.length; i++) {
      const delay = randomSpeed
        ? typingSpeed * (0.5 + Math.random())
        : typingSpeed

      timeline.to(
        {},
        {
          duration: delay,
          onComplete: () => {
            textContainer.textContent = originalText.substring(0, i)
          },
        }
      )
    }
  }, [text, propertyValues])

  const elasticBounceEffect = useCallback(() => {
    if (!window.gsap || !textRef.current) return

    const textElement = textRef.current

    // config에서 값 가져오거나 기본값 사용
    const bounceStrength =
      typeof propertyValues.bounceStrength === 'number'
        ? propertyValues.bounceStrength
        : 0.7
    const animationDuration =
      typeof propertyValues.animationDuration === 'number'
        ? propertyValues.animationDuration
        : 1.5
    const staggerDelay =
      typeof propertyValues.staggerDelay === 'number'
        ? propertyValues.staggerDelay
        : 0.1
    const startScale =
      typeof propertyValues.startScale === 'number'
        ? propertyValues.startScale
        : 0
    const overshoot =
      typeof propertyValues.overshoot === 'number'
        ? propertyValues.overshoot
        : 1.3

    // 텍스트를 단어별로 분리
    splitTextIntoWords(textElement, text)
    const words = textElement.querySelectorAll('.word')

    words.forEach((word, index) => {
      // 초기 상태 설정
      window.gsap.set(word as HTMLElement, {
        scale: startScale,
        y: 20,
        opacity: 0,
        transformOrigin: 'center bottom',
      })

      // 바운스 애니메이션
      window.gsap.to(word as HTMLElement, {
        scale: overshoot,
        y: 0,
        opacity: 1,
        duration: animationDuration * 0.4,
        delay: index * staggerDelay,
        ease: 'back.out(2)',
        onComplete: () => {
          // 오버슈트에서 정상 크기로 복귀
          window.gsap.to(word as HTMLElement, {
            scale: 1,
            duration: animationDuration * 0.3,
            ease: `elastic.out(${bounceStrength}, 0.3)`,
          })
        },
      })

      // 미묘한 y축 바운스 추가
      window.gsap.to(word as HTMLElement, {
        y: -5,
        duration: animationDuration * 0.2,
        delay: index * staggerDelay + animationDuration * 0.4,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      })
    })
  }, [text, propertyValues])

  const glitchEffect = useCallback(() => {
    if (!window.gsap || !textRef.current) return

    const textElement = textRef.current

    // config에서 값 가져오거나 기본값 사용
    const glitchIntensity =
      typeof propertyValues.glitchIntensity === 'number'
        ? propertyValues.glitchIntensity
        : 5
    const animationDuration =
      typeof propertyValues.animationDuration === 'number'
        ? propertyValues.animationDuration
        : 2
    const glitchFrequency =
      typeof propertyValues.glitchFrequency === 'number'
        ? propertyValues.glitchFrequency
        : 0.3
    const colorSeparation =
      typeof propertyValues.colorSeparation === 'boolean'
        ? propertyValues.colorSeparation
        : true
    const noiseEffect =
      typeof propertyValues.noiseEffect === 'boolean'
        ? propertyValues.noiseEffect
        : true

    // 기존 내용 초기화
    textElement.innerHTML = ''
    textElement.className = 'glitch-text'
    textElement.style.position = 'relative'
    textElement.style.display = 'inline-block'

    const textContent = text || '안녕하세요!'

    // 메인 텍스트
    const mainText = document.createElement('span')
    mainText.className = 'glitch-main'
    mainText.textContent = textContent
    mainText.style.position = 'relative'
    mainText.style.display = 'inline-block'
    mainText.style.color = '#fff'
    textElement.appendChild(mainText)

    // 색상 분리 효과를 위한 레이어들
    if (colorSeparation) {
      // 빨간색 레이어
      const redLayer = document.createElement('span')
      redLayer.className = 'glitch-red'
      redLayer.textContent = textContent
      redLayer.style.position = 'absolute'
      redLayer.style.top = '0'
      redLayer.style.left = '0'
      redLayer.style.color = '#ff0000'
      redLayer.style.opacity = '0.8'
      redLayer.style.mixBlendMode = 'screen'
      textElement.appendChild(redLayer)

      // 시안색 레이어
      const cyanLayer = document.createElement('span')
      cyanLayer.className = 'glitch-cyan'
      cyanLayer.textContent = textContent
      cyanLayer.style.position = 'absolute'
      cyanLayer.style.top = '0'
      cyanLayer.style.left = '0'
      cyanLayer.style.color = '#00ffff'
      cyanLayer.style.opacity = '0.8'
      cyanLayer.style.mixBlendMode = 'screen'
      textElement.appendChild(cyanLayer)
    }

    // 노이즈 효과
    if (noiseEffect) {
      const noiseLayer = document.createElement('span')
      noiseLayer.className = 'glitch-noise'
      noiseLayer.textContent = textContent
      noiseLayer.style.position = 'absolute'
      noiseLayer.style.top = '0'
      noiseLayer.style.left = '0'
      noiseLayer.style.color = '#fff'
      noiseLayer.style.opacity = '0.1'
      textElement.appendChild(noiseLayer)
    }

    // 글리치 애니메이션 타임라인
    const timeline = window.gsap.timeline({ repeat: -1 })

    const redLayer = textElement.querySelector('.glitch-red')
    const cyanLayer = textElement.querySelector('.glitch-cyan')
    const noiseLayer = textElement.querySelector('.glitch-noise')

    // 메인 텍스트 글리치
    timeline.to(mainText, {
      x: () => (Math.random() - 0.5) * glitchIntensity,
      y: () => (Math.random() - 0.5) * glitchIntensity,
      duration: glitchFrequency,
      ease: 'none',
    })

    // 색상 분리 효과
    if (colorSeparation && redLayer && cyanLayer) {
      timeline.to(
        redLayer,
        {
          x: () => (Math.random() - 0.5) * glitchIntensity * 2,
          y: () => (Math.random() - 0.5) * glitchIntensity * 0.5,
          duration: glitchFrequency,
          ease: 'none',
        },
        0
      )

      timeline.to(
        cyanLayer,
        {
          x: () => (Math.random() - 0.5) * glitchIntensity * -2,
          y: () => (Math.random() - 0.5) * glitchIntensity * 0.5,
          duration: glitchFrequency,
          ease: 'none',
        },
        0
      )
    }

    // 노이즈 효과
    if (noiseEffect && noiseLayer) {
      timeline.to(
        noiseLayer,
        {
          opacity: () => Math.random() * 0.5,
          x: () => (Math.random() - 0.5) * glitchIntensity * 3,
          duration: glitchFrequency * 0.5,
          ease: 'none',
        },
        0
      )
    }

    // 깜빡임 효과
    timeline.to(
      mainText,
      {
        opacity: 0,
        duration: 0.1,
        repeat: 1,
        yoyo: true,
        ease: 'none',
      },
      glitchFrequency * 0.7
    )

    // 스케일 글리치
    timeline.to(
      textElement,
      {
        scaleX: () => 1 + (Math.random() - 0.5) * 0.1,
        scaleY: () => 1 + (Math.random() - 0.5) * 0.05,
        duration: glitchFrequency,
        ease: 'none',
      },
      0
    )

    // 전체 애니메이션 지속시간 설정
    timeline.duration(animationDuration)
  }, [text, propertyValues])

  const magneticPullEffect = useCallback(() => {
    if (!window.gsap || !textRef.current) return

    const textElement = textRef.current

    // config에서 값 가져오거나 기본값 사용
    const scatterDistance =
      typeof propertyValues.scatterDistance === 'number'
        ? propertyValues.scatterDistance
        : 200
    const pullSpeed =
      typeof propertyValues.pullSpeed === 'number'
        ? propertyValues.pullSpeed
        : 1.5
    const staggerDelay =
      typeof propertyValues.staggerDelay === 'number'
        ? propertyValues.staggerDelay
        : 0.05
    const magneticStrength =
      typeof propertyValues.magneticStrength === 'number'
        ? propertyValues.magneticStrength
        : 1.2
    const elasticEffect =
      typeof propertyValues.elasticEffect === 'boolean'
        ? propertyValues.elasticEffect
        : true

    // 기존 내용 초기화
    textElement.innerHTML = ''
    textElement.className = 'magnetic-pull-text'
    textElement.style.position = 'relative'
    textElement.style.display = 'inline-block'

    const textContent = text || '안녕하세요!'

    // 각 글자를 개별 span으로 분리
    for (let i = 0; i < textContent.length; i++) {
      const char = textContent.charAt(i)
      const charSpan = document.createElement('span')
      charSpan.className = 'magnetic-char'
      charSpan.textContent = char === ' ' ? '\u00A0' : char // 공백 처리
      charSpan.style.display = 'inline-block'
      charSpan.style.position = 'relative'
      charSpan.style.color = '#fff'
      textElement.appendChild(charSpan)
    }

    const chars = textElement.querySelectorAll('.magnetic-char')

    chars.forEach((char, index) => {
      // 랜덤한 방향과 거리로 흩어진 초기 위치 설정
      const angle = Math.random() * Math.PI * 2
      const distance = scatterDistance * (0.5 + Math.random() * 0.5)
      const scatterX = Math.cos(angle) * distance
      const scatterY = Math.sin(angle) * distance

      // 초기 상태: 흩어진 상태
      window.gsap.set(char as HTMLElement, {
        x: scatterX,
        y: scatterY,
        opacity: 0,
        scale: 0.3,
        rotation: Math.random() * 360 - 180,
      })

      // 자석에 끌려오는 애니메이션
      const timeline = window.gsap.timeline()

      // 1단계: 나타나기
      timeline.to(char as HTMLElement, {
        opacity: 1,
        duration: 0.2,
        delay: index * staggerDelay,
        ease: 'power2.out',
      })

      // 2단계: 자석에 끌려오기
      timeline.to(
        char,
        {
          x: 0,
          y: 0,
          scale: magneticStrength,
          rotation: 0,
          duration: pullSpeed,
          ease: 'power2.out',
          onComplete: () => {
            if (elasticEffect) {
              // 3단계: 탄성 복귀
              window.gsap.to(char as HTMLElement, {
                scale: 1,
                duration: 0.6,
                ease: 'elastic.out(1, 0.4)',
              })

              // 미묘한 바운스 효과
              window.gsap.to(char as HTMLElement, {
                y: -3,
                duration: 0.15,
                ease: 'power2.out',
                yoyo: true,
                repeat: 1,
              })
            } else {
              // 단순한 스케일 복귀
              window.gsap.to(char as HTMLElement, {
                scale: 1,
                duration: 0.3,
                ease: 'power2.out',
              })
            }
          },
        },
        '-=0.1'
      )

      // 자석 끌림 효과 (중간에 가속)
      timeline.to(
        char,
        {
          x: 0,
          y: 0,
          duration: pullSpeed * 0.3,
          ease: 'power3.in',
        },
        `-=${pullSpeed * 0.4}`
      )
    })
  }, [text, propertyValues])

  const fadeInStaggerEffect = useCallback(() => {
    if (!window.gsap || !textRef.current) return

    const textElement = textRef.current

    // config에서 값 가져오거나 기본값 사용
    const staggerDelay =
      typeof propertyValues.staggerDelay === 'number'
        ? propertyValues.staggerDelay
        : 0.1
    const animationDuration =
      typeof propertyValues.animationDuration === 'number'
        ? propertyValues.animationDuration
        : 0.8
    const startOpacity =
      typeof propertyValues.startOpacity === 'number'
        ? propertyValues.startOpacity
        : 0
    const scaleStart =
      typeof propertyValues.scaleStart === 'number'
        ? propertyValues.scaleStart
        : 0.9
    const ease =
      typeof propertyValues.ease === 'string'
        ? propertyValues.ease
        : 'power2.out'

    // 기존 내용 초기화
    textElement.innerHTML = ''
    textElement.className = 'fade-in-stagger-text'
    textElement.style.position = 'relative'
    textElement.style.display = 'inline-block'

    const textContent = text || '안녕하세요!'

    // 각 글자를 개별 span으로 분리
    for (let i = 0; i < textContent.length; i++) {
      const char = textContent.charAt(i)
      const charSpan = document.createElement('span')
      charSpan.className = 'fade-char'
      charSpan.textContent = char === ' ' ? '\u00A0' : char // 공백 처리
      charSpan.style.display = 'inline-block'
      charSpan.style.position = 'relative'
      charSpan.style.color = '#fff'
      textElement.appendChild(charSpan)
    }

    const chars = textElement.querySelectorAll('.fade-char')

    chars.forEach((char, index) => {
      // 초기 상태 설정 (순수 페이드인 - 슬라이드 없음)
      window.gsap.set(char as HTMLElement, {
        opacity: startOpacity,
        scale: scaleStart,
        transformOrigin: 'center center',
      })

      // 순수 페이드 인 애니메이션
      window.gsap.to(char as HTMLElement, {
        opacity: 1,
        scale: 1,
        duration: animationDuration,
        delay: index * staggerDelay,
        ease: ease,
        // 미묘한 색상 변화 효과
        onStart: () => {
          ;(char as HTMLElement).style.filter = 'brightness(1.3)'
          ;(char as HTMLElement).style.textShadow =
            '0 0 5px rgba(255,255,255,0.3)'
        },
        onComplete: () => {
          // 밝기와 글로우 효과 제거
          window.gsap.to(char as HTMLElement, {
            filter: 'brightness(1)',
            textShadow: '0 0 0px rgba(255,255,255,0)',
            duration: 0.4,
            ease: 'power1.out',
          })
        },
      })

      // 미묘한 펄스 효과 (스케일 변동)
      window.gsap.to(char as HTMLElement, {
        scale: 1.03,
        duration: animationDuration * 0.2,
        delay: index * staggerDelay + animationDuration * 0.6,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      })

      // 색상 그라데이션 효과
      window.gsap.fromTo(
        char as HTMLElement,
        {
          color: '#999999',
        },
        {
          color: '#ffffff',
          duration: animationDuration * 0.8,
          delay: index * staggerDelay + animationDuration * 0.2,
          ease: 'power1.inOut',
        }
      )
    })
  }, [text, propertyValues])

  const scalePopEffect = useCallback(() => {
    if (!window.gsap || !textRef.current) return

    const textElement = textRef.current

    // config에서 값 가져오거나 기본값 사용
    const startScale =
      typeof propertyValues.startScale === 'number'
        ? propertyValues.startScale
        : 0
    const maxScale =
      typeof propertyValues.maxScale === 'number'
        ? propertyValues.maxScale
        : 1.3
    const popDuration =
      typeof propertyValues.popDuration === 'number'
        ? propertyValues.popDuration
        : 0.6
    const staggerDelay =
      typeof propertyValues.staggerDelay === 'number'
        ? propertyValues.staggerDelay
        : 0.08
    const rotationAmount =
      typeof propertyValues.rotationAmount === 'number'
        ? propertyValues.rotationAmount
        : 10

    // 기존 내용 초기화
    textElement.innerHTML = ''
    textElement.className = 'scale-pop-text'
    textElement.style.position = 'relative'
    textElement.style.display = 'inline-block'

    const textContent = text || '안녕하세요!'

    // 각 글자를 개별 span으로 분리
    for (let i = 0; i < textContent.length; i++) {
      const char = textContent.charAt(i)
      const charSpan = document.createElement('span')
      charSpan.className = 'scale-char'
      charSpan.textContent = char === ' ' ? '\u00A0' : char // 공백 처리
      charSpan.style.display = 'inline-block'
      charSpan.style.position = 'relative'
      charSpan.style.color = '#fff'
      textElement.appendChild(charSpan)
    }

    const chars = textElement.querySelectorAll('.scale-char')

    chars.forEach((char, index) => {
      // 랜덤한 회전 방향 결정
      const randomRotation = (Math.random() - 0.5) * rotationAmount * 2

      // 초기 상태 설정
      window.gsap.set(char as HTMLElement, {
        scale: startScale,
        opacity: 0,
        rotation: randomRotation * 0.5,
        transformOrigin: 'center center',
        filter: 'blur(2px)',
      })

      // 스케일 팝 애니메이션 타임라인
      const timeline = window.gsap.timeline()

      // 1단계: 나타나면서 오버스케일
      timeline.to(char as HTMLElement, {
        scale: maxScale,
        opacity: 1,
        rotation: randomRotation,
        filter: 'blur(0px)',
        duration: popDuration * 0.6,
        delay: index * staggerDelay,
        ease: 'back.out(2)',
        onStart: () => {
          // 글로우 효과 추가
          ;(char as HTMLElement).style.textShadow =
            '0 0 10px rgba(255,255,255,0.5)'
        },
      })

      // 2단계: 정상 크기로 복귀
      timeline.to(char as HTMLElement, {
        scale: 1,
        rotation: 0,
        duration: popDuration * 0.4,
        ease: 'elastic.out(1, 0.4)',
        onComplete: () => {
          // 글로우 효과 제거
          window.gsap.to(char as HTMLElement, {
            textShadow: '0 0 0px rgba(255,255,255,0)',
            duration: 0.3,
            ease: 'power1.out',
          })
        },
      })

      // 추가적인 바운스 효과
      timeline.to(
        char,
        {
          y: -5,
          duration: 0.15,
          delay: popDuration * 0.1,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        },
        '-=0.2'
      )

      // 미묘한 색상 변화 효과
      timeline.to(
        char,
        {
          color: '#fff',
          duration: popDuration,
          ease: 'power1.inOut',
          onStart: () => {
            ;(char as HTMLElement).style.color = '#e74c3c' // 시작 색상
          },
          onUpdate: function (this: { progress(): number }) {
            // 진행률에 따라 색상 변화
            const progress = this.progress()
            const r = Math.floor(231 + (255 - 231) * progress) // 231 -> 255
            const g = Math.floor(76 + (255 - 76) * progress) // 76 -> 255
            const b = Math.floor(60 + (255 - 60) * progress) // 60 -> 255
            ;(char as HTMLElement).style.color = `rgb(${r}, ${g}, ${b})`
          },
        },
        0
      )
    })
  }, [text, propertyValues])

  const slideUpEffect = useCallback(() => {
    if (!window.gsap || !textRef.current) return

    const textElement = textRef.current

    // config에서 값 가져오거나 기본값 사용
    const slideDistance =
      typeof propertyValues.slideDistance === 'number'
        ? propertyValues.slideDistance
        : 50
    const animationDuration =
      typeof propertyValues.animationDuration === 'number'
        ? propertyValues.animationDuration
        : 0.8
    const staggerDelay =
      typeof propertyValues.staggerDelay === 'number'
        ? propertyValues.staggerDelay
        : 0.1
    const overshoot =
      typeof propertyValues.overshoot === 'number'
        ? propertyValues.overshoot
        : 10
    const blurEffect =
      typeof propertyValues.blurEffect === 'boolean'
        ? propertyValues.blurEffect
        : true

    // 기존 내용 초기화
    textElement.innerHTML = ''
    textElement.className = 'slide-up-text'
    textElement.style.position = 'relative'
    textElement.style.display = 'inline-block'
    textElement.style.overflow = 'hidden'

    const textContent = text || '안녕하세요!'

    // 각 글자를 개별 span으로 분리
    for (let i = 0; i < textContent.length; i++) {
      const char = textContent.charAt(i)
      const charSpan = document.createElement('span')
      charSpan.className = 'slide-char'
      charSpan.textContent = char === ' ' ? '\u00A0' : char // 공백 처리
      charSpan.style.display = 'inline-block'
      charSpan.style.position = 'relative'
      charSpan.style.color = '#fff'
      charSpan.style.overflow = 'hidden'
      textElement.appendChild(charSpan)
    }

    const chars = textElement.querySelectorAll('.slide-char')

    chars.forEach((char, index) => {
      // 초기 상태 설정
      window.gsap.set(char as HTMLElement, {
        y: slideDistance,
        opacity: 0,
        scale: 0.95,
        transformOrigin: 'center bottom',
        filter: blurEffect ? 'blur(3px)' : 'blur(0px)',
      })

      // 슬라이드 업 애니메이션 타임라인
      const timeline = window.gsap.timeline()

      // 1단계: 슬라이드 업 (오버슈트 포함)
      timeline.to(char as HTMLElement, {
        y: overshoot > 0 ? -overshoot : 0,
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: animationDuration * 0.7,
        delay: index * staggerDelay,
        ease: 'power3.out',
        onStart: () => {
          // 슬라이딩 시작 시 미묘한 글로우 효과
          if (blurEffect) {
            ;(char as HTMLElement).style.textShadow =
              '0 0 8px rgba(255,255,255,0.3)'
          }
        },
      })

      // 2단계: 정확한 위치로 복귀 (오버슈트가 있는 경우만)
      if (overshoot > 0) {
        timeline.to(char as HTMLElement, {
          y: 0,
          duration: animationDuration * 0.3,
          ease: 'power2.out',
          onComplete: () => {
            // 글로우 효과 제거
            if (blurEffect) {
              window.gsap.to(char as HTMLElement, {
                textShadow: '0 0 0px rgba(255,255,255,0)',
                duration: 0.4,
                ease: 'power1.out',
              })
            }
          },
        })
      } else {
        // 오버슈트가 없는 경우 글로우 제거
        timeline.call(() => {
          if (blurEffect) {
            window.gsap.to(char as HTMLElement, {
              textShadow: '0 0 0px rgba(255,255,255,0)',
              duration: 0.4,
              ease: 'power1.out',
            })
          }
        })
      }

      // 미묘한 추가 효과들
      // 스케일 미세 조정
      timeline.to(
        char,
        {
          scale: 1.02,
          duration: 0.2,
          delay: animationDuration * 0.1,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        },
        '-=0.3'
      )

      // 색상 변화
      timeline.fromTo(
        char,
        {
          color: '#cccccc',
        },
        {
          color: '#ffffff',
          duration: animationDuration,
          ease: 'power1.inOut',
        },
        0
      )
    })

    // 전체 컨테이너에 미묘한 효과
    if (blurEffect) {
      window.gsap.fromTo(
        textElement as HTMLElement,
        {
          filter: 'brightness(0.8)',
        },
        {
          filter: 'brightness(1)',
          duration:
            animationDuration * chars.length * staggerDelay + animationDuration,
          ease: 'power1.out',
        }
      )
    }
  }, [text, propertyValues])

  const applyEffect = useCallback(() => {
    if (typeof window === 'undefined' || !window.gsap || !textRef.current)
      return

    const textElement = textRef.current

    // 기존 애니메이션 정리
    window.gsap.killTweensOf('*')

    // 플러그인 타입에 따라 다른 효과 적용
    if (assetConfig?.name === 'TypeWriter Text Effect') {
      // TypeWriter 효과
      typeWriterEffect()
    } else if (assetConfig?.name === 'Elastic Bounce Effect') {
      // Elastic Bounce 효과
      elasticBounceEffect()
    } else if (assetConfig?.name === 'Glitch Effect') {
      // Glitch 효과
      glitchEffect()
    } else if (assetConfig?.name === 'Magnetic Pull Effect') {
      // Magnetic Pull 효과
      magneticPullEffect()
    } else if (assetConfig?.name === 'Fade In Stagger Effect') {
      // Fade In Stagger 효과
      fadeInStaggerEffect()
    } else if (assetConfig?.name === 'Scale Pop Effect') {
      // Scale Pop 효과
      scalePopEffect()
    } else if (assetConfig?.name === 'Slide Up Effect') {
      // Slide Up 효과
      slideUpEffect()
    } else {
      // Rotation 효과 (기본값)
      splitTextIntoWords(textElement, text)
      const words = textElement?.querySelectorAll('.word') || []
      window.gsap.set(textElement, { opacity: 1 })

      if (words.length > 0) {
        rotationEffect(words)
      }
    }
  }, [
    text,
    rotationEffect,
    typeWriterEffect,
    elasticBounceEffect,
    glitchEffect,
    magneticPullEffect,
    fadeInStaggerEffect,
    scalePopEffect,
    slideUpEffect,
    assetConfig,
  ])

  const handleAddToCart = () => {
    onAddToCart?.()
    console.log('담기 버튼 클릭됨')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyEffect()
    }
  }

  // 텍스트나 속성 변경 시 애니메이션 적용
  useEffect(() => {
    const timer = setTimeout(() => {
      applyEffect()
    }, 300)
    return () => clearTimeout(timer)
  }, [text, rotationDirection, propertyValues, applyEffect])

  // 속성 값 업데이트 함수
  const updatePropertyValue = (
    key: string,
    value: string | number | boolean
  ) => {
    setPropertyValues((prev) => ({
      ...prev,
      [key]: value,
    }))

    // rotationDirection 업데이트
    if (key === 'rotationDirection' && typeof value === 'string') {
      setRotationDirection(value as RotationDirection)
    }
  }

  // 슬라이더 컴포넌트
  const renderSlider = (
    key: string,
    property: SchemaProperty,
    label: string
  ) => (
    <div key={key} className="space-y-2">
      <label className="block text-black text-sm font-medium">
        {label}:{' '}
        {typeof propertyValues[key] === 'number'
          ? (propertyValues[key] as number).toFixed(1)
          : propertyValues[key]}
      </label>
      <input
        type="range"
        min={property.min}
        max={property.max}
        step={property.step || 0.1}
        value={
          typeof propertyValues[key] === 'number'
            ? propertyValues[key]
            : typeof property.default === 'number'
              ? property.default
              : 0
        }
        onChange={(e) => updatePropertyValue(key, parseFloat(e.target.value))}
        className={clsx(
          'w-full',
          'h-2',
          'bg-gray-200',
          'rounded-lg',
          'appearance-none',
          'cursor-pointer',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-5',
          '[&::-webkit-slider-thumb]:h-5',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-black',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:shadow-md'
        )}
      />
    </div>
  )

  // 체크박스 컴포넌트
  const renderCheckbox = (
    key: string,
    property: SchemaProperty,
    label: string
  ) => (
    <div key={key} className="space-y-2">
      <label
        className={clsx(
          'flex',
          'items-center',
          'gap-3',
          'p-3',
          'bg-gray-50',
          'border',
          'border-gray-200',
          'rounded-lg',
          'cursor-pointer',
          'hover:bg-gray-100',
          TRANSITIONS.normal
        )}
      >
        <input
          type="checkbox"
          checked={
            typeof propertyValues[key] === 'boolean'
              ? propertyValues[key]
              : typeof property.default === 'boolean'
                ? property.default
                : false
          }
          onChange={(e) => updatePropertyValue(key, e.target.checked)}
          className="w-4 h-4 text-black cursor-pointer accent-black"
        />
        <span className="text-sm text-black">{label}</span>
      </label>
    </div>
  )

  // 라디오 버튼 컴포넌트
  const renderRadio = (
    key: string,
    property: SchemaProperty,
    label: string
  ) => (
    <div key={key} className="space-y-3">
      <label className="block text-black text-sm font-medium">{label}:</label>
      <div className="space-y-2">
        {property.enum?.map((option: string) => (
          <label
            key={option}
            className={clsx(
              'flex',
              'items-center',
              'gap-3',
              'p-3',
              'bg-gray-50',
              'border',
              'border-gray-200',
              'rounded-lg',
              'cursor-pointer',
              'hover:bg-gray-100',
              TRANSITIONS.normal
            )}
          >
            <input
              type="radio"
              name={key}
              value={option}
              checked={propertyValues[key] === option}
              onChange={(e) => updatePropertyValue(key, e.target.value)}
              className="w-4 h-4 text-black cursor-pointer accent-black"
            />
            <span className="text-sm text-black">
              {option === 'left'
                ? '왼쪽으로 회전 (반시계 방향)'
                : option === 'right'
                  ? '오른쪽으로 회전 (시계 방향)'
                  : option === 'alternate'
                    ? '교대로 회전 (좌우 번갈아)'
                    : option === 'power1.out'
                      ? 'Power1 (부드러운)'
                      : option === 'power2.out'
                        ? 'Power2 (기본)'
                        : option === 'power3.out'
                          ? 'Power3 (강한)'
                          : option === 'back.out'
                            ? 'Back (되튐)'
                            : option === 'elastic.out'
                              ? 'Elastic (탄성)'
                              : option === 'bounce.out'
                                ? 'Bounce (바운스)'
                                : option === 'circ.out'
                                  ? 'Circular (원형)'
                                  : option === 'expo.out'
                                    ? 'Exponential (지수)'
                                    : option === 'center center'
                                      ? '중앙'
                                      : option === 'left center'
                                        ? '왼쪽'
                                        : option === 'right center'
                                          ? '오른쪽'
                                          : option === 'center top'
                                            ? '상단'
                                            : option === 'center bottom'
                                              ? '하단'
                                              : option}
            </span>
          </label>
        ))}
      </div>
    </div>
  )

  // 컬러 선택 컴포넌트
  const renderColorPicker = (
    key: string,
    property: SchemaProperty,
    label: string
  ) => (
    <div key={key} className="space-y-2">
      <label className="block text-black text-sm font-medium">{label}:</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={
            typeof propertyValues[key] === 'string'
              ? propertyValues[key]
              : typeof property.default === 'string'
                ? property.default
                : '#000000'
          }
          onChange={(e) => updatePropertyValue(key, e.target.value)}
          className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
        />
        <span className="text-sm text-gray-600">
          {typeof propertyValues[key] === 'string'
            ? propertyValues[key]
            : typeof property.default === 'string'
              ? property.default
              : '#000000'}
        </span>
      </div>
    </div>
  )

  // 동적 컨트롤 렌더링
  const renderDynamicControls = () => {
    if (!assetConfig) return null

    const locale = 'ko'
    const translations = assetConfig.i18n?.[locale] || {}

    return Object.entries(assetConfig.schema).map(([key, property]) => {
      const label = property.label || translations[key] || key

      if (property.type === 'number') {
        return renderSlider(key, property, label)
      } else if (property.type === 'boolean') {
        return renderCheckbox(key, property, label)
      } else if (property.type === 'select' && property.enum) {
        return renderRadio(key, property, label)
      } else if (property.type === 'color') {
        return renderColorPicker(key, property, label)
      }

      return null
    })
  }

  // 입력 필드 클래스
  const inputClasses = clsx(
    'w-full',
    'px-4',
    'py-3',
    'bg-white',
    'border',
    'border-gray-300',
    'rounded-lg',
    'text-black',
    'placeholder-gray-500',
    'text-base',
    'focus:outline-none',
    'focus:border-black',
    'focus:ring-1',
    'focus:ring-black',
    TRANSITIONS.normal
  )

  // 버튼 클래스
  const buttonClasses = clsx(
    'w-full',
    'px-6',
    'py-3',
    'bg-black',
    'border',
    'border-black',
    'rounded-lg',
    'text-white',
    'text-base',
    'font-medium',
    'cursor-pointer',
    'hover:bg-gray-800',
    'active:scale-95',
    TRANSITIONS.normal
  )

  return (
    <div className={editorClasses}>
      <div className={mainContainerClasses}>
        {/* 프리뷰 영역 */}
        <div ref={previewAreaRef} className={previewAreaClasses}>
          {/* 통합된 텍스트-경계 컨테이너 */}
          <div
            ref={containerRef}
            style={{
              position: 'absolute',
              left: `${containerPosition.x}px`,
              top: `${containerPosition.y}px`,
              width: `${containerSize.width}px`,
              height: `${containerSize.height}px`,
              transition: isDragging || isResizing ? 'none' : 'all 0.3s ease',
            }}
          >
            {/* 핑크 점선 경계 */}
            <div
              style={{
                position: 'absolute',
                left: '0px',
                top: '0px',
                width: '100%',
                height: '100%',
                border: '2px dashed rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                pointerEvents: 'none',
              }}
            >
              {/* 리사이즈 핸들들 */}
              <div
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '16px',
                  height: '16px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '2px solid rgba(0, 0, 0, 0.8)',
                  borderRadius: '50%',
                  cursor: 'ne-resize',
                  pointerEvents: 'auto',
                  zIndex: 20,
                }}
                onMouseDown={(e) => handleResizeStart(e, 'top-right')}
              />

              <div
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '-8px',
                  width: '16px',
                  height: '16px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '2px solid rgba(0, 0, 0, 0.8)',
                  borderRadius: '50%',
                  cursor: 'sw-resize',
                  pointerEvents: 'auto',
                  zIndex: 20,
                }}
                onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
              />
            </div>

            {/* 텍스트 */}
            <div
              ref={textRef}
              className="demo-text"
              onMouseDown={handleContainerMouseDown}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#fff',
                textAlign: 'center',
                opacity: 1,
                lineHeight: 1.2,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 10,
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {text}
            </div>
          </div>
        </div>

        {/* 컨트롤 영역 */}
        <div className={controlAreaClasses}>
          {/* 텍스트 입력 */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="bg-black text-white px-3 py-1 rounded text-sm font-medium -m-4 mb-3">
              텍스트 입력
            </div>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="예: 안녕하세요!"
              maxLength={50}
              className={inputClasses}
            />
          </div>

          {/* 동적 컨트롤 */}
          {assetConfig ? (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="bg-black text-white px-3 py-1 rounded text-sm font-medium -m-4 mb-3">
                애니메이션 설정
              </div>
              {renderDynamicControls()}
            </div>
          ) : (
            /* 기본 회전 방향 선택 */
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="bg-black text-white px-3 py-1 rounded text-sm font-medium -m-4 mb-3">
                회전 방향
              </div>
              <div className="space-y-2">
                {[
                  { value: 'left', label: '왼쪽으로 회전 (반시계 방향)' },
                  { value: 'right', label: '오른쪽으로 회전 (시계 방향)' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={clsx(
                      'flex',
                      'items-center',
                      'gap-3',
                      'p-3',
                      'bg-gray-50',
                      'border',
                      'border-gray-200',
                      'rounded-lg',
                      'cursor-pointer',
                      'hover:bg-gray-100',
                      TRANSITIONS.normal
                    )}
                  >
                    <input
                      type="radio"
                      name="rotation"
                      value={value}
                      checked={rotationDirection === value}
                      onChange={(e) =>
                        setRotationDirection(
                          e.target.value as RotationDirection
                        )
                      }
                      className="w-4 h-4 text-black cursor-pointer accent-black"
                    />
                    <span
                      className={clsx(
                        'flex-1',
                        'text-sm',
                        'text-black',
                        TRANSITIONS.colors
                      )}
                    >
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 담기 버튼 */}
          <button onClick={handleAddToCart} className={buttonClasses}>
            담기
          </button>
        </div>
      </div>

      <style jsx>{`
        .demo-text .char {
          display: inline-block;
          transform: scale(1);
          opacity: 1;
          position: relative;
        }
        .demo-text .word {
          display: inline-block;
          margin-right: 0.3em;
        }
        .gsap-editor::-webkit-scrollbar {
          width: 6px;
        }
        .gsap-editor::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .gsap-editor::-webkit-scrollbar-thumb {
          background: rgba(138, 43, 226, 0.5);
          border-radius: 3px;
        }
      `}</style>
    </div>
  )
}
