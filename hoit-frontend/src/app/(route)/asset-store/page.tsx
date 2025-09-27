'use client'

import { AssetCard } from '@/app/(route)/asset-store/components/AssetCard'
import { AssetModal } from '@/app/(route)/asset-store/components/AssetModal'
import { AssetSidebar } from '@/app/(route)/asset-store/components/AssetSidebar'
import { AssetCreationModal } from '@/app/(route)/asset-store/components/creation'
import Header from '@/components/NewLandingPage/Header'
import { TRANSITIONS } from '@/lib/utils'
import { AssetItem } from '@/types/asset-store'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { LuSearch, LuChevronDown } from 'react-icons/lu'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import {
  addFavorite as addFavoriteApi,
  getAssets as fetchAssets,
  removeFavorite as removeFavoriteApi,
} from '@/services/assetsService'
import { showToast } from '@/utils/ui/toast'

// 메인 페이지 컴포넌트
export default function AssetPage() {
  const router = useRouter()
  const { isLoggedIn, user, isLoading: authLoading } = useAuthStatus()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [sortOrder, setSortOrder] = useState('favorites') // 기본값: 즐겨찾기
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [contentType, setContentType] = useState<'effects' | 'templates'>(
    'effects'
  ) // 트/템플릿 토글

  const [assets, setAssets] = useState<AssetItem[]>([])
  const [templates, setTemplates] = useState<AssetItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set())

  // 현재 데이터 소스 결정
  const currentData = contentType === 'effects' ? assets : templates
  console.log(
    'Current content type:',
    contentType,
    'Data length:',
    currentData.length
  )

  // 카테고리 필터 버튼 목록 - 이펙트/템플릿에 따라 동적으로 계산
  const categoryFilters = useMemo(() => {
    if (contentType === 'effects') {
      return [
        { id: 'All', label: '전체', count: assets.length },
        {
          id: 'Smooth',
          label: '부드러운',
          count: assets.filter((asset) => asset.category === 'Smooth').length,
        },
        {
          id: 'Dynamic',
          label: '역동적',
          count: assets.filter((asset) => asset.category === 'Dynamic').length,
        },
        {
          id: 'Unique',
          label: '독특한',
          count: assets.filter((asset) => asset.category === 'Unique').length,
        },
        {
          id: 'Text',
          label: '텍스트 효과',
          count: assets.filter((asset) => asset.tags?.includes('text')).length,
        },
        {
          id: 'CWI',
          label: 'CWI 전용',
          count: assets.filter((asset) => asset.tags?.includes('cwi')).length,
        },
        {
          id: 'Animation',
          label: '애니메이션',
          count: assets.filter(
            (asset) =>
              asset.tags?.includes('gsap') || asset.tags?.includes('animation')
          ).length,
        },
        {
          id: 'Popular',
          label: '인기',
          count: assets.filter((asset) => (asset.downloads || 0) > 1000).length,
        },
      ]
    } else {
      // 템플릿용 카테고리
      return [
        { id: 'All', label: '전체', count: templates.length },
        {
          id: 'Cards',
          label: '카드',
          count: templates.filter((template) => template.category === 'Cards')
            .length,
        },
        {
          id: 'Effects',
          label: '이펙트',
          count: templates.filter((template) => template.category === 'Effects')
            .length,
        },
        {
          id: 'Basic',
          label: '기본',
          count: templates.filter((template) => template.category === 'Basic')
            .length,
        },
        {
          id: 'Themes',
          label: '테마',
          count: templates.filter((template) => template.category === 'Themes')
            .length,
        },
        {
          id: 'Modern',
          label: '모던',
          count: templates.filter((template) => template.category === 'Modern')
            .length,
        },
        {
          id: 'Retro',
          label: '레트로',
          count: templates.filter((template) => template.category === 'Retro')
            .length,
        },
      ]
    }
  }, [contentType, assets, templates])

  useEffect(() => {
    if (authLoading) {
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)

        const assetsData = await fetchAssets()
        setAssets(assetsData)
        setUserFavorites(
          new Set(
            assetsData.filter((asset) => asset.isFavorite).map((a) => a.id)
          )
        )

        const templatesResponse = await fetch(
          '/asset-store/templates-database.json'
        )
        const templatesData = await templatesResponse.json()
        console.log('Loaded templates:', templatesData.templates)
        setTemplates(templatesData.templates)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load data:', error)
        setIsLoading(false)
      }
    }

    loadData()
  }, [authLoading, isLoggedIn])
  useEffect(() => {
    if (!isLoggedIn) {
      setUserFavorites(new Set())
      setAssets((prev) =>
        prev.map((asset) => ({ ...asset, isFavorite: false }))
      )
    }
  }, [isLoggedIn])

  // selectedAsset의 즐겨찾기 상태를 userFavorites와 동기화
  useEffect(() => {
    if (selectedAsset) {
      const currentFavoriteStatus = userFavorites.has(selectedAsset.id)
      if (selectedAsset.isFavorite !== currentFavoriteStatus) {
        setSelectedAsset((prev) =>
          prev
            ? {
                ...prev,
                isFavorite: currentFavoriteStatus,
              }
            : null
        )
      }
    }
  }, [userFavorites, selectedAsset])

  const handleCardClick = (asset: AssetItem) => {
    const assetWithFavoriteStatus = {
      ...asset,
      isFavorite: userFavorites.has(asset.id),
    }
    setSelectedAsset(assetWithFavoriteStatus)
    setIsModalOpen(true)
  }

  const handleAssetChange = (asset: AssetItem) => {
    const assetWithFavoriteStatus = {
      ...asset,
      isFavorite: userFavorites.has(asset.id),
    }
    setSelectedAsset(assetWithFavoriteStatus)
  }

  const handleUploadClick = () => {
    setIsCreationModalOpen(true)
  }

  const handleAssetSave = (asset: AssetItem) => {
    console.log('새 에셋 저장:', asset)
    // TODO: 실제 저장 로직 구현
    setIsCreationModalOpen(false)
  }

  // Header event handlers
  const handleTryClick = () => {
    router.push('/editor')
  }

  const handleLoginClick = () => {
    router.push('/auth')
  }

  const handleAddToCart = () => {
    console.log('아이템이 카트에 추가되었습니다:', selectedAsset?.title)
  }

  const handleLikeClick = (assetId: string) => {
    setAssets((prevAssets) =>
      prevAssets.map((asset) =>
        asset.id === assetId
          ? { ...asset, likes: (asset.likes || 0) + 1 }
          : asset
      )
    )
  }

  const handleFavoriteToggle = async (assetId: string) => {
    if (!isLoggedIn) {
      showToast('즐겨찾기 기능을 사용하려면 로그인이 필요합니다.', 'warning')
      router.push('/auth')
      return
    }

    const findAsset = (list: AssetItem[]) =>
      list.find((asset) => asset.id === assetId)
    const targetAsset = findAsset(assets) || findAsset(templates)

    if (!targetAsset) {
      showToast('에셋을 찾을 수 없습니다.', 'error')
      return
    }

    if (!targetAsset.pluginKey) {
      showToast('이 에셋은 즐겨찾기를 지원하지 않습니다.', 'warning')
      return
    }

    const currentlyFavorite = userFavorites.has(assetId)

    const applyFavoriteState = (isFavorite: boolean) => {
      setAssets((prev) =>
        prev.map((asset) =>
          asset.id === assetId ? { ...asset, isFavorite } : asset
        )
      )
      setTemplates((prev) =>
        prev.map((asset) =>
          asset.id === assetId ? { ...asset, isFavorite } : asset
        )
      )
      setUserFavorites((prev) => {
        const next = new Set(prev)
        if (isFavorite) {
          next.add(assetId)
        } else {
          next.delete(assetId)
        }
        return next
      })
      setSelectedAsset((prev) =>
        prev && prev.id === assetId ? { ...prev, isFavorite } : prev
      )
    }

    // Optimistic update
    applyFavoriteState(!currentlyFavorite)

    try {
      if (currentlyFavorite) {
        await removeFavoriteApi(targetAsset.pluginKey)
        showToast('즐겨찾기에서 제거했습니다.', 'success')
      } else {
        await addFavoriteApi(targetAsset.pluginKey)
        showToast('즐겨찾기에 추가했습니다.', 'success')
      }
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error)
      applyFavoriteState(currentlyFavorite)
      showToast('즐겨찾기 업데이트 중 오류가 발생했습니다.', 'error')
    }
  }

  // 정렬 옵션
  const sortOptions = [
    { value: 'favorites', label: '즐겨찾기' },
    { value: 'likes', label: '좋아요순' },
    { value: 'popular', label: '인기순' },
    { value: 'latest', label: '최신순' },
  ]

  // 정렬 핸들러
  const handleSortChange = (newSortOrder: string) => {
    setSortOrder(newSortOrder)
    setShowSortDropdown(false)
  }

  const filteredAndSortedAssets = useMemo(() => {
    // userFavorites 상태를 반영한 데이터
    const dataWithFavoriteStatus = currentData.map((item) => ({
      ...item,
      isFavorite: userFavorites.has(item.id),
    }))

    // 필터링
    const filtered = dataWithFavoriteStatus.filter((item) => {
      const matchesSearch = item.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase())

      // 카테고리 필터링 로직 확장
      let matchesCategory = true
      if (contentType === 'effects') {
        switch (activeFilter) {
          case 'All':
            matchesCategory = true
            break
          case 'Smooth':
          case 'Dynamic':
          case 'Unique':
            matchesCategory = item.category === activeFilter
            break
          case 'Text':
            matchesCategory = item.tags?.includes('text') || false
            break
          case 'CWI':
            matchesCategory = item.tags?.includes('cwi') || false
            break
          case 'Animation':
            matchesCategory =
              item.tags?.includes('gsap') ||
              item.tags?.includes('animation') ||
              false
            break
          case 'Popular':
            matchesCategory = (item.downloads || 0) > 1000
            break
          default:
            matchesCategory = item.category === activeFilter
        }
      } else {
        // 템플릿 필터링
        switch (activeFilter) {
          case 'All':
            matchesCategory = true
            break
          case 'Cards':
          case 'Effects':
          case 'Basic':
          case 'Themes':
          case 'Modern':
          case 'Retro':
            matchesCategory = item.category === activeFilter
            break
          default:
            matchesCategory = item.category === activeFilter
        }
      }

      return matchesSearch && matchesCategory
    })

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'latest':
          // 최신순 - 현재는 구현하지 않으므로 기본 순서 유지
          return 0
        case 'likes':
          // 좋아요순 (내림차순)
          return (b.likes || 0) - (a.likes || 0)
        case 'popular':
          // 인기순 (다운로드 수 내림차순)
          return (b.downloads || 0) - (a.downloads || 0)
        case 'favorites':
          // 즐겨찾기 우선, 그 다음 좋아요 순
          if (a.isFavorite && !b.isFavorite) return -1
          if (!a.isFavorite && b.isFavorite) return 1
          return (b.likes || 0) - (a.likes || 0)
        default:
          return 0
      }
    })

    return sorted
  }, [
    currentData,
    searchTerm,
    activeFilter,
    sortOrder,
    contentType,
    userFavorites,
  ])

  // 메인 컨테이너 클래스
  const mainContainerClasses = clsx('min-h-screen', 'bg-gray-50', 'text-black')

  // 검색 컨테이너 클래스
  const searchContainerClasses = clsx('relative', 'w-80')

  // 검색 입력 클래스
  const searchInputClasses = clsx(
    'w-full',
    'pl-4',
    'pr-12', // 오른쪽 패딩을 늘려서 아이콘 공간 확보
    'py-2.5',
    'bg-white',
    'border',
    'border-gray-200',
    'rounded-lg',
    'text-black',
    'placeholder-gray-400',
    'focus:outline-none',
    'focus:border-black',
    'focus:ring-1',
    'focus:ring-black',
    'shadow-sm',
    TRANSITIONS.colors
  )

  // 검색 아이콘 클래스
  const searchIconClasses = clsx(
    'absolute',
    'right-3',
    'top-1/2',
    'transform',
    '-translate-y-1/2',
    'text-gray-400',
    'pointer-events-none'
  )

  return (
    <div className={mainContainerClasses}>
      <Header
        onTryClick={handleTryClick}
        onLoginClick={handleLoginClick}
        isLoggedIn={isLoggedIn}
        user={user}
        isLoading={authLoading}
      />

      <div className="flex">
        <AssetSidebar
          selectedCategory={activeFilter}
          onCategoryChange={setActiveFilter}
          categories={categoryFilters}
          contentType={contentType}
        />

        <main className="flex-1 p-8">
          {/* 검색바와 우측 버튼들 */}
          <div className="flex items-center justify-between mb-8">
            <div className={searchContainerClasses}>
              <input
                type="text"
                placeholder="Search assets"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={searchInputClasses}
              />
              <LuSearch className={searchIconClasses} size={20} />
            </div>

            {/* 중앙: 이펙트/템플릿 토글 버튼 */}
            <div className="flex items-center bg-gray-200 rounded-full p-1 relative">
              {/* 슬라이딩 배경 */}
              <div
                className={`absolute top-1 bottom-1 bg-purple-700 rounded-full transition-all duration-300 ease-in-out ${
                  contentType === 'effects'
                    ? 'left-1 right-[50%]'
                    : 'left-[50%] right-1'
                }`}
              />
              <button
                onClick={() => {
                  setContentType('effects')
                  setActiveFilter('All') // 필터 초기화
                }}
                className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                  contentType === 'effects'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                이펙트
              </button>
              <button
                onClick={() => {
                  setContentType('templates')
                  setActiveFilter('All') // 필터 초기화
                }}
                className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                  contentType === 'templates'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                템플릿
              </button>
            </div>

            {/* 정렬 필터와 업로드 버튼 */}
            <div className="flex items-center space-x-3">
              {/* 정렬 필터 드롭다운 */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <span>
                    {
                      sortOptions.find((option) => option.value === sortOrder)
                        ?.label
                    }
                  </span>
                  <LuChevronDown
                    className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showSortDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleSortChange(option.value)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg cursor-pointer ${
                          sortOrder === option.value
                            ? 'text-purple-700 bg-blue-50'
                            : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 업로드 에셋 버튼 */}
              <button
                onClick={handleUploadClick}
                className="px-4 py-2 bg-purple-400 text-white rounded-lg text-sm font-medium hover:bg-purple-700 hover:scale-105 transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <span>에셋 만들기</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-purple-400">Loading assets...</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-6">
                {filteredAndSortedAssets.map((asset, index) => (
                  <div
                    key={asset.id}
                    className="animate-fade-in"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      opacity: 0,
                      animation: `fadeIn 0.5s ease-out ${index * 50}ms forwards`,
                    }}
                  >
                    <AssetCard
                      asset={asset}
                      onCardClick={handleCardClick}
                      onLikeClick={handleLikeClick}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  </div>
                ))}
              </div>

              <style jsx>{`
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </>
          )}
        </main>
      </div>

      <AssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        asset={selectedAsset}
        onFavoriteToggle={() =>
          selectedAsset && handleFavoriteToggle(selectedAsset.id)
        }
        availableAssets={filteredAndSortedAssets}
        onAssetChange={handleAssetChange}
      />

      <AssetCreationModal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        selectedAsset={selectedAsset}
        onAssetSave={handleAssetSave}
        availableAssets={assets}
        onAssetChange={handleAssetChange}
      />
    </div>
  )
}
