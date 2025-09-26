'use client'

import React from 'react'
import GoogleSignInButton from './GoogleSignInButton'

interface GoogleLoginButtonProps {
  disabled?: boolean
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <GoogleSignInButton text="signin_with" disabled={disabled} />
    </div>
  )
}

export default GoogleLoginButton
