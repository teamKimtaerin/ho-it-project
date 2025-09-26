'use client'

import React from 'react'
import { IoClose } from 'react-icons/io5'
import { useEditorStore } from '../../store'

interface SidebarHeaderProps {
  title?: string
  onClose?: () => void
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  title = '템플릿',
  onClose,
}) => {
  const { setRightSidebarType } = useEditorStore()

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setRightSidebarType(null)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <button
        onClick={handleClose}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200"
        aria-label="사이드바 닫기"
      >
        <IoClose size={20} />
      </button>
    </div>
  )
}

export default SidebarHeader
