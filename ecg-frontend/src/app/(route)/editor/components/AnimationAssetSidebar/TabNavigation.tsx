'use client'

import React from 'react'
import { useEditorStore } from '../../store'

const TabNavigation: React.FC = () => {
  const { activeAssetTab, setActiveAssetTab } = useEditorStore()

  const tabs = [
    { id: 'my' as const, label: '내 에셋' },
    { id: 'free' as const, label: '무료 에셋' },
  ]

  return (
    <div className="px-4 pb-4">
      <div className="flex rounded-lg border border-gray-700 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAssetTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
              activeAssetTab === tab.id
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-500 hover:text-white hover:bg-gray-600 hover:shadow-md transform hover:scale-105'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default TabNavigation
