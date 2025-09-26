'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NewLandingPage } from '@/components/NewLandingPage'
import WelcomeModal from '@/components/WelcomeModal'
import { useAuthStatus } from '@/hooks/useAuthStatus'

const TERMS_AGREEMENT_KEY = 'coup-terms-agreed'

export default function Home() {
  const router = useRouter()
  const { isLoggedIn, user, isLoading } = useAuthStatus()
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false)

  // 페이지 로드 시 약관 동의 상태 확인
  useEffect(() => {
    // TODO: localStorage 대신 DB에서 사용자의 약관 동의 상태를 확인하도록 변경
    // - 사용자 인증 상태 확인 후 API 호출
    // - GET /api/user/terms-agreement 또는 사용자 프로필에서 약관 동의 여부 확인
    // - 로그인하지 않은 사용자의 경우 localStorage 사용 (임시)
    if (typeof window !== 'undefined') {
      const agreed = localStorage.getItem(TERMS_AGREEMENT_KEY)
      setHasAgreedTerms(agreed === 'true')
    }
  }, [])
  const handleTryClick = () => {
    console.log('Try button clicked')
    if (hasAgreedTerms) {
      // 이미 동의한 사용자는 바로 에디터로 이동
      router.push('/editor')
    } else {
      // 처음 사용자는 약관 동의 모달 표시
      setShowWelcomeModal(true)
    }
  }

  const handleLoginClick = () => {
    console.log('Login button clicked')
    router.push('/auth')
  }

  const handleQuickStartClick = () => {
    console.log('Quick start button clicked')
    if (isLoggedIn) {
      // 로그인된 사용자는 바로 에디터로 이동
      router.push('/editor')
    } else {
      // 로그인되지 않은 사용자는 로그인 페이지로 이동
      router.push('/auth')
    }
  }

  const handleApplyDynamicSubtitleClick = () => {
    console.log('Apply dynamic subtitle button clicked')
    // Add navigation logic here
  }

  const handleCustomEditingQuickStartClick = () => {
    console.log('Custom editing quick start button clicked')
    // Add navigation logic here
  }

  const handleTryAutoSubtitleClick = () => {
    console.log('Try auto subtitle button clicked')
    router.push('/asset-store')
  }

  return (
    <>
      <NewLandingPage
        onTryClick={handleTryClick}
        onLoginClick={handleLoginClick}
        onQuickStartClick={handleQuickStartClick}
        onApplyDynamicSubtitleClick={handleApplyDynamicSubtitleClick}
        onCustomEditingQuickStartClick={handleCustomEditingQuickStartClick}
        onTryAutoSubtitleClick={handleTryAutoSubtitleClick}
        isLoggedIn={isLoggedIn}
        user={user}
        isLoading={isLoading}
      />

      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onAgreeAndStart={() => {
          // TODO: localStorage 대신 DB에 약관 동의 상태 저장하도록 변경
          // - POST /api/user/terms-agreement API 호출
          // - 사용자가 로그인된 경우 DB에 저장, 미로그인 시 localStorage 사용
          // - 약관 동의 날짜/시간도 함께 저장하여 추후 약관 변경 시 재동의 요청 가능
          localStorage.setItem(TERMS_AGREEMENT_KEY, 'true')
          setHasAgreedTerms(true)
          setShowWelcomeModal(false)
          // Navigate to editor page
          router.push('/editor')
        }}
        onGoBack={() => setShowWelcomeModal(false)}
      />
    </>
  )
}
