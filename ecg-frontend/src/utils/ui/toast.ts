export const showToast = (
  message: string,
  type: 'success' | 'error' | 'warning' = 'error'
) => {
  // 토스트 컨테이너 확인/생성
  let toastContainer = document.getElementById('toast-container')
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'toast-container'
    toastContainer.className =
      'fixed top-20 right-4 z-[9999] flex flex-col gap-2'
    document.body.appendChild(toastContainer)
  }

  // 토스트 엘리먼트 생성
  const toast = document.createElement('div')
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  toast.id = toastId

  const bgColor =
    type === 'success'
      ? 'bg-green-600/90'
      : type === 'warning'
        ? 'bg-yellow-600/90'
        : 'bg-red-600/90'

  toast.className = `${bgColor} px-4 py-3 rounded-xl shadow-lg transition-all duration-500 ease-out backdrop-blur-sm border border-gray-600/20 font-medium text-white`
  toast.textContent = message

  // 초기 위치를 오른쪽 화면 밖으로 설정
  toast.style.transform = 'translateX(100%)'
  toast.style.opacity = '0'

  // 컨테이너에 추가 (가장 아래쪽에)
  toastContainer.appendChild(toast)

  // 즉시 슬라이드 인 애니메이션 시작
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.style.transform = 'translateX(0)'
      toast.style.opacity = '1'
    }
  }, 10)

  // 2초 후 슬라이드 아웃 애니메이션으로 제거
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.style.transform = 'translateX(100%)'
      toast.style.opacity = '0'
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)

          // 컨테이너가 비어있으면 제거
          if (toastContainer && toastContainer.children.length === 0) {
            toastContainer.remove()
          }
        }
      }, 1000)
    }
  }, 2000)
}
