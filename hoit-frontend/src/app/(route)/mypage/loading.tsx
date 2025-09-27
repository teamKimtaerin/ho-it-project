import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner
        size="lg"
        message="마이페이지를 불러오고 있습니다..."
        showLogo={true}
        variant="default"
      />
    </div>
  )
}
