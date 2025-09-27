'use client'

import React from 'react'
import Image from 'next/image'
import { FaPlay } from 'react-icons/fa'
import { YouTubeUploadData } from '../ExportTypes'

interface YouTubeUploadCompleteProps {
  data: YouTubeUploadData
  onClose: () => void
}

export default function YouTubeUploadComplete({
  data,
  onClose,
}: YouTubeUploadCompleteProps) {
  return (
    <div className="flex h-full">
      {/* 좌측 - 완료된 비디오 */}
      <div className="w-2/5 p-6 flex items-center justify-center">
        <div className="relative bg-black rounded-lg overflow-hidden w-full max-w-sm">
          <Image
            src="/youtube-upload/sample-thumbnail.png"
            alt="Uploaded video"
            width={320}
            height={180}
            className="w-full h-auto"
            unoptimized
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex items-center text-white text-sm">
              <FaPlay className="w-3 h-3 mr-2" />
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
      </div>

      {/* 우측 - 완료 정보 */}
      <div className="w-3/5 p-6 overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-black">YouTube 채널</h3>

          <div>
            <div className="flex items-center mb-2">
              <span className="text-gray-600 text-sm mr-2">🎬</span>
              <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                <option>테스트테스트</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-black mb-2 block">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.title}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {data.title.length}/100
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-black mb-2 block">
              설명
            </label>
            <textarea
              value={data.description}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black resize-none"
              rows={4}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {data.description.length}/5000
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-black mb-3 block">
              동영상 커버
            </label>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">
                커버로 사용할 이미지를 선택하세요.
              </p>
              <div className="w-24 h-16 bg-gray-200 rounded border-2 border-blue-500 overflow-hidden">
                <Image
                  src="/youtube-upload/sample-thumbnail.png"
                  alt="Video thumbnail"
                  width={96}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-cyan-400 hover:bg-cyan-500 text-white font-medium py-3 rounded-lg transition-colors duration-200"
          >
            공유
          </button>
        </div>
      </div>
    </div>
  )
}
