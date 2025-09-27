'use client'

import React, {
  Children,
  cloneElement,
  isValidElement,
  useState,
  useEffect,
  useRef,
} from 'react'
import { TabItemProps } from '@/components/ui/TabItem'

export interface TabProps {
  orientation?: 'horizontal' | 'vertical'
  size?: 'small' | 'medium' | 'large' | 'extra-large'
  density?: 'regular' | 'compact'
  isFluid?: boolean
  isQuiet?: boolean
  isEmphasized?: boolean
  alignment?: 'start' | 'center'
  selectedItem?: string
  keyboardActivation?: 'manual' | 'automatic'
  onSelectionChange?: (selectedId: string) => void
  className?: string
  children: React.ReactNode
}

const Tab: React.FC<TabProps> = ({
  orientation = 'horizontal',
  size = 'medium',
  density = 'regular',
  isFluid = false,
  isQuiet = false,
  isEmphasized = false,
  alignment = 'start',
  selectedItem,
  keyboardActivation = 'manual',
  onSelectionChange,
  className = '',
  children,
}) => {
  // Internal state for selected item if not controlled
  const [internalSelectedId, setInternalSelectedId] = useState<string>('')

  // Refs for slider animation
  const tabsRef = useRef<HTMLDivElement>(null)
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({})

  // Get the actual selected ID (controlled or uncontrolled)
  const actualSelectedId = selectedItem || internalSelectedId

  // Initialize selected item on mount
  useEffect(() => {
    if (!selectedItem && !internalSelectedId) {
      // Find first non-disabled tab and select it
      const firstTab = Children.toArray(children).find((child) => {
        if (isValidElement(child)) {
          const props = child.props as TabItemProps
          return !props.isDisabled
        }
        return false
      })

      if (isValidElement(firstTab)) {
        const props = firstTab.props as TabItemProps
        setInternalSelectedId(props.id)
      }
    }
  }, [selectedItem, internalSelectedId, children])

  // Handle tab selection
  const handleTabSelection = (tabId: string) => {
    if (!selectedItem) {
      setInternalSelectedId(tabId)
    }
    onSelectionChange?.(tabId)
  }

  // Update slider position when selection changes
  useEffect(() => {
    if (orientation === 'horizontal' && !isQuiet && tabsRef.current) {
      const updateSliderPosition = () => {
        const selectedButton = tabsRef.current?.querySelector(
          `[aria-selected="true"]`
        ) as HTMLElement
        if (selectedButton && tabsRef.current) {
          const containerRect = tabsRef.current.getBoundingClientRect()
          const buttonRect = selectedButton.getBoundingClientRect()

          setSliderStyle({
            width: buttonRect.width,
            transform: `translateX(${buttonRect.left - containerRect.left}px)`,
            transition: 'all 0.2s ease-in-out',
          })
        }
      }

      // Use setTimeout to ensure DOM is fully rendered
      const timeoutId = setTimeout(() => {
        updateSliderPosition()
      }, 0)

      // Update position on window resize
      const handleResize = () => {
        setTimeout(updateSliderPosition, 0)
      }
      window.addEventListener('resize', handleResize)

      // Use ResizeObserver to detect container size changes
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(updateSliderPosition, 0)
      })

      if (tabsRef.current) {
        resizeObserver.observe(tabsRef.current)
      }

      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', handleResize)
        resizeObserver.disconnect()
      }
    }
  }, [actualSelectedId, orientation, isQuiet, children])

  // Get container classes
  const getContainerClasses = () => {
    const base = ['relative']

    // Orientation
    if (orientation === 'horizontal') {
      base.push('inline-flex', 'flex-row', 'gap-0')

      // Fluid only applies to horizontal
      if (isFluid) {
        base.push('w-full')
      }

      // Alignment
      if (alignment === 'center') {
        base.push('justify-center')
      } else {
        base.push('justify-start')
      }
    } else {
      base.push('inline-flex', 'flex-col', 'items-stretch', 'gap-0')
    }

    return base
  }

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const tabElements = Children.toArray(children).filter(
      (child) =>
        isValidElement(child) && !(child.props as TabItemProps).isDisabled
    )

    const currentIndex = tabElements.findIndex(
      (child) =>
        isValidElement(child) &&
        (child.props as TabItemProps).id === actualSelectedId
    )

    let nextIndex = currentIndex

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        nextIndex = (currentIndex + 1) % tabElements.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        nextIndex =
          currentIndex === 0 ? tabElements.length - 1 : currentIndex - 1
        break
      case 'Home':
        event.preventDefault()
        nextIndex = 0
        break
      case 'End':
        event.preventDefault()
        nextIndex = tabElements.length - 1
        break
      default:
        return
    }

    const nextTab = tabElements[nextIndex]
    if (isValidElement(nextTab)) {
      const nextTabId = (nextTab.props as TabItemProps).id

      if (keyboardActivation === 'automatic') {
        handleTabSelection(nextTabId)
      } else {
        // Manual activation - just focus, don't select
        // In a real implementation, we'd focus the element
        // For now, we'll still handle selection since we don't have focus management
        handleTabSelection(nextTabId)
      }
    }
  }

  // Process children to add props
  const processedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child

    const tabItemProps = child.props as TabItemProps
    const isSelected = tabItemProps.id === actualSelectedId

    return cloneElement(child as React.ReactElement<TabItemProps>, {
      ...tabItemProps,
      isSelected,
      onClick: handleTabSelection,
      size,
      orientation,
      density,
      isQuiet,
      isEmphasized,
      // If fluid is enabled, make tabs fill available space
      className:
        isFluid && orientation === 'horizontal'
          ? `${tabItemProps.className || ''} flex-1`.trim()
          : tabItemProps.className,
    })
  })

  const containerClasses = [...getContainerClasses(), className].join(' ')

  return (
    <div
      ref={tabsRef}
      className={containerClasses}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
    >
      {processedChildren}

      {/* Slider bar for horizontal non-quiet tabs */}
      {orientation === 'horizontal' && !isQuiet && (
        <div
          className="absolute bottom-0 h-0.5 bg-white rounded-none"
          style={sliderStyle}
        />
      )}
    </div>
  )
}

export default Tab
