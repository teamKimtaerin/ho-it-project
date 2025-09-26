'use client'

import Modal from '@/components/ui/Modal'
import React, { useState } from 'react'
import { LuCheck } from 'react-icons/lu'

export interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onAgreeAndStart?: () => void
  onGoBack?: () => void
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onAgreeAndStart,
  onGoBack,
}) => {
  const [isAgreed, setIsAgreed] = useState(false)

  const handleAgreeAndStart = () => {
    if (isAgreed) {
      onAgreeAndStart?.()
    }
  }

  const handleGoBack = () => {
    onGoBack?.()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      closeOnBackdropClick={false}
      closeOnEsc={true}
      scrollable={true}
      className="w-[700px] max-w-[90vw] max-h-[90vh]"
      aria-label="환영 메시지"
    >
      <div className="p-12 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">
            Hoit에 오신 것을 환영합니다!
          </h1>
          <p className="text-sm text-gray-600">
            Hoit을 사용하시기 전에 아래 이용약관 및 개인정보처리방침을
            확인해주세요.
          </p>
        </div>

        {/* Terms Section */}
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-gray-800">이용약관</h2>
              <div className="w-4 h-4 bg-gray-600 rounded-sm"></div>
            </div>

            <div className="text-xs text-gray-600 leading-relaxed space-y-3">
              <p>
                (주)김태린(이하 &quot;회사&quot;)가 제공하는 Hoit(이하
                &quot;서비스&quot;)를 이용해 주셔서 감사합니다. 본 이용약관은
                서비스의 이용과 관련하여 회사와 사용자 간에 체결되는 계약입니다.
                사용자란 본 약관에 동의하고 서비스를 설치 및 사용하는 개인, 기업
                및 기 관 등 모든 사용자를 통칭하며, 사용자가 본 서비스를
                이용하기 위해서는 본 이용약관에 동의해야 합니다.
              </p>

              <p className="font-medium">1. 서비스의 소개 및 이용 방식</p>

              <p>
                본 서비스는 인공지능 기술을 통해 음성 인식 기반 자동 자막 생성
                기능 및 텍스트 인력을 통한 음성 합성 기능, 음성생성 기 능,
                클라우드 서비스 등을 제공하는 영상 편집 프로그램입니다. 회사는
                본 서비스를 다양한 운영 체제에서 실시를 통해 실 행이 가능한
                파일과 웹 브라우저에서 제원할 수 있는 형태와 데스크톱 및 모바일
                기기에서 다운받아 실행할 수 있는 프로그 램으로 제공합니다.
              </p>

              <p>
                2. 본 서비스는 법령에서 정한 적법한 범위 내에서 이용하는 시간과
                공간의 제한 없이 연중 어디서나 이용 가능합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-gray-800">
                개인정보처리방침
              </h2>
              <div className="w-4 h-4 bg-gray-600 rounded-sm"></div>
            </div>

            <div className="text-xs text-gray-600 leading-relaxed space-y-3">
              <p>
                (주)김태린(이하 &quot;회사&quot;)는 Hoit(이하
                &quot;서비스&quot;)를 제공하면서 사용자의 개인정보보호를 매우
                중요하게 생각하며, 「정보 통신망 이용촉진 및 정보보호 등에 관한
                법률」, 「개인정보 보호법」 등 관련법규를 준수하기 위하여
                개인정보처리방침(이하 &quot;방 침&quot;)을 제정하고 이를
                준수하고 있습니다.
              </p>

              <p>
                회사의 개인정보처리방침은 관련 법률 및 지침의 변경이나 회사 내부
                운영방침의 변경 등으로 인하여 개정될 수 있습니다. 본 방침이
                변경될 경우 변경사항은 홈페이지에 게시됩니다. 본 방침에 대해
                궁금한 것이 있는 경우 서비스 홈페이지 및 회사 홈페이지 내
                고객문의 채널을 통해 의견을 제공하실 수 있습니다.
              </p>

              <p className="font-medium">
                1. 개인정보의 수집 항목 및 이용 목적
              </p>

              <p>
                회사는 서비스를 제공하기 위해서 다음과 같이 최소한의
                개인정보만을 수집하고 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Agreement Checkbox */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsAgreed(!isAgreed)}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
              isAgreed ? 'bg-gray-800' : 'bg-gray-200 border border-gray-300'
            }`}
          >
            {isAgreed && <LuCheck className="w-5 h-5 text-white font-bold" />}
          </button>
          <span className="text-gray-800 text-sm">
            위 내용을 모두 확인했으며 동의합니다.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleAgreeAndStart}
            disabled={!isAgreed}
            className={`w-full h-12 rounded-lg font-semibold text-base transition-colors ${
              isAgreed
                ? 'bg-gray-900 text-white hover:bg-gray-800 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            동의하고 시작
          </button>

          <div className="text-center">
            <button
              onClick={handleGoBack}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
            >
              뒤로가기
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default WelcomeModal
