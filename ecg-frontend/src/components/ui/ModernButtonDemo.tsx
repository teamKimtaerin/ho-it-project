'use client'

import React, { useState } from 'react'
import Button from './Button'

/**
 * Modern Button Design Demo Component
 * 제안된 공통 버튼 디자인 2가지 버전을 보여주는 데모 컴포넌트
 */
const ModernButtonDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)

  const handleLoadingTest = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 3000)
  }

  return (
    <div className="p-8 space-y-8 bg-white rounded-lg border">
      <h2 className="text-2xl font-bold text-gray-900">
        Modern Button Designs
      </h2>

      {/* 디자인 1: 로그인/회원가입 스타일 (브랜드 컬러 적용) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">
          디자인 1: Primary Action (브랜드 컬러)
        </h3>
        <div className="flex space-x-4">
          <Button variant="modern-primary" label="로그인" />
          <Button variant="modern-primary" label="회원가입" size="large" />
          <Button
            variant="modern-primary"
            label="처리 중..."
            isPending={isLoading}
            onClick={handleLoadingTest}
          />
        </div>
      </div>

      {/* 디자인 2: 취소/다음 조합 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">
          디자인 2: Secondary + Primary 조합
        </h3>
        <div className="flex space-x-4">
          <Button variant="modern-secondary" label="취소" />
          <Button variant="modern-primary" label="다음" />
        </div>
        <div className="flex space-x-4">
          <Button variant="modern-secondary" label="뒤로" />
          <Button variant="modern-primary" label="완료" />
        </div>
      </div>

      {/* 추가: Dark 버전 (원본 검은색 디자인) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">
          원본 검은색 디자인
        </h3>
        <div className="flex space-x-4">
          <Button variant="modern-secondary" label="취소" />
          <Button variant="modern-dark" label="로그인 / 회원가입" />
        </div>
      </div>

      {/* 사이즈 변형 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">사이즈 변형</h3>
        <div className="flex items-center space-x-4">
          <Button variant="modern-primary" label="Small" size="small" />
          <Button variant="modern-primary" label="Medium" size="medium" />
          <Button variant="modern-primary" label="Large" size="large" />
        </div>
      </div>

      {/* 상태 테스트 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">상태 테스트</h3>
        <div className="flex space-x-4">
          <Button variant="modern-primary" label="Normal" />
          <Button variant="modern-primary" label="Disabled" isDisabled />
          <Button variant="modern-primary" label="Loading" isPending />
        </div>
      </div>

      {/* CSS 클래스 직접 사용 예시 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">
          CSS 클래스 직접 사용
        </h3>
        <div className="flex space-x-4">
          <button className="btn-modern-secondary">취소</button>
          <button className="btn-modern-primary">다음</button>
          <button className="btn-modern-dark">로그인</button>
        </div>
      </div>
    </div>
  )
}

export default ModernButtonDemo
