'use client'

import { useEffect, useRef } from 'react'
import { useToastTimerStore } from '@/lib/store/toastTimerStore'

/**
 * 전역 토스트 타이머를 관리하는 컴포넌트
 * localStorage 기반으로 1초마다 대기 중인 토스트를 체크합니다.
 * 페이지 이동과 무관하게 작동합니다.
 */
export default function GlobalToastTimer() {
  const { checkPendingToast } = useToastTimerStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    console.log('🔧 [GlobalToastTimer] 초기화됨')

    // 1초마다 대기 중인 토스트 체크
    intervalRef.current = setInterval(() => {
      checkPendingToast()
    }, 1000)

    // 즉시 한 번 체크 (페이지 로드 시 기존 대기 토스트 복구용)
    checkPendingToast()

    console.log('⚡ [GlobalToastTimer] 1초 간격 체크 시작됨')

    // cleanup 함수 - 브라우저 탭 닫기나 새로고침 시에만 실행
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        console.log('🛑 [GlobalToastTimer] interval 정리됨')
      }
    }
  }, [checkPendingToast])

  // 이 컴포넌트는 UI를 렌더링하지 않고 로직만 처리
  return null
}
