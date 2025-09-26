'use client'

import DeployModal from '@/components/ui/DeployModal'
import DocumentModal from '@/components/ui/DocumentModal'
import Tab from '@/components/ui/Tab'
import TabItem from '@/components/ui/TabItem'
import UserDropdown from '@/components/ui/UserDropdown'
import { useDeployModal } from '@/hooks/useDeployModal'
import { useProgressTasks } from '@/hooks/useProgressTasks'
import { useProgressStore } from '@/lib/store/progressStore'
import { AutosaveManager } from '@/utils/managers/AutosaveManager'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuBell, LuHouse, LuMenu, LuShoppingBag } from 'react-icons/lu'
import { useEditorStore } from '../store'
import { EDITOR_TABS } from '../types'
import { EDITOR_COLORS, getToolbarClasses } from '../constants/colors'
import EditingModeToggle from './EditingModeToggle'
import ToolbarToggle from './ToolbarToggle'

export interface EditorHeaderTabsProps {
  activeTab?: string
  onTabChange?: (tabId: string) => void
  isToolbarVisible?: boolean
  onToolbarToggle?: () => void
  onShowToolbar?: () => void
  onPlatformSelectionOpen?: (task: { id: number; filename: string }) => void
}

const TAB_LABELS: Record<string, string> = {
  home: '홈',
  edit: '편집',
  format: '서식',
  insert: '삽입',
  template: '템플릿',
}

