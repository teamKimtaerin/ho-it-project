'use client'

import React from 'react'
import { IoArrowForward } from 'react-icons/io5'

interface AssetStoreLinkBannerProps {
  text?: string
  type?: 'assets' | 'templates'
  className?: string
}

const AssetStoreLinkBanner: React.FC<AssetStoreLinkBannerProps> = ({
  text,
  type = 'assets',
  className = '',
}) => {
  const defaultText =
    type === 'templates'
      ? '템플릿 스토어에서 더 많은 템플릿 보기'
      : '에셋 스토어에서 더 많은 에셋 보기'

  const displayText = text || defaultText

  const handleClick = () => {
    // 새 탭에서 에셋 스토어 열기
    window.open('/asset-store', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`px-4 pb-2 ${className}`}>
      <button
        onClick={handleClick}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer group"
        type="button"
      >
        <span>{displayText}</span>
        <IoArrowForward
          size={12}
          className="group-hover:translate-x-0.5 transition-transform duration-200"
        />
      </button>
    </div>
  )
}

export default AssetStoreLinkBanner
