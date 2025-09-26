'use client'

import React from 'react'
import { useEditorStore } from '../store'

const EditingModeToggle: React.FC = () => {
  const { editingMode, setEditingMode, rightSidebarType, setRightSidebarType } =
    useEditorStore()

  const handleAdvancedModeClick = () => {
    setEditingMode('advanced')

    // Template sidebar disabled - auto open animation asset sidebar
    if (rightSidebarType === null) {
      setRightSidebarType('animation')
    }
  }

  return (
    <div className="flex items-center">
      <div className="relative bg-gray-200 rounded-full p-1 flex items-center">
        {/* Background slider */}
        <div
          className={`absolute top-1 bottom-1 bg-purple-500 rounded-full transition-all duration-300 ease-in-out ${
            editingMode === 'simple'
              ? 'left-1 right-[50%]'
              : 'left-[50%] right-1'
          }`}
        />

        {/* Simple Mode Button */}
        <button
          onClick={() => setEditingMode('simple')}
          className={`relative z-10 p-2 rounded-full transition-all duration-200 cursor-pointer ${
            editingMode === 'simple'
              ? 'text-white'
              : 'text-gray-600 hover:text-gray-800 hover:scale-110 hover:shadow-md'
          }`}
          title="쉬운 편집"
        >
          <svg
            className="w-4 h-4"
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
        </button>

        {/* Advanced Mode Button */}
        <button
          onClick={handleAdvancedModeClick}
          className={`relative z-10 p-2 rounded-full transition-all duration-200 cursor-pointer ${
            editingMode === 'advanced'
              ? 'text-white'
              : 'text-gray-600 hover:text-gray-800 hover:scale-110 hover:shadow-md'
          }`}
          title="고급 편집"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default EditingModeToggle
