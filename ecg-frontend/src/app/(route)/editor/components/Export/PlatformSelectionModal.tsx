'use client'

import React, { useState } from 'react'
import { FaTimes } from 'react-icons/fa'

interface PlatformSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: (selectedPlatforms: string[]) => void
}

interface Platform {
  id: string
  name: string
  icon: React.ReactNode
}

const platforms: Platform[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: (
      <img
        src="/social-media-logo/tiktok.jpg"
        alt="TikTok"
        className="w-6 h-6 rounded object-cover"
      />
    ),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: (
      <img
        src="/social-media-logo/youtube.png"
        alt="YouTube"
        className="w-6 h-6 rounded object-cover"
      />
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: (
      <img
        src="/social-media-logo/facebook.jpg"
        alt="Facebook"
        className="w-6 h-6 rounded object-cover"
      />
    ),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: (
      <img
        src="/social-media-logo/instagram.jpg"
        alt="Instagram"
        className="w-6 h-6 rounded object-cover"
      />
    ),
  },
]

export default function PlatformSelectionModal({
  isOpen,
  onClose,
  onNext,
}: PlatformSelectionModalProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  if (!isOpen) return null

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPlatforms.length === platforms.length) {
      setSelectedPlatforms([])
    } else {
      setSelectedPlatforms(platforms.map((p) => p.id))
    }
  }

  const handleNext = () => {
    if (selectedPlatforms.length > 0) {
      onNext(selectedPlatforms)
    }
  }

  const isAllSelected = selectedPlatforms.length === platforms.length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[420px] bg-white rounded-xl shadow-2xl z-[10001]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            배포할 플랫폼을 선택해주세요
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Select All */}
          <div className="mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                    isAllSelected
                      ? 'bg-black border-black'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  {isAllSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                전체선택
              </span>
            </label>
          </div>

          {/* Platform Options */}
          <div className="space-y-4">
            {platforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id)

              return (
                <label
                  key={platform.id}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handlePlatformToggle(platform.id)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-black border-black'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                      {platform.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {platform.name}
                    </span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Footer - Modern Design */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="btn-modern-secondary">
            취소
          </button>
          <button
            onClick={handleNext}
            disabled={selectedPlatforms.length === 0}
            className="btn-modern-black"
          >
            다음
          </button>
        </div>
      </div>
    </>
  )
}
