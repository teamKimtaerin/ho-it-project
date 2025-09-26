import { create } from 'zustand'
import { showToast } from '@/utils/ui/toast'
import { useProgressStore } from './progressStore'

interface ToastTimerState {
  isActive: boolean
}

interface ToastTimerActions {
  startDelayedToast: (message: string, delayMs: number) => void
  cancelDelayedToast: () => void
  checkPendingToast: () => void
}

type ToastTimerStore = ToastTimerState & ToastTimerActions

// localStorage 키 상수
const STORAGE_KEY = 'ecg-delayed-toast'
const LAST_TOAST_KEY = 'ecg-last-toast-time'
const TOAST_DEBOUNCE_TIME = 1000 // 1초

// localStorage 유틸리티 함수들
const getStoredToastData = () => {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

const setStoredToastData = (data: {
  startTime: number
  message: string
  delayMs: number
}) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log('🔔 [ToastTimer] 저장됨:', data)
  } catch (error) {
    console.error('🚨 [ToastTimer] localStorage 저장 실패:', error)
  }
}

const clearStoredToastData = () => {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('🗑️ [ToastTimer] localStorage 정리됨')
  } catch (error) {
    console.error('🚨 [ToastTimer] localStorage 정리 실패:', error)
  }
}

const getLastToastTime = () => {
  if (typeof window === 'undefined') return 0

  try {
    const time = localStorage.getItem(LAST_TOAST_KEY)
    return time ? parseInt(time) : 0
  } catch {
    return 0
  }
}

const setLastToastTime = (time: number) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(LAST_TOAST_KEY, time.toString())
  } catch (error) {
    console.error('🚨 [ToastTimer] 마지막 토스트 시간 저장 실패:', error)
  }
}

const useToastTimerStore = create<ToastTimerStore>()((set, get) => ({
  // State
  isActive: false,

  // Actions
  startDelayedToast: (message: string, delayMs: number) => {
    console.log('🚀 [ToastTimer] 지연 토스트 시작:', { message, delayMs })

    // 기존 토스트 취소
    get().cancelDelayedToast()

    const startTime = Date.now()

    // localStorage에 토스트 정보 저장
    setStoredToastData({
      startTime,
      message,
      delayMs,
    })

    set({ isActive: true })

    console.log('✅ [ToastTimer] 타이머 활성화됨, 체크 주기: 1초')
  },

  cancelDelayedToast: () => {
    console.log('❌ [ToastTimer] 토스트 취소됨')

    clearStoredToastData()
    set({ isActive: false })
  },

  checkPendingToast: () => {
    const toastData = getStoredToastData()

    if (!toastData) {
      // 대기 중인 토스트가 없으면 비활성화
      if (get().isActive) {
        set({ isActive: false })
      }
      return
    }

    const { startTime, message, delayMs } = toastData
    const currentTime = Date.now()
    const elapsedTime = currentTime - startTime

    // 디버깅 로그 (5초마다만 출력)
    if (
      Math.floor(elapsedTime / 5000) > Math.floor((elapsedTime - 1000) / 5000)
    ) {
      console.log('⏰ [ToastTimer] 진행 상황:', {
        elapsedTime: Math.floor(elapsedTime / 1000) + '초',
        remainingTime: Math.floor((delayMs - elapsedTime) / 1000) + '초',
        message,
      })
    }

    if (elapsedTime >= delayMs) {
      // 시간이 경과했으면 토스트 표시
      const lastToastTime = getLastToastTime()

      if (currentTime - lastToastTime > TOAST_DEBOUNCE_TIME) {
        console.log('🎉 [ToastTimer] 토스트 표시:', message)
        showToast(message, 'success')
        setLastToastTime(currentTime)

        // 내보내기 완료 메시지인 경우 알림 설정
        if (message.includes('영상 출력이 완료되었습니다')) {
          console.log('🔔 [ToastTimer] 내보내기 완료 알림 설정')
          // progressStore의 setExportNotification을 직접 호출
          const { setExportNotification } = useProgressStore.getState()
          setExportNotification(true)
        }
      } else {
        console.log('⏭️ [ToastTimer] 중복 방지로 토스트 스킵')
      }

      // 완료 후 정리
      clearStoredToastData()
      set({ isActive: false })
    } else {
      // 아직 시간이 안됐으면 활성 상태 유지
      set({ isActive: true })
    }
  },
}))

export { useToastTimerStore }
export type { ToastTimerStore }
