'use client'

import React from 'react'
import { IoCheckmark, IoClose, IoSettings } from 'react-icons/io5'
import { useEditorStore } from '../../store'

interface TemplateControlPanelProps {
  templateId: string
  templateName: string | null
  onClose: () => void
  onApplyTemplate?: (
    templateId: string,
    settings: Record<string, unknown>
  ) => void
}

const TemplateControlPanel: React.FC<TemplateControlPanelProps> = ({
  templateId,
  templateName,
  onClose,
  onApplyTemplate,
}) => {
  const { applyTemplateToSelection } = useEditorStore()
  const [opacity, setOpacity] = React.useState(1.0)
  const [scale, setScale] = React.useState(1.0)
  const [borderRadius, setBorderRadius] = React.useState(8)
  const [shadowBlur, setShadowBlur] = React.useState(10)
  const [isApplying, setIsApplying] = React.useState(false)

  const handleApplyTemplate = async () => {
    const settings = {
      opacity,
      scale,
      borderRadius,
      shadowBlur,
    }

    setIsApplying(true)
    try {
      // Apply template using the editor store
      await applyTemplateToSelection(templateId)

      // Also call the legacy callback if provided
      onApplyTemplate?.(templateId, settings)
      console.log('Applied template:', templateName, 'to selected words')

      // Close the panel after successful application
      onClose()
    } catch (error) {
      console.error('Failed to apply template:', error)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <IoSettings className="text-gray-500" size={16} />
          <span className="font-medium text-gray-900 text-sm">
            {templateName || 'Template'} 설정
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <IoClose size={16} />
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {/* Opacity Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            투명도: {opacity.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Scale Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            크기: {scale.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Border Radius Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            모서리 둥글기: {borderRadius}px
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={borderRadius}
            onChange={(e) => setBorderRadius(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Shadow Blur Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            그림자 강도: {shadowBlur}px
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={shadowBlur}
            onChange={(e) => setShadowBlur(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Apply Button */}
        <div className="pt-2">
          <button
            onClick={handleApplyTemplate}
            disabled={isApplying}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {isApplying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                적용 중...
              </>
            ) : (
              <>
                <IoCheckmark size={16} />
                템플릿 적용
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}

export default TemplateControlPanel
