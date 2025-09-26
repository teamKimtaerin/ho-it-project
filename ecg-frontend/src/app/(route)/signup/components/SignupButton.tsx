'use client'

import React from 'react'

interface SignupButtonProps {
  isLoading?: boolean
  disabled?: boolean
}

const SignupButton: React.FC<SignupButtonProps> = ({
  isLoading = false,
  disabled = false,
}) => {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className="w-full h-[50px] bg-gray-900 text-white rounded-lg font-bold text-base hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? '가입 중...' : '회원가입'}
    </button>
  )
}

export default SignupButton
