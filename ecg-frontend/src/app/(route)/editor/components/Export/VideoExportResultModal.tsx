'use client'

import { FaTimes } from 'react-icons/fa'

interface VideoExportResultModalProps {
  isOpen: boolean
  onClose: () => void
  status: 'success' | 'error'
  fileName?: string
}

export default function VideoExportResultModal({
  isOpen,
  onClose,
  status,
  fileName = '파일 영상 (4).mp4',
}: VideoExportResultModalProps) {
  if (!isOpen) return null

  const getStatusMessage = () => {
    return status === 'success'
      ? '영상 출력이 완료되었습니다'
      : '영상 출력이 실패되었습니다'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-medium text-gray-900">안내</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="px-6 pb-6">
          {/* 파일명 */}
          <div className="mb-4">
            <p className="text-sm text-gray-700">{fileName}</p>
          </div>

          {/* 상태 메시지 */}
          <div className="mb-6">
            <p className="text-sm text-gray-700">{getStatusMessage()}</p>
          </div>

          {/* 확인 버튼 */}
          <button
            onClick={onClose}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2.5 px-4 rounded-md font-medium transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
