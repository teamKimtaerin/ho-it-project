'use client'

import React from 'react'
import { IoRefresh, IoCheckmark } from 'react-icons/io5'

interface ButtonGroupProps {
  onReset: () => void
  onApply: () => void
  disabled?: boolean
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  onReset,
  onApply,
  disabled = false,
}) => {
  return (
    <div className="flex gap-2 mt-6">
      <button
        onClick={onReset}
        disabled={disabled}
        className="flex-1 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center justify-center gap-2"
      >
        <IoRefresh size={12} />
        초기화
      </button>
      <button
        onClick={onApply}
        disabled={disabled}
        className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center justify-center gap-2"
      >
        <IoCheckmark size={12} />
        적용
      </button>
    </div>
  )
}

export default ButtonGroup
