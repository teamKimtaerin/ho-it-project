'use client'

import React from 'react'
import Dropdown from '@/components/ui/Dropdown'
import Switch from '@/components/ui/Switch'

interface TranscriptionSettingsProps {
  language: string
  setLanguage: (language: string) => void
  useDictionary: boolean
  setUseDictionary: (use: boolean) => void
  autoSubmit: boolean
  setAutoSubmit: (auto: boolean) => void
}

const TranscriptionSettings: React.FC<TranscriptionSettingsProps> = ({
  language,
  setLanguage,
  useDictionary,
  setUseDictionary,
  autoSubmit,
  setAutoSubmit,
}) => {
  const languageOptions = [
    { value: 'Korean (South Korea)', label: 'Korean (South Korea)' },
    { value: 'English (US)', label: 'English (US)' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Chinese (Simplified)', label: 'Chinese (Simplified)' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">
          Transcription Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Language
            </label>
            <Dropdown
              value={language}
              options={languageOptions}
              onChange={(value) => setLanguage(value)}
              size="medium"
              className="w-full"
            />
            <p className="text-sm text-text-secondary mt-1">
              Select the primary language of your video content
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Enhanced Dictionary
              </h4>
              <p className="text-sm text-text-secondary">
                Use advanced language models for better accuracy with technical
                terms and proper nouns
              </p>
            </div>
            <Switch
              isSelected={useDictionary}
              onChange={setUseDictionary}
              size="medium"
              id="transcription-dictionary-switch"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Auto-submit for Processing
              </h4>
              <p className="text-sm text-text-secondary">
                Automatically start processing after upload completion
              </p>
            </div>
            <Switch
              isSelected={autoSubmit}
              onChange={setAutoSubmit}
              size="medium"
              id="auto-submit-switch"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h4 className="text-sm font-medium text-text-primary mb-3">
          Processing Information
        </h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-sm">
            <svg
              className="w-4 h-4 text-primary flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-text-secondary">
              Processing time: ~1 minute per 10 minutes of content
            </span>
          </div>

          <div className="flex items-center space-x-3 text-sm">
            <svg
              className="w-4 h-4 text-primary flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-text-secondary">
              Accuracy: Up to 95% with enhanced dictionary
            </span>
          </div>

          <div className="flex items-center space-x-3 text-sm">
            <svg
              className="w-4 h-4 text-primary flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-text-secondary">
              Support for multiple speakers and background noise reduction
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TranscriptionSettings
