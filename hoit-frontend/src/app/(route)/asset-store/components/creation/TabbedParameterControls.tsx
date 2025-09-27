'use client'

import { clsx } from 'clsx'
import React, { useCallback, useMemo, useState } from 'react'
import {
  LuClock,
  LuPalette,
  LuPlay,
  LuRotateCcw,
  LuSettings,
  LuSettings2,
  LuSparkles,
} from 'react-icons/lu'
import {
  PARAMETER_GROUPS,
  TabbedParameterControlsProps,
} from './types/assetCreation.types'

// Control Props interface
interface ControlProps {
  property: any
  value: unknown
  onChange: (value: unknown) => void
}

// Icon mapping for tabs
const TAB_ICONS = {
  basic: LuSettings,
  animation: LuPlay,
  colors: LuPalette,
  effects: LuSparkles,
  timing: LuClock,
  advanced: LuSettings2,
} as const

// Helper functions (copied from PluginParameterControls)
const getLabel = (property: any): string => {
  return property.i18n?.label?.ko || property.label || ''
}

const getDescription = (property: any): string => {
  return property.i18n?.description?.ko || property.description || ''
}

const getControlType = (property: any): string => {
  if (property.ui?.control) return property.ui.control
  if (property.type === 'boolean') return 'checkbox'
  if (property.type === 'number') return 'slider'
  if (property.type === 'string') {
    if (property.enum) return 'select'
    if (property.pattern?.includes('[0-9a-fA-F]{6}')) return 'color'
    return 'text'
  }
  if (property.type === 'object') return 'object'
  return 'text'
}

