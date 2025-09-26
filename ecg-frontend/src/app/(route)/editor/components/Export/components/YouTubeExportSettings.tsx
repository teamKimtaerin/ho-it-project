'use client'

import Image from 'next/image'
import { FaArrowLeft, FaChevronDown } from 'react-icons/fa'
import { YouTubeUploadSettings } from '../ExportTypes'

interface YouTubeExportSettingsProps {
  settings: YouTubeUploadSettings
  onSettingsChange: (field: keyof YouTubeUploadSettings, value: string) => void
  onNext: () => void
  onClose: () => void
}

export default function YouTubeExportSettings({
  settings,
  onSettingsChange,
  onNext,
  onClose,
}: YouTubeExportSettingsProps) {
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200 flex items-center">
        <button
          onClick={onClose}
          className="mr-3 text-gray-600 hover:text-black transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-medium text-black">내보내기 설정</h2>
      </div>

      <div
        className="p-4 overflow-y-auto"
        style={{ maxHeight: 'calc(80vh - 60px)' }}
      >
        {/* 동영상 커버 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-black mb-3">동영상 커버</h3>
          <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
            <Image
              src="/youtube-upload/sample-thumbnail.png"
              alt="Video thumbnail"
              width={320}
              height={80}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        </div>

        {/* 제목 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-black mb-2">제목</h3>
          <input
            type="text"
            value={settings.title}
            onChange={(e) => onSettingsChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-gray-50"
            placeholder="동영상 제목을 입력하세요"
          />
        </div>

        {/* 해상도 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-black mb-2">해상도</h3>
          <div className="relative">
            <select
              value={settings.resolution}
              onChange={(e) =>
                onSettingsChange(
                  'resolution',
                  e.target.value as YouTubeUploadSettings['resolution']
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-gray-50 appearance-none cursor-pointer"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4K">4K</option>
            </select>
            <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          </div>
        </div>

        {/* 품질 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-black mb-2">품질</h3>
          <div className="relative">
            <select
              value={settings.quality}
              onChange={(e) =>
                onSettingsChange(
                  'quality',
                  e.target.value as YouTubeUploadSettings['quality']
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-gray-50 appearance-none cursor-pointer"
            >
              <option value="추천 품질">추천 품질</option>
              <option value="고품질">고품질</option>
              <option value="최고 품질">최고 품질</option>
            </select>
            <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          </div>
        </div>

        {/* 프레임 속도 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-black mb-2">프레임 속도</h3>
          <div className="relative">
            <select
              value={settings.frameRate}
              onChange={(e) =>
                onSettingsChange(
                  'frameRate',
                  e.target.value as YouTubeUploadSettings['frameRate']
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-gray-50 appearance-none cursor-pointer"
            >
              <option value="30fps">30fps</option>
              <option value="60fps">60fps</option>
            </select>
            <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          </div>
        </div>

        {/* 형식 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-black mb-2">형식</h3>
          <div className="relative">
            <select
              value={settings.format}
              onChange={(e) =>
                onSettingsChange(
                  'format',
                  e.target.value as YouTubeUploadSettings['format']
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-gray-50 appearance-none cursor-pointer"
            >
              <option value="MP4">MP4</option>
              <option value="MOV">MOV</option>
            </select>
            <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
          </div>
        </div>

        {/* 내보내기 버튼 */}
        <button
          onClick={onNext}
          className="w-full bg-cyan-400 hover:bg-cyan-500 text-white font-medium py-3 rounded-lg transition-colors duration-200"
        >
          내보내기
        </button>
      </div>
    </>
  )
}
