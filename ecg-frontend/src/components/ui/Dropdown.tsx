'use client'

import { ChevronDownIcon } from '@/components/icons'
import {
  cn,
  getDisabledClasses,
  SIZE_CLASSES,
  type ComponentSize,
} from '@/utils'
import React, { useEffect, useRef, useState } from 'react'

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

export interface DropdownProps {
  label?: string
  labelPosition?: 'top' | 'side'
  placeholder?: string
  value?: string
  width?: number
  size?: ComponentSize
  isQuiet?: boolean
  necessityIndicator?: 'text' | 'icon' | 'none'
  isRequired?: boolean
  menuContainer?: 'popover' | 'tray'
  isError?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  description?: string
  errorMessage?: string
  options: DropdownOption[]
  onChange?: (value: string) => void
  className?: string
  id?: string
  variant?: 'default' | 'toolbar'
}

const DROPDOWN_SIZE_CLASSES = {
  small: {
    trigger: 'h-8 text-sm px-3',
    menu: 'text-sm py-1',
    option: 'px-3 py-1.5',
  },
  medium: {
    trigger: 'h-10 text-base px-3',
    menu: 'text-base py-1',
    option: 'px-3 py-2',
  },
  large: {
    trigger: 'h-12 text-lg px-4',
    menu: 'text-lg py-1',
    option: 'px-4 py-2.5',
  },
  'extra-large': {
    trigger: 'h-14 text-xl px-4',
    menu: 'text-xl py-2',
    option: 'px-4 py-3',
  },
} as const