// Control Components
const NumberControl: React.FC<ControlProps> = ({
  property,
  value,
  onChange,
}) => {
  const dflt =
    typeof property.default === 'number'
      ? property.default
      : Number(property.default) || 0
  const numValue = typeof value === 'number' ? value : Number(value) || dflt
  const min = property.min ?? 0
  const max = property.max ?? 100
  const step = property.step ?? 1
  const unit = property.ui?.unit || ''

  const progressPercentage =
    max > min ? ((numValue - min) / (max - min)) * 100 : 0

  const handleSliderChange = (newValue: number) => {
    onChange(newValue)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Custom Slider Track */}
        <div
          className="relative h-2 bg-gray-200 rounded-full cursor-pointer"
          onClick={(e) => {
            if (max <= min) return
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const percentage = Math.max(0, Math.min(1, clickX / rect.width))
            const newValue = min + percentage * (max - min)
            const steppedValue = Math.round(newValue / step) * step
            handleSliderChange(Math.max(min, Math.min(max, steppedValue)))
          }}
        >
          {/* Progress Fill */}
          <div
            className="absolute top-0 left-0 h-full bg-purple-400 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />

          {/* Rectangular Handle - 가상 타임라인 컨트롤러 스타일 */}
          <div
            className="absolute w-3 h-6 bg-purple-600 border-2 border-white shadow-md cursor-grab active:cursor-grabbing transform -translate-x-1/2 transition-all duration-200 hover:bg-purple-700 hover:scale-110"
            style={{
              left: `${progressPercentage}%`,
              top: '-8px',
              borderRadius: '2px',
            }}
            onMouseDown={(e) => {
              if (max <= min) return
              e.preventDefault()
              const startX = e.clientX
              const startValue = numValue
              const trackRect =
                e.currentTarget.parentElement?.getBoundingClientRect()

              const handleMouseMove = (moveEvent: MouseEvent) => {
                if (!trackRect || max <= min) return
                const deltaX = moveEvent.clientX - startX
                const deltaPercentage = deltaX / trackRect.width
                const deltaValue = deltaPercentage * (max - min)
                const newValue = startValue + deltaValue
                const steppedValue = Math.round(newValue / step) * step
                handleSliderChange(Math.max(min, Math.min(max, steppedValue)))
              }

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }

              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={numValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 px-2 py-1 text-sm bg-white border border-gray-300 rounded text-gray-900"
        />
        {unit && <span className="text-xs text-gray-700">{unit}</span>}
      </div>
    </div>
  )
}

const BooleanControl: React.FC<ControlProps> = ({ value, onChange }) => {
  const boolValue = typeof value === 'boolean' ? value : Boolean(value)

  return (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={boolValue}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={clsx(
            'block bg-gray-300 w-14 h-8 rounded-full transition-colors',
            boolValue && 'bg-purple-500'
          )}
        >
          <div
            className={clsx(
              'absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform',
              boolValue && 'transform translate-x-6'
            )}
          />
        </div>
      </div>
      <span className="ml-3 text-sm text-gray-800">
        {boolValue ? '활성화' : '비활성화'}
      </span>
    </label>
  )
}

const StringControl: React.FC<ControlProps> = ({
  property,
  value,
  onChange,
}) => {
  const stringValue =
    typeof value === 'string' ? value : String(value ?? property.default ?? '')

  return (
    <input
      type="text"
      value={stringValue}
      onChange={(e) => onChange(e.target.value)}
      placeholder={property.description}
      className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-black placeholder-gray-500"
    />
  )
}

const SelectControl: React.FC<ControlProps> = ({
  property,
  value,
  onChange,
}) => {
  const selectValue =
    typeof value === 'string' ? value : String(value ?? property.default ?? '')
  const options = property.enum || []

  return (
    <select
      value={selectValue}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-black"
    >
      {options.map((option: string) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

const ColorControl: React.FC<ControlProps> = ({
  property,
  value,
  onChange,
}) => {
  const colorValue =
    typeof value === 'string'
      ? value
      : String(value ?? property.default ?? '#FFFFFF')

  return (
    <div className="flex items-center space-x-3">
      <button
        type="button"
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'color'
          input.value = colorValue
          input.addEventListener('change', (e) => {
            onChange((e.target as HTMLInputElement).value)
          })
          input.click()
        }}
        className="w-12 h-8 rounded-lg border-2 border-gray-300 shadow-sm cursor-pointer hover:border-gray-400 transition-colors duration-200"
        style={{ backgroundColor: colorValue }}
        title={`색상: ${colorValue}`}
      />
      <span className="text-sm text-gray-700 font-mono">{colorValue}</span>
    </div>
  )
}

const ObjectControl: React.FC<ControlProps> = ({
  property,
  value,
  onChange,
}) => {
  const jsonValue =
    typeof value === 'string'
      ? value
      : typeof value === 'object' && value !== null
        ? JSON.stringify(value, null, 2)
        : JSON.stringify(property.default ?? {}, null, 2)

  const [inputValue, setInputValue] = React.useState(jsonValue)
  const [isValid, setIsValid] = React.useState(true)

  React.useEffect(() => {
    setInputValue(jsonValue)
  }, [jsonValue])

  const handleChange = (newValue: string) => {
    setInputValue(newValue)
    if (!newValue.trim()) {
      setIsValid(true)
      onChange('')
      return
    }

    try {
      JSON.parse(newValue)
      setIsValid(true)
      onChange(newValue)
    } catch {
      setIsValid(false)
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder='{"key": "value"}'
        rows={4}
        className={clsx(
          'w-full px-3 py-2 border rounded text-black font-mono text-sm',
          isValid ? 'border-gray-300' : 'border-red-500'
        )}
      />
      {!isValid && (
        <p className="text-xs text-red-500">올바른 JSON 형식이 아닙니다</p>
      )}
    </div>
  )
}

export const TabbedParameterControls: React.FC<
  TabbedParameterControlsProps
> = ({
  manifest,
  parameters,
  onParameterChange,
  onParametersReset,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('basic')

  // Group parameters by category
  const groupedParameters = useMemo(() => {
    if (!manifest?.schema) return {}

    const groups: Record<string, Array<[string, any]>> = {}

    // Initialize groups
    PARAMETER_GROUPS.forEach((group) => {
      groups[group.id] = []
    })

    // Categorize parameters
    Object.entries(manifest.schema).forEach(([key, property]) => {
      let assigned = false

      // Try to assign to specific groups based on parameter name/type
      for (const group of PARAMETER_GROUPS) {
        if (
          group.parameters.some(
            (param) =>
              key.toLowerCase().includes(param.toLowerCase()) ||
              (property as any).category === group.id
          )
        ) {
          groups[group.id].push([key, property])
          assigned = true
          break
        }
      }

      // If not assigned to any specific group, put in basic
      if (!assigned) {
        groups.basic.push([key, property])
      }
    })

    return groups
  }, [manifest])

  // Get available tabs (only show tabs that have parameters)
  const availableTabs = useMemo(() => {
    return PARAMETER_GROUPS.filter(
      (group) =>
        groupedParameters[group.id] && groupedParameters[group.id].length > 0
    )
  }, [groupedParameters])

  // Handle parameter change
  const handleParameterChange = useCallback(
    (key: string, value: unknown) => {
      onParameterChange(key, value)
    },
    [onParameterChange]
  )

  // Handle reset
  const handleReset = useCallback(() => {
    if (!manifest?.schema) return

    // Reset all parameters to default values
    const defaultParameters: Record<string, unknown> = {}
    Object.entries(manifest.schema).forEach(([key, property]) => {
      defaultParameters[key] = (property as any).default
    })

    // Apply each parameter change
    Object.entries(defaultParameters).forEach(([key, value]) => {
      handleParameterChange(key, value)
    })

    // Call external reset callback
    onParametersReset?.()
  }, [manifest, handleParameterChange, onParametersReset])

  // Render individual control
  const renderControl = useCallback(
    (key: string, property: any) => {
      const value = parameters[key]
      const controlProps = {
        property,
        value,
        onChange: (newValue: unknown) => handleParameterChange(key, newValue),
      }

      const controlType = getControlType(property)

      switch (controlType) {
        case 'slider':
          return <NumberControl {...controlProps} />
        case 'checkbox':
          return <BooleanControl {...controlProps} />
        case 'text':
          return <StringControl {...controlProps} />
        case 'select':
          return <SelectControl {...controlProps} />
        case 'color':
          return <ColorControl {...controlProps} />
        case 'object':
          return <ObjectControl {...controlProps} />
        default:
          return <StringControl {...controlProps} />
      }
    },
    [parameters, handleParameterChange]
  )

  if (!manifest || !manifest.schema) {
    return (
      <div className={clsx('p-4 text-center text-gray-800', className)}>
        기반 플러그인을 선택해주세요
      </div>
    )
  }

  if (availableTabs.length === 0) {
    return (
      <div className={clsx('p-4 text-center text-gray-800', className)}>
        설정 가능한 파라미터가 없습니다.
      </div>
    )
  }

  const currentTabParameters = groupedParameters[activeTab] || []

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header with reset button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black">
          {manifest.name} 설정
        </h3>
        <button
          onClick={handleReset}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-lg',
            'bg-gray-100 hover:bg-gray-200 text-gray-700',
            'border border-gray-300 hover:border-gray-400',
            'transition-all duration-200 cursor-pointer',
            'flex items-center gap-1.5'
          )}
          title="모든 설정을 기본값으로 초기화"
        >
          <LuRotateCcw className="w-3.5 h-3.5" />
          초기화
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 overflow-x-auto">
          {availableTabs.map((group) => {
            const Icon =
              TAB_ICONS[group.id as keyof typeof TAB_ICONS] || LuSettings
            const isActive = activeTab === group.id
            const paramCount = groupedParameters[group.id]?.length || 0

            return (
              <button
                key={group.id}
                onClick={() => setActiveTab(group.id)}
                className={clsx(
                  'flex items-center space-x-2 px-3 py-2 text-sm font-medium',
                  'border-b-2 cursor-pointer whitespace-nowrap',
                  'transition-all duration-200',
                  isActive
                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{group.label}</span>
                <span
                  className={clsx(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-purple-200 text-purple-700'
                      : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {paramCount}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {currentTabParameters.length > 0 ? (
          currentTabParameters.map(([key, property]) => (
            <div key={key} className="space-y-2">
              {/* Label and description */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-900">
                  {getLabel(property)}
                </label>
                {getDescription(property) && (
                  <p className="text-xs text-gray-600">
                    {getDescription(property)}
                  </p>
                )}
              </div>

              {/* Control */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                {renderControl(key, property)}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            <Icon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">
              이 카테고리에는 설정할 수 있는 파라미터가 없습니다.
            </p>
          </div>
        )}
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-3 bg-gray-100 rounded border border-gray-300">
          <h4 className="text-xs font-mono text-gray-800 mb-2">
            Debug - Current Tab: {activeTab}
          </h4>
          <pre className="text-xs text-gray-700 overflow-auto">
            {JSON.stringify(parameters, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Helper function to get icon component
function Icon({ className }: { className?: string }) {
  return <LuSettings className={className} />
}
