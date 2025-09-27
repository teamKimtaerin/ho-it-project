'use client'

import React from 'react'

interface ToolbarToggleProps {
  isToolbarVisible: boolean
  onToggle: () => void
}

const ToolbarToggle: React.FC<ToolbarToggleProps> = ({
  isToolbarVisible,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 hover:scale-110 hover:shadow-md rounded-lg transition-all duration-200 cursor-pointer"
      title={isToolbarVisible ? '툴바 숨기기' : '툴바 보이기'}
    >
      <svg
        className={`w-5 h-5 transition-transform duration-300 ${
          isToolbarVisible ? 'rotate-180' : ''
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  )
}

export default ToolbarToggle
