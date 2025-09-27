'use client'

import React from 'react'

interface LoginLinkProps {
  onLoginRedirect: () => void
}

const LoginLink: React.FC<LoginLinkProps> = ({ onLoginRedirect }) => {
  return (
    <div className="text-center mt-8">
      <span className="text-sm text-gray-500">이미 계정이 있으신가요? </span>
      <button
        onClick={onLoginRedirect}
        className="text-sm font-medium text-blue-500 hover:text-blue-700 transition-colors"
      >
        앱으로 돌아가서 로그인
      </button>
    </div>
  )
}

export default LoginLink
