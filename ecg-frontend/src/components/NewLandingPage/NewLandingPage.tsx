'use client'

import React from 'react'
import Header from './Header'
import HeroSection from './HeroSection'
// import AISubtitleSection from './AISubtitleSection'
import DynamicSubtitleSection from './DynamicSubtitleSection'
import CustomEditingSection from './CustomEditingSection'
import FreeAssetsSection from './FreeAssetsSection'
import Footer from './Footer'
import { type User } from '@/lib/api/auth'

export interface NewLandingPageProps {
  // Header event handlers
  onTryClick?: () => void
  onLoginClick?: () => void

  // Hero section event handlers
  onQuickStartClick?: () => void

  // Dynamic subtitle section event handlers
  onApplyDynamicSubtitleClick?: () => void

  // Custom editing section event handlers
  onCustomEditingQuickStartClick?: () => void

  // Free assets section event handlers
  onTryAutoSubtitleClick?: () => void

  // Auth state
  isLoggedIn?: boolean
  user?: User | null
  isLoading?: boolean
}

const NewLandingPage: React.FC<NewLandingPageProps> = ({
  onTryClick,
  onLoginClick,
  onQuickStartClick,
  onApplyDynamicSubtitleClick,
  onCustomEditingQuickStartClick,
  onTryAutoSubtitleClick,
  isLoggedIn = false,
  user = null,
  isLoading = false,
}) => {
  return (
    <div className="min-h-screen bg-white text-black">
      <Header
        onTryClick={onTryClick}
        onLoginClick={onLoginClick}
        isLoggedIn={isLoggedIn}
        user={user}
        isLoading={isLoading}
      />

      <HeroSection onQuickStartClick={onQuickStartClick} />

      {/* <AISubtitleSection /> */}

      <DynamicSubtitleSection
        onApplyDynamicSubtitleClick={onApplyDynamicSubtitleClick}
      />

      <CustomEditingSection
        onQuickStartClick={onCustomEditingQuickStartClick}
      />

      <FreeAssetsSection onTryAutoSubtitleClick={onTryAutoSubtitleClick} />

      <Footer />
    </div>
  )
}

export default NewLandingPage
