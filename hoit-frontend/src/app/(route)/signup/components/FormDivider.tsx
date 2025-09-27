'use client'

import React from 'react'

interface FormDividerProps {
  text: string
}

const FormDivider: React.FC<FormDividerProps> = ({ text }) => {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex-1 h-px bg-gray-300"></div>
      <span className="text-xs text-gray-500 px-2">{text}</span>
      <div className="flex-1 h-px bg-gray-300"></div>
    </div>
  )
}

export default FormDivider
