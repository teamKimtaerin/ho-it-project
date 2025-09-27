import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface TooltipPortalProps {
  children: React.ReactNode
  isVisible: boolean
}

export default function TooltipPortal({
  children,
  isVisible,
}: TooltipPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || !isVisible) {
    return null
  }

  return createPortal(children, document.body)
}