export default function EditorHeaderTabs({
  activeTab: propsActiveTab,
  onTabChange: propsOnTabChange,
  isToolbarVisible = true,
  onToolbarToggle,
  onShowToolbar,
  onPlatformSelectionOpen,
}: EditorHeaderTabsProps = {}) {
  // Use store values as defaults, but allow prop overrides
  const store = useEditorStore()
  const { editingMode } = store
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [projectType, setProjectType] = useState<
    'browser' | 'device' | 'cloud'
  >('browser')

  // Navigation dropdown state
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false)
  const navButtonRef = useRef<HTMLButtonElement>(null)

  // Document modal state
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const documentButtonRef = useRef<HTMLButtonElement>(null)

  // Deploy modal hook
  const { openDeployModal, deployModalProps } = useDeployModal()

  // Get real progress data
  const { exportTasks, uploadTasks } = useProgressTasks()

  // Get notification states from progressStore
  const {
    hasUnreadExportNotification,
    hasUnreadUploadNotification,
    markNotificationAsRead,
  } = useProgressStore()

  const handleDeployClick = (task: { id: number; filename: string }) => {
    // 플랫폼 선택 모달을 먼저 열기 (상위 컴포넌트에서 처리)
    if (onPlatformSelectionOpen) {
      onPlatformSelectionOpen(task)
    } else {
      // fallback: 직접 배포 모달 열기 (기존 동작)
      openDeployModal({
        id: task.id,
        filename: task.filename,
      })
    }
  }

  // If props are provided, use them; otherwise fall back to store
  const activeTab =
    propsActiveTab !== undefined ? propsActiveTab : store.activeTab

  const handleTabChange = (tabId: string) => {
    // Show toolbar if it's hidden when tab is changed
    if (!isToolbarVisible && onShowToolbar) {
      onShowToolbar()
    }

    // Call the original tab change handler
    if (propsOnTabChange) {
      propsOnTabChange(tabId)
    } else {
      store.setActiveTab(tabId as never)
    }
  }

  // Subscribe to autosave status
  useEffect(() => {
    const autosaveManager = AutosaveManager.getInstance()

    const unsubscribe = autosaveManager.onStatusChange((status) => {
      setSaveStatus(status)
      if (status === 'saved') {
        setLastSaveTime(autosaveManager.getLastSaveTime())
      }
    })

    // Get initial values
    setSaveStatus(autosaveManager.getSaveStatus())
    setProjectType(autosaveManager.getProjectType())
    setLastSaveTime(autosaveManager.getLastSaveTime())

    return unsubscribe
  }, [])

  // Close navigation dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element

      // 드롭다운 내부 클릭은 무시
      if (target.closest('.nav-dropdown')) {
        return
      }

      if (
        navButtonRef.current &&
        !navButtonRef.current.contains(event.target as Node) &&
        isNavDropdownOpen
      ) {
        setIsNavDropdownOpen(false)
      }
    }

    if (isNavDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isNavDropdownOpen])

  const getSaveStatusText = () => {
    switch (projectType) {
      case 'browser':
        return '현재 기기에 저장됨'
      case 'device':
        return '로컬에 저장됨'
      case 'cloud':
        return '클라우드에 저장됨'
    }
  }

  // 편집 모드에 따른 테마 클래스 결정
  const getTabBarClasses = () => {
    if (editingMode === 'advanced') {
      // 상세 편집 모드: 어두운 테마
      const darkColors = EDITOR_COLORS.toolbar.dark
      return `${darkColors.background} ${darkColors.border} shadow-sm relative`
    } else {
      // 쉬운 편집 모드: 밝은 테마 (툴바와 동일)
      return `${getToolbarClasses('base')} shadow-sm relative`
    }
  }

  const getTextClasses = () => {
    if (editingMode === 'advanced') {
      return EDITOR_COLORS.toolbar.dark.text
    } else {
      return EDITOR_COLORS.toolbar.base.text
    }
  }

  const getHoverClasses = () => {
    if (editingMode === 'advanced') {
      return EDITOR_COLORS.toolbar.dark.hover
    } else {
      return EDITOR_COLORS.toolbar.base.hover
    }
  }

  return (
    <div className={getTabBarClasses()}>
      <div className="flex items-center px-6 py-1">
        {/* Left Side - Navigation Menu */}
        <div className="relative mr-4">
          <button
            ref={navButtonRef}
            onClick={() => setIsNavDropdownOpen(!isNavDropdownOpen)}
            className={`p-2 ${getTextClasses()} ${getHoverClasses()} rounded-lg transition-all duration-200 cursor-pointer`}
            title="메뉴"
          >
            <LuMenu className="w-5 h-5" />
          </button>

          {/* Navigation Dropdown */}
          {isNavDropdownOpen &&
            typeof window !== 'undefined' &&
            createPortal(
              <div
                className="nav-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[150px]"
                style={{
                  top: navButtonRef.current
                    ? navButtonRef.current.getBoundingClientRect().bottom +
                      window.scrollY +
                      4
                    : 0,
                  left: navButtonRef.current
                    ? navButtonRef.current.getBoundingClientRect().left +
                      window.scrollX
                    : 0,
                }}
              >
                <button
                  onClick={() => (window.location.href = '/')}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg transition-colors cursor-pointer"
                >
                  <LuHouse className="w-4 h-4 mr-3" />
                  메인 페이지
                </button>
                <button
                  onClick={() => (window.location.href = '/asset-store')}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg transition-colors cursor-pointer"
                >
                  <LuShoppingBag className="w-4 h-4 mr-3" />
                  에셋 스토어
                </button>
              </div>,
              document.body
            )}
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <UserDropdown theme={editingMode === 'advanced' ? 'dark' : 'light'} />
        </div>

        {/* Center - Tab Navigation */}
        <div className="flex-1 mx-6">
          {editingMode === 'advanced' ? (
            <Tab
              selectedItem={activeTab}
              onSelectionChange={handleTabChange}
              size="small"
              isQuiet={true}
            >
              {EDITOR_TABS.map((tab) => (
                <TabItem key={tab} id={tab} label={TAB_LABELS[tab]} />
              ))}
            </Tab>
          ) : (
            // 쉬운 편집 모드에서는 탭 없음
            <div />
          )}
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-4 mr-4">
          {/* Save Status Indicator */}
          <div
            className={`flex items-center gap-2 text-xs ${getTextClasses()}`}
          >
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">●</span>
                저장 중...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1">
                <span className="text-green-400">✓</span>
                {getSaveStatusText()}
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1">
                <span className="text-red-400">⚠</span>
                저장 실패
              </span>
            )}
            {lastSaveTime && saveStatus === 'saved' && (
              <span
                className={
                  editingMode === 'advanced' ? 'text-gray-400' : 'text-gray-600'
                }
              >
                (
                {new Date(lastSaveTime).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                )
              </span>
            )}
          </div>

          {/* Document Modal */}
          <div className="relative">
            <button
              ref={documentButtonRef}
              onClick={() => {
                setIsDocumentModalOpen(!isDocumentModalOpen)
                // Mark notifications as read when opening modal
                if (!isDocumentModalOpen) {
                  markNotificationAsRead()
                }
              }}
              className={`relative p-2 ${getTextClasses()} ${getHoverClasses()} hover:scale-110 hover:shadow-md rounded-lg transition-all duration-200 cursor-pointer`}
              title="알림"
            >
              <LuBell className="w-5 h-5" />
              {/* Notification Badge */}
              {hasUnreadExportNotification && (
                <div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                  style={{ zIndex: 1000 }}
                ></div>
              )}
            </button>

            <DocumentModal
              isOpen={isDocumentModalOpen}
              onClose={() => setIsDocumentModalOpen(false)}
              buttonRef={documentButtonRef}
              onDeployClick={handleDeployClick}
            />
          </div>

          {/* Editing Mode Toggle */}
          <EditingModeToggle />

          {/* Toolbar Toggle */}
          {onToolbarToggle && (
            <ToolbarToggle
              isToolbarVisible={isToolbarVisible}
              onToggle={onToolbarToggle}
            />
          )}
        </div>
      </div>

      {/* Deploy Modal - Separate from DocumentModal */}
      <DeployModal {...deployModalProps} />
    </div>
  )
}
