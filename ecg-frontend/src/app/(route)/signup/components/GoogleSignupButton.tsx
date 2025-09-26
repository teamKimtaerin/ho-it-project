'use client'

import React from 'react'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'

interface GoogleSignupButtonProps {
  disabled?: boolean
}

const GoogleSignupButton: React.FC<GoogleSignupButtonProps> = ({
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <GoogleSignInButton text="signup_with" disabled={disabled} />
    </div>
  )
}

export default GoogleSignupButton
