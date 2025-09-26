'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export interface FreeAssetsSectionProps {
  onTryAutoSubtitleClick?: () => void
}

interface AssetPreview {
  id: string
  title: string
  category: string
  description: string
  downloads: number
  likes: number
  iconName: string
  tags: string[]
  isPro: boolean
}

const FreeAssetsSection: React.FC<FreeAssetsSectionProps> = ({
  onTryAutoSubtitleClick,
}) => {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [featuredAssets, setFeaturedAssets] = useState<AssetPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 에셋 데이터 로드
  useEffect(() => {
    const loadFeaturedAssets = async () => {
      try {
        const response = await fetch('/asset-store/assets-database.json')
        const data = await response.json()

        // 인기 에셋 선별 (다운로드 수 기준 상위 12개)
        const popular = data.assets
          .sort((a: any, b: any) => b.downloads - a.downloads)
          .slice(0, 12)
          .map((asset: any) => ({
            id: asset.id,
            title: asset.title,
            category: asset.category,
            description: asset.description,
            downloads: asset.downloads,
            likes: asset.likes,
            iconName: asset.iconName,
            tags: asset.tags,
            isPro: asset.isPro,
          }))

        setFeaturedAssets(popular)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load assets:', error)
        setIsLoading(false)
      }
    }

    loadFeaturedAssets()
  }, [])

  // 카테고리 필터링
  const categories = ['All', 'Smooth', 'Dynamic', 'Unique']
  const filteredAssets =
    selectedCategory === 'All'
      ? featuredAssets
      : featuredAssets.filter((asset) => asset.category === selectedCategory)

  // 에셋 스토어로 이동
  const handleAssetClick = (assetId: string) => {
    router.push(`/asset-store?asset=${assetId}`)
  }

  const handleViewAllAssets = () => {
    router.push('/asset-store')
  }

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto text-center max-w-7xl">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-500 mb-6">
            50+ 무료 애니메이션 이펙트
          </h2>
          <p className="text-base text-black max-w-3xl mx-auto leading-relaxed">
            다양한 무료 이펙트로 영상을 더욱 풍성하게 만드세요.
            <br />
            상업적 이용 가능한 고품질 자막 애니메이션을 무제한으로 활용할 수
            있어요
          </p>
        </div>

        {/* 카테고리 필터 탭 */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-full p-1 shadow-lg border border-gray-200">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {category === 'All'
                  ? '전체'
                  : category === 'Smooth'
                    ? '부드러운'
                    : category === 'Dynamic'
                      ? '역동적'
                      : '독특한'}
              </button>
            ))}
          </div>
        </div>

        {/* 에셋 그리드 */}
        <div className="bg-white rounded-3xl p-8 mx-auto max-w-6xl mb-12 border border-gray-200 shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">이펙트 로딩 중...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredAssets.slice(0, 8).map((asset, index) => (
                <div
                  key={asset.id}
                  onClick={() => handleAssetClick(asset.id)}
                  className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    opacity: 0,
                    animation: `fadeInUp 0.6s ease-out ${index * 100}ms forwards`,
                  }}
                >
                  <div
                    className={`rounded-xl p-6 h-32 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${
                      asset.category === 'Smooth'
                        ? 'bg-gradient-to-br from-blue-50 to-cyan-100 group-hover:from-blue-100 group-hover:to-cyan-200'
                        : asset.category === 'Dynamic'
                          ? 'bg-gradient-to-br from-purple-50 to-pink-100 group-hover:from-purple-100 group-hover:to-pink-200'
                          : 'bg-gradient-to-br from-amber-50 to-orange-100 group-hover:from-amber-100 group-hover:to-orange-200'
                    }`}
                  >
                    {/* 배경 패턴 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent"></div>

                    {/* 제목 */}
                    <h3 className="relative z-10 text-lg font-bold text-gray-800 text-center leading-tight mb-2 group-hover:scale-105 transition-transform duration-300">
                      {asset.title}
                    </h3>

                    {/* 카테고리 텍스트 */}
                    <span
                      className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-full ${
                        asset.category === 'Smooth'
                          ? 'bg-blue-200/80 text-blue-800'
                          : asset.category === 'Dynamic'
                            ? 'bg-purple-200/80 text-purple-800'
                            : 'bg-amber-200/80 text-amber-800'
                      }`}
                    >
                      {asset.category === 'Smooth'
                        ? '부드러운'
                        : asset.category === 'Dynamic'
                          ? '역동적'
                          : '독특한'}
                    </span>
                  </div>

                  {/* 통계 정보 */}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                      <span className="mr-1">📥</span>
                      {asset.downloads.toLocaleString()}
                    </span>
                    <span className="flex items-center">
                      <span className="mr-1">❤️</span>
                      {asset.likes.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA 버튼 */}
        <div className="text-center">
          <button
            onClick={handleViewAllAssets}
            className="px-8 py-3 text-base font-bold bg-purple-600 text-white rounded-full hover:bg-purple-700 hover:scale-105 transition-all shadow-lg hover:shadow-xl cursor-pointer mr-4"
          >
            전체 에셋 스토어 보기
          </button>
          <button
            onClick={onTryAutoSubtitleClick}
            className="px-8 py-3 text-base font-bold bg-white text-black border-2 border-black rounded-full hover:bg-black hover:text-white transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            지금 시작하기
          </button>
        </div>

        {/* 애니메이션 키프레임 */}
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </section>
  )
}

export default FreeAssetsSection