const Dropdown: React.FC<DropdownProps> = ({
  label,
  labelPosition = 'top',
  placeholder = 'Select an option...',
  value,
  width,
  size = 'medium',
  isQuiet = false,
  necessityIndicator = 'icon',
  isRequired = false,
  isError = false,
  isDisabled = false,
  isReadOnly = false,
  description,
  errorMessage,
  options,
  onChange,
  className,
  id,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const sizeClasses = DROPDOWN_SIZE_CLASSES[size]

  // 선택된 옵션 찾기
  const selectedOption = options.find((option) => option.value === value)

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 키보드 이벤트 처리
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isDisabled || isReadOnly) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (isOpen && focusedIndex >= 0) {
          const focusedOption = options[focusedIndex]
          if (!focusedOption.disabled) {
            onChange?.(focusedOption.value)
            setIsOpen(false)
            setFocusedIndex(-1)
          }
        } else {
          setIsOpen(true)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setFocusedIndex(-1)
        triggerRef.current?.focus()
        break
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(0)
        } else {
          setFocusedIndex((prev) => {
            const next = prev < options.length - 1 ? prev + 1 : 0
            return options[next].disabled
              ? next < options.length - 1
                ? next + 1
                : 0
              : next
          })
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(options.length - 1)
        } else {
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : options.length - 1
            return options[next].disabled
              ? next > 0
                ? next - 1
                : options.length - 1
              : next
          })
        }
        break
    }
  }

  const handleOptionClick = (option: DropdownOption) => {
    if (option.disabled) return
    onChange?.(option.value)
    setIsOpen(false)
    setFocusedIndex(-1)
    triggerRef.current?.focus()
  }

  // 라벨 클래스
  const labelClasses = cn(
    'font-medium',
    SIZE_CLASSES.typography[size],
    isError ? 'text-red-600' : 'text-text-primary',
    isDisabled && 'opacity-50'
  )

  // 트리거 클래스
  const triggerClasses = cn(
    'inline-flex items-center justify-between w-full',
    'rounded-default',
    'font-medium',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizeClasses.trigger,

    // Quiet vs Regular 스타일
    isQuiet
      ? [
          'border-0 border-b-2 rounded-none bg-transparent',
          isError
            ? 'border-red-600 focus:ring-red-200'
            : 'border-border focus:ring-primary-light',
          'hover:border-primary',
        ]
      : variant === 'toolbar'
        ? [
            'border-2 bg-slate-700/90',
            isError
              ? 'border-red-600 focus:ring-red-200'
              : 'border-slate-500/70 focus:ring-blue-200',
            'hover:border-slate-400 hover:shadow-sm hover:bg-slate-600/90',
          ]
        : [
            'border-2 bg-white/95',
            isError
              ? 'border-red-600 focus:ring-red-200'
              : 'border-slate-300 focus:ring-blue-200',
            'hover:border-slate-400 hover:shadow-sm hover:bg-gray-50',
          ],

    // 비활성화 상태
    (isDisabled || isReadOnly) && getDisabledClasses(),

    // 텍스트 색상
    variant === 'toolbar'
      ? selectedOption
        ? 'text-white'
        : 'text-slate-300'
      : selectedOption
        ? 'text-black'
        : 'text-gray-600'
  )

  // 메뉴 클래스
  const menuClasses = cn(
    'absolute w-full mt-1 rounded-default shadow-lg max-h-60 overflow-auto',
    variant === 'toolbar'
      ? 'z-[9999] bg-slate-700/95 border border-slate-500/70 backdrop-blur-sm'
      : 'z-50 bg-white border border-slate-300',
    sizeClasses.menu
  )

  // 옵션 클래스
  const getOptionClasses = (option: DropdownOption, index: number) =>
    cn(
      'flex items-center gap-2 w-full cursor-pointer transition-colors',
      sizeClasses.option,

      // 상태별 스타일
      option.disabled
        ? variant === 'toolbar'
          ? 'text-slate-500 cursor-not-allowed opacity-50'
          : 'text-gray-400 cursor-not-allowed opacity-50'
        : variant === 'toolbar'
          ? [
              'text-white',
              'hover:bg-slate-600/70',
              focusedIndex === index && 'bg-slate-600/70',
              value === option.value && 'bg-blue-500 text-white',
            ]
          : [
              'text-black',
              'hover:bg-gray-100',
              focusedIndex === index && 'bg-gray-100',
              value === option.value && 'bg-blue-500 text-white',
            ]
    )

  // 필수 표시
  const renderNecessityIndicator = () => {
    if (!isRequired) return null

    switch (necessityIndicator) {
      case 'text':
        return <span className="text-red-600 ml-1">(required)</span>
      case 'icon':
        return <span className="text-red-600 ml-1">*</span>
      default:
        return null
    }
  }

  // 드롭다운 화살표 아이콘 클래스
  const chevronIconClasses = cn(
    'transition-transform duration-200',
    SIZE_CLASSES.iconClasses[size],
    isOpen && 'transform rotate-180'
  )

  const containerStyle = width ? { width: `${width}px` } : {}

  const renderDropdown = () => (
    <div className="relative" style={containerStyle}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClasses}
        onClick={() => !isDisabled && !isReadOnly && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={label ? `${id}-label` : undefined}
        disabled={isDisabled}
        id={id}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon && (
                <span className={SIZE_CLASSES.iconClasses[size]}>
                  {selectedOption.icon}
                </span>
              )}
              {selectedOption.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDownIcon className={chevronIconClasses} />
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          className={menuClasses}
          role="listbox"
          aria-labelledby={label ? `${id}-label` : undefined}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className={getOptionClasses(option, index)}
              onClick={() => handleOptionClick(option)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              {option.icon && (
                <span className={SIZE_CLASSES.iconClasses[size]}>
                  {option.icon}
                </span>
              )}
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  if (labelPosition === 'side') {
    return (
      <div className={cn('flex items-start gap-3', className)}>
        {label && (
          <label
            htmlFor={id}
            id={`${id}-label`}
            className={cn(labelClasses, 'whitespace-nowrap min-w-0 pt-2')}
          >
            {label}
            {renderNecessityIndicator()}
          </label>
        )}
        <div className="flex-1 min-w-0">
          {renderDropdown()}
          {description && !isError && (
            <p className="text-sm text-text-secondary mt-1">{description}</p>
          )}
          {isError && errorMessage && (
            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} id={`${id}-label`} className={labelClasses}>
          {label}
          {renderNecessityIndicator()}
        </label>
      )}
      {renderDropdown()}
      {description && !isError && (
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      )}
      {isError && errorMessage && (
        <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
      )}
    </div>
  )
}

export default Dropdown
