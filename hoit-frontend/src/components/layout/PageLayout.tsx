'use client'

import React from 'react'
import Header from '../NewLandingPage/Header'
import Footer from '../NewLandingPage/Footer'

export interface PageLayoutProps {
  children: React.ReactNode
  onTryClick?: () => void
  onLoginClick?: () => void
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  onTryClick,
  onLoginClick,
}) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header onTryClick={onTryClick} onLoginClick={onLoginClick} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default PageLayout
