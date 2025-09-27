'use client'

import React, { useState, useEffect } from 'react'

export interface TypingTextProps {
  texts: string[]
  className?: string
  typingSpeed?: number
  deleteSpeed?: number
  pauseDuration?: number
  startDelay?: number
}

const TypingText: React.FC<TypingTextProps> = ({
  texts,
  className = '',
  typingSpeed = 100,
  deleteSpeed = 50,
  pauseDuration = 2000,
  startDelay = 0,
}) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setStarted(true)
    }, startDelay)

    return () => clearTimeout(startTimeout)
  }, [startDelay])

  useEffect(() => {
    if (!started) return

    const currentText = texts[currentTextIndex]

    const timeout = setTimeout(
      () => {
        if (isDeleting) {
          // Deleting phase
          if (currentCharIndex > 0) {
            setDisplayedText(currentText.slice(0, currentCharIndex - 1))
            setCurrentCharIndex(currentCharIndex - 1)
          } else {
            // Finished deleting, move to next text
            setIsDeleting(false)
            setCurrentTextIndex((prev) => (prev + 1) % texts.length)
            setCurrentCharIndex(0)
            setDisplayedText('') // Clear text immediately
          }
        } else {
          // Typing phase
          if (currentCharIndex < currentText.length) {
            setDisplayedText(currentText.slice(0, currentCharIndex + 1))
            setCurrentCharIndex(currentCharIndex + 1)
          } else {
            // Finished typing, pause before deleting
            setTimeout(() => setIsDeleting(true), pauseDuration)
          }
        }
      },
      isDeleting ? deleteSpeed : typingSpeed
    )

    return () => clearTimeout(timeout)
  }, [
    currentCharIndex,
    currentTextIndex,
    isDeleting,
    texts,
    typingSpeed,
    deleteSpeed,
    pauseDuration,
    started,
  ])

  return (
    <span className={className}>
      {displayedText}
      {started && <span className="animate-pulse ml-1 text-gray-400">|</span>}
    </span>
  )
}

export default TypingText
