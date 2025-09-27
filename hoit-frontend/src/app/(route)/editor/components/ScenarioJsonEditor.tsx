'use client'

import React, { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'

import type { RendererConfigV2 as RendererConfig } from '@/app/shared/motiontext'

interface ScenarioJsonEditorProps {
  initialScenario: RendererConfig
  onApply: (scenario: RendererConfig) => void
  className?: string
}

export default function ScenarioJsonEditor({
  initialScenario,
  onApply,
  className = '',
}: ScenarioJsonEditorProps) {
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (initialScenario) {
      setJsonText(JSON.stringify(initialScenario, null, 2))
    }
  }, [initialScenario])

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setError(null)
      onApply(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  const handleReset = () => {
    setJsonText(JSON.stringify(initialScenario, null, 2))
    setError(null)
  }

  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-700 cursor-pointer hover:bg-gray-650"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400">⚙️</span>
          <span className="text-sm font-medium text-gray-200">설정 (JSON)</span>
        </div>
        <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {/* Editor Content */}
      {isExpanded && (
        <div className="p-4">
          <div className="relative">
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value)
                setError(null)
              }}
              className="w-full h-64 p-3 bg-gray-900 text-gray-200 font-mono text-xs rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-y"
              placeholder="Enter JSON configuration..."
              spellCheck={false}
            />
            {error && (
              <div className="absolute bottom-2 left-2 right-2 bg-red-500/20 border border-red-500 rounded px-2 py-1">
                <span className="text-xs text-red-400">Error: {error}</span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              설정 적용
            </Button>
            <Button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              초기화
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
