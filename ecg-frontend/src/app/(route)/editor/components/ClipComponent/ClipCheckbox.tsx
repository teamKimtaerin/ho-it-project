import React from 'react'

interface ClipCheckboxProps {
  clipId: string
  isChecked: boolean
  isVisible?: boolean // Made optional since we'll always show it
  onCheck?: (clipId: string, checked: boolean) => void
}

export default function ClipCheckbox({
  clipId,
  isChecked,
  onCheck,
}: ClipCheckboxProps) {
  if (!onCheck) return null

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCheck(clipId, !isChecked)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="clip-checkbox group relative w-5 h-5 focus:outline-none rounded"
      aria-checked={isChecked}
      role="checkbox"
    >
      {/* Checkbox background */}
      <div
        className={`
          w-5 h-5 rounded border-2 flex items-center justify-center
          ${
            isChecked
              ? 'bg-black border-black'
              : 'bg-white border-gray-300 hover:border-gray-400'
          }
        `}
      >
        {/* Checkmark icon */}
        {isChecked && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    </button>
  )
}
