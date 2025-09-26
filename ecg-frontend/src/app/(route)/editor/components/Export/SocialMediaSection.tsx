'use client'

import React from 'react'
import { FaYoutube } from 'react-icons/fa'
import { SocialPlatform, SocialMediaOption } from './ExportTypes'

interface SocialMediaSectionProps {
  onSocialShare: (platform: SocialPlatform) => void
}

const socialMediaOptions: SocialMediaOption[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    description: '동영상 업로드',
    icon: 'FaYoutube',
  },
]

const getIconComponent = (iconName: string) => {
  const iconMap: {
    [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>>
  } = {
    FaYoutube,
  }

  return iconMap[iconName] || FaYoutube
}

export default function SocialMediaSection({
  onSocialShare,
}: SocialMediaSectionProps) {
  const handleSocialShare = (platform: SocialPlatform) => {
    onSocialShare(platform)
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-600 mb-3">
        소셜 미디어에 공유
      </h3>

      <div className="space-y-1">
        {socialMediaOptions.map((option) => {
          const IconComponent = getIconComponent(option.icon)

          return (
            <div
              key={option.id}
              className="flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:scale-105 hover:shadow-md"
              onClick={() => handleSocialShare(option.id)}
            >
              <div className="flex items-center flex-1">
                <div className="w-5 h-5 mr-3 text-red-500 flex items-center justify-center">
                  <IconComponent className="w-full h-full" />
                </div>
                <div>
                  <span className="text-sm text-black">{option.label}</span>
                  <span className="text-sm text-gray-500 ml-1">
                    ({option.description})
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
