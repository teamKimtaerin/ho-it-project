'use client'

import React from 'react'
import Image from 'next/image'
import { FaExpand, FaPause, FaPlay } from 'react-icons/fa'

interface YouTubeVideoPreviewProps {
  isPlaying: boolean
  onTogglePlay: () => void
}

export default function YouTubeVideoPreview({
  isPlaying,
  onTogglePlay,
}: YouTubeVideoPreviewProps) {
  return (
    <div className="relative bg-black rounded-lg overflow-hidden w-full">
      <Image
        src="/youtube-upload/sample-thumbnail.png"
        alt="Video preview"
        width={320}
        height={180}
        className="w-full h-auto"
        unoptimized
      />
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
        <button
          onClick={onTogglePlay}
          className="bg-white/20 hover:bg-white/30 rounded-full p-4 transition-colors"
        >
          {isPlaying ? (
            <FaPause className="w-6 h-6 text-white" />
          ) : (
            <FaPlay className="w-6 h-6 text-white ml-1" />
          )}
        </button>
      </div>
      <button className="absolute bottom-3 right-3 text-white/70 hover:text-white">
        <FaExpand className="w-4 h-4" />
      </button>
      {/* 비디오 컨트롤 바 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
        <div className="flex items-center text-white text-sm">
          <span>00:00</span>
          <div className="mx-3 flex-1 h-1 bg-white/30 rounded-full">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: '0%' }}
            ></div>
          </div>
          <span>02:23</span>
        </div>
      </div>
    </div>
  )
}
