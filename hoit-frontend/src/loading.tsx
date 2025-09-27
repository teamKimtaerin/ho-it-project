import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-gray-50">
      <LoadingSpinner
        size="lg"
        message="페이지를 불러오고 있습니다..."
        showLogo={true}
        variant="fullscreen"
      />
    </div>
  )
}
