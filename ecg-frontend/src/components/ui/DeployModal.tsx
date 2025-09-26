'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  LuCheck,
  LuCopy,
  LuExternalLink,
  LuGlobe,
  LuPlay,
  LuX,
} from 'react-icons/lu'

export interface DeployTask {
  id: number
  filename: string
  title?: string
  thumbnail?: string
}

export interface DeployModalProps {
  isOpen: boolean
  onClose: () => void
  project: DeployTask | null
}

type DeployStep = 'config' | 'deploying' | 'completed'

const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [currentStep, setCurrentStep] = useState<DeployStep>('config')
  const [deployProgress, setDeployProgress] = useState(0)
  const [deployUrl, setDeployUrl] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [deployConfig, setDeployConfig] = useState({
    title: '',
    description: '',
    isPublic: true,
    allowDownload: false,
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ESC 키로 모달 닫기 (배포 진행 중에는 비활성화)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && currentStep !== 'deploying') {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  // 모달이 처음 열릴 때만 초기화
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    if (isOpen && project && !hasInitialized) {
      // 처음 열릴 때만 모든 상태 초기화
      setCurrentStep('config')
      setDeployProgress(0)
      setDeployUrl('')
      setCopiedUrl(false)
      setDeployConfig({
        title: project.title || project.filename.replace(/\.[^/.]+$/, ''),
        description: '',
        isPublic: true,
        allowDownload: false,
      })
      setHasInitialized(true)
    }
  }, [isOpen, project, hasInitialized])

  // 모달이 완전히 닫힐 때만 초기화 플래그 리셋
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false)
    }
  }, [isOpen])

  const handleDeploy = () => {
    setCurrentStep('deploying')

    // 배포 진행률 시뮬레이션
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setTimeout(() => {
          setDeployUrl(
            `https://hoit.video/watch/${Math.random().toString(36).substring(7)}`
          )
          setCurrentStep('completed')
        }, 500)
      }
      setDeployProgress(Math.min(progress, 100))
    }, 300)
  }

  const handleCopyUrl = async () => {
    if (deployUrl) {
      try {
        await navigator.clipboard.writeText(deployUrl)
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } catch (err) {
        console.error('Failed to copy URL:', err)
      }
    }
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setCurrentStep('config')
      setDeployProgress(0)
      setDeployUrl('')
    }, 200)
  }

  const handleCompleteClose = () => {
    onClose()
    // 완료 후 닫을 때는 상태를 초기화해서 다음에 깨끗하게 시작
    setTimeout(() => {
      setCurrentStep('config')
      setDeployProgress(0)
      setDeployUrl('')
      setCopiedUrl(false)
    }, 200)
  }

  if (!isOpen || !isMounted || !project) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
      onClick={(e) => {
        // 배포 진행 중에는 모달 닫기 방지
        if (currentStep === 'deploying') return

        // 배경 클릭 시에만 모달 닫기
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <LuGlobe className="w-4 h-4 text-brand-main" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              프로젝트 배포
            </h2>
          </div>
          {/* 배포 진행 중에는 X 버튼 숨김 */}
          {currentStep !== 'deploying' && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LuX className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Project Info */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <LuPlay className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {project.filename}
                </h3>
                <p className="text-sm text-gray-500">준비된 프로젝트</p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 'config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목{' '}
                  {deployConfig.title && `(${deployConfig.title.length}자)`}
                </label>
                <input
                  type="text"
                  value={deployConfig.title}
                  onChange={(e) => {
                    console.log('Title input changed:', e.target.value)
                    setDeployConfig((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  placeholder="프로젝트 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명 (선택){' '}
                  {deployConfig.description &&
                    `(${deployConfig.description.length}자)`}
                </label>
                <textarea
                  value={deployConfig.description}
                  onChange={(e) => {
                    console.log('Description input changed:', e.target.value)
                    setDeployConfig((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black placeholder:text-gray-400 placeholder:text-sm"
                  rows={3}
                  placeholder="프로젝트에 대한 설명을 입력하세요"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      공개 설정
                    </label>
                    <p className="text-xs text-gray-500">
                      다른 사람들이 볼 수 있습니다
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setDeployConfig((prev) => ({
                        ...prev,
                        isPublic: !prev.isPublic,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      deployConfig.isPublic ? 'bg-brand-main' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        deployConfig.isPublic
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      다운로드 허용
                    </label>
                    <p className="text-xs text-gray-500">
                      다른 사람들이 다운로드할 수 있습니다
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setDeployConfig((prev) => ({
                        ...prev,
                        allowDownload: !prev.allowDownload,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      deployConfig.allowDownload
                        ? 'bg-brand-main'
                        : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        deployConfig.allowDownload
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'deploying' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  배포 진행 중...
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  프로젝트를 배포하고 있습니다
                </p>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-brand-main h-2 rounded-full transition-all duration-300"
                    style={{ width: `${deployProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {Math.round(deployProgress)}% 완료
                </p>
              </div>
            </div>
          )}

          {currentStep === 'completed' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <LuCheck className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  배포 완료!
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  프로젝트가 성공적으로 배포되었습니다
                </p>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-brand-main font-mono truncate">
                      {deployUrl}
                    </code>
                    <button
                      onClick={handleCopyUrl}
                      className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {copiedUrl ? (
                        <LuCheck className="w-4 h-4 text-green-600" />
                      ) : (
                        <LuCopy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      window.open(
                        'https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Faction_handle_signin%3Dtrue%26app%3Ddesktop%26hl%3Dko%26next%3Dhttps%253A%252F%252Fstudio.youtube.com%252F%26feature%3Dredirect_login&hl=ko&ifkv=AfYwgwV60hq6GwtJHfuCQ2DsY9YA6GggwGxABs6J4GIu5YYKRW9CTj8SrwikevHGhDm6CopJihVKiQ&passive=true&service=youtube&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin&dsh=S706189090%3A1758390747331598',
                        '_blank'
                      )
                    }
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 text-base font-bold bg-black text-white border-2 border-black rounded-full hover:bg-gray-800 hover:border-gray-800 transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <LuExternalLink className="w-4 h-4" />
                    <span>YouTube로 이동</span>
                  </button>
                  <button
                    onClick={handleCopyUrl}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 text-base font-medium text-black border-2 border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <LuCopy className="w-4 h-4" />
                    <span>링크 복사</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep === 'config' && (
          <div className="flex-shrink-0 flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-base font-medium text-black border-2 border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleDeploy}
              disabled={!deployConfig.title.trim()}
              className={`px-6 py-2.5 text-base font-bold rounded-full transition-all shadow-md hover:shadow-lg ${
                deployConfig.title.trim()
                  ? 'bg-black text-white border-2 border-black hover:bg-gray-800 hover:border-gray-800 cursor-pointer'
                  : 'bg-gray-300 text-gray-500 border-2 border-gray-300 cursor-not-allowed'
              }`}
              title={
                deployConfig.title.trim() ? '배포하기' : '제목을 입력해주세요'
              }
            >
              배포하기 {deployConfig.title.trim() && '✓'}
            </button>
          </div>
        )}

        {currentStep === 'completed' && (
          <div className="flex-shrink-0 flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={handleCompleteClose}
              className="px-6 py-2.5 text-base font-bold bg-black text-white border-2 border-black rounded-full hover:bg-gray-800 hover:border-gray-800 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              완료
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default DeployModal
