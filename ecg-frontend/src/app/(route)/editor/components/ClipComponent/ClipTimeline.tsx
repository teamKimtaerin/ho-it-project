import React from 'react'

interface ClipTimelineProps {
  index: number
  clipId: string
  timeline: string
}

export default function ClipTimeline({ index, timeline }: ClipTimelineProps) {
  return (
    <div className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
      <span className="font-medium">#{index}</span>
      <span className="text-gray-600">{timeline}</span>
    </div>
  )
}
