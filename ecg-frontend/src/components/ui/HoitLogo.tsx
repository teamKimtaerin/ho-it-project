'use client'

import React from 'react'

export interface HoitLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const HoitLogo: React.FC<HoitLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-6 text-sm',
    md: 'w-12 h-8 text-lg',
    lg: 'w-16 h-10 text-xl',
  }

  return (
    <div
      className={`bg-black rounded flex items-center justify-center font-black text-white ${sizeClasses[size]} ${className}`}
    >
      HI
    </div>
  )
}

export default HoitLogo
